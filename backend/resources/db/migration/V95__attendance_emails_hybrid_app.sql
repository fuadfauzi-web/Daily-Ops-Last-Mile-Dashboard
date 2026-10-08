-- 2026-10-10: Ninjavan Shift for PTWH + Hybrid.
--  * email on PTWH workers and Hybrid drivers: the people the user whitelists for the Ninjavan Shift app (Attendance -> Emails lists them to copy).
--  * hybrid_credentials: a Hybrid driver's app login (same shape as ptwh_credentials: username, scrypt hashes, recovery code, lockout).
--  * hybrid_attendance: the clock-in proof when a driver clocks in with the app (source, phone location, distance, selfie key). A driver has no clock-out in the app --
--    their day ends with route data (built later).
ALTER TABLE ptwh_workers ADD COLUMN email VARCHAR(255) NULL;
ALTER TABLE hybrid_drivers ADD COLUMN email VARCHAR(255) NULL;

CREATE TABLE hybrid_credentials (
  driver_id       BIGINT        NOT NULL,
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
  PRIMARY KEY (driver_id),
  UNIQUE KEY uq_hybrid_username (username)
);

ALTER TABLE hybrid_attendance ADD COLUMN source VARCHAR(10) NULL;
ALTER TABLE hybrid_attendance ADD COLUMN in_lat DOUBLE NULL;
ALTER TABLE hybrid_attendance ADD COLUMN in_lng DOUBLE NULL;
ALTER TABLE hybrid_attendance ADD COLUMN in_acc INT NULL;
ALTER TABLE hybrid_attendance ADD COLUMN in_dist INT NULL;
ALTER TABLE hybrid_attendance ADD COLUMN in_selfie VARCHAR(300) NULL;
