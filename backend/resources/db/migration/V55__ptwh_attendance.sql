-- 2026-10-02: Attendance tab, PTWH (part-time warehouse) first. Replaces the PTWH ATTENDANCE Google Sheet that station staff key in by hand
-- (one value per person per day, then payable). Here a day is a CLOCK IN and CLOCK OUT time and the pay is worked out from the hours.
--   ptwh_workers     the PTWH roster (the sheet's "PTWH DETAILS" tab): who, which station, daily rate. Deactivated, never deleted.
--   ptwh_attendance  one row per worker per day. source = 'station' while station staff clock people in / out for them (now),
--                    'app' once the PTWH's own app writes the clock times itself (later). Bank details are not kept here yet.
CREATE TABLE ptwh_workers (
  id           BIGINT        NOT NULL AUTO_INCREMENT,
  full_name    VARCHAR(150)  NOT NULL,
  ic_no        VARCHAR(20)   NULL,
  phone        VARCHAR(30)   NULL,
  station      VARCHAR(100)  NOT NULL,
  daily_rate   DECIMAL(8,2)  NOT NULL DEFAULT 50.00,
  joined_date  DATE          NULL,
  active       TINYINT       NOT NULL DEFAULT 1,
  created_by   VARCHAR(255)  NOT NULL,
  created_at   DATETIME      NOT NULL,
  updated_at   DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_ptwh_workers_station (station)
);

CREATE TABLE ptwh_attendance (
  id           BIGINT        NOT NULL AUTO_INCREMENT,
  worker_id    BIGINT        NOT NULL,
  work_date    DATE          NOT NULL,
  clock_in     DATETIME      NOT NULL,
  clock_out    DATETIME      NULL,
  reason       VARCHAR(100)  NULL,
  source       VARCHAR(10)   NOT NULL DEFAULT 'station',
  note         VARCHAR(200)  NULL,
  recorded_by  VARCHAR(255)  NOT NULL,
  created_at   DATETIME      NOT NULL,
  edited_by    VARCHAR(255)  NULL,
  edited_at    DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ptwh_attendance_day (worker_id, work_date)
);
