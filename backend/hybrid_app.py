"""Ninjavan Shift for HYBRID drivers / riders (2026-10-10).

The phone app (Ninjavan Shift, formerly the PTWH app) now serves Hybrid drivers too. They log in with a username + password their station sets (same flow as PTWH:
temporary password + recovery code, changed by the driver), see their own schedule and attendance, and CLOCK IN with their phone's location (within 100 m of the station) and a
selfie. There is NO clock-out for a Hybrid driver: their day ends with their route data (route monitoring), which is built later.

How it reaches them: the app keeps calling /api/ptwh-app/... with the shared key. The shared login and recover calls (ptwh_app.py) hand over to `login` / `recover` here when the
username belongs to a driver; everything else a driver does lives under /api/ptwh-app/hybrid/... (their session token carries kind "h", which the PTWH calls refuse).
Station staff create the logins (Attendance -> Hybrid -> Drivers), audit the selfie, and fix the day by hand as before.
"""
import logging
import os
import re
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from starlette.responses import Response

import attendance
import attendance_launch
import db
import ptwh_app
import storage
from attendance import _can_edit, _now, _require_editor, _visible_stations
from auth import CurrentUser, get_current_user

log = logging.getLogger("hybrid_app")
router = APIRouter()  # what the phone calls (key + token), under /api/ptwh-app/hybrid
admin_router = APIRouter()  # what station staff use in the dashboard (SSO)

SELFIE_RETENTION_DAYS = 14
_COLS = "id, station, name, driver_id, phone, vehicle_type, NULL, joined_date, end_date, active, notes, created_by, created_at, email"
_CRED_COLS = "driver_id, username, password_hash, recovery_hash, cred_version, password_set_by, failed_attempts, locked_until, last_login_at, disabled"

ptwh_app._MSG.update({
    "hy_geo_not_set": ("Your station's location isn't set up yet -- tell your station", "Lokasi stesen anda belum disediakan -- beritahu stesen anda"),
    "hy_gps_poor": ("Your phone's location isn't accurate enough ({acc} m). Go outside and try again", "Lokasi telefon anda kurang tepat ({acc} m). Keluar ke kawasan terbuka dan cuba lagi"),
    "hy_too_far": ("You are about {dist} m from {station}. You need to be within {radius} m of the station to clock in. If your location is not working, tell your station",
                   "Anda kira-kira {dist} m dari {station}. Anda mesti berada dalam lingkungan {radius} m dari stesen untuk daftar masuk. Jika lokasi anda tidak berfungsi, beritahu stesen anda"),
    "hy_no_proof": ("Allow your location so we can see you are at the station", "Benarkan lokasi anda supaya kami dapat lihat anda berada di stesen"),
    "hy_no_out": ("You only clock in -- your day ends with your route data", "Anda hanya daftar masuk -- hari anda tamat mengikut data laluan anda"),
})


def _working(d, today: date) -> bool:
    """A driver who is switched on and whose employment end date (if any) hasn't passed."""
    end = d[8]
    end = end if (end is None or isinstance(end, date)) else date.fromisoformat(str(end)[:10])
    return bool(d[9]) and (end is None or end >= today)


# ---------------------------------------------------------------- called from ptwh_app: the shared login / recover

async def login(username: str, password: str, lang: str):
    """The driver's login. Returns None when the username isn't a driver's (so the PTWH login can say 'wrong username or password')."""
    row = await db.fetch_one(f"SELECT {_CRED_COLS} FROM hybrid_credentials WHERE username = %s", (username.strip().lower(),))
    if row is None:
        return None
    if row[9]:
        raise ptwh_app._err(401, "bad_login", lang)
    if (e := ptwh_app._locked(row[7], lang)) is not None:
        raise e
    if not ptwh_app._check_hash(password, row[2]):
        await _fail(row[0], row[6])
        raise ptwh_app._err(401, "bad_login", lang)
    d = await db.fetch_one(f"SELECT {_COLS} FROM hybrid_drivers WHERE id = %s", (row[0],))
    if d is None or not _working(d, _now().date()):
        raise ptwh_app._err(403, "inactive", lang)
    if attendance_launch.station_state(d[1]) == "off":
        raise ptwh_app._err(403, "not_launched", lang)
    await db.execute("UPDATE hybrid_credentials SET failed_attempts=0, locked_until=NULL, last_login_at=%s WHERE driver_id=%s", (_now(), row[0]))
    return {"token": ptwh_app._sign_token(row[0], row[4], kind="h"), "name": d[2], "station": d[1], "needs_password_change": row[5] == "station", "kind": "hybrid"}


