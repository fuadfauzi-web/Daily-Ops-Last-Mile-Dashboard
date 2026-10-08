-- 2026-10-08: Aging buckets changed to 0, 1, 2, 3, 4-5, 6-7, 8+ (were 0, 1, 2, 3, 4-6, 7+). Only the latest snapshot is
-- ever read, and the next refresh rewrites it, so the old rows' meaning (4-6 / 7+) only lingers until then.
ALTER TABLE aging_details
  CHANGE COLUMN age_4_6 age_4_5 INT NOT NULL DEFAULT 0,
  ADD COLUMN age_6_7 INT NOT NULL DEFAULT 0 AFTER age_4_5,
  CHANGE COLUMN age_7_plus age_8_plus INT NOT NULL DEFAULT 0;
-- 2026-10-08: Station Health -- Total Route is split into Total Route / Total OPS Route (an OPS route with fewer than 5 successes is
-- invalid), the invalid parcels' attempts are counted as Invalid OPS Attempt and added to In Hub, and Route Monitoring's Productivity
-- joins Station Health. The new numbers are stored next to the other Station Health columns, in the live snapshot and in DoD's daily copy.
ALTER TABLE station_metrics
  ADD COLUMN total_ops_route INT NOT NULL DEFAULT 0,
  ADD COLUMN invalid_ops_attempt INT NOT NULL DEFAULT 0,
  ADD COLUMN productivity DOUBLE NOT NULL DEFAULT 0;

ALTER TABLE dod_daily
  ADD COLUMN total_ops_route DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN invalid_ops_attempt DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN productivity DOUBLE NOT NULL DEFAULT 0;
