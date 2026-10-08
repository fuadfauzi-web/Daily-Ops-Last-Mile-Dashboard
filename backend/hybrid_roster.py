"""Attendance -> Hybrid: the driver list comes from Metabase (2026-10-09).

Stations no longer key Hybrid drivers in by hand. Every morning the app runs the Metabase question "Active Driver Details" (id 126968, kept in the Last Mile collection, read with the portal
secret METABASE_API_KEY) and
  1. stores the rows in `driver_details` -- the same table the manual upload fills (the Routed View tenure also reads it; the rest of the question's data is kept for later use);
  2. syncs the HYBRID drivers (driver type Hybrid Driver / Hybrid Rider) into `hybrid_drivers`, which the Schedule's Hybrid list and the Hybrid attendance read.
A driver who has resigned or was terminated stays on the list until the station updates the employment end date in Ninja Van Operator -> Driver Strength; the next morning's pull then carries
the end date, the driver goes inactive, is kept for a month (hybrid_attendance.housekeeping_drivers) and is then removed for good together with their attendance. A driver who disappears
from the question altogether is treated the same way (end date = the day they went missing).
Station = the station abbreviation in the driver's name ("LKN - HD - FAUZI"), else the Hub Name column -- the same rule the Hybrid Productivity page uses.
"""
import logging
from datetime import date, datetime, timedelta, timezone

import db
import metabase_client as mb
from stations import FULL_NAME_TO_HUB, HUBS

log = logging.getLogger("hybrid_roster")

QUESTION_ID = 126968
PULL_AFTER = (6, 30)  # Malaysia time: Metabase refreshes at 06:00, pull right after
RETRY_AFTER = timedelta(minutes=30)
MIN_ROWS_TO_END_MISSING = 20  # a pull with fewer Hybrid drivers than this never ends the drivers that are not in it (a half-empty answer must not wipe the list)
KEEP_DAYS = 31  # same as hybrid_attendance.KEEP_AFTER_END_DAYS: an ended driver is not brought back once their month is up
_MYT = timezone(timedelta(hours=8))

_state: dict = {"day": None, "tried": None, "ok_at": None, "rows": None, "hybrid": None, "error": None, "result": None}


def _today() -> date:
    return datetime.now(_MYT).date()


def _now() -> datetime:
    return datetime.now(_MYT).replace(tzinfo=None)


def _parse_date(value) -> date | None:
    value = (str(value) if value is not None else "").strip()
    if not value:
        return None
    for fmt, size in (("%B %d, %Y", None), ("%b %d, %Y", None), ("%Y-%m-%d", 10), ("%d/%m/%Y", None)):
        try:
            return datetime.strptime(value[:size] if size else value, fmt).date()
        except ValueError:
            continue
    return None


def _clean(v) -> str | None:
    s = " ".join(str(v if v is not None else "").split())
    return s or None


def parse_rows(rows: list[dict]) -> list[tuple]:
    """(driver_id, display_name, hub_name, hub_region, zone, driver_type, start, end) for every usable row of the question."""
    out = []
    for r in rows:
        name = _clean(r.get("Display Name"))
        if not name:
            continue
        out.append((_clean(r.get("ID")), name, _clean(r.get("Hub Name")), _clean(r.get("Hub Region")), _clean(r.get("Zone")), _clean(r.get("Driver Type")),
                    _parse_date(r.get("Employment Start Date")), _parse_date(r.get("Employment End Date"))))
    return out


def station_of(name: str, hub_name: str | None) -> str | None:
    """The dashboard station for a driver, or None when it can't be told."""
    import kpi  # late import: kpi is large and only needed here

    code, station, _zone, _region = kpi._station_for(name, hub_name)
    if code:
        return station
    if hub_name:
        key = hub_name.strip()
        hub = FULL_NAME_TO_HUB.get(key.lower())
        if hub in HUBS:
            return HUBS[hub][0]
        for _code, (st, full, _z, _r) in HUBS.items():
            if key.lower() in (st.lower(), full.lower()):
                return st
    return None


def is_hybrid(driver_type: str | None) -> bool:
    return "hybrid" in (driver_type or "").lower()


def vehicle_of(driver_type: str | None) -> str | None:
    t = (driver_type or "").lower()
    return "Bike" if "rider" in t else "Van" if "driver" in t else None


async def store_driver_details(parsed: list[tuple], source: str) -> None:
    """Replace driver_details with these rows (what the manual upload does) and log the refresh."""
    await db.execute("DELETE FROM driver_details")
    await db.execute_many(
        """INSERT INTO driver_details (driver_id, display_name, hub_name, hub_region, zone, driver_type, employment_start_date, employment_end_date)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""", parsed)
    await db.execute("INSERT INTO driver_details_upload_log (uploaded_by, filename, row_count, uploaded_at) VALUES (%s, %s, %s, %s)", (source, f"Metabase question {QUESTION_ID}", len(parsed), datetime.now(timezone.utc)))


