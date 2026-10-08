-- 2026-10-09: Invalid POD store (pod_store.py). The POD validation history is kept in the app's own tables, filled by a daily 7-day Metabase pull (+ a one-time backfill),
-- instead of one big uploaded file. Day detail is kept for the current + previous month; older days are rolled up into pod_roll (weekly / monthly counts per driver).
CREATE TABLE pod_day (
  day      DATE          NOT NULL,
  hub      VARCHAR(32)   NOT NULL,
  courier  VARCHAR(100)  NOT NULL,
  result   CHAR(1)       NOT NULL,           -- F = invalid POD (FAILURE), S = valid (SUCCESS)
  reason   VARCHAR(100)  NOT NULL DEFAULT '',  -- the invalid reason (F rows); empty for S
  n        INT           NOT NULL,
  PRIMARY KEY (day, hub, courier, result, reason)
);

CREATE TABLE pod_tn (
  id             BIGINT        NOT NULL AUTO_INCREMENT,
  day            DATE          NOT NULL,
  hub            VARCHAR(32)   NOT NULL,
  courier        VARCHAR(100)  NOT NULL,
  tracking_id    VARCHAR(40)   NOT NULL,
  failure_reason VARCHAR(200)  NULL,
  reason         VARCHAR(100)  NOT NULL,
  attempted      VARCHAR(40)   NULL,
  validated      VARCHAR(40)   NULL,
  validator      VARCHAR(120)  NULL,
  PRIMARY KEY (id),
  KEY idx_pod_tn_day (day, hub)
);

CREATE TABLE pod_roll (
  grain    CHAR(1)       NOT NULL,           -- W = week (Monday), M = month (first day)
  period   DATE          NOT NULL,
  hub      VARCHAR(32)   NOT NULL,
  courier  VARCHAR(100)  NOT NULL,
  result   CHAR(1)       NOT NULL,
  n        INT           NOT NULL,
  PRIMARY KEY (grain, period, hub, courier, result)
);

CREATE TABLE pod_ingest_log (
  dataset      VARCHAR(60)  NOT NULL,
  ingested_at  DATETIME     NOT NULL,
  rows_in      INT          NOT NULL DEFAULT 0,
  day_from     DATE         NULL,
  day_to       DATE         NULL,
  PRIMARY KEY (dataset)
);
