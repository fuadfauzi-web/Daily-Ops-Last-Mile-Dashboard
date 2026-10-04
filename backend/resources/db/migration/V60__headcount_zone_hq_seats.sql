-- 2026-10-03: headcount seats for Region Heads and Regional Fleet Supervisors (a seat sits at a ZONE) and for the Fleet Admin team (a seat sits at HQ),
-- next to the Station Head / Fleet Assistant seats at a station. headcount_seats.station keeps the place's name (a station, a zone, or 'HQ');
-- place_type says which. Existing rows are station seats.
ALTER TABLE headcount_seats
  ADD COLUMN place_type VARCHAR(10) NOT NULL DEFAULT 'station' AFTER station;

-- The vacant seats the Fleet Management sheet shows: the three Regional Fleet Supervisor seats marked TBA (South 1, South 2, Zone B), and for the
-- Fleet Admin team the two Admin (LM) interns who are not in the app yet plus the one seat marked '*Vacant'. They count in the headcount until
-- the Fleet Admin team adds the real person (which uses the seat up).
-- (data statement left out of the production release: it loads staging people / test data)
