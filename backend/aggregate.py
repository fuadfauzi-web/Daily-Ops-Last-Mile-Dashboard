"""Turns raw Redash rows into per-station KPI counts.

Nationwide (143 stations, 5 regions). Metric formulas below were specified directly
by the Fleet Manager against query 78 (FLEET: Health V3), query 1297 (OPEX: LM Active
Missing Parcels), query 653 (OPEX: Total Shipments & Parcels by Hub), and query 512
(FLEET: LM Delivery Performance) -- see project chat history for the full column-by-
column walkthrough. Do not change a formula here without that kind of source
confirmation first.

query 78 columns used: tracking_id, tag, granular_status, dest_hub,
last_scan_datetime, last_scan_hub_name, days_since_current_hub_first_sweep
("age"), delivery_attempts, cod ('Yes_cod' | 'NO_cod').

granular_status values seen: 'Arrived at Sorting Hub', 'En-route to Sorting Hub',
'On Vehicle for Delivery', 'On Hold', 'Pending Reschedule', 'Arrived at Distribution
Point'.

Everything below is grouped by last_scan_hub_name (where the parcel *physically is*
right now), not dest_hub (where it's ultimately headed) -- a parcel whose
last_scan_hub_name != dest_hub hasn't been added to a shipment to its real
destination yet, so it lands in `pending_ats` at the hub it's currently sitting in,
not counted in total_in_hub/zero_attempt/etc there.
"""
import re
from datetime import datetime, timezone

from stations import HUBS, REGIONS, ZONES, FULL_NAME_TO_HUB

_DISPATCHED_STATUSES = {"On Vehicle for Delivery"}

METRIC_KEYS = (
    "total_in_hub", "zero_attempt", "zero_attempt_gt_d0", "on_hold", "pending_ats",
    "missing_open", "missing_hub", "missing_ship_in",
    "total_fresh", "age_gt3", "age_gt6_ats", "reschedule", "still_ovfd",
    "prior_d0", "prior_gt_d0", "cod_pct_hub",
    "total_routed", "attendance", "cod_pct_routed",
)

# Metrics with an actual tracking-number list behind them (for the UI's click-to-see-TNs
# drill-down). Percentages (cod_pct_*) and totals with no parcel-level source
# (total_fresh from query 653, total_routed/attendance from query 512 -- route-level,
# no tracking_id) are excluded -- there's nothing to list.
DRILLDOWN_METRICS = (
    "total_in_hub", "zero_attempt", "zero_attempt_gt_d0", "on_hold", "pending_ats",
    "missing_open", "missing_hub", "missing_ship_in",
    "age_gt3", "age_gt6_ats", "reschedule", "still_ovfd", "prior_d0", "prior_gt_d0",
)

# Item 4: shipment_dest_hub_name values that mean "this parcel is routed OUT of the
# network to another zone/state entirely" -- not a local hub/ship-in issue.
_SHIP_OUT_CODES = {
    "PRK-PRK", "JHB-JHB", "PEN-PEN", "TGG-TGG", "PHG-PHG", "KEL-KEL", "SBH-SBH",
    "MM-X-BDR", "MM-Bulky", "MM-Prio", "MM-MM", "MM-RTS", "MM-XDK", "MM-INTL", "MM-B2B",
    "KDH-KDH", "YPG-YPG", "AOR1-AOR1", "BHU1-BHU1", "KBR1-KBR1", "MKZ-MKZ", "PHG-TEM",
    "STW1-STW1", "TIN1-TIN1", "TMH1-TMH1", "TPG1-TPG1",
}
_B2B_TN_PATTERN = re.compile(r"MYPSO|MYRDO|-DO")


def _empty_station_row(hub_code: str) -> dict:
    name, _full_name, zone, region = HUBS[hub_code]
    row = {
        "station_code": hub_code,
        "station_name": name,
        "zone": zone,
        "region": region,
    }
    row.update({k: 0 for k in METRIC_KEYS})
    return row


def _empty_tn_lists() -> dict:
    return {k: [] for k in DRILLDOWN_METRICS}