async def sync_hybrid_drivers(parsed: list[tuple]) -> dict:
    """Bring `hybrid_drivers` in line with the Hybrid rows of the question. Returns counts."""
    today = _today()
    res = {"added": 0, "updated": 0, "ended": 0, "skipped_no_station": 0, "skipped_old": 0, "hybrid_rows": 0}
    seen_ids: set[str] = set()
    for ext_id, name, hub_name, _reg, _zone, dtype, start, end in parsed:
        if not is_hybrid(dtype):
            continue
        res["hybrid_rows"] += 1
        station = station_of(name, hub_name)
        if station is None:
            res["skipped_no_station"] += 1
            continue
        if end and end < today - timedelta(days=KEEP_DAYS):
            res["skipped_old"] += 1  # their month is up: not brought back
            continue
        if ext_id:
            seen_ids.add(ext_id)
        active = 0 if (end and end < today) else 1
        row = (await db.fetch_one("SELECT id, station, name FROM hybrid_drivers WHERE driver_id = %s", (ext_id,))) if ext_id else None
        if row is None:
            row = await db.fetch_one("SELECT id, station, name FROM hybrid_drivers WHERE station = %s AND name = %s", (station, name))
        if row is None:
            await db.execute(
                "INSERT INTO hybrid_drivers (station, name, driver_id, vehicle_type, joined_date, end_date, active, created_by, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (station, name, ext_id, vehicle_of(dtype), start, end, active, "metabase", _now()))
            res["added"] += 1
            continue
        did, old_station, old_name = row
        clash = (station, name) != (old_station, old_name) and await db.fetch_one("SELECT id FROM hybrid_drivers WHERE station = %s AND name = %s AND id <> %s", (station, name, did))
        new_station, new_name = (old_station, old_name) if clash else (station, name)
        await db.execute("UPDATE hybrid_drivers SET station=%s, name=%s, driver_id=%s, vehicle_type=%s, joined_date=%s, end_date=%s, active=%s, updated_at=%s WHERE id=%s",
                         (new_station, new_name, ext_id, vehicle_of(dtype), start, end, active, _now(), did))
        if (new_station, new_name) != (old_station, old_name):  # the Schedule refers to a Hybrid driver by station + name
            await db.execute("UPDATE schedule_entries SET station=%s, person_ref=%s WHERE person_type='hybrid' AND station=%s AND person_ref=%s", (new_station, new_name, old_station, old_name))
        res["updated"] += 1
    if res["hybrid_rows"] >= MIN_ROWS_TO_END_MISSING:
        for did, ext_id in await db.fetch_all("SELECT id, driver_id FROM hybrid_drivers WHERE driver_id IS NOT NULL AND end_date IS NULL AND active = 1"):
            if ext_id not in seen_ids:  # gone from Metabase: treated as ended today
                await db.execute("UPDATE hybrid_drivers SET end_date=%s, active=0, updated_at=%s WHERE id=%s", (today, _now(), did))
                res["ended"] += 1
    return res


async def refresh(source: str = "metabase") -> dict:
    """Pull the question, store it, sync the Hybrid drivers. Raises mb.MetabaseError / ValueError with a message the page can show."""
    rows = await mb.fetch_question(QUESTION_ID)
    parsed = parse_rows(rows)
    if not parsed:
        raise ValueError("Metabase returned no driver rows -- the previous list is kept")
    await store_driver_details(parsed, source)
    res = await sync_hybrid_drivers(parsed)
    _state.update(ok_at=_now().isoformat(timespec="minutes"), rows=len(parsed), hybrid=res["hybrid_rows"], error=None, result=res, day=_today())
    log.info("Hybrid roster from Metabase: %d rows, %s", len(parsed), res)
    return res


async def tick() -> None:
    """Called every ~30 s by the app's background loop: once a day, after 06:30 Malaysia time, pull the list (retry every 30 minutes if it fails). Never raises."""
    try:
        if not mb.configured():
            _state["error"] = "METABASE_API_KEY is not set on this app"
            return
        now = _now()
        if _state["day"] == now.date() or (now.hour, now.minute) < PULL_AFTER:
            return
        if _state["tried"] and now - _state["tried"] < RETRY_AFTER:
            return
        _state["tried"] = now
        await refresh()
    except Exception as exc:  # noqa: BLE001
        _state["error"] = str(exc)[:300]
        log.exception("Hybrid roster pull failed")


def status() -> dict:
    return {"configured": mb.configured(), "question": QUESTION_ID, "last_ok": _state["ok_at"], "rows": _state["rows"], "hybrid_rows": _state["hybrid"], "error": _state["error"], "result": _state["result"]}
