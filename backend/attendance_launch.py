"""Attendance -> Launch Timeline (2026-10-04, staging): the Attendance build goes live BY BATCH.

A Superadmin / HOD / Manager sets a launch date per region, zone or station (Settings -> Launch Timeline). The most specific rule wins (station > zone > region).
  * no date            -> the station cannot see Attendance at all;
  * the day BEFORE it  -> visible, "test run": the station may try it out early;
  * the date and after -> live.
Superadmin / HOD / Managers always see every station (they run the roll-out and need to test); everyone else sees only the stations that are visible.

`_visible_stations()` in attendance.py reads `visible_stations()` here, so every Attendance screen (PTWH, Staff, Hybrid, Schedule, Audit ...) is gated in one place.
That function is SYNCHRONOUS, so the rules live in a small in-memory cache: loaded at start-up, updated at once on the pod that took a change, and re-read every
`REFRESH_SECONDS` by the app's background loop so the other pods catch up.
"""
import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user
from stations import HUBS

log = logging.getLogger("attendance_launch")
router = APIRouter()

REFRESH_SECONDS = 30
SETTER_ROLES = ("admin", "manager")  # access tiers: Superadmin, HOD and Manager
_MYT = timezone(timedelta(hours=8))

# {(scope_type, scope_value): date}
_RULES: dict[tuple[str, str], date] = {}


def _today() -> date:
    return datetime.now(_MYT).date()


def _as_date(v) -> date:
    if isinstance(v, datetime):
        return v.date()
    return v if isinstance(v, date) else date.fromisoformat(str(v)[:10])


def _stations() -> dict[str, tuple[str, str]]:
    """station -> (zone, region)"""
    return {name: (zone, region) for name, _full, zone, region in HUBS.values()}


def launch_date(station: str, rules: dict | None = None) -> tuple[date | None, str | None]:
    """(date, where it came from: 'station' | 'zone' | 'region') for a station -- the most specific rule wins."""
    rules = _RULES if rules is None else rules
    zone, region = _stations().get(station, ("", ""))
    for kind, value in (("station", station), ("zone", zone), ("region", region)):
        d = rules.get((kind, value))
        if d:
            return d, kind
    return None, None


def state_of(d: date | None, today: date | None = None) -> str:
    """'off' (no date, or more than a day away) | 'test' (the day before) | 'live'"""
    if d is None:
        return "off"
    today = today or _today()
    if today >= d:
        return "live"
    return "test" if today == d - timedelta(days=1) else "off"


def station_state(station: str) -> str:
    return state_of(launch_date(station)[0])


def visible_stations(stations: set[str]) -> set[str]:
    """The stations among `stations` whose Attendance is visible today (test run or live)."""
    return {s for s in stations if station_state(s) != "off"}


def sees_everything(user: CurrentUser) -> bool:
    return user.role in SETTER_ROLES or user.position in ("admin", "hod", "manager")


async def refresh_rules() -> None:
    """Re-read the launch dates (start-up, after a change, and every REFRESH_SECONDS). Never raises: on a database hiccup the last known rules stay."""
    global _RULES
    try:
        rows = await db.fetch_all("SELECT scope_type, scope_value, launch_date FROM attendance_launch")
        _RULES = {(r[0], r[1]): _as_date(r[2]) for r in rows}
    except Exception:
        log.exception("could not read the Attendance launch dates")


# ---------------------------------------------------------------- clearing the test run

async def _clear_station(station: str, launch: date) -> int | None:
    """Delete everything keyed for this station BEFORE its launch date (the test run): PTWH / Staff / Hybrid attendance, PTWH corrections and emergency QR codes, and the PTWH selfies.
    NOT touched: the people and lists themselves (PTWH roster, Hybrid drivers, Staff & Org Chart), the Schedule, the station's shift hours. Returns how many rows went, or None when a
    selfie couldn't be deleted (try again next time, the marker is not set)."""
    import ptwh_app  # late import: ptwh_app imports this module

    rows = await db.fetch_all(
        "SELECT a.id, a.in_selfie, a.out_selfie FROM ptwh_attendance a WHERE a.work_date < %s AND a.worker_id IN (SELECT id FROM ptwh_workers WHERE station = %s)", (launch, station))
    if await ptwh_app._delete_selfies(rows) < len(rows):
        return None
    from fastapi.concurrency import run_in_threadpool
    import storage

    for key in [r[0] for r in await db.fetch_all(
            "SELECT in_selfie FROM hybrid_attendance WHERE in_selfie IS NOT NULL AND work_date < %s AND driver_id IN (SELECT id FROM hybrid_drivers WHERE station = %s)", (launch, station))]:
        try:
            await run_in_threadpool(storage.delete, key)
        except Exception:  # noqa: BLE001 -- retried next time (the marker is not set)
            return None
    n = 0
    for sql, params in (
        ("DELETE FROM ptwh_corrections WHERE work_date < %s AND worker_id IN (SELECT id FROM ptwh_workers WHERE station = %s)", (launch, station)),
        ("DELETE FROM ptwh_attendance WHERE work_date < %s AND worker_id IN (SELECT id FROM ptwh_workers WHERE station = %s)", (launch, station)),
        ("DELETE FROM ptwh_qr_codes WHERE station = %s AND issued_at < %s", (station, launch)),
        ("DELETE FROM staff_attendance WHERE work_date < %s AND station = %s", (launch, station)),
        ("DELETE FROM hybrid_attendance WHERE work_date < %s AND driver_id IN (SELECT id FROM hybrid_drivers WHERE station = %s)", (launch, station)),
    ):
        n += await db.execute_rowcount(sql, params)
    return n


