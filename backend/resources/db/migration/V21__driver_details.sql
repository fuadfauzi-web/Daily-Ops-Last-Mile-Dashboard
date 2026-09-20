-- Settings -> Documents: driver/rider list details, uploaded as a CSV export
-- (see POST /api/admin/driver-details/upload in main.py). Whole table is
-- replaced on each upload -- the source is a full daily/ad-hoc export, not an
-- incremental feed. display_name matches the "<station> - <position> - <name>"
-- convention used throughout Routed View (aggregate.py's _parse_driver), so the
-- Tenure join is an exact string match, no fuzzy matching needed.
CREATE TABLE driver_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id VARCHAR(64) NULL,
  display_name VARCHAR(255) NOT NULL,
  hub_name VARCHAR(255) NULL,
  hub_region VARCHAR(255) NULL,
  zone VARCHAR(255) NULL,
  driver_type VARCHAR(255) NULL,
  employment_start_date DATE NULL,
  employment_end_date DATE NULL,
  INDEX idx_display_name (display_name)
);

CREATE TABLE driver_details_upload_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uploaded_by VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  row_count INT NOT NULL,
  uploaded_at DATETIME NOT NULL
);
