"""Recovery -> PDCNR, Damage, No Label from Hub (2026-10-03): three of the recovery team's Google Sheets moved into the app.

One table (recovery_cases, V68) and one set of endpoints serve all three; what differs is the field list in CASE_TYPES, taken from the sheets:

PDCNR (Parcel Delivered, customer Not Received) -- sheet "PARCEL DELIVERED BUT CUSTOMER NOT RECEIVE - 2026", tab MASTERLIST 2026
  Recovery keys Date, Platform ticket, TN, Station (and the PIC). The station (or its Region Head) fills RH outcome, Proof of delivery, Driver and Action taken. Recovery
  then validates (Recovery validation + Remark), which closes the case. The sheet's "Week No", "Days since Inquiry" and "Investigation Status" are worked out here.
  The sheet's warning stands: "update within 2 working days" -- and if the customer denies receiving, the parcel is declared lost.
Damage -- sheet "LATEST DAMAGE FROM HUB 2025/2026", tab MASTERLIST
  Recovery keys Date, TN, Station and a Recovery instruction; the station answers with "Action by station", which closes the case.
No Label from Hub -- sheet "No Label From Hub" (hubs used a Google Form)
  The OTHER way round: the hub keys the entry (date received, shipment ID, temporary tracking ID, photo links, comment) and recovery sets the outcome
  (Able / Unable To Recover) with the date it received the parcel, which closes the case.

Who can do what: "recovery" fields are edited by Recovery staff (position 'recovery') and managers / admins; "station" fields by station and region staff for the
stations in their scope, and also by Recovery (who outranks them and can correct a row). Everyone else reads what is in their scope. Who may CREATE rows is per type
(create_by). A date / tracking number / station can be corrected by whoever may create the row.
"""
import json
import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user
from recovery_lost import _in_scope_named, weeknum2
from stations import HUBS

log = logging.getLogger("recovery_cases")
router = APIRouter()

MYT = timezone(timedelta(hours=8))
ROWS_CAP = 6000
TEXT_MAX = 2000


def F(key, label, by, kind="text", options=None, wide=False, default=None, entry=False):
    """entry=True: asked for on the "Add rows" form (one value shared by the batch); every field can still be edited in the table."""
    return {"key": key, "label": label, "by": by, "kind": kind, "options": options, "wide": wide, "default": default, "entry": entry}


CASE_TYPES = {
    "pdcnr": {
        "label": "PDCNR",
        "blurb": "Parcel Delivered but customer Not Received. Recovery keys in the case; the station (or its Region Head) fills the investigation within 2 working days; "
                 "Recovery validates. If the customer denies receiving the parcel it is declared lost, so investigate properly.",
        "date_label": "Date", "tn_label": "Tracking number", "create_by": "recovery", "closed_when": "recovery_validation",
        "fields": [
            F("platform_ticket", "Platform ticket", "recovery", "select", ["X-SPACE", "FSR/CRM", "EMAIL", "IN- HOUSE", "CLAIM"], entry=True),
            F("rh_outcome", "RH outcome", "station", "select", ["Customer Received", "Parcel Lost - customer issue", "Lost by Driver", "Parcel with NV", "Revert Complete"]),
            F("proof_of_delivery", "Proof of delivery (image link is compulsory)", "station", wide=True),
            F("driver", "Driver", "station"),
            F("action_taken", "Action taken", "station", wide=True),
            F("recovery_validation", "Recovery validation", "recovery", "select", ["Valid", "Not Valid", "No Update From RH", "Valid - No dispute from Customer"]),
            F("remark", "Remark", "recovery", wide=True),
            F("pic", "PIC", "recovery", default="user"),
        ],
    },
    "damage": {
        "label": "Damage",
        "blurb": "Damaged parcels from the hubs. Recovery keys in the case with an instruction; the station does it and answers with the action it took.",
        "date_label": "Date", "tn_label": "Tracking number", "create_by": "recovery", "closed_when": "action_by_station",
        "fields": [
            F("recovery_instruction", "Recovery instruction", "recovery", "select", [
                "HUB TO UPLOAD PHOTOS IN PETs", "HUB TO UPLOAD ADDITIONAL PHOTOS IN PETs", "HUB TO DISPOSE ITEM AFTER 2 DAYS", "HUB TO LH PARCEL TO REC",
                "STATION TO REPACK", "HOLD FOR NEXT ACTION", "REPACK AND RETURN", "AH KE REC"], entry=True),
            F("action_by_station", "Action by station", "station", "select", [
                "PHOTO UPLOADED", "PARCEL ALREADY LH TO REC", "PARCEL DISPOSED AFTER 2 DAYS", "ADDITIONAL PHOTO UPLOADED", "DONE REPACK", "OK", "PARCEL LEAKING",
                "WRONG TICKET CREATED", "COMPLETED", "ITEM MISSING - DONE EMAIL", "WRONG STATION"]),
            F("remark", "Remark", "recovery", wide=True),
        ],
    },
    "nolabel": {
        "label": "No Label from Hub",
        "blurb": "Parcels a hub received with no label. The HUB keys in the entry (the form it used before); Recovery sets the outcome once it has the parcel.",
        "date_label": "Date parcel received at hub", "tn_label": "Temporary tracking ID (TID)", "create_by": "station", "closed_when": "outcome",
        "fields": [
            F("shipment_id", "Shipment ID (shipment to rec)", "station", entry=True),
            F("tid_photo", "TID photo (link)", "station", entry=True),
            F("packaging_photo", "Packaging photo (link)", "station", entry=True),
            F("extra_comment", "Extra comment", "station", wide=True, entry=True),
            F("recovery_received_date", "Date Recovery received the parcel", "recovery", "date"),
            F("outcome", "Outcome", "recovery", "select", ["Able To Recover (ATR)", "Unable To Recover (UTR)"]),
        ],
    },
}

