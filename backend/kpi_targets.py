"""KPI targets by region and KPI settings -- editable by an admin (Admin -> KPI Settings).

Targets: the Fleet Manager's "New Target" table (2026-09-26), plus Complaint and Hybrid Productivity (added 2026-09-26). One place for the numbers so every
KPI page judges a station against ITS region's target. "lower" KPIs (Lost, Complaint, COD RTS, Invalid POD) are met when the rate is at or under the
target, "higher" ones when it is at or over. Hybrid Productivity has a target per region too but none has been given yet, so it starts "not set" (None)
-- the Fleet Manager types the numbers into the Admin page; until then the Hybrid page keeps its old fixed line (productivity 80).

The table below holds the DEFAULTS. What an admin changes is stored in the kpi_targets table (V40) as the differences from these defaults, so a cell
nobody touched follows the code. Reading is synchronous (target_for) from a small in-memory copy that ensure_fresh() reloads at most every 30 seconds
(and at once after a save); version() changes whenever a number or a setting does, so cached views can tell.

Settings (kpi_settings table, V41): include_east_malaysia -- default OFF: the KPI pages are for Last Mile stations and East Malaysia is Retail, so its
stations / regions are left out of every KPI page until an admin switches it on. include_sarawak -- default OFF (Fleet Manager, 2026-09-26: "Sarawak stays out of the
KPI pages for now"): the Sarawak stations (zones East Malaysia 3 and 4) stay out even when East Malaysia itself is switched on, until an admin includes them too.
"""
import logging
import math
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user

log = logging.getLogger("kpi_targets")
router = APIRouter()

REGIONS = ["Klang Valley", "Northern", "Southern", "East Coast", "East Malaysia"]
FALLBACK_REGION = "Klang Valley"  # a station whose region is unknown is judged like the standard (Klang Valley / Northern / Southern) targets
EAST_MALAYSIA = "East Malaysia"
SARAWAK_ZONES = ("East Malaysia 3", "East Malaysia 4")  # Kuching, Batu Kawa, Petra Jaya, Samarahan (3); Sibu, Saratok, Bintulu, Miri (4)


def _same(v: float | None) -> dict[str, float | None]:
    return {r: v for r in REGIONS}


# key -> (label, direction, {region: default target}, unit)     unit "pct" = a percentage (0-100), "number" = a plain number (Hybrid productivity)
# The order here is the order of the Admin page = the KPI page's RCA analysis menu (Fleet Manager, 2026-09-26): Hybrid, Prior, FIFO D0, D0, D3, T7, COD RTS, Lost, Invalid POD, Complaint.
KPI_TARGETS: dict[str, tuple[str, str, dict[str, float | None], str]] = {
    "hybrid": ("Hybrid Productivity", "higher", _same(None), "number"),
    "prior": ("Prior", "higher", _same(92)),
    "fifo": ("FIFO D0", "higher", {"Klang Valley": 96, "Northern": 96, "Southern": 96, "East Coast": 97, "East Malaysia": 94}),
    "d0": ("Completion D0", "higher", {"Klang Valley": 88, "Northern": 88, "Southern": 88, "East Coast": 90, "East Malaysia": 90}),
    "d3": ("Completion D3", "higher", {"Klang Valley": 96, "Northern": 96, "Southern": 96, "East Coast": 96, "East Malaysia": 93}),
    "t7": ("Terminal T7 (D7)", "higher", _same(100)),
    "cod_rts": ("COD RTS", "lower", {"Klang Valley": 9, "Northern": 9, "Southern": 9, "East Coast": 7, "East Malaysia": 12}),
    "lost": ("Lost", "lower", _same(0.005)),
    "invalid_pod": ("Invalid POD", "lower", _same(25)),
    "complaint": ("Complaint", "lower", _same(0.04)),  # 0.04% = the 0.0004 in the WoW dashboard's own header
}
KPI_TARGETS = {k: (v[0], v[1], v[2], v[3] if len(v) > 3 else "pct") for k, v in KPI_TARGETS.items()}

# the Weekly Dashboard's own keys (Dashboard WoW sheet columns) -> the keys above
WEEKLY_KEYS = {"fifo_d0": "fifo", "d0": "d0", "d3": "d3", "t7": "t7", "prior": "prior", "lost": "lost", "complaint": "complaint", "cod_rts": "cod_rts", "invalid_pod": "invalid_pod"}

