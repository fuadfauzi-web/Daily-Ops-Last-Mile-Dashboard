"""Task List (2026-09-25): Email / Gchat follow-ups, To Do List and Task Assigned.

Urgent TN, the fourth Task List sub-tab, predates this and lives in main.py (urgent_tn_items).
Everything here is scoped to people, not stations: a row is visible only to the person who owns
it and, where there is one, the person it was assigned to. Tables: V32 / V33 migrations.

  Email / Gchat  a message the owner wants to chase again (subject, contact, link, due date + optional
                 time); optionally a PIC -- another dashboard user asked to help reply / remind. The
                 PIC acknowledges and can type a reply; the owner marks it done.
  To Do List     the owner's private tracker: title, details, due date, progress 0-100, and an
                 optional reminder time.
  Task Assigned  the owner gives a task to one or more other users (one row per assignee); each
                 assignee sets Open / In progress / Done and can reply. The owner can edit, reopen or
                 remove a row (removing deletes it for that assignee too).

Due-date reminders (all three): an open item with a due date rings the tab's bell on a schedule until
the person dismisses it -- items due within NEAR_DAYS (or overdue): 10am, 2pm and 5pm Malaysia time
every day; later ones: once a day at 2pm. A slot only counts if it falls after the item was created,
and dismissing ("Got it") quiets that item until the next slot. Separately, an amber dot shows while
an open item of yours is due within NEAR_DAYS (see notification_counts).
"""
from datetime import date, datetime, time as dtime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user

router = APIRouter()

_MYT = timezone(timedelta(hours=8))
CHANNELS = ("email", "gchat")
# "Approaching": due within this many days (or already overdue). Drives both the amber dot and which
# reminder schedule an item is on.
NEAR_DAYS = 2
NEAR_SLOTS = (10, 14, 17)  # hours, Malaysia time
FAR_SLOTS = (14,)


class Ok(BaseModel):
    ok: bool
    detail: str | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _now_myt() -> datetime:
    return datetime.now(_MYT)


def _today() -> date:
    return _now_myt().date()


def _iso(value) -> str | None:
    if value is None:
        return None
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _day(value) -> str | None:
    """A DATE column as 'yyyy-mm-dd' (asyncmy gives a date; other drivers a string)."""
    if value is None:
        return None
    return value.isoformat()[:10] if hasattr(value, "isoformat") else str(value)[:10]


def _time_str(value) -> str | None:
    """A TIME column as 'HH:MM' (asyncmy gives a timedelta, other drivers a time or a string)."""
    if value is None:
        return None
    if isinstance(value, timedelta):
        secs = int(value.total_seconds())
        return f"{secs // 3600 % 24:02d}:{secs // 60 % 60:02d}"
    if isinstance(value, dtime):
        return value.strftime("%H:%M")
    return str(value)[:5]


def _parse_day(value: str | None) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        raise HTTPException(status_code=422, detail="Due date must look like 2026-09-30")


def _parse_time(value: str | None) -> str | None:
    """'HH:MM' -> 'HH:MM:00' for the TIME column, or None for blank."""
    value = (value or "").strip()
    if not value:
        return None
    try:
        parsed = dtime.fromisoformat(value[:5])
    except ValueError:
        raise HTTPException(status_code=422, detail="Due time must look like 19:00")
    return parsed.strftime("%H:%M:00")


def _parse_when(value: str | None) -> datetime | None:
    """A reminder time sent by the browser as an ISO string -> naive UTC (how DATETIMEs are stored)."""
    value = (value or "").strip()
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=422, detail="Reminder time isn't a valid date and time")
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc)
    return parsed.replace(tzinfo=timezone.utc, microsecond=0)


def _aware(value):
    return value.replace(tzinfo=timezone.utc) if value is not None and value.tzinfo is None else value


def _text(value: str | None, limit: int, what: str, required: bool = False) -> str | None:
    value = (value or "").strip()
    if not value:
        if required:
            raise HTTPException(status_code=422, detail=f"{what} can't be empty")
        return None
    if len(value) > limit:
        raise HTTPException(status_code=422, detail=f"{what} is too long (max {limit} characters)")
    return value


