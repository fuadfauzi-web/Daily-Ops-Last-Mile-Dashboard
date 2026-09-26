"""Recovery -> Active Missing, Lost Declared This Week, Lost Declared Summary (2026-09-26): the team's "Active Missing Southern" Google Sheet, moved into the app.

The sheet had three tabs and four Apps Scripts; here is what became of each.

Active Missing  (sheet: "Update Here!!!" + the hidden "Missing" query + copyNewTNtoUpdateHere + deleteRowsWithNoVlookup)
  The TN list is the app's own live open-missing query (Redash 1297, the same rows as Recovery -> Missing Details), without Ship Out and B2B like the sheet's
  "Missing" tab. Every user answers for the TNs in their own scope: ticket updated to In Progress?, parcel found?, customer contacted?, customer received?,
  liable party, remarks, checked by (active_missing_updates). A TN that has left the open list (settled) has its answers deleted by the refresh -- even if nobody
  updated it -- after 30 minutes off the list, so one bad refresh cannot wipe the answers.

Lost Declared This Week  (sheet: "Lost Declared This Week" + "Raw Lost" + the Gmail import script)
  The Metabase question "This Week Lost Declared" (125947). The app cannot read Gmail, so an admin uploads the question's CSV each day (Admin -> Documents, or the
  upload panel on the tab) -- sync_lost_upload() then does what the script did: new TNs are added, known ones refreshed with their answers kept, and a TN of THIS week
  that is no longer in the file is removed (its ticket changed). A TN of an EARLIER week that is missing from the file stays until the Monday move -- Metabase's
  "this week" has already rolled over by then. Only region staff (and managers / admins) can answer; everyone else monitors what is in their scope.

Lost Declared Summary  (sheet: "Lost Declared Summary" + copyLostDeclaredToSummary)
  Every Monday at 22:00 (Malaysia time) tick() moves what is on "This Week" to the Summary for good, answers included, and it leaves "This Week". The Week column is the
  resolution date's week (Excel WEEKNUM(..., 2): weeks start Monday, week 1 holds 1 January) in Malaysia time.

Not carried over: the sheet's "Current Status" column (a hand-pasted query of each TN's granular status).
"""
import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
import kpi_data as kd
from auth import CurrentUser, get_current_user
from kpi_rca import _hub_code_from_code
from stations import HUBS

log = logging.getLogger("recovery_lost")
router = APIRouter()

MYT = timezone(timedelta(hours=8))
YES_NO = ["Yes", "No", "Waiting confirmation"]
LIABLE = ["Hub", "Driver", "PDCNR", "Ship In", "Ship Out"]
LIABLE_LOST = LIABLE + ["TTDI Initiative"]
TICKET_UPDATED = ["Done", "Not Done"]
AM_CHOICES = {"ticket_updated": TICKET_UPDATED, "parcel_found": YES_NO, "contacted_customer": YES_NO, "customer_received": YES_NO, "liable_party": LIABLE}
AM_TEXT = ("remarks", "checked_by")
LD_CHOICES = {"customer_received": YES_NO, "liable_party": LIABLE_LOST}
LD_TEXT = ("remarks", "driver_name", "checked_by")
LOST_EDIT_ROLES = ("region", "manager", "admin")  # "limited to the region staff only can edit" (Fleet Manager, 2026-09-26); a manager / admin outranks them
_TEXT_MAX = {"remarks": 2000, "checked_by": 160, "driver_name": 200}
ROWS_CAP = 6000
ABSENT_GRACE = timedelta(minutes=30)
MOVE_JOB = "lost_move"
MOVE_WEEKDAY, MOVE_HOUR = 0, 22  # Monday 22:00 Malaysia time


# ------------------------------------------------------------------------------------------------ small helpers

def weeknum2(d: date) -> int:
    """Excel WEEKNUM(d, 2): weeks start on Monday, week 1 is the week that holds 1 January."""
    return (d.timetuple().tm_yday - 1 + date(d.year, 1, 1).weekday()) // 7 + 1


def _as_date(v) -> date | None:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return None


