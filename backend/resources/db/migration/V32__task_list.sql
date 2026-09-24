-- 2026-09-25 (staging): Task List -- Email / Gchat follow-ups, To Do List, Task Assigned.
-- (Urgent TN, the fourth sub-tab, lives in urgent_tn_items -- see V27/V30/V31.)
-- All logic is in backend/tasklist.py.

-- Email / Gchat follow-ups: a message the owner wants to chase again, with a due date, and
-- optionally another user (the helper) asked to help reply or remind them.
CREATE TABLE followups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_by VARCHAR(255) NOT NULL,
  channel VARCHAR(16) NOT NULL DEFAULT 'email',
  subject VARCHAR(255) NOT NULL,
  contact VARCHAR(255) NULL,
  link VARCHAR(500) NULL,
  note VARCHAR(1000) NULL,
  due_date DATE NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  helper_email VARCHAR(255) NULL,
  helper_ack_at DATETIME NULL,
  helper_reply VARCHAR(1000) NULL,
  helper_replied_at DATETIME NULL,
  owner_unseen TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  done_at DATETIME NULL,
  INDEX idx_followups_owner (created_by),
  INDEX idx_followups_helper (helper_email)
);

-- To Do List: the user's own tracker -- what to do, due date, progress (0-100) and an optional
-- reminder time.
CREATE TABLE todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  details VARCHAR(1000) NULL,
  due_date DATE NULL,
  progress INT NOT NULL DEFAULT 0,
  remind_at DATETIME NULL,
  remind_ack_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  done_at DATETIME NULL,
  INDEX idx_todos_owner (owner)
);

-- Task Assigned: a task one user gives another; the assignee sets the status and can reply.
CREATE TABLE assigned_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_by VARCHAR(255) NOT NULL,
  assignee_email VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  details VARCHAR(1000) NULL,
  due_date DATE NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  assignee_reply VARCHAR(1000) NULL,
  assignee_replied_at DATETIME NULL,
  assignee_ack_at DATETIME NULL,
  owner_unseen TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  done_at DATETIME NULL,
  INDEX idx_tasks_owner (created_by),
  INDEX idx_tasks_assignee (assignee_email)
);
