-- SLA thresholds for Station Health's scored metrics, editable from Admin ->
-- SLA Targets instead of hardcoded, per-metric rank-based severity. One row
-- per (metric_key, scope): scope is either the literal 'nationwide' or a
-- region name (a region row overrides the nationwide default for that
-- region; absent = falls back to nationwide).
CREATE TABLE sla_thresholds (
  metric_key VARCHAR(64) NOT NULL,
  scope VARCHAR(64) NOT NULL DEFAULT 'nationwide',
  scored TINYINT(1) NOT NULL DEFAULT 0,
  direction VARCHAR(24) NOT NULL DEFAULT 'higher-is-worse',
  warning_at DOUBLE NOT NULL DEFAULT 0,
  critical_at DOUBLE NOT NULL DEFAULT 0,
  changed_by VARCHAR(255) NULL,
  changed_at DATETIME NULL,
  PRIMARY KEY (metric_key, scope)
);

-- Seed the nationwide defaults for every Station Health column. Reference
-- metrics (volume/context, not performance) are scored=0 and never coloured.
-- Scored metrics start at warning_at=critical_at=0 ("TO BE SUPPLIED") --
-- rendered plain until an admin fills in real numbers via the SLA Targets
-- screen, rather than flagging everything critical against an unset 0.
INSERT INTO sla_thresholds (metric_key, scope, scored, direction, warning_at, critical_at) VALUES
  ('total_fresh', 'nationwide', 0, 'higher-is-worse', 0, 0),
  ('total_routed', 'nationwide', 0, 'higher-is-worse', 0, 0),
  ('attendance', 'nationwide', 0, 'higher-is-worse', 0, 0),
  ('total_in_hub', 'nationwide', 0, 'higher-is-worse', 0, 0),
  ('still_ovfd', 'nationwide', 0, 'higher-is-worse', 0, 0),
  ('cod_pct_hub', 'nationwide', 0, 'higher-is-worse', 0, 0),
  ('zero_attempt', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('zero_attempt_gt_d0', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('age_gt3', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('on_hold', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('reschedule', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('prior_d0', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('prior_gt_d0', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('unsweep_document', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('unsweep_parcel', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('missing_hub', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('missing_ship_in', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('pending_ats_zero_attempt', 'nationwide', 1, 'higher-is-worse', 0, 0),
  ('pending_ats_attempted', 'nationwide', 1, 'higher-is-worse', 0, 0);
