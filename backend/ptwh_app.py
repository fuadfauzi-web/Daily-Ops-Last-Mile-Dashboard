"""PTWH app backend (2026-10-03, staging): what the separate PTWH clock-in app talks to, and what the dashboard needs to run it.

Two halves in one module:

1. router  -- /api/ptwh-app/*, called by the PTWH app (its own small backend forwards the phone's calls here). These paths are NOT behind the
   Google SSO (PTWH are not ninjavan.co staff) -- declare /api/ptwh-app as an SSO-exempt path in the portal's Access tab. They protect themselves:
     * every call must carry the shared PTWH_APP_KEY (env secret, the same value in both apps) -- no key set = the whole thing is switched off;
     * everything but login / recover also needs the PTWH's own session token (HMAC-signed with JWT_SECRET, 14 days, dies when the password changes);
     * passwords and recovery codes are stored hashed (scrypt); 5 wrong tries lock a login for 10 minutes.
   Clocking in / out needs PROOF the person is at the station -- the phone's location within RADIUS_M (100 m) of the station's Premises latitude / longitude --
   AND a selfie with the station behind them. The station's hourly QR code is only an EMERGENCY fallback (location not working): it needs a reason and the
   clock goes to the audit queue as "needs review" until an auditor marks it OK or flags it. The server takes the time itself; the phone's clock is never trusted.

2. admin_router -- /api/attendance/ptwh/* behind the normal SSO: station staff create / reset a PTWH's login, show the hourly QR, set where the station is,
   and anyone with the station in their scope (station, RH, RFS, manager, HOD, Fleet Admin ...) audits the clock events and their selfies.

The selfie is stored in object storage (storage.py); the table keeps only its key. Selfies are deleted after SELFIE_RETENTION_DAYS (purge_old_selfies, run by the
refresh loop) -- except those of FLAGGED events -- and only the audit facts (time, method, distance) stay.
"""
import base64
import hashlib
import hmac
import json
import logging
import math
import os
import re
import secrets
import time
import uuid
from datetime import date, datetime, timedelta
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from starlette.responses import Response

import attendance
import db
import storage
import work_schedule
from attendance import _can_edit, _now, _require_editor, _visible_stations, _worker, day_pay
from auth import CurrentUser, get_current_user

log = logging.getLogger("ptwh_app")
router = APIRouter()  # the PTWH app's calls (no SSO; key + token)
admin_router = APIRouter()  # the dashboard's side (SSO)

RADIUS_M = 100  # the same for every station and not editable by station users; a station's position is its latitude / longitude in Fleet Admin -> Premises
SELFIE_RETENTION_DAYS = 14  # selfies are personal photos kept for audit only; a flagged / still-unreviewed event keeps them until it is cleared or marked OK
QR_RETENTION_DAYS = 35  # 5 weeks: the evidence behind a QR (emergency) clock is kept longer ...
QR_PURGE_DAYS = range(8, 15)  # ... and only cleared in week 2 of the month (the 8th-14th), once a month
REVIEW_ALERT_POSITIONS = ("station_head", "region_head", "hod", "manager", "admin")  # who is told a QR clock is waiting for review
MAX_GPS_ACCURACY_M = 65  # a fix worse than this can't prove "within 100 m" -- the person is asked to scan the QR or go outside
QR_TTL_MIN = 10  # a QR code is made on request for ONE named PTWH, works once, and stops working after this long (or when the station asks for a newer one)
TOKEN_DAYS = 14
MAX_FAILS = 5
LOCK_MIN = 10
SELFIE_MAX_BYTES = 1_000_000
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I -- read out loud or copied by hand without mix-ups


# ---------------------------------------------------------------- secrets, hashing, tokens

def _secret() -> bytes:
    return (os.environ.get("JWT_SECRET") or "dev-only-secret").encode()


def _hash(secret: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.scrypt(secret.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return f"scrypt${salt.hex()}${h.hex()}"


def _check_hash(secret: str, stored: str) -> bool:
    try:
        _, salt, h = stored.split("$")
        got = hashlib.scrypt(secret.encode(), salt=bytes.fromhex(salt), n=2 ** 14, r=8, p=1, dklen=32)
        return hmac.compare_digest(got.hex(), h)
    except (ValueError, TypeError):
        return False


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sign_token(worker_id: int, version: int, now_ts: float | None = None) -> str:
    body = _b64(json.dumps({"w": worker_id, "v": version, "exp": int((now_ts or time.time()) + TOKEN_DAYS * 86400)}, separators=(",", ":")).encode())
    return f"{body}.{_b64(hmac.new(_secret(), body.encode(), hashlib.sha256).digest())}"


def _read_token(token: str, now_ts: float | None = None) -> dict | None:
    try:
        body, sig = token.split(".")
        if not hmac.compare_digest(_b64(hmac.new(_secret(), body.encode(), hashlib.sha256).digest()), sig):
            return None
        data = json.loads(_unb64(body))
        return data if data.get("exp", 0) > (now_ts or time.time()) else None
    except (ValueError, TypeError):
        return None


def _random_password() -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(8))


def _random_recovery() -> str:
    raw = "".join(secrets.choice(_ALPHABET) for _ in range(12))
    return "-".join(raw[i:i + 4] for i in range(0, 12, 4))


def _norm_recovery(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (code or "").upper())


# ---------------------------------------------------------------- the emergency QR code (on request, one PTWH, one use) and the location check

async def _check_qr(station: str, worker_id: int, code: str, lang: str):
    """Find the QR code and make sure it is good for THIS PTWH right now -- it must have been made for them, be unused, not replaced and not expired. Returns its row
    (id, worker_id, status, expires_at, issued_by); nothing is consumed yet (see _consume_qr)."""
    row = await db.fetch_one("SELECT id, worker_id, status, expires_at, issued_by FROM ptwh_qr_codes WHERE station = %s AND code = %s", (station, code.strip().lower()))
    if row is None or row[2] == "superseded" or row[3] < _now():
        raise _err(422, "qr_expired", lang)
    if row[2] == "used":
        raise _err(422, "qr_used", lang)
    if row[1] != worker_id:
        raise _err(422, "qr_other", lang)
    return row


async def _consume_qr(qr_id: int, lang: str) -> None:
    """Use the code up. Atomic: of two phones sending the same code, only one gets rowcount 1."""
    if await db.execute_rowcount("UPDATE ptwh_qr_codes SET status = 'used', used_at = %s WHERE id = %s AND status = 'active'", (_now(), qr_id)) != 1:
        raise _err(422, "qr_used", lang)


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle (haversine) distance in metres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(a))


