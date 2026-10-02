-- 2026-10-02: the regional Managers (Region scope) and the Fleet Admin / support team (sees everything, Manager role) from the MY - Fleet Management sheet ('HQ').
-- Idempotent: INSERT IGNORE never touches someone who already has access (their role / scope stay as set in Settings -> Users);
-- the UPDATE only fills in a name for people who have none, so the PIC box can say who they are.
INSERT IGNORE INTO users (email, role, scope_type, scope_values, display_name, invited_by) VALUES
  ('nazriq.roslan@ninjavan.co', 'manager', 'region', JSON_ARRAY('Klang Valley'), 'Nazriq Roslan (Manager - Klang Valley)', 'fuad.mawardi@ninjavan.co'),
  ('shahrul.hasriq@ninjavan.co', 'manager', 'region', JSON_ARRAY('Northern'), 'Shahrul Hasriq (Manager - Northern)', 'fuad.mawardi@ninjavan.co'),
  ('nazrul.makhtar@ninjavan.co', 'manager', 'region', JSON_ARRAY('East Coast'), 'Nazrul Makhtar (Manager - East Coast)', 'fuad.mawardi@ninjavan.co'),
  ('sharifah.ibrahim@ninjavan.co', 'manager', 'all', NULL, 'Sharifah Ibrahim (Fleet Admin)', 'fuad.mawardi@ninjavan.co'),
  ('adilah.aziz@ninjavan.co', 'manager', 'all', NULL, 'Adilah Aziz (Fleet Admin)', 'fuad.mawardi@ninjavan.co'),
  ('afiq.razami@ninjavan.co', 'manager', 'all', NULL, 'Afiq Razami (Fleet Admin)', 'fuad.mawardi@ninjavan.co'),
  ('farahin.halil@ninjavan.co', 'manager', 'all', NULL, 'Farahin Halil (Fleet Admin)', 'fuad.mawardi@ninjavan.co');

UPDATE users SET display_name = CASE LOWER(email)
    WHEN 'nazriq.roslan@ninjavan.co' THEN 'Nazriq Roslan (Manager - Klang Valley)'
    WHEN 'shahrul.hasriq@ninjavan.co' THEN 'Shahrul Hasriq (Manager - Northern)'
    WHEN 'nazrul.makhtar@ninjavan.co' THEN 'Nazrul Makhtar (Manager - East Coast)'
    WHEN 'sharifah.ibrahim@ninjavan.co' THEN 'Sharifah Ibrahim (Fleet Admin)'
    WHEN 'adilah.aziz@ninjavan.co' THEN 'Adilah Aziz (Fleet Admin)'
    WHEN 'afiq.razami@ninjavan.co' THEN 'Afiq Razami (Fleet Admin)'
    WHEN 'farahin.halil@ninjavan.co' THEN 'Farahin Halil (Fleet Admin)'
    ELSE display_name END
WHERE LOWER(email) IN ('nazriq.roslan@ninjavan.co', 'shahrul.hasriq@ninjavan.co', 'nazrul.makhtar@ninjavan.co', 'sharifah.ibrahim@ninjavan.co', 'adilah.aziz@ninjavan.co', 'afiq.razami@ninjavan.co', 'farahin.halil@ninjavan.co') AND (display_name IS NULL OR display_name = '');
