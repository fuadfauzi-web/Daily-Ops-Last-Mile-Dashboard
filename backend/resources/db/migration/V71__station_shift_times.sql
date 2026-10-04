-- 2026-10-04: every station runs its own AM / Middle / PM times (an AM can start at 5am in one station and 8am in the next), so each station writes them down once
-- and the Schedule, the Staff clock and the PTWH app's My schedule show that station's hours. One row per station per shift (AM, MD, PM); no row = not written down yet.
CREATE TABLE station_shift_times (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  station     VARCHAR(100)  NOT NULL,
  shift       VARCHAR(6)    NOT NULL,
  start_time  CHAR(5)       NOT NULL,
  end_time    CHAR(5)       NOT NULL,
  updated_by  VARCHAR(255)  NOT NULL,
  updated_at  DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_station_shift (station, shift)
);