# ---------------------------------------------------------------- PTWH app: messages (English / Bahasa Malaysia)
# The phone sends X-Lang (en | ms); every message a PTWH can read comes back in that language. Anything else defaults to English.

_MSG = {
    "not_on": ("The PTWH app is not switched on yet", "Aplikasi PTWH belum diaktifkan"),
    "not_allowed": ("Not allowed", "Tidak dibenarkan"),
    "relogin": ("Please log in again", "Sila log masuk semula"),
    "inactive": ("Your account is not active -- ask your station", "Akaun anda tidak aktif -- sila tanya stesen anda"),
    "bad_login": ("Wrong username or password", "Nama pengguna atau kata laluan salah"),
    "locked": ("Too many wrong tries. Try again in {mins} minute(s), or ask your station to reset your password.",
               "Terlalu banyak cubaan yang salah. Cuba lagi dalam {mins} minit, atau minta stesen anda set semula kata laluan."),
    "bad_action": ("action must be in or out", "Tindakan mesti masuk atau keluar"),
    "geo_not_set": ("Your station's location isn't set up yet -- tell your station. In an emergency you can use the station QR code",
                    "Lokasi stesen anda belum disediakan -- beritahu stesen anda. Dalam kecemasan anda boleh guna kod QR stesen"),
    "gps_poor": ("Your phone's location isn't accurate enough ({acc} m). Go outside and try again. In an emergency you can use the station QR code",
                 "Lokasi telefon anda kurang tepat ({acc} m). Keluar ke kawasan terbuka dan cuba lagi. Dalam kecemasan anda boleh guna kod QR stesen"),
    "too_far": ("You are about {dist} m from {station}. You need to be within {radius} m of the station. If your location isn't working and it is an emergency, use the station QR code",
                "Anda kira-kira {dist} m dari {station}. Anda mesti berada dalam lingkungan {radius} m dari stesen. Jika lokasi anda tidak berfungsi dan ia kecemasan, guna kod QR stesen"),
    "qr_reason": ("Tell us why you need the QR code -- it is for emergencies only and your station will check it",
                  "Beritahu kami mengapa anda perlukan kod QR -- ia hanya untuk kecemasan dan stesen anda akan menyemaknya"),
    "qr_expired": ("That QR code has expired or been replaced -- ask your station for a new one",
                   "Kod QR itu telah tamat tempoh atau diganti -- minta kod baharu daripada stesen anda"),
    "qr_used": ("That QR code has already been used -- ask your station for a new one",
                "Kod QR itu sudah digunakan -- minta kod baharu daripada stesen anda"),
    "qr_other": ("That QR code was made for someone else -- ask your station for one made for you",
                 "Kod QR itu dibuat untuk orang lain -- minta kod yang dibuat untuk anda daripada stesen anda"),
    "no_proof": ("Allow your location so we can see you are at the station. A QR code is for emergencies only",
                 "Benarkan lokasi anda supaya kami dapat lihat anda berada di stesen. Kod QR hanya untuk kecemasan"),
    "already_in": ("You already clocked in today", "Anda sudah daftar masuk hari ini"),
    "not_in": ("You haven't clocked in today", "Anda belum daftar masuk hari ini"),
    "already_out": ("You already clocked out today", "Anda sudah daftar keluar hari ini"),
    "photo_save": ("Couldn't save your photo -- try again in a moment", "Gambar anda tidak dapat disimpan -- cuba lagi sebentar"),
    "photo_unreadable": ("The photo could not be read -- take it again", "Gambar tidak dapat dibaca -- ambil semula"),
    "photo_missing": ("Take a selfie with the station behind you", "Ambil swafoto dengan stesen di belakang anda"),
    "photo_big": ("The photo is too big -- take it again", "Gambar terlalu besar -- ambil semula"),
    "bad_month": ("Months look like 2026-10", "Format bulan seperti 2026-10"),
    "pw_short": ("Use at least 8 characters", "Guna sekurang-kurangnya 8 aksara"),
    "pw_same": ("The password can't be the same as your username", "Kata laluan tidak boleh sama dengan nama pengguna"),
    "pw_wrong": ("Your current password is wrong", "Kata laluan semasa anda salah"),
    "bad_recover": ("Username or recovery code is wrong -- or ask your station to reset your password",
                    "Nama pengguna atau kod pemulihan salah -- atau minta stesen anda set semula kata laluan"),
}


def _lang(x_lang: str | None = Header(default=None)) -> str:
    return "ms" if (x_lang or "").lower().startswith("ms") else "en"


def _text(key: str, lang: str, **kw) -> str:
    en, ms = _MSG[key]
    return (ms if lang == "ms" else en).format(**kw)


def _err(status: int, key: str, lang: str, **kw) -> HTTPException:
    return HTTPException(status_code=status, detail=_text(key, lang, **kw))


async def _station_geo(station: str) -> tuple[float, float] | None:
    """(latitude, longitude) of a station from the Fleet Admin team's Premises, or None while it hasn't been filled in."""
    r = await db.fetch_one("SELECT latitude, longitude FROM premises WHERE station=%s AND latitude IS NOT NULL AND longitude IS NOT NULL", (station,))
    return (float(r[0]), float(r[1])) if r else None


