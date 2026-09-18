"""Daily Ops Last Mile Dashboard — backend.

Pulls parcel-level and route-level data straight from Redash (queries 78, 1297, 653,
512, 1239, 1500 -- see aggregate.py for exactly how each field is used), aggregates it
per station/zone/region nationwide across three views (Station Health, Shipment
Details, Routed View), and serves it scoped to whoever is asking (role-based access,
see auth.py).

Runtime contract: port 8000, GET /health, everything else under /api. See
CLAUDE.md's "Substrait deployment" block for the platform's deploy rules.
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
from aggregate import (
    DRILLDOWN_METRICS, METRIC_KEYS, ROUTED_STATION_KEYS, SHIPMENT_DETAIL_KEYS, SHIPMENT_DRILLDOWN_METRICS,
    build_routed_view, build_shipment_details, build_station_metrics, merge_routed_into_station_metrics,
    rollup, rollup_routed,
)
from auth import CurrentUser, get_current_user
from redash_client import (
    QUERY_ACTIVE_MISSING, QUERY_DELIVERY_PERFORMANCE, QUERY_HEALTH_V3, QUERY_LH_TIMING,
    QUERY_SHIPMENT_TRACKER, QUERY_TOTAL_SHIPMENTS, RedashError, fetch_query_results,
)
from stations import HUBS, REGIONS, ZONES, ZONES_BY_REGION

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("dashboard")

REFRESH_INTERVAL_SECONDS = 60 * 60  # hourly, per the project brief
_refresh_task: asyncio.Task | None = None

_METRIC_COLUMNS = METRIC_KEYS

# Tracking-number lists behind each station's metric counts, for the UI's
# click-a-number drill-down. In-memory only (not persisted) -- rebuilt on every
# refresh, and empty again after a restart until the next one runs. Keeping this
# out of the database avoids storing a full tracking-number list per station per
# hourly snapshot indefinitely.
_tn_cache: dict[str, dict[str, list]] = {}
_tn_cache_captured_at: str | None = None

# Shipment Details' Fresh Unscan / Latlong drilldown, same in-memory pattern as _tn_cache.
_shipment_tn_cache: dict[str, dict[str, list]] = {}
_shipment_tn_cache_captured_at: str | None = None

# Routed View's driver-level rows. Not persisted -- rebuilt every refresh, like the
# drilldown caches (a daily driver roster has no need for hourly history).
_routed_drivers: list[dict] = []
_routed_drivers_captured_at: str | None = None

_SHIPMENT_COLUMNS = SHIPMENT_DETAIL_KEYS + ("fresh_attempt_pct",)
_ROUTED_COLUMNS = ROUTED_STATION_KEYS + ("cod_pct", "success_rate", "completion_rate")


async def refresh_metrics(triggered_by: str | None = None) -> dict:
    """Pulls fresh data from Redash, recomputes station metrics, stores a new snapshot."""
    started_at = datetime.now(timezone.utc)
    log_id = await db.execute(
        "INSERT INTO refresh_log (started_at, status, triggered_by) VALUES (%s, 'running', %s)",
        (started_at, triggered_by),
    )
    try:
        health_rows = await fetch_query_results(QUERY_HEALTH_V3)
        missing_rows = await fetch_query_results(QUERY_ACTIVE_MISSING)
        shipment_rows = await fetch_query_results(QUERY_TOTAL_SHIPMENTS)
        routed_rows = await fetch_query_results(QUERY_DELIVERY_PERFORMANCE)
        tracker_rows = await fetch_query_results(QUERY_SHIPMENT_TRACKER)
        lh_rows = await fetch_query_results(QUERY_LH_TIMING)

        by_station, tn_details = build_station_metrics(health_rows, missing_rows, shipment_rows)
        routed_by_station, driver_rows = build_routed_view(routed_rows)
        merge_routed_into_station_metrics(by_station, routed_by_station)
        shipment_by_station, shipment_tn_details = build_shipment_details(shipment_rows, tracker_rows, lh_rows)

        captured_at = datetime.now(timezone.utc)
        global _tn_cache_captured_at, _shipment_tn_cache_captured_at, _routed_drivers, _routed_drivers_captured_at
        _tn_cache.clear()
        _tn_cache.update(tn_details)
        _tn_cache_captured_at = captured_at.isoformat()
        _shipment_tn_cache.clear()
        _shipment_tn_cache.update(shipment_tn_details)
        _shipment_tn_cache_captured_at = captured_at.isoformat()
        _routed_drivers = driver_rows
        _routed_drivers_captured_at = captured_at.isoformat()

        params = [
            (
                captured_at, row["station_code"], row["station_name"], row["zone"], row["region"],
                *[row[c] for c in _METRIC_COLUMNS],
            )
            for row in by_station.values()
        ]
        await db.execute_many(
            f"""INSERT INTO station_metrics
               (captured_at, station_code, station_name, zone, region,
                {", ".join(_METRIC_COLUMNS)})
               VALUES ({", ".join(["%s"] * (5 + len(_METRIC_COLUMNS)))})""",
            params,
        )

        shipment_params = [
            (
                captured_at, row["station_code"], row["station_name"], row["zone"], row["region"],
                *[row[c] for c in _SHIPMENT_COLUMNS],
                row["lh_trips"][0]["time"] if len(row["lh_trips"]) > 0 else None,
                row["lh_trips"][0]["parcels"] if len(row["lh_trips"]) > 0 else None,
                row["lh_trips"][1]["time"] if len(row["lh_trips"]) > 1 else None,
                row["lh_trips"][1]["parcels"] if len(row["lh_trips"]) > 1 else None,
            )
            for row in shipment_by_station.values()
        ]
        await db.execute_many(
            f"""INSERT INTO shipment_details
               (captured_at, station_code, station_name, zone, region,
                {", ".join(_SHIPMENT_COLUMNS)}, lh_trip1_time, lh_trip1_parcels, lh_trip2_time, lh_trip2_parcels)
               VALUES ({", ".join(["%s"] * (9 + len(_SHIPMENT_COLUMNS)))})""",
            shipment_params,
        )

        routed_params = [
            (
                captured_at, row["station_code"], row["station_name"], row["zone"], row["region"],
                *[row[c] for c in _ROUTED_COLUMNS],
            )
            for row in routed_by_station.values()
        ]
        await db.execute_many(
            f"""INSERT INTO routed_stations
               (captured_at, station_code, station_name, zone, region, {", ".join(_ROUTED_COLUMNS)})
               VALUES ({", ".join(["%s"] * (5 + len(_ROUTED_COLUMNS)))})""",
            routed_params,
        )

        await db.execute(
            "UPDATE refresh_log SET finished_at=%s, status='ok', stations_count=%s WHERE id=%s",
            (datetime.now(timezone.utc), len(params), log_id),
        )
        log.info("Refresh ok: %d stations", len(params))
        return {"ok": True, "stations": len(params), "captured_at": captured_at.isoformat()}
    except (RedashError, Exception) as exc:  # noqa: BLE001 - log and keep the app alive
        log.exception("Refresh failed")
        await db.execute(
            "UPDATE refresh_log SET finished_at=%s, status='error', error_message=%s WHERE id=%s",
            (datetime.now(timezone.utc), str(exc)[:2000], log_id),
        )
        return {"ok": False, "error": str(exc)}


async def _hourly_refresh_loop() -> None:
    while True:
        try:
            await refresh_metrics(triggered_by="scheduler")
        except Exception:  # noqa: BLE001 - never let the loop die
            log.exception("Scheduled refresh crashed")
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _refresh_task
    await db.init_pool()
    if os.getenv("DATABASE_URL"):
        _refresh_task = asyncio.create_task(_hourly_refresh_loop())
    yield
    if _refresh_task is not None:
        _refresh_task.cancel()
    await db.close_pool()


app = FastAPI(title="Daily Ops Last Mile Dashboard", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


class Health(BaseModel):
    status: str


@app.get("/health", response_model=Health)
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Identity
# ---------------------------------------------------------------------------

class Me(BaseModel):
    email: str | None
    provisioned: bool
    role: str | None = None
    scope_type: str | None = None
    scope_value: str | None = None
    display_name: str | None = None


@app.get("/api/me", response_model=Me)
async def me(x_forwarded_email: str | None = Header(default=None, alias="X-Forwarded-Email")):
    if not x_forwarded_email:
        return {"email": None, "provisioned": False}
    row = await db.fetch_one(
        "SELECT email, role, scope_type, scope_value, display_name FROM users WHERE email = %s",
        (x_forwarded_email,),
    )
    if row is None:
        return {"email": x_forwarded_email, "provisioned": False}
    return {
        "email": row[0], "provisioned": True, "role": row[1], "scope_type": row[2],
        "scope_value": row[3], "display_name": row[4],
    }


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class MetricFields(BaseModel):
    total_in_hub: int
    zero_attempt: int
    zero_attempt_gt_d0: int
    on_hold: int
    pending_ats_zero_attempt: int
    pending_ats_attempted: int
    missing_open: int
    missing_hub: int
    missing_ship_in: int
    total_fresh: int
    age_gt3: int
    reschedule: int
    still_ovfd: int
    prior_d0: int
    prior_gt_d0: int
    cod_pct_hub: float
    total_routed: int
    attendance: int
    cod_pct_routed: float


class StationRow(MetricFields):
    station_code: str
    station_name: str
    zone: str
    region: str


class GroupRow(MetricFields):
    key: str
    station_count: int


class DashboardResponse(BaseModel):
    captured_at: str | None
    stations: list[StationRow]
    zones: list[GroupRow]
    regions: list[GroupRow]
    previous_captured_at: str | None = None
    previous_stations: list[StationRow] = []


def _scope_filter_stations(rows: list[dict], user: CurrentUser) -> list[dict]:
    if user.scope_type == "all":
        return rows
    if user.scope_type == "region":
        return [r for r in rows if r["region"] == user.scope_value]
    if user.scope_type == "zone":
        return [r for r in rows if r["zone"] == user.scope_value]
    if user.scope_type == "station":
        return [r for r in rows if r["station_name"] == user.scope_value]
    return []


async def _fetch_station_rows(captured_at) -> list[dict]:
    db_rows = await db.fetch_all(
        f"""SELECT station_code, station_name, zone, region, {", ".join(_METRIC_COLUMNS)}
           FROM station_metrics WHERE captured_at = %s""",
        (captured_at,),
    )
    return [
        {
            "station_code": r[0], "station_name": r[1], "zone": r[2], "region": r[3],
            **{col: r[4 + i] for i, col in enumerate(_METRIC_COLUMNS)},
        }
        for r in db_rows
    ]


@app.get("/api/dashboard", response_model=DashboardResponse)
async def dashboard(user: CurrentUser = Depends(get_current_user)):
    latest = await db.fetch_one("SELECT MAX(captured_at) FROM station_metrics")
    captured_at = latest[0] if latest else None
    if captured_at is None:
        return {"captured_at": None, "stations": [], "zones": [], "regions": []}

    all_rows = await _fetch_station_rows(captured_at)
    scoped = _scope_filter_stations(all_rows, user)

    zone_groups = rollup(scoped, "zone")
    region_groups = rollup(scoped, "region")

    def to_group(rows, key):
        return [{**{k: g[k] for k in _METRIC_COLUMNS}, "key": g[key], "station_count": g["station_count"]}
                for g in rows if g["station_count"] > 0]

    previous = await db.fetch_one(
        "SELECT MAX(captured_at) FROM station_metrics WHERE captured_at < %s", (captured_at,)
    )
    previous_captured_at = previous[0] if previous else None
    previous_scoped: list[dict] = []
    if previous_captured_at is not None:
        previous_scoped = _scope_filter_stations(await _fetch_station_rows(previous_captured_at), user)

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "stations": scoped,
        "zones": to_group(zone_groups, "zone"),
        "regions": to_group(region_groups, "region"),
        "previous_captured_at": (
            previous_captured_at.isoformat() if hasattr(previous_captured_at, "isoformat") else previous_captured_at
        ),
        "previous_stations": previous_scoped,
    }


class DrilldownResponse(BaseModel):
    station_code: str
    station_name: str
    metric: str
    tracking_numbers: list[str]
    as_of: str | None


@app.get("/api/drilldown", response_model=DrilldownResponse)
async def drilldown(station_code: str, metric: str, user: CurrentUser = Depends(get_current_user)):
    """Tracking numbers behind one station's metric count, for the UI's click-to-see-TNs
    panel. Served from the in-memory cache built by the last refresh -- empty right
    after a restart until the next hourly (or manual) refresh runs."""
    if metric not in DRILLDOWN_METRICS:
        raise HTTPException(status_code=422, detail=f"metric must be one of {list(DRILLDOWN_METRICS)}")
    hub = HUBS.get(station_code)
    if hub is None:
        raise HTTPException(status_code=404, detail="Unknown station")
    name, _full_name, zone, region = hub
    in_scope = _scope_filter_stations(
        [{"station_code": station_code, "station_name": name, "zone": zone, "region": region}], user
    )
    if not in_scope:
        raise HTTPException(status_code=403, detail="That station isn't in your scope")
    tracking_numbers = [t for t in _tn_cache.get(station_code, {}).get(metric, []) if t]
    return {
        "station_code": station_code, "station_name": name, "metric": metric,
        "tracking_numbers": tracking_numbers, "as_of": _tn_cache_captured_at,
    }


# ---------------------------------------------------------------------------
# Shipment Details
# ---------------------------------------------------------------------------

class LHTrip(BaseModel):
    time: str
    parcels: int


class ShipmentDetailFields(BaseModel):
    total_fresh: int
    total_shipment: int
    fresh_unscan: int
    latlong: int
    fresh_attempt_count: int
    fresh_attempt_pct: float


class ShipmentStationRow(ShipmentDetailFields):
    station_code: str
    station_name: str
    zone: str
    region: str
    lh_trips: list[LHTrip]


class ShipmentGroupRow(ShipmentDetailFields):
    key: str
    station_count: int


class ShipmentDetailsResponse(BaseModel):
    captured_at: str | None
    stations: list[ShipmentStationRow]
    zones: list[ShipmentGroupRow]
    regions: list[ShipmentGroupRow]


async def _fetch_shipment_rows(captured_at) -> list[dict]:
    db_rows = await db.fetch_all(
        f"""SELECT station_code, station_name, zone, region, {", ".join(_SHIPMENT_COLUMNS)},
                   lh_trip1_time, lh_trip1_parcels, lh_trip2_time, lh_trip2_parcels
           FROM shipment_details WHERE captured_at = %s""",
        (captured_at,),
    )
    rows = []
    for r in db_rows:
        row = {
            "station_code": r[0], "station_name": r[1], "zone": r[2], "region": r[3],
            **{col: r[4 + i] for i, col in enumerate(_SHIPMENT_COLUMNS)},
        }
        offset = 4 + len(_SHIPMENT_COLUMNS)
        trip1_time, trip1_parcels, trip2_time, trip2_parcels = r[offset:offset + 4]
        trips = []
        if trip1_time is not None:
            trips.append({"time": trip1_time, "parcels": trip1_parcels or 0})
        if trip2_time is not None:
            trips.append({"time": trip2_time, "parcels": trip2_parcels or 0})
        row["lh_trips"] = trips
        rows.append(row)
    return rows


@app.get("/api/shipment-details", response_model=ShipmentDetailsResponse)
async def shipment_details(user: CurrentUser = Depends(get_current_user)):
    latest = await db.fetch_one("SELECT MAX(captured_at) FROM shipment_details")
    captured_at = latest[0] if latest else None
    if captured_at is None:
        return {"captured_at": None, "stations": [], "zones": [], "regions": []}

    all_rows = await _fetch_shipment_rows(captured_at)
    scoped = _scope_filter_stations(all_rows, user)

    zone_groups = [{**{k: g[k] for k in _SHIPMENT_COLUMNS}, "key": g["zone"], "station_count": g["station_count"]}
                    for g in rollup_shipment_details(scoped, "zone")]
    region_groups = [{**{k: g[k] for k in _SHIPMENT_COLUMNS}, "key": g["region"], "station_count": g["station_count"]}
                      for g in rollup_shipment_details(scoped, "region")]

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "stations": scoped,
        "zones": [g for g in zone_groups if g["station_count"] > 0],
        "regions": [g for g in region_groups if g["station_count"] > 0],
    }


class ShipmentDrilldownResponse(BaseModel):
    station_code: str
    station_name: str
    metric: str
    tracking_numbers: list[str]
    as_of: str | None


@app.get("/api/shipment-drilldown", response_model=ShipmentDrilldownResponse)
async def shipment_drilldown(station_code: str, metric: str, user: CurrentUser = Depends(get_current_user)):
    if metric not in SHIPMENT_DRILLDOWN_METRICS:
        raise HTTPException(status_code=422, detail=f"metric must be one of {list(SHIPMENT_DRILLDOWN_METRICS)}")
    hub = HUBS.get(station_code)
    if hub is None:
        raise HTTPException(status_code=404, detail="Unknown station")
    name, _full_name, zone, region = hub
    in_scope = _scope_filter_stations(
        [{"station_code": station_code, "station_name": name, "zone": zone, "region": region}], user
    )
    if not in_scope:
        raise HTTPException(status_code=403, detail="That station isn't in your scope")
    tracking_numbers = [t for t in _shipment_tn_cache.get(station_code, {}).get(metric, []) if t]
    return {
        "station_code": station_code, "station_name": name, "metric": metric,
        "tracking_numbers": tracking_numbers, "as_of": _shipment_tn_cache_captured_at,
    }


# ---------------------------------------------------------------------------
# Routed View
# ---------------------------------------------------------------------------

class RoutedFields(BaseModel):
    total_routed: int
    attendance: int
    attendance_staff: int
    attendance_independent: int
    attendance_rescue: int
    current_ovfd: int
    current_success: int
    total_cod: int
    cod_pct: float
    success_rate: float
    completion_rate: float


class RoutedStationRow(RoutedFields):
    station_code: str
    station_name: str
    zone: str
    region: str


class RoutedGroupRow(RoutedFields):
    key: str
    station_count: int


class RoutedDriverRow(BaseModel):
    driver_name: str
    driver_type: str
    home_station: str | None
    current_station: str | None
    zone: str | None
    region: str | None
    is_rescue: bool
    total_routed: int
    current_success: int
    current_ovfd: int
    total_cod: int
    cod_pct: float
    success_rate: float
    completion_rate: float


class RoutedViewResponse(BaseModel):
    captured_at: str | None
    stations: list[RoutedStationRow]
    zones: list[RoutedGroupRow]
    regions: list[RoutedGroupRow]
    drivers: list[RoutedDriverRow]


async def _fetch_routed_rows(captured_at) -> list[dict]:
    db_rows = await db.fetch_all(
        f"""SELECT station_code, station_name, zone, region, {", ".join(_ROUTED_COLUMNS)}
           FROM routed_stations WHERE captured_at = %s""",
        (captured_at,),
    )
    return [
        {
            "station_code": r[0], "station_name": r[1], "zone": r[2], "region": r[3],
            **{col: r[4 + i] for i, col in enumerate(_ROUTED_COLUMNS)},
        }
        for r in db_rows
    ]


@app.get("/api/routed-view", response_model=RoutedViewResponse)
async def routed_view(user: CurrentUser = Depends(get_current_user)):
    latest = await db.fetch_one("SELECT MAX(captured_at) FROM routed_stations")
    captured_at = latest[0] if latest else None
    if captured_at is None:
        return {"captured_at": None, "stations": [], "zones": [], "regions": [], "drivers": []}

    all_rows = await _fetch_routed_rows(captured_at)
    scoped = _scope_filter_stations(all_rows, user)

    def to_group(rows, key):
        return [{**{k: g[k] for k in _ROUTED_COLUMNS}, "key": g[key], "station_count": g["station_count"]}
                for g in rows if g["station_count"] > 0]

    driver_rows = _scope_filter_stations(
        [{**d, "station_name": d["current_station"], "zone": d["zone"], "region": d["region"]} for d in _routed_drivers],
        user,
    )

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "stations": scoped,
        "zones": to_group(rollup_routed(scoped, "zone"), "zone"),
        "regions": to_group(rollup_routed(scoped, "region"), "region"),
        "drivers": driver_rows,
    }


# ---------------------------------------------------------------------------
# Admin: users
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    email: str
    role: str
    scope_type: str
    scope_value: str | None
    display_name: str | None
    created_at: str


class UserIn(BaseModel):
    email: str
    role: str  # 'admin' | 'manager' | 'station'
    scope_type: str  # 'all' | 'region' | 'zone' | 'station'
    scope_value: str | None = None
    display_name: str | None = None


class OkResult(BaseModel):
    ok: bool
    detail: str | None = None


def _require_admin(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@app.get("/api/admin/users", response_model=list[UserOut])
async def list_users(user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    rows = await db.fetch_all(
        "SELECT email, role, scope_type, scope_value, display_name, created_at FROM users ORDER BY created_at"
    )
    return [
        {
            "email": r[0], "role": r[1], "scope_type": r[2], "scope_value": r[3],
            "display_name": r[4], "created_at": str(r[5]),
        }
        for r in rows
    ]


_VALID_ROLES = {"admin", "manager", "station"}
_VALID_SCOPE_TYPES = {"all", "region", "zone", "station"}


def _validate_user_in(payload: UserIn) -> None:
    if payload.role not in _VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of {sorted(_VALID_ROLES)}")
    if payload.scope_type not in _VALID_SCOPE_TYPES:
        raise HTTPException(status_code=422, detail=f"scope_type must be one of {sorted(_VALID_SCOPE_TYPES)}")
    if payload.scope_type == "region" and payload.scope_value not in REGIONS:
        raise HTTPException(status_code=422, detail=f"scope_value must be one of {REGIONS}")
    if payload.scope_type == "zone" and payload.scope_value not in ZONES:
        raise HTTPException(status_code=422, detail=f"scope_value must be one of {ZONES}")
    if payload.scope_type == "station":
        valid_names = {name for name, _full, _zone, _region in HUBS.values()}
        if payload.scope_value not in valid_names:
            raise HTTPException(status_code=422, detail="scope_value must be a valid station name")


@app.post("/api/admin/users", response_model=OkResult)
async def add_user(payload: UserIn, user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    _validate_user_in(payload)
    existing = await db.fetch_one("SELECT id FROM users WHERE email=%s", (payload.email,))
    if existing:
        raise HTTPException(status_code=409, detail="That email is already set up")
    await db.execute(
        """INSERT INTO users (email, role, scope_type, scope_value, display_name, invited_by)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (payload.email, payload.role, payload.scope_type, payload.scope_value,
         payload.display_name, user.email),
    )
    return {"ok": True}


