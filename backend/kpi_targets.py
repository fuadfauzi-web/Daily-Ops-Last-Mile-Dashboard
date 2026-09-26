"""KPI targets by region -- the Fleet Manager's "New Target" table (2026-09-26).

One place for the numbers so every KPI page judges a station against ITS region's target. Percent values; "lower" KPIs (Lost, COD RTS, Invalid POD)
are met when the rate is at or under the target, "higher" ones when it is at or over. Hybrid Productivity is not here: its targets are per region too
but have not been given yet (the Fleet Manager will feed them later).

When a target changes, edit the table below and redeploy -- nothing else holds a copy (the Weekly Dashboard and the CISP pages read from here).
"""
from fastapi import APIRouter, Depends

from auth import CurrentUser, get_current_user

router = APIRouter()

REGIONS = ["Klang Valley", "Northern", "Southern", "East Coast", "East Malaysia"]
FALLBACK_REGION = "Klang Valley"  # a station whose region is unknown is judged like the standard (Klang Valley / Northern / Southern) targets

# key -> (label, direction, {region: target %})
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


def target_for(kpi: str, region: str | None) -> float:
    """Target % of `kpi` for a region (the standard one when the region is unknown)."""
    by_region = KPI_TARGETS[kpi][2]
    return float(by_region.get(region or "", by_region[FALLBACK_REGION]))


def targets_for(kpi: str) -> dict[str, float]:
    return {r: target_for(kpi, r) for r in REGIONS}


def weekly_region_targets() -> dict[str, dict[str, float]]:
    """{region: {weekly KPI key: target as a fraction}} for the Weekly Dashboard, whose values are fractions (0.96)."""
    return {r: {wk: target_for(k, r) / 100 for wk, k in WEEKLY_KEYS.items()} for r in REGIONS}


@router.get("/api/kpi/targets")
async def kpi_targets(user: CurrentUser = Depends(get_current_user)):
    return {
        "regions": REGIONS,
        "kpis": [{"key": k, "label": label, "direction": d, "targets": targets_for(k)} for k, (label, d, _t) in KPI_TARGETS.items()],
    }
