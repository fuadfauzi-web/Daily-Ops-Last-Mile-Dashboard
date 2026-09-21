"""Daily Ops Last Mile Dashboard — backend.

Pulls parcel-level and route-level data straight from Redash (queries 78, 1297, 653,
512, 1239, 1500, 1296, 1585, 58, 1451, 1397 -- see aggregate.py for exactly how each
field is used), aggregates it per station/zone/region nationwide across seven views
(Station Health, Shipment Details, Routed View, Shipper Watch, Aging Details, Old
Route, RPU), and serves it scoped to whoever is asking (role-based access, see
auth.py).

Runtime contract: port 8000, GET /health, everything else under /api. See
CLAUDE.md's "Substrait deployment" block for the platform's deploy rules.
"""
import asyncio
import csv
import io
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
from aggregate import (
    AGING_BUCKET_LABELS, AGING_KEYS, AGING_TYPES, AGING_TYPE_LABELS, DRILLDOWN_METRICS, DRIVER_TYPE_BUCKETS,
    METRIC_KEYS, OLD_ROUTE_ROWS_CAP, ROUTED_STATION_KEYS, RPU_PIVOT_KEYS, RPU_ROWS_CAP, RPU_STAGE_LABELS,
    SHIPMENT_DETAIL_KEYS, SHIPMENT_DRILLDOWN_METRICS, SHIPPER_DRILLDOWN_METRICS, SHIPPER_WATCH_KEYS,
    DEFAULT_HIGH_COD_VALUE_THRESHOLD, DEFAULT_HIGH_VALUE_ITEM_KEYWORDS, bucket_rpu_aging, build_aging_details,
    build_missing_details, build_old_route, build_pending_yesterday_route, build_routed_view, build_rpu,
    build_shipment_details, build_shipper_watch, build_station_metrics, compute_tenure, merge_routed_into_station_metrics,
    rollup, rollup_aging, rollup_missing_details, rollup_old_route, rollup_routed, rollup_routed_by_driver_type,
    rollup_rpu, rollup_shipment_details, rollup_shipper_watch, rpu_station_pivot,
)
from auth import CurrentUser, get_current_user, parse_scope_values
from redash_client import (
    QUERY_ACTIVE_MISSING, QUERY_DELIVERY_PERFORMANCE, QUERY_HEALTH_V3, QUERY_LH_TIMING, QUERY_OLD_ROUTE,
    QUERY_RESTOCK_NXD, QUERY_RPU, QUERY_SHIPMENT_TRACKER, QUERY_TOTAL_SHIPMENTS, QUERY_UNSWEEP, QUERY_ZALORA_NXD,
    RedashError, fetch_query_results,
)
from stations import HUBS, REGIONS, ZONES, ZONES_BY_REGION

_MYT = timezone(timedelta(hours=8))

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("dashboard")

REFRESH_INTERVAL_SECONDS = 15 * 60  # every 15 minutes
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

# Shipper Watch drilldown, same in-memory pattern as _tn_cache.
_shipper_tn_cache: dict[str, dict[str, list]] = {}
_shipper_tn_cache_captured_at: str | None = None

# Aging Details' TN-level rows, one flat list per type (region/zone/station scoping
# happens at request time, same as _routed_drivers). Not persisted -- only the
# pivot counts go to the DB.
_aging_rows_cache: dict[str, list[dict]] = {t: [] for t in AGING_TYPES}
_aging_rows_captured_at: str | None = None

# Old Route's TN-level rows and driver rollup, same in-memory pattern.
_old_route_rows: list[dict] = []
_old_route_drivers: list[dict] = []
_old_route_captured_at: str | None = None

# RPU's TN-level rows, one flat list covering all 3 stages -- stage/shipper/age
# filtering all happens at request time (see /api/rpu, /api/rpu-aging).
_rpu_rows_cache: list[dict] = []
_rpu_rows_captured_at: str | None = None

# Recovery tab's Missing Details, same in-memory pattern as _old_route_rows.
_missing_details_stations: list[dict] = []
_missing_details_tn_rows: list[dict] = []
_missing_details_captured_at: str | None = None
# The cod_threshold/item_keywords actually used to compute is_high_value above,
# for display -- kept alongside rather than re-read from the DB per request.
_missing_details_cod_threshold: float = DEFAULT_HIGH_COD_VALUE_THRESHOLD
_missing_details_item_keywords: list[str] = list(DEFAULT_HIGH_VALUE_ITEM_KEYWORDS)

# Urgent TN's per-tracking-number lookup, keyed by tracking_id -- built fresh from
# the same query 78 rows already fetched for Station Health every 30 minutes, not
# a live per-search Redash call.
_health_v3_by_tn: dict[str, dict] = {}
_health_v3_by_tn_captured_at: str | None = None

# Routed View's "Pending in Yesterday Route" -- persisted (see
# V18__pending_yesterday_route.sql) since it must survive a restart mid-day,
# unlike every other cache on this page.
MISSING_DETAILS_TN_CAP = 2000
PENDING_YESTERDAY_TN_CAP = 2000

_SHIPMENT_COLUMNS = SHIPMENT_DETAIL_KEYS + ("fresh_attempt_pct", "process_time_minutes")
_ROUTED_COLUMNS = ROUTED_STATION_KEYS + ("cod_pct", "success_rate", "completion_rate")
_SHIPPER_COLUMNS = SHIPPER_WATCH_KEYS
_AGING_COLUMNS = AGING_KEYS


