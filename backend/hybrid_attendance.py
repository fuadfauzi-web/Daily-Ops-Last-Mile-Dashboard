"""Attendance -> Hybrid (2026-10-04, staging): MANUAL for now.

Until Hybrid drivers can sign in (they will use the same login as the driver app, later), station staff key in
  * (the drivers themselves come from Metabase -- see hybrid_roster.py; a Manager can still add one by hand; the Schedule's Hybrid roster reads this list);
  * each day's attendance: Present / Absent / Leave, with optional clock in / out times and a note -- Attendance -> Hybrid -> Today / Month sheet.
Who may key: station / region staff, Managers and the Superadmin, for the stations they can see (and only stations that have reached their launch date). Everyone
else with the station in scope can read. Every row says who keyed it and who last edited it. This does NOT replace the Hybrid productivity KPI, which still reads its
own Metabase file.
"""
import logging
import re
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import attendance
import db
import hybrid_roster
from attendance import _can_edit, _hours, _iso, _now, _require_editor, _visible_stations, _zone_region
from auth import CurrentUser, get_current_user

log = logging.getLogger("hybrid_attendance")
router = APIRouter()

STATUSES = ("present", "absent", "leave")
WINDOW_DAYS = 35  # a day can be keyed / changed up to five weeks back, never in the future
_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_COLS = "id, station, name, driver_id, phone, vehicle_type, NULL AS plate_unused, joined_date, end_date, active, notes, created_by, created_at"


def _d(v) -> str | None:
    return str(v)[:10] if v else None


def _driver_json(r) -> dict:
    zone, region = _zone_region(r[1])
    return {"id": r[0], "station": r[1], "zone": zone, "region": region, "name": r[2], "driver_id": r[3], "phone": r[4], "vehicle_type": r[5],
            "joined_date": _d(r[7]), "end_date": _d(r[8]), "active": bool(r[9]), "notes": r[10], "created_by": r[11]}


def _clean(s: str | None, n: int) -> str | None:
    s = " ".join((s or "").split())[:n]
    return s or None


def _date(raw: str | None, field: str = "date") -> date | None:
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"The {field} should look like 2026-10-05")


# ---------------------------------------------------------------- drivers

def _can_manage_drivers(user: CurrentUser) -> bool:
    """The driver LIST comes from Metabase; only a Manager / HOD / Superadmin may add or fix a driver by hand (someone Metabase doesn't have yet)."""
    return user.role in ("admin", "manager")


def _require_manage_drivers(user: CurrentUser) -> None:
    if not _can_manage_drivers(user):
        raise HTTPException(status_code=403, detail="The Hybrid driver list comes from Metabase. If a driver is wrong or missing, update their employment end date in Ninja Van Operator -> Driver Strength; the list refreshes every morning.")


@router.get("/api/attendance/hybrid/drivers")
async def list_drivers(user: CurrentUser = Depends(get_current_user)):
    stations = _visible_stations(user)
    rows = await db.fetch_all(f"SELECT {_COLS} FROM hybrid_drivers ORDER BY station, name")
    return {"drivers": [_driver_json(r) for r in rows if r[1] in stations], "stations": sorted(stations), "can_edit": _can_edit(user), "can_manage": _can_manage_drivers(user), "source": hybrid_roster.status()}


@router.post("/api/attendance/hybrid/drivers/refresh")
async def refresh_drivers(user: CurrentUser = Depends(get_current_user)):
    """Pull the Active Driver Details question from Metabase now (it also runs every morning at 06:30)."""
    _require_manage_drivers(user)
    try:
        return {"ok": True, "result": await hybrid_roster.refresh(source=user.email)}
    except Exception as exc:  # noqa: BLE001
        hybrid_roster._state["error"] = str(exc)[:300]
        raise HTTPException(status_code=502, detail=str(exc)[:300])


class DriverIn(BaseModel):
    station: str
    name: str
    driver_id: str | None = None
    phone: str | None = None
    vehicle_type: str | None = None
    joined_date: str | None = None
    end_date: str | None = None
    notes: str | None = None


