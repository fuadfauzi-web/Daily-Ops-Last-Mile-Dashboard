"""Premises (2026-10-02, staging): one record per station -- address, size, launch date, business licence and tenancy dates, rent, deposit and
the document links -- kept by the Fleet Admin team in the app instead of the 'Address' tab of the MY - Fleet Management sheet (V57 loaded it).

HQ staff and above can read it (rent and deposit are commercial figures); only the Fleet Admin team and the Superadmin edit. The days left on the
licence and tenancy are worked out here from the dates, so nobody has to keep an "Expires In" column right.
"""
import re
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user
from stations import HUBS

router = APIRouter()

COLUMNS = (
    "station_code", "address", "latitude", "longitude", "sqft", "launched_date", "license_expiry", "license_doc_url", "tenancy_end",
    "rental", "deposit", "tenancy_doc_urls", "remarks", "chat_url", "contract_ref",
)
_DATES = {"launched_date", "license_expiry", "tenancy_end"}
_NUMBERS = {"latitude": (-90, 90), "longitude": (-180, 180), "sqft": (0, 10_000_000), "rental": (0, 99_999_999), "deposit": (0, 99_999_999)}
_TEXT_MAX = {"station_code": 20, "address": 500, "remarks": 1000, "contract_ref": 60, "license_doc_url": 600, "chat_url": 600, "tenancy_doc_urls": 2000}
_URL = re.compile(r"^https?://\S+$", re.IGNORECASE)
_STATIONS = {h[0] for h in HUBS.values()}


def _can_view(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager", "hq_staff")


def _can_edit(user: CurrentUser) -> bool:
    return user.role == "admin" or user.position == "fleet_admin"


def _require_editor(user: CurrentUser) -> None:
    if not _can_edit(user):
        raise HTTPException(status_code=403, detail="Only the Fleet Admin team can edit premises")


class PremisesIn(BaseModel):
    """Only the fields that are sent are changed; "" clears a field."""
    station_code: str | None = None
    address: str | None = None
    latitude: float | str | None = None
    longitude: float | str | None = None
    sqft: float | str | None = None
    launched_date: str | None = None
    license_expiry: str | None = None
    license_doc_url: str | None = None
    tenancy_end: str | None = None
    rental: float | str | None = None
    deposit: float | str | None = None
    tenancy_doc_urls: str | None = None
    remarks: str | None = None
    chat_url: str | None = None
    contract_ref: str | None = None


def _clean(field: str, value):
    """-> the value to store (None clears). Raises 422 on something that can't be stored."""
    if value is None:
        return None
    if field in _DATES:
        s = str(value).strip()
        if not s:
            return None
        try:
            return date.fromisoformat(s)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"{field}: use a date like 2027-01-31 (got {s!r})")
    if field in _NUMBERS:
        s = str(value).strip().replace(",", "")
        if not s:
            return None
        try:
            n = float(s)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"{field}: not a number ({s!r})")
        lo, hi = _NUMBERS[field]
        if not lo <= n <= hi:
            raise HTTPException(status_code=422, detail=f"{field}: out of range")
        return n
    s = "\n".join(" ".join(line.split()) for line in str(value).strip().splitlines() if line.strip()) if field == "tenancy_doc_urls" else " ".join(str(value).split())
    if not s:
        return None
    if len(s) > _TEXT_MAX[field]:
        raise HTTPException(status_code=422, detail=f"{field}: too long ({_TEXT_MAX[field]} characters at most)")
    if field in ("license_doc_url", "chat_url") and not _URL.match(s):
        raise HTTPException(status_code=422, detail=f"{field}: must be a link starting with http:// or https://")
    if field == "tenancy_doc_urls" and not all(_URL.match(u) for u in s.split("\n")):
        raise HTTPException(status_code=422, detail="tenancy_doc_urls: one link per line, each starting with http:// or https://")
    return s


def _days(d: date | None, today: date) -> int | None:
    return None if d is None else (d - today).days


