-- 2026-09-26: Recovery -> Active Missing / Lost Declared This Week / Lost Declared Summary (the team's "Active Missing Southern" sheet, moved into the app).

-- What a station wrote about an active missing tracking number (the sheet's "Update Here!!!" columns G-M). The TN list itself is the live open-missing query;
-- a row here is deleted by the refresh once its TN has been off that list for 30 minutes (settled), even if nobody updated it.
CREATE TABLE active_missing_updates (
  tracking_number VARCHAR(80) NOT NULL,
  ticket_updated VARCHAR(20) NULL,
  parcel_found VARCHAR(30) NULL,
  contacted_customer VARCHAR(30) NULL,
  customer_received VARCHAR(30) NULL,
  liable_party VARCHAR(30) NULL,
  remarks TEXT NULL,
  checked_by VARCHAR(160) NULL,
  updated_by VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL,
  absent_since DATETIME NULL,
  PRIMARY KEY (tracking_number)
) DEFAULT CHARSET=utf8mb4;

-- Lost declared tickets: "week" = the sheet's Lost Declared This Week (loaded from the Metabase question "This Week Lost Declared" by an admin upload),
-- "summary" = Lost Declared Summary (moved there every Monday 10pm, kept for good). The feedback columns (customer_received ... checked_by) are the sheet's
-- columns K-O and go along when a row moves.
CREATE TABLE lost_declared (
  tracking_number VARCHAR(80) NOT NULL,
  status VARCHAR(10) NOT NULL,
  hub_code VARCHAR(60) NULL,
  outcome VARCHAR(80) NULL,
  ticket_type VARCHAR(40) NULL,
  last_scan_user VARCHAR(200) NULL,
  last_scan_type VARCHAR(100) NULL,
  dest_zone VARCHAR(100) NULL,
  cod_value VARCHAR(40) NULL,
  ticket_notes TEXT NULL,
  items TEXT NULL,
  delivery_instructions TEXT NULL,
  resolution_at VARCHAR(50) NULL,
  resolution_date DATE NULL,
  days_to_resolution INT NULL,
  week_no INT NULL,
  week_year INT NULL,
  customer_received VARCHAR(30) NULL,
  liable_party VARCHAR(30) NULL,
  remarks TEXT NULL,
  driver_name VARCHAR(200) NULL,
  checked_by VARCHAR(160) NULL,
  updated_by VARCHAR(255) NULL,
  updated_at DATETIME NULL,
  added_at DATETIME NOT NULL,
  moved_at DATETIME NULL,
  PRIMARY KEY (tracking_number),
  KEY idx_lost_declared_status (status)
) DEFAULT CHARSET=utf8mb4;

-- When the weekly move last ran (so a restart or a second replica never moves twice).
CREATE TABLE recovery_jobs (
  job_key VARCHAR(40) NOT NULL,
  last_period VARCHAR(20) NOT NULL,
  last_run_at DATETIME NOT NULL,
  detail VARCHAR(300) NULL,
  PRIMARY KEY (job_key)
) DEFAULT CHARSET=utf8mb4;