SETTING_DEFAULTS = {"include_east_malaysia": False, "include_sarawak": False}

_TTL_SECONDS = 30
_MAX = {"pct": 100.0, "number": 100000.0}
_custom: dict[tuple[str, str], float] = {}  # (kpi, region) -> the admin's number, only where it differs from the default
_changed: dict[tuple[str, str], tuple[str, str]] = {}  # (kpi, region) -> (changed_by, changed_at)
_settings: dict[str, bool] = dict(SETTING_DEFAULTS)
_settings_changed: dict[str, tuple[str, str]] = {}
_loaded_at = 0.0
_version = 0


def target_for(kpi: str, region: str | None) -> float | None:
    """Target of `kpi` for a region (the standard region's when the region is unknown), admin changes included; None = not set (Hybrid until fed)."""
    by_region = KPI_TARGETS[kpi][2]
    r = region if region in by_region else FALLBACK_REGION
    v = _custom.get((kpi, r))
    d = by_region[r]
    return v if v is not None else (None if d is None else float(d))


def targets_for(kpi: str) -> dict[str, float | None]:
    return {r: target_for(kpi, r) for r in REGIONS}


def weekly_region_targets() -> dict[str, dict[str, float]]:
    """{region: {weekly KPI key: target as a fraction}} for the Weekly Dashboard, whose values are fractions (0.96)."""
    return {r: {wk: target_for(k, r) / 100 for wk, k in WEEKLY_KEYS.items()} for r in REGIONS}


def include_east_malaysia() -> bool:
    """Whether the KPI pages count East Malaysia (default no -- it is Retail, not Last Mile)."""
    return _settings["include_east_malaysia"]


def include_sarawak() -> bool:
    """Whether the KPI pages count the Sarawak stations (default no -- and never while East Malaysia itself is left out)."""
    return _settings["include_sarawak"]


def excluded_region(region: str | None) -> bool:
    """True for a region the KPI pages leave out right now."""
    return (region or "").strip().lower() == EAST_MALAYSIA.lower() and not include_east_malaysia()


def is_sarawak_zone(zone: str | None) -> bool:
    return (zone or "").strip().lower() in {z.lower() for z in SARAWAK_ZONES}


def excluded_place(region: str | None, zone: str | None) -> bool:
    """True for a station / zone / region the KPI pages leave out right now: East Malaysia while it is switched off, Sarawak while it is."""
    return excluded_region(region) or (is_sarawak_zone(zone) and not include_sarawak())


def scope_flags() -> tuple:
    """Part of every KPI view's cache key: what the two switches say."""
    return (include_east_malaysia(), include_sarawak())


def version() -> int:
    """Changes whenever a target or a setting does -- part of the cache key of every view that depends on them."""
    return _version


async def ensure_fresh(force: bool = False) -> None:
    """Reload the admin's changes from the database (at most every 30 s unless forced). A missing table or a database hiccup leaves the last
    known numbers in place -- the KPI pages must never fail because of the targets."""
    global _custom, _changed, _settings, _settings_changed, _loaded_at, _version
    now = time.monotonic()
    if not force and _loaded_at and now - _loaded_at < _TTL_SECONDS:
        return
    _loaded_at = now
    try:
        rows = await db.fetch_all("SELECT kpi, region, target, changed_by, changed_at FROM kpi_targets")
    except Exception as e:  # noqa: BLE001
        log.warning("kpi_targets: could not read the table (%s) -- using the numbers already loaded", e)
        rows = None
    if rows is not None:
        custom, changed = {}, {}
        for kpi, region, target, by, at in rows:
            if kpi in KPI_TARGETS and region in REGIONS and target is not None:
                custom[(kpi, region)] = float(target)
                changed[(kpi, region)] = (by, str(at) if at else "")
        if custom != _custom:
            _version += 1
        _custom, _changed = custom, changed
    try:
        srows = await db.fetch_all("SELECT setting_key, setting_value, changed_by, changed_at FROM kpi_settings")
    except Exception as e:  # noqa: BLE001
        log.warning("kpi_targets: could not read the settings (%s) -- using the ones already loaded", e)
        return
    settings, schanged = dict(SETTING_DEFAULTS), {}
    for key, value, by, at in srows:
        if key in SETTING_DEFAULTS:
            settings[key] = str(value).strip().lower() in ("1", "true", "yes", "on")
            schanged[key] = (by, str(at) if at else "")
    if settings != _settings:
        _version += 1
    _settings, _settings_changed = settings, schanged


