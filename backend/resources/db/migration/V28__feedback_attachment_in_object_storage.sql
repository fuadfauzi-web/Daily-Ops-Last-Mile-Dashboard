-- 2026-09-25 (staging): feedback attachments go up to 20 MB, which is too big to keep
-- in a database row (V27 stored them in attachment_data). They now live in object
-- storage (see storage.py / substrait.yaml's `object-storage`) and the row keeps
-- only the object key. V27's column was never populated in production, so it is
-- simply replaced.
ALTER TABLE app_feedback
  ADD COLUMN attachment_key VARCHAR(255) NULL,
  DROP COLUMN attachment_data;
