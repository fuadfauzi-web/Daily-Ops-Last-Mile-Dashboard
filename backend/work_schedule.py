"""Attendance -> Schedule (2026-10-03, staging): who works which shift on which day, for PTWH, Staff and Hybrid drivers, per station and week.

One schedule screen covers the three groups:
  * PTWH   -- the station's active PTWH (the Attendance -> PTWH list);
  * Staff  -- the people posted at the station in the Staff & Org Chart (Station Head, Fleet Assistants);
  * Hybrid -- the drivers keyed in by station staff in Attendance -> Hybrid -> Drivers (manual for now; later the driver-app sign-in / a Fleet Admin list replaces it).
Who may EDIT: Station Heads, Region Heads, Managers / HOD and the Superadmin, for the stations in their scope. Everyone else with the station in their scope can read it.
The PTWH app's "My schedule" shows a PTWH their next two weeks from here (ptwh_app.py).
"""
import logging
import re
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import attendance
import db
import staff
from attendance import _now, _visible_stations
from auth import CurrentUser, get_current_user

log = logging.getLogger("work_schedule")
router = APIRouter()

# code -> (label, hours). The hours are deliberately blank: every station runs its own AM / Middle / PM times (an AM can start at 5am in one station and 8am in the next),
# so the schedule only says WHICH shift, never when it starts. (The field stays so the PTWH app and the API keep their shape.)
SHIFTS = {
    "AM": ("AM", ""),
    "MD": ("Middle", ""),
    "HAM": ("Half day AM", ""),
    "HMD": ("Half day Middle", ""),
    "HPM": ("Half day PM", ""),
    "HD": ("Half day", ""),  # the old single half day (no longer offered; kept so a leftover one still reads)
    "PM": ("PM", ""),
    "WK": ("Working", ""),
    "OFF": ("Off", ""),
    "AL": ("Leave", ""),
}
GROUP_SHIFTS = {"ptwh": ["AM", "MD", "PM", "HAM", "HMD", "HPM", "OFF"], "staff": ["AM", "MD", "PM", "OFF", "AL"], "hybrid": ["WK", "OFF", "AL"]}
EDIT_POSITIONS = ("station_head", "region_head", "hod", "manager", "admin")
STAFF_POSITIONS = ("station_head", "fleet_assistant", "station")


TIMED_SHIFTS = ("AM", "MD", "PM")  # the shifts a station writes its own hours for
_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


async def station_times(station: str) -> dict[str, dict]:
    """{'AM': {'start': '05:00', 'end': '14:00'}, ...} -- the hours this station wrote down (only the shifts it has set)."""
    rows = await db.fetch_all("SELECT shift, start_time, end_time, break_start, break_end FROM station_shift_times WHERE station = %s", (station,))
    return {r[0]: {"start": r[1], "end": r[2], **({"break_start": r[3], "break_end": r[4]} if r[3] and r[4] else {})} for r in rows}


def break_text(times: dict[str, dict], code: str | None) -> str:
    """The shift's break window, '12:00-13:00' (empty when the station hasn't set one). A half day has none."""
    t = times.get(code or "")
    return f"{t['break_start']}-{t['break_end']}" if t and t.get("break_start") else ""


HALF_BASE = {"HAM": "AM", "HMD": "MD", "HPM": "PM"}  # a PTWH half day starts when the shift it sits on starts


def hours_text(times: dict[str, dict], code: str | None) -> str:
    """The station's hours for a shift: '05:00-14:00'. A half day shows only where it STARTS ('from 05:00'), the start of its AM / Middle / PM shift."""
    if code in HALF_BASE:
        t = times.get(HALF_BASE[code])
        return f"from {t['start']}" if t else ""
    t = times.get(code or "")
    return f"{t['start']}-{t['end']}" if t else ""


def can_edit(user: CurrentUser) -> bool:
    return user.position in EDIT_POSITIONS


def _require_edit(user: CurrentUser, station: str) -> None:
    if not can_edit(user):
        raise HTTPException(status_code=403, detail="Only Station Heads, Region Heads and Managers can change the schedule")
    if station not in _visible_stations(user):
        raise HTTPException(status_code=403, detail="That station is outside your scope")


def _monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _date(raw: str | None, default: date) -> date:
    if not raw:
        return default
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise HTTPException(status_code=422, detail="Dates look like 2026-10-05")


