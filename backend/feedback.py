"""Feedback as an ongoing conversation (2026-10-09).

A feedback CASE (table app_feedback, the header: who, status, unread flags) holds a thread of MESSAGES (table feedback_messages, V97): the person's first message, the Superadmin's
replies, the person's follow-ups ... Nothing is ever overwritten -- every message keeps its sender, role and time. A case stays OPEN until the Superadmin closes it; a closed case can be read
but not answered (the Superadmin may reopen it). A Superadmin reply never closes a case. Who the sender is always comes from the signed-in account (auth.CurrentUser), never from the
request. Everyone sees only their own cases; the Superadmin sees all. A closed case (and its attachments) is deleted 7 days after it was closed, as before.
Old feedback (one message + one reply on the row) was copied into feedback_messages by the V97 migration.
"""
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

import db
import storage
from auth import CurrentUser, get_current_user

log = logging.getLogger("feedback")
router = APIRouter()

MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
ATTACHMENT_TYPES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".webp": "image/webp", ".pdf": "application/pdf",
}
CLOSED_RETENTION_DAYS = 7
MAX_MESSAGE_CHARS = 4000


def _iso(d) -> str | None:
    if d is None:
        return None
    if isinstance(d, datetime) and d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.isoformat() if hasattr(d, "isoformat") else str(d)


def _dt(v):
    return datetime.fromisoformat(v) if isinstance(v, str) else v


def _is_admin(user: CurrentUser) -> bool:
    return user.role == "admin"


class OkResult(BaseModel):
    ok: bool
    detail: str | None = None
    id: int | None = None


class CaseRow(BaseModel):
    id: int
    email: str
    role: str
    scope_type: str
    scope_value: str | None
    title: str
    status: str
    reply_count: int  # messages after the first one
    created_at: str
    last_message_at: str
    last_sender_role: str | None
    closed_at: str | None
    delete_after: str | None
    unread: bool  # something new for the person looking at the list (a reply for the sender, a new message for the Superadmin)
    is_mine: bool


class MessageOut(BaseModel):
    id: int
    sender_email: str
    sender_role: str  # 'user' | 'admin'
    is_mine: bool
    message: str
    created_at: str
    has_attachment: bool
    attachment_name: str | None
    attachment_type: str | None


class CaseDetail(CaseRow):
    messages: list[MessageOut]


class FeedbackUpdate(BaseModel):
    status: str | None = None  # 'open' | 'closed' -- the Superadmin only
    reply: str | None = None  # kept for older clients: appends a message, like POST /messages


# ------------------------------------------------------------------------------------------------ helpers

async def _read_upload(file: UploadFile | None) -> tuple[bytes | None, str | None, str | None]:
    if file is None or not file.filename:
        return None, None, None
    ext = os.path.splitext(file.filename)[1].lower()
    content_type = ATTACHMENT_TYPES.get(ext)
    if content_type is None:
        raise HTTPException(status_code=422, detail="Attach an image (png, jpg, gif, webp) or a PDF")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="The attachment is empty")
    if len(data) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(status_code=422, detail="Attachment is too large (max 20 MB)")
    return data, os.path.basename(file.filename)[:255], content_type


async def _store_upload(data: bytes | None, name: str | None, content_type: str | None) -> str | None:
    """To object storage first: if that fails nothing is saved."""
    if not data:
        return None
    key = storage.safe_key("feedback", f"{uuid.uuid4().hex}{os.path.splitext(name or '')[1].lower()}")
    try:
        await run_in_threadpool(storage.put_bytes, key, data, content_type=content_type)
    except Exception:  # noqa: BLE001
        log.exception("Feedback attachment upload failed")
        raise HTTPException(status_code=503, detail="Couldn't store the attachment right now -- try again, or send without it")
    return key


def _clean(message: str) -> str:
    message = (message or "").strip()
    if not message:
        raise HTTPException(status_code=422, detail="The message can't be empty")
    if len(message) > MAX_MESSAGE_CHARS:
        raise HTTPException(status_code=422, detail=f"The message is too long (max {MAX_MESSAGE_CHARS} characters)")
    return message


