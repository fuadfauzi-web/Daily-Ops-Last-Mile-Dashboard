"""Attendance -> Staff (2026-10-04, staging): Station Heads and Fleet Assistants clock in and out in the dashboard.

  * WHO: people whose position is Station Head, Fleet Assistant (or the older "Station staff"), posted at a station in the Staff & Org Chart (the user's HOME station).
    Their identity is the Ninja Van Google account they are already signed in with -- no separate login, no selfie.
  * PROOF OF PRESENCE: the phone's location within 100 m of the station's Fleet Admin Premises latitude / longitude, the same rule PTWH use. Location only for now; a QR
    fallback issued by the Region Head is NOT built yet -- a person whose location won't work tells their Region Head, who can fix the time (below).
  * The time is the server's (Malaysia time). One record per person per day; clock-out once. Someone who clocks in on a night shift can clock out the next morning.
  * FIXES: a forgotten clock-out or a wrong time is fixed by a Region Head / RFS / HOD / Manager (or the Superadmin) with a reason, max 12 h; the original times are kept.
    Nobody fixes their own time (except the Superadmin). There is no delete.
  * No pay: Staff attendance is hours and days only. The Schedule tab's staff shift for the day is shown next to the clock.
"""
import logging
import re
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import attendance
import attendance_launch
import db
import staff
from attendance import _hours, _iso, _now, _visible_stations, _zone_region
from auth import CurrentUser, get_current_user, parse_scope_values
from ptwh_app import MAX_GPS_ACCURACY_M, RADIUS_M, _station_geo, distance_m
from work_schedule import SHIFTS, STAFF_POSITIONS, break_text, hours_text, station_times

log = logging.getLogger("staff_attendance")
router = APIRouter()

FIX_POSITIONS = ("region_head", "rfs", "hod", "manager", "admin")
MAX_SHIFT_HOURS = 12
NIGHT_GRACE_HOURS = 16  # an open record from yesterday can still be clocked out within this many hours of its clock-in
_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

_COLS = "id, email, name, position, station, work_date, clock_in, clock_out, in_dist, out_dist, edited_by, edited_at, edit_reason, orig_in, orig_out"


def _hm(dt: datetime | None) -> str | None:
    return dt.strftime("%H:%M") if dt else None


def _home_stations(user: CurrentUser) -> list[str]:
    """The station(s) this person is posted at."""
    if user.home_scope_type == "station" and user.home_scope_values:
        return list(user.home_scope_values)
    if user.scope_type == "station":
        return list(user.scope_values)
    return []


def _record_json(r) -> dict:
    return {"id": r[0], "email": r[1], "name": r[2], "station": r[4], "date": str(r[5])[:10], "clock_in": _iso(r[6]), "clock_out": _iso(r[7]),
            "in_dist": r[8], "out_dist": r[9], "hours": None if _hours(r[6], r[7]) is None else round(_hours(r[6], r[7]), 2),
            "edited_by": r[10], "edited_at": _iso(r[11]), "edit_reason": r[12], "orig_in": _iso(r[13]), "orig_out": _iso(r[14])}


async def _shift_today(email: str, day: date) -> dict | None:
    r = await db.fetch_one("SELECT shift, station FROM schedule_entries WHERE person_type = 'staff' AND person_ref = %s AND work_date = %s", (email.lower(), day))
    if not r:
        return None
    times = await station_times(r[1])
    return {"code": r[0], "label": SHIFTS.get(r[0], (r[0], ""))[0], "hours": hours_text(times, r[0]), "break": break_text(times, r[0])}


async def _open_or_today(email: str, today: date, now: datetime):
    """Today's record, or -- for a night shift -- yesterday's if it is still open and recent. (record, is_today)"""
    rec = await db.fetch_one(f"SELECT {_COLS} FROM staff_attendance WHERE email = %s AND work_date = %s", (email, today))
    if rec:
        return rec
    prev = await db.fetch_one(f"SELECT {_COLS} FROM staff_attendance WHERE email = %s AND work_date = %s AND clock_out IS NULL", (email, today - timedelta(days=1)))
    if prev and (now - prev[6]).total_seconds() / 3600 <= NIGHT_GRACE_HOURS:
        return prev
    return None


