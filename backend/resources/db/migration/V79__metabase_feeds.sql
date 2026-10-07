-- 2026-10-08: the Metabase feeder files are pulled by the app through the Metabase API (metabase_pull.py) instead of being downloaded and uploaded by hand. One row per
-- feeder dataset: which Metabase question it reads (NULL = the question the app was built with), WHEN it is pulled (set by the Superadmin on Superadmin -> Documents),
-- and how the last pull went. Rows are created by the app (defaults: every day 06:00 Malaysia time; Lost Declared Tuesday to Sunday).
-- mode: daily | hourly | weekly | monthly | off.  weekdays: ISO weekdays "1,2,3,4,5,6,7" (Monday = 1).  Times are Malaysia time (UTC+8); DATETIME columns are UTC.
CREATE TABLE metabase_feeds (
  dataset          VARCHAR(60)   NOT NULL,
  question_id      INT           NULL,
  mode             VARCHAR(10)   NOT NULL DEFAULT 'daily',
  run_time         VARCHAR(5)    NOT NULL DEFAULT '06:00',
  weekdays         VARCHAR(20)   NOT NULL DEFAULT '1,2,3,4,5,6,7',
  month_day        INT           NOT NULL DEFAULT 1,
  every_hours      INT           NOT NULL DEFAULT 4,
  last_attempt_at  DATETIME      NULL,
  last_ok_at       DATETIME      NULL,
  last_status      VARCHAR(10)   NULL,
  last_message     VARCHAR(500)  NULL,
  last_rows        INT           NULL,
  last_seconds     DOUBLE        NULL,
  last_by          VARCHAR(255)  NULL,
  updated_by       VARCHAR(255)  NULL,
  updated_at       DATETIME      NULL,
  PRIMARY KEY (dataset)
);
