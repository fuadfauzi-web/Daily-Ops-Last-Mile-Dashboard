-- 2026-10-02: Region Heads and Regional Fleet Supervisors (RFS) get Region staff access to their zone(s), from the MY - Fleet Management sheet ('RH & RFS Manpower'). They can then add their own station staff in Settings -> Users.
-- Idempotent: INSERT IGNORE never touches someone who already has access (their role / scope stay as set in Settings -> Users);
-- the UPDATE only fills in a name for people who have none, so the PIC box can say who they are.
-- (data statement left out of the production release: it loads staging people / test data)

-- (data statement left out of the production release: it loads staging people / test data)
SELECT 1;
