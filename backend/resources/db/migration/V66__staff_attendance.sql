-- 2026-10-04: Attendance -> Staff. Station Heads and Fleet Assistants clock themselves in and out in the dashboard (they are already signed in with their
-- Ninja Van Google account, so there is no separate login). Proof of presence = the phone's location within 100 m of the station's Fleet Admin Premises
-- latitude / longitude (same rule as PTWH). One row per person per day; the time is the server's. A Region Head / RFS / Manager can fix a time with a reason --
-- the original times stay in orig_in / orig_out.
CREATE TABLE staff_attendance (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  email       VARCHAR(255)  NOT NULL,
  name        VARCHAR(255)  NULL,
  position    VARCHAR(40)   NULL,
  station     VARCHAR(100)  NOT NULL,
  work_date   DATE          NOT NULL,
  clock_in    DATETIME      NOT NULL,
  clock_out   DATETIME      NULL,
  in_lat      DOUBLE        NULL,
  in_lng      DOUBLE        NULL,
  in_acc      INT           NULL,
  in_dist     INT           NULL,
  out_lat     DOUBLE        NULL,
  out_lng     DOUBLE        NULL,
  out_acc     INT           NULL,
  out_dist    INT           NULL,
  edited_by   VARCHAR(255)  NULL,
  edited_at   DATETIME      NULL,
  edit_reason VARCHAR(300)  NULL,
  orig_in     DATETIME      NULL,
  orig_out    DATETIME      NULL,
  created_at  DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_person_day (email, work_date),
  KEY idx_staff_station_day (station, work_date)
);
