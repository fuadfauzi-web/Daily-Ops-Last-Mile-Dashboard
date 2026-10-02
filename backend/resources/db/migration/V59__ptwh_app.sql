-- 2026-10-03: the PTWH app (a separate small app) clocks PTWH in / out through this dashboard's API. What it needs stored here:
--   ptwh_credentials  a login per PTWH (username + password the STATION first sets, which the PTWH can change; a hashed recovery code for
--                     "forgot password"). Passwords and recovery codes are stored hashed only.
--   ptwh_station_geo  where each station is (lat / lng) and how close a PTWH must be to clock in by location (default 50 m).
--   ptwh_attendance   proof of each app clock event: how it was verified (qr = the station's hourly QR, geo = within the radius), where the phone
--                     was and how far from the station, and the selfie (an object-storage key; the photo itself is in the bucket) -- for audit.
CREATE TABLE ptwh_credentials (
  worker_id       BIGINT        NOT NULL,
  username        VARCHAR(40)   NOT NULL,
  password_hash   VARCHAR(200)  NOT NULL,
  recovery_hash   VARCHAR(200)  NOT NULL,
  cred_version    INT           NOT NULL DEFAULT 1,
  password_set_by VARCHAR(10)   NOT NULL DEFAULT 'station',
  failed_attempts INT           NOT NULL DEFAULT 0,
  locked_until    DATETIME      NULL,
  last_login_at   DATETIME      NULL,
  disabled        TINYINT       NOT NULL DEFAULT 0,
  created_by      VARCHAR(255)  NOT NULL,
  created_at      DATETIME      NOT NULL,
  updated_at      DATETIME      NULL,
  PRIMARY KEY (worker_id),
  UNIQUE KEY uq_ptwh_username (username)
);

CREATE TABLE ptwh_station_geo (
  station     VARCHAR(100)  NOT NULL,
  lat         DECIMAL(9,6)  NOT NULL,
  lng         DECIMAL(9,6)  NOT NULL,
  radius_m    INT           NOT NULL DEFAULT 50,
  updated_by  VARCHAR(255)  NOT NULL,
  updated_at  DATETIME      NOT NULL,
  PRIMARY KEY (station)
);

ALTER TABLE ptwh_attendance ADD COLUMN in_method VARCHAR(8) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN in_lat DECIMAL(9,6) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN in_lng DECIMAL(9,6) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN in_acc INT NULL;
ALTER TABLE ptwh_attendance ADD COLUMN in_dist INT NULL;
ALTER TABLE ptwh_attendance ADD COLUMN in_selfie VARCHAR(200) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN out_method VARCHAR(8) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN out_lat DECIMAL(9,6) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN out_lng DECIMAL(9,6) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN out_acc INT NULL;
ALTER TABLE ptwh_attendance ADD COLUMN out_dist INT NULL;
ALTER TABLE ptwh_attendance ADD COLUMN out_selfie VARCHAR(200) NULL;
