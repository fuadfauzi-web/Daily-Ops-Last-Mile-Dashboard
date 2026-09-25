-- 2026-09-26 (staging): DoD Dashboard -- one Station Health snapshot per station per Malaysia day.
-- Every refresh replaces today's rows, so the last refresh of the day is what stays; the app deletes anything older than
-- the Monday of last week (only the current week + last week are kept). All numbers are the same metrics Station Health
-- shows, plus the routed-view extras the daily view needs (rescue attendance, current OVFD, current success).
CREATE TABLE dod_daily (
  snap_date DATE NOT NULL,
  station_code VARCHAR(20) NOT NULL,
  captured_at DATETIME NOT NULL,
  total_in_hub DOUBLE NOT NULL DEFAULT 0,
  zero_attempt_total DOUBLE NOT NULL DEFAULT 0,
  zero_attempt DOUBLE NOT NULL DEFAULT 0,
  zero_attempt_gt_d0 DOUBLE NOT NULL DEFAULT 0,
  on_hold DOUBLE NOT NULL DEFAULT 0,
  pending_ats_zero_attempt DOUBLE NOT NULL DEFAULT 0,
  pending_ats_attempted DOUBLE NOT NULL DEFAULT 0,
  missing_open DOUBLE NOT NULL DEFAULT 0,
  missing_hub DOUBLE NOT NULL DEFAULT 0,
  missing_driver_rider DOUBLE NOT NULL DEFAULT 0,
  missing_ship_in DOUBLE NOT NULL DEFAULT 0,
  total_fresh DOUBLE NOT NULL DEFAULT 0,
  age_gt3 DOUBLE NOT NULL DEFAULT 0,
  reschedule DOUBLE NOT NULL DEFAULT 0,
  still_ovfd DOUBLE NOT NULL DEFAULT 0,
  prior_d0 DOUBLE NOT NULL DEFAULT 0,
  prior_gt_d0 DOUBLE NOT NULL DEFAULT 0,
  unsweep_document DOUBLE NOT NULL DEFAULT 0,
  unsweep_parcel DOUBLE NOT NULL DEFAULT 0,
  cod_pct_hub DOUBLE NOT NULL DEFAULT 0,
  total_routed DOUBLE NOT NULL DEFAULT 0,
  routed_pct DOUBLE NOT NULL DEFAULT 0,
  attendance DOUBLE NOT NULL DEFAULT 0,
  cod_pct_routed DOUBLE NOT NULL DEFAULT 0,
  attendance_rescue DOUBLE NOT NULL DEFAULT 0,
  current_ovfd DOUBLE NOT NULL DEFAULT 0,
  current_success DOUBLE NOT NULL DEFAULT 0,
  PRIMARY KEY (snap_date, station_code),
  KEY idx_dod_date (snap_date)
) DEFAULT CHARSET=utf8mb4;