def _row_out(r, today: date) -> dict:
    station = r[0]
    hub = next((h for h in HUBS.values() if h[0] == station), None)
    iso = lambda d: d.isoformat() if isinstance(d, date) else (str(d)[:10] if d else None)
    parse = lambda d: d if isinstance(d, date) and not isinstance(d, datetime) else (date.fromisoformat(str(d)[:10]) if d else None)
    lic, ten = parse(r[7]), parse(r[9])
    return {
        "station": station, "zone": hub[2] if hub else "", "region": hub[3] if hub else "",
        "station_code": r[1] or "", "address": r[2] or "", "latitude": r[3], "longitude": r[4], "sqft": r[5],
        "launched_date": iso(r[6]), "license_expiry": iso(lic), "license_days": _days(lic, today), "license_doc_url": r[8] or "",
        "tenancy_end": iso(ten), "tenancy_days": _days(ten, today),
        "rental": float(r[10]) if r[10] is not None else None, "deposit": float(r[11]) if r[11] is not None else None,
        "tenancy_doc_urls": [u for u in (r[12] or "").split("\n") if u.strip()],
        "remarks": r[13] or "", "chat_url": r[14] or "", "contract_ref": r[15] or "",
        "updated_by": r[16], "updated_at": str(r[17])[:16] if r[17] else None,
    }


_SELECT = ("SELECT station, station_code, address, latitude, longitude, sqft, launched_date, license_expiry, license_doc_url, tenancy_end, "
           "rental, deposit, tenancy_doc_urls, remarks, chat_url, contract_ref, updated_by, updated_at FROM premises")


@router.get("/api/premises")
async def list_premises(user: CurrentUser = Depends(get_current_user)):
    if not _can_view(user):
        raise HTTPException(status_code=403, detail="HQ staff access required")
    today = datetime.now(timezone.utc).date()
    rows = await db.fetch_all(_SELECT + " ORDER BY station")
    have = {r[0] for r in rows}
    out = [_row_out(r, today) for r in rows]
    # Stations with no record yet still show up (blank), so the Fleet Admin team can see what is missing.
    for name, _full, zone, region in sorted(HUBS.values(), key=lambda h: h[0]):
        if name not in have:
            out.append({**_row_out((name,) + (None,) * 17, today), "zone": zone, "region": region})
    out.sort(key=lambda p: p["station"])
    return {"premises": out, "can_edit": _can_edit(user), "today": today.isoformat()}


async def _save(station: str, fields: dict, by: str) -> bool:
    """Insert or update one station's record with just the fields given. Returns True when it was new."""
    if station not in _STATIONS:
        raise HTTPException(status_code=404, detail=f"Not a station: {station!r}")
    clean = {k: _clean(k, v) for k, v in fields.items() if k in COLUMNS}
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    exists = await db.fetch_one("SELECT station FROM premises WHERE station = %s", (station,))
    if exists:
        sets = [f"{k}=%s" for k in clean] + ["updated_by=%s", "updated_at=%s"]
        await db.execute(f"UPDATE premises SET {', '.join(sets)} WHERE station = %s", (*clean.values(), by, now, station))
        return False
    cols = ["station", *clean, "updated_by", "updated_at"]
    await db.execute(f"INSERT INTO premises ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})", (station, *clean.values(), by, now))
    return True


@router.put("/api/premises/{station}")
async def save_premises(station: str, payload: PremisesIn, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    await _save(station, payload.model_dump(exclude_unset=True), user.email)
    return {"ok": True}


class PremisesRow(PremisesIn):
    station: str


class PremisesBulkIn(BaseModel):
    rows: list[PremisesRow]


@router.post("/api/premises/bulk")
async def bulk_premises(payload: PremisesBulkIn, user: CurrentUser = Depends(get_current_user)):
    """Paste-in of many stations at once (the tab parses the pasted sheet rows). A bad row never stops the others; fields a row leaves out
    are left as they are."""
    _require_editor(user)
    if not payload.rows:
        raise HTTPException(status_code=422, detail="No rows given")
    if len(payload.rows) > 500:
        raise HTTPException(status_code=422, detail="500 rows at most in one go")
    results = []
    for r in payload.rows:
        try:
            fields = r.model_dump(exclude_unset=True)
            fields.pop("station", None)
            new = await _save(r.station, fields, user.email)
            results.append({"station": r.station, "status": "added" if new else "updated"})
        except HTTPException as exc:
            results.append({"station": r.station, "status": "error", "detail": exc.detail})
    count = lambda st: sum(1 for x in results if x["status"] == st)
    return {"results": results, "added": count("added"), "updated": count("updated"), "errors": count("error")}