@router.post("/api/attendance/hybrid/drivers")
async def add_driver(p: DriverIn, user: CurrentUser = Depends(get_current_user)):
    _require_manage_drivers(user)
    _require_editor(user, p.station)
    name = _clean(p.name, 150)
    if not name or len(name) < 2:
        raise HTTPException(status_code=422, detail="Type the driver's name")
    if await db.fetch_one("SELECT id FROM hybrid_drivers WHERE station = %s AND name = %s", (p.station, name)):
        raise HTTPException(status_code=409, detail="A driver with that name is already at this station")
    joined, end = _date(p.joined_date, "joined date"), _date(p.end_date, "end date")
    if joined and end and end < joined:
        raise HTTPException(status_code=422, detail="The end date is before the joined date")
    now = _now()
    new_id = await db.execute(
        "INSERT INTO hybrid_drivers (station, name, driver_id, phone, vehicle_type, joined_date, end_date, active, notes, created_by, created_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (p.station, name, _clean(p.driver_id, 60), _clean(p.phone, 30), _clean(p.vehicle_type, 40), joined, end, 0 if (end and end < now.date()) else 1, _clean(p.notes, 300), user.email, now),
    )
    return {"ok": True, "id": new_id}


class DriverPatch(BaseModel):
    name: str | None = None
    driver_id: str | None = None
    phone: str | None = None
    vehicle_type: str | None = None
    joined_date: str | None = None
    end_date: str | None = None
    active: bool | None = None
    notes: str | None = None


@router.patch("/api/attendance/hybrid/drivers/{driver_id}")
async def edit_driver(driver_id: int, p: DriverPatch, user: CurrentUser = Depends(get_current_user)):
    """Edit a driver's details. Only the fields sent change ("" clears one). A name change follows the driver onto the Schedule. Ending or switching a driver off keeps their history."""
    _require_manage_drivers(user)
    r = await db.fetch_one(f"SELECT {_COLS} FROM hybrid_drivers WHERE id = %s", (driver_id,))
    if r is None:
        raise HTTPException(status_code=404, detail="Driver not found")
    _require_editor(user, r[1])
    sent = p.model_dump(exclude_unset=True)
    name, active = r[2], bool(r[9])
    if "name" in sent:
        name = _clean(p.name, 150)
        if not name or len(name) < 2:
            raise HTTPException(status_code=422, detail="Type the driver's name")
        if name != r[2] and await db.fetch_one("SELECT id FROM hybrid_drivers WHERE station = %s AND name = %s", (r[1], name)):
            raise HTTPException(status_code=409, detail="A driver with that name is already at this station")
    joined = _date(p.joined_date, "joined date") if "joined_date" in sent else r[7]
    end = _date(p.end_date, "end date") if "end_date" in sent else r[8]
    if joined and end and str(end)[:10] < str(joined)[:10]:
        raise HTTPException(status_code=422, detail="The end date is before the joined date")
    if "active" in sent:
        active = bool(p.active)
    if end and str(end)[:10] < str(_now().date()):
        active = False  # an end date in the past switches them off
    vals = {k: (_clean(getattr(p, k), n) if k in sent else r[i]) for k, n, i in (("driver_id", 60, 3), ("phone", 30, 4), ("vehicle_type", 40, 5), ("notes", 300, 10))}
    await db.execute(
        "UPDATE hybrid_drivers SET name=%s, driver_id=%s, phone=%s, vehicle_type=%s, joined_date=%s, end_date=%s, active=%s, notes=%s, updated_at=%s WHERE id=%s",
        (name, vals["driver_id"], vals["phone"], vals["vehicle_type"], joined, end, 1 if active else 0, vals["notes"], _now(), driver_id),
    )
    if name != r[2]:  # the Schedule refers to a Hybrid driver by name
        await db.execute("UPDATE schedule_entries SET person_ref = %s WHERE station = %s AND person_type = 'hybrid' AND person_ref = %s", (name, r[1], r[2]))
    if not active and bool(r[9]):
        await db.execute("DELETE FROM schedule_entries WHERE station = %s AND person_type = 'hybrid' AND person_ref = %s AND work_date >= %s", (r[1], name, _now().date()))
    return {"ok": True}


# ---------------------------------------------------------------- attendance (keyed by station staff)

class RecordIn(BaseModel):
    driver_id: int
    work_date: str
    status: str  # present | absent | leave
    clock_in: str | None = None  # HH:MM
    clock_out: str | None = None
    note: str | None = None


