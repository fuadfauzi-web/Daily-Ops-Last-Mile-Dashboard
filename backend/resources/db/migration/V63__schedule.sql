-- 2026-10-03: Attendance -> Schedule. One roster for the people a station schedules: PTWH, Staff (Station Head / Fleet Assistants) and Hybrid drivers.
--   schedule_entries  one row per person per day: which shift (AM / HD / PM / WK / OFF / AL, see schedule.py). Missing row = nothing scheduled.
--                     person_type 'ptwh' -> person_ref is the ptwh_workers id; 'staff' -> the person's email; 'hybrid' -> the driver's name.
--   schedule_people   the Hybrid drivers a station has put on its schedule. (PTWH and Staff come from the PTWH list and the Staff & Org Chart; the Hybrid driver
--                     list lives in Metabase, so for now drivers are added by name -- they can be linked to that list later.)
-- Only Station Heads, Region Heads, Managers / HOD and the Superadmin may edit; the PTWH app's "My schedule" reads the PTWH rows.
CREATE TABLE schedule_entries (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  station     VARCHAR(100)  NOT NULL,
  person_type VARCHAR(10)   NOT NULL,
  person_ref  VARCHAR(255)  NOT NULL,
  work_date   DATE          NOT NULL,
  shift       VARCHAR(6)    NOT NULL,
  updated_by  VARCHAR(255)  NOT NULL,
  updated_at  DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedule_person_day (person_type, person_ref, work_date),
  KEY idx_schedule_station_day (station, work_date)
);

CREATE TABLE schedule_people (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  station     VARCHAR(100)  NOT NULL,
  person_type VARCHAR(10)   NOT NULL,
  person_ref  VARCHAR(255)  NOT NULL,
  added_by    VARCHAR(255)  NOT NULL,
  added_at    DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedule_person (station, person_type, person_ref)
);
