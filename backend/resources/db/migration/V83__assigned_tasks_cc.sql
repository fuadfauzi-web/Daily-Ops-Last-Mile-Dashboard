-- 2026-10-08 (Activity tab): Task Assigned can CC other people, like an email -- the assignee does the task, the people in CC are told about it
-- and can see it. A JSON list of emails.
ALTER TABLE assigned_tasks ADD COLUMN cc_emails VARCHAR(2000) NULL AFTER assignee_email;
