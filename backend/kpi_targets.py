"""KPI targets by region -- the Fleet Manager's "New Target" table (2026-09-26), editable by an admin (Admin -> KPI Targets, 2026-09-26).

One place for the numbers so every KPI page judges a station against ITS region's target. Percent values; "lower" KPIs (Lost, COD RTS, Invalid POD)
are met when the rate is at or under the target, "higher" ones when it is at or over. Hybrid Productivity is not here: its targets are per region too
but have not been given yet (the Fleet Manager will feed them later -- add them to KPI_TARGETS then and the Admin page shows them).

The table below holds the DEFAULTS. What an admin changes is stored in the kpi_targets table (V40) as the differences from these defaults, so a cell
nobody touched follows the code. Reading is synchronous (target_for) from a small in-memory copy that ensure_fresh() reloads at most every 30 seconds
(and at once after a save); version() changes whenever the numbers do, so cached views can tell.
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

# key -> (label, direction, {region: default target %})
KPI_TARGETS: dict[str, tuple[str, str, dict[str, float]]] = {
    "fifo": ("FIFO D0", "higher", {"Klang Valley": 96, "Northern": 96, "Southern": 96, "East Coast": 97, "East Malaysia": 94}),
    "d0": ("Completion D0", "higher", {"Klang Valley": 88, "Northern": 88, "Southern": 88, "East Coast": 90, "East Malaysia": 90}),
    "d3": ("Completion D3", "higher", {"Klang Valley": 96, "Northern": 96, "Southern": 96, "East Coast": 96, "East Malaysia": 93}),
    "t7": ("Terminal T7 (D7)", "higher", {"Klang Valley": 100, "Northern": 100, "Southern": 100, "East Coast": 100, "East Malaysia": 100}),
    "prior": ("Prior", "higher", {"Klang Valley": 92, "Northern": 92, "Southern": 92, "East Coast": 92, "East Malaysia": 92}),
    "lost": ("Lost", "lower", {"Klang Valley": 0.005, "Northern": 0.005, "Southern": 0.005, "East Coast": 0.005, "East Malaysia": 0.005}),
    "cod_rts": ("COD RTS", "lower", {"Klang Valley": 9, "Northern": 9, "Southern": 9, "East Coast": 7, "East Malaysia": 12}),
    "invalid_pod": ("Invalid POD", "lower", {"Klang Valley": 25, "Northern": 25, "Southern": 25, "East Coast": 25, "East Malaysia": 25}),
}

# the Weekly Dashboard's own keys (Dashboard WoW sheet columns) -> the keys above
WEEKLY_KEYS = {"fifo_d0": "fifo", "d0": "d0", "d3": "d3", "t7": "t7", "prior": "prior", "lost": "lost", "cod_rts": "cod_rts", "invalid_pod": "invalid_pod"}

_TTL_SECONDS = 30
_custom: dict[tuple[str, str], float] = {}  # (kpi, region) -> the admin's number, only where it differs from the default
_changed: dict[tuple[str, str], tuple[str, str]] = {}  # (kpi, region) -> (changed_by, changed_at)
_loaded_at = 0.0
_version = 0


def target_for(kpi: str, region: str | None) -> float:
    """Target % of `kpi` for a region (the standard one when the region is unknown), admin changes included."""
    by_region = KPI_TARGETS[kpi][2]
    r = region if region in by_region else FALLBACK_REGION
    v = _custom.get((kpi, r))
    return float(by_region[r] if v is None else v)


def targets_for(kpi: str) -> dict[str, float]:
    return {r: target_for(kpi, r) for r in REGIONS}


def weekly_region_targets() -> dict[str, dict[str, float]]:
    """{region: {weekly KPI key: target as a fraction}} for the Weekly Dashboard, whose values are fractions (0.96)."""
    return {r: {wk: target_for(k, r) / 100 for wk, k in WEEKLY_KEYS.items()} for r in REGIONS}


def version() -> int:
    """Changes whenever a target does -- part of the cache key of every view that judges against a target."""
    return _version


async def ensure_fresh(force: bool = False) -> None:
    """Reload the admin's changes from the database (at most every 30 s unless forced). A missing table or a database hiccup leaves the last
    known numbers in place -- the KPI pages must never fail because of the targets."""
    global _custom, _changed, _loaded_at, _version
    now = time.monotonic()
    if not force and _loaded_at and now - _loaded_at < _TTL_SECONDS:
        return
    _loaded_at = now
    try:
        rows = await db.fetch_all("SELECT kpi, region, target, changed_by, changed_at FROM kpi_targets")
    except Exception as e:  # noqa: BLE001
        log.warning("kpi_targets: could not read the table (%s) -- using the numbers already loaded", e)
        return
    custom, changed = {}, {}
    for kpi, region, target, by, at in rows:
        if kpi in KPI_TARGETS and region in REGIONS and target is not None:
            custom[(kpi, region)] = float(target)
            changed[(kpi, region)] = (by, str(at) if at else "")
    if custom != _custom:
        _version += 1
    _custom, _changed = custom, changed


class TargetIn(BaseModel):
    kpi: str
    region: str
    target: float | None = None  # None = back to the default


class TargetsIn(BaseModel):
    rows: list[TargetIn]


def _view() -> dict:
    last = max(_changed.values(), key=lambda v: v[1], default=None)
    return {
        "regions": REGIONS,
        "kpis": [
            {
                "key": k, "label": label, "direction": d,
                "targets": targets_for(k),
                "defaults": {r: float(t) for r, t in by.items()},
                "custom": {r: (k, r) in _custom for r in REGIONS},
            }
            for k, (label, d, by) in KPI_TARGETS.items()
        ],
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
        if row.target is not None and (not math.isfinite(row.target) or row.target < 0 or row.target > 100):
            raise HTTPException(status_code=422, detail=f"{KPI_TARGETS[row.kpi][0]} / {row.region}: the target must be a percentage between 0 and 100")
    for row in payload.rows:
        target = None if row.target is None else round(row.target, 4)
        await db.execute("DELETE FROM kpi_targets WHERE kpi=%s AND region=%s", (row.kpi, row.region))
        if target is not None and target != round(float(KPI_TARGETS[row.kpi][2][row.region]), 4):  # only real differences are kept
            await db.execute(
                "INSERT INTO kpi_targets (kpi, region, target, changed_by, changed_at) VALUES (%s, %s, %s, %s, %s)",
                (row.kpi, row.region, target, user.email, now),
            )
    await ensure_fresh(force=True)
    return {"ok": True, **_view(), "can_edit": True}
