"""Attendance (2026-10-02, staging): one place for all attendance -- PTWH first, Staff and Hybrid later.

PTWH (part-time warehouse) used to be a Google Sheet the station staff typed by hand: one amount per person per day, then payable.
Here a day is a CLOCK IN and a CLOCK OUT time and the pay is worked out from the hours:
  * hours >= HALF_DAY_HOURS      -> a full day, paid at the worker's daily rate
  * 0 < hours < HALF_DAY_HOURS   -> a half day, paid at HALF_DAY_FACTOR x the rate   (same rule as the PTWH Monitoring template's Setup tab)
  * clocked in but not out yet   -> "open": pays nothing until someone closes it (missed clock-outs are visible, not guessed)
Every day also carries one of the 4 standard PTWH CATEGORIES (CATEGORIES below, from the template's PTWH Build / Setup tabs) -- why the
person was needed -- so cost can be read by category; each worker has a default category that pre-fills it.
Today station staff clock people in / out for them (source 'station'); the plan is for each PTWH to clock themselves in a separate PTWH
app with their own login (source 'app'), which will also serve Staff and Hybrid attendance. The tables and the clock endpoints are shaped
for that: the app only has to call the same clock-in / clock-out with the worker it belongs to.

The roster comes from the PTWH DETAILS sheet: Workers -> Import reads that tab downloaded as CSV (see import_workers). Bank details and
home address stay in the sheet for now -- they are not needed for attendance and are not copied.

Who sees / does what: everyone sees the stations in their scope; station + region staff, Managers / HOD and the Superadmin may add
workers and record or correct clock times for the stations in their scope; HQ staff (Fleet Admin, OPEX ...) view only.
"""
import csv
import io
import logging
import re
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

import db
from auth import CurrentUser, effective_scope, get_current_user
from stations import HUBS

log = logging.getLogger("attendance")
router = APIRouter()

_MYT = timezone(timedelta(hours=8))
HALF_DAY_HOURS = 6.0
HALF_DAY_FACTOR = 0.5
DEFAULT_RATE = 50.0
# The 4 standard categories (PTWH Monitoring template: PTWH Build section B, Setup tab). max_days = the template's "Max days/month" control
# (0 = as approved, no fixed cap); a worker over it in a month is flagged on the Month sheet, not blocked.
CATEGORIES = [
    {"code": "C1", "name": "Core Shift - Inbound & Push-off", "shift": "AM 05:00-14:00 (half day 06:00-10:00)", "max_days": 26,
     "covers": "Daily AM shift that opens the station with linehaul: unload, inbound, route sort, push-off, ATS, 2nd trip. Includes half-day push-off support."},
    {"code": "C2", "name": "Vacancy Cover - Short of Staff", "shift": "AM 05:00-14:00", "max_days": 26,
     "covers": "Fills an unfilled FA position (resignation / not yet hired), including FA / SH training cover. Time-bound: stop once the FA joins."},
    {"code": "C3", "name": "Leave & Rotation Cover", "shift": "AM 05:00-14:00", "max_days": 20,
     "covers": "Covers FA / SH off-days, annual leave, MC, long MC and staff sent for rescue -- only on the dates staff are away."},
    {"code": "C4", "name": "Volume Surge / PM Support", "shift": "PM 13:00-21:00 or ad-hoc", "max_days": 0,
     "covers": "Extra hands on high-volume days, backlog, late linehaul, and PM shift for high longtail / RSVN pickup -- backed by OPEX data, approved monthly / weekly."},
]
CATEGORY_CODES = {c["code"] for c in CATEGORIES}


def category_from_text(text: str | None) -> str | None:
    """A category code from a cell: 'C2', '2', or one of the old attendance-sheet justifications (mapped the way the template merges them)."""
    t = (text or "").strip().lower()
    if not t:
        return None
    m = re.fullmatch(r"c?([1-4])", t)
    if m:
        return "C" + m.group(1)
    for needle, code in (("push off", "C1"), ("push-off", "C1"), ("training", "C2"), ("leave", "C3"), ("rotation", "C3"),
                         ("short", "C2"), ("volume", "C4"), ("backlog", "C4"), ("morning", "C1"), ("permanent", "C1")):
        if needle in t:
            return code
    return None