_STATION_BY_NAME: dict[str, str] = {}


def _station_lookup() -> dict[str, str]:
    """lower-case station name / full name / code -> station code (rebuilt when the station list changes size)."""
    if len(_STATION_BY_NAME) < len(HUBS):
        _STATION_BY_NAME.clear()
        for code, (name, full, _zone, _region) in HUBS.items():
            for k in (code, name, full):
                _STATION_BY_NAME[str(k).strip().lower()] = code
    return _STATION_BY_NAME


# ------------------------------------------------------------------------------------------------ who may do what

def is_recovery(user: CurrentUser) -> bool:
    return user.position == "recovery" or user.role in ("manager", "admin")


def _is_station_actor(user: CurrentUser) -> bool:
    return user.role in ("station", "region")


def _station_in_scope(user: CurrentUser, code: str) -> bool:
    h = HUBS.get(code)
    return bool(h) and _in_scope_named(user, h[3], h[2], h[0])


def _can_create(user: CurrentUser, spec: dict) -> bool:
    return is_recovery(user) or (spec["create_by"] == "station" and _is_station_actor(user))


def _can_edit_field(user: CurrentUser, field: dict, code: str) -> bool:
    if is_recovery(user):
        return True
    return field["by"] == "station" and _is_station_actor(user) and _station_in_scope(user, code)


# ------------------------------------------------------------------------------------------------ helpers

def _spec(case_type: str) -> dict:
    spec = CASE_TYPES.get(case_type)
    if spec is None:
        raise HTTPException(status_code=404, detail="Unknown recovery list")
    return spec


def _today() -> date:
    return datetime.now(MYT).date()


def _data(v) -> dict:
    if v is None:
        return {}
    if isinstance(v, (str, bytes)):
        try:
            v = json.loads(v)
        except ValueError:
            return {}
    return v if isinstance(v, dict) else {}


def _as_date(v) -> date | None:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return None


def _clean(field: dict, v):
    """A field's value checked against its kind; empty clears it."""
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    v = str(v).strip()
    if field["kind"] == "select":
        if v not in field["options"]:
            raise HTTPException(status_code=422, detail=f"{field['label']}: pick one of {', '.join(field['options'])}")
    elif field["kind"] == "date":
        d = _as_date(v)
        if d is None:
            raise HTTPException(status_code=422, detail=f"{field['label']}: use a date like 2026-10-03")
        v = d.isoformat()
    elif len(v) > TEXT_MAX:
        raise HTTPException(status_code=422, detail=f"{field['label']} is too long (max {TEXT_MAX} characters)")
    return v


