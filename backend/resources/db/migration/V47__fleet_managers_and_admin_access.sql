-- 2026-10-02: the regional Managers (Region scope) and the Fleet Admin / support team (sees everything, Manager role) from the MY - Fleet Management sheet ('HQ').
-- Idempotent: INSERT IGNORE never touches someone who already has access (their role / scope stay as set in Settings -> Users);
-- the UPDATE only fills in a name for people who have none, so the PIC box can say who they are.
-- (data statement left out of the production release: it loads staging people / test data)

-- (data statement left out of the production release: it loads staging people / test data)
SELECT 1;
