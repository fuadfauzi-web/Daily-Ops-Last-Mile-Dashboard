"""Metabase API pulls (2026-10-08): the KPI / Recovery feeder files come from Metabase by the app itself instead of being downloaded and uploaded by hand.

Every dataset in kpi_data.DATASETS that is a Metabase question (its `link`) is a "feed". The question each feed reads, and WHEN it is pulled, are kept in the metabase_feeds table
(V79) and edited by the Superadmin on Superadmin -> Documents: every day at a time, every N hours, one weekday a week, or one day a month -- Malaysia time. Defaults: every day at
06:00 (Metabase itself refreshes at 06:00), Lost Declared Tuesday to Sunday (Monday's list is the week change). A pull downloads the question as CSV -- the same text "Download results as
.csv" gives -- and stores it through kpi.store_file exactly like an upload, so every parser downstream is unchanged. A pull that returns no rows is refused and keeps the previous data.

The questions are expected inside the Last Mile collection (metabase_client.COLLECTION); the Documents page flags a feed whose question is not in it yet. The API key is the portal
secret METABASE_API_KEY -- never stored in the code or the database, never sent to the browser.
"""
import asyncio
import calendar
import logging
import re
import time
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
import kpi
import kpi_data as kd
import metabase_client as mb
from auth import CurrentUser, get_current_user

log = logging.getLogger("metabase_pull")
router = APIRouter()

MYT = timezone(timedelta(hours=8))
MODES = ("daily", "hourly", "weekly", "monthly", "off")
RETRY_AFTER = timedelta(minutes=30)  # a failed pull is tried again this often until it works or the next slot comes
SCHEDULER_TICK_SECONDS = 60
_QUESTION_RE = re.compile(r"/question/(\d+)")
_NO_MONDAY = {"lost_declared", "lost_current_status"}  # Lost Declared: Tuesday to Sunday (Monday is the week change)


def question_parameters(dataset: str) -> list | None:
    """Values for a question that asks for them (a native question with template tags). The POD validation question (69573) needs Date Type + Start / End date: the previous month
    and this month so far, by attempt date, every region (what was typed into Metabase by hand before)."""
    if dataset != "invalid_pod_raw":
        return None
    today = datetime.now(MYT).date()
    first_of_this = today.replace(day=1)
    start = (first_of_this - timedelta(days=1)).replace(day=1)
    end = today - timedelta(days=1)

    def tag(kind, name, value):
        return {"type": kind, "target": ["variable", ["template-tag", name]], "value": value}

    return [tag("category", "date_type", "Attempt"), tag("date/single", "start_date", start.isoformat()), tag("date/single", "end_date", end.isoformat())]


def feed_names() -> list[str]:
    return [n for n, spec in kd.DATASETS.items() if _QUESTION_RE.search(spec.get("link") or "")]


def default_question(name: str) -> int:
    return int(_QUESTION_RE.search(kd.DATASETS[name]["link"]).group(1))


def is_feed(name: str) -> bool:
    return name in kd.DATASETS and bool(_QUESTION_RE.search(kd.DATASETS[name].get("link") or ""))


def _default_days(name: str) -> str:
    return "2,3,4,5,6,7" if name in _NO_MONDAY else "1,2,3,4,5,6,7"


# ------------------------------------------------------------------------------------------------ schedule maths (Malaysia time)

class Cfg(BaseModel):
    mode: str = "daily"
    run_time: str = "06:00"
    weekdays: list[int] = [1, 2, 3, 4, 5, 6, 7]
    month_day: int = 1
    every_hours: int = 4


def _hm(run_time: str) -> tuple[int, int]:
    h, m = run_time.split(":")
    return int(h), int(m)


def slots_on(day: date, cfg: Cfg) -> list[datetime]:
    """The moments (Malaysia time) a feed is due on one calendar day."""
    if cfg.mode == "off":
        return []
    h, m = _hm(cfg.run_time)
    at = datetime(day.year, day.month, day.day, h, m, tzinfo=MYT)
    if cfg.mode in ("daily", "weekly"):
        return [at] if day.isoweekday() in cfg.weekdays else []
    if cfg.mode == "monthly":
        return [at] if day.day == min(cfg.month_day, calendar.monthrange(day.year, day.month)[1]) else []
    if cfg.mode == "hourly":
        if day.isoweekday() not in cfg.weekdays:
            return []
        out = []
        while at.date() == day:
            out.append(at)
            at += timedelta(hours=max(1, cfg.every_hours))
        return out
    return []


