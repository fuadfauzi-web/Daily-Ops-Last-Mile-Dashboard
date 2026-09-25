-- 2026-09-25: Urgent TN -- the owner can re-send a note and reply back to the PIC's reply.
--   note_sent_at                  when the note was last (re)sent -- shown under the note.
--   owner_reply / owner_replied_at  what the owner typed back to the PIC.
ALTER TABLE urgent_tn_items
  ADD COLUMN note_sent_at DATETIME NULL,
  ADD COLUMN owner_reply VARCHAR(1000) NULL,
  ADD COLUMN owner_replied_at DATETIME NULL;
