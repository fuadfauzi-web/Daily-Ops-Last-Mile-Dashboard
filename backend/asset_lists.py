"""Assets -> Fire extinguisher and Weighing scale (2026-10-04, staging, Beta): two more categories next to Station inventory (assets.py). Each is a register of dated
records per station -- extinguishers with their quantity, serial numbers and expiry, weighing scales with their calibration and certificate details -- so the Fleet Admin
team sees what is expired or about to expire without keeping the Google Sheets. One record per extinguisher batch / scale; a station can have several.

HQ staff and above read; only the Fleet Admin role edits. The sample data from the sheets (backend/data/fleet_asset_seed.json) is loaded ONLY on the staging app
(APP_URL contains "-staging") the first time a list is opened empty; production never gets it, it starts empty and is filled by paste or by hand.
"""
import asyncio
import json
import os
import re
from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user
from stations import ABBR_TO_HUB, HUBS

router = APIRouter()

# field -> (type, max length). types: text, int, date, bool
KINDS = {
    "fire-extinguisher": {
        "table": "fire_extinguishers", "seed": "fire_extinguisher", "key": "serial_numbers",
        "fields": {
            "has_fe": ("bool", 0), "quantity": ("int", 0), "expiry_date": ("date", 0), "serial_numbers": ("text", 500), "vendor": ("text", 100),
            "pic_name": ("text", 120), "pic_phone": ("text", 60), "remarks": ("text", 500),
        },
    },
    "weighing-scale": {
        "table": "weighing_scales", "seed": "weighing_scale", "key": "serial_no",
        "fields": {
            "manufacturer": ("text", 120), "last_calibrated": ("date", 0), "expiry_date": ("date", 0), "reference_no": ("text", 80), "serial_no": ("text", 80),
            "cable": ("text", 20), "calibrated_by": ("text", 120), "borang_d": ("text", 300), "certificate": ("text", 300), "remarks": ("text", 500),
        },
    },
}
KIND_RE = "fire-extinguisher|weighing-scale"
_STATIONS = {h[0]: h for h in HUBS.values()}
_BY_NAME = {n.lower(): n for n in _STATIONS} | {h[1].lower().replace("station ", "", 1): h[0] for h in HUBS.values()} | {"wangsa melawati": "Melawati", "kinabatangan": "Kota Kinabatangan"}
_locks = {k: asyncio.Lock() for k in KINDS}


def _can_view(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager", "hq_staff")


def _can_edit(user: CurrentUser) -> bool:
    return user.position == "fleet_admin"  # only the Fleet Admin role edits this module for now


def _require_editor(user: CurrentUser) -> None:
    if not _can_edit(user):
        raise HTTPException(status_code=403, detail="Only the Fleet Admin team can edit assets")


def resolve_station(text: str) -> str:
    """A station's name, its 3-letter code or its full name -> the station name."""
    t = " ".join((text or "").split())
    name = _BY_NAME.get(t.lower())
    if not name:
        hub = HUBS.get(ABBR_TO_HUB.get(t.upper(), ""))
        name = hub[0] if hub else None
    if not name:
        raise HTTPException(status_code=422, detail=f"Not a station: {text!r}")
    return name


def _clean(kind: str, field: str, value):
    typ, mx = KINDS[kind]["fields"][field]
    if value is None:
        return None
    if typ == "bool":
        if isinstance(value, bool):
            return value
        s = str(value).strip().lower()
        if s in ("yes", "y", "true", "1"):
            return True
        if s in ("no", "n", "false", "0"):
            return False
        raise HTTPException(status_code=422, detail=f"{field}: use yes or no")
    s = " ".join(str(value).split())
    if s.lower() in ("", "n/a", "#n/a", "-"):
        return None
    if typ == "int":
        if not re.fullmatch(r"\d{1,6}", s):
            raise HTTPException(status_code=422, detail=f"{field}: use a whole number (got {value!r})")
        return int(s)
    if typ == "date":
        try:
            return date.fromisoformat(s)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"{field}: use a date like 2027-01-31 (got {value!r})")
    if len(s) > mx:
        raise HTTPException(status_code=422, detail=f"{field}: too long ({mx} characters at most)")
    return s


