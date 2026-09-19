-- Action Board's new metrics sourced from Old Route / Shipper Watch / Routed View
-- (frontend/src/ActionBoard.jsx's EXTRA_METRICS) -- scored=1 like the rest of the
-- picker's options so they're selectable, placeholders until an admin fills in
-- real targets via Admin -> SLA Targets.
INSERT INTO sla_thresholds (metric_key, scope, scored, direction, warning_at, critical_at) VALUES
  ('old_route_tn', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('zalora_zero_attempt', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('zalora_ovfd', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('routed_current_ovfd', 'nationwide', 1, 'higher-is-worse', 0, 0);
