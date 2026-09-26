-- 2026-09-26: KPI targets per region, editable by an admin (Admin -> KPI Targets). Only the differences from the built-in defaults
-- (backend/kpi_targets.py) are stored; a cell with no row follows the default.
CREATE TABLE kpi_targets (
  kpi VARCHAR(30) NOT NULL,
  region VARCHAR(40) NOT NULL,
  target DECIMAL(9,4) NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  changed_at DATETIME NOT NULL,
  PRIMARY KEY (kpi, region)
) DEFAULT CHARSET=utf8mb4;