def _due_state(due_s: str | None, time_s: str | None, is_open: bool) -> tuple[bool, bool]:
    """(overdue, due_today) for an open item; a due time makes today's item overdue once it has passed."""
    if not due_s or not is_open:
        return False, False
    now = _now_myt()
    today = now.date().isoformat()
    if due_s < today:
        return True, False
    if due_s == today:
        if time_s and time_s < now.strftime("%H:%M"):
            return True, False
        return False, True
    return False, False


def _days_until(due_s: str) -> int:
    return (date.fromisoformat(due_s) - _today()).days


def _check_time_needs_date(due_s, time_s):
    if time_s and not due_s:
        raise HTTPException(status_code=422, detail="Pick a due date to go with the time")


async def _resolve_user(email: str | None, what: str = "That person") -> tuple[str, str | None]:
    """(stored email, display name) of a dashboard user, or a 422 if they aren't one."""
    email = (email or "").strip()
    row = await db.fetch_one("SELECT email, display_name FROM users WHERE LOWER(email) = %s", (email.lower(),))
    if row is None:
        raise HTTPException(status_code=422, detail=f"{what} ({email}) isn't in the user list -- ask an admin to add them first")
    return row[0], row[1]


async def _name_of(email: str | None) -> str | None:
    if not email:
        return None
    row = await db.fetch_one("SELECT display_name FROM users WHERE LOWER(email) = %s", (email.lower(),))
    return row[0] if row else None


# ---------------------------------------------------------------------------------------------- reminders

def _latest_slot(now: datetime, near: bool) -> datetime | None:
    """The most recent scheduled reminder time at or before `now` (today's, else yesterday's)."""
    hours = sorted(NEAR_SLOTS if near else FAR_SLOTS, reverse=True)
    for back in (0, 1):
        d = now.date() - timedelta(days=back)
        for h in hours:
            slot = datetime(d.year, d.month, d.day, h, 0, tzinfo=_MYT)
            if slot <= now:
                return slot
    return None


def _reminder_active(due_s: str | None, created_at, is_open: bool, acked_at) -> bool:
    """Is the scheduled due-date reminder ringing for this item right now (for one person)?"""
    if not due_s or not is_open:
        return False
    slot = _latest_slot(_now_myt(), near=_days_until(due_s) <= NEAR_DAYS)
    if slot is None:
        return False
    slot_utc = slot.astimezone(timezone.utc)
    if created_at is not None and _aware(created_at) >= slot_utc:
        return False  # made after this slot -- the next one is its first reminder
    return acked_at is None or _aware(acked_at) < slot_utc


async def _acks_for(user_email: str) -> dict[tuple[str, int], datetime]:
    rows = await db.fetch_all("SELECT kind, item_id, acked_at FROM due_reminder_acks WHERE LOWER(user_email) = %s", (user_email.lower(),))
    return {(r[0], r[1]): r[2] for r in rows}


async def _forget_acks(kind: str, item_id: int) -> None:
    await db.execute("DELETE FROM due_reminder_acks WHERE kind = %s AND item_id = %s", (kind, item_id))


class ReminderAck(BaseModel):
    kind: str  # 'followup' | 'todo' | 'task'
    id: int


@router.post("/api/reminders/ack", response_model=Ok)
async def ack_reminder(p: ReminderAck, user: CurrentUser = Depends(get_current_user)):
    """"Got it": quiet this item's scheduled reminder for me until the next slot."""
    me = user.email.lower()
    if p.kind == "followup":
        row = await db.fetch_one("SELECT created_by, helper_email FROM followups WHERE id = %s", (p.id,))
        ok = row is not None and (row[0].lower() == me or (row[1] or "").lower() == me)
    elif p.kind == "todo":
        row = await db.fetch_one("SELECT owner FROM todos WHERE id = %s", (p.id,))
        ok = row is not None and row[0].lower() == me
    elif p.kind == "task":
        row = await db.fetch_one("SELECT created_by, assignee_email FROM assigned_tasks WHERE id = %s", (p.id,))
        ok = row is not None and (row[0].lower() == me or row[1].lower() == me)
    else:
        raise HTTPException(status_code=422, detail="kind must be followup, todo or task")
    if not ok:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.execute("DELETE FROM due_reminder_acks WHERE LOWER(user_email) = %s AND kind = %s AND item_id = %s", (me, p.kind, p.id))
    await db.execute(
        "INSERT INTO due_reminder_acks (user_email, kind, item_id, acked_at) VALUES (%s, %s, %s, %s)", (user.email, p.kind, p.id, _now())
    )
    return {"ok": True}


