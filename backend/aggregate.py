"""Turns raw Redash rows into per-station KPI counts.

Nationwide (143 stations, 5 regions). Metric formulas below were specified directly
by the Fleet Manager against query 78 (FLEET: Health V3), query 1297 (OPEX: LM Active
Missing Parcels), query 653 (OPEX: Total Shipments & Parcels by Hub), and query 512
(FLEET: LM Delivery Performance) -- see project chat history for the full column-by-
column walkthrough. Do not change a formula here without that kind of source
confirmation first.

query 78 columns used: tracking_id, tag, granular_status, dest_hub,
last_scan_datetime, last_scan_hub_name, days_since_current_hub_first_sweep
("age"), delivery_attempts, cod ('Yes_cod' | 'NO_cod'), current_hub_first_sweep_datetime
(the only place with a real time-of-day -- used for Shipment Details' Process Time,
since query 1239's own 1st_sweep_at_WM_station turned out to be date-only).

granular_status values seen: 'Arrived at Sorting Hub', 'En-route to Sorting Hub',
'On Vehicle for Delivery', 'On Hold', 'Pending Reschedule', 'Arrived at Distribution
Point'.

Everything below is grouped by last_scan_hub_name (where the parcel *physically is*
right now), not dest_hub (where it's ultimately headed) -- a parcel whose
last_scan_hub_name != dest_hub hasn't been added to a shipment to its real
destination yet, so it lands in `pending_ats` at the hub it's currently sitting in,
not counted in total_in_hub/zero_attempt/etc there.
"""
import calendar
import re
from datetime import date, datetime, timedelta, timezone

from stations import ABBR_TO_HUB, HUBS, REGIONS, ZONES, FULL_NAME_TO_HUB

_DISPATCHED_STATUSES = {"On Vehicle for Delivery"}

METRIC_KEYS = (
    "total_in_hub", "zero_attempt_total", "zero_attempt", "zero_attempt_gt_d0", "on_hold",
    "pending_ats_zero_attempt", "pending_ats_attempted",
    "missing_open", "missing_hub", "missing_ship_in",
    "total_fresh", "age_gt3", "reschedule", "still_ovfd",
    "prior_d0", "prior_gt_d0", "unsweep_document", "unsweep_parcel", "cod_pct_hub",
    "total_routed", "routed_pct", "attendance", "cod_pct_routed",
)

# Metrics with an actual tracking-number list behind them (for the UI's click-to-see-TNs
# drill-down). Percentages (cod_pct_*) and totals with no parcel-level source
# (total_fresh from query 653, total_routed/attendance from query 512 -- route-level,
# no tracking_id) are excluded -- there's nothing to list.
DRILLDOWN_METRICS = (
    "total_in_hub", "zero_attempt_total", "zero_attempt", "zero_attempt_gt_d0", "on_hold",
    "pending_ats_zero_attempt", "pending_ats_attempted",
    "missing_open", "missing_hub", "missing_ship_in",
    "age_gt3", "reschedule", "still_ovfd", "prior_d0", "prior_gt_d0",
    "unsweep_document", "unsweep_parcel",
)

_B2B_TN_PATTERN = re.compile(r"MYPSO|MYRDO|-DO")

# Unsweep (query 58) split: TN ending in -DO/-MYPSO, starting with MYRDO, or
# containing GRN anywhere -> "document"; everything else -> "parcel".
# ASSUMPTION -- query 58's hub field is guessed as last_scan_hub_name (query 78's
# spelling); confirm once live, the count may come back all-zero if the real
# column is spelled differently.
_UNSWEEP_DOC_PATTERN = re.compile(r"-DO$|-MYPSO$|^MYRDO|GRN", re.IGNORECASE)


def _classify_unsweep(tn: str | None) -> str:
    if tn and _UNSWEEP_DOC_PATTERN.search(tn):
        return "document"
    return "parcel"


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


# 2026-09-21 feedback: query 1297 exposes last_scan_type directly (column Q),
# which says exactly how the ticket's last scan happened -- replaces the old
# shipment_completion_datetime vs last_scan_datetime heuristic below it (and the
# East Malaysia/EAST OOZ/SHIP_OUT_CODES special-casing that heuristic needed).
# Station attribution also switches from dest_hub_name (where a parcel is
# ultimately headed) to last_scan_hub_name (where it actually is right now),
# matching how every other metric on this page is grouped.
#
# 2026-09-21 correction: the raw column values are "Sweep" and "Inbound"
# separately (not a combined "Inbound / Sweep" -- that string never matched
# anything, which is why Missing Hub came back empty). All four values are
# real, first-class outcomes -- Ship Out is not excluded/"Other", it's its own
# type (see build_missing_details' Recovery-tab breakdown below).
_LAST_SCAN_TYPE_TO_KIND = {
    "Sweep": "hub",
    "Inbound": "driver_rider",
    "Shipment Completion": "ship_in",
    "Add to Shipment": "ship_out",
}


def _classify_missing(row: dict) -> str | None:
    """Returns 'hub' | 'driver_rider' | 'ship_in' | 'ship_out' | None (PDCNR / B2B /
    unrecognized last_scan_type -- still counted in the overall missing_open total,
    just not attributed to any of the four types). See _LAST_SCAN_TYPE_TO_KIND above.
    Station Health's own missing_hub/missing_ship_in columns only ever track the
    'hub'/'ship_in' kinds -- Recovery's build_missing_details below is what surfaces
    all four."""
    tn = row.get("tracking_id")
    if not tn:
        return None
    if row.get("granular_status") == "Completed":
        return None  # PDCNR
    if _B2B_TN_PATTERN.search(tn):
        return None  # B2B
    return _LAST_SCAN_TYPE_TO_KIND.get(row.get("last_scan_type"))