def _iso(v) -> str | None:
    if v is None:
        return None
    return v.isoformat() if hasattr(v, "isoformat") else str(v)


def _utc(v) -> datetime | None:
    if v is None:
        return None
    if isinstance(v, str):
        try:
            v = datetime.fromisoformat(v)
        except ValueError:
            return None
    return v if v.tzinfo else v.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _in_scope_named(user: CurrentUser, region: str, zone: str, station: str) -> bool:
    if user.scope_type == "all":
        return True
    vals = user.scope_values or []
    return {"region": region in vals, "zone": zone in vals, "station": station in vals}.get(user.scope_type, False)


def _validated(payload: dict, choices: dict, texts: tuple) -> dict:
    """The fields the caller sent, checked; an empty value clears the field."""
    out: dict = {}
    for k, v in payload.items():
        if k in choices:
            v = (v or "").strip() or None if v is not None else None
            if v is not None and v not in choices[k]:
                raise HTTPException(status_code=422, detail=f"{k.replace('_', ' ')}: pick one of {', '.join(choices[k])}")
            out[k] = v
        elif k in texts:
            v = None if v is None else (str(v).strip() or None)
            if v is not None and len(v) > _TEXT_MAX[k]:
                raise HTTPException(status_code=422, detail=f"{k.replace('_', ' ')} is too long (max {_TEXT_MAX[k]} characters)")
            out[k] = v
    return out


# ------------------------------------------------------------------------------------------------ Active Missing

AM_COLS = ["ticket_updated", "parcel_found", "contacted_customer", "customer_received", "liable_party", "remarks", "checked_by", "updated_by", "updated_at"]


class ActiveMissingIn(BaseModel):
    ticket_updated: str | None = None
    parcel_found: str | None = None
    contacted_customer: str | None = None
    customer_received: str | None = None
    liable_party: str | None = None
    remarks: str | None = None
    checked_by: str | None = None


async def _active_feedback() -> dict[str, dict]:
    try:
        rows = await db.fetch_all(f"SELECT tracking_number, {', '.join(AM_COLS)} FROM active_missing_updates")
    except Exception as e:  # noqa: BLE001
        log.warning("active_missing_updates could not be read (%s)", e)
        return {}
    return {r[0]: {c: (_iso(r[1 + i]) if c == "updated_at" else r[1 + i]) for i, c in enumerate(AM_COLS)} for r in rows}


def _active_rows(tn_rows: list[dict], user: CurrentUser) -> list[dict]:
    return [
        r for r in tn_rows
        if r.get("type") != "Ship Out" and not r.get("is_b2b") and _in_scope_named(user, r["region"], r["zone"], r["station_name"])
    ]


async def active_missing_view(tn_rows: list[dict], captured_at: str | None, user: CurrentUser, cod_threshold: float) -> dict:
    options = {"ticket_updated": TICKET_UPDATED, "parcel_found": YES_NO, "contacted_customer": YES_NO, "customer_received": YES_NO, "liable_party": LIABLE}
    if captured_at is None:
        return {"captured_at": None, "rows": [], "total": 0, "truncated": False, "options": options, "high_cod_value_threshold": cod_threshold}
    base = sorted(_active_rows(tn_rows, user), key=lambda r: r.get("age") or 0, reverse=True)
    fb = await _active_feedback()
    out = []
    for r in base[:ROWS_CAP]:
        f = fb.get(r["tracking_number"], {})
        out.append({
            "tracking_number": r["tracking_number"], "station_code": r["station_code"], "station_name": r["station_name"], "zone": r["zone"], "region": r["region"],
            "hub_code": r.get("hub_code"), "type": "PDCNR" if r.get("is_pdcnr") else r["type"], "age": r.get("age"), "cod_value": r.get("cod_value"),
            "item_description": r.get("item_description"), "is_high_value": r.get("is_high_value", False),
            **{c: f.get(c) for c in AM_COLS},
        })
    return {"captured_at": captured_at, "rows": out, "total": len(base), "truncated": len(base) > ROWS_CAP, "options": options, "high_cod_value_threshold": cod_threshold}