# ---------------------------------------------------------------- my clock

@router.get("/api/attendance/staff/me")
async def my_clock(user: CurrentUser = Depends(get_current_user)):
    """The signed-in person's own clock: whether they can clock here, their station, today's record and today's scheduled shift."""
    base = {"eligible": False, "reason": None, "radius_m": RADIUS_M, "max_accuracy_m": MAX_GPS_ACCURACY_M}
    if user.is_impersonating:
        return {**base, "reason": "You are viewing as someone else -- clocking is only for your own account."}
    if user.position not in STAFF_POSITIONS:
        return {**base, "reason": "Clocking in here is for Station Heads and Fleet Assistants."}
    stations = _home_stations(user)
    if not stations:
        return {**base, "reason": "You are not posted at a station yet. Ask the Fleet Admin team to set your station in Staff & Org Chart."}
    if not attendance_launch.sees_everything(user):
        stations = [s for s in stations if attendance_launch.station_state(s) != "off"]
        if not stations:
            return {**base, "reason": "Attendance isn't open at your station yet. It opens the day before your station's launch date."}
    now = _now()
    geos = {s: await _station_geo(s) for s in stations}
    rec = await _open_or_today(user.email.lower(), now.date(), now)
    return {**base, "eligible": True, "name": staff.plain_name(user.display_name) or user.email, "stations": stations, "geo_ready": any(geos.values()),
            "missing_geo": [s for s, g in geos.items() if g is None], "now": _iso(now), "record": _record_json(rec) if rec else None,
            "shift": await _shift_today(user.email, now.date())}


class StaffClock(BaseModel):
    action: str  # 'in' | 'out'
    lat: float
    lng: float
    accuracy: float | None = None


@router.post("/api/attendance/staff/clock")
async def clock(p: StaffClock, user: CurrentUser = Depends(get_current_user)):
    """Clock the signed-in person in or out. Needs the phone within 100 m of their station; the server takes the time."""
    if p.action not in ("in", "out"):
        raise HTTPException(status_code=422, detail="action must be in or out")
    me = await my_clock(user)
    if not me["eligible"]:
        raise HTTPException(status_code=403, detail=me["reason"])
    if not -90 <= p.lat <= 90 or not -180 <= p.lng <= 180:
        raise HTTPException(status_code=422, detail="That location doesn't look right")
    if p.accuracy is not None and p.accuracy > MAX_GPS_ACCURACY_M:
        raise HTTPException(status_code=422, detail=f"Your phone's location is only accurate to about {round(p.accuracy)} m -- go outside or turn on precise location, then try again.")
    best: tuple[int, str] | None = None
    for st in me["stations"]:
        geo = await _station_geo(st)
        if geo is None:
            continue
        d = round(distance_m(p.lat, p.lng, geo[0], geo[1]))
        if best is None or d < best[0]:
            best = (d, st)
    if best is None:
        raise HTTPException(status_code=422, detail="Your station's location isn't set up yet. Ask the Fleet Admin team to add its latitude / longitude in Premises.")
    dist, station = best
    if dist > RADIUS_M:
        raise HTTPException(status_code=422, detail=f"You are about {dist} m from {station}. Clock in or out within {RADIUS_M} m of the station.")
    now = _now()
    email = user.email.lower()
    rec = await _open_or_today(email, now.date(), now)
    acc = None if p.accuracy is None else round(p.accuracy)
    if p.action == "in":
        if rec:
            raise HTTPException(status_code=409, detail="You are already clocked in today" if rec[7] is None else "You have already clocked in and out today")
        await db.execute(
            "INSERT INTO staff_attendance (email, name, position, station, work_date, clock_in, in_lat, in_lng, in_acc, in_dist, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (email, staff.plain_name(user.display_name) or email, user.position, station, now.date(), now, p.lat, p.lng, acc, dist, now),
        )
        return {"ok": True, "action": "in", "time": _iso(now), "station": station, "distance_m": dist}
    if rec is None:
        raise HTTPException(status_code=409, detail="You haven't clocked in yet")
    if rec[7] is not None:
        raise HTTPException(status_code=409, detail="You have already clocked out")
    await db.execute("UPDATE staff_attendance SET clock_out = %s, out_lat = %s, out_lng = %s, out_acc = %s, out_dist = %s WHERE id = %s", (now, p.lat, p.lng, acc, dist, rec[0]))
    return {"ok": True, "action": "out", "time": _iso(now), "station": station, "distance_m": dist}