def latest_slot(now: datetime, cfg: Cfg) -> datetime | None:
    today = now.astimezone(MYT).date()
    for back in range(0, 40):
        past = [s for s in slots_on(today - timedelta(days=back), cfg) if s <= now]
        if past:
            return max(past)
    return None


def next_slot(now: datetime, cfg: Cfg) -> datetime | None:
    today = now.astimezone(MYT).date()
    for ahead in range(0, 40):
        later = [s for s in slots_on(today + timedelta(days=ahead), cfg) if s > now]
        if later:
            return min(later)
    return None


def _aware(value) -> datetime | None:
    """A DATETIME column (naive, stored as UTC) as an aware datetime."""
    if value is None:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def is_due(now: datetime, cfg: Cfg, last_ok: datetime | None, last_attempt: datetime | None) -> bool:
    """Due when the latest scheduled moment has passed with no successful pull since, and the last attempt (if any) was not in the last half hour."""
    slot = latest_slot(now, cfg)
    if slot is None:
        return False
    if last_ok is not None and last_ok >= slot:
        return False
    if last_attempt is not None and last_attempt >= slot and now - last_attempt < RETRY_AFTER:
        return False
    return True


def schedule_text(cfg: Cfg) -> str:
    names = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun"}
    days = sorted(set(cfg.weekdays))
    day_txt = "every day" if days == list(range(1, 8)) else ("Tue to Sun" if days == [2, 3, 4, 5, 6, 7] else ", ".join(names[d] for d in days))
    if cfg.mode == "off":
        return "Off -- not pulled"
    if cfg.mode == "daily":
        return f"{day_txt} at {cfg.run_time}"
    if cfg.mode == "weekly":
        return f"Every {names[days[0]] if days else '?'} at {cfg.run_time}"
    if cfg.mode == "monthly":
        return f"Day {cfg.month_day} of each month at {cfg.run_time}"
    return f"Every {cfg.every_hours} h from {cfg.run_time} ({day_txt})"


# ------------------------------------------------------------------------------------------------ storage

_COLS = "dataset, question_id, mode, run_time, weekdays, month_day, every_hours, last_attempt_at, last_ok_at, last_status, last_message, last_rows, last_seconds, last_by"


_rows_ensured = False


async def ensure_rows() -> None:
    """One row per feed, with the default schedule, created when missing (INSERT IGNORE, so replicas starting together are fine). Once per process."""
    global _rows_ensured
    if _rows_ensured:
        return
    _rows_ensured = True
    for name in feed_names():
        await db.execute("INSERT IGNORE INTO metabase_feeds (dataset, weekdays) VALUES (%s, %s)", (name, _default_days(name)))


def _row(r) -> dict:
    cfg = Cfg(
        mode=r[2] if r[2] in MODES else "daily",
        run_time=r[3] or "06:00",
        weekdays=sorted({int(x) for x in (r[4] or "").split(",") if x.strip().isdigit() and 1 <= int(x) <= 7}) or [1, 2, 3, 4, 5, 6, 7],
        month_day=int(r[5] or 1),
        every_hours=int(r[6] or 4),
    )
    return {
        "dataset": r[0], "question_id": r[1], "cfg": cfg,
        "last_attempt_at": _aware(r[7]), "last_ok_at": _aware(r[8]), "last_status": r[9], "last_message": r[10], "last_rows": r[11], "last_seconds": r[12], "last_by": r[13],
    }


async def load_rows() -> dict[str, dict]:
    await ensure_rows()
    rows = await db.fetch_all(f"SELECT {_COLS} FROM metabase_feeds")
    return {r[0]: _row(r) for r in rows if is_feed(r[0])}


# ------------------------------------------------------------------------------------------------ pulling

