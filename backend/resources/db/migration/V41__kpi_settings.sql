-- 2026-09-26: KPI settings an admin switches (Admin -> KPI Settings), for now "include East Malaysia in the KPI pages" (default off).
-- Only a difference from the built-in default (backend/kpi_targets.py) is stored; no row = the default.
CREATE TABLE kpi_settings (
  setting_key VARCHAR(60) NOT NULL,
  setting_value VARCHAR(100) NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  changed_at DATETIME NOT NULL,
  PRIMARY KEY (setting_key)
) DEFAULT CHARSET=utf8mb4;