@app.patch("/api/admin/users/{email}", response_model=OkResult)
async def update_user(email: str, payload: UserIn, user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    _validate_user_in(payload)
    result = await db.execute(
        """UPDATE users SET role=%s, scope_type=%s, scope_value=%s, display_name=%s
           WHERE email=%s""",
        (payload.role, payload.scope_type, payload.scope_value, payload.display_name, email),
    )
    return {"ok": True}


@app.delete("/api/admin/users/{email}", response_model=OkResult)
async def delete_user(email: str, user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    if email == user.email:
        raise HTTPException(status_code=400, detail="You can't remove your own access")
    await db.execute("DELETE FROM users WHERE email=%s", (email,))
    return {"ok": True}


class StationMeta(BaseModel):
    station_code: str
    station_name: str
    zone: str
    region: str


@app.get("/api/stations", response_model=list[StationMeta])
async def list_stations(user: CurrentUser = Depends(get_current_user)):
    return [
        {"station_code": code, "station_name": name, "zone": zone, "region": region}
        for code, (name, _full, zone, region) in sorted(HUBS.items(), key=lambda kv: kv[1][0])
    ]


class RegionMeta(BaseModel):
    region: str
    zones: list[str]


@app.get("/api/regions", response_model=list[RegionMeta])
async def list_regions(user: CurrentUser = Depends(get_current_user)):
    return [{"region": r, "zones": zs} for r, zs in ZONES_BY_REGION.items()]


# ---------------------------------------------------------------------------
# Admin: manual refresh
# ---------------------------------------------------------------------------

class RefreshStatus(BaseModel):
    id: int
    started_at: str
    finished_at: str | None
    status: str
    stations_count: int | None
    error_message: str | None
    triggered_by: str | None


@app.post("/api/admin/refresh", response_model=RefreshStatus)
async def trigger_refresh(user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    await refresh_metrics(triggered_by=user.email)
    row = await db.fetch_one(
        """SELECT id, started_at, finished_at, status, stations_count, error_message, triggered_by
           FROM refresh_log ORDER BY id DESC LIMIT 1"""
    )
    return _refresh_row_to_dict(row)


@app.get("/api/admin/refresh-status", response_model=RefreshStatus | None)
async def refresh_status(user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    row = await db.fetch_one(
        """SELECT id, started_at, finished_at, status, stations_count, error_message, triggered_by
           FROM refresh_log ORDER BY id DESC LIMIT 1"""
    )
    return _refresh_row_to_dict(row) if row else None


def _refresh_row_to_dict(row) -> dict:
    return {
        "id": row[0], "started_at": str(row[1]), "finished_at": str(row[2]) if row[2] else None,
        "status": row[3], "stations_count": row[4], "error_message": row[5], "triggered_by": row[6],
    }
