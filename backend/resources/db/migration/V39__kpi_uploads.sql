-- 2026-09-26 (staging): KPI Dashboard data uploads -- one current file per dataset (the file itself is in object storage).
CREATE TABLE kpi_uploads (
  dataset VARCHAR(40) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  row_count INT NOT NULL DEFAULT 0,
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_at DATETIME NOT NULL,
  PRIMARY KEY (dataset)
) DEFAULT CHARSET=utf8mb4;
