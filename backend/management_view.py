"""Management View (2026-10-01): a higher-level page for managers and admins -- Overall health, Capacity and
Backlog radar, per the Fleet Manager's framework. Unlike the rest of the app (ground-staff detail), this reuses
numbers the app already captures (Station Health / Route Monitoring / Shipment Details, via /api/dashboard and
/api/shipment-details) rather than a new feed, so the frontend does the rollup -- this module only serves the two
pieces that have no home yet: Capacity's Hub Size / Staff headcount (uploaded from the Fleet Management workbook,
same upload-replaces-previous pattern as everything else in kpi_data.py) and Backlog radar's mitigation plan /
rescue plan / deployment cost / PTWH count, which are typed in by a manager, not pulled from anywhere.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
import kpi_data as kd
from auth import CurrentUser, get_current_user
from stations import HUBS

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
    ptwh_count: int | None


class CapacityResponse(BaseModel):
    sources: dict[str, str | None]
    rows: list[CapacityRow]


@router.get("/api/management-view/capacity", response_model=CapacityResponse)
async def capacity(user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    by_hub, sources = await _capacity_rows()
    notes = {r[0]: r[1] for r in await db.fetch_all("SELECT station_code, ptwh_count FROM station_notes")}
    rows = []
    for code, (name, _full, zone, region) in HUBS.items():
        c = by_hub.get(code, {})
        rows.append({
            "station_code": code, "station_name": name, "zone": zone, "region": region,
            "sqft": c.get("sqft"), "staff_count": c.get("staff_count"), "ptwh_count": notes.get(code),
        })
    return {"sources": sources, "rows": rows}


class StationNote(BaseModel):
    station_code: str
    mitigation_plan: str | None
    rescue_plan: str | None
    rescue_deployment_cost: str | None
    ptwh_count: int | None
    updated_by: str | None
    updated_at: str | None


@router.get("/api/management-view/notes", response_model=list[StationNote])
async def list_notes(user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    rows = await db.fetch_all(
        "SELECT station_code, mitigation_plan, rescue_plan, rescue_deployment_cost, ptwh_count, updated_by, updated_at FROM station_notes"
    )
    return [
        {
            "station_code": r[0], "mitigation_plan": r[1], "rescue_plan": r[2], "rescue_deployment_cost": r[3],
            "ptwh_count": r[4], "updated_by": r[5], "updated_at": str(r[6]) if r[6] else None,
        }
        for r in rows
    ]


class NoteIn(BaseModel):
    mitigation_plan: str | None = None
    rescue_plan: str | None = None
    rescue_deployment_cost: str | None = None
    ptwh_count: int | None = None


@router.put("/api/management-view/notes/{station_code}", response_model=StationNote)
async def put_note(station_code: str, payload: NoteIn, user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    if station_code not in HUBS:
        raise HTTPException(status_code=404, detail="Unknown station")
    now = datetime.now(timezone.utc)
    existing = await db.fetch_one("SELECT station_code FROM station_notes WHERE station_code=%s", (station_code,))
    if existing:
        await db.execute(
            """UPDATE station_notes SET mitigation_plan=%s, rescue_plan=%s, rescue_deployment_cost=%s,
               ptwh_count=%s, updated_by=%s, updated_at=%s WHERE station_code=%s""",
            (payload.mitigation_plan, payload.rescue_plan, payload.rescue_deployment_cost, payload.ptwh_count, user.email, now, station_code),
        )
    else:
        await db.execute(
            """INSERT INTO station_notes (station_code, mitigation_plan, rescue_plan, rescue_deployment_cost, ptwh_count, updated_by, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (station_code, payload.mitigation_plan, payload.rescue_plan, payload.rescue_deployment_cost, payload.ptwh_count, user.email, now),
        )
    return {
        "station_code": station_code, "mitigation_plan": payload.mitigation_plan, "rescue_plan": payload.rescue_plan,
        "rescue_deployment_cost": payload.rescue_deployment_cost, "ptwh_count": payload.ptwh_count,
        "updated_by": user.email, "updated_at": now.isoformat(),
    }
