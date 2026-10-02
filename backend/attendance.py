"""Attendance (2026-10-02, staging): one place for all attendance -- PTWH first, Staff and Hybrid later.

PTWH (part-time warehouse) used to be a Google Sheet the station staff typed by hand: one amount per person per day, then payable.
Here a day is a CLOCK IN and a CLOCK OUT time and the pay is worked out from the hours:
  * hours >= HALF_DAY_HOURS      -> a full day, paid at the worker's daily rate
  * 0 < hours < HALF_DAY_HOURS   -> a half day, paid at HALF_DAY_FACTOR x the rate   (same rule as the PTWH Monitoring template's Setup tab)
  * clocked in but not out yet   -> "open": pays nothing until someone closes it (missed clock-outs are visible, not guessed)
Today station staff clock people in / out for them (source 'station'); the plan is for each PTWH to clock themselves in the PTWH app
with their own login (source 'app'). The tables and the clock endpoints are shaped for that: the app only has to call the same
clock-in / clock-out with the worker it belongs to.

Who sees / does what: everyone sees the stations in their scope; station + region staff, Managers / HOD and the Superadmin may add
workers and record or correct clock times for the stations in their scope; HQ staff (Fleet Admin, OPEX ...) view only.
"""
import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
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
# The justifications the sheet's dropdown offered; a free "Other" keeps it from blocking anyone.
REASONS = [
    "Insufficient Manpower (staff on leave)",
    "Insufficient Manpower (Short of staff)",
    "Training for FA or SH",
    "Push Off Support",
    "Other",
]


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
        "daily_rate": float(r[5]), "joined_date": str(r[6]) if r[6] else None, "active": bool(r[7]),
    }


_WORKER_COLS = "id, full_name, ic_no, phone, station, daily_rate, joined_date, active"


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


def _validate_worker(p: WorkerIn) -> None:
    if not p.name.strip():
        raise HTTPException(status_code=422, detail="Type the worker's name")
    if p.station not in _station_names():
        raise HTTPException(status_code=422, detail="Pick a station from the list")
    if not (0 < p.daily_rate <= 500):
        raise HTTPException(status_code=422, detail="Daily rate should be between RM1 and RM500")


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
    }


@router.post("/api/attendance/ptwh/workers")
async def add_worker(payload: WorkerIn, user: CurrentUser = Depends(get_current_user)):
    _validate_worker(payload)
    _require_editor(user, payload.station)
    joined = _parse_date(payload.joined_date, _now().date()) if payload.joined_date else None
    await db.execute(
        """INSERT INTO ptwh_workers (full_name, ic_no, phone, station, daily_rate, joined_date, active, created_by, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s)""",
        (payload.name.strip().upper(), (payload.ic_no or "").strip() or None, (payload.phone or "").strip() or None,
         payload.station, payload.daily_rate, joined, user.email, _now()),
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
        """UPDATE ptwh_workers SET full_name=%s, ic_no=%s, phone=%s, station=%s, daily_rate=%s, joined_date=%s, active=%s, updated_at=%s
           WHERE id=%s""",
        (payload.name.strip().upper(), new_ic, (payload.phone or "").strip() or None, payload.station, payload.daily_rate,
         joined, 1 if payload.active else 0, _now(), worker_id),
    )
    return {"ok": True}


def _record_json(r) -> dict:
    """r: id, clock_in, clock_out, reason, source, note"""
    return {
        "id": r[0], "clock_in": _iso(r[1]), "clock_out": _iso(r[2]), "hours": (round(_hours(r[1], r[2]), 2) if _hours(r[1], r[2]) is not None else None),
        "reason": r[3], "source": r[4], "note": r[5],
    }


