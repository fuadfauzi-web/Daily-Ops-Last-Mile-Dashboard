"""KPI Dashboard (staging, 2026-09-26): the Hybrid Productivity module.

Ported from the Fleet Manager's Google Sheet + Apps Script web app ("Southern Region Hybrid Performance"): driver-level Weekly /
Monthly / Daily rows from Metabase (the All-Regions copies 127194 / 127195 / 127196) plus the hybrid driver list (127193) for tenure,
now for ALL stations, not only Southern. A driver's station comes from the station code in their name ("LKN - HD - FAUZI" -> Larkin, the
same rule Route Monitoring uses), so the sheet's Control tab is not needed.

Data source per dataset: an UPLOADED file (Data upload, kpi_data.py) wins -- an explicit, newer act -- otherwise Metabase. So the page
works today with downloads from Metabase while the app's own Metabase link is being sorted out.
"""
import asyncio
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

import kpi_data as kd
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
    return kd.norm(name)


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
        day = kd.to_iso_day(_get(idx, "routedate"))
        if not name or not day:
            continue
        daily.append([day, driver_idx(name), _num(_get(idx, "deliveredpickup")), _num(_get(idx, "sumofparcelsonroute")), _pct(_get(idx, "successrate"))])

    return {"view": view, "drivers": drivers, "rows": rows, "daily": daily}


# ------------------------------------------------------------------------------------------------ loading

_mb_cache: dict[int, dict] = {}  # Metabase card id -> {"at": datetime, "rows": [...]}


async def _mb_rows(card_id: int, force: bool) -> tuple[datetime, list[dict]]:
    now = datetime.now(timezone.utc)
    async with _lock:
        hit = _mb_cache.get(card_id)
        if hit and not force and (now - hit["at"]).total_seconds() < CACHE_TTL_SECONDS:
            return hit["at"], hit["rows"]
        try:
            rows = await mb.fetch_question(card_id)
        except mb.MetabaseError:
            if hit:  # Metabase hiccup: keep showing what we have rather than an empty dashboard
                log.exception("KPI refresh failed -- serving the cached data")
                return hit["at"], hit["rows"]
            raise
        _mb_cache[card_id] = {"at": now, "rows": rows}
        return now, rows


async def _source(dataset: str, card_id: int, force: bool):
    """(rows, label, when) for one dataset: the uploaded file if there is one, else Metabase. Raises MetabaseError when it is
    Metabase's turn and Metabase fails; returns (None, None, None) when there is no upload and no Metabase key."""
    up = await kd.load_rows(dataset)
    if up:
        meta, rows = up
        return rows, f"uploaded file {meta['filename']} ({str(meta['uploaded_at'])[:10]})", meta["uploaded_at"]
    if mb.configured():
        at, rows = await _mb_rows(card_id, force)
        return rows, "Metabase", at.isoformat()
    return None, None, None


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
    configured: bool          # a Metabase API key is set on the app
    has_data: bool = False    # some source (upload or Metabase) gave the weekly / monthly numbers
    error: str | None = None
    fetched_at: str | None = None
    view: str
    sources: dict[str, str] = {}
    drivers: list[KpiDriver] = []
    rows: list[list] = []   # [period, driver#, delivered+pickup, on route, attendance days, productivity, success %]
    daily: list[list] = []  # [date, driver#, delivered+pickup, on route, success %]


