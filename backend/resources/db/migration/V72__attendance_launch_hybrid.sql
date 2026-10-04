-- 2026-10-04: three Attendance additions.
--
-- 1) Launch Timeline: the Attendance build goes live BY BATCH, on a date set per region / zone / station by a Superadmin / HOD / Manager (Settings -> Launch Timeline).
--    A station with no date (its own, its zone's or its region's) cannot see Attendance at all; from the day BEFORE its launch date the station can see it and test-run it.
--    The most specific rule wins: station > zone > region.
CREATE TABLE attendance_launch (
  id           BIGINT        NOT NULL AUTO_INCREMENT,
  scope_type   VARCHAR(10)   NOT NULL,
  scope_value  VARCHAR(100)  NOT NULL,
  launch_date  DATE          NOT NULL,
  set_by       VARCHAR(255)  NOT NULL,
  set_at       DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_launch (scope_type, scope_value)
);

-- 2) PTWH half day now starts at a chosen shift (Half day AM / Middle / PM) -- the old single "HD" becomes Half day AM.
UPDATE schedule_entries SET shift = 'HAM' WHERE shift = 'HD';

-- 3) Hybrid, manual first: station staff key in the Hybrid drivers' details and their attendance until the driver-app sign-in exists.
--    hybrid_drivers      one row per driver at a station (the Schedule's Hybrid roster reads this; schedule_entries refer to the driver by NAME).
--    hybrid_attendance   one row per driver per day: Present / Absent / Leave, optional clock in / out times, who keyed it.
CREATE TABLE hybrid_drivers (
  id            BIGINT        NOT NULL AUTO_INCREMENT,
  station       VARCHAR(100)  NOT NULL,
  name          VARCHAR(150)  NOT NULL,
  driver_id     VARCHAR(60)   NULL,
  phone         VARCHAR(30)   NULL,
  vehicle_type  VARCHAR(40)   NULL,
  vehicle_plate VARCHAR(30)   NULL,
  joined_date   DATE          NULL,
  end_date      DATE          NULL,
  active        TINYINT(1)    NOT NULL DEFAULT 1,
  notes         VARCHAR(300)  NULL,
  created_by    VARCHAR(255)  NOT NULL,
  created_at    DATETIME      NOT NULL,
  updated_at    DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hybrid_station_name (station, name),
  KEY idx_hybrid_station (station, active)
);

-- (data statement left out of the production release: it loads staging people / test data)

CREATE TABLE hybrid_attendance (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  driver_id   BIGINT        NOT NULL,
  work_date   DATE          NOT NULL,
  status      VARCHAR(10)   NOT NULL,
  clock_in    DATETIME      NULL,
  clock_out   DATETIME      NULL,
  note        VARCHAR(300)  NULL,
  recorded_by VARCHAR(255)  NOT NULL,
  recorded_at DATETIME      NOT NULL,
  edited_by   VARCHAR(255)  NULL,
  edited_at   DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hybrid_driver_day (driver_id, work_date),
  KEY idx_hybrid_day (work_date)
);