async def recover(username: str, recovery_code: str, new_password: str, lang: str):
    """Forgot the password -- None when the username isn't a driver's."""
    row = await db.fetch_one(f"SELECT {_CRED_COLS} FROM hybrid_credentials WHERE username = %s", (username.strip().lower(),))
    if row is None:
        return None
    if row[9]:
        raise ptwh_app._err(401, "bad_recover", lang)
    if (e := ptwh_app._locked(row[7], lang)) is not None:
        raise e
    if not ptwh_app._check_hash(ptwh_app._norm_recovery(recovery_code), row[3]):
        await _fail(row[0], row[6])
        raise ptwh_app._err(401, "bad_recover", lang)
    ptwh_app._check_new_password(new_password, row[1], lang)
    new_code = ptwh_app._random_recovery()
    await db.execute(
        "UPDATE hybrid_credentials SET password_hash=%s, recovery_hash=%s, password_set_by='self', cred_version=%s, failed_attempts=0, locked_until=NULL, updated_at=%s WHERE driver_id=%s",
        (ptwh_app._hash(new_password), ptwh_app._hash(new_code.replace("-", "")), row[4] + 1, _now(), row[0]),
    )
    return {"ok": True, "recovery_code": new_code}


async def _fail(driver_id: int, fails: int) -> None:
    fails += 1
    locked = _now() + timedelta(minutes=ptwh_app.LOCK_MIN) if fails >= ptwh_app.MAX_FAILS else None
    await db.execute("UPDATE hybrid_credentials SET failed_attempts=%s, locked_until=%s WHERE driver_id=%s", (0 if locked else fails, locked, driver_id))


async def _session(authorization: str | None = Header(default=None), lang: str = Depends(ptwh_app._lang), _k: None = Depends(ptwh_app._require_app_key)):
    """The driver behind this call: (driver row, credentials row)."""
    token = (authorization or "").removeprefix("Bearer ").strip()
    data = ptwh_app._read_token(token) if token else None
    if not data or data.get("k") != "h":
        raise ptwh_app._err(401, "relogin", lang)
    cred = await db.fetch_one(f"SELECT {_CRED_COLS} FROM hybrid_credentials WHERE driver_id = %s", (data["w"],))
    if cred is None or cred[9] or cred[4] != data["v"]:
        raise ptwh_app._err(401, "relogin", lang)
    d = await db.fetch_one(f"SELECT {_COLS} FROM hybrid_drivers WHERE id = %s", (data["w"],))
    if d is None or not _working(d, _now().date()):
        raise ptwh_app._err(401, "inactive", lang)
    if attendance_launch.station_state(d[1]) == "off":
        raise ptwh_app._err(403, "not_launched", lang)
    return d, cred


# ---------------------------------------------------------------- the phone: me, clock in, my month, my schedule, change password

def _status_json(r) -> dict | None:
    return None if r is None else {"status": r[0], "clock_in": attendance._iso(r[1]), "note": r[2], "source": r[3]}


@router.get("/api/ptwh-app/hybrid/me")
async def me(s=Depends(_session)):
    d, cred = s
    today = _now().date()
    rec = await db.fetch_one("SELECT status, clock_in, note, source FROM hybrid_attendance WHERE driver_id = %s AND work_date = %s", (d[0], today))
    geo = await ptwh_app._station_geo(d[1])
    return {"kind": "hybrid", "name": d[2], "station": d[1], "username": cred[1], "needs_password_change": cred[5] == "station", "today": str(today), "now": attendance._iso(_now()),
            "record": _status_json(rec), "geo_ready": geo is not None, "radius_m": ptwh_app.RADIUS_M, "max_accuracy_m": ptwh_app.MAX_GPS_ACCURACY_M, "can_clock_out": False}


