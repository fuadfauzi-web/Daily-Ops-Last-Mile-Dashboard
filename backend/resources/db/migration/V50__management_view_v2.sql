-- 2026-10-02 (staging): Management View v2.
-- dod_daily keeps the Hybrid/Independent attendance split per station per day (Operation Health's attendance view
-- needs it for past days; history starts the day this ships -- earlier days stay 0 and show as "n/a").
ALTER TABLE dod_daily ADD COLUMN attendance_hd DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE dod_daily ADD COLUMN attendance_hr DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE dod_daily ADD COLUMN attendance_id DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE dod_daily ADD COLUMN attendance_ir DOUBLE NOT NULL DEFAULT 0;

-- Backlog mitigation tracking (status / owner / target date) and a manager-typed parcel capacity per station.
ALTER TABLE station_notes ADD COLUMN plan_status VARCHAR(20) NULL;
ALTER TABLE station_notes ADD COLUMN plan_owner VARCHAR(100) NULL;
ALTER TABLE station_notes ADD COLUMN plan_target_date DATE NULL;
ALTER TABLE station_notes ADD COLUMN parcel_capacity INT NULL;

-- Small key/value store for Management View settings (parcels per sqft, ...).
CREATE TABLE management_settings (
  setting_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
  setting_value VARCHAR(100) NULL,
  updated_by    VARCHAR(255) NULL,
  updated_at    DATETIME     NULL
);