# =====================================================================================================
# Email / Gchat follow-ups
# =====================================================================================================

class FollowUpIn(BaseModel):
    channel: str = "email"
    subject: str
    contact: str | None = None
    link: str | None = None
    note: str | None = None
    due_date: str | None = None
    due_time: str | None = None
    helper_email: str | None = None


class FollowUpUpdate(BaseModel):
    # owner
    status: str | None = None  # 'open' | 'done'
    channel: str | None = None
    subject: str | None = None
    contact: str | None = None
    link: str | None = None
    note: str | None = None
    due_date: str | None = None
    due_time: str | None = None  # '' clears the time
    clear_due: bool = False
    helper_email: str | None = None
    clear_helper: bool = False
    # helper
    ack: bool = False
    helper_reply: str | None = None


class FollowUp(BaseModel):
    id: int
    channel: str
    subject: str
    contact: str | None
    link: str | None
    note: str | None
    due_date: str | None
    due_time: str | None
    status: str
    created_by: str
    created_by_me: bool
    is_helper: bool
    helper_email: str | None
    helper_name: str | None
    helper_acknowledged: bool
    helper_reply: str | None
    helper_replied_at: str | None
    owner_unseen: bool
    overdue: bool
    due_today: bool
    reminder_active: bool
    created_at: str
    done_at: str | None


_FU = (
    "id, created_by, channel, subject, contact, link, note, due_date, due_time, status, helper_email, helper_ack_at, "
    "helper_reply, helper_replied_at, owner_unseen, created_at, done_at"
)


@router.get("/api/followups", response_model=list[FollowUp])
async def list_followups(user: CurrentUser = Depends(get_current_user)):
    me = user.email.lower()
    rows = await db.fetch_all(
        f"""SELECT {_FU} FROM followups WHERE LOWER(created_by) = %s OR LOWER(helper_email) = %s
            ORDER BY (status = 'done'), (due_date IS NULL), due_date, due_time, created_at DESC""",
        (me, me),
    )
    acks = await _acks_for(me)
    names: dict[str, str | None] = {}
    out = []
    for (fid, created_by, channel, subject, contact, link, note, due, due_time, status, helper, ack_at, reply,
         replied_at, owner_unseen, created_at, done_at) in rows:
        if helper and helper not in names:
            names[helper] = await _name_of(helper)
        due_s, time_s, is_open = _day(due), _time_str(due_time), status != "done"
        overdue, due_today = _due_state(due_s, time_s, is_open)
        out.append({
            "id": fid, "channel": channel, "subject": subject, "contact": contact, "link": link, "note": note,
            "due_date": due_s, "due_time": time_s, "status": status, "created_by": created_by,
            "created_by_me": created_by.lower() == me,
            "is_helper": bool(helper) and helper.lower() == me and created_by.lower() != me,
            "helper_email": helper, "helper_name": names.get(helper) if helper else None,
            "helper_acknowledged": ack_at is not None, "helper_reply": reply, "helper_replied_at": _iso(replied_at),
            "owner_unseen": bool(owner_unseen) and created_by.lower() == me,
            "overdue": overdue, "due_today": due_today,
            "reminder_active": _reminder_active(due_s, created_at, is_open, acks.get(("followup", fid))),
            "created_at": _iso(created_at), "done_at": _iso(done_at),
        })
    return out


@router.post("/api/followups", response_model=Ok)
async def create_followup(payload: FollowUpIn, user: CurrentUser = Depends(get_current_user)):
    channel = (payload.channel or "email").lower()
    if channel not in CHANNELS:
        raise HTTPException(status_code=422, detail=f"channel must be one of {list(CHANNELS)}")
    subject = _text(payload.subject, 255, "Subject", required=True)
    due, due_time = _parse_day(payload.due_date), _parse_time(payload.due_time)
    _check_time_needs_date(due, due_time)
    helper = None
    if (payload.helper_email or "").strip():
        helper, _ = await _resolve_user(payload.helper_email, "The PIC")
        if helper.lower() == user.email.lower():
            raise HTTPException(status_code=422, detail="Pick someone else as the PIC (it's already your follow-up)")
    now = _now()
    await db.execute(
        """INSERT INTO followups (created_by, channel, subject, contact, link, note, due_date, due_time, status, helper_email,
                                  owner_unseen, created_at, updated_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'open', %s, 0, %s, %s)""",
        (
            user.email, channel, subject, _text(payload.contact, 255, "Contact"), _text(payload.link, 500, "Link"),
            _text(payload.note, 1000, "Note"), due, due_time, helper, now, now,
        ),
    )
    return {"ok": True}