@router.post("/api/ptwh-app/hybrid/clock")
async def clock(p: ptwh_app.AppClock, s=Depends(_session), lang: str = Depends(ptwh_app._lang)):
    """Clock in: the phone must be within 100 m of the station and a selfie is taken. (No clock-out -- it comes from the route data.)"""
    d, _cred = s
    if p.action != "in":
        raise ptwh_app._err(422, "hy_no_out", lang)
    station = d[1]
    if p.lat is None or p.lng is None:
        raise ptwh_app._err(422, "hy_no_proof", lang)
    geo = await ptwh_app._station_geo(station)
    if geo is None:
        raise ptwh_app._err(422, "hy_geo_not_set", lang)
    if p.accuracy is not None and p.accuracy > ptwh_app.MAX_GPS_ACCURACY_M:
        raise ptwh_app._err(422, "hy_gps_poor", lang, acc=round(p.accuracy))
    dist = ptwh_app.distance_m(p.lat, p.lng, geo[0], geo[1])
    if dist > ptwh_app.RADIUS_M:
        raise ptwh_app._err(422, "hy_too_far", lang, dist=round(dist), station=station, radius=ptwh_app.RADIUS_M)
    selfie = ptwh_app._decode_selfie(p.selfie, lang)
    now = _now()
    today = now.date()
    rec = await db.fetch_one("SELECT id, status, clock_in FROM hybrid_attendance WHERE driver_id = %s AND work_date = %s", (d[0], today))
    if rec is not None and rec[2] is not None:
        raise ptwh_app._err(409, "already_in", lang)
    key = storage.safe_key("hybrid", str(today), f"{d[0]}-in-{uuid.uuid4().hex[:12]}.jpg")
    try:
        await run_in_threadpool(storage.put_bytes, key, selfie, content_type="image/jpeg")
    except Exception:  # noqa: BLE001 -- nothing is recorded if the photo isn't saved
        log.exception("hybrid selfie upload failed")
        raise ptwh_app._err(503, "photo_save", lang)
    acc, dd = (round(p.accuracy) if p.accuracy is not None else None), round(dist)
    if rec is None:
        await db.execute(
            """INSERT INTO hybrid_attendance (driver_id, work_date, status, clock_in, recorded_by, recorded_at, source, in_lat, in_lng, in_acc, in_dist, in_selfie)
               VALUES (%s, %s, 'present', %s, %s, %s, 'app', %s, %s, %s, %s, %s)""", (d[0], today, now, f"hybrid:{d[0]}", now, p.lat, p.lng, acc, dd, key))
    else:  # the station had keyed something already (present without a time, or absent / leave): the driver's own clock-in, with proof, wins
        await db.execute(
            """UPDATE hybrid_attendance SET status='present', clock_in=%s, source='app', in_lat=%s, in_lng=%s, in_acc=%s, in_dist=%s, in_selfie=%s, edited_by=%s, edited_at=%s WHERE id=%s""",
            (now, p.lat, p.lng, acc, dd, key, f"hybrid:{d[0]}", now, rec[0]))
    return {"ok": True, "action": "in", "time": attendance._iso(now), "method": "geo"}


@router.get("/api/ptwh-app/hybrid/summary")
async def summary(month: str | None = None, s=Depends(_session), lang: str = Depends(ptwh_app._lang)):
    """My month: each day keyed or clocked (present / absent / leave) and the totals."""
    d, _cred = s
    today = _now().date()
    try:
        y, m = (int(x) for x in (month or today.strftime("%Y-%m")).split("-"))
        first = date(y, m, 1)
    except ValueError:
        raise ptwh_app._err(422, "bad_month", lang)
    nxt = date(y + (m == 12), 1 if m == 12 else m + 1, 1)
    rows = await db.fetch_all("SELECT work_date, status, clock_in, note FROM hybrid_attendance WHERE driver_id = %s AND work_date >= %s AND work_date < %s ORDER BY work_date", (d[0], first, nxt))
    days = [{"date": str(r[0])[:10], "status": r[1], "in": r[2].strftime("%H:%M") if r[2] else None, "note": r[3]} for r in rows]
    return {"kind": "hybrid", "month": first.strftime("%Y-%m"), "days": days, **{k: sum(1 for x in days if x["status"] == k) for k in ("present", "absent", "leave")}}