# ---------------------------------------------------------------- the team: today and the month

async def _people(user: CurrentUser) -> list[dict]:
    """Staff (Station Heads / Fleet Assistants) posted at the stations in the caller's scope."""
    visible = _visible_stations(user)
    out = []
    for r in await db.fetch_all("SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name FROM users"):
        if r[1] not in STAFF_POSITIONS:
            continue
        home_type, home_values = staff._home_of(r)
        if home_type != "station" or not home_values:
            continue
        st = next((s for s in home_values if s in visible), None)
        if st is None:
            continue
        zone, region = _zone_region(st)
        out.append({"email": r[0].lower(), "name": staff.plain_name(r[6]) or r[0], "position": r[1], "station": st, "zone": zone, "region": region})
    return sorted(out, key=lambda x: (x["station"], x["name"].lower()))


def _can_fix(user: CurrentUser) -> bool:
    return user.position in FIX_POSITIONS


@router.get("/api/attendance/staff/day")
async def day(date_: str | None = Query(default=None, alias="date"), user: CurrentUser = Depends(get_current_user)):
    """Who in the caller's scope has clocked in on a day (today by default), with the scheduled shift."""
    today = _now().date()
    try:
        d = date.fromisoformat(date_) if date_ else today
    except ValueError:
        raise HTTPException(status_code=422, detail="Dates look like 2026-10-05")
    people = await _people(user)
    recs = {r[1]: r for r in await db.fetch_all(f"SELECT {_COLS} FROM staff_attendance WHERE work_date = %s", (d,))}
    shifts = {r[0]: r[1] for r in await db.fetch_all("SELECT person_ref, shift FROM schedule_entries WHERE person_type = 'staff' AND work_date = %s", (d,))}
    times = {st: await station_times(st) for st in {p["station"] for p in people}}
    flags, _ = await compute_flags(user, [d])
    by_person: dict[str, list[dict]] = {}
    for f in flags:
        by_person.setdefault(f["email"], []).append(f)
    rows = []
    for p in people:
        rec = recs.get(p["email"])
        sh = shifts.get(p["email"])
        rows.append({**p, "shift": ({"code": sh, "label": SHIFTS.get(sh, (sh, ""))[0], "hours": hours_text(times[p["station"]], sh), "break": break_text(times[p["station"]], sh)} if sh else None),
                     "record": _record_json(rec) if rec else None, "flags": by_person.get(p["email"], [])})
    return {"date": str(d), "rows": rows, "can_fix": _can_fix(user), "can_act": _alert_recipient(user)}


def _month_bounds(month: str | None) -> tuple[date, date]:
    today = _now().date()
    try:
        y, m = (int(x) for x in month.split("-")) if month else (today.year, today.month)
        lo = date(y, m, 1)
    except ValueError:
        raise HTTPException(status_code=422, detail="Months look like 2026-10")
    return lo, date(y + (m == 12), 1 if m == 12 else m + 1, 1)


