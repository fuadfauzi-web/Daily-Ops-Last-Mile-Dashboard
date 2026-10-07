"""Station Profile (2026-10-07, staging): one page per station, like the 'Station' tab of the MY - Fleet Management sheet -- pick a station and see its IDs, sub
region (zone), how long it has been open, Google Chat space, address, Region Head / Region Supervisor (with the station they are based at), its own team, the
WORKMAIL GROUP / MANAGER ON DUTY / BUSINESS HOURS boxes, how many Last Mile stations each region has, and the postcodes it covers.

Where each thing comes from: Station ID / address / lat-long / opening date / chat space = Premises (Fleet Admin -> Premises); Warehouse ID = station_profile (V75);
people = the Staff & Org Chart (users + org_people); the three boxes = profile_info; postcodes = station_postcodes (uploaded from the Master Postcodes sheet).
Everyone signed in can open it (like the org chart). Only the Fleet Admin Team Lead (and the Superadmin) edits the Warehouse ID, the three boxes and the postcodes.
"""
import csv
import io
import json
import re
from datetime import date, datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

import db
import headcount
import staff
from auth import CurrentUser, get_current_user, parse_scope_values, tier_of
from stations import HUBS, REGIONS, ZONES_BY_REGION

router = APIRouter()

_BY_NAME = {h[0]: h for h in HUBS.values()}  # station name -> (name, full name, zone, region)
_INFO_KEYS = ("workmail_groups", "managers_on_duty", "business_hours")
_POSTCODE = re.compile(r"^\d{5}$")


def _code(station: str) -> str:
    for hub, (name, *_rest) in HUBS.items():
        if name == station:
            parts = hub.split("-")
            return parts[1] if len(parts) > 1 else ""
    return ""