_TIME = re.compile(r"^\d\d:\d\d$")


@router.get("/api/ptwh-app/hybrid/schedule")
async def schedule(s=Depends(_session)):
    """My schedule: the next 14 days -- Working (with the time to clock in), Off or Leave. Hybrid drivers have no shifts."""
    d, _cred = s
    today = _now().date()
    rows = {str(r[0])[:10]: r[1] for r in await db.fetch_all(
        "SELECT work_date, shift FROM schedule_entries WHERE person_type = 'hybrid' AND station = %s AND person_ref = %s AND work_date >= %s AND work_date < %s",
        (d[1], d[2], today, today + timedelta(days=14)))}
    out = []
    for i in range(14):
        day = str(today + timedelta(days=i))
        v = rows.get(day)
        out.append({"date": day, "status": None if v is None else "working" if (v == "WK" or _TIME.match(v)) else "off" if v == "OFF" else "leave", "clock_in": v if v and _TIME.match(v) else None})
    return {"kind": "hybrid", "station": d[1], "days": out}


@router.post("/api/ptwh-app/hybrid/change-password")
async def change_password(p: ptwh_app.ChangePassword, s=Depends(_session), lang: str = Depends(ptwh_app._lang)):
    d, cred = s
    if (e := ptwh_app._locked(cred[7], lang)) is not None:
        raise e
    if not ptwh_app._check_hash(p.old_password, cred[2]):
        await _fail(d[0], cred[6])
        raise ptwh_app._err(401, "pw_wrong", lang)
    ptwh_app._check_new_password(p.new_password, cred[1], lang)
    version = cred[4] + 1
    await db.execute("UPDATE hybrid_credentials SET password_hash=%s, password_set_by='self', cred_version=%s, failed_attempts=0, updated_at=%s WHERE driver_id=%s", (ptwh_app._hash(p.new_password), version, _now(), d[0]))
    return {"ok": True, "token": ptwh_app._sign_token(d[0], version, kind="h")}


# ---------------------------------------------------------------- dashboard side: logins for drivers (station staff)

async def _driver_for_editor(driver_id: int, user: CurrentUser):
    d = await db.fetch_one(f"SELECT {_COLS} FROM hybrid_drivers WHERE id = %s", (driver_id,))
    if d is None:
        raise HTTPException(status_code=404, detail="Driver not found")
    _require_editor(user, d[1])
    return d


class LoginCreate(BaseModel):
    username: str


@admin_router.get("/api/attendance/hybrid/logins")
async def list_logins(user: CurrentUser = Depends(get_current_user)):
    """Which Hybrid drivers in scope have an app login (username only -- never the password)."""
    stations = _visible_stations(user)
    rows = await db.fetch_all("SELECT c.driver_id, c.username, c.disabled, c.last_login_at, c.password_set_by, d.station FROM hybrid_credentials c JOIN hybrid_drivers d ON d.id = c.driver_id")
    return {"logins": {str(r[0]): {"username": r[1], "disabled": bool(r[2]), "last_login_at": attendance._iso(r[3]), "password_set_by": r[4]} for r in rows if r[5] in stations},
            "can_edit": _can_edit(user), "app_url": os.environ.get("PTWH_APP_URL") or None}