async def roster(station: str, group: str) -> list[tuple[str, str]]:
    """[(person_ref, display name)] -- who can be scheduled in this group at this station."""
    if group == "ptwh":
        rows = await db.fetch_all("SELECT id, full_name FROM ptwh_workers WHERE station = %s AND active = 1 ORDER BY full_name", (station,))
        return [(str(r[0]), r[1]) for r in rows]
    if group == "staff":
        out = []
        for r in await db.fetch_all("SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name FROM users"):
            if r[1] not in STAFF_POSITIONS:
                continue
            home_type, home_values = staff._home_of(r)
            if home_type == "station" and station in home_values:
                out.append((r[0].lower(), staff.plain_name(r[6]) or r[0]))
        return sorted(out, key=lambda x: x[1].lower())
    if group == "hybrid":
        rows = await db.fetch_all("SELECT name FROM hybrid_drivers WHERE station = %s AND active = 1 ORDER BY name", (station,))  # Attendance -> Hybrid -> Drivers
        return [(r[0], r[0]) for r in rows]
    raise HTTPException(status_code=422, detail="Group is ptwh, staff or hybrid")


@router.get("/api/attendance/schedule")
async def get_schedule(station: str | None = None, week_start: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """One station's week: every person in the three groups with the shift on each of the 7 days."""
    stations = sorted(_visible_stations(user))
    if not stations:
        return {"stations": [], "station": None}
    st = station or stations[0]
    if st not in stations:
        raise HTTPException(status_code=403, detail="That station is outside your scope")
    ws = _monday(_date(week_start, _now().date()))
    days = [ws + timedelta(days=i) for i in range(7)]
    cells: dict[tuple[str, str], dict[str, str]] = {}
    for ptype, ref, wd, shift in await db.fetch_all(
        "SELECT person_type, person_ref, work_date, shift FROM schedule_entries WHERE station = %s AND work_date >= %s AND work_date <= %s", (st, days[0], days[-1])
    ):
        cells.setdefault((ptype, ref), {})[str(wd)] = shift
    groups = {}
    for g in ("ptwh", "staff", "hybrid"):
        groups[g] = [{"ref": ref, "name": name, "cells": cells.get((g, ref), {})} for ref, name in await roster(st, g)]
    times = await station_times(st)
    return {
        "station": st, "stations": stations, "week_start": str(ws), "can_edit": can_edit(user), "shift_times": times,
        "days": [{"date": str(d), "dow": d.strftime("%a"), "day": d.day} for d in days],
        "shifts": {g: [{"code": c, "label": SHIFTS[c][0], "hours": hours_text(times, c), "break": break_text(times, c)} for c in codes] for g, codes in GROUP_SHIFTS.items()},
        "groups": groups,
    }


class ShiftTimeIn(BaseModel):
    station: str
    shift: str  # AM | MD | PM
    start: str | None = None  # HH:MM; start and end both empty = take the hours off
    end: str | None = None
    break_start: str | None = None  # the shift's break, both or neither
    break_end: str | None = None


@router.put("/api/attendance/schedule/shift-times")
async def set_shift_time(p: ShiftTimeIn, user: CurrentUser = Depends(get_current_user)):
    """Write down (or clear) this station's own hours for its AM, Middle or PM shift. Same people who can edit the schedule."""
    _require_edit(user, p.station)
    if p.shift not in TIMED_SHIFTS:
        raise HTTPException(status_code=422, detail="Hours can be set for AM, Middle and PM")
    if not p.start and not p.end:
        await db.execute("DELETE FROM station_shift_times WHERE station = %s AND shift = %s", (p.station, p.shift))
        return {"ok": True, "cleared": True}
    if not p.start or not p.end or not _HHMM.match(p.start) or not _HHMM.match(p.end):
        raise HTTPException(status_code=422, detail="Give a start and an end time like 05:00 and 14:00")
    if p.start == p.end:
        raise HTTPException(status_code=422, detail="The start and end can't be the same")
    bs, be = (p.break_start or None), (p.break_end or None)
    if bool(bs) != bool(be):
        raise HTTPException(status_code=422, detail="Give both the break start and the break end, or neither")
    if bs:
        if not _HHMM.match(bs) or not _HHMM.match(be) or bs >= be:
            raise HTTPException(status_code=422, detail="The break should look like 12:00 to 13:00 (start before end)")
        if p.start < p.end and not (p.start <= bs and be <= p.end):  # a day shift's break has to sit inside the shift
            raise HTTPException(status_code=422, detail="The break has to be inside the shift hours")
    now = _now()
    existing = await db.fetch_one("SELECT id FROM station_shift_times WHERE station = %s AND shift = %s", (p.station, p.shift))
    if existing:
        await db.execute("UPDATE station_shift_times SET start_time = %s, end_time = %s, break_start = %s, break_end = %s, updated_by = %s, updated_at = %s WHERE id = %s", (p.start, p.end, bs, be, user.email, now, existing[0]))
    else:
        await db.execute("INSERT INTO station_shift_times (station, shift, start_time, end_time, break_start, break_end, updated_by, updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)", (p.station, p.shift, p.start, p.end, bs, be, user.email, now))
    return {"ok": True}


class CellIn(BaseModel):
    station: str
    group: str
    ref: str
    date: str
    shift: str | None = None  # None clears the day


@router.put("/api/attendance/schedule/cell")
async def set_cell(p: CellIn, user: CurrentUser = Depends(get_current_user)):
    _require_edit(user, p.station)
    if p.group not in GROUP_SHIFTS:
        raise HTTPException(status_code=422, detail="Group is ptwh, staff or hybrid")
    # Hybrid drivers have NO shift: a day is Working (optionally with the time they clock in, "08:30" -- the clock-out comes from their route data later), Off or Leave.
    if p.shift is not None and p.shift not in GROUP_SHIFTS[p.group] and not (p.group == "hybrid" and _HHMM.match(p.shift)):
        raise HTTPException(status_code=422, detail=f"Shift for {p.group} is one of {', '.join(GROUP_SHIFTS[p.group])}" + (" (or a clock-in time like 08:30)" if p.group == "hybrid" else ""))
    day = _date(p.date, _now().date())
    today = _now().date()
    if not (today - timedelta(days=35) <= day <= today + timedelta(days=180)):
        raise HTTPException(status_code=422, detail="That date is too far from today")
    if p.ref not in {ref for ref, _ in await roster(p.station, p.group)}:
        raise HTTPException(status_code=422, detail="That person isn't on this station's list")
    existing = await db.fetch_one("SELECT id FROM schedule_entries WHERE person_type = %s AND person_ref = %s AND work_date = %s", (p.group, p.ref, day))
    if p.shift is None:
        if existing:
            await db.execute("DELETE FROM schedule_entries WHERE id = %s", (existing[0],))
    elif existing:
        await db.execute("UPDATE schedule_entries SET station = %s, shift = %s, updated_by = %s, updated_at = %s WHERE id = %s", (p.station, p.shift, user.email, _now(), existing[0]))
    else:
        await db.execute(
            "INSERT INTO schedule_entries (station, person_type, person_ref, work_date, shift, updated_by, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (p.station, p.group, p.ref, day, p.shift, user.email, _now()),
        )
    return {"ok": True}


class CopyIn(BaseModel):
    station: str
    group: str
    from_week: str
    to_week: str


@router.post("/api/attendance/schedule/copy-week")
async def copy_week(p: CopyIn, user: CurrentUser = Depends(get_current_user)):
    """Copy one week's shifts onto another for a group at the station (replaces what was in the target week) -- most weeks look like the last one."""
    _require_edit(user, p.station)
    if p.group not in GROUP_SHIFTS:
        raise HTTPException(status_code=422, detail="Group is ptwh, staff or hybrid")
    src, dst = _monday(_date(p.from_week, _now().date())), _monday(_date(p.to_week, _now().date()))
    today = _now().date()
    if src == dst or not (today - timedelta(days=35) <= dst <= today + timedelta(days=180)):
        raise HTTPException(status_code=422, detail="Pick a different week to copy onto, within the next 6 months")
    refs = [ref for ref, _ in await roster(p.station, p.group)]
    now = _now()
    copied = 0
    for ref in refs:
        for i in range(7):
            s_day, d_day = src + timedelta(days=i), dst + timedelta(days=i)
            row = await db.fetch_one("SELECT shift FROM schedule_entries WHERE person_type = %s AND person_ref = %s AND work_date = %s", (p.group, ref, s_day))
            cur = await db.fetch_one("SELECT id FROM schedule_entries WHERE person_type = %s AND person_ref = %s AND work_date = %s", (p.group, ref, d_day))
            if row is None:
                if cur:
                    await db.execute("DELETE FROM schedule_entries WHERE id = %s", (cur[0],))
            elif cur:
                await db.execute("UPDATE schedule_entries SET station = %s, shift = %s, updated_by = %s, updated_at = %s WHERE id = %s", (p.station, row[0], user.email, now, cur[0]))
                copied += 1
            else:
                await db.execute(
                    "INSERT INTO schedule_entries (station, person_type, person_ref, work_date, shift, updated_by, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (p.station, p.group, ref, d_day, row[0], user.email, now),
                )
                copied += 1
    return {"ok": True, "copied": copied}


async def ptwh_upcoming(worker_id: int, days: int = 14, station: str | None = None) -> list[dict]:
    """The next `days` days for one PTWH (the PTWH app's My schedule): every date, with the shift (code, label, hours) or None when nothing is scheduled."""
    today = _now().date()
    rows = {
        str(d): s
        for d, s in await db.fetch_all(
            "SELECT work_date, shift FROM schedule_entries WHERE person_type = 'ptwh' AND person_ref = %s AND work_date >= %s AND work_date < %s",
            (str(worker_id), today, today + timedelta(days=days)),
        )
    }
    times = await station_times(station) if station else {}
    out = []
    for i in range(days):
        d = today + timedelta(days=i)
        code = rows.get(str(d))
        out.append({"date": str(d), "shift": code, "label": SHIFTS[code][0] if code in SHIFTS else None, "hours": (hours_text(times, code) or None) if code in SHIFTS else None, "break": (break_text(times, code) or None) if code in SHIFTS else None})
    return out