async def _load_followup(fid: int, user: CurrentUser) -> tuple:
    row = await db.fetch_one(f"SELECT {_FU} FROM followups WHERE id = %s", (fid,))
    me = user.email.lower()
    if row is None or not (row[1].lower() == me or (row[10] and row[10].lower() == me)):
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return row


@router.patch("/api/followups/{fid}", response_model=Ok)
async def update_followup(fid: int, p: FollowUpUpdate, user: CurrentUser = Depends(get_current_user)):
    row = await _load_followup(fid, user)
    me = user.email.lower()
    is_owner = row[1].lower() == me
    now = _now()
    sets, params = ["updated_at = %s"], [now]

    if not is_owner:
        # The PIC can acknowledge and reply -- nothing else.
        if p.helper_reply is not None:
            reply = _text(p.helper_reply, 1000, "Reply")
            sets += ["helper_reply = %s", "helper_replied_at = %s", "owner_unseen = 1", "helper_ack_at = %s"]
            params += [reply, now if reply else None, now]
        elif p.ack:
            sets.append("helper_ack_at = %s")
            params.append(now)
        else:
            raise HTTPException(status_code=403, detail="Only the person who added this can change it")
    else:
        if p.status is not None:
            if p.status not in ("open", "done"):
                raise HTTPException(status_code=422, detail="status must be 'open' or 'done'")
            sets += ["status = %s", "done_at = %s"]
            params += [p.status, now if p.status == "done" else None]
        if p.channel is not None:
            if p.channel.lower() not in CHANNELS:
                raise HTTPException(status_code=422, detail=f"channel must be one of {list(CHANNELS)}")
            sets.append("channel = %s")
            params.append(p.channel.lower())
        for field, limit, what in (("subject", 255, "Subject"), ("contact", 255, "Contact"), ("link", 500, "Link"), ("note", 1000, "Note")):
            value = getattr(p, field)
            if value is not None:
                sets.append(f"{field} = %s")
                params.append(_text(value, limit, what, required=(field == "subject")))
        if p.clear_due:
            sets += ["due_date = NULL", "due_time = NULL"]
        else:
            if p.due_date is not None:
                sets.append("due_date = %s")
                params.append(_parse_day(p.due_date))
            if p.due_time is not None:
                new_time = _parse_time(p.due_time)
                _check_time_needs_date(_day(row[7]) if p.due_date is None else _parse_day(p.due_date), new_time)
                sets.append("due_time = %s")
                params.append(new_time)
        if p.clear_helper:
            sets += ["helper_email = NULL", "helper_ack_at = NULL", "helper_reply = NULL", "helper_replied_at = NULL"]
        elif (p.helper_email or "").strip():
            helper, _ = await _resolve_user(p.helper_email, "The PIC")
            if helper.lower() == me:
                raise HTTPException(status_code=422, detail="Pick someone else as the PIC")
            sets += ["helper_email = %s", "helper_ack_at = NULL", "helper_reply = NULL", "helper_replied_at = NULL"]
            params.append(helper)
    params.append(fid)
    await db.execute(f"UPDATE followups SET {', '.join(sets)} WHERE id = %s", tuple(params))
    return {"ok": True}


@router.delete("/api/followups/{fid}", response_model=Ok)
async def delete_followup(fid: int, user: CurrentUser = Depends(get_current_user)):
    row = await _load_followup(fid, user)
    if row[1].lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Only the person who added this can remove it")
    await db.execute("DELETE FROM followups WHERE id = %s", (fid,))
    await _forget_acks("followup", fid)
    return {"ok": True}


@router.post("/api/followups/mark-seen", response_model=Ok)
async def followups_mark_seen(user: CurrentUser = Depends(get_current_user)):
    await db.execute("UPDATE followups SET owner_unseen = 0 WHERE LOWER(created_by) = %s AND owner_unseen = 1", (user.email.lower(),))
    return {"ok": True}


# =====================================================================================================
# To Do List
# =====================================================================================================