async def refresh_metrics(triggered_by: str | None = None) -> dict:
    """Pulls fresh data from Redash, recomputes station metrics, stores a new snapshot."""
    started_at = datetime.now(timezone.utc)
    log_id = await db.execute(
        "INSERT INTO refresh_log (started_at, status, triggered_by) VALUES (%s, 'running', %s)",
        (started_at, triggered_by),
    )
    try:
        # Each fetch also asks Redash to actually re-run the query first (see
        # redash_client._trigger_refresh) -- that can take a while, so all 11
        # run concurrently rather than one after another.
        (
            health_rows, missing_rows, shipment_rows, routed_rows, tracker_rows, lh_rows,
            zalora_rows, restock_rows, unsweep_rows, old_route_raw_rows, rpu_raw_rows,
        ) = await asyncio.gather(
            fetch_query_results(QUERY_HEALTH_V3),
            fetch_query_results(QUERY_ACTIVE_MISSING),
            fetch_query_results(QUERY_TOTAL_SHIPMENTS),
            fetch_query_results(QUERY_DELIVERY_PERFORMANCE),
            fetch_query_results(QUERY_SHIPMENT_TRACKER),
            fetch_query_results(QUERY_LH_TIMING),
            fetch_query_results(QUERY_ZALORA_NXD),
            fetch_query_results(QUERY_RESTOCK_NXD),
            fetch_query_results(QUERY_UNSWEEP),
            fetch_query_results(QUERY_OLD_ROUTE),
            fetch_query_results(QUERY_RPU),
        )

        by_station, tn_details = build_station_metrics(health_rows, missing_rows, shipment_rows, unsweep_rows)
        routed_by_station, driver_rows = build_routed_view(routed_rows)
        merge_routed_into_station_metrics(by_station, routed_by_station)
        shipment_by_station, shipment_tn_details = build_shipment_details(shipment_rows, tracker_rows, lh_rows, health_rows)
        shipper_by_station, shipper_tn_details = build_shipper_watch(health_rows, zalora_rows, restock_rows)
        aging_by_type_station, aging_by_type_rows = build_aging_details(health_rows)
        old_route_by_station, old_route_tn_rows, old_route_driver_rows = build_old_route(old_route_raw_rows)
        rpu_by_station, rpu_rows_flat = build_rpu(rpu_raw_rows)

        recovery_settings_row = await db.fetch_one(
            "SELECT high_cod_value_threshold, high_value_item_keywords FROM recovery_settings WHERE id = 1"
        )
        if recovery_settings_row:
            cod_threshold = recovery_settings_row[0]
            item_keywords = tuple(k.strip().lower() for k in recovery_settings_row[1].split(",") if k.strip())
        else:
            cod_threshold = DEFAULT_HIGH_COD_VALUE_THRESHOLD
            item_keywords = DEFAULT_HIGH_VALUE_ITEM_KEYWORDS
        missing_details_by_station, missing_details_tn_rows = build_missing_details(
            missing_rows, cod_threshold, item_keywords
        )

        captured_at = datetime.now(timezone.utc)
        global _tn_cache_captured_at, _shipment_tn_cache_captured_at, _routed_drivers, _routed_drivers_captured_at
        global _shipper_tn_cache_captured_at, _aging_rows_captured_at
        global _old_route_rows, _old_route_drivers, _old_route_captured_at, _rpu_rows_cache, _rpu_rows_captured_at
        global _missing_details_stations, _missing_details_tn_rows, _missing_details_captured_at
        global _missing_details_cod_threshold, _missing_details_item_keywords
        global _health_v3_by_tn, _health_v3_by_tn_captured_at
        _tn_cache.clear()
        _tn_cache.update(tn_details)
        _tn_cache_captured_at = captured_at.isoformat()
        _shipment_tn_cache.clear()
        _shipment_tn_cache.update(shipment_tn_details)
        _shipment_tn_cache_captured_at = captured_at.isoformat()
        _routed_drivers = driver_rows
        _routed_drivers_captured_at = captured_at.isoformat()
        _shipper_tn_cache.clear()
        _shipper_tn_cache.update(shipper_tn_details)
        _shipper_tn_cache_captured_at = captured_at.isoformat()
        _aging_rows_cache.clear()
        _aging_rows_cache.update(aging_by_type_rows)
        _aging_rows_captured_at = captured_at.isoformat()
        _old_route_rows = old_route_tn_rows
        _old_route_drivers = old_route_driver_rows
        _old_route_captured_at = captured_at.isoformat()
        _rpu_rows_cache = rpu_rows_flat
        _rpu_rows_captured_at = captured_at.isoformat()
        _missing_details_stations = list(missing_details_by_station.values())
        _missing_details_tn_rows = missing_details_tn_rows
        _missing_details_cod_threshold = cod_threshold
        _missing_details_item_keywords = list(item_keywords)
        _missing_details_captured_at = captured_at.isoformat()
        _health_v3_by_tn = {
            r["tracking_id"]: {
                "dest_hub": r.get("dest_hub"),
                "last_sweep_hub": r.get("last_scan_hub_name"),
                "status": r.get("granular_status"),
                "age": r.get("days_since_current_hub_first_sweep"),
                "attempts": r.get("delivery_attempts"),
                "cod": r.get("cod"),
            }
            for r in health_rows
            if r.get("tracking_id")
        }
        _health_v3_by_tn_captured_at = captured_at.isoformat()

        try:
            await _maybe_capture_pending_yesterday_route(health_rows)
        except Exception:  # noqa: BLE001 - isolated so a bug here can't fail the whole refresh
            log.exception("Pending Yesterday Route capture failed")

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

        shipper_params = [
            (
                captured_at, row["station_code"], row["station_name"], row["zone"], row["region"],
                *[row[c] for c in _SHIPPER_COLUMNS],
            )
            for row in shipper_by_station.values()
        ]
        await db.execute_many(
            f"""INSERT INTO shipper_watch
               (captured_at, station_code, station_name, zone, region, {", ".join(_SHIPPER_COLUMNS)})
               VALUES ({", ".join(["%s"] * (5 + len(_SHIPPER_COLUMNS)))})""",
            shipper_params,
        )

        aging_params = [
            (
                captured_at, t, row["station_code"], row["station_name"], row["zone"], row["region"],
                *[row[c] for c in _AGING_COLUMNS],
            )
            for t in AGING_TYPES
            for row in aging_by_type_station[t].values()
        ]
        await db.execute_many(
            f"""INSERT INTO aging_details
               (captured_at, type, station_code, station_name, zone, region, {", ".join(_AGING_COLUMNS)})
               VALUES ({", ".join(["%s"] * (6 + len(_AGING_COLUMNS)))})""",
            aging_params,
        )

        old_route_params = [
            (captured_at, row["station_code"], row["station_name"], row["zone"], row["region"], row["total_tn"])
            for row in old_route_by_station.values()
        ]
        await db.execute_many(
            """INSERT INTO old_route (captured_at, station_code, station_name, zone, region, total_tn)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            old_route_params,
        )

        rpu_params = [
            (
                captured_at, row["station_code"], row["station_name"], row["zone"], row["region"],
                *[row[c] for c in RPU_PIVOT_KEYS],
            )
            for row in rpu_by_station.values()
        ]
        await db.execute_many(
            f"""INSERT INTO rpu_snapshot (captured_at, station_code, station_name, zone, region, {", ".join(RPU_PIVOT_KEYS)})
               VALUES ({", ".join(["%s"] * (5 + len(RPU_PIVOT_KEYS)))})""",
            rpu_params,
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


async def _maybe_capture_pending_yesterday_route(health_v3_rows: list[dict]) -> None:
    """Captures Routed View's "Pending in Yesterday Route" snapshot once per
    Malaysia calendar day, on the first refresh at or after 00:30 MYT -- a no-op
    every other refresh that day (checked via the captured_for_date primary key).
    Runs off whatever health_v3_rows this refresh cycle already fetched rather
    than hitting Redash again."""
    now_myt = datetime.now(_MYT)
    if (now_myt.hour, now_myt.minute) < (0, 30):
        return
    today_myt = now_myt.date()
    already = await db.fetch_one(
        "SELECT 1 FROM pending_yesterday_route WHERE captured_for_date = %s LIMIT 1", (today_myt,)
    )
    if already:
        return

    by_station, tn_rows = build_pending_yesterday_route(health_v3_rows)
    captured_at = datetime.now(timezone.utc)

    station_params = [
        (captured_at, today_myt, row["station_code"], row["station_name"], row["zone"], row["region"], row["total_tn"])
        for row in by_station.values()
        if row["total_tn"] > 0
    ]
    if station_params:
        await db.execute_many(
            """INSERT IGNORE INTO pending_yesterday_route
               (captured_at, captured_for_date, station_code, station_name, zone, region, total_tn)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            station_params,
        )

    tn_params = [
        (today_myt, r["tracking_number"], r["station_code"], r["station_name"], r["zone"], r["region"],
         r["dest_hub"], r["age"], r["attempts"])
        for r in tn_rows
    ]
    if tn_params:
        await db.execute_many(
            """INSERT IGNORE INTO pending_yesterday_route_tns
               (captured_for_date, tracking_number, station_code, station_name, zone, region, dest_hub, age, attempts)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            tn_params,
        )
    log.info("Pending Yesterday Route captured for %s: %d TNs", today_myt, len(tn_params))


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
    scope_values: list[str] = []
    display_name: str | None = None


@app.get("/api/me", response_model=Me)
async def me(x_forwarded_email: str | None = Header(default=None, alias="X-Forwarded-Email")):
    if not x_forwarded_email:
        return {"email": None, "provisioned": False}
    row = await db.fetch_one(
        "SELECT email, role, scope_type, scope_values, display_name FROM users WHERE email = %s",
        (x_forwarded_email,),
    )
    if row is None:
        return {"email": x_forwarded_email, "provisioned": False}
    await db.execute("UPDATE users SET last_seen_at=%s WHERE email=%s", (datetime.now(timezone.utc), x_forwarded_email))
    return {
        "email": row[0], "provisioned": True, "role": row[1], "scope_type": row[2],
        "scope_values": parse_scope_values(row[3]), "display_name": row[4],
    }


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class MetricFields(BaseModel):
    total_in_hub: int
    zero_attempt_total: int
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
    unsweep_document: int
    unsweep_parcel: int
    cod_pct_hub: float
    total_routed: int
    routed_pct: float
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
    yesterday_captured_at: str | None = None
    yesterday_stations: list[StationRow] = []


def _scope_filter_stations(rows: list[dict], user: CurrentUser) -> list[dict]:
    if user.scope_type == "all":
        return rows
    if user.scope_type == "region":
        return [r for r in rows if r["region"] in user.scope_values]
    if user.scope_type == "zone":
        return [r for r in rows if r["zone"] in user.scope_values]
    if user.scope_type == "station":
        return [r for r in rows if r["station_name"] in user.scope_values]
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

    # "Compare vs. yesterday": the latest snapshot at or before this time
    # yesterday -- close enough given a 30-minute refresh cadence. None until
    # the app has been running for a day, which is fine: the frontend just
    # shows no delta rather than a bogus one.
    yesterday = await db.fetch_one(
        "SELECT MAX(captured_at) FROM station_metrics WHERE captured_at <= DATE_SUB(%s, INTERVAL 1 DAY)",
        (captured_at,),
    )
    yesterday_captured_at = yesterday[0] if yesterday else None
    yesterday_scoped: list[dict] = []
    if yesterday_captured_at is not None:
        yesterday_scoped = _scope_filter_stations(await _fetch_station_rows(yesterday_captured_at), user)

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "stations": scoped,
        "zones": to_group(zone_groups, "zone"),
        "regions": to_group(region_groups, "region"),
        "previous_captured_at": (
            previous_captured_at.isoformat() if hasattr(previous_captured_at, "isoformat") else previous_captured_at
        ),
        "previous_stations": previous_scoped,
        "yesterday_captured_at": (
            yesterday_captured_at.isoformat() if hasattr(yesterday_captured_at, "isoformat") else yesterday_captured_at
        ),
        "yesterday_stations": yesterday_scoped,
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
    process_time_minutes: float | None


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
    zero_attempt: int
    routed_pct: float
    attendance: int
    attendance_hd: int
    attendance_hr: int
    attendance_id: int
    attendance_ir: int
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
    region: str
    station_count: int


class RoutedDriverRow(BaseModel):
    driver_name: str
    driver_type: str
    home_station: str | None
    current_station: str | None
    station_name: str | None
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
    tenure: str | None = None


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
async def routed_view(driver_type: str | None = None, user: CurrentUser = Depends(get_current_user)):
    if driver_type not in (None, "hybrid", "independent", "other"):
        raise HTTPException(400, "driver_type must be hybrid, independent, or other")
    latest = await db.fetch_one("SELECT MAX(captured_at) FROM routed_stations")
    captured_at = latest[0] if latest else None
    if captured_at is None:
        return {"captured_at": None, "stations": [], "zones": [], "regions": [], "drivers": []}

    # "Total 0 Attempt"/Total In Hub -- merged in from the latest Station Health
    # snapshot so Routed % and Total 0 Attempt are visible alongside routed metrics
    # without duplicating that computation here. zero_attempt_total (not the D0-only
    # zero_attempt) is what Route Monitoring calls "0 Attempt" -- see aggregate.py's
    # build_station_metrics for the full D0/>D0 split this sums.
    health_latest = await db.fetch_one("SELECT MAX(captured_at) FROM station_metrics")
    zero_attempt_by_station: dict[str, int] = {}
    total_in_hub_by_station: dict[str, int] = {}
    station_name_by_code: dict[str, str] = {}
    if health_latest and health_latest[0] is not None:
        for r in await db.fetch_all(
            "SELECT station_code, station_name, zero_attempt_total, total_in_hub FROM station_metrics WHERE captured_at = %s",
            (health_latest[0],),
        ):
            station_name_by_code[r[0]] = r[1]
            zero_attempt_by_station[r[0]] = r[2]
            total_in_hub_by_station[r[0]] = r[3]

    driver_rows = _scope_filter_stations(
        [{**d, "station_name": d["current_station"], "zone": d["zone"], "region": d["region"]} for d in _routed_drivers],
        user,
    )

    # Tenure: joined from the manually-uploaded driver/rider details CSV (Settings ->
    # Documents), matched by exact driver_name == "Display Name" -- see
    # upload_driver_details below and aggregate.compute_tenure.
    tenure_start_by_name: dict[str, date] = {
        r[0]: r[1]
        for r in await db.fetch_all(
            "SELECT display_name, employment_start_date FROM driver_details WHERE employment_start_date IS NOT NULL"
        )
    }
    if tenure_start_by_name:
        today_myt = datetime.now(_MYT).date()
        for row in driver_rows:
            start = tenure_start_by_name.get(row["driver_name"])
            row["tenure"] = compute_tenure(start, today_myt) if start else None

    if driver_type is None:
        # Fast path: today's default view reads the persisted per-refresh snapshot,
        # same as before the driver-type filter existed.
        all_rows = await _fetch_routed_rows(captured_at)
        for row in all_rows:
            row["zero_attempt"] = zero_attempt_by_station.get(row["station_code"], 0)
            row["total_in_hub"] = total_in_hub_by_station.get(row["station_code"], 0)
            denom = row["total_routed"] + row["total_in_hub"]
            row["routed_pct"] = round(row["total_routed"] / denom * 100, 2) if denom else 0.0

        scoped = _scope_filter_stations(all_rows, user)
        extra_keys = ("zero_attempt", "total_in_hub")

        def to_group(rows, key):
            out = []
            for g in rows:
                if g["station_count"] == 0:
                    continue
                d = {**{k: g[k] for k in _ROUTED_COLUMNS + extra_keys}, "key": g[key], "region": g["region"], "station_count": g["station_count"]}
                d_denom = d["total_routed"] + d["total_in_hub"]
                d["routed_pct"] = round(d["total_routed"] / d_denom * 100, 2) if d_denom else 0.0
                out.append(d)
            return out

        stations_out = scoped
        zones_out = to_group(rollup_routed(scoped, "zone", extra_keys), "zone")
        regions_out = to_group(rollup_routed(scoped, "region", extra_keys), "region")
    else:
        # Filtered path: the persisted routed_stations snapshot has no per-type
        # breakdown, so station/zone/region rollups are rebuilt fresh from the
        # (already role-scoped) per-driver rows instead.
        def build_level(group_key):
            rows = rollup_routed_by_driver_type(driver_rows, group_key, driver_type)
            out = []
            for g in rows:
                zero_attempt = sum(zero_attempt_by_station.get(c, 0) for c in g["station_codes"])
                total_in_hub = sum(total_in_hub_by_station.get(c, 0) for c in g["station_codes"])
                denom = g["total_routed"] + total_in_hub
                row = {
                    **{k: v for k, v in g.items() if k != "station_codes"},
                    "zero_attempt": zero_attempt,
                    "total_in_hub": total_in_hub,
                    "routed_pct": round(g["total_routed"] / denom * 100, 2) if denom else 0.0,
                }
                if group_key == "station_code":
                    row["station_code"] = g["station_code"]
                    row["station_name"] = station_name_by_code.get(g["station_code"], g["station_code"])
                else:
                    row["key"] = g[group_key]
                out.append(row)
            return out

        stations_out = build_level("station_code")
        zones_out = build_level("zone")
        regions_out = build_level("region")
        driver_rows = [d for d in driver_rows if d["position"] in DRIVER_TYPE_BUCKETS.get(driver_type, set())]

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "stations": stations_out,
        "zones": zones_out,
        "regions": regions_out,
        "drivers": driver_rows,
    }


# ---------------------------------------------------------------------------
# Shipper Watch
# ---------------------------------------------------------------------------

class ShipperFields(BaseModel):
    amway_zero_attempt: int
    amway_aging: int
    watson_zero_attempt: int
    watson_aging: int
    orca_ovfd: int
    orca_other: int
    sodaxpress_ovfd: int
    sodaxpress_other: int
    zalora_zero_attempt: int
    zalora_ovfd: int
    zalora_other: int
    restock_bundles: int
    restock_pieces: int
    restock_potential_breach: int
    restock_breach: int


class ShipperStationRow(ShipperFields):
    station_code: str
    station_name: str
    zone: str
    region: str


class ShipperGroupRow(ShipperFields):
    key: str
    region: str
    station_count: int


class ShipperWatchResponse(BaseModel):
    captured_at: str | None
    stations: list[ShipperStationRow]
    zones: list[ShipperGroupRow]
    regions: list[ShipperGroupRow]


async def _fetch_shipper_rows(captured_at) -> list[dict]:
    db_rows = await db.fetch_all(
        f"""SELECT station_code, station_name, zone, region, {", ".join(_SHIPPER_COLUMNS)}
           FROM shipper_watch WHERE captured_at = %s""",
        (captured_at,),
    )
    return [
        {
            "station_code": r[0], "station_name": r[1], "zone": r[2], "region": r[3],
            **{col: r[4 + i] for i, col in enumerate(_SHIPPER_COLUMNS)},
        }
        for r in db_rows
    ]


@app.get("/api/shipper-watch", response_model=ShipperWatchResponse)
async def shipper_watch(user: CurrentUser = Depends(get_current_user)):
    latest = await db.fetch_one("SELECT MAX(captured_at) FROM shipper_watch")
    captured_at = latest[0] if latest else None
    if captured_at is None:
        return {"captured_at": None, "stations": [], "zones": [], "regions": []}

    all_rows = await _fetch_shipper_rows(captured_at)
    scoped = _scope_filter_stations(all_rows, user)

    def to_group(rows, key):
        return [
            {**{k: g[k] for k in _SHIPPER_COLUMNS}, "key": g[key], "region": g["region"], "station_count": g["station_count"]}
            for g in rows if g["station_count"] > 0
        ]

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "stations": scoped,
        "zones": to_group(rollup_shipper_watch(scoped, "zone"), "zone"),
        "regions": to_group(rollup_shipper_watch(scoped, "region"), "region"),
    }


class ShipperDrilldownResponse(BaseModel):
    station_code: str
    station_name: str
    metric: str
    tracking_numbers: list[str]
    as_of: str | None


@app.get("/api/shipper-drilldown", response_model=ShipperDrilldownResponse)
async def shipper_drilldown(station_code: str, metric: str, user: CurrentUser = Depends(get_current_user)):
    if metric not in SHIPPER_DRILLDOWN_METRICS:
        raise HTTPException(status_code=422, detail=f"metric must be one of {list(SHIPPER_DRILLDOWN_METRICS)}")
    hub = HUBS.get(station_code)
    if hub is None:
        raise HTTPException(status_code=404, detail="Unknown station")
    name, _full_name, zone, region = hub
    in_scope = _scope_filter_stations(
        [{"station_code": station_code, "station_name": name, "zone": zone, "region": region}], user
    )
    if not in_scope:
        raise HTTPException(status_code=403, detail="That station isn't in your scope")
    tracking_numbers = [t for t in _shipper_tn_cache.get(station_code, {}).get(metric, []) if t]
    return {
        "station_code": station_code, "station_name": name, "metric": metric,
        "tracking_numbers": tracking_numbers, "as_of": _shipper_tn_cache_captured_at,
    }


# ---------------------------------------------------------------------------
# Aging Details -- 5 sub-views (see AGING_TYPES/AGING_TYPE_LABELS in aggregate.py),
# each with a station x age-bucket pivot plus a full TN-level row list.
# ---------------------------------------------------------------------------

class AgingFields(BaseModel):
    total: int
    age_0: int
    age_1: int
    age_2: int
    age_3: int
    age_4_6: int
    age_7_plus: int


class AgingStationRow(AgingFields):
    station_code: str
    station_name: str
    zone: str
    region: str


class AgingGroupRow(AgingFields):
    key: str
    region: str
    station_count: int


class AgingRow(BaseModel):
    station_code: str
    station_name: str
    tracking_number: str | None
    status: str | None
    attempts: int
    age: int
    tag: str | None
    cod: str | None
    dest_hub: str | None


AGING_TN_ROWS_CAP = 2000  # nationwide "Overall" can be tens of thousands of parcels;
# capping keeps the response fast. Sorted worst-first (oldest), so the cap still
# surfaces what matters most; narrowing with region/zone/search sees the rest.


class AgingDetailsResponse(BaseModel):
    captured_at: str | None
    type: str
    type_label: str
    buckets: list[str]
    stations: list[AgingStationRow]
    zones: list[AgingGroupRow]
    regions: list[AgingGroupRow]
    tn_rows: list[AgingRow]
    tn_rows_total: int
    tn_rows_truncated: bool


async def _fetch_aging_rows(captured_at, aging_type: str) -> list[dict]:
    db_rows = await db.fetch_all(
        f"""SELECT station_code, station_name, zone, region, {", ".join(_AGING_COLUMNS)}
           FROM aging_details WHERE captured_at = %s AND type = %s""",
        (captured_at, aging_type),
    )
    return [
        {
            "station_code": r[0], "station_name": r[1], "zone": r[2], "region": r[3],
            **{col: r[4 + i] for i, col in enumerate(_AGING_COLUMNS)},
        }
        for r in db_rows
    ]


@app.get("/api/aging-details", response_model=AgingDetailsResponse)
async def aging_details(type: str = "overall", user: CurrentUser = Depends(get_current_user)):
    if type not in AGING_TYPES:
        raise HTTPException(status_code=422, detail=f"type must be one of {list(AGING_TYPES)}")

    latest = await db.fetch_one("SELECT MAX(captured_at) FROM aging_details WHERE type = %s", (type,))
    captured_at = latest[0] if latest else None
    if captured_at is None:
        return {
            "captured_at": None, "type": type, "type_label": AGING_TYPE_LABELS[type],
            "buckets": list(AGING_BUCKET_LABELS.values()), "stations": [], "zones": [], "regions": [], "tn_rows": [],
            "tn_rows_total": 0, "tn_rows_truncated": False,
        }

    all_rows = await _fetch_aging_rows(captured_at, type)
    scoped = _scope_filter_stations(all_rows, user)
    scoped_codes = {r["station_code"] for r in scoped}

    def to_group(rows, key):
        return [
            {**{k: g[k] for k in _AGING_COLUMNS}, "key": g[key], "region": g["region"], "station_count": g["station_count"]}
            for g in rows if g["station_count"] > 0
        ]

    tn_rows = [r for r in _aging_rows_cache.get(type, []) if r["station_code"] in scoped_codes]
    tn_rows_total = len(tn_rows)
    tn_rows_truncated = tn_rows_total > AGING_TN_ROWS_CAP
    if tn_rows_truncated:
        tn_rows = sorted(tn_rows, key=lambda r: r["age"], reverse=True)[:AGING_TN_ROWS_CAP]

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "type": type,
        "type_label": AGING_TYPE_LABELS[type],
        "buckets": list(AGING_BUCKET_LABELS.values()),
        "stations": scoped,
        "zones": to_group(rollup_aging(scoped, "zone"), "zone"),
        "regions": to_group(rollup_aging(scoped, "region"), "region"),
        "tn_rows": tn_rows,
        "tn_rows_total": tn_rows_total,
        "tn_rows_truncated": tn_rows_truncated,
    }


# ---------------------------------------------------------------------------
# Old Route (query 1451) -- tracking numbers stuck on their original Route ID/date.
# ---------------------------------------------------------------------------

OLD_ROUTE_COLUMNS = ("total_tn",)


class OldRouteStationRow(BaseModel):
    station_code: str
    station_name: str
    zone: str
    region: str
    total_tn: int


class OldRouteGroupRow(BaseModel):
    key: str
    region: str
    station_count: int
    total_tn: int


class OldRouteTnRow(BaseModel):
    station_code: str
    station_name: str
    tracking_number: str | None
    route_id: str | None
    route_date: str | None
    age: int
    driver_name: str | None
    shipper_name: str | None


class OldRouteDriverRow(BaseModel):
    driver_name: str
    driver_type: str
    station_name: str | None
    zone: str | None
    region: str | None
    total_tn: int


class OldRouteResponse(BaseModel):
    captured_at: str | None
    stations: list[OldRouteStationRow]
    zones: list[OldRouteGroupRow]
    regions: list[OldRouteGroupRow]
    drivers: list[OldRouteDriverRow]
    tn_rows: list[OldRouteTnRow]
    tn_rows_total: int
    tn_rows_truncated: bool


async def _fetch_old_route_rows(captured_at) -> list[dict]:
    db_rows = await db.fetch_all(
        """SELECT station_code, station_name, zone, region, total_tn
           FROM old_route WHERE captured_at = %s""",
        (captured_at,),
    )
    return [
        {"station_code": r[0], "station_name": r[1], "zone": r[2], "region": r[3], "total_tn": r[4]}
        for r in db_rows
    ]


@app.get("/api/old-route", response_model=OldRouteResponse)
async def old_route(user: CurrentUser = Depends(get_current_user)):
    latest = await db.fetch_one("SELECT MAX(captured_at) FROM old_route")
    captured_at = latest[0] if latest else None
    if captured_at is None:
        return {
            "captured_at": None, "stations": [], "zones": [], "regions": [], "drivers": [],
            "tn_rows": [], "tn_rows_total": 0, "tn_rows_truncated": False,
        }

    all_rows = await _fetch_old_route_rows(captured_at)
    scoped = _scope_filter_stations(all_rows, user)
    scoped_codes = {r["station_code"] for r in scoped}

    def to_group(rows, key):
        return [
            {"key": g[key], "region": g["region"], "station_count": g["station_count"], "total_tn": g["total_tn"]}
            for g in rows if g["station_count"] > 0
        ]

    driver_rows = _scope_filter_stations(_old_route_drivers, user)

    tn_rows = [r for r in _old_route_rows if r["station_code"] in scoped_codes]
    tn_rows_total = len(tn_rows)
    tn_rows_truncated = tn_rows_total > OLD_ROUTE_ROWS_CAP
    if tn_rows_truncated:
        tn_rows = sorted(tn_rows, key=lambda r: r["age"], reverse=True)[:OLD_ROUTE_ROWS_CAP]

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "stations": scoped,
        "zones": to_group(rollup_old_route(scoped, "zone"), "zone"),
        "regions": to_group(rollup_old_route(scoped, "region"), "region"),
        "drivers": driver_rows,
        "tn_rows": tn_rows,
        "tn_rows_total": tn_rows_total,
        "tn_rows_truncated": tn_rows_truncated,
    }


# ---------------------------------------------------------------------------
# RPU (query 1397) -- one merged view across all 3 pickup stages (status is a
# filter, not a separate tab) plus RPU Aging (same bucket logic as Aging
# Details, for Overall/0-Attempt). Both take an optional `shipper` filter
# (any real shipper_name, not just Zalora/Cainiao) and return the full
# shipper list for the picker.
# ---------------------------------------------------------------------------

class RpuStationRow(BaseModel):
    station_code: str
    station_name: str
    zone: str
    region: str
    pending_pickup_tn: int
    ovfd_tn: int
    pending_inbound_tn: int
    total_tn: int


class RpuGroupRow(BaseModel):
    key: str
    region: str
    station_count: int
    pending_pickup_tn: int
    ovfd_tn: int
    pending_inbound_tn: int
    total_tn: int


class RpuRow(BaseModel):
    station_code: str
    station_name: str
    tracking_number: str | None
    stage: str
    status: str | None
    attempts: int
    age: int
    failure_reason: str | None
    driver_name: str | None
    shipper_name: str | None


class RpuResponse(BaseModel):
    captured_at: str | None
    stage: str
    shipper: str | None
    shippers: list[str]
    stations: list[RpuStationRow]
    zones: list[RpuGroupRow]
    regions: list[RpuGroupRow]
    tn_rows: list[RpuRow]
    tn_rows_total: int
    tn_rows_truncated: bool


def _rpu_scoped_rows(user: CurrentUser) -> list[dict]:
    return _scope_filter_stations(_rpu_rows_cache, user)


def _rpu_shippers(rows: list[dict]) -> list[str]:
    return sorted({r["shipper_name"] for r in rows if r.get("shipper_name")})


def _rpu_empty_response(stage: str, shipper: str | None) -> dict:
    return {
        "captured_at": None, "stage": stage, "shipper": shipper, "shippers": [],
        "stations": [], "zones": [], "regions": [], "tn_rows": [], "tn_rows_total": 0, "tn_rows_truncated": False,
    }


@app.get("/api/rpu", response_model=RpuResponse)
async def rpu(stage: str = "all", shipper: str | None = None, user: CurrentUser = Depends(get_current_user)):
    if stage != "all" and stage not in RPU_STAGE_LABELS:
        raise HTTPException(status_code=422, detail=f"stage must be 'all' or one of {list(RPU_STAGE_LABELS)}")
    if _rpu_rows_captured_at is None:
        return _rpu_empty_response(stage, shipper)

    all_scoped = _rpu_scoped_rows(user)
    shippers = _rpu_shippers(all_scoped)

    # The status filter only narrows the TN table -- the summary always shows
    # every stage as its own column, so it stays built from every row
    # (shipper-filtered, but not stage-filtered).
    pivot_rows = [r for r in all_scoped if r["shipper_name"] == shipper] if shipper else all_scoped
    scoped_stations = rpu_station_pivot(pivot_rows)

    def to_group(g_rows, key):
        return [
            {**{k: g[k] for k in RPU_PIVOT_KEYS}, "key": g[key], "region": g["region"], "station_count": g["station_count"]}
            for g in g_rows if g["station_count"] > 0
        ]

    tn_rows_source = pivot_rows if stage == "all" else [r for r in pivot_rows if r["stage"] == stage]
    tn_rows_total = len(tn_rows_source)
    tn_rows_truncated = tn_rows_total > RPU_ROWS_CAP
    tn_rows = (
        sorted(tn_rows_source, key=lambda r: r["age"], reverse=True)[:RPU_ROWS_CAP]
        if tn_rows_truncated else tn_rows_source
    )

    return {
        "captured_at": _rpu_rows_captured_at,
        "stage": stage,
        "shipper": shipper,
        "shippers": shippers,
        "stations": scoped_stations,
        "zones": to_group(rollup_rpu(scoped_stations, "zone"), "zone"),
        "regions": to_group(rollup_rpu(scoped_stations, "region"), "region"),
        "tn_rows": tn_rows,
        "tn_rows_total": tn_rows_total,
        "tn_rows_truncated": tn_rows_truncated,
    }


RPU_AGING_TYPE_LABELS = {"overall": "RPU Aging Overall", "zero_attempt": "RPU Aging 0 Attempt"}


class RpuAgingResponse(BaseModel):
    captured_at: str | None
    type: str
    type_label: str
    shipper: str | None
    shippers: list[str]
    buckets: list[str]
    stations: list[AgingStationRow]
    zones: list[AgingGroupRow]
    regions: list[AgingGroupRow]
    tn_rows: list[RpuRow]
    tn_rows_total: int
    tn_rows_truncated: bool


@app.get("/api/rpu-aging", response_model=RpuAgingResponse)
async def rpu_aging(type: str = "overall", shipper: str | None = None, user: CurrentUser = Depends(get_current_user)):
    if type not in RPU_AGING_TYPE_LABELS:
        raise HTTPException(status_code=422, detail=f"type must be one of {list(RPU_AGING_TYPE_LABELS)}")
    if _rpu_rows_captured_at is None:
        return {
            **_rpu_empty_response("all", shipper), "type": type, "type_label": RPU_AGING_TYPE_LABELS[type],
            "buckets": list(AGING_BUCKET_LABELS.values()),
        }

    all_scoped = _rpu_scoped_rows(user)
    shippers = _rpu_shippers(all_scoped)

    rows = all_scoped
    if shipper:
        rows = [r for r in rows if r["shipper_name"] == shipper]

    by_station, matched_rows = bucket_rpu_aging(rows, only_zero_attempt=(type == "zero_attempt"))
    scoped_stations = _scope_filter_stations(list(by_station.values()), user)
    scoped_codes = {r["station_code"] for r in scoped_stations}
    tn_rows_all = [r for r in matched_rows if r["station_code"] in scoped_codes]

    def to_group(g_rows, key):
        return [
            {**{k: g[k] for k in AGING_KEYS}, "key": g[key], "region": g["region"], "station_count": g["station_count"]}
            for g in g_rows if g["station_count"] > 0
        ]

    tn_rows_total = len(tn_rows_all)
    tn_rows_truncated = tn_rows_total > RPU_ROWS_CAP
    tn_rows = sorted(tn_rows_all, key=lambda r: r["age"], reverse=True)[:RPU_ROWS_CAP] if tn_rows_truncated else tn_rows_all

    return {
        "captured_at": _rpu_rows_captured_at,
        "type": type,
        "type_label": RPU_AGING_TYPE_LABELS[type],
        "shipper": shipper,
        "shippers": shippers,
        "buckets": list(AGING_BUCKET_LABELS.values()),
        "stations": scoped_stations,
        "zones": to_group(rollup_aging(scoped_stations, "zone"), "zone"),
        "regions": to_group(rollup_aging(scoped_stations, "region"), "region"),
        "tn_rows": tn_rows,
        "tn_rows_total": tn_rows_total,
        "tn_rows_truncated": tn_rows_truncated,
    }


# ---------------------------------------------------------------------------
# Recovery: Missing Details
# ---------------------------------------------------------------------------


class MissingDetailsStationRow(BaseModel):
    station_code: str
    station_name: str
    zone: str
    region: str
    hub_count: int
    driver_rider_count: int
    ship_in_count: int
    ship_out_count: int
    other_count: int
    total_count: int


class MissingDetailsGroupRow(BaseModel):
    key: str
    region: str
    station_count: int
    hub_count: int
    driver_rider_count: int
    ship_in_count: int
    ship_out_count: int
    other_count: int
    total_count: int


class MissingDetailsTnRow(BaseModel):
    tracking_number: str
    station_code: str
    station_name: str
    zone: str
    region: str
    hub_code: str
    age: float | None
    type: str
    cod_value: float | None
    item_description: str | None
    is_high_value: bool


class MissingDetailsResponse(BaseModel):
    captured_at: str | None
    stations: list[MissingDetailsStationRow]
    zones: list[MissingDetailsGroupRow]
    regions: list[MissingDetailsGroupRow]
    tn_rows: list[MissingDetailsTnRow]
    tn_rows_total: int
    tn_rows_truncated: bool
    high_cod_value_threshold: float
    high_value_item_keywords: list[str]


@app.get("/api/recovery/missing-details", response_model=MissingDetailsResponse)
async def recovery_missing_details(user: CurrentUser = Depends(get_current_user)):
    if _missing_details_captured_at is None:
        return {
            "captured_at": None, "stations": [], "zones": [], "regions": [],
            "tn_rows": [], "tn_rows_total": 0, "tn_rows_truncated": False,
            "high_cod_value_threshold": _missing_details_cod_threshold,
            "high_value_item_keywords": _missing_details_item_keywords,
        }

    def to_group(rows, key):
        return [{**g, "key": g[key]} for g in rows]

    scoped_stations = _scope_filter_stations(_missing_details_stations, user)
    scoped_codes = {r["station_code"] for r in scoped_stations}
    tn_rows_all = [r for r in _missing_details_tn_rows if r["station_code"] in scoped_codes]
    tn_rows_total = len(tn_rows_all)
    tn_rows_truncated = tn_rows_total > MISSING_DETAILS_TN_CAP
    tn_rows = sorted(tn_rows_all, key=lambda r: r.get("age") or 0, reverse=True)[:MISSING_DETAILS_TN_CAP]

    return {
        "captured_at": _missing_details_captured_at,
        "stations": scoped_stations,
        "zones": to_group(rollup_missing_details(scoped_stations, "zone"), "zone"),
        "regions": to_group(rollup_missing_details(scoped_stations, "region"), "region"),
        "tn_rows": tn_rows,
        "high_cod_value_threshold": _missing_details_cod_threshold,
        "high_value_item_keywords": _missing_details_item_keywords,
        "tn_rows_total": tn_rows_total,
        "tn_rows_truncated": tn_rows_truncated,
    }


class RecoverySettings(BaseModel):
    high_cod_value_threshold: float
    high_value_item_keywords: list[str]
    changed_by: str | None = None
    changed_at: str | None = None


@app.get("/api/recovery/settings", response_model=RecoverySettings)
async def get_recovery_settings(user: CurrentUser = Depends(get_current_user)):
    row = await db.fetch_one(
        "SELECT high_cod_value_threshold, high_value_item_keywords, changed_by, changed_at FROM recovery_settings WHERE id = 1"
    )
    if not row:
        return {
            "high_cod_value_threshold": DEFAULT_HIGH_COD_VALUE_THRESHOLD,
            "high_value_item_keywords": list(DEFAULT_HIGH_VALUE_ITEM_KEYWORDS),
        }
    keywords = [k.strip() for k in row[1].split(",") if k.strip()]
    return {
        "high_cod_value_threshold": row[0], "high_value_item_keywords": keywords,
        "changed_by": row[2], "changed_at": str(row[3]) if row[3] else None,
    }


@app.put("/api/recovery/settings", response_model=RecoverySettings)
async def put_recovery_settings(payload: RecoverySettings, user: CurrentUser = Depends(get_current_user)):
    _require_can_edit_thresholds(user)
    if payload.high_cod_value_threshold < 0:
        raise HTTPException(status_code=422, detail="high_cod_value_threshold must be >= 0")
    keywords = [k.strip().lower() for k in payload.high_value_item_keywords if k.strip()]
    now = datetime.now(timezone.utc)
    await db.execute(
        """UPDATE recovery_settings SET high_cod_value_threshold=%s, high_value_item_keywords=%s,
           changed_by=%s, changed_at=%s WHERE id = 1""",
        (payload.high_cod_value_threshold, ",".join(keywords), user.email, now),
    )
    return {
        "high_cod_value_threshold": payload.high_cod_value_threshold, "high_value_item_keywords": keywords,
        "changed_by": user.email, "changed_at": now.isoformat(),
    }


# ---------------------------------------------------------------------------
# Urgent TN -- ad hoc tracking-number lookups, from query 78's own already-
# fetched data (see _health_v3_by_tn above), not a live per-search Redash call.
# ---------------------------------------------------------------------------


class UrgentTnQuery(BaseModel):
    tracking_numbers: list[str]


class UrgentTnResult(BaseModel):
    tracking_number: str
    found: bool
    dest_hub: str | None = None
    last_sweep_hub: str | None = None
    status: str | None = None
    age: float | None = None
    attempts: int | None = None
    cod: str | None = None


class UrgentTnResponse(BaseModel):
    captured_at: str | None
    results: list[UrgentTnResult]


@app.post("/api/urgent-tn-lookup", response_model=UrgentTnResponse)
async def urgent_tn_lookup(payload: UrgentTnQuery, user: CurrentUser = Depends(get_current_user)):
    seen: set[str] = set()
    results = []
    for raw in payload.tracking_numbers:
        tn = (raw or "").strip()
        if not tn or tn in seen:
            continue
        seen.add(tn)
        row = _health_v3_by_tn.get(tn)
        if row is None:
            results.append({"tracking_number": tn, "found": False})
        else:
            results.append({"tracking_number": tn, "found": True, **row})
    return {"captured_at": _health_v3_by_tn_captured_at, "results": results}


# ---------------------------------------------------------------------------
# Routed View: Pending in Yesterday Route
# ---------------------------------------------------------------------------


class PendingYesterdayStationRow(BaseModel):
    station_code: str
    station_name: str
    zone: str
    region: str
    total_tn: int


class PendingYesterdayTnRow(BaseModel):
    tracking_number: str
    station_code: str
    station_name: str
    zone: str
    region: str
    dest_hub: str | None
    age: float | None
    attempts: int | None


class PendingYesterdayResponse(BaseModel):
    captured_at: str | None
    captured_for_date: str | None
    stations: list[PendingYesterdayStationRow]
    tn_rows: list[PendingYesterdayTnRow]
    tn_rows_total: int
    tn_rows_truncated: bool


@app.get("/api/pending-yesterday-route", response_model=PendingYesterdayResponse)
async def pending_yesterday_route(user: CurrentUser = Depends(get_current_user)):
    latest = await db.fetch_one("SELECT MAX(captured_for_date) FROM pending_yesterday_route")
    for_date = latest[0] if latest else None
    if for_date is None:
        return {
            "captured_at": None, "captured_for_date": None, "stations": [],
            "tn_rows": [], "tn_rows_total": 0, "tn_rows_truncated": False,
        }

    captured_at_row = await db.fetch_one(
        "SELECT MAX(captured_at) FROM pending_yesterday_route WHERE captured_for_date = %s", (for_date,)
    )
    captured_at = captured_at_row[0] if captured_at_row else None

    station_rows = [
        {"station_code": r[0], "station_name": r[1], "zone": r[2], "region": r[3], "total_tn": r[4]}
        for r in await db.fetch_all(
            "SELECT station_code, station_name, zone, region, total_tn FROM pending_yesterday_route WHERE captured_for_date = %s",
            (for_date,),
        )
    ]
    scoped_stations = _scope_filter_stations(station_rows, user)
    scoped_codes = {r["station_code"] for r in scoped_stations}

    all_tn_rows = [
        {
            "tracking_number": r[0], "station_code": r[1], "station_name": r[2], "zone": r[3], "region": r[4],
            "dest_hub": r[5], "age": r[6], "attempts": r[7],
        }
        for r in await db.fetch_all(
            """SELECT tracking_number, station_code, station_name, zone, region, dest_hub, age, attempts
               FROM pending_yesterday_route_tns WHERE captured_for_date = %s""",
            (for_date,),
        )
    ]
    tn_rows_all = [r for r in all_tn_rows if r["station_code"] in scoped_codes]
    tn_rows_total = len(tn_rows_all)
    tn_rows_truncated = tn_rows_total > PENDING_YESTERDAY_TN_CAP
    tn_rows = sorted(tn_rows_all, key=lambda r: r.get("age") or 0, reverse=True)[:PENDING_YESTERDAY_TN_CAP]

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "captured_for_date": str(for_date),
        "stations": scoped_stations,
        "tn_rows": tn_rows,
        "tn_rows_total": tn_rows_total,
        "tn_rows_truncated": tn_rows_truncated,
    }


# ---------------------------------------------------------------------------
# Admin: Feedback -- any signed-in user can send a complaint/suggestion about
# the app itself; only admins can read the list back.
# ---------------------------------------------------------------------------


class FeedbackIn(BaseModel):
    message: str


class FeedbackRow(BaseModel):
    id: int
    email: str
    role: str
    scope_type: str
    scope_value: str | None
    message: str
    created_at: str


class OkResult(BaseModel):
    ok: bool
    detail: str | None = None


@app.post("/api/feedback", response_model=OkResult)
async def submit_feedback(payload: FeedbackIn, user: CurrentUser = Depends(get_current_user)):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Feedback message can't be empty")
    if len(message) > 4000:
        raise HTTPException(status_code=422, detail="Feedback message is too long (max 4000 characters)")
    await db.execute(
        """INSERT INTO app_feedback (email, role, scope_type, scope_value, message, created_at)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (user.email, user.role, user.scope_type, ", ".join(user.scope_values) or None, message, datetime.now(timezone.utc)),
    )
    return {"ok": True}


