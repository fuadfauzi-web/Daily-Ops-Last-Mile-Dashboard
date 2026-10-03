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
import db
import staff
from attendance import _hours, _iso, _now, _visible_stations, _zone_region
from auth import CurrentUser, get_current_user, parse_scope_values
from ptwh_app import MAX_GPS_ACCURACY_M, RADIUS_M, _station_geo, distance_m
from work_schedule import SHIFTS, STAFF_POSITIONS

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
    r = await db.fetch_one("SELECT shift FROM schedule_entries WHERE person_type = 'staff' AND person_ref = %s AND work_date = %s", (email.lower(), day))
    if not r:
        return None
    label, hours = SHIFTS.get(r[0], (r[0], ""))
    return {"code": r[0], "label": label, "hours": hours}


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
    rows = []
    for p in people:
        rec = recs.get(p["email"])
        sh = shifts.get(p["email"])
        rows.append({**p, "shift": ({"code": sh, "label": SHIFTS.get(sh, (sh, ""))[0], "hours": SHIFTS.get(sh, (sh, ""))[1]} if sh else None),
                     "record": _record_json(rec) if rec else None})
    return {"date": str(d), "rows": rows, "can_fix": _can_fix(user)}


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
