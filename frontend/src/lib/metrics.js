// Station Health's metric set -- the canonical key+label list, shared between
// Dashboard.jsx (the table itself) and AdminPanel's SLA Targets screen (which
// edits the threshold behind each one). Keep frontend/src/thresholds.js's
// METRICS keys in sync with this list.
export const ALL_COLUMNS = [
  { key: "total_fresh", label: "Total Fresh" },
  { key: "total_routed", label: "Total Routed" },
  { key: "routed_pct", label: "Routed %" },
  { key: "attendance", label: "Attendance" },
  { key: "zero_attempt_total", label: "Total 0 Attempt" },
  { key: "zero_attempt", label: "0 Attempt D0" },
  { key: "zero_attempt_gt_d0", label: "0 Attempt >D0" },
  { key: "total_in_hub", label: "In Hub" },
  { key: "age_gt3", label: "Age >3" },
  { key: "on_hold", label: "On Hold" },
  { key: "reschedule", label: "Reschedule" },
  { key: "still_ovfd", label: "Still OVFD" },
  { key: "cod_pct_hub", label: "COD % (Hub)" },
  { key: "prior_d0", label: "Prior D0" },
  { key: "prior_gt_d0", label: "Prior >D0" },
  { key: "unsweep_document", label: "Unsweep Document" },
  { key: "unsweep_parcel", label: "Unsweep Parcel" },
  { key: "missing_hub", label: "Missing (Hub)" },
  { key: "missing_driver_rider", label: "Missing (Driver/Rider)" },
  { key: "missing_ship_in", label: "Missing (Ship-in)" },
  { key: "pending_ats_zero_attempt", label: "Pending ATS (0 Attempt)" },
  { key: "pending_ats_attempted", label: "Pending ATS (Attempted)" },
];

// Station Health's column groups + short sub-labels (staging trial, FEATURES.healthTable -- design review D5). The full label stays in
// ALL_COLUMNS; short is what the narrow sub-header shows (full label goes in the tooltip). Every ALL_COLUMNS key appears exactly once.
export const HEALTH_GROUPS = [
  { key: "volume", label: "Volume", columns: [["total_fresh", "Fresh"], ["total_routed", "Routed"], ["routed_pct", "Routed %"]] },
  { key: "riders", label: "Riders", columns: [["attendance", "Riders"]] },
  { key: "zero", label: "0 Attempt", columns: [["zero_attempt_total", "Total"], ["zero_attempt", "D0"], ["zero_attempt_gt_d0", ">D0"]] },
  { key: "hub", label: "In Hub", columns: [["total_in_hub", "In Hub"], ["age_gt3", "Age >3"], ["on_hold", "On Hold"], ["reschedule", "Resched."]] },
  { key: "ovfd", label: "OVFD & COD", columns: [["still_ovfd", "Still OVFD"], ["cod_pct_hub", "COD % Hub"]] },
  { key: "prior", label: "Prior", columns: [["prior_d0", "D0"], ["prior_gt_d0", ">D0"]] },
  { key: "unsweep", label: "Unswept", columns: [["unsweep_document", "Document"], ["unsweep_parcel", "Parcel"]] },
  { key: "missing", label: "Missing", columns: [["missing_hub", "Hub"], ["missing_driver_rider", "Rider"], ["missing_ship_in", "Ship-in"]] },
  { key: "ats", label: "Pending ATS", columns: [["pending_ats_zero_attempt", "0 Attempt"], ["pending_ats_attempted", "Attempted"]] },
];