@router.get("/api/attendance/ptwh/day")
async def day_view(date_: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """Every active PTWH in scope with that day's clock times (today by default)."""
    day = _parse_date(date_, _now().date())
    stations = _visible_stations(user)
    workers = [r for r in await db.fetch_all(f"SELECT {_WORKER_COLS} FROM ptwh_workers WHERE active = 1 ORDER BY station, full_name") if r[4] in stations]
    recs = {
        r[0]: r[1:]
        for r in await db.fetch_all(
            "SELECT worker_id, id, clock_in, clock_out, reason, source, note FROM ptwh_attendance WHERE work_date = %s", (day,)
        )
    }
    # Last reason each person used, so the clock-in box is pre-filled the way the sheet's justification column carried over.
    last = {r[0]: r[1] for r in await db.fetch_all(
        "SELECT worker_id, reason FROM ptwh_attendance WHERE reason IS NOT NULL AND work_date < %s ORDER BY work_date", (day,))}
    rows = []
    for w in workers:
        rec = recs.get(w[0])
        rows.append({**_worker_json(w, False), "record": _record_json(rec) if rec else None, "last_reason": last.get(w[0])})
    return {
        "date": str(day), "today": str(_now().date()), "rows": rows, "reasons": REASONS, "can_edit": _can_edit(user),
        "rule": {"half_day_hours": HALF_DAY_HOURS, "half_day_factor": HALF_DAY_FACTOR},
    }


class ClockIn(BaseModel):
    worker_id: int
    reason: str | None = None


class ClockOut(BaseModel):
    worker_id: int


@router.post("/api/attendance/ptwh/clock-in")
async def clock_in(payload: ClockIn, user: CurrentUser = Depends(get_current_user)):
    w = await _worker(payload.worker_id)
    _require_editor(user, w[4])
    if not w[7]:
        raise HTTPException(status_code=409, detail="This worker is inactive")
    now = _now()
    if await db.fetch_one("SELECT id FROM ptwh_attendance WHERE worker_id=%s AND work_date=%s", (w[0], now.date())):
        raise HTTPException(status_code=409, detail="Already clocked in today")
    await db.execute(
        """INSERT INTO ptwh_attendance (worker_id, work_date, clock_in, reason, source, recorded_by, created_at)
           VALUES (%s, %s, %s, %s, 'station', %s, %s)""",
        (w[0], now.date(), now, payload.reason, user.email, now),
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
    reason: str | None = None
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
    cin = _at(day, payload.clock_in)
    cout = _at(day, payload.clock_out) if payload.clock_out else None
    if cout is not None and cout <= cin:
        raise HTTPException(status_code=422, detail="Clock out has to be after clock in")
    now = _now()
    existing = await db.fetch_one("SELECT id FROM ptwh_attendance WHERE worker_id=%s AND work_date=%s", (w[0], day))
    if existing:
        await db.execute(
            "UPDATE ptwh_attendance SET clock_in=%s, clock_out=%s, reason=%s, note=%s, edited_by=%s, edited_at=%s WHERE id=%s",
            (cin, cout, payload.reason, (payload.note or "")[:200] or None, user.email, now, existing[0]),
        )
    else:
        await db.execute(
            """INSERT INTO ptwh_attendance (worker_id, work_date, clock_in, clock_out, reason, source, note, recorded_by, created_at)
               VALUES (%s, %s, %s, %s, %s, 'station', %s, %s, %s)""",
            (w[0], day, cin, cout, payload.reason, (payload.note or "")[:200] or None, user.email, now),
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
    """The old sheet's grid: a row per PTWH, a column per day (hours worked), workdays and payable for the month."""
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
        "SELECT worker_id, work_date, clock_in, clock_out, reason FROM ptwh_attendance WHERE work_date >= %s AND work_date < %s", (first, nxt)
    ):
        recs.setdefault(r[0], {})[r[1].day] = r[2:]
    out = []
    for w in workers:
        days, workdays, payable, open_days = {}, 0.0, 0.0, 0
        for d, (cin, cout, reason) in recs.get(w[0], {}).items():
            wd, pay = day_pay(float(w[5]), cin, cout)
            workdays += wd
            payable += pay
            if cout is None:
                open_days += 1
            days[d] = {"in": cin.strftime("%H:%M"), "out": cout.strftime("%H:%M") if cout else None,
                       "hours": round(_hours(cin, cout), 1) if cout else None, "workday": wd, "pay": pay, "reason": reason}
        if not days and not w[7]:
            continue  # an inactive worker with nothing this month is just clutter
        out.append({**_worker_json(w, False), "days": days, "workdays": workdays, "payable": round(payable, 2), "open_days": open_days})
    return {
        "month": first.strftime("%Y-%m"), "days_in_month": (nxt - first).days, "workers": out,
        "rule": {"half_day_hours": HALF_DAY_HOURS, "half_day_factor": HALF_DAY_FACTOR},
    }
