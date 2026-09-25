-- 2026-09-26: Action Board "Shipper SLA" -- Amway / Watson / Orca / Cold Chain parcels still at a station.
--   shipper_sla_warning  parcels older than 0 days (and not yet a breach)
--   shipper_sla_breach   parcels older than 1 day
-- Stored with the Shipper Watch snapshot; the scoring targets below are the Fleet Manager's rule (warning as soon as there is
-- one, breach as soon as there is one) and stay editable in Settings -> SLA Targets. The warning metric has no critical level.
ALTER TABLE shipper_watch
  ADD COLUMN shipper_sla_warning INT NOT NULL DEFAULT 0,
  ADD COLUMN shipper_sla_breach INT NOT NULL DEFAULT 0;

INSERT INTO sla_thresholds (metric_key, scope, scored, direction, warning_at, critical_at) VALUES
  ('shipper_sla_warning', 'nationwide', 1, 'higher-is-worse', 1, 999999),
  ('shipper_sla_breach', 'nationwide', 1, 'higher-is-worse', 1, 1);
