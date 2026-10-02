"""Management View (2026-10-01): a higher-level page for managers and admins -- Overall health, Capacity and
Backlog radar, per the Fleet Manager's framework. Unlike the rest of the app (ground-staff detail), this reuses
numbers the app already captures (Station Health / Route Monitoring / Shipment Details, via /api/dashboard and
/api/shipment-details) rather than a new feed, so the frontend does the rollup -- this module only serves the two
pieces that have no home yet: Capacity's Hub Size / Staff headcount (uploaded from the Fleet Management workbook,
same upload-replaces-previous pattern as everything else in kpi_data.py) and Backlog radar's mitigation plan /
rescue plan / deployment cost / PTWH count, which are typed in by a manager, not pulled from anywhere.
"""
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
import kpi_data as kd
from auth import CurrentUser, get_current_user
from stations import FULL_NAME_TO_HUB, HUBS

log = logging.getLogger("management_view")
router = APIRouter()


def _require_manager(user: CurrentUser) -> None:
    if user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Managers and admins only")


# Workbook station names ("Shah Alam", "Port Klang", ...) matched against the station list's own short
# name (HUBS[code][0]) -- same loose-match spirit as kpi.py's driver-name station matching, but by exact
# (trimmed, case-insensitive) name since the workbook already uses the real station name, not an abbreviation.
def _name_to_hub() -> dict[str, str]:
    return {name.strip().lower(): code for code, (name, _full, _zone, _region) in HUBS.items()}


async def _capacity_rows() -> tuple[dict[str, dict], dict[str, str | None]]:
    """{hub_code: {sqft, staff_count}}, {"hub_size": source label or None, "staff": source label or None}."""
    name_to_hub = _name_to_hub()
    out: dict[str, dict] = {code: {"sqft": None, "staff_count": None, "station_name": name} for code, (name, *_rest) in HUBS.items()}
    sources: dict[str, str | None] = {"hub_size": None, "staff": None}

    hub_size_up = await kd.load_rows("capacity_hub_size")
    if hub_size_up:
        meta, rows = hub_size_up
        sources["hub_size"] = f"{meta['filename']} ({str(meta['uploaded_at'])[:10]})"
        for r in rows:
            idx = {kd.norm(k): v for k, v in r.items()}
            name = str(idx.get("station") or "").strip().lower()
            code = name_to_hub.get(name)
            sqft = idx.get("sqft")
            if code and sqft not in (None, ""):
                try:
                    out[code]["sqft"] = float(str(sqft).replace(",", ""))
                except ValueError:
                    pass

    staff_up = await kd.load_rows("capacity_staff")
    if staff_up:
        meta, rows = staff_up
        sources["staff"] = f"{meta['filename']} ({str(meta['uploaded_at'])[:10]})"
        counts: dict[str, int] = {}
        for r in rows:
            idx = {kd.norm(k): v for k, v in r.items()}
            name = str(idx.get("station") or "").strip().lower()
            code = name_to_hub.get(name)
            if code and str(idx.get("designation") or "").strip():
                counts[code] = counts.get(code, 0) + 1
        for code, n in counts.items():
            out[code]["staff_count"] = n

    return out, sources


class CapacityRow(BaseModel):
    station_code: str
    station_name: str
    zone: str
    region: str
    sqft: float | None
    staff_count: int | None
    ptwh_count: int | None  # manager-keyed (some hubs run a fixed daily PTWH, others only for offdays/backlog)
    parcel_capacity: int | None  # manager-typed override of how many parcels the hub can hold


class CapacityResponse(BaseModel):
    sources: dict[str, str | None]
    parcels_per_sqft: float  # global density (default 1 = capacity follows sqft); capacity = sqft x this unless a hub has its own parcel_capacity
    rows: list[CapacityRow]


_SETTING_PARCELS_PER_SQFT = "parcels_per_sqft"


DEFAULT_PARCELS_PER_SQFT = 1.0  # Fleet Manager 2026-10-02: capacity follows the hub's sqft (1 parcel per sqft) until a manager changes it


async def _parcels_per_sqft() -> float:
    row = await db.fetch_one("SELECT setting_value FROM management_settings WHERE setting_key=%s", (_SETTING_PARCELS_PER_SQFT,))
    try:
        return float(row[0]) if row and row[0] not in (None, "") else DEFAULT_PARCELS_PER_SQFT
    except ValueError:
        return DEFAULT_PARCELS_PER_SQFT


