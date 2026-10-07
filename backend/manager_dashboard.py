"""Manager Dashboard (2026-10-08): the Fleet Manager's own page, modelled on the "South Management" sheet -- Station Capacity + Driver Strength per station of their region, and a personal workspace.
Only HOD and Manager (and the Superadmin) can open it. A Manager is locked to their own region (the home scope the Fleet Admin team keeps on the user); an HOD or the Superadmin sees every region.

Where each number comes from:
  * Plan headcount / plan volume / drivers required / riders required -- typed in by the manager (table manager_station_plan, V84), exactly like the sheet's yellow cells.
  * Staff -- the Staff & Org Chart (headcount.py): people posted at the station + approved TBA seats.
  * Drivers by type (HD / HR / ID / IR), who resigned in the last week / 2 weeks / month -- Metabase question 127638 (drivers_enriched by hub and type; an empty End Date is a driver still employed).
  * Active drivers past 2 / 4 weeks (a route with at least one parcel delivered) -- Metabase questions 127639 / 127640. All three are pulled by the app on a schedule (metabase_pull.py), or uploaded.
  * Volume, routed, attendance, success -- the daily Station Health snapshot DoD keeps (dod_daily): the last 7 finished days, and today's attendance so far.
The workspace (links with their due dates, and a notes page) belongs to the person who types it: nobody else can read it.
"""
import logging
import re
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
import headcount
import kpi_data as kd
from auth import CurrentUser, get_current_user
from stations import HUBS

log = logging.getLogger("manager_dashboard")
router = APIRouter()
_MYT = timezone(timedelta(hours=8))

DS_DRIVERS = "mgr_drivers"
DS_ACTIVE_2W = "mgr_active_2w"
DS_ACTIVE_4W = "mgr_active_4w"


def _require_manager(user: CurrentUser) -> None:
    if user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="The Manager Dashboard is for HODs and Fleet Managers only")


def _scope_of(user: CurrentUser) -> tuple[str, list[str]]:
    """The places this person may see: ('all', []) or ('region' | 'zone' | 'station', values). A Fleet Manager is limited to the region they are posted to; an HOD and the
    Superadmin see everything. A narrowing set elsewhere on the account (Role Access, View As) applies on top."""
    if user.role == "admin" or user.position == "hod":
        scope = ("all", [])
    else:
        st = (user.home_scope_type or "").lower()
        vals = [v for v in (user.home_scope_values or []) if v]
        scope = (st, vals) if st in ("region", "zone", "station") and vals else ("all", [])
    if user.scope_type in ("region", "zone", "station") and user.scope_values:  # an extra narrowing -- keep the narrower of the two
        scope = (user.scope_type, list(user.scope_values))
    return scope


def _codes_in_scope(scope: tuple[str, list[str]]) -> list[str]:
    st, vals = scope
    out = []
    for code, (name, _full, zone, region) in HUBS.items():
        if st == "all" or (st == "region" and region in vals) or (st == "zone" and zone in vals) or (st == "station" and name in vals):
            out.append(code)
    return out


def _scope_label(scope: tuple[str, list[str]]) -> str:
    return "All regions" if scope[0] == "all" else ", ".join(scope[1])


# ------------------------------------------------------------------------------------------------ reading the feeder files

_DATE_FORMATS = ("%Y-%m-%d", "%B %d, %Y", "%b %d, %Y", "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%m/%d/%Y")


def _parse_day(value) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        try:
            return date.fromisoformat(s[:10])
        except ValueError:
            return None
    for fmt in _DATE_FORMATS[1:]:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _to_int(value) -> int:
    try:
        return int(float(str(value).replace(",", "")))
    except (TypeError, ValueError):
        return 0


def _type_key(driver_type: str) -> str | None:
    t = (driver_type or "").upper()
    if t.startswith("HYBRID DRIVER"):
        return "hd"
    if t.startswith("HYBRID RIDER"):
        return "hr"
    if t.startswith("INDEPENDENT DRIVER"):
        return "id"
    if t.startswith("INDEPENDENT RIDER"):
        return "ir"
    return None


def _empty_strength() -> dict[str, int]:
    return {"hd": 0, "hr": 0, "id": 0, "ir": 0}


def _source_label(meta: dict | None) -> str | None:
    return f"{meta['filename']} ({str(meta['uploaded_at'])[:10]})" if meta else None


