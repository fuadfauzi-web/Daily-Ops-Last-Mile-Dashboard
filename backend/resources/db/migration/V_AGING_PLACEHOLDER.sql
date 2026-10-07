-- 2026-10-08: Aging buckets changed to 0, 1, 2, 3, 4-5, 6-7, 8+ (were 0, 1, 2, 3, 4-6, 7+). Only the latest snapshot is
-- ever read, and the next refresh rewrites it, so the old rows' meaning (4-6 / 7+) only lingers until then.
ALTER TABLE aging_details
  CHANGE COLUMN age_4_6 age_4_5 INT NOT NULL DEFAULT 0,
  ADD COLUMN age_6_7 INT NOT NULL DEFAULT 0 AFTER age_4_5,
  CHANGE COLUMN age_7_plus age_8_plus INT NOT NULL DEFAULT 0;
