-- 2026-10-08: Launch Timeline -- when a station reaches its launch date, whatever was keyed during the test run (dated before the launch date) is cleared ONCE (attendance_launch.py,
-- clear_test_entries). This table is only the "already cleared" marker, so moving a launch date later afterwards can never delete real attendance. No data is inserted here.
CREATE TABLE attendance_launch_cleared (
  station       VARCHAR(100)  NOT NULL,
  launch_date   DATE          NOT NULL,
  cleared_at    DATETIME      NOT NULL,
  rows_removed  INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (station)
);