async def _driver_counts(today: date) -> tuple[dict[str, dict], dict[str, dict], str | None]:
    """({hub code: {hd, hr, id, ir}} still employed, {hub code: {w1, w2, w4}} resigned in the last 7 / 14 / 30 days, source label)."""
    loaded = await kd.load_rows(DS_DRIVERS)
    if not loaded:
        return {}, {}, None
    meta, rows = loaded
    strength: dict[str, dict] = {}
    resigned: dict[str, dict] = {}
    for r in rows:
        idx = {kd.norm(k): v for k, v in r.items()}
        hub = str(idx.get("hubname") or "").strip()
        key = _type_key(str(idx.get("drivertype") or ""))
        n = _to_int(idx.get("drivers"))
        if hub not in HUBS or key is None or n <= 0:
            continue
        ended = _parse_day(idx.get("employmentenddate"))
        if ended is None:
            strength.setdefault(hub, _empty_strength())[key] += n
        else:
            age = (today - ended).days
            c = resigned.setdefault(hub, {"w1": 0, "w2": 0, "w4": 0})
            if 0 <= age <= 7:
                c["w1"] += n
            if 0 <= age <= 14:
                c["w2"] += n
            if 0 <= age <= 30:
                c["w4"] += n
    return strength, resigned, _source_label(meta)


async def _active_counts(dataset: str) -> tuple[dict[str, int], str | None]:
    loaded = await kd.load_rows(dataset)
    if not loaded:
        return {}, None
    meta, rows = loaded
    out: dict[str, int] = {}
    for r in rows:
        idx = {kd.norm(k): v for k, v in r.items()}
        hub = str(idx.get("driversenrichedhubname") or idx.get("hubname") or "").strip()
        if hub in HUBS:
            out[hub] = out.get(hub, 0) + _to_int(idx.get("activedrivers"))
    return out, _source_label(meta)


async def _snapshot_numbers(today: date) -> tuple[dict[str, dict], dict[str, dict], str | None]:
    """({hub: last-7-finished-days numbers}, {hub: today's attendance so far}, the day today's numbers are from) out of dod_daily."""
    since = today - timedelta(days=7)
    db_rows = await db.fetch_all(
        "SELECT snap_date, station_code, total_fresh, total_routed, attendance, current_success FROM dod_daily WHERE snap_date >= %s",
        (since,),
    )
    week: dict[str, dict] = {}
    now: dict[str, dict] = {}
    latest = None
    for snap, code, fresh, routed, attendance, success in db_rows:
        day = _parse_day(snap)
        if day is None or code not in HUBS:
            continue
        if day == today:
            now[code] = {"attendance": int(attendance or 0), "routed": int(routed or 0), "success": int(success or 0)}
            latest = day.isoformat()
            continue
        w = week.setdefault(code, {"days": 0, "fresh": 0.0, "routed": 0.0, "attendance": 0.0, "success": 0.0})
        w["days"] += 1
        w["fresh"] += float(fresh or 0)
        w["routed"] += float(routed or 0)
        w["attendance"] += float(attendance or 0)
        w["success"] += float(success or 0)
    return week, now, latest


# ------------------------------------------------------------------------------------------------ Station Capacity + Driver Strength

class Plan(BaseModel):
    headcount: int | None = None
    volume: int | None = None
    drivers: int | None = None
    riders: int | None = None


class StationRow(BaseModel):
    station_code: str
    station_name: str
    zone: str
    region: str
    plan: Plan
    plan_updated_by: str | None = None
    staff_filled: int | None = None
    staff_tba: int | None = None
    hd: int | None = None  # None = the drivers file has not been loaded
    hr: int | None = None
    id: int | None = None
    ir: int | None = None
    resigned_w1: int | None = None
    resigned_w2: int | None = None
    resigned_w4: int | None = None
    active_2w: int | None = None
    active_4w: int | None = None
    attendance_today: int | None = None
    routed_today: int | None = None
    week_days: int = 0  # finished days the week figures are over
    avg_fresh: float | None = None
    avg_routed: float | None = None
    avg_attendance: float | None = None
    success_pct: float | None = None  # last 7 finished days: success / routed
    productivity: float | None = None  # routed / attendance over those days


class StationsResponse(BaseModel):
    scope: str
    locked: bool  # the person is limited to their own region
    scope_note: str | None = None
    can_edit_plan: bool = True
    sources: dict[str, str | None]
    today: str
    rows: list[StationRow]