class TodoIn(BaseModel):
    title: str
    details: str | None = None
    due_date: str | None = None
    progress: int = 0
    remind_at: str | None = None


class TodoUpdate(BaseModel):
    title: str | None = None
    details: str | None = None
    due_date: str | None = None
    clear_due: bool = False
    progress: int | None = None
    remind_at: str | None = None
    clear_remind: bool = False
    dismiss_reminder: bool = False


class Todo(BaseModel):
    id: int
    title: str
    details: str | None
    due_date: str | None
    progress: int
    done: bool
    overdue: bool
    due_today: bool
    remind_at: str | None
    reminder_due: bool
    reminder_active: bool
    created_at: str
    done_at: str | None


_TD = "id, title, details, due_date, progress, remind_at, remind_ack_at, created_at, done_at"


def _reminder_due(remind_at, ack_at, progress: int) -> bool:
    """A custom reminder time rings once it has come, until dismissed, and never for finished items."""
    if remind_at is None or progress >= 100:
        return False
    if _aware(remind_at) > _now():
        return False
    return ack_at is None or _aware(ack_at) < _aware(remind_at)


def _check_progress(value: int) -> int:
    if value < 0 or value > 100:
        raise HTTPException(status_code=422, detail="Progress must be between 0 and 100")
    return value


@router.get("/api/todos", response_model=list[Todo])
async def list_todos(user: CurrentUser = Depends(get_current_user)):
    me = user.email.lower()
    rows = await db.fetch_all(
        f"""SELECT {_TD} FROM todos WHERE LOWER(owner) = %s
            ORDER BY (progress >= 100), (due_date IS NULL), due_date, created_at DESC""",
        (me,),
    )
    acks = await _acks_for(me)
    out = []
    for tid, title, details, due, progress, remind_at, ack_at, created_at, done_at in rows:
        due_s, open_ = _day(due), progress < 100
        overdue, due_today = _due_state(due_s, None, open_)
        out.append({
            "id": tid, "title": title, "details": details, "due_date": due_s, "progress": progress, "done": not open_,
            "overdue": overdue, "due_today": due_today, "remind_at": _iso(remind_at),
            "reminder_due": _reminder_due(remind_at, ack_at, progress),
            "reminder_active": _reminder_active(due_s, created_at, open_, acks.get(("todo", tid))),
            "created_at": _iso(created_at), "done_at": _iso(done_at),
        })
    return out


