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
import hybrid_app
import hybrid_roster
from attendance import _can_edit, _hours, _iso, _now, _require_editor, _visible_stations, _zone_region
from auth import CurrentUser, get_current_user

log = logging.getLogger("hybrid_attendance")
router = APIRouter()

STATUSES = ("present", "absent", "leave")
WINDOW_DAYS = 35  # a day can be keyed / changed up to five weeks back, never in the future
_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_COLS = "id, station, name, driver_id, phone, vehicle_type, NULL AS plate_unused, joined_date, end_date, active, notes, created_by, created_at, email"


def _d(v) -> str | None:
    return str(v)[:10] if v else None


def _driver_json(r) -> dict:
    zone, region = _zone_region(r[1])
    return {"id": r[0], "station": r[1], "zone": zone, "region": region, "name": r[2], "driver_id": r[3], "phone": r[4], "vehicle_type": r[5],
            "joined_date": _d(r[7]), "end_date": _d(r[8]), "active": bool(r[9]), "notes": r[10], "created_by": r[11], "email": r[13] if len(r) > 13 else None}


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
    email: str | None = None
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
        "INSERT INTO hybrid_drivers (station, name, email, driver_id, phone, vehicle_type, joined_date, end_date, active, notes, created_by, created_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (p.station, name, attendance.clean_email(p.email), _clean(p.driver_id, 60), _clean(p.phone, 30), _clean(p.vehicle_type, 40), joined, end, 0 if (end and end < now.date()) else 1, _clean(p.notes, 300), user.email, now),
    )
    return {"ok": True, "id": new_id}


