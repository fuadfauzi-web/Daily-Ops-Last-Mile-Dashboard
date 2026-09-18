"""Turns raw Redash rows into per-station KPI counts.

v1 scope: only metrics that were cross-checked against the live "Southern Health App"
sheet and came out close (see project notes). Everything else (Total Fresh, Age>3,
Routed %, OVFD, Zalora/Restock/RDO/RPU/LH-Timing) is deliberately left out until its
exact formula is confirmed with the sheet owner — do not add a new metric here without
validating it the same way first.

granular_status values seen in query 78: 'Arrived at Sorting Hub', 'En-route to Sorting
Hub', 'On Vehicle for Delivery', 'On Hold', 'Pending Reschedule', 'Arrived at
Distribution Point', 'Van en-route to pickup'.
"""
from collections import defaultdict
from datetime import datetime, timezone

from stations import SOUTH_HUBS, SUB_REGIONS, REGION_NAME

# Parcels in these statuses have already left the hub (out for delivery) — not part
# of "currently in hub".
_DISPATCHED_STATUSES = {"On Vehicle for Delivery"}


def _empty_station_row(hub_code: str) -> dict:
    name, sub_region = SOUTH_HUBS[hub_code]
    return {
        "station_code": hub_code,
        "station_name": name,
        "sub_region": sub_region,
        "region": REGION_NAME,
        "total_in_hub": 0,
        "zero_attempt": 0,
        "on_hold": 0,
        "missing_open": 0,
    }


def build_station_metrics(health_v3_rows: list[dict], missing_rows: list[dict]) -> dict[str, dict]:
    """Returns {hub_code: metrics_row} for every Southern hub (zero-filled if no data)."""
    by_station = {hub: _empty_station_row(hub) for hub in SOUTH_HUBS}

    for r in health_v3_rows:
        hub = r.get("dest_hub")
        if hub not in by_station:
            continue
        status = r.get("granular_status")
        row = by_station[hub]
        if status == "On Hold":
            row["on_hold"] += 1
            continue
        if status in _DISPATCHED_STATUSES:
            continue  # already out for delivery, not "in hub"
        row["total_in_hub"] += 1
        if (r.get("delivery_attempts") or 0) == 0:
            row["zero_attempt"] += 1

    for r in missing_rows:
        hub = r.get("dest_hub_name")
        if hub in by_station:
            by_station[hub]["missing_open"] += 1

    return by_station


def rollup(station_rows: list[dict], group_key: str) -> list[dict]:
    """Sums station_rows up to sub_region or region level. group_key: 'sub_region' or 'region'."""
    groups: dict[str, dict] = {}
    order = SUB_REGIONS if group_key == "sub_region" else [REGION_NAME]
    for key in order:
        groups[key] = {
            group_key: key,
            "total_in_hub": 0,
            "zero_attempt": 0,
            "on_hold": 0,
            "missing_open": 0,
            "station_count": 0,
        }
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(key, {group_key: key, "total_in_hub": 0, "zero_attempt": 0,
                                     "on_hold": 0, "missing_open": 0, "station_count": 0})
        g["total_in_hub"] += row["total_in_hub"]
        g["zero_attempt"] += row["zero_attempt"]
        g["on_hold"] += row["on_hold"]
        g["missing_open"] += row["missing_open"]
        g["station_count"] += 1
    return list(groups.values())


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
