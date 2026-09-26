"""The station list (Region List) -- read from the Fleet Manager's Google Sheet instead of being changed in code (2026-09-26).

Master: the "Region List" sheet (link in SHEET_LINK). The app needs one row per Last Mile station: hub code (GROUP (LH)), station name, zone, region, and
STATUS Active / Virtual / Closed. Only Active / Virtual rows in Klang Valley, Northern, Southern, East Coast and East Malaysia count -- Closed stations and the
non-Last-Mile groups in the same sheet (SAMEDAY, NO HUB) are left out ("for now only Last Mile stations").

Where the app gets it, in this order:
  1. the sheet itself, when an admin pasted a "published to web" CSV link (Admin -> Documents -> Station list): the sheet needs a sign-in, so the app can only read it
     through that link (File -> Share -> Publish to web -> the Region tab -> CSV). Re-read every hour and on "Sync now"; if it fails the last good list stays.
  2. the file an admin uploaded (the sheet downloaded as CSV / Excel -- same page);
  3. the snapshot built into the code (stations.py, generated from the sheet with scripts/gen_stations.py) -- what runs until an admin does 1 or 2.
A change is applied at once on the replica that got it and within a minute on the others (ensure_fresh); dashboards pick new stations up at the next 15-minute
refresh. The KPI pages' cached data (built with the old list) is dropped so it is rebuilt with the new one.
"""
import logging
import time
from collections import Counter
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
import kpi_data as kd
import stations
from auth import CurrentUser, get_current_user

log = logging.getLogger("region_list")
router = APIRouter()

SHEET_LINK = "https://docs.google.com/spreadsheets/d/1KmHiK5q5mMoKX8N2TzlmRByjIc5nX2fwSsuCxHm4l8g/edit?gid=1339991125#gid=1339991125"
LAST_MILE_REGIONS = ("Klang Valley", "Northern", "Southern", "East Coast", "East Malaysia")
MIN_STATIONS = 50  # anything with fewer Last Mile stations than this is not the Region List
URL_SETTING = "region_list_url"
_URL_PREFIX = "https://docs.google.com/spreadsheets/"
_REFETCH_SECONDS = 3600
_CHECK_SECONDS = 60
_MAX_BYTES = 5 * 1024 * 1024


def parse(rows: list[dict]) -> tuple[dict[str, tuple[str, str, str, str]], dict]:
    """rows of the sheet (dicts keyed by header) -> ({hub code: (name, full name, zone, region)}, report)."""
    if not rows:
        return {}, {"kept": 0}
    keys = {kd.norm(k): k for k in rows[0]}

    def find(*names):
        return next((keys[n] for n in names if n in keys), None)

    k_code, k_full, k_name, k_zone, k_region = find("grouplh", "hubcode"), find("stationnamefull", "stationfullname"), find("stationname", "name"), find("zone"), find("region")
    k_status = next((k for n, k in keys.items() if n.startswith("status")), None)
    canon = {r.lower(): r for r in LAST_MILE_REGIONS}
    hubs: dict[str, tuple[str, str, str, str]] = {}
    ignored: Counter = Counter()
    other_regions: Counter = Counter()
    duplicates: list[str] = []
    for r in rows:
        code = str(r.get(k_code) or "").strip() if k_code else ""
        if not code:
            continue
        status = str(r.get(k_status) or "").strip().lower() if k_status else "active"
        if status not in ("active", "virtual"):
            ignored["closed / not active"] += 1
            continue
        region_raw = str(r.get(k_region) or "").strip() if k_region else ""
        region = canon.get(region_raw.lower())
        if region is None:
            other_regions[region_raw or "(no region)"] += 1
            continue
        name = str(r.get(k_name) or "").strip() if k_name else ""
        zone = str(r.get(k_zone) or "").strip() if k_zone else ""
        if not name or not zone:
            ignored["no station name / zone"] += 1
            continue
        if code in hubs:
            duplicates.append(code)
            continue
        full = str(r.get(k_full) or "").strip() if k_full else ""
        hubs[code] = (name, full or f"Station {name}", zone, region)
    report = {
        "kept": len(hubs),
        "by_region": {r: sum(1 for v in hubs.values() if v[3] == r) for r in LAST_MILE_REGIONS},
        "closed": ignored["closed / not active"],
        "not_last_mile": dict(other_regions),  # SAMEDAY, NO HUB ...
        "incomplete": ignored["no station name / zone"],
        "duplicates": duplicates[:10],
    }
    return hubs, report


