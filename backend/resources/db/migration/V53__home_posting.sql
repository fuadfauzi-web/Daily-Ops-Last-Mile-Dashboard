-- 2026-10-02: a person's POSTING (position + where they are based) is kept apart from their ACCESS (what they may see).
-- The Fleet Admin team maintains the posting in the Staff & Org Chart tab; access starts out the same and is only changed by a Manager /
-- HOD, a Region Head / RFS or the Superadmin in Settings -> Users (e.g. extra stations or regions for someone sent to rescue).
-- users.scope_type / scope_values stay the ACCESS; home_scope_type / home_scope_values are the posting. Everyone starts with both the same.
ALTER TABLE users
    ADD COLUMN home_scope_type VARCHAR(20) NULL AFTER scope_values,
    ADD COLUMN home_scope_values JSON NULL AFTER home_scope_type;

UPDATE users SET home_scope_type = scope_type, home_scope_values = scope_values WHERE home_scope_type IS NULL;