@router.get("/api/kpi/hybrid", response_model=KpiHybridResponse)
async def kpi_hybrid(view: str = "weekly", refresh: bool = False, user: CurrentUser = Depends(get_current_user)):
    """Hybrid Productivity data for the KPI Dashboard, scoped to what the viewer may see. `refresh` (admins / managers) skips the
    Metabase cache. Each of the datasets comes from an uploaded file if there is one, otherwise from Metabase."""
    if view not in _QUESTION_FOR_VIEW:
        raise HTTPException(status_code=422, detail=f"view must be one of {sorted(_QUESTION_FOR_VIEW)}")
    force = refresh and user.role in ("admin", "manager")
    plan = [
        ("performance", f"hybrid_{view}", _QUESTION_FOR_VIEW[view]),
        ("daily", "hybrid_daily", mb.QUESTION_HYBRID_DAILY),
        ("drivers", "hybrid_data", mb.QUESTION_HYBRID_DATA),
    ]
    got: dict[str, list[dict]] = {}
    sources: dict[str, str] = {}
    whens: list[str] = []
    errors: list[str] = []
    for name, dataset, card in plan:
        try:
            rows, label, when = await _source(dataset, card, force)
        except mb.MetabaseError as exc:
            errors.append(str(exc))
            continue
        if rows is not None:
            got[name] = rows
            sources[name] = label
            if when:
                whens.append(str(when))
    base = {"configured": mb.configured(), "view": view, "sources": sources}
    if "performance" not in got:
        return {**base, "has_data": False, "error": errors[0] if errors else None}
    payload = build_payload(view, got["performance"], got.get("daily", []), got.get("drivers", []))
    keep = {i for i, d in enumerate(payload["drivers"]) if _in_scope(d, user)}
    remap = {old: new for new, old in enumerate(sorted(keep))}
    return {
        **base,
        "has_data": True,
        "error": (errors[0] + " -- showing what could be loaded") if errors else None,
        "fetched_at": max(whens) if whens else None,
        "drivers": [d for i, d in enumerate(payload["drivers"]) if i in keep],
        "rows": [[*r[:1], remap[r[1]], *r[2:]] for r in payload["rows"] if r[1] in keep],
        "daily": [[*r[:1], remap[r[1]], *r[2:]] for r in payload["daily"] if r[1] in keep],
    }


# ------------------------------------------------------------------------------------------------ data uploads

def _require_uploader(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can upload KPI data")


class UploadInfo(BaseModel):
    dataset: str
    kpi: str
    label: str
    hint: str
    filename: str | None = None
    row_count: int | None = None
    uploaded_by: str | None = None
    uploaded_at: str | None = None


@router.get("/api/kpi/uploads", response_model=list[UploadInfo])
async def kpi_uploads(user: CurrentUser = Depends(get_current_user)):
    """Which datasets have an uploaded file (for the KPI page's Data upload panel)."""
    current = await kd.list_uploads()
    return [{"dataset": name, "kpi": spec["kpi"], "label": spec["label"], "hint": spec["hint"], **current.get(name, {})} for name, spec in kd.DATASETS.items()]


class UploadResult(BaseModel):
    ok: bool
    detail: str


@router.post("/api/kpi/uploads/{dataset}", response_model=UploadResult)
async def kpi_upload(dataset: str, file: UploadFile = File(...), user: CurrentUser = Depends(get_current_user)):
    _require_uploader(user)
    if dataset not in kd.DATASETS:
        raise HTTPException(status_code=404, detail="Unknown dataset")
    data = await file.read()
    try:
        info = await kd.save_upload(dataset, file.filename or "upload", data, user.email)
    except kd.UploadError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:  # noqa: BLE001
        log.exception("KPI upload failed")
        raise HTTPException(status_code=503, detail="Couldn't store the file right now -- try again")
    return {"ok": True, "detail": f"{kd.DATASETS[dataset]['label']}: {info['row_count']:,} rows loaded"}


@router.delete("/api/kpi/uploads/{dataset}", response_model=UploadResult)
async def kpi_upload_delete(dataset: str, user: CurrentUser = Depends(get_current_user)):
    _require_uploader(user)
    if dataset not in kd.DATASETS:
        raise HTTPException(status_code=404, detail="Unknown dataset")
    await kd.delete_upload(dataset)
    return {"ok": True, "detail": "Upload removed"}


# ------------------------------------------------------------------------------------------------ Metabase diagnostics

@router.get("/api/kpi/metabase-check")
async def kpi_metabase_check(user: CurrentUser = Depends(get_current_user)):
    """Admins: what does Metabase say to this app's API key? (never returns the key itself)"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return await mb.diagnose()