def _check_category(code: str | None) -> str | None:
    if code in (None, ""):
        return None
    if code not in CATEGORY_CODES:
        raise HTTPException(status_code=422, detail="Pick a category C1 to C4")
    return code


def _now() -> datetime:
    """Malaysia wall-clock time, no tzinfo -- that is what the DATETIME columns hold."""
    return datetime.now(_MYT).replace(tzinfo=None)


def _station_names() -> set[str]:
    return {name for name, *_rest in HUBS.values()}


def _visible_stations(user: CurrentUser) -> set[str]:
    """Station names this person may see; managers / admins / HQ staff see all of them."""
    st = effective_scope(user.scope_type)
    if st == "all":
        return _station_names()
    out = set()
    for name, _full, zone, region in HUBS.values():
        if (st == "station" and name in user.scope_values) or (st == "zone" and zone in user.scope_values) \
                or (st == "region" and region in user.scope_values):
            out.add(name)
    return out


def _can_edit(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager", "region", "station")


def _require_editor(user: CurrentUser, station: str) -> None:
    if not _can_edit(user):
        raise HTTPException(status_code=403, detail="Only station / region staff and managers can record attendance")
    if station not in _visible_stations(user):
        raise HTTPException(status_code=403, detail="That station is outside your scope")


def _mask_ic(ic: str | None, full: bool) -> str | None:
    if not ic or full:
        return ic
    return "******-**-" + ic[-4:] if len(ic) >= 4 else "****"


def _parse_date(raw: str | None, default: date) -> date:
    if not raw:
        return default
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise HTTPException(status_code=422, detail="Dates look like 2026-10-02")


def _hours(clock_in: datetime | None, clock_out: datetime | None) -> float | None:
    if not clock_in or not clock_out:
        return None
    return max(0.0, (clock_out - clock_in).total_seconds() / 3600)


def day_pay(rate: float, clock_in: datetime | None, clock_out: datetime | None) -> tuple[float, float]:
    """(workday, payable) for one day: 1 / 0.5 / 0 workday, and the rate x that."""
    h = _hours(clock_in, clock_out)
    if h is None or h <= 0:
        return 0.0, 0.0
    wd = 1.0 if h >= HALF_DAY_HOURS else HALF_DAY_FACTOR
    return wd, round(rate * wd, 2)


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat(timespec="minutes") if dt else None


def _worker_json(r, full_ic: bool) -> dict:
    return {
        "id": r[0], "name": r[1], "ic_no": _mask_ic(r[2], full_ic), "phone": r[3], "station": r[4],
        "daily_rate": float(r[5]), "joined_date": str(r[6]) if r[6] else None, "active": bool(r[7]), "category": r[8],
    }


_WORKER_COLS = "id, full_name, ic_no, phone, station, daily_rate, joined_date, active, category"


async def _worker(worker_id: int):
    row = await db.fetch_one(f"SELECT {_WORKER_COLS} FROM ptwh_workers WHERE id = %s", (worker_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    return row


class WorkerIn(BaseModel):
    name: str
    station: str
    ic_no: str | None = None
    phone: str | None = None
    daily_rate: float = DEFAULT_RATE
    joined_date: str | None = None
    active: bool = True
    category: str | None = None


def _validate_worker(p: WorkerIn) -> None:
    if not p.name.strip():
        raise HTTPException(status_code=422, detail="Type the worker's name")
    if p.station not in _station_names():
        raise HTTPException(status_code=422, detail="Pick a station from the list")
    if not (0 < p.daily_rate <= 500):
        raise HTTPException(status_code=422, detail="Daily rate should be between RM1 and RM500")
    _check_category(p.category)


@router.get("/api/attendance/ptwh/workers")
async def list_workers(user: CurrentUser = Depends(get_current_user)):
    stations = _visible_stations(user)
    rows = await db.fetch_all(f"SELECT {_WORKER_COLS} FROM ptwh_workers ORDER BY station, full_name")
    full_ic = user.role in ("admin", "manager")
    return {
        "workers": [_worker_json(r, full_ic) for r in rows if r[4] in stations],
        "stations": sorted(stations),
        "can_edit": _can_edit(user),
        "default_rate": DEFAULT_RATE,
        "categories": CATEGORIES,
    }


@router.post("/api/attendance/ptwh/workers")
async def add_worker(payload: WorkerIn, user: CurrentUser = Depends(get_current_user)):
    _validate_worker(payload)
    _require_editor(user, payload.station)
    joined = _parse_date(payload.joined_date, _now().date()) if payload.joined_date else None
    await db.execute(
        """INSERT INTO ptwh_workers (full_name, ic_no, phone, station, daily_rate, joined_date, active, category, created_by, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s, %s)""",
        (payload.name.strip().upper(), (payload.ic_no or "").strip() or None, (payload.phone or "").strip() or None,
         payload.station, payload.daily_rate, joined, payload.category or None, user.email, _now()),
    )
    return {"ok": True}


@router.patch("/api/attendance/ptwh/workers/{worker_id}")
async def update_worker(worker_id: int, payload: WorkerIn, user: CurrentUser = Depends(get_current_user)):
    _validate_worker(payload)
    row = await _worker(worker_id)
    _require_editor(user, row[4])  # may edit a worker at their old station ...
    _require_editor(user, payload.station)  # ... and move them only to a station they also cover
    ic = (payload.ic_no or "").strip()
    new_ic = row[2] if (not ic or "*" in ic) else ic  # the masked value the list showed means "unchanged"
    joined = _parse_date(payload.joined_date, _now().date()) if payload.joined_date else None
    await db.execute(
        """UPDATE ptwh_workers SET full_name=%s, ic_no=%s, phone=%s, station=%s, daily_rate=%s, joined_date=%s, active=%s, category=%s, updated_at=%s
           WHERE id=%s""",
        (payload.name.strip().upper(), new_ic, (payload.phone or "").strip() or None, payload.station, payload.daily_rate,
         joined, 1 if payload.active else 0, payload.category or None, _now(), worker_id),
    )
    return {"ok": True}


# ---------------------------------------------------------------- import from the PTWH DETAILS sheet

_DATE_FORMATS = ("%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d %b %Y", "%d.%m.%Y", "%d-%b-%y")


def _norm_header(h: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (h or "").lower())


def _find_col(headers: list[str], *prefixes: str) -> int | None:
    """Index of the first header (normalised) that starts with one of the prefixes -- the sheet's headers carry hints like 'IC NO Format (1234-56-7890)'."""
    for p in prefixes:
        for i, h in enumerate(headers):
            if _norm_header(h).startswith(p):
                return i
    return None


def _clean_name(raw: str) -> str:
    return " ".join((raw or "").replace("\xa0", " ").upper().split()).rstrip(".").strip()


def _parse_loose_date(raw: str) -> date | None:
    s = (raw or "").strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_rate(raw: str) -> float | None:
    m = re.search(r"\d+(\.\d+)?", (raw or "").replace(",", ""))
    return float(m.group()) if m else None


def _ic_digits(ic: str | None) -> str:
    return re.sub(r"\D", "", ic or "")


def _station_lookup() -> dict[str, str]:
    out = {}
    for name, full, _zone, _region in HUBS.values():
        out[name.strip().lower()] = name
        out[full.strip().lower()] = name
    return out


@router.post("/api/attendance/ptwh/import")
async def import_workers(file: UploadFile = File(...), dry_run: bool = True, user: CurrentUser = Depends(get_current_user)):
    """Roster import from the PTWH DETAILS tab downloaded as CSV (File -> Download -> .csv). Matches columns by header (Full Name, IC No, Station,
    Phone No, Joined Date, Rate; an optional Category or Justification column fills the default category). Only people NOT already in the list are
    added -- nobody is overwritten, so a station's later edits survive a re-import -- and only for stations in the caller's scope. With dry_run
    (the default) nothing is written: it just says what would happen, so the screen can show it before the person confirms."""
    if not _can_edit(user):
        raise HTTPException(status_code=403, detail="Only station / region staff and managers can import PTWH")
    raw = await file.read()
    if len(raw) > 5_000_000:
        raise HTTPException(status_code=413, detail="That file is too big for a PTWH list")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        raise HTTPException(status_code=422, detail="The file is empty")
    # The header row is the first one that has both a name and a station column (a title row above it is fine).
    hdr_i = next((i for i, r in enumerate(rows[:10]) if _find_col(r, "fullname", "name") is not None and _find_col(r, "station") is not None), None)
    if hdr_i is None:
        raise HTTPException(status_code=422, detail="Couldn't find the Full Name and Station columns -- use the PTWH DETAILS tab downloaded as CSV")
    h = rows[hdr_i]
    c_name, c_station = _find_col(h, "fullname", "name"), _find_col(h, "station")
    c_ic, c_phone, c_joined = _find_col(h, "icno", "ic"), _find_col(h, "phone"), _find_col(h, "joined")
    c_rate, c_cat = _find_col(h, "rate"), _find_col(h, "category", "justification")

    def cell(r: list[str], i: int | None) -> str:
        return r[i].strip() if i is not None and i < len(r) else ""

    stations = _visible_stations(user)
    lookup = _station_lookup()
    have_ic, have_name = set(), set()
    for wid, name, ic, st in await db.fetch_all("SELECT id, full_name, ic_no, station FROM ptwh_workers"):
        if _ic_digits(ic):
            have_ic.add(_ic_digits(ic))
        have_name.add((_clean_name(name), st))

    res = {"dry_run": dry_run, "rows": 0, "new": 0, "existing": 0, "duplicate_in_file": 0, "outside_scope": 0, "bad_rows": 0, "bad_ic": 0,
           "unmatched_stations": {}, "by_station": {}, "sample": []}
    to_add, seen_ic, seen_name = [], set(), set()
    for r in rows[hdr_i + 1:]:
        name = _clean_name(cell(r, c_name))
        st_raw = cell(r, c_station)
        if not name and not st_raw:
            continue  # blank line
        res["rows"] += 1
        if not name or not st_raw:
            res["bad_rows"] += 1
            continue
        station = lookup.get(st_raw.strip().lower())
        if station is None:
            res["unmatched_stations"][st_raw.upper()] = res["unmatched_stations"].get(st_raw.upper(), 0) + 1
            continue
        if station not in stations:
            res["outside_scope"] += 1
            continue
        ic = cell(r, c_ic)
        digits = _ic_digits(ic)
        if digits and len(digits) != 12:
            res["bad_ic"] += 1
        if (digits and digits in have_ic) or (not digits and (name, station) in have_name):
            res["existing"] += 1
            continue
        if (digits and digits in seen_ic) or (not digits and (name, station) in seen_name):
            res["duplicate_in_file"] += 1
            continue
        (seen_ic.add(digits) if digits else seen_name.add((name, station)))
        rate = _parse_rate(cell(r, c_rate))
        rate = rate if rate and 0 < rate <= 500 else DEFAULT_RATE
        joined = _parse_loose_date(cell(r, c_joined))
        category = category_from_text(cell(r, c_cat))
        to_add.append((name, ic or None, cell(r, c_phone) or None, station, rate, joined, category))
        res["by_station"][station] = res["by_station"].get(station, 0) + 1
    res["new"] = len(to_add)
    res["sample"] = [{"name": a[0], "station": a[3], "daily_rate": a[4], "category": a[6]} for a in to_add[:8]]
    if not dry_run and to_add:
        now = _now()
        await db.execute_many(
            """INSERT INTO ptwh_workers (full_name, ic_no, phone, station, daily_rate, joined_date, active, category, created_by, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s, %s)""",
            [(n, ic, ph, st, rt, jd, cat, user.email, now) for n, ic, ph, st, rt, jd, cat in to_add],
        )
        log.info("PTWH import by %s: %d added", user.email, len(to_add))
    return res


# ---------------------------------------------------------------- the day

def _record_json(r) -> dict:
    """r: id, clock_in, clock_out, category, source, note"""
    h = _hours(r[1], r[2])
    return {"id": r[0], "clock_in": _iso(r[1]), "clock_out": _iso(r[2]), "hours": round(h, 2) if h is not None else None,
            "category": r[3], "source": r[4], "note": r[5]}


@router.get("/api/attendance/ptwh/day")
async def day_view(date_: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """Every active PTWH in scope with that day's clock times (today by default)."""
    day = _parse_date(date_, _now().date())
    stations = _visible_stations(user)
    workers = [r for r in await db.fetch_all(f"SELECT {_WORKER_COLS} FROM ptwh_workers WHERE active = 1 ORDER BY station, full_name") if r[4] in stations]
    recs = {
        r[0]: r[1:]
        for r in await db.fetch_all(
            "SELECT worker_id, id, clock_in, clock_out, category, source, note FROM ptwh_attendance WHERE work_date = %s", (day,)
        )
    }
    # The category each person used last, so the clock-in box is pre-filled the way the sheet's justification column carried over.
    last = {r[0]: r[1] for r in await db.fetch_all(
        "SELECT worker_id, category FROM ptwh_attendance WHERE category IS NOT NULL AND work_date < %s ORDER BY work_date", (day,))}
    rows = []
    for w in workers:
        rec = recs.get(w[0])
        rows.append({**_worker_json(w, False), "record": _record_json(rec) if rec else None, "default_category": last.get(w[0]) or w[8]})
    return {
        "date": str(day), "today": str(_now().date()), "rows": rows, "categories": CATEGORIES, "can_edit": _can_edit(user),
        "rule": {"half_day_hours": HALF_DAY_HOURS, "half_day_factor": HALF_DAY_FACTOR},
    }


class ClockIn(BaseModel):
    worker_id: int
    category: str | None = None


class ClockOut(BaseModel):
    worker_id: int


@router.post("/api/attendance/ptwh/clock-in")
async def clock_in(payload: ClockIn, user: CurrentUser = Depends(get_current_user)):
    w = await _worker(payload.worker_id)
    _require_editor(user, w[4])
    category = _check_category(payload.category) or w[8]
    if not w[7]:
        raise HTTPException(status_code=409, detail="This worker is inactive")
    now = _now()
    if await db.fetch_one("SELECT id FROM ptwh_attendance WHERE worker_id=%s AND work_date=%s", (w[0], now.date())):
        raise HTTPException(status_code=409, detail="Already clocked in today")
    await db.execute(
        """INSERT INTO ptwh_attendance (worker_id, work_date, clock_in, category, source, recorded_by, created_at)
           VALUES (%s, %s, %s, %s, 'station', %s, %s)""",
        (w[0], now.date(), now, category, user.email, now),
    )
    return {"ok": True}


@router.post("/api/attendance/ptwh/clock-out")
async def clock_out(payload: ClockOut, user: CurrentUser = Depends(get_current_user)):
    w = await _worker(payload.worker_id)
    _require_editor(user, w[4])
    now = _now()
    row = await db.fetch_one("SELECT id, clock_out FROM ptwh_attendance WHERE worker_id=%s AND work_date=%s", (w[0], now.date()))
    if row is None:
        raise HTTPException(status_code=409, detail="Not clocked in today")
    if row[1] is not None:
        raise HTTPException(status_code=409, detail="Already clocked out")
    await db.execute("UPDATE ptwh_attendance SET clock_out=%s, edited_by=%s, edited_at=%s WHERE id=%s", (now, user.email, now, row[0]))
    return {"ok": True}


class RecordIn(BaseModel):
    worker_id: int
    work_date: str
    clock_in: str  # HH:MM
    clock_out: str | None = None  # HH:MM, blank = still open
    category: str | None = None
    note: str | None = None


def _at(day: date, hhmm: str) -> datetime:
    try:
        h, m = hhmm.split(":")[:2]
        return datetime(day.year, day.month, day.day, int(h), int(m))
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Times look like 08:30")


@router.put("/api/attendance/ptwh/record")
async def save_record(payload: RecordIn, user: CurrentUser = Depends(get_current_user)):
    """Add or correct one day (a forgotten clock-in, a missed clock-out). Corrections are stamped with who made them."""
    w = await _worker(payload.worker_id)
    _require_editor(user, w[4])
    day = _parse_date(payload.work_date, _now().date())
    if day > _now().date():
        raise HTTPException(status_code=422, detail="That day hasn't happened yet")
    category = _check_category(payload.category) or w[8]
    cin = _at(day, payload.clock_in)
    cout = _at(day, payload.clock_out) if payload.clock_out else None
    if cout is not None and cout <= cin:
        raise HTTPException(status_code=422, detail="Clock out has to be after clock in")
    now = _now()
    existing = await db.fetch_one("SELECT id FROM ptwh_attendance WHERE worker_id=%s AND work_date=%s", (w[0], day))
    if existing:
        await db.execute(
            "UPDATE ptwh_attendance SET clock_in=%s, clock_out=%s, category=%s, note=%s, edited_by=%s, edited_at=%s WHERE id=%s",
            (cin, cout, category, (payload.note or "")[:200] or None, user.email, now, existing[0]),
        )
    else:
        await db.execute(
            """INSERT INTO ptwh_attendance (worker_id, work_date, clock_in, clock_out, category, source, note, recorded_by, created_at)
               VALUES (%s, %s, %s, %s, %s, 'station', %s, %s, %s)""",
            (w[0], day, cin, cout, category, (payload.note or "")[:200] or None, user.email, now),
        )
    return {"ok": True}


@router.delete("/api/attendance/ptwh/record/{record_id}")
async def delete_record(record_id: int, user: CurrentUser = Depends(get_current_user)):
    row = await db.fetch_one("SELECT worker_id FROM ptwh_attendance WHERE id=%s", (record_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="Record not found")
    _require_editor(user, (await _worker(row[0]))[4])
    await db.execute("DELETE FROM ptwh_attendance WHERE id=%s", (record_id,))
    return {"ok": True}


@router.get("/api/attendance/ptwh/month")
async def month_view(month: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """The old sheet's grid: a row per PTWH, a column per day (hours worked), workdays and payable for the month, and the same split by category."""
    today = _now().date()
    try:
        y, m = (int(x) for x in (month or today.strftime("%Y-%m")).split("-"))
        first = date(y, m, 1)
    except ValueError:
        raise HTTPException(status_code=422, detail="Months look like 2026-10")
    nxt = date(y + (m == 12), 1 if m == 12 else m + 1, 1)
    stations = _visible_stations(user)
    workers = [r for r in await db.fetch_all(f"SELECT {_WORKER_COLS} FROM ptwh_workers ORDER BY station, full_name") if r[4] in stations]
    recs: dict[int, dict[int, tuple]] = {}
    for r in await db.fetch_all(
        "SELECT worker_id, work_date, clock_in, clock_out, category FROM ptwh_attendance WHERE work_date >= %s AND work_date < %s", (first, nxt)
    ):
        recs.setdefault(r[0], {})[r[1].day] = r[2:]
    out = []
    for w in workers:
        days, workdays, payable, open_days, by_cat = {}, 0.0, 0.0, 0, {}
        for d, (cin, cout, cat) in recs.get(w[0], {}).items():
            wd, pay = day_pay(float(w[5]), cin, cout)
            workdays += wd
            payable += pay
            if cout is None:
                open_days += 1
            cat = cat or w[8] or "NA"  # NA = no category set anywhere for this day
            c = by_cat.setdefault(cat, {"days": 0.0, "payable": 0.0})
            c["days"] += wd
            c["payable"] = round(c["payable"] + pay, 2)
            days[d] = {"in": cin.strftime("%H:%M"), "out": cout.strftime("%H:%M") if cout else None,
                       "hours": round(_hours(cin, cout), 1) if cout else None, "workday": wd, "pay": pay, "category": cat if cat != "NA" else None}
        if not days and not w[7]:
            continue  # an inactive worker with nothing this month is just clutter
        out.append({**_worker_json(w, False), "days": days, "workdays": workdays, "payable": round(payable, 2), "open_days": open_days, "by_category": by_cat})
    return {
        "month": first.strftime("%Y-%m"), "days_in_month": (nxt - first).days, "workers": out, "categories": CATEGORIES,
        "rule": {"half_day_hours": HALF_DAY_HOURS, "half_day_factor": HALF_DAY_FACTOR},
    }