async def _delete_files(keys: list[str | None]) -> None:
    for key in keys:
        if not key:
            continue
        try:
            await run_in_threadpool(storage.delete, key)
        except Exception:  # noqa: BLE001 - an orphaned file is harmless, the row is what matters
            log.warning("Couldn't delete feedback attachment %s", key)


_CASE_COLS = (
    "f.id, f.email, f.role, f.scope_type, f.scope_value, f.status, f.created_at, f.closed_at, f.reply_unread, f.admin_unread, f.last_message_at, "
    "(SELECT COUNT(*) FROM feedback_messages m WHERE m.feedback_id = f.id), "
    "(SELECT m.message FROM feedback_messages m WHERE m.feedback_id = f.id ORDER BY m.id LIMIT 1), "
    "(SELECT m.sender_role FROM feedback_messages m WHERE m.feedback_id = f.id ORDER BY m.id DESC LIMIT 1)"
)


def _case(r, user: CurrentUser) -> dict:
    (fid, email, role, scope_type, scope_value, status, created_at, closed_at, reply_unread, admin_unread, last_at, n, first, last_role) = r
    closed_at = _dt(closed_at)
    mine = email.lower() == user.email.lower()
    first_line = ((first or "").strip().splitlines() or [""])[0]
    unread = (mine and bool(reply_unread)) or (_is_admin(user) and bool(admin_unread) and status == "open")
    return {
        "id": fid, "email": email, "role": role, "scope_type": scope_type, "scope_value": scope_value,
        "title": first_line[:90] + ("…" if len(first_line) > 90 else ""), "status": status, "reply_count": max(0, int(n or 0) - 1),
        "created_at": _iso(created_at), "last_message_at": _iso(last_at or created_at), "last_sender_role": last_role,
        "closed_at": _iso(closed_at), "delete_after": _iso(closed_at + timedelta(days=CLOSED_RETENTION_DAYS)) if closed_at else None,
        "unread": unread, "is_mine": mine,
    }


async def _load_case(feedback_id: int, user: CurrentUser):
    """The case row, or a 404 when it is not the caller's (and the caller is not the Superadmin) -- a stranger cannot tell it exists."""
    row = await db.fetch_one(f"SELECT {_CASE_COLS} FROM app_feedback f WHERE f.id = %s", (feedback_id,))
    if row is None or not (_is_admin(user) or row[1].lower() == user.email.lower()):
        raise HTTPException(status_code=404, detail="Feedback not found")
    return row


async def _add_message(feedback_id: int, owner_email: str, user: CurrentUser, message: str, key: str | None, name: str | None, ctype: str | None) -> None:
    now = datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)
    admin = _is_admin(user)
    await db.execute(
        "INSERT INTO feedback_messages (feedback_id, sender_email, sender_role, message, attachment_key, attachment_name, attachment_type, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (feedback_id, user.email, "admin" if admin else "user", message, key, name, ctype, now),
    )
    mine = owner_email.lower() == user.email.lower()
    flags = ""
    if admin and not mine:
        flags = ", reply_unread = 1"  # the sender has a new reply waiting
    elif not admin:
        flags = ", admin_unread = 1"  # the Superadmin has a new message waiting
    await db.execute(f"UPDATE app_feedback SET last_message_at = %s{flags} WHERE id = %s", (now, feedback_id))


# ------------------------------------------------------------------------------------------------ endpoints

@router.post("/api/feedback", response_model=OkResult)
async def submit_feedback(message: str = Form(...), file: UploadFile | None = File(None), user: CurrentUser = Depends(get_current_user)):
    """Start a case: the first message of a new conversation (optionally with one image / PDF)."""
    message = _clean(message)
    data, name, ctype = await _read_upload(file)
    key = await _store_upload(data, name, ctype)
    now = datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)
    fid = await db.execute(
        "INSERT INTO app_feedback (email, role, scope_type, scope_value, message, created_at, last_message_at, admin_unread) VALUES (%s, %s, %s, %s, %s, %s, %s, 1)",
        (user.email, user.role, user.scope_type, ", ".join(user.scope_values) or None, message, now, now),
    )
    await db.execute(
        "INSERT INTO feedback_messages (feedback_id, sender_email, sender_role, message, attachment_key, attachment_name, attachment_type, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (fid, user.email, "admin" if _is_admin(user) else "user", message, key, name, ctype, now),
    )
    return {"ok": True, "id": fid}


