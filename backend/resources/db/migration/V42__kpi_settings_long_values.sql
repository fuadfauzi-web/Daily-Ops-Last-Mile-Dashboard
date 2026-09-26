-- 2026-09-26: kpi_settings also holds the published CSV link of the Region List sheet (a Google "publish to the web" link is longer than the 100 characters the
-- East Malaysia switch needed).
ALTER TABLE kpi_settings MODIFY setting_value VARCHAR(600) NOT NULL;
