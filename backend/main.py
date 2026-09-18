"""Southern Region Ops Dashboard — backend.

Pulls parcel-in-hub / zero-attempt / on-hold / missing-ticket counts straight from
Redash (queries 78 and 1297), aggregates them per station/sub-region/region, and
serves them scoped to whoever is asking (role-based access, see auth.py).

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
from aggregate import build_station_metrics, rollup
from auth import CurrentUser, get_current_user
from redash_client import QUERY_ACTIVE_MISSING, QUERY_HEALTH_V3, RedashError, fetch_query_results
from stations import REGION_NAME, SOUTH_HUBS, SUB_REGIONS

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("dashboard")

REFRESH_INTERVAL_SECONDS = 60 * 60  # hourly, per the project brief
_refresh_task: asyncio.Task | None = None


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
        by_station = build_station_metrics(health_rows, missing_rows)

        captured_at = datetime.now(timezone.utc)
        params = [
            (
                captured_at, row["station_code"], row["station_name"], row["sub_region"],
                row["region"], row["total_in_hub"], row["zero_attempt"], row["on_hold"],
                row["missing_open"],
            )
            for row in by_station.values()
        ]
        await db.execute_many(
            """INSERT INTO station_metrics
               (captured_at, station_code, station_name, sub_region, region,
                total_in_hub, zero_attempt, on_hold, missing_open)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            params,
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


app = FastAPI(title="Southern Region Ops Dashboard", lifespan=lifespan)
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

class StationRow(BaseModel):
    station_code: str
    station_name: str
    sub_region: str
    region: str
    total_in_hub: int
    zero_attempt: int
    on_hold: int
    missing_open: int


class GroupRow(BaseModel):
    key: str
    total_in_hub: int
    zero_attempt: int
    on_hold: int
    missing_open: int
    station_count: int


class DashboardResponse(BaseModel):
    captured_at: str | None
    stations: list[StationRow]
    sub_regions: list[GroupRow]
    region: list[GroupRow]


def _scope_filter_stations(rows: list[dict], user: CurrentUser) -> list[dict]:
    if user.scope_type == "all":
        return rows
    if user.scope_type == "sub_region":
        return [r for r in rows if r["sub_region"] == user.scope_value]
    if user.scope_type == "station":
        return [r for r in rows if r["station_name"] == user.scope_value]
    return []


@app.get("/api/dashboard", response_model=DashboardResponse)
async def dashboard(user: CurrentUser = Depends(get_current_user)):
    latest = await db.fetch_one("SELECT MAX(captured_at) FROM station_metrics")
    captured_at = latest[0] if latest else None
    if captured_at is None:
        return {"captured_at": None, "stations": [], "sub_regions": [], "region": []}

    db_rows = await db.fetch_all(
        """SELECT station_code, station_name, sub_region, region,
                  total_in_hub, zero_attempt, on_hold, missing_open
           FROM station_metrics WHERE captured_at = %s""",
        (captured_at,),
    )
    all_rows = [
        {
            "station_code": r[0], "station_name": r[1], "sub_region": r[2], "region": r[3],
            "total_in_hub": r[4], "zero_attempt": r[5], "on_hold": r[6], "missing_open": r[7],
        }
        for r in db_rows
    ]
    scoped = _scope_filter_stations(all_rows, user)

    sub_region_groups = rollup(scoped, "sub_region")
    region_groups = rollup(scoped, "region")

    def to_group(rows, key):
        return [
            {
                "key": g[key], "total_in_hub": g["total_in_hub"], "zero_attempt": g["zero_attempt"],
                "on_hold": g["on_hold"], "missing_open": g["missing_open"],
                "station_count": g["station_count"],
            }
            for g in rows if g["station_count"] > 0
        ]

    return {
        "captured_at": captured_at.isoformat() if hasattr(captured_at, "isoformat") else str(captured_at),
        "stations": scoped,
        "sub_regions": to_group(sub_region_groups, "sub_region"),
        "region": to_group(region_groups, "region"),
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
    scope_type: str  # 'all' | 'sub_region' | 'station'
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
_VALID_SCOPE_TYPES = {"all", "sub_region", "station"}


def _validate_user_in(payload: UserIn) -> None:
    if payload.role not in _VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of {sorted(_VALID_ROLES)}")
    if payload.scope_type not in _VALID_SCOPE_TYPES:
        raise HTTPException(status_code=422, detail=f"scope_type must be one of {sorted(_VALID_SCOPE_TYPES)}")
    if payload.scope_type == "sub_region" and payload.scope_value not in SUB_REGIONS:
        raise HTTPException(status_code=422, detail=f"scope_value must be one of {SUB_REGIONS}")
    if payload.scope_type == "station":
        valid_names = {name for name, _ in SOUTH_HUBS.values()}
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
    sub_region: str


@app.get("/api/stations", response_model=list[StationMeta])
async def list_stations(user: CurrentUser = Depends(get_current_user)):
    return [
        {"station_code": code, "station_name": name, "sub_region": sub}
        for code, (name, sub) in sorted(SOUTH_HUBS.items(), key=lambda kv: kv[1][0])
    ]


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
