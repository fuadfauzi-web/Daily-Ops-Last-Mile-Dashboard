"""Vehicles (2026-10-03, staging): the Master Vehicle Inventory -- one record per plate with its station, type, owner, driver, licence dates and the fuel / toll card
numbers -- kept by the Fleet Admin team in the app (Fleet Admin -> Vehicles) instead of the Google Sheet (V69 loaded it).

HQ staff and above can read it; only the Fleet Admin role edits. The tab hides card numbers until someone asks to see them.
"""
import re
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user
from stations import ABBR_TO_HUB, HUBS

router = APIRouter()

COLUMNS = (
    "vehicle_function", "state", "station_code", "location_ns", "tms_route", "status", "vehicle_type", "ownership", "driver", "hiring_label",
    "returned_van", "license_doc_url", "gdl_expiry", "license_expiry", "old_fuel_card", "old_fuel_status", "new_fuel_card", "new_fuel_status",
    "fuel_limit", "petronas_card", "fuel_type", "fuel_card_id", "tng_card", "tng_serial", "tng_id", "remarks", "admin_note",
)
_DATES = {"gdl_expiry", "license_expiry"}
_TEXT_MAX = {
    "vehicle_function": 10, "state": 30, "station_code": 10, "location_ns": 100, "tms_route": 60, "status": 20, "vehicle_type": 40, "ownership": 100,
    "driver": 120, "hiring_label": 120, "returned_van": 60, "license_doc_url": 600, "old_fuel_card": 40, "old_fuel_status": 30, "new_fuel_card": 40,
    "new_fuel_status": 40, "petronas_card": 40, "fuel_type": 20, "fuel_card_id": 40, "tng_card": 40, "tng_serial": 40, "tng_id": 40,
    "remarks": 500, "admin_note": 500,
}
_UPPER = {"station_code", "vehicle_function"}
_PLATE = re.compile(r"^[A-Z0-9]{2,12}$")
_URL = re.compile(r"^https?://\S+$", re.IGNORECASE)
_BLANKS = {"n/a", "na", "-", "nil", "tba"}


def _can_view(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager", "hq_staff")


def _can_edit(user: CurrentUser) -> bool:
    return user.position == "fleet_admin"  # only the Fleet Admin role edits this module for now (not even the Superadmin; Role Tester -> Fleet Admin to try it)


def _require_editor(user: CurrentUser) -> None:
    if not _can_edit(user):
        raise HTTPException(status_code=403, detail="Only the Fleet Admin team can edit vehicles")


def _plate(raw: str) -> str:
    p = re.sub(r"\s+", "", raw or "").upper()
    if not _PLATE.match(p):
        raise HTTPException(status_code=422, detail=f"Not a plate number: {raw!r}")
    return p


class VehicleIn(BaseModel):
    """Only the fields that are sent are changed; "" clears a field."""
    vehicle_function: str | None = None
    state: str | None = None
    station_code: str | None = None
    location_ns: str | None = None
    tms_route: str | None = None
    status: str | None = None
    vehicle_type: str | None = None
    ownership: str | None = None
    driver: str | None = None
    hiring_label: str | None = None
    returned_van: str | None = None
    license_doc_url: str | None = None
    gdl_expiry: str | None = None
    license_expiry: str | None = None
    old_fuel_card: str | None = None
    old_fuel_status: str | None = None
    new_fuel_card: str | None = None
    new_fuel_status: str | None = None
    fuel_limit: float | str | None = None
    petronas_card: str | None = None
    fuel_type: str | None = None
    fuel_card_id: str | None = None
    tng_card: str | None = None
    tng_serial: str | None = None
    tng_id: str | None = None
    remarks: str | None = None
    admin_note: str | None = None


def _clean(field: str, value):
    """-> the value to store (None clears). Raises 422 on something that can't be stored."""
    if value is None:
        return None
    if field in _DATES:
        s = re.sub(r"\s+", "", str(value))
        if not s:
            return None
        try:
            return date.fromisoformat(s)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"{field}: use a date like 2027-01-31 (got {value!r})")
    if field == "fuel_limit":
        s = str(value).strip().replace(",", "")
        if not s:
            return None
        try:
            n = float(s)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"fuel_limit: not a number ({s!r})")
        if not 0 <= n <= 99999:
            raise HTTPException(status_code=422, detail="fuel_limit: out of range")
        return n
    s = " ".join(str(value).split())
    if s.lower() in _BLANKS:
        return None
    if not s:
        return None
    if field in _UPPER:
        s = s.upper()
    if len(s) > _TEXT_MAX[field]:
        raise HTTPException(status_code=422, detail=f"{field}: too long ({_TEXT_MAX[field]} characters at most)")
    if field == "license_doc_url" and not _URL.match(s):
        raise HTTPException(status_code=422, detail="license_doc_url: must be a link starting with http:// or https://")
    return s