def build_station_metrics(
    health_v3_rows: list[dict],
    missing_rows: list[dict],
    total_shipments_rows: list[dict],
    unsweep_rows: list[dict] = (),
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
            elif status == "Arrived at Sorting Hub":
                row["pending_ats_attempted"] += 1
                tns["pending_ats_attempted"].append(tn)
            continue

        row["total_in_hub"] += 1
        tns["total_in_hub"].append(tn)
        if r.get("cod") == "Yes_cod":
            cod_in_hub[hub] += 1

        if attempts == 0:
            # 2026-09-21 feedback: 0 Attempt now requires status == "Arrived at
            # Sorting Hub" specifically, and days_since_current_hub_first_sweep
            # must not be blank -- a blank age is excluded entirely (not treated
            # as age 0, which the bare `age` var above would do via its `or 0`
            # fallback, so a separate raw read is used here). hub_match (dest hub
            # == last-scan hub) is already guaranteed by this point. zero_attempt
            # (D0) and zero_attempt_gt_d0 (>D0) stay mutually exclusive by age as
            # before; zero_attempt_total is their sum, its own column since
            # Route Monitoring's "0 Attempt" reads the total, not just D0.
            raw_age = r.get("days_since_current_hub_first_sweep")
            if status == "Arrived at Sorting Hub" and raw_age is not None:
                row["zero_attempt_total"] += 1
                tns["zero_attempt_total"].append(tn)
                if raw_age > 0:
                    row["zero_attempt_gt_d0"] += 1
                    tns["zero_attempt_gt_d0"].append(tn)
                else:
                    row["zero_attempt"] += 1
                    tns["zero_attempt"].append(tn)
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
        hub = r.get("last_scan_hub_name")
        if hub not in by_station:
            continue
        tn = r.get("tracking_id")
        by_station[hub]["missing_open"] += 1
        tn_details[hub]["missing_open"].append(tn)
        kind = _classify_missing(r)
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

    for r in unsweep_rows:
        hub = r.get("last_scan_hub_name")
        row = by_station.get(hub)
        if row is None:
            continue
        tn = r.get("tracking_id")
        kind = f"unsweep_{_classify_unsweep(tn)}"
        row[kind] += 1
        tn_details[hub][kind].append(tn)

    return by_station, tn_details


# ---------------------------------------------------------------------------
# Recovery tab's Missing Details sub-tab (query 1297 again, same classification
# as missing_hub/missing_ship_in above, but kept as its own richer TN-level view
# with cod_value/item_description/age for the Fleet Manager's recovery workflow).
# ---------------------------------------------------------------------------

_MISSING_TYPE_LABELS = {"hub": "Hub", "driver_rider": "Driver/Rider", "ship_in": "Ship In", "ship_out": "Ship Out"}

# "High COD value or high value item description (e.g. Smartphone)" gets
# highlighted in the TN list -- these are just the defaults for a fresh DB;
# the live values are admin-editable via Admin -> Recovery Settings (see
# main.py's recovery_settings table/GET+PUT /api/recovery/settings) and passed
# into build_missing_details below at refresh time.
DEFAULT_HIGH_COD_VALUE_THRESHOLD = 100
DEFAULT_HIGH_VALUE_ITEM_KEYWORDS = (
    "smartphone", "iphone", "samsung", "macbook", "laptop", "tablet", "ipad",
    "camera", "drone", "watch", "playstation", "xbox", "console", "jewellery",
    "jewelry", "gold",
)


def _is_high_value(cod_value, item_description, cod_threshold, keywords) -> bool:
    if cod_value and cod_value >= cod_threshold:
        return True
    if item_description and any(kw in item_description.lower() for kw in keywords):
        return True
    return False


def build_missing_details(
    missing_rows: list[dict],
    cod_threshold: float = DEFAULT_HIGH_COD_VALUE_THRESHOLD,
    keywords: tuple[str, ...] = DEFAULT_HIGH_VALUE_ITEM_KEYWORDS,
) -> tuple[dict[str, dict], list[dict]]:
    """Returns ({hub_code: overview_row}, [tn_row, ...]) for the Recovery tab.

    overview_row: hub_count/driver_rider_count/ship_in_count/ship_out_count/
    other_count/total_count per station, for the region/zone/station rollup.
    other_count is genuinely unclassified only (PDCNR/B2B/unrecognized
    last_scan_type) -- Ship Out is its own tracked type, not folded into Other.
    tn_row: one row per open missing ticket, carrying cod_value/item_description/
    age plus the same classification as build_station_metrics's missing_hub/
    missing_ship_in."""
    by_station = {
        hub: {
            "station_code": hub, "station_name": HUBS[hub][0], "zone": HUBS[hub][2], "region": HUBS[hub][3],
            "hub_count": 0, "driver_rider_count": 0, "ship_in_count": 0, "ship_out_count": 0,
            "other_count": 0, "total_count": 0,
        }
        for hub in HUBS
    }
    tn_rows = []
    for r in missing_rows:
        hub = r.get("last_scan_hub_name")
        row = by_station.get(hub)
        if row is None:
            continue
        kind = _classify_missing(r)
        row["total_count"] += 1
        if kind == "hub":
            row["hub_count"] += 1
        elif kind == "driver_rider":
            row["driver_rider_count"] += 1
        elif kind == "ship_in":
            row["ship_in_count"] += 1
        elif kind == "ship_out":
            row["ship_out_count"] += 1
        else:
            row["other_count"] += 1
        cod_value = r.get("cod_value")
        item_description = r.get("item_description")
        tn_rows.append({
            "tracking_number": r.get("tracking_id"),
            "station_code": hub,
            "station_name": row["station_name"],
            "zone": row["zone"],
            "region": row["region"],
            "hub_code": hub,
            "age": r.get("ticket_age_in_days"),
            "type": _MISSING_TYPE_LABELS.get(kind, "Other"),
            "cod_value": cod_value,
            "item_description": item_description,
            "is_high_value": _is_high_value(cod_value, item_description, cod_threshold, keywords),
        })
    return by_station, tn_rows


def rollup_missing_details(station_rows: list[dict], group_key: str) -> list[dict]:
    groups: dict[str, dict] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(key, {
            group_key: key, "region": row["region"], "station_count": 0,
            "hub_count": 0, "driver_rider_count": 0, "ship_in_count": 0, "ship_out_count": 0,
            "other_count": 0, "total_count": 0,
        })
        g["station_count"] += 1
        g["hub_count"] += row["hub_count"]
        g["driver_rider_count"] += row["driver_rider_count"]
        g["ship_in_count"] += row["ship_in_count"]
        g["ship_out_count"] += row["ship_out_count"]
        g["other_count"] += row["other_count"]
        g["total_count"] += row["total_count"]
    return list(groups.values())


# ---------------------------------------------------------------------------
# Routed View's "Pending in Yesterday Route" sub-tab (query 78 again). A snapshot
# of everything still On Vehicle for Delivery captured once daily just after
# 00:30 Malaysia time, held static for the rest of the day and replaced at the
# next day's 00:30 capture -- see main.py's _maybe_capture_pending_yesterday_route,
# which calls this with whatever health_v3_rows that refresh cycle already fetched.
# ---------------------------------------------------------------------------


def build_pending_yesterday_route(health_v3_rows: list[dict]) -> tuple[dict[str, dict], list[dict]]:
    """Returns ({hub_code: {..., total_tn}}, [tn_row, ...]), grouped by
    last_scan_hub_name (where each parcel is physically dispatched from)."""
    by_station = {
        hub: {"station_code": hub, "station_name": HUBS[hub][0], "zone": HUBS[hub][2], "region": HUBS[hub][3], "total_tn": 0}
        for hub in HUBS
    }
    tn_rows = []
    for r in health_v3_rows:
        if r.get("granular_status") != "On Vehicle for Delivery":
            continue
        hub = r.get("last_scan_hub_name")
        row = by_station.get(hub)
        if row is None:
            continue
        row["total_tn"] += 1
        tn_rows.append({
            "tracking_number": r.get("tracking_id"),
            "station_code": hub,
            "station_name": row["station_name"],
            "zone": row["zone"],
            "region": row["region"],
            "dest_hub": r.get("dest_hub"),
            "age": r.get("days_since_current_hub_first_sweep"),
            "attempts": r.get("delivery_attempts"),
        })
    return by_station, tn_rows

    return by_station, tn_details


def merge_routed_into_station_metrics(by_station: dict[str, dict], routed_by_station: dict[str, dict]) -> None:
    """Copies total_routed/attendance/cod_pct_routed from build_routed_view()'s
    output into build_station_metrics()'s rows, in place. routed_pct (Total
    Routed / (Total Routed + Total In Hub), per 2026-09-20 feedback) is computed
    here since this is the first point both numbers are in the same row."""
    for hub, row in by_station.items():
        r = routed_by_station.get(hub)
        if r is None:
            continue
        row["total_routed"] = r["total_routed"]
        row["attendance"] = r["attendance"]
        row["cod_pct_routed"] = r["cod_pct"]
        denom = r["total_routed"] + row["total_in_hub"]
        row["routed_pct"] = round(r["total_routed"] / denom * 100, 2) if denom else 0.0


# ---------------------------------------------------------------------------
# Shipment Details tab (query 653 for Total Fresh, query 1239 Shipment Tracker,
# query 1500 line-haul trip arrivals)
# ---------------------------------------------------------------------------

SHIPMENT_DETAIL_KEYS = ("total_fresh", "total_shipment", "fresh_unscan", "latlong", "fresh_attempt_count")
SHIPMENT_DRILLDOWN_METRICS = ("fresh_unscan", "latlong")

_RTS_TAG = "RTS"
_MYT = timezone(timedelta(hours=8))


def _empty_shipment_row(hub_code: str) -> dict:
    name, _full, zone, region = HUBS[hub_code]
    row = {
        "station_code": hub_code, "station_name": name, "zone": zone, "region": region,
        "lh_trips": [], "process_time_minutes": None,
    }
    row.update({k: 0 for k in SHIPMENT_DETAIL_KEYS})
    return row


def build_shipment_details(
    total_shipments_rows: list[dict], tracker_rows: list[dict], lh_rows: list[dict],
    health_v3_rows: list[dict] = (),
) -> tuple[dict[str, dict], dict[str, dict]]:
    """Returns ({hub_code: shipment_detail_row}, {hub_code: {metric: [tracking_id]}})."""
    by_station = {hub: _empty_shipment_row(hub) for hub in HUBS}
    tn_details = {hub: {k: [] for k in SHIPMENT_DRILLDOWN_METRICS} for hub in HUBS}
    # "Process Time" = average time-of-day the TN's first hub sweep finished, today
    # only (Malaysia time). query 1239's own 1st_sweep_at_WM_station turned out to
    # be date-only (no time-of-day), so the actual time comes from query 78's
    # current_hub_first_sweep_datetime instead, matched by tracking_id.
    today_myt = datetime.now(_MYT).strftime("%Y-%m-%d")
    sweep_minutes: dict[str, list[float]] = {hub: [] for hub in HUBS}
    health_sweep_time = {
        r["tracking_id"]: r["current_hub_first_sweep_datetime"]
        for r in health_v3_rows
        if r.get("tracking_id") and r.get("current_hub_first_sweep_datetime")
    }

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
        else:
            sweep_dt = _parse_dt(health_sweep_time.get(tn))
            if sweep_dt is not None and sweep_dt.strftime("%Y-%m-%d") == today_myt:
                sweep_minutes[hub].append(sweep_dt.hour * 60 + sweep_dt.minute + sweep_dt.second / 60)

        if r.get("shp_dest_hub_name") != r.get("latest_dest_hub_name") and _RTS_TAG not in tag:
            row["latlong"] += 1
            tn_details[hub]["latlong"].append(tn)

        if r.get("first_attempt_date"):
            row["fresh_attempt_count"] += 1

    for hub, mins in sweep_minutes.items():
        if mins:
            by_station[hub]["process_time_minutes"] = round(sum(mins) / len(mins), 1)

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
    process_time_samples: dict[str, list[float]] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(
            key, {group_key: key, "region": row["region"], "station_count": 0, **{k: 0 for k in SHIPMENT_DETAIL_KEYS}}
        )
        for k in SHIPMENT_DETAIL_KEYS:
            g[k] += row[k]
        g["station_count"] += 1
        if row["process_time_minutes"] is not None:
            process_time_samples.setdefault(key, []).append(row["process_time_minutes"])
    for key, g in groups.items():
        g["fresh_attempt_pct"] = round(g["fresh_attempt_count"] / g["total_fresh"] * 100, 1) if g["total_fresh"] else 0.0
        samples = process_time_samples.get(key)
        g["process_time_minutes"] = round(sum(samples) / len(samples), 1) if samples else None
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


_ATTENDANCE_POSITIONS = {"HD", "HR", "ID", "IR"}


def _parse_driver(driver_name: str) -> dict:
    """Always returns a row -- OPS routes (hub routes, no real driver) and anything
    unparseable still get a driver_row (station totals and the driver table include
    everyone), they just never count toward Attendance/HD/HR/ID/IR headcount, which
    is the only place position matters. See build_routed_view."""
    name = driver_name or ""
    if "OPS" in name.upper():
        return {"name": name, "home_hub": None, "position": "OPS", "label": "OPS"}
    parts = [p.strip() for p in name.split("-")]
    if len(parts) < 3:
        return {"name": name, "home_hub": None, "position": None, "label": "Unknown"}
    abbr, position = parts[0].upper(), parts[1].upper()
    return {
        "name": name,
        "home_hub": ABBR_TO_HUB.get(abbr),
        "position": position,
        "label": _DRIVER_POSITION_LABELS.get(position, "Unknown"),
    }


def compute_tenure(start: date | None, today: date) -> str | None:
    """2026-09-20: driver tenure, sourced from a manually-uploaded driver/rider
    details CSV (Settings -> Documents), joined onto Routed View's driver rows
    by exact driver_name == "Display Name" match -- see main.py's
    upload_driver_details and routed_view. today - start, calendar-aware
    (not just days // 365)."""
    if start is None or start > today:
        return None
    years = today.year - start.year
    months = today.month - start.month
    days = today.day - start.day
    if days < 0:
        months -= 1
        prev_month = today.month - 1 or 12
        prev_year = today.year if today.month > 1 else today.year - 1
        days += calendar.monthrange(prev_year, prev_month)[1]
    if months < 0:
        years -= 1
        months += 12
    return f"{years}y {months}m {days}d"


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

    Attendance counts unique drivers whose position is HD/HR/ID/IR (Hybrid/
    Independent) with a route today at that station -- OPS and anything
    unparseable is excluded from Attendance/HD/HR/ID/IR headcount ONLY, but still
    appears as its own row in the driver table and counts everywhere else
    (Total Routed/Success/OVFD/COD), same as any other route. "Rescue" flags a
    driver whose name-prefix home station differs from where they're currently
    routing (still counted in attendance, just flagged).
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
        # Attendance/HD/HR/ID/IR headcount is the ONLY place a driver's position
        # matters -- OPS and unparseable names still get a driver_row below, and
        # still count in every other total (already added above regardless).
        if parsed["position"] in _ATTENDANCE_POSITIONS and parsed["name"] not in seen_drivers[hub]:
            seen_drivers[hub].add(parsed["name"])
            row["attendance"] += 1
            position_key = {"HD": "attendance_hd", "HR": "attendance_hr", "ID": "attendance_id", "IR": "attendance_ir"}.get(parsed["position"])
            if position_key:
                row[position_key] += 1
            if parsed["home_hub"] and parsed["home_hub"] != hub:
                row["attendance_rescue"] += 1

        d = driver_agg.setdefault(parsed["name"], {
            "driver_name": parsed["name"], "label": parsed["label"], "position": parsed["position"],
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
            "position": d["position"],
            "home_station": home[0] if home else None,
            "current_station": current[0] if current else d["current_hub"],
            "station_code": d["current_hub"],
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


# 2026-09-20 feedback: a driver-type filter (Hybrid/Independent/Other) on Routed
# View, affecting region/zone/station/driver views. The persisted routed_stations
# snapshot has no per-type breakdown (only headcount, via attendance_hd/hr/id/ir),
# so a type-filtered region/zone/station rollup has to be built fresh from the
# per-driver rows (build_routed_view's driver_rows) instead of that table.
DRIVER_TYPE_BUCKETS = {
    "hybrid": {"HD", "HR"},
    "independent": {"ID", "IR"},
    "other": {None, "OPS"},
}


def rollup_routed_by_driver_type(driver_rows: list[dict], group_key: str, driver_type: str | None) -> list[dict]:
    """Re-aggregates build_routed_view()'s per-driver rows up to station/zone/region
    level (group_key: 'station_code' | 'zone' | 'region'), restricted to one
    driver_type bucket ('hybrid' | 'independent' | 'other'), or every driver if None."""
    allowed = DRIVER_TYPE_BUCKETS.get(driver_type) if driver_type else None
    groups: dict[str, dict] = {}
    position_keys = {"HD": "attendance_hd", "HR": "attendance_hr", "ID": "attendance_id", "IR": "attendance_ir"}
    for d in driver_rows:
        if allowed is not None and d["position"] not in allowed:
            continue
        key = d.get(group_key)
        if key is None:
            continue
        g = groups.setdefault(key, {
            group_key: key, "region": d["region"], "zone": d["zone"], "station_codes": set(),
            "total_routed": 0, "current_success": 0, "current_ovfd": 0, "total_cod": 0,
            "attendance": 0, "attendance_hd": 0, "attendance_hr": 0, "attendance_id": 0, "attendance_ir": 0,
            "attendance_rescue": 0,
        })
        g["station_codes"].add(d["station_code"])
        g["total_routed"] += d["total_routed"]
        g["current_success"] += d["current_success"]
        g["current_ovfd"] += d["current_ovfd"]
        g["total_cod"] += d["total_cod"]
        if d["position"] in position_keys:
            g["attendance"] += 1
            g[position_keys[d["position"]]] += 1
            if d["is_rescue"]:
                g["attendance_rescue"] += 1
    out = []
    for g in groups.values():
        row = {**g, "station_codes": sorted(g["station_codes"]), "station_count": len(g["station_codes"])}
        out.append(_with_rates(row))
    return out


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
            if k in ("cod_pct_hub", "cod_pct_routed", "routed_pct"):
                continue
            g[k] += row[k]
        cod_hub_num[key] += row["cod_pct_hub"] * row["total_in_hub"] / 100
        cod_routed_num[key] += row["cod_pct_routed"] * row["total_routed"] / 100
        g["station_count"] += 1
    for key, g in groups.items():
        g["cod_pct_hub"] = round(cod_hub_num[key] / g["total_in_hub"] * 100, 1) if g["total_in_hub"] else 0.0
        g["cod_pct_routed"] = round(cod_routed_num[key] / g["total_routed"] * 100, 1) if g["total_routed"] else 0.0
        # total_routed/total_in_hub are both plain summed counts above, so the
        # group's routed_pct is just their ratio -- no numerator reconstruction
        # needed (unlike the two cod_pct_* fields, which only store a percentage).
        g_denom = g["total_routed"] + g["total_in_hub"]
        g["routed_pct"] = round(g["total_routed"] / g_denom * 100, 2) if g_denom else 0.0
    return list(groups.values())


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


# ---------------------------------------------------------------------------
# Shipper Watch tab (query 78 again for the hypercare shippers, Zalora NXD query
# 1296, Restock NXD query 1585). Unlike everything above, this has NOT been
# cross-checked against a live sheet/query snapshot -- it's built directly from
# the Fleet Manager's field-by-field description, so treat the numbers as
# provisional until confirmed against what's actually live.
# ---------------------------------------------------------------------------

# Mirrors the Fleet Manager's sheet formula for identifying a shipper from its
# tracking number (first match wins, same order as the sheet's IFS()).
_SHIPPER_TN_PATTERNS = (
    (re.compile(r"-00"), "Restock"),
    (re.compile(r"^WATSN", re.IGNORECASE), "Watson"),
    (re.compile(r"MYNJV"), "TTMY"),
    (re.compile(r"WNJMY|KNMY"), "TTDI"),
    (re.compile(r"AMNV"), "Amway"),
    (re.compile(r"SPE"), "Shopee"),
    (re.compile(r"NLMYA"), "Lazada"),
    (re.compile(r"ZNV|ZMP"), "Zalora"),
    (re.compile(r"TNG"), "TNG"),
)

# Orca has no confirmed pattern in the Fleet Manager's shipper-type formula --
# identified here by "ORCA" appearing in the tracking number, the same
# unconfirmed assumption flagged when this was first scoped. Confirm/correct
# once live numbers can be checked.
_ORCA_PATTERN = re.compile(r"ORCA", re.IGNORECASE)

# Sodaxpress has its own special parcel flow needing the same hypercare
# watch as Orca -- identified by TN prefix SB2CX or SDEWM.
_SODAXPRESS_PATTERN = re.compile(r"^(SB2CX|SDEWM)", re.IGNORECASE)


def _classify_shipper(tn: str | None) -> str:
    if not tn or not isinstance(tn, str) or not tn.strip():
        return "Others"
    t = tn.strip()
    if "RESTOCK" in t.upper():
        return "Restock"
    for pattern, name in _SHIPPER_TN_PATTERNS:
        if pattern.search(t):
            return name
    if t[:2].upper() == "MY":
        return "Shopee DI"
    return "Others"


SHIPPER_WATCH_KEYS = (
    "amway_zero_attempt", "amway_aging",
    "watson_zero_attempt", "watson_aging",
    "orca_ovfd", "orca_other",
    "sodaxpress_ovfd", "sodaxpress_other",
    "zalora_zero_attempt", "zalora_ovfd", "zalora_other",
    "restock_bundles", "restock_pieces", "restock_potential_breach", "restock_breach",
)

SHIPPER_DRILLDOWN_METRICS = (
    "amway_zero_attempt", "amway_aging", "watson_zero_attempt", "watson_aging",
    "orca_ovfd", "orca_other", "sodaxpress_ovfd", "sodaxpress_other",
    "zalora_zero_attempt", "zalora_ovfd", "zalora_other",
    "restock_bundles", "restock_potential_breach", "restock_breach", "restock_pieces",
)


def _empty_shipper_row(hub_code: str) -> dict:
    name, _full, zone, region = HUBS[hub_code]
    row = {"station_code": hub_code, "station_name": name, "zone": zone, "region": region}
    row.update({k: 0 for k in SHIPPER_WATCH_KEYS})
    return row


def build_shipper_watch(
    health_v3_rows: list[dict], zalora_rows: list[dict], restock_rows: list[dict]
) -> tuple[dict[str, dict], dict[str, dict]]:
    """Returns ({hub_code: shipper_row}, {hub_code: {metric: [tracking_id, ...]}}).

    Amway/Watson SLA: attempt on day 0, succeed delivery before day 3 -- so
    0-Attempt-Today and Aging(>Day0) are what matters. Orca and Sodaxpress
    (special parcel flow, TN prefix SB2CX/SDEWM) both watch OVFD vs everything
    else. All four read query 78, grouped by last_scan_hub_name like the rest
    of the app.
    """
    by_station = {hub: _empty_shipper_row(hub) for hub in HUBS}
    tn_details = {hub: {k: [] for k in SHIPPER_DRILLDOWN_METRICS} for hub in HUBS}

    for r in health_v3_rows:
        tn = r.get("tracking_id")
        hub = r.get("last_scan_hub_name")
        row = by_station.get(hub)
        if row is None:
            continue
        is_orca = bool(_ORCA_PATTERN.search(tn or ""))
        is_sodaxpress = bool(_SODAXPRESS_PATTERN.search(tn or ""))
        shipper = None if (is_orca or is_sodaxpress) else _classify_shipper(tn)
        if not is_orca and not is_sodaxpress and shipper not in ("Amway", "Watson"):
            continue
        status = r.get("granular_status")
        attempts = r.get("delivery_attempts") or 0
        age = r.get("days_since_current_hub_first_sweep") or 0

        if is_orca:
            if status == "On Vehicle for Delivery":
                row["orca_ovfd"] += 1
                tn_details[hub]["orca_ovfd"].append(tn)
            else:
                row["orca_other"] += 1
                tn_details[hub]["orca_other"].append(tn)
            continue

        if is_sodaxpress:
            if status == "On Vehicle for Delivery":
                row["sodaxpress_ovfd"] += 1
                tn_details[hub]["sodaxpress_ovfd"].append(tn)
            else:
                row["sodaxpress_other"] += 1
                tn_details[hub]["sodaxpress_other"].append(tn)
            continue

        prefix = "amway" if shipper == "Amway" else "watson"
        if status == "Arrived at Sorting Hub" and attempts == 0:
            row[f"{prefix}_zero_attempt"] += 1
            tn_details[hub][f"{prefix}_zero_attempt"].append(tn)
            if age > 0:
                row[f"{prefix}_aging"] += 1
                tn_details[hub][f"{prefix}_aging"].append(tn)

    # Zalora NXD: "dest_hub_name = last_sweep_hub_name means those parcels are at
    # the correct hub and that hub needs to attempt them" -- read as: only a
    # parcel's correct hub is on the hook for it, so exclude rows where it's
    # elsewhere. ASSUMPTION -- confirm this reading is right once live.
    #
    # 2026-09-20 feedback: OVFD is the exception to the hub-match rule above --
    # a parcel already out for delivery is counted purely by granular_status,
    # at whichever hub last swept it, regardless of dest_hub_name match. And
    # 0-Attempt only counts once first_shipment_completion_date is populated --
    # a blank date means it hasn't actually been added to a shipment yet.
    _ZALORA_ZERO_ATTEMPT_EXCLUDED_STATUSES = {"En-route to Sorting Hub", "On Vehicle for Delivery", "Pending Reschedule"}
    for r in zalora_rows:
        hub = r.get("last_sweep_hub_name")
        row = by_station.get(hub)
        if row is None:
            continue
        tn = r.get("tracking_id")
        status = r.get("granular_status")

        if status == "On Vehicle for Delivery":
            row["zalora_ovfd"] += 1
            tn_details[hub]["zalora_ovfd"].append(tn)
            continue

        if r.get("dest_hub_name") != r.get("last_sweep_hub_name"):
            continue
        if (
            (r.get("delivery_attempts") or 0) == 0
            and status not in _ZALORA_ZERO_ATTEMPT_EXCLUDED_STATUSES
            and r.get("first_shipment_completion_date")
        ):
            row["zalora_zero_attempt"] += 1
            tn_details[hub]["zalora_zero_attempt"].append(tn)
        elif status != "Arrived at Sorting Hub":
            row["zalora_other"] += 1
            tn_details[hub]["zalora_other"].append(tn)

    # Restock NXD: counted by bundle, not by row -- a bundle_tracking_number
    # repeats across rows (one per tracking_id inside it), and piece_count is
    # the bundle's actual parcel count. Grouped by last_scan_hub (where it
    # physically is), matching the rest of the app's convention. Clicking
    # Bundles/Potential Breach/Breach lists bundle_tracking_numbers; clicking
    # Pieces lists the individual tracking_id rows seen under those bundles
    # (may not exactly equal the summed piece_count, which is the bundle's own
    # declared figure, not a row count).
    seen_bundles: dict[str, set] = {hub: set() for hub in HUBS}
    for r in restock_rows:
        hub = r.get("last_scan_hub")
        row = by_station.get(hub)
        if row is None:
            continue
        piece_tn = r.get("tracking_id")
        if piece_tn:
            tn_details[hub]["restock_pieces"].append(piece_tn)
        bundle = r.get("bundle_tracking_number")
        if not bundle or bundle in seen_bundles[hub]:
            continue
        seen_bundles[hub].add(bundle)
        row["restock_bundles"] += 1
        row["restock_pieces"] += r.get("piece_count") or 0
        tn_details[hub]["restock_bundles"].append(bundle)
        days_group = r.get("days_group") or ""
        if "Potential" in days_group:
            row["restock_potential_breach"] += 1
            tn_details[hub]["restock_potential_breach"].append(bundle)
        elif "Breach" in days_group:
            row["restock_breach"] += 1
            tn_details[hub]["restock_breach"].append(bundle)

    return by_station, tn_details


def rollup_shipper_watch(station_rows: list[dict], group_key: str) -> list[dict]:
    groups: dict[str, dict] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(
            key, {group_key: key, "region": row["region"], "station_count": 0, **{k: 0 for k in SHIPPER_WATCH_KEYS}}
        )
        for k in SHIPPER_WATCH_KEYS:
            g[k] += row[k]
        g["station_count"] += 1
    return list(groups.values())


# ---------------------------------------------------------------------------
# Aging Details tab (query 78 again): five sub-views sharing one age-bucket pivot
# shape, each also with a full TN-level row list. All grouped by
# last_scan_hub_name, not dest_hub.
#   overall      -- every tracking number, no filter
#   zero_attempt -- delivery_attempts=0, status=Arrived at Sorting Hub, hub match
#   delivery     -- status=Arrived at Sorting Hub, hub match (any attempt count)
#   ats          -- hub doesn't match dest_hub, age > 0
#   cod          -- cod = Yes_cod
# "hub match" = last_scan_hub_name == dest_hub. A row can land in several types
# at once (e.g. overall + delivery + zero_attempt + cod).
# ---------------------------------------------------------------------------

AGING_BUCKETS = ("0", "1", "2", "3", "4-6", "7+")
# MySQL column names can't hold "-"/"+", so buckets map to SQL-safe keys; the
# frontend gets the human labels back via AGING_BUCKET_LABELS.
AGING_BUCKET_KEYS = {"0": "age_0", "1": "age_1", "2": "age_2", "3": "age_3", "4-6": "age_4_6", "7+": "age_7_plus"}
AGING_BUCKET_LABELS = {v: k for k, v in AGING_BUCKET_KEYS.items()}
AGING_KEYS = ("total",) + tuple(AGING_BUCKET_KEYS.values())

AGING_TYPES = ("overall", "zero_attempt", "delivery", "ats", "cod")
AGING_TYPE_LABELS = {
    "overall": "Aging Overall",
    "zero_attempt": "Aging 0 Attempt",
    "delivery": "Aging Delivery",
    "ats": "Aging ATS",
    "cod": "Aging COD",
}


def _age_bucket(age: int) -> str:
    # RPU's age (days_since_scheduled_date) can be negative for a pickup
    # scheduled in the future -- treat "not due yet" the same as day 0.
    if age <= 0:
        return "0"
    if age <= 3:
        return str(age)
    if age <= 6:
        return "4-6"
    return "7+"


def _empty_aging_row(hub_code: str) -> dict:
    name, _full, zone, region = HUBS[hub_code]
    row = {"station_code": hub_code, "station_name": name, "zone": zone, "region": region}
    row.update({k: 0 for k in AGING_KEYS})
    return row


def _aging_row_types(status: str | None, hub_match: bool, attempts: int, age: int, cod: str | None) -> list[str]:
    types = ["overall"]
    if status == "Arrived at Sorting Hub" and hub_match:
        types.append("delivery")
        if attempts == 0:
            types.append("zero_attempt")
    if not hub_match and age > 0:
        types.append("ats")
    if cod == "Yes_cod":
        types.append("cod")
    return types


def build_aging_details(health_v3_rows: list[dict]) -> tuple[dict[str, dict[str, dict]], dict[str, list[dict]]]:
    """Returns ({type: {hub_code: pivot_row}}, {type: [tn_row, ...]}).

    tn_row carries zone/region too (for scope filtering) even though the API
    schema only exposes the columns the Fleet Manager asked for."""
    by_type_station = {t: {hub: _empty_aging_row(hub) for hub in HUBS} for t in AGING_TYPES}
    by_type_rows: dict[str, list[dict]] = {t: [] for t in AGING_TYPES}

    for r in health_v3_rows:
        hub = r.get("last_scan_hub_name")
        if hub not in HUBS:
            continue
        name, _full, zone, region = HUBS[hub]
        dest_hub = r.get("dest_hub")
        status = r.get("granular_status")
        attempts = r.get("delivery_attempts") or 0
        age = r.get("days_since_current_hub_first_sweep") or 0
        cod = r.get("cod")
        bucket_key = AGING_BUCKET_KEYS[_age_bucket(age)]

        detail = {
            "station_code": hub, "station_name": name, "zone": zone, "region": region,
            "tracking_number": r.get("tracking_id"), "status": status, "attempts": attempts,
            "age": age, "tag": r.get("tag"), "cod": cod, "dest_hub": dest_hub,
        }

        for t in _aging_row_types(status, hub == dest_hub, attempts, age, cod):
            row = by_type_station[t][hub]
            row[bucket_key] += 1
            row["total"] += 1
            by_type_rows[t].append(detail)

    return by_type_station, by_type_rows


def rollup_aging(station_rows: list[dict], group_key: str) -> list[dict]:
    groups: dict[str, dict] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(
            key, {group_key: key, "region": row["region"], "station_count": 0, **{k: 0 for k in AGING_KEYS}}
        )
        for k in AGING_KEYS:
            g[k] += row[k]
        g["station_count"] += 1
    return list(groups.values())


# ---------------------------------------------------------------------------
# Old Route tab (query 1451, "XB: Aging OVFD Parcels") -- tracking numbers still
# stuck on the route they were first put on, days ago. The query itself already
# filters to "routed to last mile hubs, rts_flag=0, days_from_driver_inbound>=1",
# so every row here already qualifies as stuck; this just aggregates/lists them.
# Columns used: tracking_id, route_id, route_hub_name (a hub code, same as
# elsewhere), days_since_driver_inbound ("Age"), driver_name (same "<abbr> - <pos>
# - <name>" format as query 512), shipper_name, route_date.
# ---------------------------------------------------------------------------

OLD_ROUTE_ROWS_CAP = 2000  # same rationale as Aging Details' cap -- bound payload size


def _empty_old_route_row(hub_code: str) -> dict:
    name, _full, zone, region = HUBS[hub_code]
    return {"station_code": hub_code, "station_name": name, "zone": zone, "region": region, "total_tn": 0}


def build_old_route(old_route_rows: list[dict]) -> tuple[dict[str, dict], list[dict], list[dict]]:
    """Returns ({hub_code: pivot_row}, [tn_row, ...], [driver_row, ...])."""
    by_station = {hub: _empty_old_route_row(hub) for hub in HUBS}
    tn_rows: list[dict] = []
    driver_agg: dict[str, dict] = {}

    for r in old_route_rows:
        hub = r.get("route_hub_name")
        row = by_station.get(hub)
        if row is None:
            continue
        row["total_tn"] += 1
        age = r.get("days_since_driver_inbound") or 0
        driver_name = r.get("driver_name") or ""
        route_id = r.get("route_id")
        tn_rows.append({
            "station_code": hub, "station_name": row["station_name"], "zone": row["zone"], "region": row["region"],
            "tracking_number": r.get("tracking_id"), "route_id": str(route_id) if route_id is not None else None,
            "route_date": r.get("route_date"), "age": age,
            "driver_name": driver_name, "shipper_name": r.get("shipper_name"),
        })

        parsed = _parse_driver(driver_name)
        d = driver_agg.setdefault(parsed["name"], {
            "driver_name": parsed["name"], "driver_type": parsed["label"], "current_hub": hub, "total_tn": 0,
        })
        d["total_tn"] += 1

    driver_rows = []
    for d in driver_agg.values():
        hub_info = HUBS.get(d["current_hub"])
        driver_rows.append({
            "driver_name": d["driver_name"], "driver_type": d["driver_type"],
            "station_name": hub_info[0] if hub_info else d["current_hub"],
            "zone": hub_info[2] if hub_info else None, "region": hub_info[3] if hub_info else None,
            "total_tn": d["total_tn"],
        })

    return by_station, tn_rows, driver_rows


def rollup_old_route(station_rows: list[dict], group_key: str) -> list[dict]:
    groups: dict[str, dict] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(key, {group_key: key, "region": row["region"], "station_count": 0, "total_tn": 0})
        g["total_tn"] += row["total_tn"]
        g["station_count"] += 1
    return list(groups.values())


# ---------------------------------------------------------------------------
# RPU tab (query 1397, "OPEX: LM RPU Monitoring") -- from the Fleet Manager's
# "LM - RPU Tracker" sheet. Columns used: pickup_hub (a hub code, same as
# elsewhere), tracking_id, granular_status, failed_pickup_attempts,
# days_since_scheduled_date ("Age"), last_pickup_attempt_failure_reason,
# pickup_driver_name, shipper_name (used directly for the shipper picker --
# every distinct shipper, not just Zalora/Cainiao).
#
# Only 3 statuses are in scope (everything else, e.g. a completed pickup, is
# excluded entirely) -- a row's "stage":
#   pending_pickup  -- granular_status == "Pending Pickup"
#   ovfd            -- granular_status == "Van en-route to pickup" (the sheet's
#                      own name for this stage -- van already en route to pick
#                      up, NOT related to delivery OVFD elsewhere in this app)
#   pending_inbound -- granular_status == "En-route to Sorting Hub" (picked up,
#                      not yet scanned in at the hub)
# All three stages live in ONE flat row list (with a "stage"/"status" column
# each row carries) so the main RPU view can show everything with a status
# filter, and RPU Aging can bucket by age across all of them (or just one
# shipper) the same way Aging Details does.
# ---------------------------------------------------------------------------

RPU_STAGE_STATUS = {
    "pending_pickup": "Pending Pickup",
    "ovfd": "Van en-route to pickup",
    "pending_inbound": "En-route to Sorting Hub",
}
RPU_STATUS_TO_STAGE = {v: k for k, v in RPU_STAGE_STATUS.items()}
RPU_STAGE_LABELS = {
    "pending_pickup": "Pending Pick Up",
    "ovfd": "En Route to Sorting Hub",
    "pending_inbound": "Pending Inbound",
}
RPU_ROWS_CAP = 2000  # same rationale as Aging Details / Old Route


RPU_STAGE_COLUMNS = tuple(f"{s}_tn" for s in RPU_STAGE_LABELS)  # pending_pickup_tn, ovfd_tn, pending_inbound_tn
RPU_PIVOT_KEYS = RPU_STAGE_COLUMNS + ("total_tn",)


def _empty_rpu_row(hub_code: str) -> dict:
    name, _full, zone, region = HUBS[hub_code]
    row = {"station_code": hub_code, "station_name": name, "zone": zone, "region": region}
    row.update({k: 0 for k in RPU_PIVOT_KEYS})
    return row


def build_rpu(rpu_rows: list[dict]) -> tuple[dict[str, dict], list[dict]]:
    """Returns ({hub_code: pivot_row}, [row, ...]) -- the pivot always breaks
    out every stage as its own column (the status filter on the RPU Status
    tab only narrows the TN table, not this summary), persisted just so
    something is visible right after a restart; the real filtering (by
    stage/shipper/age-bucket) all happens at request time in main.py off the
    flat row list, which is cheap enough given RPU's row counts."""
    by_station = {hub: _empty_rpu_row(hub) for hub in HUBS}
    rows_out: list[dict] = []

    for r in rpu_rows:
        hub = r.get("pickup_hub")
        if hub not in HUBS:
            continue
        status = r.get("granular_status")
        stage = RPU_STATUS_TO_STAGE.get(status)
        if stage is None:
            continue
        by_station[hub][f"{stage}_tn"] += 1
        by_station[hub]["total_tn"] += 1
        rows_out.append({
            "station_code": hub, "station_name": HUBS[hub][0], "zone": HUBS[hub][2], "region": HUBS[hub][3],
            "stage": stage, "status": status,
            "tracking_number": r.get("tracking_id"),
            "attempts": int(r.get("failed_pickup_attempts") or 0),
            "age": int(r.get("days_since_scheduled_date") or 0),
            "failure_reason": r.get("last_pickup_attempt_failure_reason"),
            "driver_name": r.get("pickup_driver_name"), "shipper_name": r.get("shipper_name"),
        })

    return by_station, rows_out


def rollup_rpu(station_rows: list[dict], group_key: str) -> list[dict]:
    groups: dict[str, dict] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(
            key, {group_key: key, "region": row["region"], "station_count": 0, **{k: 0 for k in RPU_PIVOT_KEYS}}
        )
        for k in RPU_PIVOT_KEYS:
            g[k] += row[k]
        g["station_count"] += 1
    return list(groups.values())


def rpu_station_pivot(rows: list[dict]) -> list[dict]:
    """Builds a per-station, per-stage TN-count pivot from an already
    shipper-filtered (but NOT stage-filtered -- every stage is its own
    column) flat RPU row list."""
    pivot: dict[str, dict] = {}
    for r in rows:
        p = pivot.setdefault(
            r["station_code"],
            {
                "station_code": r["station_code"], "station_name": r["station_name"],
                "zone": r["zone"], "region": r["region"], **{k: 0 for k in RPU_PIVOT_KEYS},
            },
        )
        p[f"{r['stage']}_tn"] += 1
        p["total_tn"] += 1
    return list(pivot.values())


def bucket_rpu_aging(rows: list[dict], only_zero_attempt: bool) -> tuple[dict[str, dict], list[dict]]:
    """Buckets an already-filtered flat RPU row list by age, same bucket scheme
    as Aging Details (reuses AGING_BUCKET_KEYS/_empty_aging_row/_age_bucket).
    Returns ({hub_code: pivot_row}, [row, ...]) -- pivot_row shape matches
    AgingStationRow, so rollup_aging() works on it unchanged."""
    by_station = {hub: _empty_aging_row(hub) for hub in HUBS}
    rows_out = []
    for r in rows:
        if only_zero_attempt and r["attempts"] != 0:
            continue
        hub = r["station_code"]
        bucket_key = AGING_BUCKET_KEYS[_age_bucket(r["age"])]
        row = by_station[hub]
        row[bucket_key] += 1
        row["total"] += 1
        rows_out.append(r)
    return by_station, rows_out
