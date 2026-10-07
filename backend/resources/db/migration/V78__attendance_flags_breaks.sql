-- 2026-10-08: Attendance flags + break times.
--  * attendance_flag_actions: a Region Head / RFS / Manager marks a flag as handled (with a note) -- e.g. staff A was scheduled AM, never clocked in, and this is what was done.
--    The flags themselves are worked out live from the Schedule, the station's shift hours and the clock records, so nothing else is stored.
--  * station_shift_times: each shift can carry its own break window.
CREATE TABLE attendance_flag_actions (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  person_type VARCHAR(10)   NOT NULL,
  person_ref  VARCHAR(255)  NOT NULL,
  work_date   DATE          NOT NULL,
  kind        VARCHAR(20)   NOT NULL,
  note        VARCHAR(300)  NOT NULL,
  acted_by    VARCHAR(255)  NOT NULL,
  acted_at    DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_flag_action (person_type, person_ref, work_date, kind)
);

ALTER TABLE station_shift_times ADD COLUMN break_start CHAR(5) NULL;
ALTER TABLE station_shift_times ADD COLUMN break_end CHAR(5) NULL;