def _shape(r, spec: dict, user: CurrentUser) -> dict | None:
    cid, tn, code, case_date, data, created_by, created_at, updated_by, updated_at, closed_at = r
    hub = HUBS.get(code)
    if hub is None:
        return None
    name, _full, zone, region = hub
    if not _in_scope_named(user, region, zone, name):
        return None
    d = _data(data)
    cdate = _as_date(case_date)
    end = _as_date(closed_at) or _today()
    out = {
        "id": cid, "tracking_number": tn, "station_code": code, "station_name": name, "zone": zone, "region": region,
        "case_date": cdate.isoformat() if cdate else None, "week_no": weeknum2(cdate) if cdate else None,
        "status": "Closed" if closed_at else "Open", "days_open": max(0, (end - cdate).days) if cdate else None,
        "data": d, "created_by": created_by, "updated_by": updated_by,
        "updated_at": updated_at.isoformat() if hasattr(updated_at, "isoformat") else (str(updated_at) if updated_at else None),
        "can_edit": {f["key"]: _can_edit_field(user, f, code) for f in spec["fields"]},
        "can_edit_core": _can_create(user, spec) and (is_recovery(user) or _station_in_scope(user, code)),
        "can_delete": is_recovery(user),
    }
    if spec is CASE_TYPES["pdcnr"]:
        out["proof_missing"] = d.get("rh_outcome") == "Customer Received" and not d.get("proof_of_delivery")
    return out


def _public_config(spec: dict) -> dict:
    return {k: spec[k] for k in ("label", "blurb", "date_label", "tn_label", "create_by", "closed_when", "fields")}


async def _load(case_type: str, user: CurrentUser) -> list[dict]:
    spec = _spec(case_type)
    rows = await db.fetch_all(
        "SELECT id, tracking_number, station_code, case_date, data, created_by, created_at, updated_by, updated_at, closed_at "
        "FROM recovery_cases WHERE case_type = %s ORDER BY case_date DESC, id DESC LIMIT %s", (case_type, ROWS_CAP),
    )
    return [s for s in (_shape(r, spec, user) for r in rows) if s]


async def _one(case_type: str, case_id: int, user: CurrentUser):
    row = await db.fetch_one(
        "SELECT id, tracking_number, station_code, case_date, data, created_by, created_at, updated_by, updated_at, closed_at "
        "FROM recovery_cases WHERE case_type = %s AND id = %s", (case_type, case_id),
    )
    if row is None:
        raise HTTPException(status_code=404, detail="This row no longer exists")
    shaped = _shape(row, _spec(case_type), user)
    if shaped is None:
        raise HTTPException(status_code=403, detail="This row is outside your access")
    return row, shaped


# ------------------------------------------------------------------------------------------------ endpoints

class NewCase(BaseModel):
    tracking_number: str
    station: str | None = None  # name or code; falls back to the request's default station
    case_date: str | None = None
    fields: dict = {}


class NewCases(BaseModel):
    rows: list[NewCase]
    default_station: str | None = None
    default_date: str | None = None


class CasePatch(BaseModel):
    fields: dict = {}
    case_date: str | None = None
    tracking_number: str | None = None
    station: str | None = None


@router.get("/api/recovery-cases/{case_type}")
async def list_cases(case_type: str, user: CurrentUser = Depends(get_current_user)):
    spec = _spec(case_type)
    rows = await _load(case_type, user)
    can_create = _can_create(user, spec)
    stations = []
    if can_create:
        stations = sorted(
            ({"code": c, "name": h[0]} for c, h in HUBS.items() if is_recovery(user) or _station_in_scope(user, c)),
            key=lambda s: s["name"],
        )
    return {
        "config": _public_config(spec), "rows": rows, "can_create": can_create, "stations": stations,
        "is_recovery": is_recovery(user), "user_name": user.display_name or user.email, "today": _today().isoformat(),
    }


@router.post("/api/recovery-cases/{case_type}")
async def create_cases(case_type: str, payload: NewCases, user: CurrentUser = Depends(get_current_user)):
    spec = _spec(case_type)
    if not _can_create(user, spec):
        raise HTTPException(status_code=403, detail="You cannot add rows here")
    if not payload.rows:
        raise HTTPException(status_code=422, detail="Nothing to add")
    if len(payload.rows) > 500:
        raise HTTPException(status_code=422, detail="Add at most 500 rows at a time")
    lookup = _station_lookup()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    default_date = _as_date(payload.default_date) or _today()
    open_tns = {
        r[0] for r in await db.fetch_all(
            "SELECT tracking_number FROM recovery_cases WHERE case_type = %s AND closed_at IS NULL", (case_type,))
    }
    created, skipped = 0, []
    seen: set[str] = set()
    for item in payload.rows:
        tn = (item.tracking_number or "").strip()
        if not tn:
            continue
        station_text = (item.station or payload.default_station or "").strip().lower()
        code = lookup.get(station_text)
        if code is None:
            skipped.append({"tracking_number": tn, "reason": f"station \"{item.station or payload.default_station or ''}\" not recognised"})
            continue
        if not is_recovery(user) and not _station_in_scope(user, code):
            skipped.append({"tracking_number": tn, "reason": "that station is outside your access"})
            continue
        if tn in open_tns or tn in seen:
            skipped.append({"tracking_number": tn, "reason": "already open"})
            continue
        data: dict = {}
        for f in spec["fields"]:
            if f["default"] == "user":
                data[f["key"]] = user.display_name or user.email
        for k, v in (item.fields or {}).items():
            f = next((x for x in spec["fields"] if x["key"] == k), None)
            if f is None or not _can_edit_field(user, f, code):
                continue
            cv = _clean(f, v)
            if cv is not None:
                data[k] = cv
        cdate = _as_date(item.case_date) or default_date
        closed = now if data.get(spec["closed_when"]) else None
        await db.execute(
            "INSERT INTO recovery_cases (case_type, tracking_number, station_code, case_date, data, created_by, created_at, updated_by, updated_at, closed_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (case_type, tn, code, cdate, json.dumps(data), user.email, now, user.email, now, closed),
        )
        seen.add(tn)
        created += 1
    return {"ok": True, "created": created, "skipped": skipped}


