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

from stations import ABBR_TO_HUB, HUBS, REGIONS, ZONES, FULL_NAME_TO_HUB

_DISPATCHED_STATUSES = {"On Vehicle for Delivery"}

METRIC_KEYS = (
    "total_in_hub", "zero_attempt", "zero_attempt_gt_d0", "on_hold",
    "pending_ats_zero_attempt", "pending_ats_attempted",
    "missing_open", "missing_hub", "missing_ship_in",
    "total_fresh", "age_gt3", "reschedule", "still_ovfd",
    "prior_d0", "prior_gt_d0", "cod_pct_hub",
    "total_routed", "attendance", "cod_pct_routed",
)

# Metrics with an actual tracking-number list behind them (for the UI's click-to-see-TNs
# drill-down). Percentages (cod_pct_*) and totals with no parcel-level source
# (total_fresh from query 653, total_routed/attendance from query 512 -- route-level,
# no tracking_id) are excluded -- there's nothing to list.
DRILLDOWN_METRICS = (
    "total_in_hub", "zero_attempt", "zero_attempt_gt_d0", "on_hold",
    "pending_ats_zero_attempt", "pending_ats_attempted",
    "missing_open", "missing_hub", "missing_ship_in",
    "age_gt3", "reschedule", "still_ovfd", "prior_d0", "prior_gt_d0",
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


def build_station_metrics(
    health_v3_rows: list[dict],
    missing_rows: list[dict],
    total_shipments_rows: list[dict],
) -> tuple[dict[str, dict], dict[str, dict]]:
    """Returns ({hub_code: metrics_row}, {hub_code: {metric: [tracking_id, ...]}}).

    The second dict powers the UI's click-a-number drill-down -- every count above
    (except the percentages and the route-level totals, see DRILLDOWN_METRICS) is the
    length of the matching list here.

    total_routed/attendance/cod_pct_routed are left zeroed here -- the caller fills
    them in from build_routed_view()'s output, which computes them properly (driver
    type/rescue breakdown, current_ovfd/success too) and shouldn't be duplicated.
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
            if attempts == 0:
                row["pending_ats_zero_attempt"] += 1
                tns["pending_ats_zero_attempt"].append(tn)
            else:
                row["pending_ats_attempted"] += 1
                tns["pending_ats_attempted"].append(tn)
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

    return by_station, tn_details


def merge_routed_into_station_metrics(by_station: dict[str, dict], routed_by_station: dict[str, dict]) -> None:
    """Copies total_routed/attendance/cod_pct_routed from build_routed_view()'s
    output into build_station_metrics()'s rows, in place."""
    for hub, row in by_station.items():
        r = routed_by_station.get(hub)
        if r is None:
            continue
        row["total_routed"] = r["total_routed"]
        row["attendance"] = r["attendance"]
        row["cod_pct_routed"] = r["cod_pct"]


# ---------------------------------------------------------------------------
# Shipment Details tab (query 653 for Total Fresh, query 1239 Shipment Tracker,
# query 1500 line-haul trip arrivals)
# ---------------------------------------------------------------------------

SHIPMENT_DETAIL_KEYS = ("total_fresh", "total_shipment", "fresh_unscan", "latlong", "fresh_attempt_count")
SHIPMENT_DRILLDOWN_METRICS = ("fresh_unscan", "latlong")

_RTS_TAG = "RTS"


def _empty_shipment_row(hub_code: str) -> dict:
    name, _full, zone, region = HUBS[hub_code]
    row = {"station_code": hub_code, "station_name": name, "zone": zone, "region": region, "lh_trips": []}
    row.update({k: 0 for k in SHIPMENT_DETAIL_KEYS})
    return row


def build_shipment_details(
    total_shipments_rows: list[dict], tracker_rows: list[dict], lh_rows: list[dict]
) -> tuple[dict[str, dict], dict[str, dict]]:
    """Returns ({hub_code: shipment_detail_row}, {hub_code: {metric: [tracking_id]}})."""
    by_station = {hub: _empty_shipment_row(hub) for hub in HUBS}
    tn_details = {hub: {k: [] for k in SHIPMENT_DRILLDOWN_METRICS} for hub in HUBS}

    for r in total_shipments_rows:
        raw_name = (r.get("dest_hub_name") or "").strip().lower()
        hub = FULL_NAME_TO_HUB.get(raw_name)
        if hub in by_station:
            by_station[hub]["total_fresh"] = r.get("total_orders") or 0

    for r in tracker_rows:
        hub = r.get("shp_dest_hub_name")
        row = by_station.get(hub)
        if row is None:
            continue
        tn = r.get("tracking_id")
        tag = (r.get("tag") or "").upper()

        if not r.get("1st_sweep_at_WM_station"):
            row["fresh_unscan"] += 1
            tn_details[hub]["fresh_unscan"].append(tn)

        if r.get("shp_dest_hub_name") != r.get("latest_dest_hub_name") and _RTS_TAG not in tag:
            row["latlong"] += 1
            tn_details[hub]["latlong"].append(tn)

        if r.get("first_attempt_date"):
            row["fresh_attempt_count"] += 1

    for r in lh_rows:
        hub = r.get("dest_hub_name")
        row = by_station.get(hub)
        if row is None or not r.get("arrival_datetime"):
            continue
        row["lh_trips"].append({"time": r["arrival_datetime"], "parcels": r.get("total_parcels") or 0})

    for row in by_station.values():
        row["lh_trips"].sort(key=lambda t: t["time"])
        row["lh_trips"] = row["lh_trips"][:2]

    # total_shipment = sum of query 1500's total_shipments field per hub (a separate
    # field from total_parcels, which only backs the LH trip badges above).
    shipment_totals: dict[str, int] = {hub: 0 for hub in HUBS}
    for r in lh_rows:
        hub = r.get("dest_hub_name")
        if hub in shipment_totals:
            shipment_totals[hub] += r.get("total_shipments") or 0
    for hub, row in by_station.items():
        row["total_shipment"] = shipment_totals[hub]
        row["fresh_attempt_pct"] = (
            round(row["fresh_attempt_count"] / row["total_fresh"] * 100, 1) if row["total_fresh"] else 0.0
        )

    return by_station, tn_details


def rollup_shipment_details(station_rows: list[dict], group_key: str) -> list[dict]:
    """Sums Shipment Details station_rows up to zone or region level. lh_trips isn't
    meaningful summed across stations, so group rows omit it."""
    groups: dict[str, dict] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(
            key, {group_key: key, "region": row["region"], "station_count": 0, **{k: 0 for k in SHIPMENT_DETAIL_KEYS}}
        )
        for k in SHIPMENT_DETAIL_KEYS:
            g[k] += row[k]
        g["station_count"] += 1
    for g in groups.values():
        g["fresh_attempt_pct"] = round(g["fresh_attempt_count"] / g["total_fresh"] * 100, 1) if g["total_fresh"] else 0.0
    return list(groups.values())


# ---------------------------------------------------------------------------
# Routed View tab (query 512)
# ---------------------------------------------------------------------------

# Driver name format: "<station abbr> - <position code> - <name>". HD/HR are
# full-time "Hybrid" staff (Driver/Rider), ID/IR are part-time "Independent".
_DRIVER_POSITION_LABELS = {
    "HD": "Hybrid Driver",
    "HR": "Hybrid Rider",
    "ID": "Independent Driver",
    "IR": "Independent Rider",
}


def _parse_driver(driver_name: str) -> dict | None:
    """Returns None for OPS routes (hub routes, no real driver -- excluded from
    attendance/driver-level view entirely, though their volume still counts in
    Total Routed/Success/OVFD/COD at the station level)."""
    if "OPS" in (driver_name or "").upper():
        return None
    parts = [p.strip() for p in (driver_name or "").split("-")]
    if len(parts) < 3:
        return {"name": driver_name, "home_hub": None, "position": None, "label": "Unknown"}
    abbr, position = parts[0].upper(), parts[1].upper()
    return {
        "name": driver_name,
        "home_hub": ABBR_TO_HUB.get(abbr),
        "position": position,
        "label": _DRIVER_POSITION_LABELS.get(position, "Unknown"),
    }


ROUTED_STATION_KEYS = (
    "total_routed", "attendance", "attendance_hd", "attendance_hr", "attendance_id", "attendance_ir",
    "attendance_rescue", "current_ovfd", "current_success", "total_cod",
)


def _empty_routed_row(hub_code: str) -> dict:
    name, _full, zone, region = HUBS[hub_code]
    row = {"station_code": hub_code, "station_name": name, "zone": zone, "region": region}
    row.update({k: 0 for k in ROUTED_STATION_KEYS})
    return row


def _with_rates(row: dict) -> dict:
    total_routed = row["total_routed"]
    row["cod_pct"] = round(row["total_cod"] / total_routed * 100, 1) if total_routed else 0.0
    row["success_rate"] = round(row["current_success"] / total_routed * 100, 1) if total_routed else 0.0
    # "if there is non OVFD means the route completion rate is 100%" -- % of routed
    # volume that is NOT still on the vehicle.
    row["completion_rate"] = round((total_routed - row["current_ovfd"]) / total_routed * 100, 1) if total_routed else 0.0
    return row


def build_routed_view(routed_rows: list[dict]) -> tuple[dict[str, dict], list[dict]]:
    """Returns ({hub_code: station_row}, [driver_row, ...]).

    Attendance counts unique non-OPS drivers with a route today at that station,
    split into staff (HD/HR) vs independent (ID/IR), plus a "rescue" sub-count for
    drivers whose name-prefix home station differs from the station they're
    currently routing at (still counted in attendance, just flagged).
    """
    by_station = {hub: _empty_routed_row(hub) for hub in HUBS}
    seen_drivers: dict[str, set[str]] = {hub: set() for hub in HUBS}
    driver_agg: dict[str, dict] = {}

    for r in routed_rows:
        raw_name = (r.get("Station") or "").strip().lower()
        hub = FULL_NAME_TO_HUB.get(raw_name)
        if hub not in by_station:
            continue
        row = by_station[hub]
        total_routed = r.get("Total Routed") or 0
        row["total_routed"] += total_routed
        row["current_success"] += r.get("Current Total Success") or 0
        row["current_ovfd"] += r.get("Current OVFD") or 0
        row["total_cod"] += r.get("Total COD") or 0

        parsed = _parse_driver(r.get("Driver") or "")
        if parsed is None:
            continue  # OPS route -- volume already counted above, no driver headcount
        if parsed["name"] not in seen_drivers[hub]:
            seen_drivers[hub].add(parsed["name"])
            row["attendance"] += 1
            position_key = {"HD": "attendance_hd", "HR": "attendance_hr", "ID": "attendance_id", "IR": "attendance_ir"}.get(parsed["position"])
            if position_key:
                row[position_key] += 1
            if parsed["home_hub"] and parsed["home_hub"] != hub:
                row["attendance_rescue"] += 1

        d = driver_agg.setdefault(parsed["name"], {
            "driver_name": parsed["name"], "label": parsed["label"],
            "home_hub": parsed["home_hub"], "current_hub": hub, "is_rescue": parsed["home_hub"] not in (None, hub),
            "total_routed": 0, "current_success": 0, "current_ovfd": 0, "total_cod": 0,
        })
        d["total_routed"] += total_routed
        d["current_success"] += r.get("Current Total Success") or 0
        d["current_ovfd"] += r.get("Current OVFD") or 0
        d["total_cod"] += r.get("Total COD") or 0

    for row in by_station.values():
        _with_rates(row)

    driver_rows = []
    for d in driver_agg.values():
        home = HUBS[d["home_hub"]] if d["home_hub"] in HUBS else None
        current = HUBS[d["current_hub"]] if d["current_hub"] in HUBS else None
        out = {
            "driver_name": d["driver_name"],
            "driver_type": d["label"],
            "home_station": home[0] if home else None,
            "current_station": current[0] if current else d["current_hub"],
            "zone": current[2] if current else None,
            "region": current[3] if current else None,
            "is_rescue": d["is_rescue"],
            "total_routed": d["total_routed"],
            "current_success": d["current_success"],
            "current_ovfd": d["current_ovfd"],
            "total_cod": d["total_cod"],
        }
        driver_rows.append(_with_rates(out))

    return by_station, driver_rows


def rollup_routed(station_rows: list[dict], group_key: str, extra_keys: tuple[str, ...] = ()) -> list[dict]:
    """Sums Routed View station_rows up to zone or region level, recomputing rates.
    extra_keys sums additional plain-integer fields merged onto station_rows by the
    caller (e.g. zero_attempt from Station Health) without adding them to
    ROUTED_STATION_KEYS/the DB schema."""
    all_keys = ROUTED_STATION_KEYS + extra_keys
    groups: dict[str, dict] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(
            key, {group_key: key, "region": row["region"], "station_count": 0, **{k: 0 for k in all_keys}}
        )
        for k in all_keys:
            g[k] += row[k]
        g["station_count"] += 1
    return [_with_rates(g) for g in groups.values()]


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
