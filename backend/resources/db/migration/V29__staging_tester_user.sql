-- 2026-09-25 (STAGING ONLY -- do not copy this file to main/production): a test
-- account so the Fleet Manager can set a PIC on it and "View as" it (Role Tester ->
-- a specific user) to try Urgent TN assignments, notifications and feedback end to
-- end. The .invalid domain can never be a real Google account, so nobody can sign
-- in as it; it only ever exists to be assigned to and viewed-as. Its role/scope can
-- be changed in Settings -> Users like any other user.
INSERT IGNORE INTO users (email, role, scope_type, scope_values, display_name, invited_by)
VALUES ('tester@dashboard.invalid', 'region', 'region', '["Southern"]', 'Tester (test account)', 'system');
