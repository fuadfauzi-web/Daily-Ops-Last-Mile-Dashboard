-- Lets a metric be scored as "% of another field on the same row" instead of a
-- raw count -- e.g. Age >3 as % of Total In Hub, per 2026-09-20 feedback.
-- NULL (the default, and what every existing row already has) means "raw count",
-- today's behaviour, unchanged for every metric that doesn't opt in.
ALTER TABLE sla_thresholds
  ADD COLUMN percent_of VARCHAR(64) NULL AFTER critical_at;

-- Seed the nationwide default for Age >3 as % of Total In Hub, matching the
-- Fleet Manager's example (warning/critical stay 0/0 -- "TO BE SUPPLIED" -- until
-- set for real via Admin -> SLA Targets).
UPDATE sla_thresholds SET percent_of = 'total_in_hub' WHERE metric_key = 'age_gt3' AND scope = 'nationwide';
