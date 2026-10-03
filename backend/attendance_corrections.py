"""Controlled changes to PTWH clock records (2026-10-04, staging).

Before, station staff could type any clock-in / clock-out time for a PTWH, or delete a record, straight from Today / Month sheet -- so a clock-out could be stretched or a day
removed and the pay changed with nothing to show for it. Now NOTHING edits a clock record directly. Every change is a CORRECTION REQUEST with a reason, kept for good
(old and new times, who asked, who decided) in ptwh_corrections:

  * limits on every request: a shift is at most MAX_SHIFT_HOURS (12) long, nothing in the future, and only this month -- or last month until the 5th (payroll close);
  * a small change -- both times within AUTO_MINUTES (30) of the ORIGINAL times (so many small nudges can't add up) on a record the station keyed -- is applied at once and logged;
  * anything bigger, a missing day, filling a missing clock-out, or closing an app-clocked day (the app's clock-in can't move, and an app clock-out can't be changed at all)
    waits for a Region Head, an RFS, a Manager / HOD or the Superadmin -- not the person who asked (except the Superadmin);
  * while a correction waits, that day's pay is ON HOLD (attendance._pending_days);
  * a record is never deleted: it can only be VOIDED (with a reason and the same approval), and a voided record stays visible in the history.
"""
import logging
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import attendance
import db
from attendance import _now, _require_editor, _visible_stations
from auth import CurrentUser, get_current_user

log = logging.getLogger("attendance_corrections")
router = APIRouter()

MAX_SHIFT_HOURS = 12
AUTO_MINUTES = 30
APPROVER_POSITIONS = ("region_head", "rfs", "hod", "manager", "admin")


def _at(day: date, hhmm: str) -> datetime:
    try:
        h, m = hhmm.split(":")[:2]
        return datetime(day.year, day.month, day.day, int(h), int(m))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=422, detail="Times look like 08:30")


def _window_ok(day: date, today: date) -> bool:
    """This month, or last month until the 5th (while last month's pay is still being closed)."""
    if day > today:
        return False
    if (day.year, day.month) == (today.year, today.month):
        return True
    last = (today.replace(day=1) - timedelta(days=1))
    return (day.year, day.month) == (last.year, last.month) and today.day <= 5


def can_decide(user: CurrentUser, station: str, requested_by: str) -> bool:
    if user.position not in APPROVER_POSITIONS or station not in _visible_stations(user):
        return False
    return user.position == "admin" or user.email.lower() != (requested_by or "").lower()  # nobody approves their own request


def _hm(dt: datetime | None) -> str | None:
    return dt.strftime("%H:%M") if dt else None


class CorrectionIn(BaseModel):
    worker_id: int
    work_date: str
    kind: str = "edit"  # 'edit' (also adds a missing day / closes a missing clock-out) | 'void'
    clock_in: str | None = None  # HH:MM
    clock_out: str | None = None  # HH:MM
    reason: str


