-- 2026-10-03: auditing the PTWH app's clock events.
--   flag_*          an auditor (anyone whose scope covers the station) can FLAG a clock event as suspicious, with a note, or mark it checked OK.
--   selfie_purged   selfies are kept for 14 days only (personal photos, kept for audit); after that the photo is deleted from storage and this is set,
--                   so the Audit page can say "photo deleted" instead of "no photo". A FLAGGED event keeps its photos until it is cleared or marked OK.
ALTER TABLE ptwh_attendance ADD COLUMN flag_status VARCHAR(8) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN flag_note VARCHAR(300) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN flagged_by VARCHAR(255) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN flagged_at DATETIME NULL;
ALTER TABLE ptwh_attendance ADD COLUMN selfie_purged TINYINT NOT NULL DEFAULT 0;