_pull_lock = asyncio.Lock()
_running: set[str] = set()


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def pull(dataset: str, by: str, question_id: int | None = None) -> dict:
    """Pull one feed now: download its question as CSV and store it like an upload. Never raises -- the outcome is recorded on the feed row and returned."""
    qid = question_id or default_question(dataset)
    started = time.perf_counter()
    status, message, rows = "ok", "", None
    _running.add(dataset)
    try:
        async with _pull_lock:  # one at a time: the big files are parsed in memory
            data = await mb.fetch_question_csv(qid, question_parameters(dataset))
            if len(data) > kd.MAX_UPLOAD_BYTES:
                raise kd.UploadError(f"The file from Metabase is too large (max {kd.MAX_UPLOAD_BYTES // (1024 * 1024)} MB)")
            if data.count(b"\n") < 2:  # header only (or nothing): keep what we have rather than replace it with an empty file
                raise kd.UploadError("Metabase returned no rows -- the previous data was kept")
            message = await kpi.store_file(dataset, f"metabase-question-{qid}.csv", data, "Metabase API")
            m = re.search(r"([\d,]+) rows loaded", message)
            rows = int(m.group(1).replace(",", "")) if m else None
    except (mb.MetabaseError, kd.UploadError, kpi.LostSyncError) as exc:
        status, message = "error", str(exc)
    except Exception as exc:  # noqa: BLE001
        log.exception("Metabase pull of %s failed", dataset)
        status, message = "error", f"Unexpected error: {exc.__class__.__name__}"
    finally:
        _running.discard(dataset)
    seconds = round(time.perf_counter() - started, 1)
    now = _now().replace(microsecond=0, tzinfo=None)
    await db.execute(
        "UPDATE metabase_feeds SET last_attempt_at=%s, last_ok_at=IF(%s='ok', %s, last_ok_at), last_status=%s, last_message=%s, last_rows=IF(%s='ok', %s, last_rows), last_seconds=%s, last_by=%s WHERE dataset=%s",
        (now, status, now, status, message[:500], status, rows, seconds, by, dataset),
    )
    log.info("Metabase pull %s (question %s) by %s: %s in %.1fs -- %s", dataset, qid, by, status, seconds, message[:120])
    return {"dataset": dataset, "status": status, "message": message, "rows": rows, "seconds": seconds}


async def _claim(dataset: str, seen_attempt: datetime | None) -> bool:
    """Take the right to pull a feed (several replicas may run the scheduler): the UPDATE only succeeds while last_attempt_at is still what this replica read, so one wins."""
    now = _now().replace(microsecond=0, tzinfo=None)
    if seen_attempt is None:
        return await db.execute_rowcount("UPDATE metabase_feeds SET last_attempt_at=%s WHERE dataset=%s AND last_attempt_at IS NULL", (now, dataset)) == 1
    return await db.execute_rowcount(
        "UPDATE metabase_feeds SET last_attempt_at=%s WHERE dataset=%s AND last_attempt_at=%s", (now, dataset, seen_attempt.astimezone(timezone.utc).replace(tzinfo=None))
    ) == 1


async def run_due() -> int:
    """One scheduler tick: pull every feed that is due. Returns how many were pulled."""
    if not mb.configured():
        return 0
    now = _now()
    n = 0
    for name, row in (await load_rows()).items():
        cfg: Cfg = row["cfg"]
        if not is_due(now, cfg, row["last_ok_at"], row["last_attempt_at"]):
            continue
        if not await _claim(name, row["last_attempt_at"]):
            continue
        await pull(name, "Schedule", row["question_id"])
        n += 1
        await asyncio.sleep(2)
    return n


async def scheduler_loop() -> None:
    """Started with the app: checks every minute which feeds are due (after a short wait so a start-up is not also a Metabase burst)."""
    await asyncio.sleep(45)
    while True:
        try:
            await run_due()
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            log.exception("Metabase scheduler tick failed")
        await asyncio.sleep(SCHEDULER_TICK_SECONDS)