# ---------------------------------------------------------------- PTWH app: auth plumbing

def _require_app_key(x_ptwh_app_key: str | None = Header(default=None), lang: str = Depends(_lang)) -> None:
    expected = os.environ.get("PTWH_APP_KEY")
    if not expected:
        raise _err(503, "not_on", lang)
    if not x_ptwh_app_key or not hmac.compare_digest(x_ptwh_app_key, expected):
        log.warning("PTWH app call refused: the key it sent does not match PTWH_APP_KEY here (check the same value is set on the PTWH app)")
        raise _err(401, "not_allowed", lang)


_CRED_COLS = "worker_id, username, password_hash, recovery_hash, cred_version, password_set_by, failed_attempts, locked_until, last_login_at, disabled"


async def _session(authorization: str | None = Header(default=None), lang: str = Depends(_lang), _k: None = Depends(_require_app_key)):
    """The PTWH behind this call: (worker row, credentials row). 401 for anything that is not a live session -- a changed password kills old sessions."""
    token = (authorization or "").removeprefix("Bearer ").strip()
    data = _read_token(token) if token else None
    if not data:
        raise _err(401, "relogin", lang)
    cred = await db.fetch_one(f"SELECT {_CRED_COLS} FROM ptwh_credentials WHERE worker_id = %s", (data["w"],))
    if cred is None or cred[9] or cred[4] != data["v"]:
        raise _err(401, "relogin", lang)
    w = await db.fetch_one(f"SELECT {attendance._WORKER_COLS} FROM ptwh_workers WHERE id = %s", (data["w"],))
    if w is None or not attendance.is_working(w, _now().date()):  # inactive, or their end date has passed
        raise _err(401, "inactive", lang)
    return w, cred


async def _fail(worker_id: int, fails: int) -> None:
    fails += 1
    locked = _now() + timedelta(minutes=LOCK_MIN) if fails >= MAX_FAILS else None
    await db.execute("UPDATE ptwh_credentials SET failed_attempts=%s, locked_until=%s WHERE worker_id=%s", (0 if locked else fails, locked, worker_id))


def _locked(locked_until: datetime | None, lang: str) -> HTTPException | None:
    if locked_until and locked_until > _now():
        return _err(429, "locked", lang, mins=max(1, math.ceil((locked_until - _now()).total_seconds() / 60)))
    return None


class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/api/ptwh-app/login")
async def app_login(p: LoginIn, lang: str = Depends(_lang), _k: None = Depends(_require_app_key)):
    row = await db.fetch_one(f"SELECT {_CRED_COLS} FROM ptwh_credentials WHERE username = %s", (p.username.strip().lower(),))
    if row is None or row[9]:
        log.warning("PTWH login refused: %s", "no such username" if row is None else f"login for worker {row[0]} is switched off")
        raise _err(401, "bad_login", lang)
    if (e := _locked(row[7], lang)) is not None:
        log.warning("PTWH login refused: worker %s is locked after too many wrong tries", row[0])
        raise e
    if not _check_hash(p.password, row[2]):
        log.warning("PTWH login refused: wrong password for worker %s (try %d of %d)", row[0], row[6] + 1, MAX_FAILS)
        await _fail(row[0], row[6])
        raise _err(401, "bad_login", lang)
    log.warning("PTWH login ok: worker %s", row[0])
    w = await db.fetch_one(f"SELECT {attendance._WORKER_COLS} FROM ptwh_workers WHERE id = %s", (row[0],))
    if w is None or not attendance.is_working(w, _now().date()):
        raise _err(403, "inactive", lang)
    await db.execute("UPDATE ptwh_credentials SET failed_attempts=0, locked_until=NULL, last_login_at=%s WHERE worker_id=%s", (_now(), row[0]))
    return {"token": _sign_token(row[0], row[4]), "name": w[1], "station": w[4], "needs_password_change": row[5] == "station"}


def _record_row(r) -> dict | None:
    """r: id, clock_in, clock_out, in_method, out_method (or None)"""
    if r is None:
        return None
    return {"clock_in": attendance._iso(r[1]), "clock_out": attendance._iso(r[2]), "in_method": r[3], "out_method": r[4]}


@router.get("/api/ptwh-app/me")
async def app_me(s=Depends(_session)):
    w, cred = s
    today = _now().date()
    rec = await db.fetch_one("SELECT id, clock_in, clock_out, in_method, out_method FROM ptwh_attendance WHERE worker_id=%s AND work_date=%s", (w[0], today))
    geo = await _station_geo(w[4])
    return {
        "name": w[1], "station": w[4], "username": cred[1], "needs_password_change": cred[5] == "station",
        "today": str(today), "now": attendance._iso(_now()), "record": _record_row(rec),
        "geo_ready": geo is not None, "radius_m": RADIUS_M, "max_accuracy_m": MAX_GPS_ACCURACY_M,
    }


class AppClock(BaseModel):
    action: str  # 'in' | 'out'
    qr: str | None = None
    lat: float | None = None
    lng: float | None = None
    accuracy: float | None = None
    selfie: str  # base64 JPEG (a data: URL is fine)
    reason: str | None = None  # why the QR code is used (emergency) -- required when the clock is verified by QR


def _decode_selfie(raw: str, lang: str) -> bytes:
    b64 = raw.split(",", 1)[1] if raw.startswith("data:") else raw
    try:
        data = base64.b64decode(b64, validate=False)
    except ValueError:
        raise _err(422, "photo_unreadable", lang)
    if len(data) < 2000 or data[:3] != b"\xff\xd8\xff":
        raise _err(422, "photo_missing", lang)
    if len(data) > SELFIE_MAX_BYTES:
        raise _err(413, "photo_big", lang)
    return data