def _parse_dt(value) -> datetime | None:
    """Normalizes the two datetime formats seen across these queries ('...T...' and
    '... ...') so they can be compared -- e.g. shipment_completion_datetime vs
    last_scan_datetime for the missing-ticket Hub/Ship-in split."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace(" ", "T"))
    except ValueError:
        return None


def _classify_missing(row: dict, health_tn_set: set[str]) -> str | None:
    """Item 4's Hub/Ship-in formula, adapted to query 1297's live field names.
    Returns 'hub' | 'ship_in' | None (PDCNR / B2B / SHIP OUT / unclassified -- not
    counted in either bucket, but still counted in the overall missing_open total)."""
    tn = row.get("tracking_id")
    if not tn:
        return None
    if row.get("granular_status") == "Completed":
        return None  # PDCNR
    if _B2B_TN_PATTERN.search(tn):
        return None  # B2B
    if (row.get("shipment_dest_hub_name") or "").strip() in _SHIP_OUT_CODES:
        return None  # SHIP OUT

    dest_hub = row.get("dest_hub_name")
    region = HUBS[dest_hub][3] if dest_hub in HUBS else None

    if region == "East Malaysia":
        # "V3 Check": whether this tracking number currently shows up in query 78
        # (Fleet Health V3) at all.
        return "hub" if tn in health_tn_set else None
    if dest_hub == "EAST OOZ":
        return "hub"

    completion = _parse_dt(row.get("shipment_completion_datetime"))
    if completion is None:
        return "hub"
    last_scan = _parse_dt(row.get("last_scan_datetime"))
    if last_scan is None:
        return None  # "HUB to Check" -- ambiguous, leave unclassified
    if completion == last_scan:
        return "ship_in"
    if last_scan > completion:
        return "hub"
    return None  # "HUB to Check"


def _is_ops_driver(name: str) -> bool:
    return "OPS" in (name or "").upper()


def build_station_metrics(
    health_v3_rows: list[dict],
    missing_rows: list[dict],
    total_shipments_rows: list[dict],
    routed_rows: list[dict],
) -> tuple[dict[str, dict], dict[str, dict]]:
    """Returns ({hub_code: metrics_row}, {hub_code: {metric: [tracking_id, ...]}}).

    The second dict powers the UI's click-a-number drill-down -- every count above
    (except the percentages and the route-level totals, see DRILLDOWN_METRICS) is the
    length of the matching list here.
    """
    by_station = {hub: _empty_station_row(hub) for hub in HUBS}
    tn_details = {hub: _empty_tn_lists() for hub in HUBS}
    # Running COD-in-hub numerators, divided into percentages once counting is done.
    cod_in_hub = {hub: 0 for hub in HUBS}

    health_tn_set = {r.get("tracking_id") for r in health_v3_rows if r.get("tracking_id")}

    for r in health_v3_rows:
        hub = r.get("last_scan_hub_name")
        row = by_station.get(hub)
        if row is None:
            continue
        tns = tn_details[hub]
        tn = r.get("tracking_id")
        status = r.get("granular_status")
        dest_hub = r.get("dest_hub")
        attempts = r.get("delivery_attempts") or 0
        age = r.get("days_since_current_hub_first_sweep") or 0
        tag = (r.get("tag") or "").upper()
        hub_match = hub == dest_hub

        if status == "On Hold":
            row["on_hold"] += 1
            tns["on_hold"].append(tn)
            continue
        if status in _DISPATCHED_STATUSES:
            row["still_ovfd"] += 1
            tns["still_ovfd"].append(tn)
            continue

        if not hub_match:
            row["pending_ats"] += 1
            tns["pending_ats"].append(tn)
            if age > 6:
                row["age_gt6_ats"] += 1
                tns["age_gt6_ats"].append(tn)
            continue

        row["total_in_hub"] += 1
        tns["total_in_hub"].append(tn)
        if r.get("cod") == "Yes_cod":
            cod_in_hub[hub] += 1

        if attempts == 0:
            row["zero_attempt"] += 1
            tns["zero_attempt"].append(tn)
            if age > 0:
                row["zero_attempt_gt_d0"] += 1
                tns["zero_attempt_gt_d0"].append(tn)
        else:
            row["reschedule"] += 1
            tns["reschedule"].append(tn)

        if age > 3:
            row["age_gt3"] += 1
            tns["age_gt3"].append(tn)

        if status == "Arrived at Sorting Hub" and "PRIOR" in tag:
            if attempts == 0:
                row["prior_d0"] += 1
                tns["prior_d0"].append(tn)
            if age > 0:
                row["prior_gt_d0"] += 1
                tns["prior_gt_d0"].append(tn)

    for hub, row in by_station.items():
        row["cod_pct_hub"] = round(cod_in_hub[hub] / row["total_in_hub"] * 100, 1) if row["total_in_hub"] else 0.0

    for r in missing_rows:
        hub = r.get("dest_hub_name")
        if hub not in by_station:
            continue
        tn = r.get("tracking_id")
        by_station[hub]["missing_open"] += 1
        tn_details[hub]["missing_open"].append(tn)
        kind = _classify_missing(r, health_tn_set)
        if kind == "hub":
            by_station[hub]["missing_hub"] += 1
            tn_details[hub]["missing_hub"].append(tn)
        elif kind == "ship_in":
            by_station[hub]["missing_ship_in"] += 1
            tn_details[hub]["missing_ship_in"].append(tn)

    for r in total_shipments_rows:
        raw_name = (r.get("dest_hub_name") or "").strip().lower()
        hub = FULL_NAME_TO_HUB.get(raw_name)
        if hub in by_station:
            by_station[hub]["total_fresh"] = r.get("total_orders") or 0

    # Item 3: Total Routed / Attendance / COD% from query 512, matched by full
    # station name (e.g. "Station Ajil") the same way total_fresh is.
    routed_drivers: dict[str, set[str]] = {hub: set() for hub in HUBS}
    routed_cod = {hub: 0 for hub in HUBS}
    for r in routed_rows:
        raw_name = (r.get("Station") or "").strip().lower()
        hub = FULL_NAME_TO_HUB.get(raw_name)
        if hub not in by_station:
            continue
        driver = r.get("Driver") or ""
        by_station[hub]["total_routed"] += r.get("Total Routed") or 0
        routed_cod[hub] += r.get("Total COD") or 0
        if not _is_ops_driver(driver):
            routed_drivers[hub].add(driver)
    for hub, row in by_station.items():
        row["attendance"] = len(routed_drivers[hub])
        row["cod_pct_routed"] = round(routed_cod[hub] / row["total_routed"] * 100, 1) if row["total_routed"] else 0.0

    return by_station, tn_details


def _zero_group(group_key: str, key: str) -> dict:
    g = {group_key: key, "station_count": 0}
    g.update({k: 0 for k in METRIC_KEYS})
    return g


def rollup(station_rows: list[dict], group_key: str) -> list[dict]:
    """Sums station_rows up to zone or region level. group_key: 'zone' or 'region'.
    Percentage fields (cod_pct_*) are recomputed from the summed numerators/denominators
    rather than averaged, so a rollup's percentage is still accurate."""
    groups: dict[str, dict] = {}
    order = ZONES if group_key == "zone" else REGIONS
    for key in order:
        groups[key] = _zero_group(group_key, key)
    cod_hub_num: dict[str, float] = {k: 0 for k in groups}
    cod_routed_num: dict[str, float] = {k: 0 for k in groups}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(key, _zero_group(group_key, key))
        cod_hub_num.setdefault(key, 0)
        cod_routed_num.setdefault(key, 0)
        for k in METRIC_KEYS:
            if k in ("cod_pct_hub", "cod_pct_routed"):
                continue
            g[k] += row[k]
        cod_hub_num[key] += row["cod_pct_hub"] * row["total_in_hub"] / 100
        cod_routed_num[key] += row["cod_pct_routed"] * row["total_routed"] / 100
        g["station_count"] += 1
    for key, g in groups.items():
        g["cod_pct_hub"] = round(cod_hub_num[key] / g["total_in_hub"] * 100, 1) if g["total_in_hub"] else 0.0
        g["cod_pct_routed"] = round(cod_routed_num[key] / g["total_routed"] * 100, 1) if g["total_routed"] else 0.0
    return list(groups.values())


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
