-- The app owner's own role got changed to Manager during staging testing --
-- the current permission rules (main.py's _require_can_manage_target) don't
-- let a Manager-role user self-edit back to Admin (Manager can only manage
-- Station/Region-role targets, not another Manager, even themselves), so
-- this is a one-off data fix rather than something fixable through the UI.
-- Idempotent -- harmless if the owner is already Admin (e.g. on production).
UPDATE users SET role = 'admin' WHERE email = 'fuad.mawardi@ninjavan.co';