@admin_router.post("/api/attendance/hybrid/drivers/{driver_id}/login")
async def create_login(driver_id: int, p: LoginCreate, user: CurrentUser = Depends(get_current_user)):
    d = await _driver_for_editor(driver_id, user)
    username = p.username.strip().lower()
    if not ptwh_app._USERNAME.fullmatch(username):
        raise HTTPException(status_code=422, detail="Username: 3-30 letters, numbers, dot, dash or underscore, starting with a letter or number")
    if await db.fetch_one("SELECT driver_id FROM hybrid_credentials WHERE driver_id = %s", (d[0],)):
        raise HTTPException(status_code=409, detail="This driver already has a login")
    if await db.fetch_one("SELECT username FROM hybrid_credentials WHERE username = %s", (username,)) or await db.fetch_one("SELECT username FROM ptwh_credentials WHERE username = %s", (username,)):
        raise HTTPException(status_code=409, detail="That username is taken -- try another")
    pw, code = ptwh_app._random_password(), ptwh_app._random_recovery()
    await db.execute(
        "INSERT INTO hybrid_credentials (driver_id, username, password_hash, recovery_hash, created_by, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
        (d[0], username, ptwh_app._hash(pw), ptwh_app._hash(code.replace("-", "")), user.email, _now()))
    return {"username": username, "temp_password": pw, "recovery_code": code}


@admin_router.post("/api/attendance/hybrid/drivers/{driver_id}/login/reset")
async def reset_login(driver_id: int, user: CurrentUser = Depends(get_current_user)):
    d = await _driver_for_editor(driver_id, user)
    row = await db.fetch_one("SELECT cred_version FROM hybrid_credentials WHERE driver_id = %s", (d[0],))
    if row is None:
        raise HTTPException(status_code=404, detail="This driver has no login yet")
    pw, code = ptwh_app._random_password(), ptwh_app._random_recovery()
    await db.execute(
        "UPDATE hybrid_credentials SET password_hash=%s, recovery_hash=%s, password_set_by='station', cred_version=%s, failed_attempts=0, locked_until=NULL, disabled=0, updated_at=%s WHERE driver_id=%s",
        (ptwh_app._hash(pw), ptwh_app._hash(code.replace("-", "")), row[0] + 1, _now(), d[0]))
    return {"temp_password": pw, "recovery_code": code}


class DisableIn(BaseModel):
    disabled: bool


@admin_router.post("/api/attendance/hybrid/drivers/{driver_id}/login/disable")
async def disable_login(driver_id: int, p: DisableIn, user: CurrentUser = Depends(get_current_user)):
    d = await _driver_for_editor(driver_id, user)
    row = await db.fetch_one("SELECT cred_version FROM hybrid_credentials WHERE driver_id = %s", (d[0],))
    if row is None:
        raise HTTPException(status_code=404, detail="This driver has no login yet")
    await db.execute("UPDATE hybrid_credentials SET disabled=%s, cred_version=%s, updated_at=%s WHERE driver_id=%s", (1 if p.disabled else 0, row[0] + 1, _now(), d[0]))
    return {"ok": True}


@admin_router.get("/api/attendance/hybrid/photo/{record_id}")
async def photo(record_id: int, user: CurrentUser = Depends(get_current_user)):
    """The clock-in selfie of a Hybrid driver, for audit (only for stations in the caller's scope)."""
    row = await db.fetch_one("SELECT a.in_selfie, d.station FROM hybrid_attendance a JOIN hybrid_drivers d ON d.id = a.driver_id WHERE a.id = %s", (record_id,))
    if row is None or row[1] not in _visible_stations(user):
        raise HTTPException(status_code=404, detail="Photo not found")
    if not row[0]:
        raise HTTPException(status_code=404, detail="No photo on this record (it was removed after 14 days, or the day was keyed by hand)")
    try:
        data = await run_in_threadpool(storage.get_bytes, row[0])
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=404, detail="The photo could not be found")
    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=300"})


async def purge_selfies() -> None:
    """Hybrid clock-in selfies are kept 14 days, like the PTWH ones. Never raises."""
    try:
        cutoff = _now().date() - timedelta(days=SELFIE_RETENTION_DAYS)
        for rid, key in await db.fetch_all("SELECT id, in_selfie FROM hybrid_attendance WHERE in_selfie IS NOT NULL AND work_date < %s LIMIT 200", (cutoff,)):
            try:
                await run_in_threadpool(storage.delete, key)
            except Exception:  # noqa: BLE001 -- tried again next time
                log.exception("hybrid selfie delete failed for record %s", rid)
                continue
            await db.execute("UPDATE hybrid_attendance SET in_selfie = NULL WHERE id = %s", (rid,))
    except Exception:  # noqa: BLE001
        log.exception("hybrid selfie purge failed")