async def save_active_missing(tn: str, payload: ActiveMissingIn, tn_rows: list[dict], user: CurrentUser) -> dict:
    row = next((r for r in tn_rows if r["tracking_number"] == tn and r.get("type") != "Ship Out" and not r.get("is_b2b")), None)
    if row is None:
        raise HTTPException(status_code=404, detail="This tracking number is not on the active missing list any more (it may have just been settled)")
    if not _in_scope_named(user, row["region"], row["zone"], row["station_name"]):
        raise HTTPException(status_code=403, detail="This tracking number is outside your access")
    changes = _validated(payload.model_dump(exclude_unset=True), AM_CHOICES, AM_TEXT)
    if not changes:
        raise HTTPException(status_code=422, detail="Nothing to save")
    now = _now()
    existing = await db.fetch_one("SELECT checked_by FROM active_missing_updates WHERE tracking_number=%s", (tn,))
    if existing is None:
        vals = {c: changes.get(c) for c in ("ticket_updated", "parcel_found", "contacted_customer", "customer_received", "liable_party", "remarks", "checked_by")}
        if not vals["checked_by"]:
            vals["checked_by"] = user.display_name or user.email
        await db.execute(
            "INSERT INTO active_missing_updates (tracking_number, ticket_updated, parcel_found, contacted_customer, customer_received, liable_party, remarks, checked_by, updated_by, updated_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (tn, vals["ticket_updated"], vals["parcel_found"], vals["contacted_customer"], vals["customer_received"], vals["liable_party"], vals["remarks"], vals["checked_by"], user.email, now),
        )
    else:
        if "checked_by" not in changes and not existing[0]:
            changes["checked_by"] = user.display_name or user.email
        sets = ", ".join(f"{k}=%s" for k in changes)
        await db.execute(f"UPDATE active_missing_updates SET {sets}, updated_by=%s, updated_at=%s, absent_since=NULL WHERE tracking_number=%s", (*changes.values(), user.email, now, tn))
    fb = (await _active_feedback()).get(tn, {})
    return {"ok": True, "tracking_number": tn, **{c: fb.get(c) for c in AM_COLS}}


async def sync_active_missing(current_tns: set[str]) -> int:
    """Called by every refresh with the TNs on the open-missing list: answers for TNs that have left it are deleted once they have been off it for 30 minutes.
    Returns how many were deleted. Does nothing when the list is empty (a failed / empty query must never wipe the answers)."""
    if not current_tns:
        return 0
    try:
        rows = await db.fetch_all("SELECT tracking_number, absent_since FROM active_missing_updates")
    except Exception as e:  # noqa: BLE001
        log.warning("active missing cleanup skipped (%s)", e)
        return 0
    now, deleted = _now(), 0
    for tn, absent in rows:
        if tn in current_tns:
            if absent is not None:
                await db.execute("UPDATE active_missing_updates SET absent_since=NULL WHERE tracking_number=%s", (tn,))
            continue
        since = _utc(absent)
        if since is None:
            await db.execute("UPDATE active_missing_updates SET absent_since=%s WHERE tracking_number=%s", (now, tn))
        elif now - since >= ABSENT_GRACE:
            await db.execute("DELETE FROM active_missing_updates WHERE tracking_number=%s", (tn,))
            deleted += 1
    return deleted


# ------------------------------------------------------------------------------------------------ Lost Declared

LD_SOURCE = ["hub_code", "outcome", "ticket_type", "last_scan_user", "last_scan_type", "dest_zone", "cod_value", "ticket_notes", "items", "delivery_instructions",
             "resolution_at", "resolution_date", "days_to_resolution", "week_no", "week_year"]
LD_FEEDBACK = ["customer_received", "liable_party", "remarks", "driver_name", "checked_by", "updated_by", "updated_at"]
LD_ALL = ["tracking_number", "status", *LD_SOURCE, *LD_FEEDBACK, "added_at", "moved_at"]


