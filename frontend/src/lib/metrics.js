// Station Health's metric set -- the canonical key+label list, shared between
// Dashboard.jsx (the table itself) and AdminPanel's SLA Targets screen (which
// edits the threshold behind each one). Keep frontend/src/thresholds.js's
// METRICS keys in sync with this list.
export const ALL_COLUMNS = [
  { key: "total_fresh", label: "Total Fresh" },
  { key: "total_routed", label: "Total Routed" },
  { key: "routed_pct", label: "Routed %" },
  { key: "attendance", label: "Attendance" },
  { key: "zero_attempt", label: "0 Attempt" },
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
  { key: "missing_ship_in", label: "Missing (Ship-in)" },
  { key: "pending_ats_zero_attempt", label: "Pending ATS (0 Attempt)" },
  { key: "pending_ats_attempted", label: "Pending ATS (Attempted)" },
];
