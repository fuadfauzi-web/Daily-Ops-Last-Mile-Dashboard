"""KPI Dashboard (staging, 2026-09-26): the Hybrid Productivity module.

Ported from the Fleet Manager's Google Sheet + Apps Script web app ("Southern Region Hybrid Performance"): driver-level Weekly /
Monthly / Daily rows from Metabase (questions 126389 / 126392 / 126393) plus the hybrid driver list (126216) for tenure, now for
ALL stations, not only Southern. A driver's station comes from the station code in their name ("LKN - HD - FAUZI" -> Larkin, the
same rule Route Monitoring uses), so the sheet's Control tab is not needed.

Only this module has live data; the other KPI modules in the UI are placeholders until their Metabase questions / logic are given.
"""
import asyncio
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import metabase_client as mb
from auth import CurrentUser, get_current_user
from stations import ABBR_TO_HUB, HUBS

log = logging.getLogger("kpi")
router = APIRouter()

CACHE_TTL_SECONDS = 30 * 60  # the source is refreshed daily; half an hour is plenty and keeps Metabase load low
_QUESTION_FOR_VIEW = {"weekly": mb.QUESTION_HYBRID_WEEKLY, "monthly": mb.QUESTION_HYBRID_MONTHLY}

# view -> {"at": datetime, "perf": rows, "daily": rows, "hybrid": rows}; one lock so concurrent page loads share one fetch.
_cache: dict[str, dict] = {}
_lock = asyncio.Lock()


# ------------------------------------------------------------------------------------------------ parsing

def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


def _index(row: dict) -> dict:
    """Row keyed by normalised column name, so "Drivers Enriched -> Hub ID" and small header edits still match."""
    return {_norm(k): v for k, v in row.items()}


def _get(idx: dict, *names: str):
    for n in names:
        if n in idx and idx[n] not in (None, ""):
            return idx[n]
    return None


def _num(value) -> float:
    try:
        return float(str(value).replace(",", "")) if value not in (None, "") else 0.0
    except ValueError:
        return 0.0


def _pct(value) -> float:
    """Success Rate arrives as a fraction (0.91) or a "91%" string; the app shows percent."""
    if isinstance(value, str) and "%" in value:
        return _num(value.replace("%", ""))
    v = _num(value)
    return v * 100 if 0 < v <= 1 else v


def _position(name: str) -> str:
    upper = name.upper()
    return "HD" if "- HD -" in upper else "HR" if "- HR -" in upper else ""


def _station_for(name: str, hub_name: str | None) -> tuple[str | None, str, str, str]:
    """(station_code, station name, zone, region). The name's first segment is the station abbreviation ("LKN - HD - FAUZI");
    the hybrid list's hub code is the fallback."""
    code = ABBR_TO_HUB.get(name.split("-")[0].strip().upper())
    if code is None and hub_name in HUBS:
        code = hub_name
    if code and code in HUBS:
        station, _full, zone, region = HUBS[code]
        return code, station, zone, region
    return None, "Unknown", "Unknown", "Unknown"


def build_payload(view: str, perf_rows: list[dict], daily_rows: list[dict], hybrid_rows: list[dict]) -> dict:
    """Compact columnar payload: a driver list once, then rows that point into it."""
    starts: dict[str, str] = {}
    hub_of: dict[str, str] = {}
    for r in hybrid_rows:
        idx = _index(r)
        name = str(_get(idx, "displayname") or "").strip()
        if not name:
            continue
        starts[name] = str(_get(idx, "employmentstartdate") or "")[:10]
        hub = _get(idx, "hubname")
        if hub:
            hub_of[name] = str(hub)

    drivers: list[dict] = []
    driver_at: dict[str, int] = {}

    def driver_idx(name: str) -> int:
        if name not in driver_at:
            code, station, zone, region = _station_for(name, hub_of.get(name))
            driver_at[name] = len(drivers)
            drivers.append({
                "name": name, "station_code": code, "station": station, "zone": zone, "region": region,
                "position": _position(name), "start": starts.get(name) or None,
            })
        return driver_at[name]

    rows = []
    for r in perf_rows:
        idx = _index(r)
        name = str(_get(idx, "courierdisplayname") or "").strip()
        period = _get(idx, "routeweek", "routemonth", "routeperiod")
        if not name or period is None:
            continue
        rows.append([
            _num(period), driver_idx(name), _num(_get(idx, "deliveredpickup")), _num(_get(idx, "sumofparcelsonroute")),
            _num(_get(idx, "attendance")), _num(_get(idx, "productivity")), _pct(_get(idx, "successrate")),
        ])

    daily = []
    for r in daily_rows:
        idx = _index(r)
        name = str(_get(idx, "courierdisplayname") or "").strip()
        day = str(_get(idx, "routedate") or "")[:10]
        if not name or not day:
            continue
        daily.append([day, driver_idx(name), _num(_get(idx, "deliveredpickup")), _num(_get(idx, "sumofparcelsonroute")), _pct(_get(idx, "successrate"))])

    return {"view": view, "drivers": drivers, "rows": rows, "daily": daily}