class LostIn(BaseModel):
    customer_received: str | None = None
    liable_party: str | None = None
    remarks: str | None = None
    driver_name: str | None = None
    checked_by: str | None = None


def _resolution_date(text) -> date | None:
    """The resolution's date in Malaysia time (Metabase writes UTC: 2026-09-21T12:24:26Z); a timestamp without a zone is taken as Malaysia time already."""
    s = str(text or "").strip()
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return (dt.astimezone(MYT) if dt.tzinfo else dt).date()
    except ValueError:
        pass
    iso = kd.to_iso_day(s)
    return date.fromisoformat(iso) if iso else None


def _int(v) -> int | None:
    try:
        return int(float(str(v).strip()))
    except (TypeError, ValueError):
        return None


def parse_lost_rows(rows: list[dict]) -> list[dict]:
    """Rows of the "This Week Lost Declared" CSV (Metabase question 125947) -> dicts of the lost_declared source columns."""
    if not rows:
        return []
    keys = {kd.norm(k): k for k in rows[0]}

    def g(r: dict, *names: str):
        for n in names:
            if n in keys:
                v = r.get(keys[n])
                return None if v is None or str(v).strip() == "" else str(v).strip()
        return None

    out = []
    for r in rows:
        tn = g(r, "trackingid")
        if not tn:
            continue
        hub_raw = g(r, "investigatinghubname") or ""
        rdate = _resolution_date(g(r, "resolutiondatetime"))
        out.append({
            "tracking_number": tn,
            "hub_code": (_hub_code_from_code(hub_raw) or hub_raw) if hub_raw else None,
            "outcome": g(r, "outcome"), "ticket_type": g(r, "type"),
            "last_scan_user": g(r, "lastscanbeforeresolutionuser"), "last_scan_type": g(r, "lastscanbeforeresolutionscantype"),
            "dest_zone": g(r, "ordermilestonesdestzone"), "cod_value": g(r, "ordermilestonescodvalue", "codvalue"),
            "ticket_notes": g(r, "ticketnotes"), "items": g(r, "ordermilestonesitems", "items"),
            "delivery_instructions": g(r, "ordermilestonesdeliveryinstructions", "deliveryinstructions"),
            "resolution_at": g(r, "resolutiondatetime"), "resolution_date": rdate, "days_to_resolution": _int(g(r, "daystoresolution")),
            "week_no": weeknum2(rdate) if rdate else None, "week_year": rdate.year if rdate else None,
        })
    return out


async def sync_lost_upload(today: date | None = None) -> dict:
    """Bring "Lost Declared This Week" in line with the uploaded file (what the Gmail script did every morning)."""
    got = await kd.load_rows("lost_declared")
    if got is None:
        return {"total": 0, "added": 0, "updated": 0, "removed": 0, "kept_previous_week": 0, "already_in_summary": 0}
    _meta, rows = got
    parsed = parse_lost_rows(rows)
    today = today or datetime.now(MYT).date()
    monday = today - timedelta(days=today.weekday())
    existing = {r[0]: (r[1], _as_date(r[2])) for r in await db.fetch_all("SELECT tracking_number, status, resolution_date FROM lost_declared")}
    now = _now()
    seen: set[str] = set()
    add, upd, in_summary = [], [], 0
    for p in parsed:
        tn = p["tracking_number"]
        if tn in seen:
            continue
        seen.add(tn)
        ex = existing.get(tn)
        if ex is not None and ex[0] == "summary":
            in_summary += 1
        elif ex is not None:
            upd.append(p)
        else:
            add.append(p)
    src_sets = ", ".join(f"{c}=%s" for c in LD_SOURCE)
    await db.execute_many(
        f"UPDATE lost_declared SET {src_sets} WHERE tracking_number=%s AND status='week'",
        [(*(p[c] for c in LD_SOURCE), p["tracking_number"]) for p in upd],
    )
    await db.execute_many(
        f"INSERT INTO lost_declared (tracking_number, status, {', '.join(LD_SOURCE)}, added_at) VALUES (%s, 'week', {', '.join(['%s'] * len(LD_SOURCE))}, %s)",
        [(p["tracking_number"], *(p[c] for c in LD_SOURCE), now) for p in add],
    )
    removed = kept_old = 0
    for tn, (status, rdate) in existing.items():
        if status != "week" or tn in seen:
            continue
        if rdate is None or rdate >= monday:
            await db.execute("DELETE FROM lost_declared WHERE tracking_number=%s AND status='week'", (tn,))  # dropped within its own week: its ticket changed
            removed += 1
        else:
            kept_old += 1  # an earlier week waiting for the Monday move
    return {"total": len(seen), "added": len(add), "updated": len(upd), "removed": removed, "kept_previous_week": kept_old, "already_in_summary": in_summary}