def _days(d, today: date) -> int | None:
    if not d:
        return None
    day = d if isinstance(d, date) and not isinstance(d, datetime) else date.fromisoformat(str(d)[:10])
    return (day - today).days


def _iso(d) -> str | None:
    return d.isoformat() if isinstance(d, date) else (str(d)[:10] if d else None)


def _row_out(kind: str, cols: list[str], r, today: date) -> dict:
    rec = dict(zip(cols, r))
    hub = _STATIONS.get(rec["station"])
    out = {"id": rec["id"], "station": rec["station"], "zone": hub[2] if hub else "", "region": hub[3] if hub else ""}
    for f, (typ, _mx) in KINDS[kind]["fields"].items():
        v = rec[f]
        out[f] = _iso(v) if typ == "date" else (bool(v) if typ == "bool" else ("" if v is None and typ == "text" else v))
    out["expiry_days"] = _days(rec["expiry_date"], today)
    out["updated_by"] = rec["updated_by"]
    out["updated_at"] = str(rec["updated_at"])[:16] if rec["updated_at"] else None
    return out


def _seed_allowed() -> bool:
    return "-staging" in (os.environ.get("APP_URL") or "") or os.environ.get("SEED_FLEET_ASSET_LISTS") == "1"


async def _seed_once(kind: str) -> None:
    """Staging only: the first time a list is opened empty, load the sample rows from the sheets (once -- a marker row remembers it)."""
    if not _seed_allowed():
        return
    spec = KINDS[kind]
    marker = f"seed.fleet_assets.{kind}"
    async with _locks[kind]:
        if await db.fetch_one("SELECT setting_key FROM management_settings WHERE setting_key=%s", (marker,)):
            return
        have = await db.fetch_one(f"SELECT id FROM {spec['table']} LIMIT 1")
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if have is None:
            rows = json.loads((Path(__file__).parent / "data" / "fleet_asset_seed.json").read_text(encoding="utf-8")).get(spec["seed"], [])
            for r in rows:
                fields = {f: r.get(f) for f in spec["fields"] if r.get(f) is not None}
                if "expiry_date" in fields or "last_calibrated" in fields:
                    for f in ("expiry_date", "last_calibrated"):
                        if f in fields:
                            fields[f] = date.fromisoformat(fields[f])
                cols = ["station", *fields, "updated_by", "updated_at"]
                await db.execute(
                    f"INSERT INTO {spec['table']} ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})",
                    (r["station"], *fields.values(), "sheet import", now),
                )
        await db.execute(
            "INSERT INTO management_settings (setting_key, setting_value, updated_by, updated_at) VALUES (%s, %s, %s, %s)", (marker, "done", "system", now)
        )


@router.get("/api/assets/{kind:str}", include_in_schema=True)
async def list_register(kind: str, user: CurrentUser = Depends(get_current_user)):
    if not re.fullmatch(KIND_RE, kind):
        raise HTTPException(status_code=404, detail="Not found")
    if not _can_view(user):
        raise HTTPException(status_code=403, detail="HQ staff access required")
    spec = KINDS[kind]
    await _seed_once(kind)
    cols = ["id", "station", *spec["fields"], "updated_by", "updated_at"]
    today = datetime.now(timezone.utc).date()
    rows = await db.fetch_all(f"SELECT {', '.join(cols)} FROM {spec['table']} ORDER BY station, id")
    items = [_row_out(kind, cols, r, today) for r in rows]
    stations = [{"name": n, "zone": h[2], "region": h[3]} for n, h in sorted(_STATIONS.items())]
    return {"items": items, "stations": stations, "can_edit": _can_edit(user), "today": today.isoformat()}


class RegisterIn(BaseModel):
    station: str | None = None
    # the kind's own fields are accepted as extra keys; only the ones sent are changed ("" clears a field)
    model_config = {"extra": "allow"}


def _fields_from(kind: str, payload: dict) -> dict:
    unknown = [k for k in payload if k not in KINDS[kind]["fields"] and k != "station"]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown field: {unknown[0]}")
    return {f: _clean(kind, f, payload[f]) for f in KINDS[kind]["fields"] if f in payload}


def _kind_or_404(kind: str) -> dict:
    if not re.fullmatch(KIND_RE, kind):
        raise HTTPException(status_code=404, detail="Not found")
    return KINDS[kind]