async def problem_count() -> int:
    """Feeds that need a person: the last pull failed, or the scheduled moment passed more than 2 hours ago with nothing pulled (the bell on Superadmin -> Documents)."""
    if not mb.configured():
        return 0
    now = _now()
    n = 0
    for _name, row in (await load_rows()).items():
        cfg: Cfg = row["cfg"]
        if cfg.mode == "off":
            continue
        slot = latest_slot(now, cfg)
        failed = row["last_status"] == "error" and (row["last_ok_at"] is None or slot is None or row["last_ok_at"] < slot)
        overdue = slot is not None and now - slot > timedelta(hours=2) and (row["last_ok_at"] is None or row["last_ok_at"] < slot)
        if failed or overdue:
            n += 1
    return n


# ------------------------------------------------------------------------------------------------ the Documents page's API (Superadmin only)

def _admin(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Superadmin access required")


class FeedOut(BaseModel):
    dataset: str
    label: str
    kpi: str
    default_question_id: int
    question_id: int
    question_name: str | None = None
    in_collection: bool | None = None  # None = could not read the collection
    mode: str
    run_time: str
    weekdays: list[int]
    month_day: int
    every_hours: int
    schedule: str
    next_run_at: str | None = None
    last_attempt_at: str | None = None
    last_ok_at: str | None = None
    last_status: str | None = None
    last_message: str | None = None
    last_rows: int | None = None
    last_seconds: float | None = None
    last_by: str | None = None
    running: bool = False
    problem: bool = False


class QuestionOut(BaseModel):
    id: int
    name: str


class FeedsOut(BaseModel):
    configured: bool
    base_url: str
    collection_url: str
    collection_error: str | None = None
    questions: list[QuestionOut] = []
    feeds: list[FeedOut]
    pull_all_running: bool = False


_collection_cache: dict = {"at": 0.0, "items": None, "error": None}
_all_task: asyncio.Task | None = None


async def _collection(force: bool = False) -> tuple[list[dict] | None, str | None]:
    if not mb.configured():
        return None, "METABASE_API_KEY is not set on this app"
    if force or time.time() - _collection_cache["at"] > 300:
        try:
            _collection_cache.update(at=time.time(), items=await mb.list_collection(), error=None)
        except mb.MetabaseError as exc:
            _collection_cache.update(at=time.time(), items=None, error=str(exc))
    return _collection_cache["items"], _collection_cache["error"]


def _iso(d: datetime | None) -> str | None:
    return d.astimezone(timezone.utc).isoformat() if d else None


async def _feeds_out(force_collection: bool = False) -> dict:
    items, error = await _collection(force_collection)
    names = {q["id"]: q["name"] for q in items or []}
    now = _now()
    out = []
    for name, row in (await load_rows()).items():
        cfg: Cfg = row["cfg"]
        qid = row["question_id"] or default_question(name)
        slot = latest_slot(now, cfg)
        failed = row["last_status"] == "error" and (row["last_ok_at"] is None or slot is None or row["last_ok_at"] < slot)
        nxt = next_slot(now, cfg)
        out.append({
            "dataset": name, "label": kd.DATASETS[name]["label"], "kpi": kd.DATASETS[name]["kpi"],
            "default_question_id": default_question(name), "question_id": qid, "question_name": names.get(qid),
            "in_collection": (qid in names) if items is not None else None,
            "mode": cfg.mode, "run_time": cfg.run_time, "weekdays": cfg.weekdays, "month_day": cfg.month_day, "every_hours": cfg.every_hours,
            "schedule": schedule_text(cfg), "next_run_at": _iso(nxt),
            "last_attempt_at": _iso(row["last_attempt_at"]), "last_ok_at": _iso(row["last_ok_at"]), "last_status": row["last_status"],
            "last_message": row["last_message"], "last_rows": row["last_rows"], "last_seconds": row["last_seconds"], "last_by": row["last_by"],
            "running": name in _running, "problem": bool(cfg.mode != "off" and (failed or (slot is not None and now - slot > timedelta(hours=2) and (row["last_ok_at"] is None or row["last_ok_at"] < slot)))),
        })
    return {"configured": mb.configured(), "base_url": mb.METABASE_BASE_URL, "collection_url": mb.COLLECTION_URL, "collection_error": error, "questions": items or [], "feeds": out,
            "pull_all_running": _all_task is not None and not _all_task.done()}


@router.get("/api/admin/metabase/feeds", response_model=FeedsOut)
async def get_feeds(refresh: bool = False, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    return await _feeds_out(refresh)


class FeedIn(BaseModel):
    question_id: int | None = None  # None = the question the app was built with
    mode: str
    run_time: str = "06:00"
    weekdays: list[int] = [1, 2, 3, 4, 5, 6, 7]
    month_day: int = 1
    every_hours: int = 4


class OkOut(BaseModel):
    ok: bool = True
    detail: str = ""


@router.put("/api/admin/metabase/feeds/{dataset}", response_model=OkOut)
async def save_feed(dataset: str, payload: FeedIn, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    if not is_feed(dataset):
        raise HTTPException(status_code=404, detail="That file is not pulled from Metabase")
    if payload.mode not in MODES:
        raise HTTPException(status_code=422, detail=f"mode must be one of {', '.join(MODES)}")
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", payload.run_time):
        raise HTTPException(status_code=422, detail="The time must look like 06:00 (24-hour, Malaysia time)")
    days = sorted({d for d in payload.weekdays if 1 <= d <= 7})
    if payload.mode in ("daily", "hourly", "weekly") and not days:
        raise HTTPException(status_code=422, detail="Pick at least one weekday")
    if payload.mode == "weekly" and len(days) != 1:
        raise HTTPException(status_code=422, detail="A weekly pull runs on one weekday")
    if not 1 <= payload.month_day <= 31:
        raise HTTPException(status_code=422, detail="The day of the month must be 1 to 31")
    if not 1 <= payload.every_hours <= 24:
        raise HTTPException(status_code=422, detail="Every N hours: N must be 1 to 24")
    if payload.question_id is not None and payload.question_id <= 0:
        raise HTTPException(status_code=422, detail="The question number must be a positive number")
    await ensure_rows()
    qid = None if payload.question_id in (None, default_question(dataset)) else payload.question_id
    await db.execute(
        "UPDATE metabase_feeds SET question_id=%s, mode=%s, run_time=%s, weekdays=%s, month_day=%s, every_hours=%s, updated_by=%s, updated_at=%s WHERE dataset=%s",
        (qid, payload.mode, payload.run_time, ",".join(str(d) for d in days), payload.month_day, payload.every_hours, user.email, _now().replace(microsecond=0, tzinfo=None), dataset),
    )
    return {"ok": True, "detail": "Saved"}


@router.post("/api/admin/metabase/feeds/{dataset}/pull", response_model=OkOut)
async def pull_now(dataset: str, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    if not is_feed(dataset):
        raise HTTPException(status_code=404, detail="That file is not pulled from Metabase")
    if not mb.configured():
        raise HTTPException(status_code=409, detail="METABASE_API_KEY is not set on this app (portal -> Secrets)")
    if dataset in _running:
        raise HTTPException(status_code=409, detail="That file is being pulled right now")
    row = (await load_rows()).get(dataset)
    result = await pull(dataset, user.email, row["question_id"] if row else None)
    if result["status"] != "ok":
        raise HTTPException(status_code=502, detail=result["message"])
    return {"ok": True, "detail": result["message"]}


async def _pull_all(by: str) -> None:
    for name, row in (await load_rows()).items():
        if row["cfg"].mode == "off" or name in _running:
            continue
        await pull(name, by, row["question_id"])
        await asyncio.sleep(1)


@router.post("/api/admin/metabase/pull-all", response_model=OkOut)
async def pull_all(user: CurrentUser = Depends(get_current_user)):
    """Pull every feed that is not switched off, one after the other, in the background (the page shows each as it finishes)."""
    global _all_task
    _admin(user)
    if not mb.configured():
        raise HTTPException(status_code=409, detail="METABASE_API_KEY is not set on this app (portal -> Secrets)")
    if _all_task is not None and not _all_task.done():
        raise HTTPException(status_code=409, detail="A pull of every file is already running")
    _all_task = asyncio.create_task(_pull_all(user.email))
    return {"ok": True, "detail": "Pulling every file from Metabase -- this takes a few minutes"}


@router.get("/api/admin/metabase/check")
async def check(user: CurrentUser = Depends(get_current_user)):
    """What Metabase answers to this app's API key (never returns the key)."""
    _admin(user)
    return await mb.diagnose()