async def move_week_to_summary() -> int:
    """Everything on "This Week" becomes part of the Summary (answers included). Returns how many rows moved."""
    n = (await db.fetch_one("SELECT COUNT(*) FROM lost_declared WHERE status='week'"))[0]
    if n:
        await db.execute("UPDATE lost_declared SET status='summary', moved_at=%s WHERE status='week'", (_now(),))
    return int(n)


def due_period(now: datetime) -> str:
    """The Monday whose 22:00 has most recently passed (Malaysia time), as text -- the period the weekly move is due for."""
    now = now.astimezone(MYT)
    monday = now.date() - timedelta(days=now.weekday())
    if now.weekday() == MOVE_WEEKDAY and now.hour < MOVE_HOUR:
        monday -= timedelta(days=7)
    return monday.isoformat()


async def tick(now: datetime | None = None) -> int | None:
    """Run from the refresh loop: does the Monday-22:00 move once per week (a later start-up still catches a missed one up). The very first call only marks the
    current period, so switching the feature on never moves anything by itself. Returns the rows moved, or None when nothing was due."""
    now = now or datetime.now(timezone.utc)
    period = due_period(now)
    try:
        row = await db.fetch_one("SELECT last_period FROM recovery_jobs WHERE job_key=%s", (MOVE_JOB,))
        if row is None:
            await db.execute("INSERT INTO recovery_jobs (job_key, last_period, last_run_at, detail) VALUES (%s, %s, %s, %s)", (MOVE_JOB, period, _now(), "initialised"))
            return None
        if row[0] == period:
            return None
        n = await move_week_to_summary()
        await db.execute("UPDATE recovery_jobs SET last_period=%s, last_run_at=%s, detail=%s WHERE job_key=%s", (period, _now(), f"moved {n} rows", MOVE_JOB))
        log.info("Lost declared: moved %d rows from This Week to the Summary (period %s)", n, period)
        return n
    except Exception:  # noqa: BLE001
        log.exception("Lost declared weekly move failed")
        return None


def _station_of(hub_code: str | None) -> tuple[str, str, str, str]:
    """(station code, station name, zone, region) of a hub code; a hub that is not on the station list is 'Unknown'."""
    if hub_code and hub_code in HUBS:
        name, _full, zone, region = HUBS[hub_code]
        return hub_code, name, zone, region
    return hub_code or "", hub_code or "(unknown hub)", "Unknown", "Unknown"


