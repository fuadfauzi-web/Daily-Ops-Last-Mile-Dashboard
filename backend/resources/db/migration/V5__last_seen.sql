-- Tracks when each provisioned user last opened the dashboard, for the admin panel's
-- "who's actually using this" visibility.
ALTER TABLE users
    ADD COLUMN last_seen_at DATETIME DEFAULT NULL;