@router.post("/api/ptwh-app/clock")
async def app_clock(p: AppClock, s=Depends(_session), lang: str = Depends(_lang)):
    w, _cred = s
    if p.action not in ("in", "out"):
        raise _err(422, "bad_action", lang)
    station = w[4]
    # --- proof of being at the station: the phone's location within RADIUS_M of the station (its Premises latitude / longitude). A QR code -- made on request for THIS
    # PTWH, good for QR_TTL_MIN minutes and for one use -- is only an EMERGENCY fallback: it needs a reason and the clock goes to the audit queue as "needs review".
    # If the location is good the QR is ignored (and not used up).
    geo = await _station_geo(station)
    dist, geo_ok, geo_err = None, False, None
    if p.lat is not None and p.lng is not None:
        if geo is None:
            geo_err = _err(422, "geo_not_set", lang)
        else:
            dist = distance_m(p.lat, p.lng, geo[0], geo[1])
            if p.accuracy is not None and p.accuracy > MAX_GPS_ACCURACY_M:
                geo_err = _err(422, "gps_poor", lang, acc=round(p.accuracy))
            elif dist <= RADIUS_M:
                geo_ok = True
            else:
                geo_err = _err(422, "too_far", lang, dist=round(dist), station=station, radius=RADIUS_M)
    reason = (p.reason or "").strip()[:200]
    qr_row = None
    if geo_ok:
        method = "geo"
    elif (p.qr or "").strip():
        qr_row = await _check_qr(station, w[0], p.qr, lang)
        method = "qr"
        if len(reason) < 3:
            raise _err(422, "qr_reason", lang)
    elif geo_err is not None:
        raise geo_err
    else:
        raise _err(422, "no_proof", lang)
    selfie = _decode_selfie(p.selfie, lang)

    now = _now()
    today = now.date()
    rec = await db.fetch_one("SELECT id, clock_in, clock_out, flag_status, flag_note FROM ptwh_attendance WHERE worker_id=%s AND work_date=%s", (w[0], today))
    if p.action == "in" and rec is not None:
        raise _err(409, "already_in", lang)
    if p.action == "out":
        if rec is None:
            raise _err(409, "not_in", lang)
        if rec[2] is not None:
            raise _err(409, "already_out", lang)
    if qr_row is not None:
        await _consume_qr(qr_row[0], lang)  # the code is used up the moment the clock is accepted
    key = storage.safe_key("ptwh", str(today), f"{w[0]}-{p.action}-{uuid.uuid4().hex[:12]}.jpg")
    try:
        await run_in_threadpool(storage.put_bytes, key, selfie, content_type="image/jpeg")
    except Exception:  # noqa: BLE001 -- storage is a network call; nothing is recorded if the photo isn't saved
        log.exception("selfie upload failed")
        if qr_row is not None:  # not their fault: give the code back
            await db.execute("UPDATE ptwh_qr_codes SET status = 'active', used_at = NULL WHERE id = %s AND status = 'used'", (qr_row[0],))
        raise _err(503, "photo_save", lang)
    acc = round(p.accuracy) if p.accuracy is not None else None
    d = round(dist) if dist is not None else None
    why = reason if method == "qr" else None
    qr_note = f"QR clock-{p.action} (emergency): {reason}" + (f" -- code issued by {qr_row[4]}" if qr_row is not None else "")
    if p.action == "in":
        await db.execute(
            """INSERT INTO ptwh_attendance (worker_id, work_date, clock_in, category, source, recorded_by, created_at,
                                            in_method, in_lat, in_lng, in_acc, in_dist, in_selfie, in_reason, flag_status, flag_note, flagged_by, flagged_at)
               VALUES (%s, %s, %s, %s, 'app', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (w[0], today, now, w[8], f"ptwh:{w[0]}", now, method, p.lat, p.lng, acc, d, key, why,
             "review" if why else None, qr_note[:300] if why else None, "system:qr" if why else None, now if why else None),
        )
    else:
        if why:  # a QR clock-out always needs review too (an auditor's flag stays a flag)
            status = "flagged" if rec[3] == "flagged" else "review"
            note = (f"{rec[4]} | {qr_note}" if rec[4] else qr_note)[:300]
            await db.execute(
                """UPDATE ptwh_attendance SET clock_out=%s, edited_by=%s, edited_at=%s, out_method=%s, out_lat=%s, out_lng=%s, out_acc=%s, out_dist=%s, out_selfie=%s,
                          out_reason=%s, flag_status=%s, flag_note=%s, flagged_by=%s, flagged_at=%s WHERE id=%s""",
                (now, f"ptwh:{w[0]}", now, method, p.lat, p.lng, acc, d, key, why, status, note, "system:qr", now, rec[0]),
            )
        else:
            await db.execute(
                """UPDATE ptwh_attendance SET clock_out=%s, edited_by=%s, edited_at=%s, out_method=%s, out_lat=%s, out_lng=%s, out_acc=%s, out_dist=%s, out_selfie=%s
                   WHERE id=%s""",
                (now, f"ptwh:{w[0]}", now, method, p.lat, p.lng, acc, d, key, rec[0]),
            )
    return {"ok": True, "action": p.action, "time": attendance._iso(now), "method": method}


@router.get("/api/ptwh-app/summary")
async def app_summary(month: str | None = None, s=Depends(_session), lang: str = Depends(_lang)):
    """The PTWH's own month: days worked, hours, the pay for each day and the total (before any back pay / deductions)."""
    w, _cred = s
    today = _now().date()
    try:
        y, m = (int(x) for x in (month or today.strftime("%Y-%m")).split("-"))
        first = date(y, m, 1)
    except ValueError:
        raise _err(422, "bad_month", lang)
    nxt = date(y + (m == 12), 1 if m == 12 else m + 1, 1)
    rows = await db.fetch_all(
        "SELECT work_date, clock_in, clock_out, category, in_method, flag_status FROM ptwh_attendance WHERE worker_id=%s AND work_date >= %s AND work_date < %s AND voided = 0 ORDER BY work_date",
        (w[0], first, nxt),
    )
    pending = await attendance._pending_days(first, nxt - timedelta(days=1))
    days, workdays, payable, on_hold = [], 0.0, 0.0, 0.0
    for wd_date, cin, cout, cat, method, flag in rows:
        wd, pay = day_pay(float(w[5]), cin, cout)
        held = attendance.is_held(flag) or (w[0], wd_date) in pending  # a QR clock, a flagged one, or one whose correction is waiting: paid once it has been checked
        workdays += wd
        if held:
            on_hold += pay
        else:
            payable += pay
        h = attendance._hours(cin, cout)
        days.append({"date": str(wd_date), "in": cin.strftime("%H:%M"), "out": cout.strftime("%H:%M") if cout else None,
                     "hours": round(h, 1) if h is not None else None, "workday": wd, "pay": 0.0 if held else pay, "held": held, "held_pay": pay if held else 0.0,
                     "category": cat, "method": method})
    return {"month": first.strftime("%Y-%m"), "daily_rate": float(w[5]), "days": days, "workdays": workdays, "payable": round(payable, 2), "on_hold": round(on_hold, 2),
            "rule": {"half_day_hours": attendance.HALF_DAY_HOURS, "half_day_factor": attendance.HALF_DAY_FACTOR}}


@router.get("/api/ptwh-app/schedule")
async def app_schedule(s=Depends(_session)):
    """My schedule: the next 14 days from the station's schedule (Attendance -> Schedule). Days with no shift are listed with shift = null."""
    w, _cred = s
    times = await work_schedule.station_times(w[4])
    return {"station": w[4], "days": await work_schedule.ptwh_upcoming(w[0], 14, w[4]),
            "shifts": {c: {"label": v[0], "hours": work_schedule.hours_text(times, c)} for c, v in work_schedule.SHIFTS.items()}}


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


def _check_new_password(pw: str, username: str, lang: str) -> None:
    if len(pw) < 8:
        raise _err(422, "pw_short", lang)
    if pw.lower() == username.lower():
        raise _err(422, "pw_same", lang)


@router.post("/api/ptwh-app/change-password")
async def app_change_password(p: ChangePassword, s=Depends(_session), lang: str = Depends(_lang)):
    w, cred = s
    if (e := _locked(cred[7], lang)) is not None:
        raise e
    if not _check_hash(p.old_password, cred[2]):
        await _fail(w[0], cred[6])
        raise _err(401, "pw_wrong", lang)
    _check_new_password(p.new_password, cred[1], lang)
    version = cred[4] + 1
    await db.execute(
        "UPDATE ptwh_credentials SET password_hash=%s, password_set_by='self', cred_version=%s, failed_attempts=0, updated_at=%s WHERE worker_id=%s",
        (_hash(p.new_password), version, _now(), w[0]),
    )
    return {"ok": True, "token": _sign_token(w[0], version)}  # the old session just died with the version bump; this one carries on


class Recover(BaseModel):
    username: str
    recovery_code: str
    new_password: str


@router.post("/api/ptwh-app/recover")
async def app_recover(p: Recover, lang: str = Depends(_lang), _k: None = Depends(_require_app_key)):
    """Forgot the password: the recovery code (given when the login was made) sets a new one, and a fresh recovery code replaces the used one."""
    row = await db.fetch_one(f"SELECT {_CRED_COLS} FROM ptwh_credentials WHERE username = %s", (p.username.strip().lower(),))
    if row is None or row[9]:
        raise _err(401, "bad_recover", lang)
    if (e := _locked(row[7], lang)) is not None:
        raise e
    if not _check_hash(_norm_recovery(p.recovery_code), row[3]):
        await _fail(row[0], row[6])
        raise _err(401, "bad_recover", lang)
    _check_new_password(p.new_password, row[1], lang)
    new_code = _random_recovery()
    await db.execute(
        """UPDATE ptwh_credentials SET password_hash=%s, recovery_hash=%s, password_set_by='self', cred_version=%s, failed_attempts=0, locked_until=NULL, updated_at=%s
           WHERE worker_id=%s""",
        (_hash(p.new_password), _hash(new_code.replace("-", "")), row[4] + 1, _now(), row[0]),
    )
    return {"ok": True, "recovery_code": new_code}


# ---------------------------------------------------------------- dashboard side: logins

async def _worker_for_editor(worker_id: int, user: CurrentUser):
    w = await _worker(worker_id)
    _require_editor(user, w[4])
    if w[9] != "approved":
        raise HTTPException(status_code=409, detail="This PTWH hasn't been approved yet -- the Region Head and then a Manager have to approve the hire first")
    return w


_USERNAME = re.compile(r"[a-z0-9][a-z0-9._-]{2,29}")


class LoginCreate(BaseModel):
    username: str


@admin_router.get("/api/attendance/ptwh/logins")
async def list_logins(user: CurrentUser = Depends(get_current_user)):
    """Which PTWH in scope have an app login (username only -- never the password), so the Workers list can show it."""
    stations = _visible_stations(user)
    rows = await db.fetch_all(
        """SELECT c.worker_id, c.username, c.disabled, c.last_login_at, c.password_set_by, w.station
           FROM ptwh_credentials c JOIN ptwh_workers w ON w.id = c.worker_id"""
    )
    return {"logins": {str(r[0]): {"username": r[1], "disabled": bool(r[2]), "last_login_at": attendance._iso(r[3]), "password_set_by": r[4]} for r in rows if r[5] in stations},
            "can_edit": _can_edit(user), "app_url": os.environ.get("PTWH_APP_URL") or None}


@admin_router.post("/api/attendance/ptwh/workers/{worker_id}/login")
async def create_login(worker_id: int, p: LoginCreate, user: CurrentUser = Depends(get_current_user)):
    """Station sets the first username + password (the PTWH changes the password themselves afterwards). The password and recovery code are shown ONCE."""
    await _worker_for_editor(worker_id, user)
    username = p.username.strip().lower()
    if not _USERNAME.fullmatch(username):
        raise HTTPException(status_code=422, detail="Username: 3-30 letters, numbers, dot, dash or underscore, starting with a letter or number")
    if await db.fetch_one("SELECT worker_id FROM ptwh_credentials WHERE worker_id=%s", (worker_id,)):
        raise HTTPException(status_code=409, detail="This PTWH already has a login")
    if await db.fetch_one("SELECT worker_id FROM ptwh_credentials WHERE username=%s", (username,)):
        raise HTTPException(status_code=409, detail="That username is taken -- try another")
    pw, code = _random_password(), _random_recovery()
    now = _now()
    await db.execute(
        """INSERT INTO ptwh_credentials (worker_id, username, password_hash, recovery_hash, created_by, created_at)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (worker_id, username, _hash(pw), _hash(code.replace("-", "")), user.email, now),
    )
    return {"username": username, "temp_password": pw, "recovery_code": code}


@admin_router.post("/api/attendance/ptwh/workers/{worker_id}/login/reset")
async def reset_login(worker_id: int, user: CurrentUser = Depends(get_current_user)):
    """The PTWH forgot the password and has no recovery code: the station gives a new temporary password (and a new recovery code). Old sessions end."""
    await _worker_for_editor(worker_id, user)
    row = await db.fetch_one("SELECT cred_version FROM ptwh_credentials WHERE worker_id=%s", (worker_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="This PTWH has no login yet")
    pw, code = _random_password(), _random_recovery()
    await db.execute(
        """UPDATE ptwh_credentials SET password_hash=%s, recovery_hash=%s, password_set_by='station', cred_version=%s, failed_attempts=0, locked_until=NULL,
           disabled=0, updated_at=%s WHERE worker_id=%s""",
        (_hash(pw), _hash(code.replace("-", "")), row[0] + 1, _now(), worker_id),
    )
    return {"temp_password": pw, "recovery_code": code}


class DisableIn(BaseModel):
    disabled: bool


@admin_router.post("/api/attendance/ptwh/workers/{worker_id}/login/disable")
async def disable_login(worker_id: int, p: DisableIn, user: CurrentUser = Depends(get_current_user)):
    await _worker_for_editor(worker_id, user)
    row = await db.fetch_one("SELECT cred_version FROM ptwh_credentials WHERE worker_id=%s", (worker_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="This PTWH has no login yet")
    await db.execute("UPDATE ptwh_credentials SET disabled=%s, cred_version=%s, updated_at=%s WHERE worker_id=%s", (1 if p.disabled else 0, row[0] + 1, _now(), worker_id))
    return {"ok": True}


# ---------------------------------------------------------------- dashboard side: station QR (emergency) + where the station is (read-only)

def _require_station_editor(user: CurrentUser, station: str) -> None:
    _require_editor(user, station)


@admin_router.get("/api/attendance/ptwh/station/{station}")
async def station_info(station: str, user: CurrentUser = Depends(get_current_user)):
    """The station screen: where the station is (read-only, from Premises) and the PTWH a QR code can be made for. No QR is shown until one is asked for."""
    _require_station_editor(user, station)
    geo = await _station_geo(station)
    today = _now().date()
    people = [{"id": r[0], "name": r[1]} for r in await db.fetch_all(f"SELECT {attendance._WORKER_COLS} FROM ptwh_workers WHERE station = %s ORDER BY full_name", (station,)) if attendance.is_working(r, today)]
    return {
        "station": station, "geo": {"lat": geo[0], "lng": geo[1], "radius_m": RADIUS_M} if geo else None,  # read-only: set by Fleet Admin in Premises
        "workers": people, "qr_ttl_min": QR_TTL_MIN, "app_url": (os.environ.get("PTWH_APP_URL") or "").rstrip("/") or None,
    }


class QrRequest(BaseModel):
    worker_id: int


@admin_router.post("/api/attendance/ptwh/station/{station}/qr")
async def request_qr(station: str, p: QrRequest, user: CurrentUser = Depends(get_current_user)):
    """Make an emergency QR code for ONE PTWH at this station. It lasts QR_TTL_MIN minutes, works once, and replaces whatever QR the station asked for before.
    Station staff only ask for it when that PTWH's phone location isn't working; the clock it is used for goes to Audit as 'needs review' and its pay is held."""
    _require_station_editor(user, station)
    w = await attendance._worker(p.worker_id)
    if w[4] != station or not attendance.is_working(w, _now().date()):
        raise HTTPException(status_code=409, detail="That PTWH isn't working at this station")
    now = _now()
    await db.execute("UPDATE ptwh_qr_codes SET status = 'superseded' WHERE station = %s AND status = 'active'", (station,))
    code = secrets.token_hex(5)
    expires = now + timedelta(minutes=QR_TTL_MIN)
    await db.execute(
        "INSERT INTO ptwh_qr_codes (station, worker_id, code, status, issued_by, issued_at, expires_at) VALUES (%s, %s, %s, 'active', %s, %s, %s)",
        (station, w[0], code, user.email, now, expires),
    )
    base = (os.environ.get("PTWH_APP_URL") or "").rstrip("/")
    return {"code": code, "url": f"{base}/?s={quote(station)}&c={code}" if base else None, "expires_at": attendance._iso(expires),
            "expires_in": QR_TTL_MIN * 60, "worker": {"id": w[0], "name": w[1]}}


# ---------------------------------------------------------------- dashboard side: audit

@admin_router.get("/api/attendance/ptwh/audit")
async def audit(from_: str | None = None, to: str | None = None, station: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """Clock events made in the PTWH app with how each was verified and the selfie -- for everyone whose scope covers the station."""
    today = _now().date()
    d_to = attendance._parse_date(to, today)
    d_from = attendance._parse_date(from_, d_to - timedelta(days=6))
    if (d_to - d_from).days > 62:
        raise HTTPException(status_code=422, detail="Pick at most 2 months at a time")
    stations = _visible_stations(user)
    rows = await db.fetch_all(
        """SELECT a.id, a.work_date, w.full_name, w.station, a.clock_in, a.clock_out, a.in_method, a.in_dist, a.in_acc, a.in_selfie,
                  a.out_method, a.out_dist, a.out_acc, a.out_selfie, a.in_lat, a.in_lng, a.out_lat, a.out_lng,
                  a.flag_status, a.flag_note, a.flagged_by, a.flagged_at, a.selfie_purged, a.in_reason, a.out_reason, a.voided
           FROM ptwh_attendance a JOIN ptwh_workers w ON w.id = a.worker_id
           WHERE a.source = 'app' AND a.work_date >= %s AND a.work_date <= %s ORDER BY a.work_date DESC, w.station, w.full_name""",
        (d_from, d_to),
    )
    out = []
    for r in rows:
        if r[3] not in stations or (station and r[3] != station):
            continue
        out.append({
            "id": r[0], "date": str(r[1]), "name": r[2], "station": r[3], "clock_in": attendance._iso(r[4]), "clock_out": attendance._iso(r[5]),
            "in": {"method": r[6], "reason": r[23], "dist": r[7], "acc": r[8], "photo": bool(r[9]), "lat": float(r[14]) if r[14] is not None else None, "lng": float(r[15]) if r[15] is not None else None},
            "out": {"method": r[10], "reason": r[24], "dist": r[11], "acc": r[12], "photo": bool(r[13]), "lat": float(r[16]) if r[16] is not None else None, "lng": float(r[17]) if r[17] is not None else None},
            "flag": {"status": r[18], "note": r[19], "by": r[20], "at": attendance._iso(r[21])} if r[18] else None,
            "purged": bool(r[22]), "voided": bool(r[25]),
        })
    return {"from": str(d_from), "to": str(d_to), "events": out[:1000], "stations": sorted(stations), "retention_days": SELFIE_RETENTION_DAYS, "qr_retention_days": QR_RETENTION_DAYS}


@admin_router.get("/api/attendance/ptwh/photo/{record_id}/{which}")
async def photo(record_id: int, which: str, user: CurrentUser = Depends(get_current_user)):
    if which not in ("in", "out"):
        raise HTTPException(status_code=404, detail="Not found")
    row = await db.fetch_one(
        f"SELECT w.station, a.{which}_selfie FROM ptwh_attendance a JOIN ptwh_workers w ON w.id = a.worker_id WHERE a.id = %s", (record_id,)
    )
    if row is None or not row[1]:
        raise HTTPException(status_code=404, detail="No photo")
    if row[0] not in _visible_stations(user):
        raise HTTPException(status_code=403, detail="That station is outside your scope")
    try:
        data = await run_in_threadpool(storage.get_bytes, row[1])
    except Exception:  # noqa: BLE001
        log.exception("selfie read failed")
        raise HTTPException(status_code=404, detail="The photo could not be loaded")
    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})


# ---------------------------------------------------------------- dashboard side: flag a suspicious clock event

class FlagIn(BaseModel):
    status: str | None = None  # 'flagged' (suspicious, needs a note) | 'ok' (checked, fine) | None = put back to unreviewed
    note: str | None = None


@admin_router.post("/api/attendance/ptwh/audit/{record_id}/flag")
async def flag_event(record_id: int, p: FlagIn, user: CurrentUser = Depends(get_current_user)):
    """An auditor (anyone whose scope covers the station) flags a clock event as suspicious, marks it checked OK, or clears the mark. Who and when are kept.
    A flagged event -- and any QR (emergency) clock waiting for review -- keeps its selfies past the retention period until it is cleared or marked OK."""
    row = await db.fetch_one("SELECT w.station, a.flag_status, a.clock_out FROM ptwh_attendance a JOIN ptwh_workers w ON w.id = a.worker_id WHERE a.id = %s", (record_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="Record not found")
    if row[2] is None:
        raise HTTPException(status_code=409, detail="This day can be reviewed once the PTWH has clocked out -- there is only a clock-in so far")
    if row[0] not in _visible_stations(user):
        raise HTTPException(status_code=403, detail="That station is outside your scope")
    if p.status not in (None, "flagged", "ok"):
        raise HTTPException(status_code=422, detail="Status is flagged, ok or empty")
    if p.status is None and row[1] == "review":
        raise HTTPException(status_code=422, detail="A QR clock-in has to be marked Checked OK or flagged -- it can't be left unreviewed")
    note = (p.note or "").strip()[:300]
    if p.status == "flagged" and len(note) < 3:
        raise HTTPException(status_code=422, detail="Say why you are flagging it")
    if p.status is None:
        await db.execute("UPDATE ptwh_attendance SET flag_status=NULL, flag_note=NULL, flagged_by=NULL, flagged_at=NULL WHERE id=%s", (record_id,))
    else:
        await db.execute("UPDATE ptwh_attendance SET flag_status=%s, flag_note=%s, flagged_by=%s, flagged_at=%s WHERE id=%s",
                         (p.status, note or None, user.email, _now(), record_id))
    return {"ok": True}


# ---------------------------------------------------------------- selfie retention + the review alert

async def _delete_selfies(rows) -> int:
    """Delete the stored photos of these (id, in_selfie, out_selfie) rows and mark them purged. A photo that can't be deleted is left and tried again next time."""
    done = 0
    for rec_id, k_in, k_out in rows:
        try:
            for key in (k_in, k_out):
                if key:
                    await run_in_threadpool(storage.delete, key)
        except Exception:  # noqa: BLE001
            log.exception("selfie delete failed for record %s", rec_id)
            continue
        await db.execute("UPDATE ptwh_attendance SET in_selfie=NULL, out_selfie=NULL, selfie_purged=1 WHERE id=%s", (rec_id,))
        done += 1
    return done


async def purge_old_selfies() -> None:
    """Delete old selfies from storage (the audit facts -- time, method, distance, reason -- stay). Called by the refresh loop; never raises.
      * a normal (location) clock: after SELFIE_RETENTION_DAYS (14 days), checked on every refresh;
      * a QR (emergency) clock: after QR_RETENTION_DAYS (5 weeks), and only in week 2 of the month (the 8th-14th) -- the QR evidence is cleared once a month;
      * never while the clock is flagged or still waiting for review: that evidence is kept until an auditor has dealt with it."""
    try:
        today = _now().date()
        base = """SELECT id, in_selfie, out_selfie FROM ptwh_attendance
                  WHERE work_date < %s AND (in_selfie IS NOT NULL OR out_selfie IS NOT NULL) AND (flag_status IS NULL OR flag_status NOT IN ('flagged', 'review'))"""
        n = await _delete_selfies(await db.fetch_all(
            base + " AND COALESCE(in_method, '') <> 'qr' AND COALESCE(out_method, '') <> 'qr' LIMIT 200", (today - timedelta(days=SELFIE_RETENTION_DAYS),)))
        if today.day in QR_PURGE_DAYS:
            n += await _delete_selfies(await db.fetch_all(base + " LIMIT 200", (today - timedelta(days=QR_RETENTION_DAYS),)))
        if n:
            log.info("PTWH selfies purged for %d records", n)
    except Exception:  # noqa: BLE001 -- housekeeping must never take the refresh loop down
        log.exception("PTWH selfie purge failed")


async def review_count(user: CurrentUser) -> int:
    """How many QR (emergency) clocks -- clocked in AND out -- in the stations this person looks after are waiting for review -- the number in the app's alert. Only the people who
    can act on it are told: Station Heads, Region Heads, Managers / HOD and the Superadmin."""
    if user.position not in REVIEW_ALERT_POSITIONS:
        return 0
    stations = _visible_stations(user)
    rows = await db.fetch_all(
        "SELECT w.station FROM ptwh_attendance a JOIN ptwh_workers w ON w.id = a.worker_id WHERE a.flag_status = 'review' AND a.clock_out IS NOT NULL"
    )
    return sum(1 for (st,) in rows if st in stations)


async def housekeeping_workers() -> None:
    """Daily housekeeping on the PTWH list (called by the refresh loop, never raises):
      1. a PTWH whose END DATE has passed goes inactive;
      2. an approved PTWH with no clock in / out for AUTO_INACTIVE_DAYS (30) goes inactive -- counted from their last clock, or from their approval if they never clocked;
      3. CLEANUP_DAYS (60) after going inactive, their personal data is cleared: IC, phone, selfies, app login and schedule go; name, station, rate and pay history stay.
    Inactive means: no clocking, no app login, off the schedule. Coming back is a Re-hire (approval again)."""
    try:
        today = _now().date()

        async def make_inactive(ids, reason):
            for (wid,) in ids:
                await db.execute("UPDATE ptwh_workers SET active = 0, inactive_since = %s, inactive_reason = %s, updated_at = %s WHERE id = %s", (today, reason, _now(), wid))
                await db.execute("DELETE FROM schedule_entries WHERE person_type = 'ptwh' AND person_ref = %s AND work_date >= %s", (str(wid), today))

        ended = await db.fetch_all("SELECT id FROM ptwh_workers WHERE active = 1 AND end_date IS NOT NULL AND end_date < %s", (today,))
        await make_inactive(ended, "End date passed")
        idle = await db.fetch_all(
            """SELECT w.id FROM ptwh_workers w WHERE w.active = 1 AND w.approval_status = 'approved'
               AND COALESCE((SELECT MAX(a.work_date) FROM ptwh_attendance a WHERE a.worker_id = w.id AND a.voided = 0), DATE(w.mgr_at), DATE(w.created_at)) < %s""",
            (today - timedelta(days=attendance.AUTO_INACTIVE_DAYS),),
        )
        await make_inactive(idle, f"No clock in or out for {attendance.AUTO_INACTIVE_DAYS} days")
        due = await db.fetch_all(
            """SELECT id FROM ptwh_workers WHERE cleaned_at IS NULL AND active = 0 AND inactive_since IS NOT NULL AND inactive_since < %s
               AND approval_status IN ('approved', 'rejected')""",
            (today - timedelta(days=attendance.CLEANUP_DAYS),),
        )
        for (wid,) in due:
            rows = await db.fetch_all("SELECT id, in_selfie, out_selfie FROM ptwh_attendance WHERE worker_id = %s AND (in_selfie IS NOT NULL OR out_selfie IS NOT NULL)", (wid,))
            if await _delete_selfies(rows) < len(rows):
                continue  # a photo couldn't be deleted: try this person again next time
            await db.execute("DELETE FROM ptwh_credentials WHERE worker_id = %s", (wid,))
            await db.execute("DELETE FROM schedule_entries WHERE person_type = 'ptwh' AND person_ref = %s", (str(wid),))
            await db.execute("UPDATE ptwh_workers SET ic_no = NULL, phone = NULL, cleaned_at = %s, updated_at = %s WHERE id = %s", (_now(), _now(), wid))
        if ended or idle or due:
            log.info("PTWH housekeeping: %d ended, %d idle, %d cleaned up", len(ended), len(idle), len(due))
    except Exception:  # noqa: BLE001 -- housekeeping must never take the refresh loop down
        log.exception("PTWH housekeeping failed")