async def clear_test_entries() -> None:
    """Once a station reaches its launch date, wipe what was keyed during the test run (everything dated before the launch date). Done ONCE per station -- a marker row is kept in
    attendance_launch_cleared -- so moving a date later can never delete real attendance. Safe to run on every pod and every 30 s; never raises."""
    try:
        today = _today()
        done = {r[0] for r in await db.fetch_all("SELECT station FROM attendance_launch_cleared")}
        for station in sorted(_stations()):
            if station in done:
                continue
            d, _src = launch_date(station)
            if d is None or today < d:
                continue
            n = await _clear_station(station, d)
            if n is None:
                log.warning("Launch %s: test entries not cleared yet (a selfie could not be deleted); will retry", station)
                continue
            if not await db.fetch_one("SELECT station FROM attendance_launch_cleared WHERE station = %s", (station,)):
                await db.execute("INSERT INTO attendance_launch_cleared (station, launch_date, cleared_at, rows_removed) VALUES (%s,%s,%s,%s)", (station, d, datetime.now(_MYT).replace(tzinfo=None), n))
            log.info("Launch %s (%s): test-run entries cleared, %d rows removed", station, d, n)
    except Exception:  # noqa: BLE001 -- must never take the loop down
        log.exception("clearing the Attendance test-run entries failed")


# ---------------------------------------------------------------- Settings -> Launch Timeline

def _require_setter(user: CurrentUser) -> None:
    if not sees_everything(user):
        raise HTTPException(status_code=403, detail="Only the Superadmin, HOD and Managers can see or set the launch dates")


@router.get("/api/attendance/launch")
async def list_launch(user: CurrentUser = Depends(get_current_user)):
    """Every region, zone and station with its own launch date (if any), the date it ends up with and its state today."""
    _require_setter(user)
    rows = await db.fetch_all("SELECT scope_type, scope_value, launch_date, set_by, set_at FROM attendance_launch")
    meta = {(r[0], r[1]): {"set_by": r[3], "set_at": r[4].isoformat(timespec="minutes") if hasattr(r[4], "isoformat") else str(r[4])} for r in rows}
    await refresh_rules()
    rules = dict(_RULES)
    today = _today()
    st = _stations()
    regions: dict[str, dict] = {}
    for name, (zone, region) in sorted(st.items(), key=lambda kv: (kv[1][1], kv[1][0], kv[0])):
        reg = regions.setdefault(region, {"name": region, "zones": {}})
        z = reg["zones"].setdefault(zone, {"name": zone, "stations": []})
        eff, src = launch_date(name, rules)
        z["stations"].append({"name": name, "date": str(rules[("station", name)]) if ("station", name) in rules else None, **meta.get(("station", name), {}),
                              "effective": str(eff) if eff else None, "source": src, "state": state_of(eff, today)})
    out = []
    for region, reg in regions.items():
        r_date = rules.get(("region", region))
        zones = []
        for zone, z in reg["zones"].items():
            z_date = rules.get(("zone", zone))
            zones.append({"name": zone, "date": str(z_date) if z_date else None, **meta.get(("zone", zone), {}), "stations": z["stations"]})
        out.append({"name": region, "date": str(r_date) if r_date else None, **meta.get(("region", region), {}), "zones": zones})
    return {"today": str(today), "regions": out}


class LaunchIn(BaseModel):
    scope_type: str  # region | zone | station
    scope_value: str
    date: str | None = None  # yyyy-mm-dd; empty clears it


@router.put("/api/attendance/launch")
async def set_launch(p: LaunchIn, user: CurrentUser = Depends(get_current_user)):
    """Set (or clear) the launch date of one region, zone or station."""
    _require_setter(user)
    st = _stations()
    valid = {"station": set(st), "zone": {z for z, _r in st.values()}, "region": {r for _z, r in st.values()}}
    if p.scope_type not in valid or p.scope_value not in valid[p.scope_type]:
        raise HTTPException(status_code=422, detail="Pick a region, zone or station from the list")
    if not p.date:
        await db.execute("DELETE FROM attendance_launch WHERE scope_type = %s AND scope_value = %s", (p.scope_type, p.scope_value))
        await refresh_rules()
        return {"ok": True, "cleared": True}
    try:
        d = date.fromisoformat(p.date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Dates look like 2026-11-02")
    if d < _today() - timedelta(days=30) or d > _today() + timedelta(days=730):
        raise HTTPException(status_code=422, detail="That date is too far from today")
    now = datetime.now(_MYT).replace(tzinfo=None)
    existing = await db.fetch_one("SELECT id FROM attendance_launch WHERE scope_type = %s AND scope_value = %s", (p.scope_type, p.scope_value))
    if existing:
        await db.execute("UPDATE attendance_launch SET launch_date = %s, set_by = %s, set_at = %s WHERE id = %s", (d, user.email, now, existing[0]))
    else:
        await db.execute("INSERT INTO attendance_launch (scope_type, scope_value, launch_date, set_by, set_at) VALUES (%s,%s,%s,%s,%s)", (p.scope_type, p.scope_value, d, user.email, now))
    log.info("Attendance launch date: %s %s -> %s by %s", p.scope_type, p.scope_value, d, user.email)
    await refresh_rules()
    return {"ok": True}


@router.get("/api/attendance/launch/me")
async def my_launch(user: CurrentUser = Depends(get_current_user)):
    """Whether this person can see Attendance at all, and which of their stations are only in the test run (with the launch date)."""
    from attendance import _visible_stations  # late import: attendance.py imports this module

    if sees_everything(user):
        return {"visible": True, "all": True, "test": []}
    vis = _visible_stations(user)
    today = _today()
    test = []
    for s in sorted(vis):
        d, _src = launch_date(s)
        if state_of(d, today) == "test":
            test.append({"station": s, "date": str(d)})
    return {"visible": bool(vis), "all": False, "test": test}