class TargetIn(BaseModel):
    kpi: str
    region: str
    target: float | None = None  # None = back to the default


class TargetsIn(BaseModel):
    rows: list[TargetIn]


class SettingsIn(BaseModel):
    include_east_malaysia: bool | None = None
    include_sarawak: bool | None = None


def _view() -> dict:
    last = max(_changed.values(), key=lambda v: v[1], default=None)
    return {
        "regions": REGIONS,
        "kpis": [
            {
                "key": k, "label": label, "direction": d, "unit": unit,
                "targets": targets_for(k),
                "defaults": {r: (None if t is None else float(t)) for r, t in by.items()},
                "custom": {r: (k, r) in _custom for r in REGIONS},
            }
            for k, (label, d, by, unit) in KPI_TARGETS.items()
        ],
        "settings": {"include_east_malaysia": include_east_malaysia(), "include_sarawak": include_sarawak()},
        "settings_changed_by": (_settings_changed.get("include_east_malaysia") or (None, None))[0],
        "settings_changed_at": (_settings_changed.get("include_east_malaysia") or (None, None))[1],
        "last_changed_by": last[0] if last else None,
        "last_changed_at": last[1] if last else None,
    }


@router.get("/api/kpi/targets")
async def get_kpi_targets(user: CurrentUser = Depends(get_current_user)):
    await ensure_fresh()
    return {**_view(), "can_edit": user.role == "admin"}


@router.put("/api/kpi/targets")
async def put_kpi_targets(payload: TargetsIn, user: CurrentUser = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if not payload.rows:
        raise HTTPException(status_code=422, detail="No rows given")
    now = datetime.now(timezone.utc)
    for row in payload.rows:
        if row.kpi not in KPI_TARGETS:
            raise HTTPException(status_code=422, detail=f"Unknown KPI: {row.kpi}")
        if row.region not in REGIONS:
            raise HTTPException(status_code=422, detail=f"Region must be one of {REGIONS}")
        label, _d, _by, unit = KPI_TARGETS[row.kpi]
        if row.target is not None and (not math.isfinite(row.target) or row.target < 0 or row.target > _MAX[unit]):
            raise HTTPException(status_code=422, detail=f"{label} / {row.region}: the target must be a {'percentage between 0 and 100' if unit == 'pct' else 'number of at least 0'}")
    for row in payload.rows:
        target = None if row.target is None else round(row.target, 4)
        default = KPI_TARGETS[row.kpi][2][row.region]
        await db.execute("DELETE FROM kpi_targets WHERE kpi=%s AND region=%s", (row.kpi, row.region))
        if target is not None and (default is None or target != round(float(default), 4)):  # only real differences are kept
            await db.execute(
                "INSERT INTO kpi_targets (kpi, region, target, changed_by, changed_at) VALUES (%s, %s, %s, %s, %s)",
                (row.kpi, row.region, target, user.email, now),
            )
    await ensure_fresh(force=True)
    return {"ok": True, **_view(), "can_edit": True}


@router.put("/api/kpi/settings")
async def put_kpi_settings(payload: SettingsIn, user: CurrentUser = Depends(get_current_user)):
    """Admin only: switch KPI settings -- whether the KPI pages count East Malaysia and whether they count Sarawak (both default off; Retail, not Last Mile)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    for key in SETTING_DEFAULTS:
        value = getattr(payload, key, None)
        if value is None:
            continue  # not sent: left as it is
        await db.execute("DELETE FROM kpi_settings WHERE setting_key=%s", (key,))
        if value != SETTING_DEFAULTS[key]:  # only a difference from the default is kept
            await db.execute(
                "INSERT INTO kpi_settings (setting_key, setting_value, changed_by, changed_at) VALUES (%s, %s, %s, %s)",
                (key, "1" if value else "0", user.email, datetime.now(timezone.utc)),
            )
    await ensure_fresh(force=True)
    return {"ok": True, **_view(), "can_edit": True}