@router.post("/api/todos", response_model=Ok)
async def create_todo(payload: TodoIn, user: CurrentUser = Depends(get_current_user)):
    now = _now()
    progress = _check_progress(payload.progress)
    await db.execute(
        """INSERT INTO todos (owner, title, details, due_date, progress, remind_at, created_at, updated_at, done_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            user.email, _text(payload.title, 255, "Title", required=True), _text(payload.details, 1000, "Details"),
            _parse_day(payload.due_date), progress, _parse_when(payload.remind_at), now, now, now if progress >= 100 else None,
        ),
    )
    return {"ok": True}


async def _own_todo(tid: int, user: CurrentUser) -> tuple:
    row = await db.fetch_one(f"SELECT {_TD} FROM todos WHERE id = %s AND LOWER(owner) = %s", (tid, user.email.lower()))
    if row is None:
        raise HTTPException(status_code=404, detail="To-do not found")
    return row


@router.patch("/api/todos/{tid}", response_model=Ok)
async def update_todo(tid: int, p: TodoUpdate, user: CurrentUser = Depends(get_current_user)):
    await _own_todo(tid, user)
    now = _now()
    sets, params = ["updated_at = %s"], [now]
    if p.title is not None:
        sets.append("title = %s")
        params.append(_text(p.title, 255, "Title", required=True))
    if p.details is not None:
        sets.append("details = %s")
        params.append(_text(p.details, 1000, "Details"))
    if p.clear_due:
        sets.append("due_date = NULL")
    elif p.due_date is not None:
        sets.append("due_date = %s")
        params.append(_parse_day(p.due_date))
    if p.progress is not None:
        progress = _check_progress(p.progress)
        sets += ["progress = %s", "done_at = %s"]
        params += [progress, now if progress >= 100 else None]
    if p.clear_remind:
        sets += ["remind_at = NULL", "remind_ack_at = NULL"]
    elif p.remind_at is not None:
        sets += ["remind_at = %s", "remind_ack_at = NULL"]
        params.append(_parse_when(p.remind_at))
    if p.dismiss_reminder:
        sets.append("remind_ack_at = %s")
        params.append(now)
    params.append(tid)
    await db.execute(f"UPDATE todos SET {', '.join(sets)} WHERE id = %s", tuple(params))
    return {"ok": True}


@router.delete("/api/todos/{tid}", response_model=Ok)
async def delete_todo(tid: int, user: CurrentUser = Depends(get_current_user)):
    await _own_todo(tid, user)
    await db.execute("DELETE FROM todos WHERE id = %s", (tid,))
    await _forget_acks("todo", tid)
    return {"ok": True}


# =====================================================================================================
# Task Assigned
# =====================================================================================================

TASK_STATUSES = ("open", "in_progress", "done")


class TaskIn(BaseModel):
    assignee_email: str | None = None
    assignee_emails: list[str] = []
    title: str
    details: str | None = None
    due_date: str | None = None
    due_time: str | None = None


class TaskUpdate(BaseModel):
    # assignee
    status: str | None = None
    reply: str | None = None
    ack: bool = False
    # owner
    title: str | None = None
    details: str | None = None
    due_date: str | None = None
    due_time: str | None = None  # '' clears the time
    clear_due: bool = False
    reopen: bool = False


class Task(BaseModel):
    id: int
    title: str
    details: str | None
    due_date: str | None
    due_time: str | None
    status: str
    created_by: str
    created_by_me: bool
    assignee_email: str
    assignee_name: str | None
    assigned_to_me: bool
    assignee_reply: str | None
    assignee_replied_at: str | None
    is_new: bool
    owner_unseen: bool
    overdue: bool
    due_today: bool
    reminder_active: bool
    created_at: str
    done_at: str | None


_TK = (
    "id, created_by, assignee_email, title, details, due_date, due_time, status, assignee_reply, assignee_replied_at, "
    "assignee_ack_at, owner_unseen, created_at, done_at"
)


@router.get("/api/tasks", response_model=list[Task])
async def list_tasks(user: CurrentUser = Depends(get_current_user)):
    me = user.email.lower()
    rows = await db.fetch_all(
        f"""SELECT {_TK} FROM assigned_tasks WHERE LOWER(created_by) = %s OR LOWER(assignee_email) = %s
            ORDER BY (status = 'done'), (due_date IS NULL), due_date, due_time, created_at DESC""",
        (me, me),
    )
    acks = await _acks_for(me)
    names: dict[str, str | None] = {}
    out = []
    for (tid, created_by, assignee, title, details, due, due_time, status, reply, replied_at, ack_at, owner_unseen,
         created_at, done_at) in rows:
        if assignee not in names:
            names[assignee] = await _name_of(assignee)
        due_s, time_s, open_ = _day(due), _time_str(due_time), status != "done"
        overdue, due_today = _due_state(due_s, time_s, open_)
        mine = assignee.lower() == me
        out.append({
            "id": tid, "title": title, "details": details, "due_date": due_s, "due_time": time_s, "status": status,
            "created_by": created_by, "created_by_me": created_by.lower() == me, "assignee_email": assignee,
            "assignee_name": names[assignee], "assigned_to_me": mine, "assignee_reply": reply,
            "assignee_replied_at": _iso(replied_at), "is_new": mine and ack_at is None and open_,
            "owner_unseen": bool(owner_unseen) and created_by.lower() == me,
            "overdue": overdue, "due_today": due_today,
            "reminder_active": _reminder_active(due_s, created_at, open_, acks.get(("task", tid))),
            "created_at": _iso(created_at), "done_at": _iso(done_at),
        })
    return out


@router.post("/api/tasks", response_model=Ok)
async def create_task(payload: TaskIn, user: CurrentUser = Depends(get_current_user)):
    """Assign a task to one or more people -- one row per assignee, each independent (2026-09-25)."""
    wanted = [
        e for e in ([payload.assignee_email] if (payload.assignee_email or "").strip() else []) + list(payload.assignee_emails)
        if (e or "").strip()
    ]
    if not wanted:
        raise HTTPException(status_code=422, detail="Pick at least one person to assign it to")
    if len(wanted) > 30:
        raise HTTPException(status_code=422, detail="Assign to at most 30 people at a time")
    resolved: dict[str, str] = {}
    for email in wanted:  # validate everyone first so nothing is half-created
        stored, _ = await _resolve_user(email, "The assignee")
        if stored.lower() == user.email.lower():
            raise HTTPException(status_code=422, detail="Assign it to someone else -- your own tasks go in the To Do List")
        resolved.setdefault(stored.lower(), stored)
    title = _text(payload.title, 255, "Title", required=True)
    details = _text(payload.details, 1000, "Details")
    due, due_time = _parse_day(payload.due_date), _parse_time(payload.due_time)
    _check_time_needs_date(due, due_time)
    now = _now()
    for stored in resolved.values():
        await db.execute(
            """INSERT INTO assigned_tasks (created_by, assignee_email, title, details, due_date, due_time, status, owner_unseen,
                                           created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, 'open', 0, %s, %s)""",
            (user.email, stored, title, details, due, due_time, now, now),
        )
    n = len(resolved)
    return {"ok": True, "detail": f"Assigned to {n} {'person' if n == 1 else 'people'}"}


async def _load_task(tid: int, user: CurrentUser) -> tuple:
    row = await db.fetch_one(f"SELECT {_TK} FROM assigned_tasks WHERE id = %s", (tid,))
    me = user.email.lower()
    if row is None or not (row[1].lower() == me or row[2].lower() == me):
        raise HTTPException(status_code=404, detail="Task not found")
    return row


@router.patch("/api/tasks/{tid}", response_model=Ok)
async def update_task(tid: int, p: TaskUpdate, user: CurrentUser = Depends(get_current_user)):
    row = await _load_task(tid, user)
    me = user.email.lower()
    is_owner = row[1].lower() == me
    is_assignee = row[2].lower() == me
    now = _now()
    sets, params = ["updated_at = %s"], [now]

    if is_assignee:
        if p.reply is not None:
            reply = _text(p.reply, 1000, "Reply")
            sets += ["assignee_reply = %s", "assignee_replied_at = %s", "owner_unseen = 1", "assignee_ack_at = %s"]
            params += [reply, now if reply else None, now]
        if p.status is not None:
            if p.status not in TASK_STATUSES:
                raise HTTPException(status_code=422, detail=f"status must be one of {TASK_STATUSES}")
            sets += ["status = %s", "done_at = %s", "assignee_ack_at = %s", "owner_unseen = 1"]
            params += [p.status, now if p.status == "done" else None, now]
        elif p.ack:
            sets.append("assignee_ack_at = %s")
            params.append(now)
    if is_owner:
        if p.title is not None:
            sets.append("title = %s")
            params.append(_text(p.title, 255, "Title", required=True))
        if p.details is not None:
            sets.append("details = %s")
            params.append(_text(p.details, 1000, "Details"))
        if p.clear_due:
            sets += ["due_date = NULL", "due_time = NULL"]
        else:
            if p.due_date is not None:
                sets.append("due_date = %s")
                params.append(_parse_day(p.due_date))
            if p.due_time is not None:
                new_time = _parse_time(p.due_time)
                _check_time_needs_date(_day(row[5]) if p.due_date is None else _parse_day(p.due_date), new_time)
                sets.append("due_time = %s")
                params.append(new_time)
        if p.reopen:
            # Back to the assignee as a fresh, unacknowledged task.
            sets += ["status = 'open'", "done_at = NULL", "assignee_ack_at = NULL"]
    if len(sets) == 1:
        raise HTTPException(status_code=403, detail="Nothing you're allowed to change there")
    params.append(tid)
    await db.execute(f"UPDATE assigned_tasks SET {', '.join(sets)} WHERE id = %s", tuple(params))
    return {"ok": True}


@router.delete("/api/tasks/{tid}", response_model=Ok)
async def delete_task(tid: int, user: CurrentUser = Depends(get_current_user)):
    row = await _load_task(tid, user)
    if row[1].lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Only the person who assigned this can remove it")
    await db.execute("DELETE FROM assigned_tasks WHERE id = %s", (tid,))
    await _forget_acks("task", tid)
    return {"ok": True}


@router.post("/api/tasks/mark-seen", response_model=Ok)
async def tasks_mark_seen(user: CurrentUser = Depends(get_current_user)):
    await db.execute("UPDATE assigned_tasks SET owner_unseen = 0 WHERE LOWER(created_by) = %s AND owner_unseen = 1", (user.email.lower(),))
    return {"ok": True}


# =====================================================================================================
# Hooks used by main.py
# =====================================================================================================

async def notification_counts(user: CurrentUser) -> dict:
    """Numbers behind the Task List bells and dots (added to /api/notifications in main.py).

    Bell (red), per sub-tab -- "notify":
      followups  a PIC request I haven't acknowledged, a reply from my PIC, or a scheduled due-date reminder ringing
      todos      a reminder time I set that has come, or a scheduled due-date reminder ringing
      tasks      a task assigned to me that I haven't picked a status for, a reply / status change on one I
                 assigned, or a scheduled due-date reminder ringing
    Dot (amber), per sub-tab -- "due_soon": an open item of mine (as owner OR as the PIC / assignee) due within
    NEAR_DAYS or overdue."""
    me = user.email.lower()
    soon = (_today() + timedelta(days=NEAR_DAYS)).isoformat()
    acks = await _acks_for(me)

    def counts(rows, kind):
        """rows: (id, due_date, created_at, is_open) -> (reminders ringing, due soon)"""
        ringing = due_soon = 0
        for item_id, due, created_at, is_open in rows:
            due_s = _day(due)
            if not due_s or not is_open:
                continue
            if _reminder_active(due_s, created_at, True, acks.get((kind, item_id))):
                ringing += 1
            if due_s <= soon:
                due_soon += 1
        return ringing, due_soon

    fu_rows = await db.fetch_all(
        "SELECT id, due_date, created_at, (status <> 'done') FROM followups WHERE LOWER(created_by) = %s OR LOWER(helper_email) = %s",
        (me, me),
    )
    fu_ring, fu_soon = counts(fu_rows, "followup")
    fu_other = await db.fetch_one(
        """SELECT COUNT(*) FROM followups
           WHERE (LOWER(created_by) = %s AND owner_unseen = 1)
              OR (LOWER(helper_email) = %s AND LOWER(created_by) <> %s AND status <> 'done' AND helper_ack_at IS NULL)""",
        (me, me, me),
    )

    td_rows = await db.fetch_all("SELECT id, due_date, created_at, (progress < 100) FROM todos WHERE LOWER(owner) = %s", (me,))
    td_ring, td_soon = counts(td_rows, "todo")
    custom = await db.fetch_all(
        "SELECT remind_at, remind_ack_at, progress FROM todos WHERE LOWER(owner) = %s AND remind_at IS NOT NULL AND progress < 100", (me,)
    )

    tk_rows = await db.fetch_all(
        "SELECT id, due_date, created_at, (status <> 'done') FROM assigned_tasks WHERE LOWER(created_by) = %s OR LOWER(assignee_email) = %s",
        (me, me),
    )
    tk_ring, tk_soon = counts(tk_rows, "task")
    tk_other = await db.fetch_one(
        """SELECT COUNT(*) FROM assigned_tasks
           WHERE (LOWER(assignee_email) = %s AND status <> 'done' AND assignee_ack_at IS NULL)
              OR (LOWER(created_by) = %s AND owner_unseen = 1)""",
        (me, me),
    )
    return {
        "followups_notify": int(fu_other[0] or 0) + fu_ring,
        "todos_notify": sum(1 for r in custom if _reminder_due(r[0], r[1], r[2])) + td_ring,
        "tasks_notify": int(tk_other[0] or 0) + tk_ring,
        "followups_due_soon": fu_soon,
        "todos_due_soon": td_soon,
        "tasks_due_soon": tk_soon,
    }


async def on_user_deleted(email: str) -> None:
    """A removed user's own items go with them; anything they were helping with is unassigned (follow-ups) and
    tasks assigned to a person who no longer exists are removed."""
    e = email.lower()
    await db.execute("DELETE FROM followups WHERE LOWER(created_by) = %s", (e,))
    await db.execute(
        "UPDATE followups SET helper_email = NULL, helper_ack_at = NULL, helper_reply = NULL, helper_replied_at = NULL "
        "WHERE LOWER(helper_email) = %s",
        (e,),
    )
    await db.execute("DELETE FROM todos WHERE LOWER(owner) = %s", (e,))
    await db.execute("DELETE FROM assigned_tasks WHERE LOWER(created_by) = %s OR LOWER(assignee_email) = %s", (e, e))
    await db.execute("DELETE FROM due_reminder_acks WHERE LOWER(user_email) = %s", (e,))
