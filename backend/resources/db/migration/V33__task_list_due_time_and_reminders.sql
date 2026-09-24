-- 2026-09-25 (staging): Task List -- due times and scheduled due-date reminders.
--   due_time            optional time of day (Malaysia time) to go with due_date, e.g. EOD = 19:00.
--   due_reminder_acks   when a user last dismissed ("Got it") the scheduled reminder for one item, so it
--                       stays quiet until the next reminder slot (see tasklist.py: 10am / 2pm / 5pm
--                       for items due within 2 days, once a day at 2pm for later ones).
ALTER TABLE followups ADD COLUMN due_time TIME NULL;
ALTER TABLE assigned_tasks ADD COLUMN due_time TIME NULL;

CREATE TABLE due_reminder_acks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  item_id INT NOT NULL,
  acked_at DATETIME NOT NULL,
  INDEX idx_reminder_acks_user (user_email),
  INDEX idx_reminder_acks_item (kind, item_id)
);
