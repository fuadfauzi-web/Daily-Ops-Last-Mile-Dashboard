-- 2026-10-02: Processing Time tab -- one snapshot per station per Malaysia day of the hour-of-day timelines
-- (shipment arrival / scan-in / 1st attempt / success / LH arrival, 24 counts each, stored as one JSON object),
-- same "last refresh of the day wins" pattern as dod_daily. Only the last 7 days are kept.
CREATE TABLE processing_time_daily (
  snap_date    DATE        NOT NULL,
  station_code VARCHAR(40) NOT NULL,
  captured_at  DATETIME    NOT NULL,
  timelines    JSON        NOT NULL,
  PRIMARY KEY (snap_date, station_code)
);