@app.get("/api/feedback", response_model=list[FeedbackRow])
async def list_feedback(user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    rows = await db.fetch_all(
        "SELECT id, email, role, scope_type, scope_value, message, created_at FROM app_feedback ORDER BY created_at DESC"
    )
    return [
        {
            "id": r[0], "email": r[1], "role": r[2], "scope_type": r[3], "scope_value": r[4],
            "message": r[5], "created_at": str(r[6]),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Settings: Documents -- driver/rider list details upload, admin-only. Currently
# the only document type: a CSV with one row per driver/rider, used solely to
# compute Routed View's driver Tenure column (join by exact "Display Name" ==
# driver_name match -- see routed_view() and aggregate.compute_tenure). The
# whole table is replaced on each upload, not merged/diffed.
# ---------------------------------------------------------------------------


class DriverDetailsStatus(BaseModel):
    uploaded_by: str | None
    filename: str | None
    row_count: int | None
    uploaded_at: str | None


def _parse_employment_date(value: str | None) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return datetime.strptime(value, "%B %d, %Y").date()
    except ValueError:
        return None


@app.get("/api/admin/driver-details/status", response_model=DriverDetailsStatus)
async def driver_details_status(user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    row = await db.fetch_one(
        "SELECT uploaded_by, filename, row_count, uploaded_at FROM driver_details_upload_log ORDER BY uploaded_at DESC LIMIT 1"
    )
    if not row:
        return {"uploaded_by": None, "filename": None, "row_count": None, "uploaded_at": None}
    return {"uploaded_by": row[0], "filename": row[1], "row_count": row[2], "uploaded_at": str(row[3])}


@app.post("/api/admin/driver-details/upload", response_model=OkResult)
async def upload_driver_details(file: UploadFile = File(...), user: CurrentUser = Depends(get_current_user)):
    _require_admin(user)
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only .csv files are supported")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="Could not read the file as UTF-8 CSV")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or "Display Name" not in reader.fieldnames:
        raise HTTPException(status_code=422, detail="CSV must include a 'Display Name' column")

    rows = []
    for r in reader:
        display_name = (r.get("Display Name") or "").strip()
        if not display_name:
            continue
        rows.append((
            (r.get("ID") or "").strip() or None,
            display_name,
            (r.get("Hub Name") or "").strip() or None,
            (r.get("Hub Region") or "").strip() or None,
            (r.get("Zone") or "").strip() or None,
            (r.get("Driver Type") or "").strip() or None,
            _parse_employment_date(r.get("Employment Start Date")),
            _parse_employment_date(r.get("Employment End Date")),
        ))
    if not rows:
        raise HTTPException(status_code=422, detail="No usable rows found (need at least a 'Display Name' per row)")

    await db.execute("DELETE FROM driver_details")
    await db.execute_many(
        """INSERT INTO driver_details
           (driver_id, display_name, hub_name, hub_region, zone, driver_type, employment_start_date, employment_end_date)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        rows,
    )
    await db.execute(
        "INSERT INTO driver_details_upload_log (uploaded_by, filename, row_count, uploaded_at) VALUES (%s, %s, %s, %s)",
        (user.email, file.filename, len(rows), datetime.now(timezone.utc)),
    )
    return {"ok": True, "detail": f"Uploaded {len(rows)} driver records"}


# ---------------------------------------------------------------------------
# Admin: users
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    email: str
    role: str
    scope_type: str
    scope_values: list[str]
    display_name: str | None
    created_at: str
    last_seen_at: str | None


class UserIn(BaseModel):
    email: str
    role: str  # 'admin' | 'manager' | 'region' | 'station'
    scope_type: str  # 'all' | 'region' | 'zone' | 'station'
    scope_values: list[str] = []
    display_name: str | None = None


# Only the app owner can grant the Admin role -- not just any existing admin.
# 2026-09-21 feedback: an admin promoted by the owner still can't create more
# admins themselves, which this single check (keyed off the ACTING user's own
# email, not their role) gives for free.
_OWNER_EMAIL = "fuad.mawardi@ninjavan.co"


def _require_admin(user: CurrentUser) -> None:
    """Full admin page access (trigger refresh, etc) -- admin-only. Manager/
    Region staff get scoped add/edit/remove, see _require_can_add_users and
    _require_can_manage_target."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def _require_can_add_users(user: CurrentUser) -> None:
    if user.role not in ("admin", "manager", "region"):
        raise HTTPException(status_code=403, detail="Admin, Manager, or Region staff access required")


def _require_can_manage_target(acting: CurrentUser, target_role: str) -> None:
    """Edit/delete permission on an existing user -- keyed off the TARGET's
    current role, mirroring _validate_grant_limits' ceiling: a Manager can
    manage Station/Region-role users, Region staff can manage Station-role
    users only, Admin can manage anyone."""
    if acting.role == "admin":
        return
    if acting.role == "manager":
        if target_role not in ("station", "region"):
            raise HTTPException(status_code=403, detail="Managers can only edit or remove Station staff or Region staff")
        return
    if acting.role == "region":
        if target_role != "station":
            raise HTTPException(status_code=403, detail="Region staff can only edit or remove Station staff")
        return
    raise HTTPException(status_code=403, detail="You can't edit or remove other users")


def _require_can_grant_role(acting: CurrentUser, role: str) -> None:
    if role == "admin" and acting.email != _OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="Only the app owner can grant the Admin role")


def _row_to_user_out(r) -> dict:
    return {
        "email": r[0], "role": r[1], "scope_type": r[2], "scope_values": parse_scope_values(r[3]),
        "display_name": r[4], "created_at": str(r[5]), "last_seen_at": str(r[6]) if r[6] else None,
    }


@app.get("/api/admin/users", response_model=list[UserOut])
async def list_users(user: CurrentUser = Depends(get_current_user)):
    _require_can_add_users(user)
    rows = await db.fetch_all(
        "SELECT email, role, scope_type, scope_values, display_name, created_at, last_seen_at FROM users ORDER BY created_at"
    )
    out = [_row_to_user_out(r) for r in rows]
    # Same view mirrors what each role can manage (see _require_can_manage_target) --
    # a Manager/Region user only ever sees the subset they're allowed to act on.
    if user.role == "admin":
        return out
    if user.role == "manager":
        return [u for u in out if u["role"] in ("station", "region")]
    if user.role == "region":
        return [u for u in out if u["role"] == "station"]
    return []


_VALID_ROLES = {"admin", "manager", "region", "station"}
_VALID_SCOPE_TYPES = {"all", "region", "zone", "station"}


def _validate_user_in(payload: UserIn) -> None:
    if payload.role not in _VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of {sorted(_VALID_ROLES)}")
    if payload.scope_type not in _VALID_SCOPE_TYPES:
        raise HTTPException(status_code=422, detail=f"scope_type must be one of {sorted(_VALID_SCOPE_TYPES)}")
    if payload.scope_type == "all":
        return
    if not payload.scope_values:
        raise HTTPException(status_code=422, detail="scope_values can't be empty unless scope_type is 'all'")
    if payload.scope_type == "region":
        bad = [v for v in payload.scope_values if v not in REGIONS]
        if bad:
            raise HTTPException(status_code=422, detail=f"scope_values must each be one of {REGIONS} (got {bad})")
    if payload.scope_type == "zone":
        bad = [v for v in payload.scope_values if v not in ZONES]
        if bad:
            raise HTTPException(status_code=422, detail=f"scope_values must each be one of {ZONES} (got {bad})")
    if payload.scope_type == "station":
        valid_names = {name for name, _full, _zone, _region in HUBS.values()}
        bad = [v for v in payload.scope_values if v not in valid_names]
        if bad:
            raise HTTPException(status_code=422, detail=f"scope_values must each be a valid station name (got {bad})")


def _validate_grant_limits(acting: CurrentUser, payload: UserIn) -> None:
    """Caps what a non-admin can hand out when adding/editing someone -- admins
    have no limit here (besides _require_can_grant_role's Admin-role carve-out).
    A Manager or Region staff member could otherwise create an Admin (or a peer
    with their own level of access) through the add-user form, which would be
    a privilege-escalation hole."""
    if acting.role == "admin":
        return
    if acting.role == "manager":
        if payload.role not in ("station", "region"):
            raise HTTPException(status_code=403, detail="Managers can only grant the Station staff or Region staff role")
        if payload.scope_type == "all":
            raise HTTPException(status_code=403, detail="Managers can't grant 'sees everything' access")
    elif acting.role == "region":
        if payload.role != "station":
            raise HTTPException(status_code=403, detail="Region staff can only grant the Station staff role")
        if payload.scope_type != "station":
            raise HTTPException(status_code=403, detail="Region staff can only grant station-level access")


def _scope_values_json(values: list[str]) -> str | None:
    return json.dumps(values) if values else None


@app.post("/api/admin/users", response_model=OkResult)
async def add_user(payload: UserIn, user: CurrentUser = Depends(get_current_user)):
    _require_can_add_users(user)
    _validate_user_in(payload)
    _validate_grant_limits(user, payload)
    _require_can_grant_role(user, payload.role)
    existing = await db.fetch_one("SELECT id FROM users WHERE email=%s", (payload.email,))
    if existing:
        raise HTTPException(status_code=409, detail="That email is already set up")
    await db.execute(
        """INSERT INTO users (email, role, scope_type, scope_values, display_name, invited_by)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (payload.email, payload.role, payload.scope_type, _scope_values_json(payload.scope_values),
         payload.display_name, user.email),
    )
    return {"ok": True}


class BulkUserIn(BaseModel):
    users: list[UserIn]


class BulkUserResult(BaseModel):
    added: list[str]
    skipped: list[str]  # already set up
    errors: list[str]  # "<email>: <reason>" -- bad role/scope for that row


@app.post("/api/admin/users/bulk", response_model=BulkUserResult)
async def bulk_add_users(payload: BulkUserIn, user: CurrentUser = Depends(get_current_user)):
    _require_can_add_users(user)
    if not payload.users:
        raise HTTPException(status_code=422, detail="No rows given")

    added, skipped, errors = [], [], []
    for row in payload.users:
        email = row.email.strip()
        if not email:
            continue
        try:
            _validate_user_in(row)
            _validate_grant_limits(user, row)
            _require_can_grant_role(user, row.role)
        except HTTPException as exc:
            errors.append(f"{email}: {exc.detail}")
            continue
        existing = await db.fetch_one("SELECT id FROM users WHERE email=%s", (email,))
        if existing:
            skipped.append(email)
            continue
        await db.execute(
            """INSERT INTO users (email, role, scope_type, scope_values, display_name, invited_by)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (email, row.role, row.scope_type, _scope_values_json(row.scope_values), row.display_name, user.email),
        )
        added.append(email)
    return {"added": added, "skipped": skipped, "errors": errors}


@app.patch("/api/admin/users/{email}", response_model=OkResult)
async def update_user(email: str, payload: UserIn, user: CurrentUser = Depends(get_current_user)):
    target = await db.fetch_one("SELECT role FROM users WHERE email=%s", (email,))
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    _require_can_manage_target(user, target[0])
    _validate_user_in(payload)
    _validate_grant_limits(user, payload)
    _require_can_grant_role(user, payload.role)
    await db.execute(
        """UPDATE users SET role=%s, scope_type=%s, scope_values=%s, display_name=%s
           WHERE email=%s""",
        (payload.role, payload.scope_type, _scope_values_json(payload.scope_values), payload.display_name, email),
    )
    return {"ok": True}


@app.delete("/api/admin/users/{email}", response_model=OkResult)
async def delete_user(email: str, user: CurrentUser = Depends(get_current_user)):
    if email == user.email:
        raise HTTPException(status_code=400, detail="You can't remove your own access")
    target = await db.fetch_one("SELECT role FROM users WHERE email=%s", (email,))
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    _require_can_manage_target(user, target[0])
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


# ---------------------------------------------------------------------------
# Admin: SLA thresholds (Station Health severity, editable in-app instead of
# hardcoded rank-based coloring -- see backend/resources/db/migration/V13)
# ---------------------------------------------------------------------------

# Mirrors frontend/src/thresholds.js's METRICS keys exactly -- these are the
# only metric_key values a threshold row may target. Deliberately a subset of
# aggregate.METRIC_KEYS: that tuple also carries a couple of internal-only
# fields (missing_open, cod_pct_routed) that never became a Station Health
# column, so they have nothing to score.
_SLA_METRIC_KEYS = (
    "total_fresh", "total_routed", "routed_pct", "attendance", "total_in_hub", "still_ovfd", "cod_pct_hub",
    "zero_attempt_total", "zero_attempt", "zero_attempt_gt_d0", "age_gt3", "on_hold", "reschedule", "prior_d0", "prior_gt_d0",
    "unsweep_document", "unsweep_parcel", "missing_hub", "missing_ship_in",
    "pending_ats_zero_attempt", "pending_ats_attempted",
    # Action Board's own metrics (frontend/src/lib/actionMetrics.js's EXTRA_METRICS)
    # plus Routed View's Productivity (Admin -> SLA Targets only, not Action Board).
    "old_route_tn", "zalora_zero_attempt", "zalora_ovfd", "routed_current_ovfd", "productivity_pct",
)
_SLA_DIRECTIONS = {"higher-is-worse", "lower-is-worse"}
# Productivity is scored per driver position instead of per region -- these are
# valid `scope` values alongside "nationwide" and a region name (see AdminPanel.jsx's
# DRIVER_POSITION_SCOPES / RoutedViewTab.jsx's resolveThreshold(..., r.driver_type)).
_SLA_DRIVER_POSITION_SCOPES = {"Hybrid Driver", "Hybrid Rider", "Independent Driver", "Independent Rider"}


class ThresholdRow(BaseModel):
    metric_key: str
    scope: str  # "nationwide", a region name, or a driver position (Productivity only)
    scored: bool
    direction: str  # "higher-is-worse" | "lower-is-worse"
    warning_at: float
    critical_at: float
    percent_of: str | None = None  # score as % of this other metric_key on the same row, if set
    changed_by: str | None = None
    changed_at: str | None = None


class ThresholdsIn(BaseModel):
    rows: list[ThresholdRow]


@app.get("/api/thresholds", response_model=list[ThresholdRow])
async def get_thresholds(user: CurrentUser = Depends(get_current_user)):
    rows = await db.fetch_all(
        "SELECT metric_key, scope, scored, direction, warning_at, critical_at, percent_of, changed_by, changed_at "
        "FROM sla_thresholds"
    )
    return [
        {
            "metric_key": r[0], "scope": r[1], "scored": bool(r[2]), "direction": r[3],
            "warning_at": r[4], "critical_at": r[5], "percent_of": r[6], "changed_by": r[7],
            "changed_at": str(r[8]) if r[8] else None,
        }
        for r in rows
    ]


def _require_can_edit_thresholds(user: CurrentUser) -> None:
    if user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin or Manager access required")


@app.put("/api/thresholds", response_model=OkResult)
async def put_thresholds(payload: ThresholdsIn, user: CurrentUser = Depends(get_current_user)):
    _require_can_edit_thresholds(user)
    if not payload.rows:
        raise HTTPException(status_code=422, detail="No rows given")

    now = datetime.now(timezone.utc)
    params = []
    for row in payload.rows:
        if row.metric_key not in _SLA_METRIC_KEYS:
            raise HTTPException(status_code=422, detail=f"Unknown metric_key: {row.metric_key}")
        if row.scope != "nationwide" and row.scope not in REGIONS and row.scope not in _SLA_DRIVER_POSITION_SCOPES:
            raise HTTPException(
                status_code=422,
                detail=f"scope must be 'nationwide', one of {REGIONS}, or one of {sorted(_SLA_DRIVER_POSITION_SCOPES)}",
            )
        if row.direction not in _SLA_DIRECTIONS:
            raise HTTPException(status_code=422, detail=f"direction must be one of {sorted(_SLA_DIRECTIONS)}")
        if row.percent_of is not None and row.percent_of not in _SLA_METRIC_KEYS:
            raise HTTPException(status_code=422, detail=f"Unknown percent_of metric_key: {row.percent_of}")
        params.append((
            row.metric_key, row.scope, int(row.scored), row.direction, row.warning_at, row.critical_at,
            row.percent_of, user.email, now,
        ))
    # ON DUPLICATE KEY UPDATE references VALUES(col) rather than its own %s
    # placeholders -- asyncmy's executemany bulk-rewrites a batch of INSERTs
    # into one multi-row statement and only fills placeholders in the VALUES
    # (...) tuple it repeats per row; extra %s in the trailing clause raised
    # "not all arguments converted during string formatting".
    await db.execute_many(
        """INSERT INTO sla_thresholds (metric_key, scope, scored, direction, warning_at, critical_at, percent_of, changed_by, changed_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE scored=VALUES(scored), direction=VALUES(direction),
             warning_at=VALUES(warning_at), critical_at=VALUES(critical_at), percent_of=VALUES(percent_of),
             changed_by=VALUES(changed_by), changed_at=VALUES(changed_at)""",
        params,
    )
    return {"ok": True}