async def _insert(kind: str, station: str, fields: dict, by: str) -> int:
    spec = KINDS[kind]
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cols = ["station", *fields, "updated_by", "updated_at"]
    await db.execute(f"INSERT INTO {spec['table']} ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})", (station, *fields.values(), by, now))
    row = await db.fetch_one(f"SELECT MAX(id) FROM {spec['table']} WHERE station = %s", (station,))
    return row[0]


@router.post("/api/assets/{kind}")
async def create_record(kind: str, payload: RegisterIn, user: CurrentUser = Depends(get_current_user)):
    _kind_or_404(kind)
    _require_editor(user)
    data = payload.model_dump(exclude_none=False)
    station = resolve_station(data.get("station") or "")
    new_id = await _insert(kind, station, _fields_from(kind, {k: v for k, v in data.items() if k != "station"}), user.email)
    return {"ok": True, "id": new_id}


@router.put("/api/assets/{kind}/{record_id}")
async def update_record(kind: str, record_id: int, payload: RegisterIn, user: CurrentUser = Depends(get_current_user)):
    spec = _kind_or_404(kind)
    _require_editor(user)
    if not await db.fetch_one(f"SELECT id FROM {spec['table']} WHERE id = %s", (record_id,)):
        raise HTTPException(status_code=404, detail="Record not found")
    data = payload.model_dump(exclude_none=False)
    fields = _fields_from(kind, {k: v for k, v in data.items() if k != "station"})
    sets = [f"{k}=%s" for k in fields]
    args = list(fields.values())
    if data.get("station"):
        sets.append("station=%s")
        args.append(resolve_station(data["station"]))
    sets += ["updated_by=%s", "updated_at=%s"]
    args += [user.email, datetime.now(timezone.utc).replace(tzinfo=None)]
    await db.execute(f"UPDATE {spec['table']} SET {', '.join(sets)} WHERE id = %s", (*args, record_id))
    return {"ok": True}


@router.delete("/api/assets/{kind}/{record_id}")
async def delete_record(kind: str, record_id: int, user: CurrentUser = Depends(get_current_user)):
    spec = _kind_or_404(kind)
    _require_editor(user)
    if not await db.fetch_one(f"SELECT id FROM {spec['table']} WHERE id = %s", (record_id,)):
        raise HTTPException(status_code=404, detail="Record not found")
    await db.execute(f"DELETE FROM {spec['table']} WHERE id = %s", (record_id,))
    return {"ok": True}


class BulkIn(BaseModel):
    rows: list[dict]


@router.post("/api/assets/{kind}/bulk")
async def bulk_records(kind: str, payload: BulkIn, user: CurrentUser = Depends(get_current_user)):
    """Paste-in of many records (the tab parses the pasted sheet rows). A row whose station + key (serial number) already exists is updated, anything else is
    added; one bad row never stops the others."""
    spec = _kind_or_404(kind)
    _require_editor(user)
    if not payload.rows:
        raise HTTPException(status_code=422, detail="No rows given")
    if len(payload.rows) > 500:
        raise HTTPException(status_code=422, detail="500 rows at most in one go")
    key = spec["key"]
    results = []
    for raw in payload.rows:
        label = str(raw.get("station") or "?")
        try:
            station = resolve_station(str(raw.get("station") or ""))
            fields = _fields_from(kind, {k: v for k, v in raw.items() if k != "station"})
            hit = None
            if fields.get(key):
                hit = await db.fetch_one(f"SELECT id FROM {spec['table']} WHERE station = %s AND {key} = %s", (station, fields[key]))
            if hit:
                sets = [f"{k}=%s" for k in fields] + ["updated_by=%s", "updated_at=%s"]
                await db.execute(
                    f"UPDATE {spec['table']} SET {', '.join(sets)} WHERE id = %s",
                    (*fields.values(), user.email, datetime.now(timezone.utc).replace(tzinfo=None), hit[0]),
                )
                results.append({"station": label, "status": "updated"})
            else:
                await _insert(kind, station, fields, user.email)
                results.append({"station": label, "status": "added"})
        except HTTPException as exc:
            results.append({"station": label, "status": "error", "detail": exc.detail})
    count = lambda st: sum(1 for x in results if x["status"] == st)
    return {"results": results, "added": count("added"), "updated": count("updated"), "errors": count("error")}
