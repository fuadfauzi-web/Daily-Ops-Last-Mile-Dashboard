-- 2026-10-03: a headcount seat can cover more than one place -- e.g. one Regional Fleet Supervisor seat for South 1 and South 2. `places` holds the
-- list (JSON array of names); `station` keeps the first one. Seats from before have no list and read as just `station`.
ALTER TABLE headcount_seats
  ADD COLUMN places TEXT NULL AFTER station;