def _iso(d) -> str | None:
    return d.isoformat() if isinstance(d, date) else (str(d)[:10] if d else None)


def _days(d, today: date) -> int | None:
    if not d:
        return None
    day = d if isinstance(d, date) and not isinstance(d, datetime) else date.fromisoformat(str(d)[:10])
    return (day - today).days


_SELECT = "SELECT plate, " + ", ".join(COLUMNS) + ", updated_by, updated_at FROM vehicles"


def _row_out(r, today: date) -> dict:
    rec = dict(zip(("plate", *COLUMNS), r[: 1 + len(COLUMNS)]))
    hub = HUBS.get(ABBR_TO_HUB.get((rec["station_code"] or "").upper(), ""))
    out = {k: ("" if v is None else v) for k, v in rec.items()}
    out.update({
        "station": hub[0] if hub else "", "zone": hub[2] if hub else "", "region": hub[3] if hub else "",
        "gdl_expiry": _iso(rec["gdl_expiry"]), "gdl_days": _days(rec["gdl_expiry"], today),
        "license_expiry": _iso(rec["license_expiry"]), "license_days": _days(rec["license_expiry"], today),
        "fuel_limit": float(rec["fuel_limit"]) if rec["fuel_limit"] is not None else None,
        "updated_by": r[1 + len(COLUMNS)], "updated_at": str(r[2 + len(COLUMNS)])[:16] if r[2 + len(COLUMNS)] else None,
    })
    return out


@router.get("/api/vehicles")
async def list_vehicles(user: CurrentUser = Depends(get_current_user)):
    if not _can_view(user):
        raise HTTPException(status_code=403, detail="HQ staff access required")
    today = datetime.now(timezone.utc).date()
    rows = await db.fetch_all(_SELECT + " ORDER BY plate")
    return {"vehicles": [_row_out(r, today) for r in rows], "can_edit": _can_edit(user), "today": today.isoformat()}


async def _save(plate: str, fields: dict, by: str) -> bool:
    """Insert or update one vehicle with just the fields given. Returns True when it was new."""
    clean = {k: _clean(k, v) for k, v in fields.items() if k in COLUMNS}
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    exists = await db.fetch_one("SELECT plate FROM vehicles WHERE plate = %s", (plate,))
    if exists:
        sets = [f"{k}=%s" for k in clean] + ["updated_by=%s", "updated_at=%s"]
        await db.execute(f"UPDATE vehicles SET {', '.join(sets)} WHERE plate = %s", (*clean.values(), by, now, plate))
        return False
    cols = ["plate", *clean, "updated_by", "updated_at"]
    await db.execute(f"INSERT INTO vehicles ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})", (plate, *clean.values(), by, now))
    return True


@router.put("/api/vehicles/{plate}")
async def save_vehicle(plate: str, payload: VehicleIn, user: CurrentUser = Depends(get_current_user)):
    """Change one vehicle, or add it when the plate is new."""
    _require_editor(user)
    new = await _save(_plate(plate), payload.model_dump(exclude_unset=True), user.email)
    return {"ok": True, "added": new}


@router.delete("/api/vehicles/{plate}")
async def delete_vehicle(plate: str, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    p = _plate(plate)
    if not await db.fetch_one("SELECT plate FROM vehicles WHERE plate = %s", (p,)):
        raise HTTPException(status_code=404, detail="Vehicle not found")
    await db.execute("DELETE FROM vehicles WHERE plate = %s", (p,))
    return {"ok": True}


class VehicleRow(VehicleIn):
    plate: str


class VehicleBulkIn(BaseModel):
    rows: list[VehicleRow]


@router.post("/api/vehicles/bulk")
async def bulk_vehicles(payload: VehicleBulkIn, user: CurrentUser = Depends(get_current_user)):
    """Paste-in of many vehicles at once (the tab parses the pasted sheet rows). A bad row never stops the others; a field a row leaves out is left as it is."""
    _require_editor(user)
    if not payload.rows:
        raise HTTPException(status_code=422, detail="No rows given")
    if len(payload.rows) > 1000:
        raise HTTPException(status_code=422, detail="1000 rows at most in one go")
    results = []
    for r in payload.rows:
        try:
            fields = r.model_dump(exclude_unset=True)
            fields.pop("plate", None)
            new = await _save(_plate(r.plate), fields, user.email)
            results.append({"plate": r.plate, "status": "added" if new else "updated"})
        except HTTPException as exc:
            results.append({"plate": r.plate, "status": "error", "detail": exc.detail})
    count = lambda st: sum(1 for x in results if x["status"] == st)
    return {"results": results, "added": count("added"), "updated": count("updated"), "errors": count("error")}
