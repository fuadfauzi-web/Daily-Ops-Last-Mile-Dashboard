-- 2026-09-25: Urgent TN items whose tracking number has no status (not found in the active
-- data) aren't assigned to a PIC and are removed automatically after 3 days. no_status_since
-- is when the dashboard first noticed the TN had no status (NULL while it has one); see
-- _sync_urgent_no_status in main.py.
ALTER TABLE urgent_tn_items ADD COLUMN no_status_since DATETIME NULL;