@router.get("/api/feedback", response_model=list[CaseRow])
async def list_feedback(user: CurrentUser = Depends(get_current_user)):
    """The compact case list: the Superadmin gets every case, anyone else only their own. (Opening a case, not the list, marks it read.)"""
    if _is_admin(user):
        rows = await db.fetch_all(f"SELECT {_CASE_COLS} FROM app_feedback f ORDER BY COALESCE(f.last_message_at, f.created_at) DESC, f.id DESC")
    else:
        rows = await db.fetch_all(f"SELECT {_CASE_COLS} FROM app_feedback f WHERE LOWER(f.email) = %s ORDER BY COALESCE(f.last_message_at, f.created_at) DESC, f.id DESC", (user.email.lower(),))
    return [_case(r, user) for r in rows]


@router.get("/api/feedback/{feedback_id}", response_model=CaseDetail)
async def get_feedback(feedback_id: int, user: CurrentUser = Depends(get_current_user)):
    """One case with its whole conversation, oldest first. Opening it marks it read for the person opening it."""
    row = await _load_case(feedback_id, user)
    msgs = await db.fetch_all(
        "SELECT id, sender_email, sender_role, message, created_at, (attachment_key IS NOT NULL), attachment_name, attachment_type FROM feedback_messages WHERE feedback_id = %s ORDER BY id",
        (feedback_id,),
    )
    case = _case(row, user)
    if case["is_mine"]:
        await db.execute("UPDATE app_feedback SET reply_unread = 0 WHERE id = %s AND reply_unread = 1", (feedback_id,))
    if _is_admin(user):
        await db.execute("UPDATE app_feedback SET admin_unread = 0 WHERE id = %s AND admin_unread = 1", (feedback_id,))
    case["messages"] = [
        {
            "id": mid, "sender_email": se, "sender_role": sr, "is_mine": se.lower() == user.email.lower(), "message": text, "created_at": _iso(at),
            "has_attachment": bool(has), "attachment_name": an, "attachment_type": at_,
        }
        for mid, se, sr, text, at, has, an, at_ in msgs
    ]
    return case


@router.post("/api/feedback/{feedback_id}/messages", response_model=OkResult)
async def reply_feedback(feedback_id: int, message: str = Form(...), file: UploadFile | None = File(None), user: CurrentUser = Depends(get_current_user)):
    """Add a message to an OPEN case: the sender (follow-up) or the Superadmin (reply). A closed case takes no more messages."""
    row = await _load_case(feedback_id, user)
    if row[5] != "open":
        raise HTTPException(status_code=409, detail="This case is closed -- it can't receive new messages")
    message = _clean(message)
    data, name, ctype = await _read_upload(file)
    key = await _store_upload(data, name, ctype)
    await _add_message(feedback_id, row[1], user, message, key, name, ctype)
    return {"ok": True, "id": feedback_id}


@router.patch("/api/feedback/{feedback_id}", response_model=OkResult)
async def update_feedback(feedback_id: int, payload: FeedbackUpdate, user: CurrentUser = Depends(get_current_user)):
    """Superadmin: close or reopen a case. (A reply never closes it.)"""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Superadmin access required")
    row = await _load_case(feedback_id, user)
    now = datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)
    did = False
    if payload.reply is not None:
        if row[5] != "open":
            raise HTTPException(status_code=409, detail="This case is closed -- it can't receive new messages")
        await _add_message(feedback_id, row[1], user, _clean(payload.reply), None, None, None)
        did = True
    if payload.status is not None:
        if payload.status == "closed":
            await db.execute("UPDATE app_feedback SET status = 'closed', closed_at = %s WHERE id = %s", (now, feedback_id))
        elif payload.status == "open":
            await db.execute("UPDATE app_feedback SET status = 'open', closed_at = NULL WHERE id = %s", (feedback_id,))
        else:
            raise HTTPException(status_code=422, detail="status must be 'open' or 'closed'")
        did = True
    if not did:
        raise HTTPException(status_code=422, detail="Nothing to update")
    return {"ok": True}


