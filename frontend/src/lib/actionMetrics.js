// Action Board metrics sourced from outside Station Health -- Old Route, Shipper
// Watch's Zalora NXD, and Routed View. Kept separate from lib/metrics.js's
// ALL_COLUMNS (Station Health's own column set) since these don't apply to the
// Station Health table itself, only to Action Board's heatmap/metric picker and
// Admin -> SLA Targets (so they're still admin-configurable).
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
];

export const NO_DRILLDOWN_METRICS = new Set(["routed_current_ovfd"]);

export const BOARD_COLUMNS = [...ALL_COLUMNS, ...EXTRA_METRICS];

export const findBoardColumn = (key) => BOARD_COLUMNS.find((c) => c.key === key);
