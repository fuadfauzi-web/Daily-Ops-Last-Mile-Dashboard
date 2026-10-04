-- 2026-10-02: station staff (Station Heads and Fleet Assistants) from the MY - Fleet Management sheet ('SH & FA Manpower'), so the PIC box
-- can find the people looking after any station. Role = position (station_head / fleet_assistant), scope = their own station.
-- Left out: vacant rows and people whose email is still TBA. From now on the Fleet Admin team keeps this list up to date in the Staff & Org Chart tab.
-- Idempotent: INSERT IGNORE never touches someone who already has access (their role / scope stay as set in Settings -> Users);
-- the UPDATE only fills in a name for people who have none.
-- (data statement left out of the production release: it loads staging people / test data)

-- (data statement left out of the production release: it loads staging people / test data)
SELECT 1;