@router.put("/api/recovery-cases/{case_type}/{case_id}")
async def update_case(case_type: str, case_id: int, payload: CasePatch, user: CurrentUser = Depends(get_current_user)):
    spec = _spec(case_type)
    row, shaped = await _one(case_type, case_id, user)
    code = shaped["station_code"]
    data = dict(shaped["data"])
    sets: dict = {}
    for k, v in (payload.fields or {}).items():
        f = next((x for x in spec["fields"] if x["key"] == k), None)
        if f is None:
            raise HTTPException(status_code=422, detail=f"Unknown field {k}")
        if not _can_edit_field(user, f, code):
            raise HTTPException(status_code=403, detail=f"You cannot edit \"{f['label']}\" on this row")
        cv = _clean(f, v)
        if cv is None:
            data.pop(k, None)
        else:
            data[k] = cv
    if spec is CASE_TYPES["pdcnr"] and "rh_outcome" in (payload.fields or {}):
        # the sheet's "Date Updated by RH": stamped when the outcome is filled, cleared if it is taken away
        if data.get("rh_outcome"):
            data.setdefault("date_updated", _today().isoformat())
        else:
            data.pop("date_updated", None)
    core_requested = any(x is not None for x in (payload.case_date, payload.tracking_number, payload.station))
    if core_requested:
        if not shaped["can_edit_core"]:
            raise HTTPException(status_code=403, detail="You cannot change the date, tracking number or station of this row")
        if payload.case_date is not None:
            d = _as_date(payload.case_date)
            if d is None:
                raise HTTPException(status_code=422, detail="Use a date like 2026-10-03")
            sets["case_date"] = d
        if payload.tracking_number is not None:
            tn = payload.tracking_number.strip()
            if not tn:
                raise HTTPException(status_code=422, detail="The tracking number cannot be empty")
            sets["tracking_number"] = tn
        if payload.station is not None:
            new_code = _station_lookup().get(payload.station.strip().lower())
            if new_code is None:
                raise HTTPException(status_code=422, detail="That station is not recognised")
            if not is_recovery(user) and not _station_in_scope(user, new_code):
                raise HTTPException(status_code=403, detail="That station is outside your access")
            sets["station_code"] = new_code
    if not sets and not payload.fields:
        raise HTTPException(status_code=422, detail="Nothing to save")
    now = datetime.now(timezone.utc).replace(microsecond=0)
    was_closed = row[9] is not None
    now_closed = bool(data.get(spec["closed_when"]))
    sets["data"] = json.dumps(data)
    sets["updated_by"], sets["updated_at"] = user.email, now
    if now_closed and not was_closed:
        sets["closed_at"] = now
    elif not now_closed and was_closed:
        sets["closed_at"] = None
    cols = ", ".join(f"{k} = %s" for k in sets)
    await db.execute(f"UPDATE recovery_cases SET {cols} WHERE case_type = %s AND id = %s", (*sets.values(), case_type, case_id))
    return {"ok": True, "row": (await _one(case_type, case_id, user))[1]}


@router.delete("/api/recovery-cases/{case_type}/{case_id}")
async def delete_case(case_type: str, case_id: int, user: CurrentUser = Depends(get_current_user)):
    _spec(case_type)
    if not is_recovery(user):
        raise HTTPException(status_code=403, detail="Only Recovery can delete a row")
    await _one(case_type, case_id, user)
    await db.execute("DELETE FROM recovery_cases WHERE case_type = %s AND id = %s", (case_type, case_id))
    return {"ok": True}
