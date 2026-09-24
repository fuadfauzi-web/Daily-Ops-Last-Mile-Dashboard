"""Task List (2026-09-25, staging): Email / Gchat follow-ups, To Do List and Task Assigned.

Urgent TN, the fourth Task List sub-tab, predates this and lives in main.py (urgent_tn_items).
Everything here is scoped to people, not stations: a row is visible only to the person who owns
it and, where there is one, the person it was assigned to. Tables: V32__task_list.sql.

  Email / Gchat  a message the owner wants to chase again (subject, who it's with, link, due date);
                 optionally a helper -- another dashboard user asked to help reply / remind. The
                 helper acknowledges and can type a reply; the owner marks it done.
  To Do List     the owner's private tracker: title, details, due date, progress 0-100, and an
                 optional reminder time.
  Task Assigned  the owner gives a task to another user (never themselves -- that's the To Do
                 List); the assignee sets Open / In progress / Done and can reply. The owner can
                 edit, reopen or remove it (removing deletes it for both).
"""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user

router = APIRouter()

_MYT = timezone(timedelta(hours=8))
CHANNELS = ("email", "gchat")


class Ok(BaseModel):
    ok: bool
    detail: str | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _today() -> date:
    return datetime.now(_MYT).date()


def _iso(value) -> str | None:
    if value is None:
        return None
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _day(value) -> str | None:
    """A DATE column as 'yyyy-mm-dd' (asyncmy gives a date; other drivers a string)."""
    if value is None:
        return None
    return value.isoformat()[:10] if hasattr(value, "isoformat") else str(value)[:10]


def _parse_day(value: str | None) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        raise HTTPException(status_code=422, detail="Due date must look like 2026-09-30")


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
    created_at: str
    done_at: str | None


_FU = (
    "id, created_by, channel, subject, contact, link, note, due_date, status, helper_email, helper_ack_at, "
    "helper_reply, helper_replied_at, owner_unseen, created_at, done_at"
)


@router.get("/api/followups", response_model=list[FollowUp])
async def list_followups(user: CurrentUser = Depends(get_current_user)):
    me = user.email.lower()
    rows = await db.fetch_all(
        f"""SELECT {_FU} FROM followups WHERE LOWER(created_by) = %s OR LOWER(helper_email) = %s
            ORDER BY (status = 'done'), (due_date IS NULL), due_date, created_at DESC""",
        (me, me),
    )
    today = _today().isoformat()
    names: dict[str, str | None] = {}
    out = []
    for (fid, created_by, channel, subject, contact, link, note, due, status, helper, ack_at, reply, replied_at,
         owner_unseen, created_at, done_at) in rows:
        if helper and helper not in names:
            names[helper] = await _name_of(helper)
        due_s = _day(due)
        is_open = status != "done"
        out.append({
            "id": fid, "channel": channel, "subject": subject, "contact": contact, "link": link, "note": note,
            "due_date": due_s, "status": status, "created_by": created_by, "created_by_me": created_by.lower() == me,
            "is_helper": bool(helper) and helper.lower() == me and created_by.lower() != me,
            "helper_email": helper, "helper_name": names.get(helper) if helper else None,
            "helper_acknowledged": ack_at is not None, "helper_reply": reply, "helper_replied_at": _iso(replied_at),
            "owner_unseen": bool(owner_unseen) and created_by.lower() == me,
            "overdue": bool(due_s) and is_open and due_s < today, "due_today": bool(due_s) and is_open and due_s == today,
            "created_at": _iso(created_at), "done_at": _iso(done_at),
        })
    return out


@router.post("/api/followups", response_model=Ok)
async def create_followup(payload: FollowUpIn, user: CurrentUser = Depends(get_current_user)):
    channel = (payload.channel or "email").lower()
    if channel not in CHANNELS:
        raise HTTPException(status_code=422, detail=f"channel must be one of {list(CHANNELS)}")
    subject = _text(payload.subject, 255, "Subject", required=True)
    helper = None
    if (payload.helper_email or "").strip():
        helper, _ = await _resolve_user(payload.helper_email, "The helper")
        if helper.lower() == user.email.lower():
            raise HTTPException(status_code=422, detail="Pick someone else as the helper (it's already your follow-up)")
    now = _now()
    await db.execute(
        """INSERT INTO followups (created_by, channel, subject, contact, link, note, due_date, status, helper_email,
                                  owner_unseen, created_at, updated_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, 'open', %s, 0, %s, %s)""",
        (
            user.email, channel, subject, _text(payload.contact, 255, "Contact"), _text(payload.link, 500, "Link"),
            _text(payload.note, 1000, "Note"), _parse_day(payload.due_date), helper, now, now,
        ),
    )
    return {"ok": True}


