"""Superadmin -> Metric Logic Summary (2026-10-08 feedback): for every Station Health column, where its number comes
from and the exact rule the backend applies, so the numbers can be double-checked. Served by GET /api/admin/metric-logic
to the Superadmin only (main.py) -- the text is NOT in the frontend bundle. Written by hand from aggregate.py's
build_station_metrics / build_routed_view / merge_routed_into_station_metrics / rollup: when one of those changes, change
the matching entry here (the live constants below are imported, so those can't drift)."""
from aggregate import OPS_ROUTE_MIN_SUCCESS
from stations import HUBS
from redash_client import (
    QUERY_ACTIVE_MISSING, QUERY_DELIVERY_PERFORMANCE, QUERY_HEALTH_V3, QUERY_TOTAL_SHIPMENTS, QUERY_UNSWEEP,
)

HOW_ROWS_ARE_BUILT = [
    f"Every refresh (about every 15 minutes) the backend pulls the Redash queries below, and aggregate.build_station_metrics / "
    f"build_routed_view turn them into one row per station ({len(HUBS)} stations; anything else is dropped).",
    f"Parcel metrics come from query {QUERY_HEALTH_V3} (FLEET: Health V3, one row per active parcel) and are counted at "
    f"last_scan_hub_name -- the hub where the parcel physically is -- not at its destination.",
    f"Route metrics come from query {QUERY_DELIVERY_PERFORMANCE} (one row per Route ID: Station, Driver, Total Routed, "
    f"Current Total Success, Current OVFD, Total COD).",
    "Each refresh stores one snapshot per station in station_metrics (captured_at); the dashboard reads the newest one. "
    "DoD keeps the last refresh of each day in dod_daily.",
    "Zone / region rows are the sum of their stations' counts. A percentage is never averaged: it is recomputed from the "
    "summed numerator and denominator, so a group's % is the true % for all its parcels.",
    "A parcel is tested top to bottom and stops at the first rule that takes it: 1) On Hold -> On Hold; 2) On Vehicle for "
    "Delivery -> Still OVFD; 3) last-scan hub is not its destination hub -> Pending ATS; 4) otherwise it is In Hub and the "
    "In Hub sub-metrics below look at it.",
]

_P78 = f"Query {QUERY_HEALTH_V3} (Health V3) -- tracking_id, granular_status, last_scan_hub_name, dest_hub, delivery_attempts, days_since_current_hub_first_sweep, tag, cod"
_P512 = f"Query {QUERY_DELIVERY_PERFORMANCE} (Delivery Performance) -- Station, Route ID, Driver, Total Routed, Current Total Success, Current OVFD, Total COD"


def _m(key, label, group, source, logic, rollup, tn_list, notes=None):
    return {
        "key": key, "label": label, "group": group, "source": source, "logic": logic, "rollup": rollup,
        "tn_list": tn_list, "notes": notes or [],
    }


