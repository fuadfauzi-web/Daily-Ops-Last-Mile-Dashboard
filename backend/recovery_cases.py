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

Who can do what (Fleet Manager, 2026-10-03): ONLY Recovery staff (position 'recovery') and the Superadmin have full access -- they add rows, edit every column, import
and delete. Everyone else follows the list's own rules: "station" fields are edited by station staff, region staff and managers for the stations in their scope; the
"recovery" fields are theirs alone. Fleet Admin, OPEX, Restock and any other HQ position only read (a Fleet Admin is NOT an admin here or anywhere else). Who may CREATE
rows is per type (create_by): Recovery for PDCNR and Damage, the hub for No Label from Hub. A date / tracking number / station can be corrected by whoever may create the row.

BETA (2026-10-04): only the Superadmin, Manager / HOD and Recovery can open these lists (can_use_lists); everyone else gets a 403.
Photos are real uploads (object storage): kind "file" fields hold {key, name, type, size}; an older text link typed in the sheet is kept and shown as a link.
"""
import csv
import io
import json
import logging
import os
import re
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

import db
import release
import storage
from auth import CurrentUser, get_current_user
from recovery_lost import _in_scope_named, weeknum2
from stations import HUBS

log = logging.getLogger("recovery_cases")
router = APIRouter()

MYT = timezone(timedelta(hours=8))
ROWS_CAP = 6000
TEXT_MAX = 2000
FILE_MAX_BYTES = 10 * 1024 * 1024
FILE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf"}


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
            F("proof_of_delivery", "Proof of delivery (photo is compulsory)", "station", "file"),
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
            F("tid_photo", "TID photo", "station", "file"),
            F("packaging_photo", "Packaging photo", "station", "file"),
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
                _STATION_BY_NAME[" ".join(str(k).split()).lower()] = code
    return _STATION_BY_NAME


# station names the old sheets still use for a station the app has since renamed (add more here as imports report them)
STATION_ALIASES = {"wangsa melawati": "melawati"}


def _station_code(text) -> str | None:
    """A station typed or pasted as the sheets have it -- any case, with stray / doubled spaces ("KEPALA  BATAS", "TRIANG ")."""
    key = " ".join(str(text or "").split()).lower()
    lookup = _station_lookup()
    return lookup.get(key) or lookup.get(STATION_ALIASES.get(key, ""))


# ------------------------------------------------------------------------------------------------ who may do what

def is_recovery(user: CurrentUser) -> bool:
    """Full access: the Recovery position and the Superadmin (tier 'admin') -- not managers, not Fleet Admin."""
    return user.position == "recovery" or user.role == "admin"


def _is_station_actor(user: CurrentUser) -> bool:
    """Fills the "station" columns for the stations in their scope: station and region staff, and managers (who see every station)."""
    return user.role in ("station", "region", "manager")


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

def can_use_lists(user: CurrentUser) -> bool:
    """Beta (2026-10-04): the three lists are not final with the Recovery team yet, so only the Superadmin, the Manager / HOD tier and the
    Recovery position see or use them -- everyone else (station, region, other HQ roles) gets a 403 and no menu entry."""
    return release.RECOVERY_BETA and (user.role in ("admin", "manager") or user.position == "recovery")


def _spec(case_type: str, user: CurrentUser) -> dict:
    spec = CASE_TYPES.get(case_type)
    if spec is None:
        raise HTTPException(status_code=404, detail="Unknown recovery list")
    if not can_use_lists(user):
        raise HTTPException(status_code=403, detail="These lists are in Beta -- only the Superadmin, Manager / HOD and Recovery can open them for now")
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
    if field["kind"] == "file":
        if not isinstance(v, str):  # an uploaded file is only ever set by the upload endpoint
            raise HTTPException(status_code=422, detail=f"{field['label']}: upload the photo, or clear it")
        if len(v.strip()) > TEXT_MAX:
            raise HTTPException(status_code=422, detail=f"{field['label']} is too long")
        return v.strip()
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


async def _drop_blob(value) -> None:
    """Best-effort delete of an uploaded file (a text link has nothing to delete)."""
    if isinstance(value, dict) and value.get("key"):
        try:
            await run_in_threadpool(storage.delete, value["key"])
        except Exception:  # noqa: BLE001 - an orphaned blob is harmless, a failed save is not
            log.exception("Recovery file delete failed")


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
    spec = _spec(case_type, user)
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
    shaped = _shape(row, _spec(case_type, user), user)
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
    spec = _spec(case_type, user)
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
    spec = _spec(case_type, user)
    if not _can_create(user, spec):
        raise HTTPException(status_code=403, detail="You cannot add rows here")
    if not payload.rows:
        raise HTTPException(status_code=422, detail="Nothing to add")
    if len(payload.rows) > 500:
        raise HTTPException(status_code=422, detail="Add at most 500 rows at a time")
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
        code = _station_code(item.station or payload.default_station)
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
    spec = _spec(case_type, user)
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
        if cv is not None and f["kind"] == "file" and not re.match(r"https?://\S+$", cv, re.I):
            raise HTTPException(status_code=422, detail=f"{f['label']}: upload a photo, or paste the full link (https://...)")
        if cv is None or f["kind"] == "file":
            await _drop_blob(data.get(k))  # clearing, or replacing an uploaded file with a typed link
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
            new_code = _station_code(payload.station)
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
    _spec(case_type, user)
    if not is_recovery(user):
        raise HTTPException(status_code=403, detail="Only Recovery can delete a row")
    _row, shaped = await _one(case_type, case_id, user)
    for v in shaped["data"].values():
        await _drop_blob(v)
    await db.execute("DELETE FROM recovery_cases WHERE case_type = %s AND id = %s", (case_type, case_id))
    return {"ok": True}


# ------------------------------------------------------------------------------------------------ photos (uploads)

def _file_field(spec: dict, field: str) -> dict:
    f = next((x for x in spec["fields"] if x["key"] == field and x["kind"] == "file"), None)
    if f is None:
        raise HTTPException(status_code=404, detail="That column does not take a photo")
    return f


@router.post("/api/recovery-cases/{case_type}/{case_id}/file/{field}")
async def upload_case_file(case_type: str, case_id: int, field: str, file: UploadFile = File(...), user: CurrentUser = Depends(get_current_user)):
    spec = _spec(case_type, user)
    f = _file_field(spec, field)
    row, shaped = await _one(case_type, case_id, user)
    if not _can_edit_field(user, f, shaped["station_code"]):
        raise HTTPException(status_code=403, detail=f"You cannot add a photo to \"{f['label']}\" on this row")
    ext = os.path.splitext(file.filename or "")[1].lower()
    content_type = FILE_TYPES.get(ext)
    if content_type is None:
        raise HTTPException(status_code=422, detail="Upload an image (png, jpg, gif, webp) or a PDF")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="The file is empty")
    if len(content) > FILE_MAX_BYTES:
        raise HTTPException(status_code=422, detail=f"The file is too big (max {FILE_MAX_BYTES // (1024 * 1024)} MB)")
    key = storage.safe_key("recovery", case_type, f"{uuid.uuid4().hex}{ext}")
    try:
        await run_in_threadpool(storage.put_bytes, key, content, content_type=content_type)
    except Exception:  # noqa: BLE001
        log.exception("Recovery file upload failed")
        raise HTTPException(status_code=503, detail="Couldn't store the file right now -- try again")
    data = dict(shaped["data"])
    await _drop_blob(data.get(field))  # replacing an earlier upload
    data[field] = {"key": key, "name": os.path.basename(file.filename or f"photo{ext}")[:200], "type": content_type, "size": len(content)}
    now = datetime.now(timezone.utc).replace(microsecond=0)
    await db.execute(
        "UPDATE recovery_cases SET data = %s, updated_by = %s, updated_at = %s WHERE case_type = %s AND id = %s",
        (json.dumps(data), user.email, now, case_type, case_id),
    )
    return {"ok": True, "row": (await _one(case_type, case_id, user))[1]}


@router.get("/api/recovery-cases/{case_type}/{case_id}/file/{field}")
async def get_case_file(case_type: str, case_id: int, field: str, download: bool = False, user: CurrentUser = Depends(get_current_user)):
    spec = _spec(case_type, user)
    _file_field(spec, field)
    _row, shaped = await _one(case_type, case_id, user)  # 404 / 403 by scope
    meta = shaped["data"].get(field)
    if not isinstance(meta, dict) or not meta.get("key"):
        raise HTTPException(status_code=404, detail="No photo uploaded here")
    try:
        content = await run_in_threadpool(storage.get_bytes, meta["key"])
    except Exception:  # noqa: BLE001
        log.exception("Recovery file read failed")
        raise HTTPException(status_code=404, detail="The photo could not be read")
    name = (meta.get("name") or "photo").replace('"', "")
    ctype = meta.get("type") or "application/octet-stream"
    disposition = "attachment" if (download or not ctype.startswith("image/")) else "inline"
    return Response(content=content, media_type=ctype, headers={"Content-Disposition": f'{disposition}; filename="{name}"', "X-Content-Type-Options": "nosniff"})


# ------------------------------------------------------------------------------------------------ import from the old sheets (CSV)

def _norm(h: str) -> str:
    return "".join(ch for ch in (h or "").lower() if ch.isalnum())


# (header text after _norm, exact?, target). The first rule that fits a header wins; a target is used once (the sheets repeat a trailing column).
# Targets: _date _tn _station _date_updated, otherwise a field key. Columns with no rule (Week No, Days since Inquiry, Region Head ...) are worked out here.
IMPORT_RULES = {
    "pdcnr": [
        ("dateupdated", False, "_date_updated"), ("platformticket", False, "platform_ticket"), ("rhoutcome", False, "rh_outcome"),
        ("proofofdelivery", False, "proof_of_delivery"), ("actiontaken", False, "action_taken"), ("recoveryvalidation", False, "recovery_validation"),
        ("remark", False, "remark"), ("pic", True, "pic"), ("driver", True, "driver"), ("tn", True, "_tn"), ("station", True, "_station"), ("date", True, "_date"),
    ],
    "damage": [
        ("trackingnumber", True, "_tn"), ("station", True, "_station"), ("date", True, "_date"),
        ("recoveryinstruction", False, "recovery_instruction"), ("actionbystation", False, "action_by_station"),
    ],
    "nolabel": [
        ("selectyourhub", False, "_station"), ("stationsname", True, "_station"), ("ecounter", False, "_date"), ("shipmentid", False, "shipment_id"),
        ("temporarytrackingid", True, "_tn"), ("tid", True, "_tn"), ("tidphoto", True, "tid_photo"), ("packagingphoto", True, "packaging_photo"),
        ("extracomment", True, "extra_comment"), ("outcome", True, "outcome"), ("dateparcelreceive", True, "recovery_received_date"),
    ],
}


def _map_headers(case_type: str, header: list[str]) -> dict[int, str]:
    rules = IMPORT_RULES[case_type]
    normed = [_norm(h) for h in header]
    out: dict[int, str] = {}
    used: set[str] = set()
    gform = case_type == "nolabel" and "temporarytrackingid" in normed  # the form's tab calls the date received just "Date Parcel Receive"
    for i, h in enumerate(normed):
        if not h:
            continue
        if gform and h == "dateparcelreceive":
            target = "_date"
        else:
            target = next((t for token, exact, t in rules if (h == token if exact else token in h)), None)
        if target and target not in used:
            out[i] = target
            used.add(target)
    return out


_MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}


def _parse_sheet_date(text, prefer: str = "mdy") -> date | None:
    """ISO, "7-Jan-2026" / "Jan 7, 2026", or d/m/yyyy | m/d/yyyy (the sheets mix both): a part above 12 settles it, otherwise `prefer` ('mdy' = the
    sheets' own display order, or 'dmy')."""
    raw = str(text or "").strip()
    t = raw.split(" ")[0].split("T")[0]
    if not t:
        return None
    try:
        return date.fromisoformat(t)
    except ValueError:
        pass
    words = [w for w in raw.replace(",", " ").replace("-", " ").replace("/", " ").split() if w]
    if len(words) >= 3:
        named = [(i, _MONTHS.get(w[:3].lower())) for i, w in enumerate(words[:3]) if w.isalpha() and len(w) >= 3]
        if len(named) == 1 and named[0][1]:
            i, m = named[0]
            nums = [int(w) for j, w in enumerate(words[:3]) if j != i and w.isdigit()]
            if len(nums) == 2:
                # "7-Jan-2026" / "Jan 7 2026": day first, year second; "2026 Jan 7" (month last): year first
                d, y = (nums[1], nums[0]) if i == 2 else (nums[0], nums[1])
                if y < 100:
                    y += 2000
                try:
                    return date(y, m, d)
                except ValueError:
                    return None
    parts = t.replace("-", "/").replace(".", "/").split("/")
    if len(parts) != 3 or not all(p.isdigit() for p in parts):
        return None
    a, b, y = (int(p) for p in parts)
    if y < 100:
        y += 2000
    if a > 12:
        d, m = a, b
    elif b > 12:
        m, d = a, b
    else:
        m, d = (a, b) if prefer == "mdy" else (b, a)
    try:
        return date(y, m, d)
    except ValueError:
        return None


class ImportIn(BaseModel):
    csv: str


@router.post("/api/recovery-cases/{case_type}/import")
async def import_cases(case_type: str, payload: ImportIn, user: CurrentUser = Depends(get_current_user)):
    """Bring in rows from the old sheet: export the tab as CSV (File -> Download -> CSV) and send its text. Only Recovery / Superadmin.
    Re-importing is safe: a row with the same tracking number AND date already in the list is skipped."""
    spec = _spec(case_type, user)
    if not is_recovery(user):
        raise HTTPException(status_code=403, detail="Only Recovery can import rows")
    if len(payload.csv) > 8_000_000:
        raise HTTPException(status_code=422, detail="That file is too big -- import it in parts")
    rows = list(csv.reader(io.StringIO(payload.csv.lstrip("﻿"))))
    header_at, mapping = None, {}
    for i, r in enumerate(rows[:8]):
        m = _map_headers(case_type, r)
        if "_tn" in m.values() and len(m) >= 3:
            header_at, mapping = i, m
            break
    if header_at is None:
        raise HTTPException(status_code=422, detail="Could not find the header row -- the first rows should hold the sheet's column titles (tracking number, station, date ...)")
    prefer = "mdy"  # even the No Label sheet shows most dates month-first; a part above 12 still settles any single date
    fields = {f["key"]: f for f in spec["fields"]}
    existing = {(r[0], _as_date(r[1])) for r in await db.fetch_all("SELECT tracking_number, case_date FROM recovery_cases WHERE case_type = %s", (case_type,))}
    now = datetime.now(timezone.utc).replace(microsecond=0)
    imported, skipped, dropped = 0, [], 0
    for r in rows[header_at + 1:]:
        if imported + len(skipped) >= 5000:
            skipped.append({"row": "…", "reason": "stopped at 5000 rows -- import the rest in a second file"})
            break
        cells = {t: (r[i].strip() if i < len(r) else "") for i, t in mapping.items()}
        tn = cells.get("_tn", "")
        if not tn:
            continue
        code = _station_code(cells.get("_station"))
        cdate = _parse_sheet_date(cells.get("_date"), prefer)
        if code is None:
            skipped.append({"row": tn, "reason": f"station \"{cells.get('_station', '')}\" not recognised"})
            continue
        if cdate is None:
            skipped.append({"row": tn, "reason": f"date \"{cells.get('_date', '')}\" not understood"})
            continue
        if (tn, cdate) in existing:
            skipped.append({"row": tn, "reason": "already imported"})
            continue
        data: dict = {}
        for key, raw in cells.items():
            if key.startswith("_") or not raw:
                continue
            f = fields[key]
            if f["kind"] == "select":
                hit = next((o for o in f["options"] if o.lower() == raw.lower()), None)
                if hit is None:
                    dropped += 1
                    continue
                data[key] = hit
            elif f["kind"] == "date":
                d = _parse_sheet_date(raw, prefer)
                if d is None:
                    dropped += 1
                    continue
                data[key] = d.isoformat()
            else:
                data[key] = raw[:TEXT_MAX]
        upd = _parse_sheet_date(cells.get("_date_updated"), prefer) if case_type == "pdcnr" else None
        if upd:
            data["date_updated"] = upd.isoformat()
        closed = None
        if data.get(spec["closed_when"]):
            closed = datetime.combine(upd or cdate, datetime.min.time(), tzinfo=timezone.utc)
        await db.execute(
            "INSERT INTO recovery_cases (case_type, tracking_number, station_code, case_date, data, created_by, created_at, updated_by, updated_at, closed_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (case_type, tn, code, cdate, json.dumps(data), user.email, now, user.email, now, closed),
        )
        existing.add((tn, cdate))
        imported += 1
    return {"ok": True, "imported": imported, "skipped": skipped[:12], "skipped_total": len(skipped), "values_dropped": dropped}
