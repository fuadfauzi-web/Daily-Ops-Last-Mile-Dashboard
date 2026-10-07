-- 2026-10-08 (Activity tab): a target can now also need a minimum number of parcels -- "Age >3: 5% of In Hub AND at least 15 parcels = warning,
-- 5% AND at least 30 parcels = critical". NULL (every existing row) = no minimum, so every other target behaves exactly as before.
ALTER TABLE sla_thresholds
  ADD COLUMN min_count_warning INT NULL AFTER percent_of,
  ADD COLUMN min_count_critical INT NULL AFTER min_count_warning;

-- Fleet Manager's Age >3 rule (nationwide): 5% of Total In Hub, and at least 15 parcels for a warning / 30 for a critical.
UPDATE sla_thresholds
   SET percent_of = 'total_in_hub', warning_at = 5, critical_at = 5, min_count_warning = 15, min_count_critical = 30
 WHERE metric_key = 'age_gt3' AND scope = 'nationwide';

-- New Action Board metrics (targets editable in Settings -> Station Metric Targets). The Shipper SLA split follows the Fleet Manager's rule
-- (warning as soon as there is one, breach as soon as there is one); the two "to answer" metrics warn as soon as one case is waiting; the
-- three aging metrics start unset (0 / 0 = shown plain, never flagged) until the team agrees a number.
INSERT INTO sla_thresholds (metric_key, scope, scored, direction, warning_at, critical_at) VALUES
  ('shipper_sla_warning_ovfd', 'nationwide', 1, 'higher-is-worse', 1, 999999),
  ('shipper_sla_warning_aash', 'nationwide', 1, 'higher-is-worse', 1, 999999),
  ('shipper_sla_breach_ovfd', 'nationwide', 1, 'higher-is-worse', 1, 1),
  ('shipper_sla_breach_aash', 'nationwide', 1, 'higher-is-worse', 1, 1),
  ('aging_delivery_gt3', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('aging_ats_gt7', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('rpu_aging_gt5', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('missing_to_answer', 'nationwide', 1, 'higher-is-worse', 1, 999999),
  ('lost_to_answer', 'nationwide', 1, 'higher-is-worse', 1, 999999);
