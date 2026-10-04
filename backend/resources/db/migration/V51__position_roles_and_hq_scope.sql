-- 2026-10-02: roles follow the job position. users.role now stores the position (hod, manager, fleet_admin, opex, recovery,
-- restock | region_head, rfs | station_head, fleet_assistant; 'region' / 'station' stay valid for people without a position yet),
-- and a new scope 'hq' covers HQ staff, who have no dedicated region / zone / station. No schema change: both columns are plain VARCHAR.
-- Only rows still exactly as V46 / V49 created them are touched, so anyone edited by hand in Settings -> Users since is left alone.

-- The Region Heads and RFS that V46 loaded all as 'region' (the position is in the name the sheet gave them).
UPDATE users SET role = 'region_head'
WHERE role = 'region' AND scope_type = 'zone' AND display_name LIKE '% (RH - %';
UPDATE users SET role = 'rfs'
WHERE role = 'region' AND scope_type = 'zone' AND display_name LIKE '% (RFS - %';

-- The Fleet Admin team has no dedicated region / zone / station: HQ scope (they still see every region).
UPDATE users SET scope_type = 'hq', scope_values = NULL
WHERE LOWER(email) IN ('sharifah.ibrahim@ninjavan.co','adilah.aziz@ninjavan.co','afiq.razami@ninjavan.co','farahin.halil@ninjavan.co')
  AND role = 'fleet_admin' AND scope_type = 'all';