def _opened_for(opened: date | None, today: date | None = None) -> dict | None:
    """'10 Years 9 Months 6 Days' like the sheet (calendar years / months / days since the opening date)."""
    if not opened:
        return None
    today = today or date.today()
    if opened > today:
        return {"years": 0, "months": 0, "days": 0, "text": "Not open yet"}
    y, m, d = today.year - opened.year, today.month - opened.month, today.day - opened.day
    if d < 0:
        m -= 1
        prev_month = (today.month - 2) % 12 + 1
        prev_year = today.year if today.month > 1 else today.year - 1
        d += [31, 29 if prev_year % 4 == 0 and (prev_year % 100 or prev_year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][prev_month - 1]
    if m < 0:
        y -= 1
        m += 12
    plural = lambda n, w: f"{n} {w}{'' if n == 1 else 's'}"
    return {"years": y, "months": m, "days": d, "text": f"{plural(y, 'Year')} {plural(m, 'Month')} {plural(d, 'Day')}"}


def _to_date(v) -> date | None:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if v:
        try:
            return date.fromisoformat(str(v)[:10])
        except ValueError:
            return None
    return None


async def _info() -> dict:
    out = {"workmail_groups": [], "managers_on_duty": [], "business_hours": {}}
    for key, raw in await db.fetch_all("SELECT info_key, info_value FROM profile_info"):
        if key in out:
            try:
                out[key] = json.loads(raw)
            except ValueError:
                pass
    return out


def region_totals() -> dict:
    """Last Mile stations per region (the sheet's TOTAL LM STATION boxes): the first four regions add up to the total, East Malaysia is listed beside it."""
    count = {r: 0 for r in REGIONS}
    for _name, _full, _zone, region in HUBS.values():
        if region in count:
            count[region] += 1
    return {"regions": [{"name": r, "stations": count[r]} for r in REGIONS], "total": sum(n for r, n in count.items() if r != "East Malaysia")}


async def _home_station(user: CurrentUser) -> str:
    """The station to open first: where the person is posted (a station), or the station a Region Head / RFS is based at."""
    row = await db.fetch_one(
        "SELECT scope_type, scope_values, home_scope_type, home_scope_values, based_station FROM users WHERE LOWER(email) = %s", (user.email.lower(),)
    )
    if not row:
        return ""
    st, vals = (row[2], parse_scope_values(row[3])) if row[2] else (row[0], parse_scope_values(row[1]))
    if st == "station" and vals and vals[0] in _BY_NAME:
        return vals[0]
    return row[4] if row[4] in _BY_NAME else ""


@router.get("/api/station-profile")
async def station_list(user: CurrentUser = Depends(get_current_user)):
    """The stations for the picker (region > zone > station) and the one to open first."""
    stations = [
        {"station": n, "code": _code(n), "zone": z, "region": r}
        for n, _full, z, r in sorted(HUBS.values(), key=lambda h: (REGIONS.index(h[3]) if h[3] in REGIONS else 99, h[2], h[0]))
    ]
    return {"stations": stations, "mine": await _home_station(user), "can_edit": await staff._can_edit(user)}


def _person(row, based: str = "") -> dict:
    email, display, phone, _emp, based_station = row[0], row[1], row[2], row[3], row[4]
    return {"email": email, "name": staff.plain_name(display) or email, "phone": phone or "", "office_based": based_station or based or ""}


@router.get("/api/station-profile/{station}")
async def station_profile(station: str, user: CurrentUser = Depends(get_current_user)):
    hub = _BY_NAME.get(station)
    if not hub:
        raise HTTPException(status_code=404, detail="Unknown station")
    _name, _full, zone, region = hub
    prem = await db.fetch_one(
        "SELECT station_code, address, latitude, longitude, launched_date, chat_url FROM premises WHERE station = %s", (station,)
    )
    wh = await db.fetch_one("SELECT warehouse_id FROM station_profile WHERE station = %s", (station,))
    users = await db.fetch_all(
        "SELECT email, display_name, phone, employee_id, based_station, role, scope_type, scope_values, home_scope_type, home_scope_values FROM users ORDER BY display_name, email"
    )
    heads, assistants, rhs, rfss, managers = [], [], [], [], []
    for u in users:
        role = u[5]
        if tier_of(role) == "admin" or staff._is_test_account(u[0]):
            continue
        home_type, home_values = staff._home_of((u[0], role, u[6], u[7], u[8], u[9]))
        if home_type == "station" and station in home_values:
            (heads if role == "station_head" else assistants).append(_person(u))
        elif home_type == "zone" and zone in home_values:
            (rhs if role == "region_head" else rfss).append(_person(u))
        elif home_type == "region" and region in home_values and role == "manager":
            managers.append(_person(u))
    for o in await db.fetch_all("SELECT name, email, phone FROM org_people WHERE branch = 'region_manager' AND region = %s ORDER BY sort_no, id", (region,)):
        managers.append({"email": o[1] or "", "name": o[0], "phone": o[2] or "", "office_based": ""})
    # vacant seats (approved headcount) show as empty rows, like the sheet's "No Name"
    tba = {}
    for seat in await headcount._seats("WHERE status = 'approved'"):
        for place in seat["places"]:
            tba[(place, seat["designation"])] = tba.get((place, seat["designation"]), 0) + 1
    team = [{"designation": "Station Head", **p, "vacant": False} for p in heads]
    team += [{"designation": "Station Head", "vacant": True} for _ in range(tba.get((station, "station_head"), 0))]
    n = 0
    for p in assistants:
        n += 1
        team.append({"designation": f"Fleet Assistant {n}", **p, "vacant": False})
    for _ in range(tba.get((station, "fleet_assistant"), 0)):
        n += 1
        team.append({"designation": f"Fleet Assistant {n}", "vacant": True})
    pcs = [r[0] for r in await db.fetch_all("SELECT postcode FROM station_postcodes WHERE station = %s ORDER BY postcode", (station,))]
    lat, lng = (prem[2], prem[3]) if prem else (None, None)
    opened = _to_date(prem[4]) if prem else None
    return {
        "station": station, "code": _code(station), "zone": zone, "region": region,
        "station_id": (prem[0] if prem else None) or "", "warehouse_id": (wh[0] if wh else None) or "",
        "opened_for": _opened_for(opened), "opening_date": opened.isoformat() if opened else None,
        "chat_url": (prem[5] if prem else None) or "", "address": (prem[1] if prem else None) or "",
        "latlong": f"{lat}, {lng}" if lat is not None and lng is not None else "",
        "region_heads": rhs, "region_head_vacant": tba.get((zone, "region_head"), 0),
        "supervisors": rfss, "supervisor_vacant": tba.get((zone, "rfs"), 0),
        "managers": managers, "team": team,
        "info": await _info(), "totals": region_totals(),
        "postcodes": pcs, "can_edit": await staff._can_edit(user),
    }


class WarehouseIn(BaseModel):
    warehouse_id: str


@router.patch("/api/station-profile/{station}")
async def set_warehouse(station: str, payload: WarehouseIn, user: CurrentUser = Depends(get_current_user)):
    """The Warehouse ID of a station (the sheet's control tab); "" clears it."""
    await staff._require_editor(user)
    if station not in _BY_NAME:
        raise HTTPException(status_code=404, detail="Unknown station")
    v = " ".join(payload.warehouse_id.split())
    if len(v) > 20:
        raise HTTPException(status_code=422, detail="Warehouse ID is too long (20 characters at most)")
    now = headcount._now()
    if await db.fetch_one("SELECT station FROM station_profile WHERE station = %s", (station,)):
        await db.execute("UPDATE station_profile SET warehouse_id = %s, updated_by = %s, updated_at = %s WHERE station = %s", (v or None, user.email, now, station))
    else:
        await db.execute("INSERT INTO station_profile (station, warehouse_id, updated_by, updated_at) VALUES (%s,%s,%s,%s)", (station, v or None, user.email, now))
    return {"ok": True}


class InfoIn(BaseModel):
    workmail_groups: list[dict] | None = None
    managers_on_duty: list[dict] | None = None
    business_hours: dict | None = None


def _clean_text(v, limit: int, label: str) -> str:
    s = " ".join(str(v or "").split())
    if len(s) > limit:
        raise HTTPException(status_code=422, detail=f"{label} is too long ({limit} characters at most)")
    return s


@router.put("/api/station-profile-info")
async def set_info(payload: InfoIn, user: CurrentUser = Depends(get_current_user)):
    """The three boxes that are the same for every station (only the ones sent are replaced)."""
    await staff._require_editor(user)
    new: dict = {}
    if payload.workmail_groups is not None:
        new["workmail_groups"] = [
            {"label": _clean_text(g.get("label"), 60, "Group name"), "email": _clean_text(g.get("email"), 120, "Group email")}
            for g in payload.workmail_groups[:30] if _clean_text(g.get("label"), 60, "Group name") or _clean_text(g.get("email"), 120, "Group email")
        ]
    if payload.managers_on_duty is not None:
        new["managers_on_duty"] = [
            {"area": _clean_text(m.get("area"), 80, "Area"), "name": _clean_text(m.get("name"), 80, "Name")}
            for m in payload.managers_on_duty[:30] if _clean_text(m.get("area"), 80, "Area") or _clean_text(m.get("name"), 80, "Name")
        ]
    if payload.business_hours is not None:
        new["business_hours"] = {k: _clean_text(payload.business_hours.get(k), 120, k) for k in ("delivery_window", "opening_days", "opening_hours")}
    now = headcount._now()
    for key, value in new.items():
        raw = json.dumps(value, ensure_ascii=False)
        if await db.fetch_one("SELECT info_key FROM profile_info WHERE info_key = %s", (key,)):
            await db.execute("UPDATE profile_info SET info_value = %s, updated_by = %s, updated_at = %s WHERE info_key = %s", (raw, user.email, now, key))
        else:
            await db.execute("INSERT INTO profile_info (info_key, info_value, updated_by, updated_at) VALUES (%s,%s,%s,%s)", (key, raw, user.email, now))
    return {"ok": True, "info": await _info()}


def _read_rows(name: str, data: bytes) -> list[list]:
    if name.lower().endswith((".xlsx", ".xlsm")):
        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        rows = []
        for ws in wb.worksheets:
            rows.extend([list(r) for r in ws.iter_rows(values_only=True)])
            rows.append(None)  # sheet break: each tab brings its own header row
        return rows
    text = data.decode("utf-8-sig", errors="replace")
    return [r for r in csv.reader(io.StringIO(text))]


@router.post("/api/station-postcodes/upload")
async def upload_postcodes(file: UploadFile = File(...), user: CurrentUser = Depends(get_current_user)):
    """The postcodes each station covers, from the [MY] Master Postcodes sheet (a regional tab, or all of them, saved as CSV / Excel). The file needs a 'Postcode'
    and a 'Station' column; every station found in the file gets its list replaced, stations not in the file are left as they were."""
    await staff._require_editor(user)
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The file is too big (25 MB at most)")
    rows = _read_rows(file.filename or "", data)
    lower = {n.lower(): n for n in _BY_NAME}
    found: dict[str, set[str]] = {}
    unknown: dict[str, int] = {}
    pc_i = st_i = None
    seen_header = False
    for row in rows:
        if row is None:
            pc_i = st_i = None
            continue
        cells = [str(c).strip() if c is not None else "" for c in row]
        low = [c.lower() for c in cells]
        if "postcode" in low and "station" in low:
            pc_i, st_i = low.index("postcode"), low.index("station")
            seen_header = True
            continue
        if pc_i is None or st_i is None or max(pc_i, st_i) >= len(cells):
            continue
        pc = cells[pc_i].split(".")[0].zfill(5)
        if not _POSTCODE.match(pc):
            continue
        name = lower.get(cells[st_i].lower())
        if not name:
            if cells[st_i]:
                unknown[cells[st_i]] = unknown.get(cells[st_i], 0) + 1
            continue
        found.setdefault(name, set()).add(pc)
    if not seen_header:
        raise HTTPException(status_code=422, detail="No 'Postcode' and 'Station' columns found in the file")
    if not found:
        raise HTTPException(status_code=422, detail="No postcode matched a station in the app")
    for name, pcs in found.items():
        await db.execute("DELETE FROM station_postcodes WHERE station = %s", (name,))
        await db.execute_many("INSERT INTO station_postcodes (station, postcode) VALUES (%s,%s)", [(name, pc) for pc in sorted(pcs)])
    return {
        "ok": True, "stations": len(found), "postcodes": sum(len(v) for v in found.values()),
        "unknown_stations": sorted(unknown, key=lambda k: -unknown[k])[:20],
    }