@router.get("/api/manager-dashboard/stations", response_model=StationsResponse)
async def stations(user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    today = datetime.now(_MYT).date()
    scope = _scope_of(user)
    codes = _codes_in_scope(scope)
    plans = {r[0]: r for r in await db.fetch_all("SELECT station_code, plan_headcount, plan_vol, driver_required, rider_required, updated_by FROM manager_station_plan")}
    staff = await headcount.headcount_by_station()
    strength, resigned, drivers_src = await _driver_counts(today)
    active2, active2_src = await _active_counts(DS_ACTIVE_2W)
    active4, active4_src = await _active_counts(DS_ACTIVE_4W)
    week, now, snap_day = await _snapshot_numbers(today)

    rows = []
    for code in codes:
        name, _full, zone, region = HUBS[code]
        p = plans.get(code)
        s = staff.get(name)
        st = strength.get(code)
        rs = resigned.get(code, {"w1": 0, "w2": 0, "w4": 0}) if drivers_src else None
        w = week.get(code)
        n = now.get(code)
        rows.append({
            "station_code": code, "station_name": name, "zone": zone, "region": region,
            "plan": {"headcount": p[1] if p else None, "volume": p[2] if p else None, "drivers": p[3] if p else None, "riders": p[4] if p else None},
            "plan_updated_by": p[5] if p else None,
            "staff_filled": s["filled"] if s else None, "staff_tba": s["tba"] if s else None,
            "hd": (st or _empty_strength())["hd"] if drivers_src else None, "hr": (st or _empty_strength())["hr"] if drivers_src else None,
            "id": (st or _empty_strength())["id"] if drivers_src else None, "ir": (st or _empty_strength())["ir"] if drivers_src else None,
            "resigned_w1": rs["w1"] if rs else None, "resigned_w2": rs["w2"] if rs else None, "resigned_w4": rs["w4"] if rs else None,
            "active_2w": active2.get(code, 0) if active2_src else None, "active_4w": active4.get(code, 0) if active4_src else None,
            "attendance_today": n["attendance"] if n else None, "routed_today": n["routed"] if n else None,
            "week_days": w["days"] if w else 0,
            "avg_fresh": round(w["fresh"] / w["days"], 1) if w else None,
            "avg_routed": round(w["routed"] / w["days"], 1) if w else None,
            "avg_attendance": round(w["attendance"] / w["days"], 1) if w else None,
            "success_pct": round(w["success"] / w["routed"] * 100, 1) if w and w["routed"] else None,
            "productivity": round(w["routed"] / w["attendance"], 1) if w and w["attendance"] else None,
        })
    rows.sort(key=lambda r: (r["region"], r["zone"], r["station_name"]))

    locked = scope[0] != "all"
    note = None
    if user.role == "manager" and user.position == "manager" and not locked:
        note = "No region is set on your account yet, so every region is shown -- ask the Fleet Admin team to set yours."
    return {
        "scope": _scope_label(scope), "locked": locked, "scope_note": note, "can_edit_plan": True,
        "sources": {"drivers": drivers_src, "active_2w": active2_src, "active_4w": active4_src, "snapshot_day": snap_day},
        "today": today.isoformat(), "rows": rows,
    }


class PlanIn(BaseModel):
    headcount: int | None = None
    volume: int | None = None
    drivers: int | None = None
    riders: int | None = None


@router.put("/api/manager-dashboard/plan/{station_code}", response_model=Plan)
async def put_plan(station_code: str, payload: PlanIn, user: CurrentUser = Depends(get_current_user)):
    """Save one station's plan figures (null clears a figure). Only for stations inside the person's own scope."""
    _require_manager(user)
    if station_code not in HUBS or station_code not in _codes_in_scope(_scope_of(user)):
        raise HTTPException(status_code=403, detail="That station is outside your region")
    vals = (payload.headcount, payload.volume, payload.drivers, payload.riders)
    if any(v is not None and (v < 0 or v > 10_000_000) for v in vals):
        raise HTTPException(status_code=422, detail="Plan figures must be between 0 and 10,000,000")
    now = datetime.now(timezone.utc)
    if await db.fetch_one("SELECT station_code FROM manager_station_plan WHERE station_code = %s", (station_code,)):
        await db.execute(
            "UPDATE manager_station_plan SET plan_headcount=%s, plan_vol=%s, driver_required=%s, rider_required=%s, updated_by=%s, updated_at=%s WHERE station_code=%s",
            (*vals, user.email, now, station_code),
        )
    else:
        await db.execute(
            "INSERT INTO manager_station_plan (station_code, plan_headcount, plan_vol, driver_required, rider_required, updated_by, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (station_code, *vals, user.email, now),
        )
    return {"headcount": vals[0], "volume": vals[1], "drivers": vals[2], "riders": vals[3]}


# ------------------------------------------------------------------------------------------------ workspace: links + due dates, notes

class LinkIn(BaseModel):
    category: str = ""
    title: str
    url: str = ""
    due_text: str = ""


class LinkOut(BaseModel):
    id: int
    category: str
    title: str
    url: str
    due_text: str


def _clean_link(p: LinkIn) -> tuple[str, str, str, str]:
    title = p.title.strip()
    url = p.url.strip()
    if not title or len(title) > 200:
        raise HTTPException(status_code=422, detail="Give the link a name (up to 200 characters)")
    if url and not re.match(r"^https?://", url, re.I):
        raise HTTPException(status_code=422, detail="The address must start with http:// or https://")
    if len(url) > 1000 or len(p.category.strip()) > 80 or len(p.due_text.strip()) > 120:
        raise HTTPException(status_code=422, detail="One of the fields is too long")
    return p.category.strip(), title, url, p.due_text.strip()


def _link_row(r) -> dict:
    return {"id": int(r[0]), "category": r[1] or "", "title": r[2] or "", "url": r[3] or "", "due_text": r[4] or ""}


@router.get("/api/manager-dashboard/links", response_model=list[LinkOut])
async def list_links(user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    rows = await db.fetch_all(
        "SELECT id, category, title, url, due_text FROM manager_links WHERE owner_email = %s ORDER BY category, sort_order, id", (user.email.lower(),)
    )
    return [_link_row(r) for r in rows]


@router.post("/api/manager-dashboard/links", response_model=LinkOut)
async def add_link(payload: LinkIn, user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    category, title, url, due = _clean_link(payload)
    new_id = await db.execute(
        "INSERT INTO manager_links (owner_email, category, title, url, due_text, sort_order, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (user.email.lower(), category, title, url, due, 0, datetime.now(timezone.utc)),
    )
    return {"id": int(new_id), "category": category, "title": title, "url": url, "due_text": due}


@router.put("/api/manager-dashboard/links/{link_id}", response_model=LinkOut)
async def edit_link(link_id: int, payload: LinkIn, user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    category, title, url, due = _clean_link(payload)
    n = await db.execute_rowcount(
        "UPDATE manager_links SET category=%s, title=%s, url=%s, due_text=%s WHERE id=%s AND owner_email=%s", (category, title, url, due, link_id, user.email.lower())
    )
    if not n and not await db.fetch_one("SELECT id FROM manager_links WHERE id=%s AND owner_email=%s", (link_id, user.email.lower())):
        raise HTTPException(status_code=404, detail="Link not found")
    return {"id": link_id, "category": category, "title": title, "url": url, "due_text": due}


@router.delete("/api/manager-dashboard/links/{link_id}")
async def delete_link(link_id: int, user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    await db.execute("DELETE FROM manager_links WHERE id=%s AND owner_email=%s", (link_id, user.email.lower()))
    return {"ok": True}


class NotesIn(BaseModel):
    body: str = ""


class NotesOut(BaseModel):
    body: str
    updated_at: str | None = None


@router.get("/api/manager-dashboard/notes", response_model=NotesOut)
async def get_notes(user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    r = await db.fetch_one("SELECT body, updated_at FROM manager_notes WHERE owner_email = %s", (user.email.lower(),))
    return {"body": (r[0] or "") if r else "", "updated_at": (r[1].isoformat() if hasattr(r[1], "isoformat") else str(r[1])) if r and r[1] else None}


@router.put("/api/manager-dashboard/notes", response_model=NotesOut)
async def put_notes(payload: NotesIn, user: CurrentUser = Depends(get_current_user)):
    _require_manager(user)
    if len(payload.body) > 20000:
        raise HTTPException(status_code=422, detail="Notes are limited to 20,000 characters")
    now = datetime.now(timezone.utc)
    if await db.fetch_one("SELECT owner_email FROM manager_notes WHERE owner_email = %s", (user.email.lower(),)):
        await db.execute("UPDATE manager_notes SET body=%s, updated_at=%s WHERE owner_email=%s", (payload.body, now, user.email.lower()))
    else:
        await db.execute("INSERT INTO manager_notes (owner_email, body, updated_at) VALUES (%s, %s, %s)", (user.email.lower(), payload.body, now))
    return {"body": payload.body, "updated_at": now.isoformat()}