@router.get("/api/attendance/staff/month")
async def month_view(month: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """The month grid: a row per Station Head / Fleet Assistant in scope with hours per day, days worked and days still open (no clock-out)."""
    lo, hi = _month_bounds(month)
    people = await _people(user)
    emails = {p["email"] for p in people}
    by_person: dict[str, dict[int, dict]] = {}
    for r in await db.fetch_all(f"SELECT {_COLS} FROM staff_attendance WHERE work_date >= %s AND work_date < %s", (lo, hi)):
        if r[1] not in emails:
            continue
        h = _hours(r[6], r[7])
        by_person.setdefault(r[1], {})[r[5].day if hasattr(r[5], "day") else int(str(r[5])[8:10])] = {
            "in": _hm(r[6]), "out": _hm(r[7]), "hours": None if h is None else round(h, 2), "edited": bool(r[10]), "station": r[4]}
    rows = []
    for p in people:
        days = by_person.get(p["email"], {})
        rows.append({**p, "days": days, "worked": sum(1 for v in days.values() if v["out"]), "open_days": sum(1 for v in days.values() if not v["out"]),
                     "hours": round(sum(v["hours"] or 0 for v in days.values()), 1)})
    return {"month": f"{lo.year:04d}-{lo.month:02d}", "days_in_month": (hi - lo).days, "rows": rows, "can_fix": _can_fix(user)}


# ---------------------------------------------------------------- a fix (Region Head / RFS / HOD / Manager)

class FixIn(BaseModel):
    email: str
    work_date: str
    clock_in: str  # HH:MM
    clock_out: str | None = None  # HH:MM
    reason: str


@router.post("/api/attendance/staff/fix")
async def fix_time(p: FixIn, user: CurrentUser = Depends(get_current_user)):
    """Set a Station Head's / Fleet Assistant's clock times for a day (forgotten clock-out, wrong time, a day they couldn't clock). Keeps the originals and who / why."""
    if not _can_fix(user):
        raise HTTPException(status_code=403, detail="Only a Region Head, RFS, HOD or Manager can fix staff clock times")
    email = p.email.strip().lower()
    if email == user.email.lower() and user.position != "admin":
        raise HTTPException(status_code=403, detail="Someone else has to fix your own time")
    person = next((x for x in await _people(user) if x["email"] == email), None)
    if person is None:
        raise HTTPException(status_code=403, detail="That person is not a Station Head / Fleet Assistant in your scope")
    try:
        day_ = date.fromisoformat(p.work_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Dates look like 2026-10-05")
    now = _now()
    first = now.date().replace(day=1)
    window_start = (first - timedelta(days=1)).replace(day=1) if now.day <= 5 else first
    if day_ > now.date():
        raise HTTPException(status_code=422, detail="That day hasn't happened yet")
    if day_ < window_start:
        raise HTTPException(status_code=422, detail="Only this month (or last month, until the 5th) can be fixed")
    if len(p.reason.strip()) < 5:
        raise HTTPException(status_code=422, detail="Give a reason (a few words)")
    if not _HHMM.match(p.clock_in) or (p.clock_out and not _HHMM.match(p.clock_out)):
        raise HTTPException(status_code=422, detail="Times look like 08:30")
    cin = datetime.combine(day_, datetime.strptime(p.clock_in, "%H:%M").time())
    cout = None
    if p.clock_out:
        cout = datetime.combine(day_, datetime.strptime(p.clock_out, "%H:%M").time())
        if cout <= cin:
            cout += timedelta(days=1)  # a night shift ending after midnight
        if (cout - cin).total_seconds() / 3600 > MAX_SHIFT_HOURS:
            raise HTTPException(status_code=422, detail=f"A shift can be {MAX_SHIFT_HOURS} hours at most")
        if cout > now:
            raise HTTPException(status_code=422, detail="The clock-out can't be in the future")
    rec = await db.fetch_one(f"SELECT {_COLS} FROM staff_attendance WHERE email = %s AND work_date = %s", (email, day_))
    reason = p.reason.strip()[:300]
    if rec:
        orig_in, orig_out = rec[13] or rec[6], rec[14] if rec[13] else rec[7]  # keep the very first times
        await db.execute("UPDATE staff_attendance SET clock_in = %s, clock_out = %s, edited_by = %s, edited_at = %s, edit_reason = %s, orig_in = %s, orig_out = %s WHERE id = %s",
                         (cin, cout, user.email, now, reason, orig_in, orig_out, rec[0]))
    else:
        await db.execute(
            "INSERT INTO staff_attendance (email, name, position, station, work_date, clock_in, clock_out, edited_by, edited_at, edit_reason, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (email, person["name"], person["position"], person["station"], day_, cin, cout, user.email, now, reason, now))
    log.info("staff clock fixed: %s %s by %s (%s)", email, day_, user.email, reason)
    return {"ok": True}


# ---------------------------------------------------------------- flags: staff who don't clock in / out as scheduled

LATE_MINUTES = 30      # scheduled AM 8:00 and still not in at 8:30 -> "not in"
NO_OUT_MINUTES = 60    # an hour after the shift should have ended and still no clock-out -> "no clock-out"
MIN_STAFF_HOURS = 8    # a staff day under this is flagged "short" (PTWH have no minimum)
WORKING_SHIFTS = ("AM", "MD", "PM")
ALERT_KINDS = ("not_in", "no_out")  # these are the ones a Region Head / RFS / Manager is alerted about (late and short days are shown, not alerted)
ALERT_POSITIONS = ("region_head", "rfs", "hod", "manager", "admin")
KIND_LABEL = {"not_in": "Not clocked in", "late_in": "Clocked in late", "no_out": "No clock-out", "short": "Short day"}


def _at(day: date, hhmm: str) -> datetime:
    return datetime.combine(day, datetime.strptime(hhmm, "%H:%M").time())


async def compute_flags(user: CurrentUser, days: list[date]) -> tuple[list[dict], int]:
    """(flags, unconfigured) for the Station Heads / Fleet Assistants in the caller's scope on these days, worked out from the Schedule (AM / Middle / PM), the station's own shift
    hours and the clock records. `unconfigured` = scheduled staff days whose station has not written its shift hours, so no clock-in time can be checked."""
    people = await _people(user)
    if not people:
        return [], 0
    emails = {p["email"] for p in people}
    now = _now()
    lo, hi = min(days), max(days)
    sched = {(r[0], str(r[1])[:10]): r[2] for r in await db.fetch_all(
        "SELECT person_ref, work_date, shift FROM schedule_entries WHERE person_type = 'staff' AND work_date >= %s AND work_date <= %s", (lo, hi)) if r[0] in emails}
    recs = {(r[1], str(r[5])[:10]): r for r in await db.fetch_all(f"SELECT {_COLS} FROM staff_attendance WHERE work_date >= %s AND work_date <= %s", (lo, hi)) if r[1] in emails}
    acts = {(r[0], str(r[1])[:10], r[2]): r for r in await db.fetch_all(
        "SELECT person_ref, work_date, kind, note, acted_by, acted_at FROM attendance_flag_actions WHERE person_type = 'staff' AND work_date >= %s AND work_date <= %s", (lo, hi))}
    times = {st: await station_times(st) for st in {p["station"] for p in people}}
    flags, unconfigured = [], 0

    def add(p, d, kind, detail, shift=None, minutes=None):
        a = acts.get((p["email"], str(d), kind))
        flags.append({"email": p["email"], "name": p["name"], "station": p["station"], "zone": p["zone"], "region": p["region"], "date": str(d), "kind": kind, "label": KIND_LABEL[kind],
                      "detail": detail, "shift": shift, "minutes": minutes, "alert": kind in ALERT_KINDS,
                      "handled": {"note": a[3], "by": a[4], "at": _iso(a[5])} if a else None})

    for p in people:
        for d in days:
            shift = sched.get((p["email"], str(d)))
            rec = recs.get((p["email"], str(d)))
            t = times[p["station"]].get(shift) if shift in WORKING_SHIFTS else None
            if shift in WORKING_SHIFTS and not t:
                unconfigured += 1
            start = _at(d, t["start"]) if t else None
            end = None
            if t:
                end = _at(d, t["end"])
                if end <= start:
                    end += timedelta(days=1)  # a shift that runs past midnight
            if rec is None:
                if start and now >= start + timedelta(minutes=LATE_MINUTES):
                    mins = int((now - start).total_seconds() // 60)
                    add(p, d, "not_in", f"Scheduled {SHIFTS[shift][0]} from {t['start']}; not clocked in {mins} min after the start.", shift, mins)
                continue
            cin, cout = rec[6], rec[7]
            if start and cin > start + timedelta(minutes=LATE_MINUTES):
                mins = int((cin - start).total_seconds() // 60)
                add(p, d, "late_in", f"Scheduled {SHIFTS[shift][0]} from {t['start']}; clocked in {mins} min late at {cin.strftime('%H:%M')}.", shift, mins)
            if cout is None:
                if end and now >= end + timedelta(minutes=NO_OUT_MINUTES):
                    add(p, d, "no_out", f"Clocked in at {cin.strftime('%H:%M')}; no clock-out {int((now - end).total_seconds() // 60)} min after the shift end ({t['end']}).", shift)
                elif not end and (now - cin).total_seconds() / 3600 > NIGHT_GRACE_HOURS:
                    add(p, d, "no_out", f"Clocked in at {cin.strftime('%H:%M')}; still no clock-out.", shift)
            elif (cout - cin).total_seconds() / 3600 < MIN_STAFF_HOURS:
                add(p, d, "short", f"Worked {(cout - cin).total_seconds() / 3600:.1f} h; the minimum for staff is {MIN_STAFF_HOURS} h.", shift)
    flags.sort(key=lambda f: (f["handled"] is not None, not f["alert"], f["date"], f["station"], f["name"]))
    return flags, unconfigured


def _alert_recipient(user: CurrentUser) -> bool:
    return user.position in ALERT_POSITIONS


async def pending_flag_count(user: CurrentUser) -> int:
    """The number in the Attendance alert: staff who should have clocked in / out and didn't, not yet handled -- only for a Region Head / RFS / HOD / Manager / Superadmin."""
    if not _alert_recipient(user):
        return 0
    today = _now().date()
    flags, _ = await compute_flags(user, [today - timedelta(days=2), today - timedelta(days=1), today])
    return sum(1 for f in flags if f["alert"] and not f["handled"])


@router.get("/api/attendance/staff/flags")
async def list_flags(user: CurrentUser = Depends(get_current_user)):
    """Staff who didn't clock in / out as scheduled today and in the last two days (not clocked in 30 min after the shift starts, late, no clock-out, short day)."""
    today = _now().date()
    flags, unconfigured = await compute_flags(user, [today - timedelta(days=2), today - timedelta(days=1), today])
    return {"flags": flags, "unconfigured": unconfigured, "can_act": _alert_recipient(user), "late_minutes": LATE_MINUTES, "no_out_minutes": NO_OUT_MINUTES, "min_hours": MIN_STAFF_HOURS}


class FlagAction(BaseModel):
    email: str
    date: str
    kind: str
    note: str


@router.post("/api/attendance/staff/flags/action")
async def act_on_flag(p: FlagAction, user: CurrentUser = Depends(get_current_user)):
    """A Region Head / RFS / HOD / Manager marks a flag as handled, with what was done (called, on MC, fixed the time ...)."""
    if not _alert_recipient(user):
        raise HTTPException(status_code=403, detail="Only a Region Head, RFS, HOD or Manager can handle a flag")
    if p.kind not in KIND_LABEL:
        raise HTTPException(status_code=422, detail="Unknown flag")
    if len(p.note.strip()) < 3:
        raise HTTPException(status_code=422, detail="Write what was done (a few words)")
    try:
        d = date.fromisoformat(p.date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Dates look like 2026-10-05")
    email = p.email.strip().lower()
    if not any(x["email"] == email for x in await _people(user)):
        raise HTTPException(status_code=403, detail="That person is not a Station Head / Fleet Assistant in your scope")
    now = _now()
    existing = await db.fetch_one("SELECT id FROM attendance_flag_actions WHERE person_type = 'staff' AND person_ref = %s AND work_date = %s AND kind = %s", (email, d, p.kind))
    if existing:
        await db.execute("UPDATE attendance_flag_actions SET note = %s, acted_by = %s, acted_at = %s WHERE id = %s", (p.note.strip()[:300], user.email, now, existing[0]))
    else:
        await db.execute("INSERT INTO attendance_flag_actions (person_type, person_ref, work_date, kind, note, acted_by, acted_at) VALUES ('staff',%s,%s,%s,%s,%s,%s)", (email, d, p.kind, p.note.strip()[:300], user.email, now))
    return {"ok": True}