async def _attachment_response(row) -> Response:
    key, name, ctype = row
    name = (name or "attachment").replace('"', "")
    disposition = "inline" if (ctype or "").startswith("image/") else "attachment"
    try:
        content = await run_in_threadpool(storage.get_bytes, key)
    except Exception:  # noqa: BLE001
        log.exception("Feedback attachment read failed")
        raise HTTPException(status_code=404, detail="Attachment not found")
    return Response(content=content, media_type=ctype, headers={"Content-Disposition": f'{disposition}; filename="{name}"', "X-Content-Type-Options": "nosniff"})


@router.get("/api/feedback/messages/{message_id}/attachment")
async def message_attachment(message_id: int, user: CurrentUser = Depends(get_current_user)):
    row = await db.fetch_one(
        "SELECT f.email, m.attachment_key, m.attachment_name, m.attachment_type FROM feedback_messages m JOIN app_feedback f ON f.id = m.feedback_id WHERE m.id = %s", (message_id,)
    )
    if row is None or row[1] is None or not (_is_admin(user) or row[0].lower() == user.email.lower()):
        raise HTTPException(status_code=404, detail="Attachment not found")
    return await _attachment_response(row[1:])


@router.get("/api/feedback/{feedback_id}/attachment")
async def feedback_attachment(feedback_id: int, user: CurrentUser = Depends(get_current_user)):
    """The first attachment of a case (kept for older links)."""
    await _load_case(feedback_id, user)
    row = await db.fetch_one(
        "SELECT attachment_key, attachment_name, attachment_type FROM feedback_messages WHERE feedback_id = %s AND attachment_key IS NOT NULL ORDER BY id LIMIT 1", (feedback_id,)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return await _attachment_response(row)


@router.delete("/api/feedback/{feedback_id}", response_model=OkResult)
async def delete_feedback(feedback_id: int, user: CurrentUser = Depends(get_current_user)):
    """The sender removes their own case -- it disappears for the Superadmin too, whatever its status, attachments included."""
    row = await db.fetch_one("SELECT email FROM app_feedback WHERE id = %s", (feedback_id,))
    if row is None or row[0].lower() != user.email.lower():
        raise HTTPException(status_code=404, detail="Feedback not found")
    keys = [r[0] for r in await db.fetch_all("SELECT attachment_key FROM feedback_messages WHERE feedback_id = %s", (feedback_id,))]
    await db.execute("DELETE FROM feedback_messages WHERE feedback_id = %s", (feedback_id,))
    await db.execute("DELETE FROM app_feedback WHERE id = %s", (feedback_id,))
    await _delete_files(keys)
    return {"ok": True}


async def prune_closed(now: datetime) -> None:
    """A closed case (and its messages and attachments) is deleted 7 days after it was closed -- run from the refresh loop."""
    cutoff = now - timedelta(days=CLOSED_RETENTION_DAYS)
    expired = await db.fetch_all("SELECT id FROM app_feedback WHERE status = 'closed' AND closed_at IS NOT NULL AND closed_at < %s", (cutoff,))
    if not expired:
        return
    ids = [r[0] for r in expired]
    marks = ",".join(["%s"] * len(ids))
    keys = [r[0] for r in await db.fetch_all(f"SELECT attachment_key FROM feedback_messages WHERE feedback_id IN ({marks})", tuple(ids))]
    await db.execute(f"DELETE FROM feedback_messages WHERE feedback_id IN ({marks})", tuple(ids))
    await db.execute(f"DELETE FROM app_feedback WHERE id IN ({marks})", tuple(ids))
    await _delete_files(keys)
