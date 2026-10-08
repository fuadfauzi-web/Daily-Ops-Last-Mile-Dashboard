-- 2026-10-08 (Activity tab): CC on Urgent TN and Email / Gchat, like Task Assigned's (V83) -- the people in CC are told about the item and can see it
-- (view only). Stored as ',a@x,b@y,' so one address can be matched with LIKE '%,me,%'.
ALTER TABLE urgent_tn_items ADD COLUMN cc_emails VARCHAR(2000) NULL;
ALTER TABLE followups ADD COLUMN cc_emails VARCHAR(2000) NULL;