async def _driver_for_edit(driver_id: int, user: CurrentUser):
    r = await db.fetch_one(f"SELECT {_COLS} FROM hybrid_drivers WHERE id = %s", (driver_id,))
    if r is None:
        raise HTTPException(status_code=404, detail="Driver not found")
    _require_editor(user, r[1])
    return r


def _check_day(day: date) -> None:
    today = _now().date()
    if day > today:
        raise HTTPException(status_code=422, detail="That day hasn't happened yet")
    if day < today - timedelta(days=WINDOW_DAYS):
        raise HTTPException(status_code=422, detail=f"Only the last {WINDOW_DAYS} days can be keyed in or changed")


@router.put("/api/attendance/hybrid/record")
async def save_record(p: RecordIn, user: CurrentUser = Depends(get_current_user)):
    """Key in (or change) one driver's day: Present / Absent / Leave, with optional clock in / out. Replaces what was there; who did it is kept."""
    r = await _driver_for_edit(p.driver_id, user)
    day = _date(p.work_date, "day")
    if day is None:
        raise HTTPException(status_code=422, detail="Pick the day")
    _check_day(day)
    if p.status not in STATUSES:
        raise HTTPException(status_code=422, detail="Status is present, absent or leave")
    if r[7] and day < date.fromisoformat(str(r[7])[:10]):
        raise HTTPException(status_code=422, detail="That day is before the driver joined")
    cin = cout = None
    if p.status == "present" and (p.clock_in or p.clock_out):
        if not p.clock_in or not _HHMM.match(p.clock_in) or (p.clock_out and not _HHMM.match(p.clock_out)):
            raise HTTPException(status_code=422, detail="Times look like 08:30 (a clock-in is needed with a clock-out)")
        cin = datetime.combine(day, datetime.strptime(p.clock_in, "%H:%M").time())
        if p.clock_out:
            cout = datetime.combine(day, datetime.strptime(p.clock_out, "%H:%M").time())
            if cout <= cin:
                cout += timedelta(days=1)
            if (cout - cin).total_seconds() / 3600 > 16:
                raise HTTPException(status_code=422, detail="That is longer than 16 hours -- check the times")
            if cout > _now():
                raise HTTPException(status_code=422, detail="The clock-out can't be in the future")
    note = _clean(p.note, 300)
    now = _now()
    existing = await db.fetch_one("SELECT id FROM hybrid_attendance WHERE driver_id = %s AND work_date = %s", (p.driver_id, day))
    if existing:
        await db.execute("UPDATE hybrid_attendance SET status=%s, clock_in=%s, clock_out=%s, note=%s, edited_by=%s, edited_at=%s WHERE id=%s", (p.status, cin, cout, note, user.email, now, existing[0]))
    else:
        await db.execute("INSERT INTO hybrid_attendance (driver_id, work_date, status, clock_in, clock_out, note, recorded_by, recorded_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                         (p.driver_id, day, p.status, cin, cout, note, user.email, now))
    return {"ok": True}


@router.delete("/api/attendance/hybrid/record")
async def clear_record(driver_id: int, work_date: str, user: CurrentUser = Depends(get_current_user)):
    """Take a day's entry off (keyed on the wrong driver or day)."""
    await _driver_for_edit(driver_id, user)
    day = _date(work_date, "day")
    if day is None:
        raise HTTPException(status_code=422, detail="Pick the day")
    _check_day(day)
    await db.execute("DELETE FROM hybrid_attendance WHERE driver_id = %s AND work_date = %s", (driver_id, day))
    return {"ok": True}


def _rec_json(r) -> dict:
    h = _hours(r[3], r[4])
    return {"status": r[2], "clock_in": _iso(r[3]), "clock_out": _iso(r[4]), "hours": None if h is None else round(h, 2), "note": r[5], "recorded_by": r[6], "edited_by": r[7]}


@router.get("/api/attendance/hybrid/day")
async def day_view(date_: str | None = Query(default=None, alias="date"), user: CurrentUser = Depends(get_current_user)):
    """Every Hybrid driver at the caller's stations who is on the list that day, with what was keyed in (nothing yet = no entry)."""
    today = _now().date()
    d = _date(date_, "day") or today
    stations = _visible_stations(user)
    drivers = [r for r in await db.fetch_all(f"SELECT {_COLS} FROM hybrid_drivers ORDER BY station, name") if r[1] in stations]
    recs = {r[0]: r for r in await db.fetch_all("SELECT driver_id, work_date, status, clock_in, clock_out, note, recorded_by, edited_by FROM hybrid_attendance WHERE work_date = %s", (d,))}
    shifts = {r[0]: r[1] for r in await db.fetch_all("SELECT person_ref, shift FROM schedule_entries WHERE person_type = 'hybrid' AND work_date = %s", (d,))}
    rows = []
    for r in drivers:
        joined, end = _d(r[7]), _d(r[8])
        on_list = bool(r[9]) or r[0] in recs
        if not on_list or (joined and str(d) < joined) or (end and str(d) > end and r[0] not in recs):
            continue
        rec = recs.get(r[0])
        rows.append({**_driver_json(r), "scheduled": shifts.get(r[2]), "record": _rec_json((r[0], d, *rec[2:])) if rec else None})
    return {"date": str(d), "rows": rows, "stations": sorted(stations), "can_edit": _can_edit(user), "window_days": WINDOW_DAYS}


@router.get("/api/attendance/hybrid/month")
async def month_view(month: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """The month grid: a row per Hybrid driver with Present / Absent / Leave per day and the totals."""
    today = _now().date()
    try:
        y, m = (int(x) for x in month.split("-")) if month else (today.year, today.month)
        lo = date(y, m, 1)
    except ValueError:
        raise HTTPException(status_code=422, detail="Months look like 2026-10")
    hi = date(y + (m == 12), 1 if m == 12 else m + 1, 1)
    stations = _visible_stations(user)
    drivers = [r for r in await db.fetch_all(f"SELECT {_COLS} FROM hybrid_drivers ORDER BY station, name") if r[1] in stations]
    by: dict[int, dict[int, dict]] = {}
    for r in await db.fetch_all("SELECT driver_id, work_date, status, clock_in, clock_out FROM hybrid_attendance WHERE work_date >= %s AND work_date < %s", (lo, hi)):
        wd = r[1] if hasattr(r[1], "day") else date.fromisoformat(str(r[1])[:10])
        h = _hours(r[3], r[4])
        by.setdefault(r[0], {})[wd.day] = {"status": r[2], "in": r[3].strftime("%H:%M") if r[3] else None, "out": r[4].strftime("%H:%M") if r[4] else None, "hours": None if h is None else round(h, 2)}
    rows = []
    for r in drivers:
        days = by.get(r[0], {})
        if not r[9] and not days:
            continue
        rows.append({**_driver_json(r), "days": days, **{s: sum(1 for v in days.values() if v["status"] == s) for s in STATUSES}})
    return {"month": f"{lo.year:04d}-{lo.month:02d}", "days_in_month": (hi - lo).days, "rows": rows, "can_edit": _can_edit(user)}


# ---------------------------------------------------------------- housekeeping (the app's hourly loop)

KEEP_AFTER_END_DAYS = 31  # an ended driver's data is kept for a month, then removed for good


async def housekeeping_drivers() -> None:
    """Drivers past their end date are switched off (hidden from Today / the Schedule, history kept); one month after the end date the driver, their attendance and any
    scheduled days are removed for good. Never raises."""
    try:
        today = _now().date()
        n_off = await db.execute_rowcount("UPDATE hybrid_drivers SET active = 0, updated_at = %s WHERE active = 1 AND end_date IS NOT NULL AND end_date < %s", (_now(), today))
        old = await db.fetch_all("SELECT id, station, name FROM hybrid_drivers WHERE end_date IS NOT NULL AND end_date < %s", (today - timedelta(days=KEEP_AFTER_END_DAYS),))
        for did, station, name in old:
            await db.execute("DELETE FROM hybrid_attendance WHERE driver_id = %s", (did,))
            await db.execute("DELETE FROM schedule_entries WHERE station = %s AND person_type = 'hybrid' AND person_ref = %s", (station, name))
            await db.execute("DELETE FROM hybrid_drivers WHERE id = %s", (did,))
        if n_off or old:
            log.info("Hybrid housekeeping: %d switched off, %d removed", n_off, len(old))
    except Exception:  # noqa: BLE001 -- housekeeping must never take the loop down
        log.exception("Hybrid housekeeping failed")