@router.post("/api/attendance/ptwh/corrections")
async def request_correction(p: CorrectionIn, user: CurrentUser = Depends(get_current_user)):
    """Ask to change (or void) one day's clock record. Small changes to a station-keyed record are applied at once and logged; the rest wait for approval."""
    w = await attendance._worker(p.worker_id)
    _require_editor(user, w[4])
    if p.kind not in ("edit", "void"):
        raise HTTPException(status_code=422, detail="Kind is edit or void")
    now = _now()
    today = now.date()
    day = attendance._parse_date(p.work_date, today)
    reason = (p.reason or "").strip()[:300]
    if len(reason) < 5:
        raise HTTPException(status_code=422, detail="Give the reason -- a few words on what went wrong")
    if not _window_ok(day, today):
        raise HTTPException(status_code=422, detail="Corrections are for this month, or last month until the 5th. Ask a Manager for anything older")
    if await db.fetch_one("SELECT id FROM ptwh_corrections WHERE worker_id = %s AND work_date = %s AND status = 'pending'", (w[0], day)):
        raise HTTPException(status_code=409, detail="A correction for that day is already waiting for approval")
    rec = await db.fetch_one("SELECT id, clock_in, clock_out, source, voided FROM ptwh_attendance WHERE worker_id = %s AND work_date = %s", (w[0], day))

    async def log_row(status, record_id, old_in, old_out, new_in, new_out, auto=0, decided_by=None):
        await db.execute(
            """INSERT INTO ptwh_corrections (kind, worker_id, work_date, record_id, old_in, old_out, new_in, new_out, reason, status, auto_applied, requested_by, requested_at, decided_by, decided_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (p.kind, w[0], day, record_id, old_in, old_out, new_in, new_out, reason, status, auto, user.email, now, decided_by, now if decided_by else None),
        )

    if p.kind == "void":
        if rec is None or rec[4]:
            raise HTTPException(status_code=409, detail="There is no clock record to void on that day")
        await log_row("pending", rec[0], rec[1], rec[2], None, None)
        return {"status": "pending", "message": "Sent for approval: a Region Head, RFS or Manager has to approve a void. The day's pay is on hold until then."}

    if not p.clock_in:
        raise HTTPException(status_code=422, detail="Give the clock-in time")
    cin = _at(day, p.clock_in)
    cout = _at(day, p.clock_out) if p.clock_out else None
    if cin > now or (cout is not None and cout > now):
        raise HTTPException(status_code=422, detail="A clock time can't be in the future")
    if cout is not None:
        if cout <= cin:
            raise HTTPException(status_code=422, detail="Clock out has to be after clock in")
        if (cout - cin) > timedelta(hours=MAX_SHIFT_HOURS):
            raise HTTPException(status_code=422, detail=f"A shift can't be longer than {MAX_SHIFT_HOURS} hours")
    pending_msg = "Sent for approval: a Region Head, RFS or Manager has to approve this. The day's pay is on hold until then."
    if rec is None:  # a day nobody clocked
        if cout is None:
            raise HTTPException(status_code=422, detail="For a missing day give both the clock-in and the clock-out")
        await log_row("pending", None, None, None, cin, cout)
        return {"status": "pending", "message": pending_msg}
    if rec[4]:
        raise HTTPException(status_code=409, detail="That day's record was voided. Ask a Manager if it should be brought back")
    if rec[3] == "app":
        # Clocked by the PTWH in the app with a selfie: the app's times are evidence, so they can't be edited -- only a missing clock-out can be filled in (always approved).
        if rec[2] is not None:
            raise HTTPException(status_code=422, detail="This day was clocked in the app, so its times can't be changed. If the record is wrong, ask for a void")
        if cin.replace(second=0, microsecond=0) != rec[1].replace(second=0, microsecond=0):
            raise HTTPException(status_code=422, detail="The app's clock-in time can't be changed -- only the missing clock-out can be filled in")
        if cout is None:
            raise HTTPException(status_code=422, detail="Give the clock-out time to close the day")
        await log_row("pending", rec[0], rec[1], None, rec[1], cout)
        return {"status": "pending", "message": pending_msg}
    # A record the station keyed.
    if rec[2] is not None and cout is None:
        raise HTTPException(status_code=422, detail="A clock-out can't be removed")
    if rec[2] is None:  # filling a missing clock-out
        await log_row("pending", rec[0], rec[1], None, cin, cout)
        return {"status": "pending", "message": pending_msg}
    # Compare with the ORIGINAL times of this record (before any earlier correction), so a chain of small changes can't add up to a big one.
    first = await db.fetch_one("SELECT old_in, old_out FROM ptwh_corrections WHERE record_id = %s AND old_in IS NOT NULL AND old_out IS NOT NULL ORDER BY id LIMIT 1", (rec[0],))
    base_in, base_out = (first[0], first[1]) if first else (rec[1], rec[2])
    limit = timedelta(minutes=AUTO_MINUTES)
    if abs(cin - base_in) <= limit and abs(cout - base_out) <= limit:
        await db.execute("UPDATE ptwh_attendance SET clock_in = %s, clock_out = %s, edited_by = %s, edited_at = %s WHERE id = %s", (cin, cout, user.email, now, rec[0]))
        await log_row("applied", rec[0], rec[1], rec[2], cin, cout, auto=1, decided_by="auto")
        return {"status": "applied", "message": f"Done -- within {AUTO_MINUTES} minutes of the original, so it was applied and logged."}
    await log_row("pending", rec[0], rec[1], rec[2], cin, cout)
    return {"status": "pending", "message": f"That is more than {AUTO_MINUTES} minutes from the original time, so it needs approval from a Region Head, RFS or Manager. The day's pay is on hold until then."}


_COLS = """c.id, c.kind, c.worker_id, w.full_name, w.station, c.work_date, c.old_in, c.old_out, c.new_in, c.new_out, c.reason, c.status, c.auto_applied,
           c.requested_by, c.requested_at, c.decided_by, c.decided_at, c.decision_note"""


@router.get("/api/attendance/ptwh/corrections")
async def list_corrections(month: str | None = None, status: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """Correction requests and their history for the stations in the caller's scope (this month and last by default)."""
    today = _now().date()
    if month:
        try:
            y, m = (int(x) for x in month.split("-"))
            lo, hi = date(y, m, 1), date(y + (m == 12), 1 if m == 12 else m + 1, 1)
        except ValueError:
            raise HTTPException(status_code=422, detail="Months look like 2026-10")
    else:
        lo, hi = (today.replace(day=1) - timedelta(days=1)).replace(day=1), today + timedelta(days=1)
    stations = _visible_stations(user)
    rows = await db.fetch_all(
        f"SELECT {_COLS} FROM ptwh_corrections c JOIN ptwh_workers w ON w.id = c.worker_id WHERE c.work_date >= %s AND c.work_date < %s ORDER BY c.id DESC", (lo, hi)
    )
    out = []
    for r in rows:
        if r[4] not in stations or (status and r[11] != status):
            continue
        out.append({
            "id": r[0], "kind": "void" if r[1] == "void" else ("add" if r[6] is None and r[7] is None else "edit"), "worker_id": r[2], "name": r[3], "station": r[4], "date": str(r[5]),
            "old_in": _hm(r[6]), "old_out": _hm(r[7]), "new_in": _hm(r[8]), "new_out": _hm(r[9]), "reason": r[10], "status": r[11], "auto": bool(r[12]),
            "requested_by": r[13], "requested_at": attendance._iso(r[14]), "decided_by": r[15], "decided_at": attendance._iso(r[16]), "note": r[17],
            "can_decide": r[11] == "pending" and can_decide(user, r[4], r[13]),
        })
    return {"corrections": out[:500], "max_shift_hours": MAX_SHIFT_HOURS, "auto_minutes": AUTO_MINUTES}


class CorrectionDecision(BaseModel):
    decision: str  # 'approve' | 'reject'
    note: str | None = None


@router.post("/api/attendance/ptwh/corrections/{correction_id}/decision")
async def decide_correction(correction_id: int, p: CorrectionDecision, user: CurrentUser = Depends(get_current_user)):
    """A Region Head / RFS / Manager / HOD (or the Superadmin -- never the person who asked) approves or rejects a correction. Approving applies it."""
    if p.decision not in ("approve", "reject"):
        raise HTTPException(status_code=422, detail="Decision is approve or reject")
    row = await db.fetch_one(
        "SELECT c.kind, c.worker_id, c.work_date, c.record_id, c.new_in, c.new_out, c.status, c.requested_by, w.station, w.category FROM ptwh_corrections c JOIN ptwh_workers w ON w.id = c.worker_id WHERE c.id = %s",
        (correction_id,),
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Correction not found")
    kind, worker_id, day, record_id, new_in, new_out, status, requested_by, station, category = row
    if status != "pending":
        raise HTTPException(status_code=409, detail="This correction has already been decided")
    if not can_decide(user, station, requested_by):
        raise HTTPException(status_code=403, detail="A Region Head, RFS or Manager (not the person who asked) approves clock corrections")
    note = (p.note or "").strip()[:300]
    now = _now()
    if p.decision == "reject":
        if len(note) < 3:
            raise HTTPException(status_code=422, detail="Say why you are rejecting")
        await db.execute("UPDATE ptwh_corrections SET status = 'rejected', decided_by = %s, decided_at = %s, decision_note = %s WHERE id = %s", (user.email, now, note, correction_id))
        return {"ok": True}
    if kind == "void":
        await db.execute("UPDATE ptwh_attendance SET voided = 1, edited_by = %s, edited_at = %s WHERE id = %s", (user.email, now, record_id))
    elif record_id:
        await db.execute("UPDATE ptwh_attendance SET clock_in = %s, clock_out = %s, edited_by = %s, edited_at = %s, out_method = COALESCE(out_method, 'manual') WHERE id = %s",
                         (new_in, new_out, user.email, now, record_id))
    else:
        if await db.fetch_one("SELECT id FROM ptwh_attendance WHERE worker_id = %s AND work_date = %s", (worker_id, day)):
            raise HTTPException(status_code=409, detail="Someone has clocked that day since the request -- ask for a new correction")
        await db.execute(
            """INSERT INTO ptwh_attendance (worker_id, work_date, clock_in, clock_out, category, source, note, recorded_by, created_at)
               VALUES (%s, %s, %s, %s, %s, 'station', %s, %s, %s)""",
            (worker_id, day, new_in, new_out, category, "Added by approved correction", requested_by, now),
        )
    await db.execute("UPDATE ptwh_corrections SET status = 'approved', decided_by = %s, decided_at = %s, decision_note = %s WHERE id = %s", (user.email, now, note or None, correction_id))
    return {"ok": True}


async def pending_count(user: CurrentUser) -> int:
    """Corrections waiting for THIS person's decision -- the number in the Attendance alert."""
    if user.position not in APPROVER_POSITIONS:
        return 0
    rows = await db.fetch_all("SELECT w.station, c.requested_by FROM ptwh_corrections c JOIN ptwh_workers w ON w.id = c.worker_id WHERE c.status = 'pending'")
    return sum(1 for st, by in rows if can_decide(user, st, by))