class DriverPatch(BaseModel):
    email: str | None = None
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
    sent = p.model_dump(exclude_unset=True)
    if set(sent) - {"email", "phone"}:  # the list itself comes from Metabase: a station may only add the driver's email (for the app whitelist) and phone
        _require_manage_drivers(user)
    r = await db.fetch_one(f"SELECT {_COLS} FROM hybrid_drivers WHERE id = %s", (driver_id,))
    if r is None:
        raise HTTPException(status_code=404, detail="Driver not found")
    _require_editor(user, r[1])
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
    email = attendance.clean_email(p.email) if "email" in sent else r[13]
    await db.execute(
        "UPDATE hybrid_drivers SET name=%s, email=%s, driver_id=%s, phone=%s, vehicle_type=%s, joined_date=%s, end_date=%s, active=%s, notes=%s, updated_at=%s WHERE id=%s",
        (name, email, vals["driver_id"], vals["phone"], vals["vehicle_type"], joined, end, 1 if active else 0, vals["notes"], _now(), driver_id),
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
    if p.status == "leave" and len(_clean(p.note, 300) or "") < 3:
        raise HTTPException(status_code=422, detail="Leave needs its proof in the note (e.g. MC number, who approved it)")
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
    out = {"status": r[2], "clock_in": _iso(r[3]), "clock_out": _iso(r[4]), "hours": None if h is None else round(h, 2), "note": r[5], "recorded_by": r[6], "edited_by": r[7]}
    if len(r) > 10:  # clocked in the Ninjavan Shift app: how far from the station, and whether the selfie is still kept
        out.update({"id": r[8], "source": r[9], "has_photo": bool(r[10]), "in_dist": r[11] if len(r) > 11 else None})
    return out


@router.get("/api/attendance/hybrid/day")
async def day_view(date_: str | None = Query(default=None, alias="date"), user: CurrentUser = Depends(get_current_user)):
    """Every Hybrid driver at the caller's stations who is on the list that day, with what was keyed in (nothing yet = no entry)."""
    today = _now().date()
    d = _date(date_, "day") or today
    stations = _visible_stations(user)
    drivers = [r for r in await db.fetch_all(f"SELECT {_COLS} FROM hybrid_drivers ORDER BY station, name") if r[1] in stations]
    recs = {r[0]: r for r in await db.fetch_all("SELECT driver_id, work_date, status, clock_in, clock_out, note, recorded_by, edited_by, id, source, in_selfie, in_dist FROM hybrid_attendance WHERE work_date = %s", (d,))}
    shifts = {r[0]: r[1] for r in await db.fetch_all("SELECT person_ref, shift FROM schedule_entries WHERE person_type = 'hybrid' AND work_date = %s", (d,))}
    routed = routed_names() if d == today else None  # the route monitoring data is today's
    rows = []
    for r in drivers:
        joined, end = _d(r[7]), _d(r[8])
        on_list = bool(r[9]) or r[0] in recs
        if not on_list or (joined and str(d) < joined) or (end and str(d) > end and r[0] not in recs):
            continue
        rec = recs.get(r[0])
        rows.append({**_driver_json(r), "scheduled": shifts.get(r[2]), "has_route": (None if routed is None else _norm(r[2]) in routed[0]), "record": _rec_json((r[0], d, *rec[2:])) if rec else None})
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
            await db.execute("DELETE FROM hybrid_credentials WHERE driver_id = %s", (did,))
            await db.execute("DELETE FROM schedule_entries WHERE station = %s AND person_type = 'hybrid' AND person_ref = %s", (station, name))
            await db.execute("DELETE FROM hybrid_drivers WHERE id = %s", (did,))
        if n_off or old:
            log.info("Hybrid housekeeping: %d switched off, %d removed", n_off, len(old))
        await hybrid_app.purge_selfies()  # clock-in selfies are kept 14 days
    except Exception:  # noqa: BLE001 -- housekeeping must never take the loop down
        log.exception("Hybrid housekeeping failed")


# ---------------------------------------------------------------- flags: attendance that does not match the route data (route monitoring)
# A Hybrid driver's day is cross-checked against the route monitoring data (the routes the dashboard already reads every refresh -- a route under the driver's name means they are
# delivering today). After ROUTE_CHECK_HOUR (14:00, Malaysia time) a driver SCHEDULED to work who has no route today is flagged -- whether or not they clocked in ("clocked in but no route" /
# "not clocked in and no route"). Also: scheduled with a clock-in time and 30 minutes late with no clock-in; marked Leave but with a route today; Leave without its proof written in the note.
# Region Heads, RFS, HOD, Managers are alerted for the first three kinds and mark each flag handled with a note.

ROUTE_CHECK_HOUR = 14
LATE_MINUTES = 30
ALERT_KINDS = ("not_in", "no_route", "leave_routed")
ALERT_POSITIONS = ("region_head", "rfs", "hod", "manager", "admin")
KIND_LABEL = {"not_in": "Not clocked in", "no_route": "No route", "leave_routed": "On leave but has a route", "leave_no_proof": "Leave without proof"}


def _norm(name: str | None) -> str:
    return " ".join((name or "").split()).upper()


def routed_names() -> tuple[set[str], str | None] | None:
    """(the drivers who have a route in the latest route monitoring refresh, when it was captured), or None while that data isn't there or isn't from today."""
    try:
        import main  # late import: main imports this module

        drivers, captured = list(getattr(main, "_routed_drivers", []) or []), getattr(main, "_routed_drivers_captured_at", None)
    except Exception:  # noqa: BLE001
        return None
    if not drivers or not captured:
        return None
    try:
        if datetime.fromisoformat(str(captured)).date() != _now().date():
            return None
    except ValueError:
        return None
    return {_norm(d.get("driver_name")) for d in drivers}, str(captured)


def _alert_recipient(user: CurrentUser) -> bool:
    return user.position in ALERT_POSITIONS


async def compute_flags(user: CurrentUser) -> tuple[list[dict], dict]:
    """(today's flags for the Hybrid drivers in the caller's scope, info about the data used)."""
    now = _now()
    today = now.date()
    stations = _visible_stations(user)
    drivers = [r for r in await db.fetch_all(f"SELECT {_COLS} FROM hybrid_drivers ORDER BY station, name") if r[1] in stations and r[9]]
    ids = {r[0] for r in drivers}
    recs = {r[0]: r for r in await db.fetch_all("SELECT driver_id, status, clock_in, note FROM hybrid_attendance WHERE work_date = %s", (today,)) if r[0] in ids}
    sched = {(r[0], r[1]): r[2] for r in await db.fetch_all("SELECT station, person_ref, shift FROM schedule_entries WHERE person_type = 'hybrid' AND work_date = %s", (today,))}
    acts = {(r[0], r[1]): r for r in await db.fetch_all("SELECT person_ref, kind, note, acted_by, acted_at FROM attendance_flag_actions WHERE person_type = 'hybrid' AND work_date = %s", (today,))}
    routes = routed_names() if now.hour >= ROUTE_CHECK_HOUR else None
    info = {"route_data": routes is not None, "route_captured_at": routes[1] if routes else None, "route_check_hour": ROUTE_CHECK_HOUR, "late_minutes": LATE_MINUTES,
            "waiting_for_route_check": now.hour < ROUTE_CHECK_HOUR}
    flags = []

    def add(d, kind, detail):
        a = acts.get((str(d[0]), kind))
        zone, region = _zone_region(d[1])
        flags.append({"driver_id": d[0], "name": d[2], "station": d[1], "zone": zone, "region": region, "date": str(today), "kind": kind, "label": KIND_LABEL[kind], "detail": detail,
                      "alert": kind in ALERT_KINDS, "handled": {"note": a[2], "by": a[3], "at": _iso(a[4])} if a else None})

    for d in drivers:
        joined = _d(d[7])
        if joined and joined > str(today):
            continue
        rec = recs.get(d[0])
        v = sched.get((d[1], d[2]))
        working = v == "WK" or bool(v and re.match(r"^\d\d:\d\d$", v))
        status = rec[1] if rec else None
        has_route = (routes is not None and _norm(d[2]) in routes[0])
        if status == "leave":
            if len((rec[3] or "").strip()) < 3:
                add(d, "leave_no_proof", "Marked on leave, but no proof is written in the note.")
            if has_route:
                add(d, "leave_routed", "Marked on leave, but they have a route today.")
            continue
        if working and v != "WK" and status != "present" and now >= datetime.combine(today, datetime.strptime(v, "%H:%M").time()) + timedelta(minutes=LATE_MINUTES):
            add(d, "not_in", f"Scheduled to clock in at {v}; no clock-in {LATE_MINUTES}+ minutes later.")
        if routes is not None and working and not has_route:
            add(d, "no_route", ("Clocked in" + (f" at {rec[2].strftime('%H:%M')}" if rec and rec[2] else " (keyed present)") + ", but there is no route under their name today.")
                if status == "present" else f"Scheduled to work, not clocked in, and no route under their name today (checked after {ROUTE_CHECK_HOUR}:00).")
    flags.sort(key=lambda f: (f["handled"] is not None, not f["alert"], f["station"], f["name"]))
    return flags, info


async def pending_flag_count(user: CurrentUser) -> int:
    """The number in the Attendance alert for Hybrid: today's unhandled flags a Region Head / RFS / HOD / Manager has to act on."""
    if not _alert_recipient(user):
        return 0
    flags, _ = await compute_flags(user)
    return sum(1 for f in flags if f["alert"] and not f["handled"])


@router.get("/api/attendance/hybrid/flags")
async def list_flags(user: CurrentUser = Depends(get_current_user)):
    flags, info = await compute_flags(user)
    return {"flags": flags, "can_act": _alert_recipient(user), **info}


class FlagAction(BaseModel):
    driver_id: int
    kind: str
    note: str


@router.post("/api/attendance/hybrid/flags/action")
async def act_on_flag(p: FlagAction, user: CurrentUser = Depends(get_current_user)):
    """A Region Head / RFS / HOD / Manager marks today's flag as handled, with what was done."""
    if not _alert_recipient(user):
        raise HTTPException(status_code=403, detail="Only a Region Head, RFS, HOD or Manager can handle a flag")
    if p.kind not in KIND_LABEL:
        raise HTTPException(status_code=422, detail="Unknown flag")
    if len(p.note.strip()) < 3:
        raise HTTPException(status_code=422, detail="Write what was done (a few words)")
    d = await db.fetch_one(f"SELECT {_COLS} FROM hybrid_drivers WHERE id = %s", (p.driver_id,))
    if d is None or d[1] not in _visible_stations(user):
        raise HTTPException(status_code=403, detail="That driver is not in your scope")
    today, now = _now().date(), _now()
    existing = await db.fetch_one("SELECT id FROM attendance_flag_actions WHERE person_type = 'hybrid' AND person_ref = %s AND work_date = %s AND kind = %s", (str(p.driver_id), today, p.kind))
    if existing:
        await db.execute("UPDATE attendance_flag_actions SET note = %s, acted_by = %s, acted_at = %s WHERE id = %s", (p.note.strip()[:300], user.email, now, existing[0]))
    else:
        await db.execute("INSERT INTO attendance_flag_actions (person_type, person_ref, work_date, kind, note, acted_by, acted_at) VALUES ('hybrid',%s,%s,%s,%s,%s,%s)", (str(p.driver_id), today, p.kind, p.note.strip()[:300], user.email, now))
    return {"ok": True}
