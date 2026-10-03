"""Attendance -> Schedule (2026-10-03, staging): who works which shift on which day, for PTWH, Staff and Hybrid drivers, per station and week.

One schedule screen covers the three groups:
  * PTWH   -- the station's active PTWH (the Attendance -> PTWH list);
  * Staff  -- the people posted at the station in the Staff & Org Chart (Station Head, Fleet Assistants);
  * Hybrid -- drivers typed in by name as a STOPGAP: the Hybrid driver list will come from a Fleet Admin tab (like the Staff & Org Chart), not built yet; the roster
    then reads from there instead of schedule_people.
Who may EDIT: Station Heads, Region Heads, Managers / HOD and the Superadmin, for the stations in their scope. Everyone else with the station in their scope can read it.
The PTWH app's "My schedule" shows a PTWH their next two weeks from here (ptwh_app.py).
"""
import logging
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

# code -> (label, hours). Per group, the shifts that make sense for that group (the PTWH ones are the template's: AM, half-day push-off, PM).
SHIFTS = {
    "AM": ("AM", "05:00-14:00"),
    "HD": ("Half day", "06:00-10:00"),
    "PM": ("PM", "13:00-21:00"),
    "WK": ("Working", ""),
    "OFF": ("Off", ""),
    "AL": ("Leave", ""),
}
GROUP_SHIFTS = {"ptwh": ["AM", "HD", "PM", "OFF"], "staff": ["AM", "PM", "OFF", "AL"], "hybrid": ["WK", "OFF", "AL"]}
EDIT_POSITIONS = ("station_head", "region_head", "hod", "manager", "admin")
STAFF_POSITIONS = ("station_head", "fleet_assistant", "station")


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
        rows = await db.fetch_all("SELECT person_ref FROM schedule_people WHERE station = %s AND person_type = 'hybrid' ORDER BY person_ref", (station,))
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
    return {
        "station": st, "stations": stations, "week_start": str(ws), "can_edit": can_edit(user),
        "days": [{"date": str(d), "dow": d.strftime("%a"), "day": d.day} for d in days],
        "shifts": {g: [{"code": c, "label": SHIFTS[c][0], "hours": SHIFTS[c][1]} for c in codes] for g, codes in GROUP_SHIFTS.items()},
        "groups": groups,
    }


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
    if p.shift is not None and p.shift not in GROUP_SHIFTS[p.group]:
        raise HTTPException(status_code=422, detail=f"Shift for {p.group} is one of {', '.join(GROUP_SHIFTS[p.group])}")
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


class DriverIn(BaseModel):
    station: str
    name: str


@router.post("/api/attendance/schedule/hybrid-driver")
async def add_hybrid_driver(p: DriverIn, user: CurrentUser = Depends(get_current_user)):
    _require_edit(user, p.station)
    name = " ".join(p.name.split())[:100]
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Type the driver's name")
    if await db.fetch_one("SELECT id FROM schedule_people WHERE station = %s AND person_type = 'hybrid' AND person_ref = %s", (p.station, name)):
        raise HTTPException(status_code=409, detail="That driver is already on this station's schedule")
    await db.execute("INSERT INTO schedule_people (station, person_type, person_ref, added_by, added_at) VALUES (%s, 'hybrid', %s, %s, %s)", (p.station, name, user.email, _now()))
    return {"ok": True}


@router.delete("/api/attendance/schedule/hybrid-driver")
async def remove_hybrid_driver(station: str, name: str, user: CurrentUser = Depends(get_current_user)):
    _require_edit(user, station)
    await db.execute("DELETE FROM schedule_people WHERE station = %s AND person_type = 'hybrid' AND person_ref = %s", (station, name))
    await db.execute("DELETE FROM schedule_entries WHERE station = %s AND person_type = 'hybrid' AND person_ref = %s", (station, name))
    return {"ok": True}


async def ptwh_upcoming(worker_id: int, days: int = 14) -> list[dict]:
    """The next `days` days for one PTWH (the PTWH app's My schedule): every date, with the shift (code, label, hours) or None when nothing is scheduled."""
    today = _now().date()
    rows = {
        str(d): s
        for d, s in await db.fetch_all(
            "SELECT work_date, shift FROM schedule_entries WHERE person_type = 'ptwh' AND person_ref = %s AND work_date >= %s AND work_date < %s",
            (str(worker_id), today, today + timedelta(days=days)),
        )
    }
    out = []
    for i in range(days):
        d = today + timedelta(days=i)
        code = rows.get(str(d))
        out.append({"date": str(d), "shift": code, "label": SHIFTS[code][0] if code in SHIFTS else None, "hours": SHIFTS[code][1] if code in SHIFTS else None})
    return out
