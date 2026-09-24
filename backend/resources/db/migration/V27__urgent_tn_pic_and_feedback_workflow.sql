-- 2026-09-25 (staging): Urgent TN PIC assignment + Feedback workflow.
--
-- urgent_tn_items: the Urgent TN tab's tracked list moves from per-browser
-- localStorage to the database so a tracking number can be assigned to a PIC
-- (another user, by email -- validated against `users` in main.py) with an
-- in-progress / closed workflow. A row is visible to its creator and to its
-- assignee. Deleting a user removes the items they created and clears them as
-- assignee elsewhere (see delete_user in main.py).
CREATE TABLE urgent_tn_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_number VARCHAR(64) NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  assignee_email VARCHAR(255) NULL,
  note VARCHAR(500) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'in_progress',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  closed_by VARCHAR(255) NULL,
  assignee_seen_at DATETIME NULL,
  INDEX idx_urgent_created_by (created_by),
  INDEX idx_urgent_assignee (assignee_email),
  INDEX idx_urgent_tn (tracking_number)
);

-- app_feedback: optional attachment (kept in the row -- images/PDF up to 2 MB,
-- and the row is deleted a week after it's closed), an admin reply, and an
-- open/closed status. reply_unread = 1 while the sender hasn't yet opened the
-- feedback list since the admin last replied (drives the header bell).
ALTER TABLE app_feedback
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'open',
  ADD COLUMN reply TEXT NULL,
  ADD COLUMN replied_by VARCHAR(255) NULL,
  ADD COLUMN replied_at DATETIME NULL,
  ADD COLUMN closed_at DATETIME NULL,
  ADD COLUMN reply_unread TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN attachment_name VARCHAR(255) NULL,
  ADD COLUMN attachment_type VARCHAR(100) NULL,
  ADD COLUMN attachment_data MEDIUMBLOB NULL;