def check(rows: list[dict]) -> None:
    """Upload validation: a file that is not the Region List is refused before it is stored."""
    hubs, report = parse(rows)
    if len(hubs) < MIN_STATIONS:
        raise kd.UploadError(
            f"Only {len(hubs)} Last Mile stations found (rows with a hub code, STATUS Active or Virtual, in {', '.join(LAST_MILE_REGIONS)}) -- this doesn't look like the Region List"
        )


def _build(rows: list[dict]) -> dict:
    hubs, report = parse(rows)
    return {"hubs": hubs, "report": report}


kd.register_compact("region_list", _build)
kd.DATASETS["region_list"]["check"] = check

# ------------------------------------------------------------------------------------------------ what is applied

_applied: dict = {"source": "bundled", "marker": None, "at": None, "report": None}
_sync: dict = {"fetched_at": None, "ok_at": None, "error": None, "monotonic": None}
_last_check = 0.0


def _changes_vs_bundled(hubs: dict) -> dict:
    b = stations.BUNDLED_HUBS
    return {
        "added": sorted(f"{v[0]} ({v[3]}, {v[2]})" for c, v in hubs.items() if c not in b),
        "removed": sorted(f"{v[0]} ({v[3]}, {v[2]})" for c, v in b.items() if c not in hubs),
        "changed": sorted(f"{v[0]}: {b[c][2]} / {b[c][3]} -> {v[2]} / {v[3]}" for c, v in hubs.items() if c in b and (b[c][0], b[c][2], b[c][3]) != (v[0], v[2], v[3])),
    }


