"""Turns raw Redash rows into per-station KPI counts.

Nationwide (143 stations, 5 regions) as of the v2 expansion. Metric formulas below
were reverse-engineered from the old "Southern Hub Operations Dashboard" Apps Script
(Code.gs's buildSouthernBaseMetrics_) and cross-checked field-by-field against live
Redash query schemas before being added here -- do not add a new metric without the
same validation (see project notes / PROJECT_HANDOFF.md history for what was tried
and rejected).

granular_status values seen in query 78: 'Arrived at Sorting Hub', 'En-route to Sorting
Hub', 'On Vehicle for Delivery', 'On Hold', 'Pending Reschedule', 'Arrived at
Distribution Point', 'Van en-route to pickup'.

query 78 has no 'shipper_type'/'isMatch' columns -- those were formula columns added
inside the old Google Sheet, not raw Redash fields. Shipper-specific detection (Shipper
Watch) is therefore NOT ported from Code.gs as-is; it's rebuilt separately once its
tracking-number patterns are confirmed.
"""
from datetime import datetime, timezone

from stations import HUBS, REGIONS, ZONES, FULL_NAME_TO_HUB

# Parcels in these statuses have already left the hub (out for delivery) -- not part
# of "currently in hub" (total_in_hub), though still counted separately as still_ovfd.
_DISPATCHED_STATUSES = {"On Vehicle for Delivery"}

_METRIC_KEYS = (
    "total_in_hub", "zero_attempt", "on_hold", "missing_open",
    "total_fresh", "age_gt3", "reschedule", "still_ovfd", "prior_d0", "prior_gt_d0",
)

# Metrics with an actual tracking-number list behind them (for the UI's click-to-see-TNs
# drill-down). total_fresh is excluded -- its source (query 653) is a per-hub order
# *count*, not parcel-level rows, so there's nothing to list.
DRILLDOWN_METRICS = (
    "total_in_hub", "zero_attempt", "on_hold", "missing_open",
    "age_gt3", "reschedule", "still_ovfd", "prior_d0", "prior_gt_d0",
)


def _empty_station_row(hub_code: str) -> dict:
    name, _full_name, zone, region = HUBS[hub_code]
    row = {
        "station_code": hub_code,
        "station_name": name,
        "zone": zone,
        "region": region,
    }
    row.update({k: 0 for k in _METRIC_KEYS})
    return row


def _empty_tn_lists() -> dict:
    return {k: [] for k in DRILLDOWN_METRICS}


def build_station_metrics(
    health_v3_rows: list[dict],
    missing_rows: list[dict],
    total_shipments_rows: list[dict],
) -> tuple[dict[str, dict], dict[str, dict]]:
    """Returns ({hub_code: metrics_row}, {hub_code: {metric: [tracking_id, ...]}}).

    The second dict powers the UI's click-a-number drill-down -- every count above
    is the length of the matching list here (total_fresh excluded, see
    DRILLDOWN_METRICS).
    """
    by_station = {hub: _empty_station_row(hub) for hub in HUBS}
    tn_details = {hub: _empty_tn_lists() for hub in HUBS}

    for r in health_v3_rows:
        hub = r.get("dest_hub")
        row = by_station.get(hub)
        if row is None:
            continue
        tns = tn_details[hub]
        tn = r.get("tracking_id")
        status = r.get("granular_status")
        attempts = r.get("delivery_attempts") or 0
        age = r.get("days_since_current_hub_first_sweep") or 0
        tag = (r.get("tag") or "").upper()

        if status == "On Hold":
            row["on_hold"] += 1
            tns["on_hold"].append(tn)
        elif status in _DISPATCHED_STATUSES:
            row["still_ovfd"] += 1
            tns["still_ovfd"].append(tn)
        else:
            row["total_in_hub"] += 1
            tns["total_in_hub"].append(tn)
            if attempts == 0:
                row["zero_attempt"] += 1
                tns["zero_attempt"].append(tn)
            else:
                row["reschedule"] += 1
                tns["reschedule"].append(tn)

        if age > 2 and status != "On Hold":
            row["age_gt3"] += 1
            tns["age_gt3"].append(tn)
        if status == "Arrived at Sorting Hub" and "PRIOR" in tag and attempts == 0:
            row["prior_d0"] += 1
            tns["prior_d0"].append(tn)
        if status != "On Hold" and "PRIOR" in tag and age > 0:
            row["prior_gt_d0"] += 1
            tns["prior_gt_d0"].append(tn)

    for r in missing_rows:
        hub = r.get("dest_hub_name")
        if hub in by_station:
            by_station[hub]["missing_open"] += 1
            tn_details[hub]["missing_open"].append(r.get("tracking_id"))

    for r in total_shipments_rows:
        raw_name = (r.get("dest_hub_name") or "").strip().lower()
        hub = FULL_NAME_TO_HUB.get(raw_name)
        if hub in by_station:
            by_station[hub]["total_fresh"] = r.get("total_orders") or 0

    return by_station, tn_details


def _zero_group(group_key: str, key: str) -> dict:
    g = {group_key: key, "station_count": 0}
    g.update({k: 0 for k in _METRIC_KEYS})
    return g


def rollup(station_rows: list[dict], group_key: str) -> list[dict]:
    """Sums station_rows up to zone or region level. group_key: 'zone' or 'region'."""
    groups: dict[str, dict] = {}
    order = ZONES if group_key == "zone" else REGIONS
    for key in order:
        groups[key] = _zero_group(group_key, key)
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(key, _zero_group(group_key, key))
        for k in _METRIC_KEYS:
            g[k] += row[k]
        g["station_count"] += 1
    return list(groups.values())


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