async def lost_view(user: CurrentUser, view: str, week: str | None) -> dict:
    status = "summary" if view == "summary" else "week"
    try:
        rows = await db.fetch_all(f"SELECT {', '.join(LD_ALL)} FROM lost_declared WHERE status=%s", (status,))
    except Exception as e:  # noqa: BLE001
        log.warning("lost_declared could not be read (%s)", e)
        rows = []
    base = []
    for r in rows:
        d = dict(zip(LD_ALL, r))
        code, name, zone, region = _station_of(d["hub_code"])
        if user.scope_type != "all" and region == "Unknown":
            continue
        if not _in_scope_named(user, region, zone, name):
            continue
        d.update({"station_code": code, "station_name": name, "zone": zone, "region": region})
        d["resolution_date"] = _iso(_as_date(d["resolution_date"]))
        for k in ("updated_at", "added_at", "moved_at"):
            d[k] = _iso(d[k])
        base.append(d)
    weeks: dict[tuple, int] = {}
    for d in base:
        if d["week_no"] is not None:
            weeks[(d["week_year"], d["week_no"])] = weeks.get((d["week_year"], d["week_no"]), 0) + 1
    week_list = [{"key": f"{y}-{w:02d}", "year": y, "week": w, "count": n} for (y, w), n in sorted(weeks.items(), reverse=True)]
    chosen = None
    if status == "summary":
        keys = {w["key"] for w in week_list}
        chosen = week if week in keys or week == "all" else (week_list[0]["key"] if week_list else "all")
        if chosen != "all":
            base = [d for d in base if d["week_no"] is not None and f"{d['week_year']}-{d['week_no']:02d}" == chosen]
    base.sort(key=lambda d: (d["resolution_date"] or "", d["tracking_number"]), reverse=True)
    up = (await kd.list_uploads()).get("lost_declared") if status == "week" else None
    return {
        "view": status, "rows": base[:ROWS_CAP], "total": len(base), "truncated": len(base) > ROWS_CAP,
        "weeks": week_list, "week": chosen, "can_edit": user.role in LOST_EDIT_ROLES, "upload": up,
        "options": {"customer_received": YES_NO, "liable_party": LIABLE_LOST},
        "move": {"weekday": "Monday", "hour": MOVE_HOUR},
    }


async def save_lost(tn: str, payload: LostIn, user: CurrentUser) -> dict:
    if user.role not in LOST_EDIT_ROLES:
        raise HTTPException(status_code=403, detail="Only region staff (and managers / admins) can update lost declared tracking numbers")
    row = await db.fetch_one("SELECT hub_code, checked_by FROM lost_declared WHERE tracking_number=%s", (tn,))
    if row is None:
        raise HTTPException(status_code=404, detail="Tracking number not found")
    _code, name, zone, region = _station_of(row[0])
    if not _in_scope_named(user, region, zone, name):
        raise HTTPException(status_code=403, detail="This tracking number is outside your access")
    changes = _validated(payload.model_dump(exclude_unset=True), LD_CHOICES, LD_TEXT)
    if not changes:
        raise HTTPException(status_code=422, detail="Nothing to save")
    if "checked_by" not in changes and not row[1]:
        changes["checked_by"] = user.display_name or user.email
    sets = ", ".join(f"{k}=%s" for k in changes)
    await db.execute(f"UPDATE lost_declared SET {sets}, updated_by=%s, updated_at=%s WHERE tracking_number=%s", (*changes.values(), user.email, _now(), tn))
    got = await db.fetch_one(f"SELECT {', '.join(LD_FEEDBACK)} FROM lost_declared WHERE tracking_number=%s", (tn,))
    return {"ok": True, "tracking_number": tn, **{c: (_iso(got[i]) if c == "updated_at" else got[i]) for i, c in enumerate(LD_FEEDBACK)}}


# ------------------------------------------------------------------------------------------------ endpoints

@router.get("/api/recovery/lost-declared")
async def get_lost_declared(view: str = "week", week: str | None = None, user: CurrentUser = Depends(get_current_user)):
    """Lost Declared This Week (view=week) or the Summary (view=summary, optionally one week as 2026-38 or 'all'), limited to the caller's access."""
    if view not in ("week", "summary"):
        raise HTTPException(status_code=422, detail="view must be week or summary")
    return await lost_view(user, view, week)


@router.put("/api/recovery/lost-declared/{tracking_number}")
async def put_lost_declared(tracking_number: str, payload: LostIn, user: CurrentUser = Depends(get_current_user)):
    """Region staff (and managers / admins): answer for one lost declared tracking number in their access."""
    return await save_lost(tracking_number, payload, user)


@router.post("/api/recovery/lost-declared/move")
async def post_lost_declared_move(user: CurrentUser = Depends(get_current_user)):
    """Admin only: move everything on Lost Declared This Week to the Summary now (it also happens by itself every Monday at 22:00)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    n = await move_week_to_summary()
    return {"ok": True, "moved": n}
