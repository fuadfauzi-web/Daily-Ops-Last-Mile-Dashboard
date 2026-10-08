-- 2026-10-09: Feedback becomes a conversation (feedback.py). app_feedback stays the CASE (who, status, unread flags); every message of the thread is a row of feedback_messages.
-- Old feedback is kept: its first message and its (single) Superadmin reply are copied into the thread, so the old cases open as a normal two-message conversation. The old columns
-- (message, reply, replied_by, replied_at, attachment_*) are left in place and are no longer written (message still holds the first message).
CREATE TABLE feedback_messages (
  id               BIGINT        NOT NULL AUTO_INCREMENT,
  feedback_id      INT           NOT NULL,
  sender_email     VARCHAR(255)  NOT NULL,
  sender_role      VARCHAR(16)   NOT NULL,   -- 'user' | 'admin'
  message          TEXT          NOT NULL,
  attachment_key   VARCHAR(500)  NULL,
  attachment_name  VARCHAR(255)  NULL,
  attachment_type  VARCHAR(100)  NULL,
  created_at       DATETIME      NOT NULL,
  PRIMARY KEY (id),
  KEY idx_feedback_messages_case (feedback_id, id)
);

ALTER TABLE app_feedback
  ADD COLUMN last_message_at DATETIME NULL,
  ADD COLUMN admin_unread TINYINT NOT NULL DEFAULT 0;  -- 1 while the Superadmin has not opened a new message from the sender

-- the sender's first message (with its attachment, if any)
INSERT INTO feedback_messages (feedback_id, sender_email, sender_role, message, attachment_key, attachment_name, attachment_type, created_at)
SELECT id, email, 'user', message, attachment_key, attachment_name, attachment_type, created_at FROM app_feedback;

-- the Superadmin's reply, if there was one
INSERT INTO feedback_messages (feedback_id, sender_email, sender_role, message, attachment_key, attachment_name, attachment_type, created_at)
SELECT id, COALESCE(replied_by, 'admin'), 'admin', reply, NULL, NULL, NULL, COALESCE(replied_at, created_at) FROM app_feedback WHERE reply IS NOT NULL;

UPDATE app_feedback SET last_message_at = COALESCE(replied_at, created_at);