def metrics() -> list[dict]:
    sum_rollup = "Zone / region = sum of the stations."
    return [
        _m("total_fresh", "Total Fresh", "Volume", f"Query {QUERY_TOTAL_SHIPMENTS} (total orders per hub today) -- dest_hub_name, total_orders",
           [f"total_orders of the row whose dest_hub_name matches the station (matched through the station's full name)."],
           sum_rollup, False,
           ["Reference only, not scored. This is Station Health's own number; Shipment Details' Total Fresh is derived differently (Fresh Unscan + the process buckets, from query 1239)."]),
        _m("total_routed", "Total Route", "Volume", _P512,
           ["Sum of Total Routed over every route at the station EXCEPT invalid OPS routes.",
            f"An OPS route is one whose Driver name contains OPS (a hub route, no real driver). It is valid when it has at least {OPS_ROUTE_MIN_SUCCESS} Current Total Success; with fewer it is invalid and its parcels go to Total OPS Route instead.",
            "Every non-OPS route (Hybrid / Independent drivers and anything unparseable) is always valid."],
           sum_rollup, False,
           ["Route Monitoring still shows every route together; Total Route + Total OPS Route = Route Monitoring's Total Routed."]),
        _m("total_ops_route", "Total OPS Route", "Volume", _P512,
           [f"Sum of Total Routed over OPS routes (Driver contains OPS) with fewer than {OPS_ROUTE_MIN_SUCCESS} Current Total Success.",
            f"An OPS route with {OPS_ROUTE_MIN_SUCCESS} or more successes is a legit route and is counted in Total Route, not here."],
           sum_rollup, False, ["Parcels, not the number of routes."]),
        _m("routed_pct", "Routed %", "Volume", "Derived: Total Route and In Hub (above)",
           ["Total Route / (Total Route + In Hub) x 100, 2 decimals."],
           "Recomputed from the group's summed Total Route and In Hub.", False,
           ["In Hub includes Invalid OPS Attempt (see below), so invalid OPS parcels weigh against the %, not for it."]),
        _m("productivity", "Productivity", "Volume", _P512,
           ["Route Monitoring's Productivity: sum of Current Total Success / sum of Total Routed across EVERY route at the station (valid and OPS), x 100, shown as a plain figure with 2 decimals (the same number as Route Monitoring's Success Rate)."],
           "Weighted by each station's total parcels routed (Total Route + Total OPS Route), so a group's figure is total successes / total routed.", False),
        _m("attendance", "Attendance", "Attendance", _P512,
           ["Unique drivers, counted once per station, whose Driver name parses as '<station abbr> - <position> - <name>' with position HD, HR, ID or IR (Hybrid / Independent driver or rider).",
            "OPS routes and names that don't parse are not counted. A driver whose home station (the abbreviation) differs from the station they route at is a rescue driver: still counted, and shown in brackets."],
           sum_rollup, False),
        _m("zero_attempt_total", "Total 0 Attempt", "0 Attempt", _P78,
           ["Parcel is In Hub (see Total In Hub), delivery_attempts = 0, status = Arrived at Sorting Hub, and days_since_current_hub_first_sweep is not blank (a blank age is left out)."],
           sum_rollup, True, ["= 0 Attempt D0 + 0 Attempt >D0."]),
        _m("zero_attempt", "0 Attempt D0", "0 Attempt", _P78,
           ["Total 0 Attempt parcels whose days_since_current_hub_first_sweep is 0 (swept today)."], sum_rollup, True),
        _m("zero_attempt_gt_d0", "0 Attempt >D0", "0 Attempt", _P78,
           ["Total 0 Attempt parcels whose days_since_current_hub_first_sweep is more than 0."], sum_rollup, True,
           ["Never overlaps with 0 Attempt D0."]),
        _m("total_in_hub", "In Hub", "In Hub", _P78 + " + the OPS invalid attempts from query 512",
           ["Physical parcels: not On Hold, not On Vehicle for Delivery, and the last-scan hub equals the parcel's destination hub (dest_hub).",
            "PLUS Invalid OPS Attempt: parcels routed on OPS routes with too few successes, which were never really attempted (see below)."],
           sum_rollup, True,
           ["The tracking-number list behind In Hub covers only the physical parcels; the Invalid OPS Attempt part is a count with no tracking numbers (route level)."]),
        _m("invalid_ops_attempt", "Invalid OPS Attempt", "In Hub", _P512,
           [f"For every OPS route (Driver contains OPS) with fewer than {OPS_ROUTE_MIN_SUCCESS} Current Total Success: Total Routed minus Current Total Success of that route, summed over the station.",
            "These parcels were routed under an OPS route that has no real delivery behind it, so they count as invalid attempts and are added to In Hub."],
           sum_rollup, False),
        _m("age_gt3", "Age >3", "In Hub", _P78,
           ["Parcel is In Hub and days_since_current_hub_first_sweep is more than 3."],
           sum_rollup, True, ["Scored in SLA Targets as a % of In Hub."]),
        _m("on_hold", "On Hold", "In Hub", _P78, ["status = On Hold (taken first, before every other rule)."], sum_rollup, True),
        _m("reschedule", "Reschedule", "In Hub", _P78,
           ["Parcel is In Hub and delivery_attempts is more than 0."], sum_rollup, True),
        _m("still_ovfd", "Still OVFD", "OVFD & COD", _P78,
           ["status = On Vehicle for Delivery, at whichever hub last scanned it (no destination check)."], sum_rollup, True),
        _m("cod_pct_hub", "COD % (Hub)", "OVFD & COD", _P78,
           ["Physical In Hub parcels whose cod = Yes_cod, divided by the physical In Hub count (before Invalid OPS Attempt is added), x 100, 1 decimal."],
           "Recomputed from the summed COD parcels and In Hub (weighted by each station's In Hub).", False),
        _m("prior_d0", "Prior D0", "Prior", _P78,
           ["Parcel is In Hub, status = Arrived at Sorting Hub, the tag contains PRIOR, and delivery_attempts = 0."], sum_rollup, True),
        _m("prior_gt_d0", "Prior >D0", "Prior", _P78,
           ["Parcel is In Hub, status = Arrived at Sorting Hub, the tag contains PRIOR, and days_since_current_hub_first_sweep is more than 0."],
           sum_rollup, True, ["Independent of Prior D0: a PRIOR parcel with 0 attempts that is older than a day is in both."]),
        _m("unsweep_document", "Unsweep Document", "Unswept", f"Query {QUERY_UNSWEEP} (unswept tracking numbers) -- tracking_id, last_scan_hub_name",
           ["Unswept tracking number whose id ends -DO / -MYPSO, starts MYRDO or contains GRN (a document), at last_scan_hub_name."], sum_rollup, True),
        _m("unsweep_parcel", "Unsweep Parcel", "Unswept", f"Query {QUERY_UNSWEEP} (unswept tracking numbers) -- tracking_id, last_scan_hub_name",
           ["Every other unswept tracking number at last_scan_hub_name."], sum_rollup, True),
        _m("missing_hub", "Missing (Hub)", "Missing", f"Query {QUERY_ACTIVE_MISSING} (open missing tickets) -- tracking_id, last_scan_hub_name, last_scan_type, granular_status",
           ["Open ticket whose last_scan_type = Sweep (lost inside the hub).",
            "Left out of every missing column: status Completed (PDCNR) and B2B document ids (MYPSO / MYRDO / -DO)."], sum_rollup, True),
        _m("missing_driver_rider", "Missing (Driver/Rider)", "Missing", f"Query {QUERY_ACTIVE_MISSING}",
           ["Open ticket whose last_scan_type = Inbound (last seen with a driver / rider)."], sum_rollup, True),
        _m("missing_ship_in", "Missing (Ship-in)", "Missing", f"Query {QUERY_ACTIVE_MISSING}",
           ["Open ticket whose last_scan_type = Shipment Completion (lost on the ship-in / line-haul)."], sum_rollup, True,
           ["Add To Shipment (Ship Out) has no Station Health column; it shows in Recovery."]),
        _m("pending_ats_zero_attempt", "Pending ATS (0 Attempt)", "Pending ATS", _P78,
           ["Not On Hold, not On Vehicle, the last-scan hub is NOT the parcel's destination hub, and delivery_attempts = 0."], sum_rollup, True),
        _m("pending_ats_attempted", "Pending ATS (Attempted)", "Pending ATS", _P78,
           ["Same hub mismatch, delivery_attempts more than 0, and status = Arrived at Sorting Hub."], sum_rollup, True),
    ]


def summary() -> dict:
    return {"how": HOW_ROWS_ARE_BUILT, "metrics": metrics()}