async def _load_followup(fid: int, user: CurrentUser) -> tuple:
    row = await db.fetch_one(f"SELECT {_FU} FROM followups WHERE id = %s", (fid,))
    me = user.email.lower()
    if row is None or not (row[1].lower() == me or (row[9] and row[9].lower() == me)):
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
        # The helper can acknowledge and reply -- nothing else.
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
            sets.append("due_date = NULL")
        elif p.due_date is not None:
            sets.append("due_date = %s")
            params.append(_parse_day(p.due_date))
        if p.clear_helper:
            sets += ["helper_email = NULL", "helper_ack_at = NULL", "helper_reply = NULL", "helper_replied_at = NULL"]
        elif (p.helper_email or "").strip():
            helper, _ = await _resolve_user(p.helper_email, "The helper")
            if helper.lower() == me:
                raise HTTPException(status_code=422, detail="Pick someone else as the helper")
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
    created_at: str
    done_at: str | None


_TD = "id, title, details, due_date, progress, remind_at, remind_ack_at, created_at, done_at"


def _reminder_due(remind_at, ack_at, progress: int) -> bool:
    """A reminder rings once its time has come, until dismissed, and never for finished items."""
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
    rows = await db.fetch_all(
        f"""SELECT {_TD} FROM todos WHERE LOWER(owner) = %s
            ORDER BY (progress >= 100), (due_date IS NULL), due_date, created_at DESC""",
        (user.email.lower(),),
    )
    today = _today().isoformat()
    out = []
    for tid, title, details, due, progress, remind_at, ack_at, created_at, done_at in rows:
        due_s = _day(due)
        open_ = progress < 100
        out.append({
            "id": tid, "title": title, "details": details, "due_date": due_s, "progress": progress, "done": not open_,
            "overdue": bool(due_s) and open_ and due_s < today, "due_today": bool(due_s) and open_ and due_s == today,
            "remind_at": _iso(remind_at), "reminder_due": _reminder_due(remind_at, ack_at, progress),
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
    return {"ok": True}


# =====================================================================================================
# Task Assigned
# =====================================================================================================

TASK_STATUSES = ("open", "in_progress", "done")


class TaskIn(BaseModel):
    assignee_email: str
    title: str
    details: str | None = None
    due_date: str | None = None


class TaskUpdate(BaseModel):
    # assignee
    status: str | None = None
    reply: str | None = None
    ack: bool = False
    # owner
    title: str | None = None
    details: str | None = None
    due_date: str | None = None
    clear_due: bool = False
    reopen: bool = False


class Task(BaseModel):
    id: int
    title: str
    details: str | None
    due_date: str | None
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
    created_at: str
    done_at: str | None


_TK = (
    "id, created_by, assignee_email, title, details, due_date, status, assignee_reply, assignee_replied_at, "
    "assignee_ack_at, owner_unseen, created_at, done_at"
)


@router.get("/api/tasks", response_model=list[Task])
async def list_tasks(user: CurrentUser = Depends(get_current_user)):
    me = user.email.lower()
    rows = await db.fetch_all(
        f"""SELECT {_TK} FROM assigned_tasks WHERE LOWER(created_by) = %s OR LOWER(assignee_email) = %s
            ORDER BY (status = 'done'), (due_date IS NULL), due_date, created_at DESC""",
        (me, me),
    )
    today = _today().isoformat()
    names: dict[str, str | None] = {}
    out = []
    for (tid, created_by, assignee, title, details, due, status, reply, replied_at, ack_at, owner_unseen, created_at,
         done_at) in rows:
        if assignee not in names:
            names[assignee] = await _name_of(assignee)
        due_s = _day(due)
        open_ = status != "done"
        mine = assignee.lower() == me
        out.append({
            "id": tid, "title": title, "details": details, "due_date": due_s, "status": status,
            "created_by": created_by, "created_by_me": created_by.lower() == me, "assignee_email": assignee,
            "assignee_name": names[assignee], "assigned_to_me": mine, "assignee_reply": reply,
            "assignee_replied_at": _iso(replied_at), "is_new": mine and ack_at is None and open_,
            "owner_unseen": bool(owner_unseen) and created_by.lower() == me,
            "overdue": bool(due_s) and open_ and due_s < today, "due_today": bool(due_s) and open_ and due_s == today,
            "created_at": _iso(created_at), "done_at": _iso(done_at),
        })
    return out


@router.post("/api/tasks", response_model=Ok)
async def create_task(payload: TaskIn, user: CurrentUser = Depends(get_current_user)):
    assignee, _ = await _resolve_user(payload.assignee_email, "The assignee")
    if assignee.lower() == user.email.lower():
        raise HTTPException(status_code=422, detail="Assign it to someone else -- your own tasks go in the To Do List")
    now = _now()
    await db.execute(
        """INSERT INTO assigned_tasks (created_by, assignee_email, title, details, due_date, status, owner_unseen,
                                       created_at, updated_at)
           VALUES (%s, %s, %s, %s, %s, 'open', 0, %s, %s)""",
        (
            user.email, assignee, _text(payload.title, 255, "Title", required=True), _text(payload.details, 1000, "Details"),
            _parse_day(payload.due_date), now, now,
        ),
    )
    return {"ok": True}


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
            sets.append("due_date = NULL")
        elif p.due_date is not None:
            sets.append("due_date = %s")
            params.append(_parse_day(p.due_date))
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
    return {"ok": True}


@router.post("/api/tasks/mark-seen", response_model=Ok)
async def tasks_mark_seen(user: CurrentUser = Depends(get_current_user)):
    await db.execute("UPDATE assigned_tasks SET owner_unseen = 0 WHERE LOWER(created_by) = %s AND owner_unseen = 1", (user.email.lower(),))
    return {"ok": True}


# =====================================================================================================
# Hooks used by main.py
# =====================================================================================================

async def notification_counts(user: CurrentUser) -> dict:
    """Numbers behind the Task List bells (added to /api/notifications in main.py).
      followups_notify  my open follow-ups due today or overdue, ones where my helper replied, and
                        follow-ups someone asked me to help with that I haven't acknowledged
      todos_notify      my to-dos whose reminder time has come (until dismissed)
      tasks_notify      tasks assigned to me that are unacknowledged or due/overdue, plus tasks I
                        assigned where the assignee replied / changed the status"""
    me = user.email.lower()
    today = _today()
    followups = await db.fetch_one(
        """SELECT COUNT(*) FROM followups
           WHERE (LOWER(created_by) = %s AND ((status <> 'done' AND due_date IS NOT NULL AND due_date <= %s) OR owner_unseen = 1))
              OR (LOWER(helper_email) = %s AND LOWER(created_by) <> %s AND status <> 'done' AND helper_ack_at IS NULL)""",
        (me, today, me, me),
    )
    todo_rows = await db.fetch_all(
        "SELECT remind_at, remind_ack_at, progress FROM todos WHERE LOWER(owner) = %s AND remind_at IS NOT NULL AND progress < 100",
        (me,),
    )
    tasks = await db.fetch_one(
        """SELECT COUNT(*) FROM assigned_tasks
           WHERE (LOWER(assignee_email) = %s AND status <> 'done' AND (assignee_ack_at IS NULL OR (due_date IS NOT NULL AND due_date <= %s)))
              OR (LOWER(created_by) = %s AND owner_unseen = 1)""",
        (me, today, me),
    )
    return {
        "followups_notify": int(followups[0] or 0),
        "todos_notify": sum(1 for r in todo_rows if _reminder_due(r[0], r[1], r[2])),
        "tasks_notify": int(tasks[0] or 0),
    }


async def on_user_deleted(email: str) -> None:
    """A removed user's own items go with them; anything they were helping with / assigned to is unassigned
    (follow-ups) or removed (tasks assigned to a person who no longer exists have nobody to do them)."""
    e = email.lower()
    await db.execute("DELETE FROM followups WHERE LOWER(created_by) = %s", (e,))
    await db.execute(
        "UPDATE followups SET helper_email = NULL, helper_ack_at = NULL, helper_reply = NULL, helper_replied_at = NULL "
        "WHERE LOWER(helper_email) = %s",
        (e,),
    )
    await db.execute("DELETE FROM todos WHERE LOWER(owner) = %s", (e,))
    await db.execute("DELETE FROM assigned_tasks WHERE LOWER(created_by) = %s OR LOWER(assignee_email) = %s", (e, e))