@router.get("/api/management-view/capacity", response_model=CapacityResponse)
async def capacity(user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    by_hub, sources = await _capacity_rows()
    notes = {r[0]: (r[1], r[2]) for r in await db.fetch_all("SELECT station_code, ptwh_count, parcel_capacity FROM station_notes")}
    rows = []
    for code, (name, _full, zone, region) in HUBS.items():
        c = by_hub.get(code, {})
        ptwh, cap = notes.get(code, (None, None))
        rows.append({
            "station_code": code, "station_name": name, "zone": zone, "region": region,
            "sqft": c.get("sqft"), "staff_count": c.get("staff_count"), "ptwh_count": ptwh, "parcel_capacity": cap,
        })
    return {"sources": sources, "parcels_per_sqft": await _parcels_per_sqft(), "rows": rows}


class CapacityEdit(BaseModel):
    station_code: str
    ptwh_count: int | None = None
    parcel_capacity: int | None = None


class CapacityEditIn(BaseModel):
    edits: list[CapacityEdit] = []
    parcels_per_sqft: float | None = None
    set_density: bool = False  # true = write parcels_per_sqft (null clears it)


@router.put("/api/management-view/capacity")
async def put_capacity(payload: CapacityEditIn, user: CurrentUser = Depends(get_current_user)):
    """Bulk save of the manager-keyed Capacity columns (PTWH headcount, parcel capacity) and the global parcels-per-sqft
    density. Only touches those columns -- a station's mitigation / rescue plan is left as it is."""
    _require_manager(user)
    now = datetime.now(timezone.utc)
    for e in payload.edits:
        if e.station_code not in HUBS:
            raise HTTPException(status_code=404, detail=f"Unknown station {e.station_code}")
        if (e.ptwh_count is not None and e.ptwh_count < 0) or (e.parcel_capacity is not None and e.parcel_capacity < 0):
            raise HTTPException(status_code=422, detail="Counts can't be negative")
        if await db.fetch_one("SELECT station_code FROM station_notes WHERE station_code=%s", (e.station_code,)):
            await db.execute(
                "UPDATE station_notes SET ptwh_count=%s, parcel_capacity=%s, updated_by=%s, updated_at=%s WHERE station_code=%s",
                (e.ptwh_count, e.parcel_capacity, user.email, now, e.station_code),
            )
        else:
            await db.execute(
                "INSERT INTO station_notes (station_code, ptwh_count, parcel_capacity, updated_by, updated_at) VALUES (%s, %s, %s, %s, %s)",
                (e.station_code, e.ptwh_count, e.parcel_capacity, user.email, now),
            )
    if payload.set_density:
        if payload.parcels_per_sqft is not None and payload.parcels_per_sqft <= 0:
            raise HTTPException(status_code=422, detail="Parcels per sqft must be above 0")
        value = None if payload.parcels_per_sqft is None else str(payload.parcels_per_sqft)
        if await db.fetch_one("SELECT setting_key FROM management_settings WHERE setting_key=%s", (_SETTING_PARCELS_PER_SQFT,)):
            await db.execute(
                "UPDATE management_settings SET setting_value=%s, updated_by=%s, updated_at=%s WHERE setting_key=%s",
                (value, user.email, now, _SETTING_PARCELS_PER_SQFT),
            )
        else:
            await db.execute(
                "INSERT INTO management_settings (setting_key, setting_value, updated_by, updated_at) VALUES (%s, %s, %s, %s)",
                (_SETTING_PARCELS_PER_SQFT, value, user.email, now),
            )
    return {"saved": len(payload.edits)}


PLAN_STATUSES = ("planned", "in_progress", "done")


class StationNote(BaseModel):
    station_code: str
    mitigation_plan: str | None
    rescue_plan: str | None
    rescue_deployment_cost: str | None
    plan_status: str | None
    plan_owner: str | None
    plan_target_date: str | None
    updated_by: str | None
    updated_at: str | None


_NOTE_COLS = "station_code, mitigation_plan, rescue_plan, rescue_deployment_cost, plan_status, plan_owner, plan_target_date, updated_by, updated_at"


def _note_row(r) -> dict:
    return {
        "station_code": r[0], "mitigation_plan": r[1], "rescue_plan": r[2], "rescue_deployment_cost": r[3],
        "plan_status": r[4], "plan_owner": r[5], "plan_target_date": str(r[6])[:10] if r[6] else None,
        "updated_by": r[7], "updated_at": str(r[8]) if r[8] else None,
    }


@router.get("/api/management-view/notes", response_model=list[StationNote])
async def list_notes(user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    return [_note_row(r) for r in await db.fetch_all(f"SELECT {_NOTE_COLS} FROM station_notes")]


class NoteIn(BaseModel):
    mitigation_plan: str | None = None
    rescue_plan: str | None = None
    rescue_deployment_cost: str | None = None
    plan_status: str | None = None
    plan_owner: str | None = None
    plan_target_date: str | None = None  # YYYY-MM-DD


@router.put("/api/management-view/notes/{station_code}", response_model=StationNote)
async def put_note(station_code: str, payload: NoteIn, user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    if station_code not in HUBS:
        raise HTTPException(status_code=404, detail="Unknown station")
    if payload.plan_status and payload.plan_status not in PLAN_STATUSES:
        raise HTTPException(status_code=422, detail=f"plan_status must be one of {list(PLAN_STATUSES)}")
    target = None
    if payload.plan_target_date:
        try:
            target = datetime.strptime(payload.plan_target_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail="plan_target_date must be YYYY-MM-DD")
    now = datetime.now(timezone.utc)
    values = (
        payload.mitigation_plan, payload.rescue_plan, payload.rescue_deployment_cost,
        payload.plan_status or None, payload.plan_owner or None, target, user.email, now,
    )
    if await db.fetch_one("SELECT station_code FROM station_notes WHERE station_code=%s", (station_code,)):
        await db.execute(
            """UPDATE station_notes SET mitigation_plan=%s, rescue_plan=%s, rescue_deployment_cost=%s,
               plan_status=%s, plan_owner=%s, plan_target_date=%s, updated_by=%s, updated_at=%s WHERE station_code=%s""",
            (*values, station_code),
        )
    else:
        await db.execute(
            """INSERT INTO station_notes (mitigation_plan, rescue_plan, rescue_deployment_cost, plan_status, plan_owner,
               plan_target_date, updated_by, updated_at, station_code) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (*values, station_code),
        )
    return _note_row((station_code, *values))


# ---- LH trips (2026-10-02): the line-haul trips that arrived at each station, with the driver, from Metabase question 127512
# (movement_trips_enriched, completed LAND_HAUL). The deployed app can't read Metabase, so an admin uploads that question's CSV
# (last 14 days) like every other Metabase feeder; Redash's station-level LH Timing stays the fallback when nothing is uploaded.
class LhTrip(BaseModel):
    day: str
    station_code: str
    driver: str
    time: str  # HH:MM, Malaysia time
    parcels: int


class LhTripsResponse(BaseModel):
    source: str | None
    trips: list[LhTrip]


def _arrival_time(value) -> str:
    """HH:MM (24h) from an ISO timestamp or Metabase's formatted "September 18, 2026, 12:14 AM"; '' when there is none."""
    s = str(value or "").strip()
    m = re.search(r"[T\s](\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?", s)
    if not m:
        return ""
    h, mi, ap = int(m.group(1)), m.group(2), (m.group(3) or "").lower()
    if ap == "pm" and h < 12:
        h += 12
    elif ap == "am" and h == 12:
        h = 0
    return f"{h:02d}:{mi}"


@router.get("/api/management-view/lh-trips", response_model=LhTripsResponse)
async def lh_trips(user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    up = await kd.load_rows("lh_trips")
    if not up:
        return {"source": None, "trips": []}
    meta, rows = up
    trips = []
    for r in rows:
        idx = {kd.norm(k): v for k, v in r.items()}
        dest = str(idx.get("desthubname") or "").strip()
        code = dest if dest in HUBS else FULL_NAME_TO_HUB.get(dest)
        day, time = kd.to_iso_day(idx.get("actualarrivaldatetime")), _arrival_time(idx.get("actualarrivaldatetime"))
        if not code or not day or not time:
            continue  # sorting hubs / middle-mile nodes, or a trip with no arrival
        try:
            parcels = int(float(str(idx.get("totalorders") or 0).replace(",", "")))
        except ValueError:
            parcels = 0
        trips.append({"day": day, "station_code": code, "driver": str(idx.get("primarydrivername") or "").strip() or "(no driver)", "time": time, "parcels": parcels})
    return {"source": f"{meta['filename']} ({str(meta['uploaded_at'])[:10]})", "trips": trips}