def _apply(hubs: dict, source: str, marker, report: dict | None) -> None:
    changed = stations.replace_hubs(hubs)
    if changed:
        kd.drop_hub_caches(keep=("region_list",))
        log.info("Station list applied from %s: %d stations", source, len(hubs))
    _applied.update({"source": source, "marker": marker, "at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "report": report})


async def _url() -> str | None:
    try:
        row = await db.fetch_one("SELECT setting_value FROM kpi_settings WHERE setting_key=%s", (URL_SETTING,))
    except Exception as e:  # noqa: BLE001
        log.warning("region_list: could not read the sheet link (%s)", e)
        return None
    return (row[0] or "").strip() or None if row else None


async def _fetch(url: str) -> dict:
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.get(url)
    is_page = resp.content[:200].lstrip().lower().startswith((b"<!doctype", b"<html"))
    if resp.status_code in (401, 403) or (is_page and b"sign in to your google account" in resp.content.lower()):
        # a link published for the organisation only: Google wants a sign-in, which the app does not have (2026-09-26: the Fleet Manager's link did this)
        raise RuntimeError(
            "Google asks for a sign-in on this link, so the app cannot read it. In the sheet: File -> Share -> Publish to web -> Published content & settings, "
            "untick the box that makes viewers sign in with the organisation account, then press Sync now. (Or upload the sheet as a file below.)"
        )
    if resp.status_code != 200:
        raise RuntimeError(f"the sheet link answered HTTP {resp.status_code} -- is the tab published to the web as CSV?")
    if len(resp.content) > _MAX_BYTES:
        raise RuntimeError("the sheet link returned a file that is too large")
    if is_page:
        raise RuntimeError("the sheet link returned a web page, not CSV -- publish the tab as CSV (File -> Share -> Publish to web -> CSV)")
    _header, rows = kd.parse_table("region-list.csv", resp.content, None, ["grouplh", "stationname", "zone", "region"])
    check(rows)
    return _build(rows)


async def ensure_fresh(force: bool = False) -> None:
    """Bring the station list in line with its source (see the module docstring). Cheap when nothing changed: at most one small query a minute."""
    global _last_check
    now = time.monotonic()
    if not force and _last_check and now - _last_check < _CHECK_SECONDS:
        return
    _last_check = now
    url = await _url()
    if url:
        due = force or _sync["monotonic"] is None or now - _sync["monotonic"] > _REFETCH_SECONDS
        if due:
            _sync["monotonic"] = now
            _sync["fetched_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            try:
                built = await _fetch(url)
                _apply(built["hubs"], "sheet", _sync["fetched_at"], built["report"])
                _sync.update({"ok_at": _sync["fetched_at"], "error": None})
                return
            except Exception as e:  # noqa: BLE001
                _sync["error"] = str(e)[:300]
                log.warning("region_list: sheet sync failed (%s) -- keeping the last good list", e)
        if _applied["source"] == "sheet":
            return  # the last good copy of the sheet stays until the next successful sync
    else:
        _sync.update({"error": None})
    try:
        got = await kd.load_compact("region_list")
    except Exception as e:  # noqa: BLE001
        log.warning("region_list: could not read the uploaded file (%s)", e)
        return
    if got is not None:
        meta, comp = got
        marker = f"{meta.get('uploaded_at')}|{meta.get('filename')}"
        if _applied["source"] != "upload" or _applied["marker"] != marker:
            _apply(comp["hubs"], "upload", marker, comp["report"])
    elif _applied["source"] != "bundled":
        _apply(dict(stations.BUNDLED_HUBS), "bundled", None, None)


# ------------------------------------------------------------------------------------------------ admin endpoints

def _require_admin(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


class UrlIn(BaseModel):
    url: str | None = None


async def _status() -> dict:
    url = await _url()
    hubs = stations.HUBS
    return {
        "source": _applied["source"],
        "stations": len(hubs),
        "by_region": {r: sum(1 for v in hubs.values() if v[3] == r) for r in LAST_MILE_REGIONS},
        "applied_at": _applied["at"],
        "report": _applied["report"],
        "changes_vs_bundled": _changes_vs_bundled(dict(hubs)),
        "sheet_link": SHEET_LINK,
        "url": url,
        "sync": {"fetched_at": _sync["fetched_at"], "ok_at": _sync["ok_at"], "error": _sync["error"]},
    }


@router.get("/api/admin/region-list")
async def region_list_status(user: CurrentUser = Depends(get_current_user)):
    """Admin only: where the station list comes from (sheet link / uploaded file / built-in snapshot), how many stations, what differs from the built-in one."""
    _require_admin(user)
    await ensure_fresh()
    return await _status()


@router.put("/api/admin/region-list/url")
async def region_list_set_url(payload: UrlIn, user: CurrentUser = Depends(get_current_user)):
    """Admin only: set (or clear) the published-to-the-web CSV link of the Region List sheet, and read it now."""
    _require_admin(user)
    url = (payload.url or "").strip()
    if url and not url.startswith(_URL_PREFIX):
        raise HTTPException(status_code=422, detail="The link must be a Google Sheets link (https://docs.google.com/spreadsheets/...) published to the web as CSV")
    if url and len(url) > 600:
        raise HTTPException(status_code=422, detail="That link is too long")
    await db.execute("DELETE FROM kpi_settings WHERE setting_key=%s", (URL_SETTING,))
    if url:
        await db.execute(
            "INSERT INTO kpi_settings (setting_key, setting_value, changed_by, changed_at) VALUES (%s, %s, %s, %s)",
            (URL_SETTING, url, user.email, datetime.now(timezone.utc)),
        )
    await ensure_fresh(force=True)
    out = await _status()
    if url and out["sync"]["error"]:
        raise HTTPException(status_code=422, detail=f"The link was saved but could not be read: {out['sync']['error']}")
    return out


@router.post("/api/admin/region-list/sync")
async def region_list_sync(user: CurrentUser = Depends(get_current_user)):
    """Admin only: read the sheet link (or the uploaded file) again now."""
    _require_admin(user)
    await ensure_fresh(force=True)
    return await _status()