# ------------------------------------------------------------------------------------------------ loading

async def _load(view: str, force: bool) -> tuple[datetime, list[dict], list[dict], list[dict]]:
    now = datetime.now(timezone.utc)
    async with _lock:
        hit = _cache.get(view)
        if hit and not force and (now - hit["at"]).total_seconds() < CACHE_TTL_SECONDS:
            return hit["at"], hit["perf"], hit["daily"], hit["hybrid"]
        try:
            perf = await mb.fetch_question(_QUESTION_FOR_VIEW[view])
            daily = await mb.fetch_question(mb.QUESTION_HYBRID_DAILY)
            hybrid = await mb.fetch_question(mb.QUESTION_HYBRID_DATA)
        except mb.MetabaseError:
            if hit:  # Metabase hiccup: keep showing what we have rather than an empty dashboard
                log.exception("KPI refresh failed -- serving the cached data")
                return hit["at"], hit["perf"], hit["daily"], hit["hybrid"]
            raise
        _cache[view] = {"at": now, "perf": perf, "daily": daily, "hybrid": hybrid}
        return now, perf, daily, hybrid


def _in_scope(driver: dict, user: CurrentUser) -> bool:
    if user.scope_type == "all":
        return True
    if user.scope_type == "region":
        return driver["region"] in user.scope_values
    if user.scope_type == "zone":
        return driver["zone"] in user.scope_values
    if user.scope_type == "station":
        return driver["station"] in user.scope_values
    return False


class KpiDriver(BaseModel):
    name: str
    station_code: str | None
    station: str
    zone: str
    region: str
    position: str
    start: str | None


class KpiHybridResponse(BaseModel):
    configured: bool
    error: str | None = None
    fetched_at: str | None = None
    view: str
    drivers: list[KpiDriver] = []
    rows: list[list] = []   # [period, driver#, delivered+pickup, on route, attendance days, productivity, success %]
    daily: list[list] = []  # [date, driver#, delivered+pickup, on route, success %]


@router.get("/api/kpi/hybrid", response_model=KpiHybridResponse)
async def kpi_hybrid(view: str = "weekly", refresh: bool = False, user: CurrentUser = Depends(get_current_user)):
    """Hybrid Productivity data for the KPI Dashboard, scoped to what the viewer may see. `refresh` (admins / managers) skips the cache."""
    if view not in _QUESTION_FOR_VIEW:
        raise HTTPException(status_code=422, detail=f"view must be one of {sorted(_QUESTION_FOR_VIEW)}")
    if not mb.configured():
        return {"configured": False, "view": view}
    try:
        fetched_at, perf, daily, hybrid = await _load(view, force=refresh and user.role in ("admin", "manager"))
    except mb.MetabaseError as exc:
        return {"configured": True, "view": view, "error": str(exc)}
    payload = build_payload(view, perf, daily, hybrid)
    keep = {i for i, d in enumerate(payload["drivers"]) if _in_scope(d, user)}
    remap = {old: new for new, old in enumerate(sorted(keep))}
    return {
        "configured": True,
        "view": view,
        "fetched_at": fetched_at.isoformat(),
        "drivers": [d for i, d in enumerate(payload["drivers"]) if i in keep],
        "rows": [[*r[:1], remap[r[1]], *r[2:]] for r in payload["rows"] if r[1] in keep],
        "daily": [[*r[:1], remap[r[1]], *r[2:]] for r in payload["daily"] if r[1] in keep],
    }
