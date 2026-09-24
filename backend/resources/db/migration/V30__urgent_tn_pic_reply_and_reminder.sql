-- 2026-09-25: Urgent TN PIC workflow.
--   pic_reply / pic_replied_at : what the PIC typed back to the owner.
--   assignee_ack_at            : when the PIC last picked "In progress" -- silences the
--                                PIC's bell for 1 hour (it returns if still not closed).
--   owner_unseen               : 1 while the owner hasn't opened the tab since the PIC
--                                last replied / changed the status.
ALTER TABLE urgent_tn_items
  ADD COLUMN pic_reply VARCHAR(1000) NULL,
  ADD COLUMN pic_replied_at DATETIME NULL,
  ADD COLUMN assignee_ack_at DATETIME NULL,
  ADD COLUMN owner_unseen TINYINT NOT NULL DEFAULT 0;
