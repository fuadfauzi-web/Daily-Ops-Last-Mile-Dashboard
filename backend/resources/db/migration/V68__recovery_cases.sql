-- 2026-10-03: Recovery -> PDCNR, Damage, No Label from Hub. Three of the recovery team's Google Sheets moved into the app, one
-- table for all three (case_type). The columns each sheet has are kept as JSON in `data` (the field list lives in
-- backend/recovery_cases.py), so a new column in a sheet is a code change, not a migration.
CREATE TABLE recovery_cases (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  case_type       VARCHAR(20)  NOT NULL,
  tracking_number VARCHAR(80)  NOT NULL,
  station_code    VARCHAR(40)  NOT NULL,
  case_date       DATE         NOT NULL,
  data            JSON         NULL,
  created_by      VARCHAR(255) NULL,
  created_at      DATETIME     NOT NULL,
  updated_by      VARCHAR(255) NULL,
  updated_at      DATETIME     NULL,
  closed_at       DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_recovery_cases_type_date (case_type, case_date),
  KEY idx_recovery_cases_type_tn (case_type, tracking_number)
);
