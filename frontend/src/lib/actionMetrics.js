// Action Board metrics sourced from outside Station Health -- Old Route, Shipper
// Watch's Zalora NXD, and Routed View. Kept separate from lib/metrics.js's
// ALL_COLUMNS (Station Health's own column set) since these don't apply to the
// Station Health table itself, only to Action Board's heatmap/metric picker and
// Superadmin -> SLA Targets (so they're still admin-configurable).
//
// Routed View's numbers are route-level (query 512 has no tracking_id), so
// routed_current_ovfd can never have a Copy TNs / tracking-number drilldown --
// see NO_DRILLDOWN_METRICS.
import { ALL_COLUMNS } from "./metrics";

export const EXTRA_METRICS = [
  { key: "old_route_tn", label: "Old Route" },
  { key: "zalora_zero_attempt", label: "Zalora NXD 0 Attempt" },
  { key: "zalora_ovfd", label: "Zalora NXD OVFD" },
  { key: "routed_current_ovfd", label: "Route Monitoring OVFD" },
  { key: "fresh_unscan", label: "Fresh Unscan" },
  // Amway / Watson / Orca / Cold Chain parcels still at the station: older than 0 days = warning, older than 1 day = breach.
  // Shipper SLA Warning / Breach, split by parcel status (2026-10-08; the old totals are gone from the board): OVFD = On Vehicle for
  // Delivery + En-route to Sorting Hub, AASH = Arrived at Sorting Hub.
  { key: "shipper_sla_warning_ovfd", label: "Shipper SLA Warning OVFD" },
  { key: "shipper_sla_warning_aash", label: "Shipper SLA Warning AASH" },
  { key: "shipper_sla_breach_ovfd", label: "Shipper SLA Breach OVFD" },
  { key: "shipper_sla_breach_aash", label: "Shipper SLA Breach AASH" },
  // Aging (2026-10-08)
  { key: "aging_delivery_gt3", label: "Aging Delivery >3d" },
  { key: "aging_ats_gt7", label: "Aging ATS >7d" },
  { key: "rpu_aging_gt5", label: "RPU Aging >5d" },
  // Cases a station still has to answer (Recovery tab), 2026-10-08
  { key: "missing_to_answer", label: "Active Missing to Answer" },
  { key: "lost_to_answer", label: "Lost Declared to Answer" },
];

// Metrics that come from Shipper Watch's snapshot and are drilled into through /api/shipper-drilldown.
export const SHIPPER_DRILL_METRICS = new Set([
  "zalora_zero_attempt", "zalora_ovfd", "shipper_sla_warning", "shipper_sla_breach",
  "shipper_sla_warning_ovfd", "shipper_sla_warning_aash", "shipper_sla_breach_ovfd", "shipper_sla_breach_aash",
  "aging_delivery_gt3", "aging_ats_gt7", "rpu_aging_gt5", "missing_to_answer", "lost_to_answer",
]);

export const NO_DRILLDOWN_METRICS = new Set(["routed_current_ovfd"]);

export const BOARD_COLUMNS = [...ALL_COLUMNS, ...EXTRA_METRICS];

export const findBoardColumn = (key) => BOARD_COLUMNS.find((c) => c.key === key);

// Groups for the Action Board's metric picker (staging trial, FEATURES.boardViews -- design review D9). A scored metric not listed
// here lands in an automatic "Other" group, so nothing an admin scores can go missing from the picker.
export const BOARD_GROUPS = [
  { label: "0 Attempt", keys: ["zero_attempt_total", "zero_attempt", "zero_attempt_gt_d0"] },
  { label: "In Hub", keys: ["total_in_hub", "age_gt3", "on_hold", "reschedule"] },
  { label: "Prior", keys: ["prior_d0", "prior_gt_d0"] },
  { label: "Unswept", keys: ["unsweep_document", "unsweep_parcel"] },
  { label: "Missing", keys: ["missing_hub", "missing_driver_rider", "missing_ship_in", "missing_to_answer", "lost_to_answer"] },
  { label: "Pending ATS", keys: ["pending_ats_zero_attempt", "pending_ats_attempted"] },
  { label: "Routing", keys: ["old_route_tn", "fresh_unscan", "routed_current_ovfd"] },
  { label: "Aging", keys: ["aging_delivery_gt3", "aging_ats_gt7", "rpu_aging_gt5"] },
  {
    label: "Shipper",
    keys: [
      "zalora_zero_attempt", "zalora_ovfd",
      "shipper_sla_warning_ovfd", "shipper_sla_warning_aash", "shipper_sla_breach_ovfd", "shipper_sla_breach_aash",
    ],
  },
];
