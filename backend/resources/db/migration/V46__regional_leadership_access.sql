-- 2026-10-02: Region Heads and Regional Fleet Supervisors (RFS) get Region staff access to their zone(s), from the MY - Fleet Management sheet ('RH & RFS Manpower'). They can then add their own station staff in Settings -> Users.
-- Idempotent: INSERT IGNORE never touches someone who already has access (their role / scope stay as set in Settings -> Users);
-- the UPDATE only fills in a name for people who have none, so the PIC box can say who they are.
INSERT IGNORE INTO users (email, role, scope_type, scope_values, display_name, invited_by) VALUES
  ('syafiq.dawot@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Coast 1'), 'Syafiq Dawot (RH - EAST COAST 1)', 'fuad.mawardi@ninjavan.co'),
  ('basyir.jazalan@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Coast 2'), 'Basyir Jazalan (RH - EAST COAST 2)', 'fuad.mawardi@ninjavan.co'),
  ('shamil.aiman@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Coast 3'), 'Shamil Aiman (RH - EAST COAST 3)', 'fuad.mawardi@ninjavan.co'),
  ('faizal.ghazali@ninjavan.co', 'region', 'zone', JSON_ARRAY('North 1'), 'Faizal Ghazali (RH - NORTH 1)', 'fuad.mawardi@ninjavan.co'),
  ('hisyam.sukery@ninjavan.co', 'region', 'zone', JSON_ARRAY('North 2'), 'Hisyam Sukery (RH - NORTH 2)', 'fuad.mawardi@ninjavan.co'),
  ('amirullah.jamaluddin@ninjavan.co', 'region', 'zone', JSON_ARRAY('North 3'), 'Amirullah Jamaluddin (RH - NORTH 3)', 'fuad.mawardi@ninjavan.co'),
  ('alif.afif@ninjavan.co', 'region', 'zone', JSON_ARRAY('South 1'), 'Alif Afif (RH - SOUTH 1)', 'fuad.mawardi@ninjavan.co'),
  ('faridzul.azman@ninjavan.co', 'region', 'zone', JSON_ARRAY('South 2'), 'Faridzul Azman (RH - SOUTH 2)', 'fuad.mawardi@ninjavan.co'),
  ('akhba.sulaiman@ninjavan.co', 'region', 'zone', JSON_ARRAY('South 3'), 'Akhba Sulaiman (RH - SOUTH 3)', 'fuad.mawardi@ninjavan.co'),
  ('syafiq.rusly@ninjavan.co', 'region', 'zone', JSON_ARRAY('South 4'), 'Syafiq Rusly (RH - SOUTH 4)', 'fuad.mawardi@ninjavan.co'),
  ('alrashid.nazir@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone B'), 'Alrashid Nazir (RH - ZONE B)', 'fuad.mawardi@ninjavan.co'),
  ('rosdi.sabudin@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone C'), 'Rosdi Sabudin (RH - ZONE C)', 'fuad.mawardi@ninjavan.co'),
  ('aniq.rodzi@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone D'), 'Aniq Rodzi (RH - ZONE D)', 'fuad.mawardi@ninjavan.co'),
  ('zikri.akbar@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone E'), 'Zikri Akbar (RH - ZONE E)', 'fuad.mawardi@ninjavan.co'),
  ('khairul.nizam@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone F'), 'Khairul Nizam (RH - ZONE F)', 'fuad.mawardi@ninjavan.co'),
  ('syukri.yuswan@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone G'), 'Syukri Yuswan (RH - ZONE G)', 'fuad.mawardi@ninjavan.co'),
  ('nazirul.razak@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone H'), 'Nazirul Razak (RH - ZONE H)', 'fuad.mawardi@ninjavan.co'),
  ('azeem.zahid@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone I'), 'Azeem Zahid (RH - ZONE I)', 'fuad.mawardi@ninjavan.co'),
  ('rafizan.rashid@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone J'), 'Rafizan Rashid (RH - ZONE J)', 'fuad.mawardi@ninjavan.co'),
  ('danial.mustapha@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Malaysia 1', 'East Malaysia 2'), 'Danial Mustapha (RH - EAST MALAYSIA 1 & 2)', 'fuad.mawardi@ninjavan.co'),
  ('shazueen.bolhassan@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Malaysia 3', 'East Malaysia 4'), 'Shazueen Bolhassan (RH - EAST MALAYSIA 3 & 4)', 'fuad.mawardi@ninjavan.co'),
  ('khaidir.fathi@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Coast 1'), 'Khaidir Fathi (RFS - EAST COAST 1)', 'fuad.mawardi@ninjavan.co'),
  ('zahid.almi@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Coast 2'), 'Zahid Almi (RFS - EAST COAST 2)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.ghani@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Coast 3'), 'Aiman Ghani (RFS - EAST COAST 3)', 'fuad.mawardi@ninjavan.co'),
  ('nazri.noh@ninjavan.co', 'region', 'zone', JSON_ARRAY('North 1'), 'Nazri Noh (RFS - NORTH 1)', 'fuad.mawardi@ninjavan.co'),
  ('irman.ismail@ninjavan.co', 'region', 'zone', JSON_ARRAY('North 2'), 'Irman Ismail (RFS - NORTH 2)', 'fuad.mawardi@ninjavan.co'),
  ('amzar.azmee@ninjavan.co', 'region', 'zone', JSON_ARRAY('North 3'), 'Amzar Azmee (RFS - NORTH 3)', 'fuad.mawardi@ninjavan.co'),
  ('shamirul.eizlan@ninjavan.co', 'region', 'zone', JSON_ARRAY('South 3', 'South 4'), 'Shamirul Eizlan (RFS - SOUTH 3 & 4)', 'fuad.mawardi@ninjavan.co'),
  ('azman.musanip@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone C'), 'Azman Musanip (RFS - ZONE C)', 'fuad.mawardi@ninjavan.co'),
  ('fareez.zainuddin@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone D'), 'Fareez Zainuddin (RFS - ZONE D)', 'fuad.mawardi@ninjavan.co'),
  ('nazrul.nizam@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone E'), 'Nazrul Nizam (RFS - ZONE E)', 'fuad.mawardi@ninjavan.co'),
  ('ashraf.akharan@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone F'), 'Ashraf Akharan (RFS - ZONE F)', 'fuad.mawardi@ninjavan.co'),
  ('syazwan.saharudin@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone G'), 'Syazwan Saharudin (RFS - ZONE G)', 'fuad.mawardi@ninjavan.co'),
  ('faizal.syarip@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone H'), 'Faizal Syarip (RFS - ZONE H)', 'fuad.mawardi@ninjavan.co'),
  ('aniq.halim@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone I'), 'Aniq Halim (RFS - ZONE I)', 'fuad.mawardi@ninjavan.co'),
  ('ahmad.mustaffa@ninjavan.co', 'region', 'zone', JSON_ARRAY('Zone J'), 'Ahmad Mustaffa (RFS - ZONE J)', 'fuad.mawardi@ninjavan.co'),
  ('arfaizul.arapah@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Malaysia 1', 'East Malaysia 2'), 'Arfaizul Arapah (RFS - EAST MALAYSIA 1 & 2)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.kanil@ninjavan.co', 'region', 'zone', JSON_ARRAY('East Malaysia 3', 'East Malaysia 4'), 'Aiman Kanil (RFS - EAST MALAYSIA 3 & 4)', 'fuad.mawardi@ninjavan.co');

UPDATE users SET display_name = CASE LOWER(email)
    WHEN 'syafiq.dawot@ninjavan.co' THEN 'Syafiq Dawot (RH - EAST COAST 1)'
    WHEN 'basyir.jazalan@ninjavan.co' THEN 'Basyir Jazalan (RH - EAST COAST 2)'
    WHEN 'shamil.aiman@ninjavan.co' THEN 'Shamil Aiman (RH - EAST COAST 3)'
    WHEN 'faizal.ghazali@ninjavan.co' THEN 'Faizal Ghazali (RH - NORTH 1)'
    WHEN 'hisyam.sukery@ninjavan.co' THEN 'Hisyam Sukery (RH - NORTH 2)'
    WHEN 'amirullah.jamaluddin@ninjavan.co' THEN 'Amirullah Jamaluddin (RH - NORTH 3)'
    WHEN 'alif.afif@ninjavan.co' THEN 'Alif Afif (RH - SOUTH 1)'
    WHEN 'faridzul.azman@ninjavan.co' THEN 'Faridzul Azman (RH - SOUTH 2)'
    WHEN 'akhba.sulaiman@ninjavan.co' THEN 'Akhba Sulaiman (RH - SOUTH 3)'
    WHEN 'syafiq.rusly@ninjavan.co' THEN 'Syafiq Rusly (RH - SOUTH 4)'
    WHEN 'alrashid.nazir@ninjavan.co' THEN 'Alrashid Nazir (RH - ZONE B)'
    WHEN 'rosdi.sabudin@ninjavan.co' THEN 'Rosdi Sabudin (RH - ZONE C)'
    WHEN 'aniq.rodzi@ninjavan.co' THEN 'Aniq Rodzi (RH - ZONE D)'
    WHEN 'zikri.akbar@ninjavan.co' THEN 'Zikri Akbar (RH - ZONE E)'
    WHEN 'khairul.nizam@ninjavan.co' THEN 'Khairul Nizam (RH - ZONE F)'
    WHEN 'syukri.yuswan@ninjavan.co' THEN 'Syukri Yuswan (RH - ZONE G)'
    WHEN 'nazirul.razak@ninjavan.co' THEN 'Nazirul Razak (RH - ZONE H)'
    WHEN 'azeem.zahid@ninjavan.co' THEN 'Azeem Zahid (RH - ZONE I)'
    WHEN 'rafizan.rashid@ninjavan.co' THEN 'Rafizan Rashid (RH - ZONE J)'
    WHEN 'danial.mustapha@ninjavan.co' THEN 'Danial Mustapha (RH - EAST MALAYSIA 1 & 2)'
    WHEN 'shazueen.bolhassan@ninjavan.co' THEN 'Shazueen Bolhassan (RH - EAST MALAYSIA 3 & 4)'
    WHEN 'khaidir.fathi@ninjavan.co' THEN 'Khaidir Fathi (RFS - EAST COAST 1)'
    WHEN 'zahid.almi@ninjavan.co' THEN 'Zahid Almi (RFS - EAST COAST 2)'
    WHEN 'aiman.ghani@ninjavan.co' THEN 'Aiman Ghani (RFS - EAST COAST 3)'
    WHEN 'nazri.noh@ninjavan.co' THEN 'Nazri Noh (RFS - NORTH 1)'
    WHEN 'irman.ismail@ninjavan.co' THEN 'Irman Ismail (RFS - NORTH 2)'
    WHEN 'amzar.azmee@ninjavan.co' THEN 'Amzar Azmee (RFS - NORTH 3)'
    WHEN 'shamirul.eizlan@ninjavan.co' THEN 'Shamirul Eizlan (RFS - SOUTH 3 & 4)'
    WHEN 'azman.musanip@ninjavan.co' THEN 'Azman Musanip (RFS - ZONE C)'
    WHEN 'fareez.zainuddin@ninjavan.co' THEN 'Fareez Zainuddin (RFS - ZONE D)'
    WHEN 'nazrul.nizam@ninjavan.co' THEN 'Nazrul Nizam (RFS - ZONE E)'
    WHEN 'ashraf.akharan@ninjavan.co' THEN 'Ashraf Akharan (RFS - ZONE F)'
    WHEN 'syazwan.saharudin@ninjavan.co' THEN 'Syazwan Saharudin (RFS - ZONE G)'
    WHEN 'faizal.syarip@ninjavan.co' THEN 'Faizal Syarip (RFS - ZONE H)'
    WHEN 'aniq.halim@ninjavan.co' THEN 'Aniq Halim (RFS - ZONE I)'
    WHEN 'ahmad.mustaffa@ninjavan.co' THEN 'Ahmad Mustaffa (RFS - ZONE J)'
    WHEN 'arfaizul.arapah@ninjavan.co' THEN 'Arfaizul Arapah (RFS - EAST MALAYSIA 1 & 2)'
    WHEN 'aiman.kanil@ninjavan.co' THEN 'Aiman Kanil (RFS - EAST MALAYSIA 3 & 4)'
    ELSE display_name END
WHERE LOWER(email) IN ('syafiq.dawot@ninjavan.co', 'basyir.jazalan@ninjavan.co', 'shamil.aiman@ninjavan.co', 'faizal.ghazali@ninjavan.co', 'hisyam.sukery@ninjavan.co', 'amirullah.jamaluddin@ninjavan.co', 'alif.afif@ninjavan.co', 'faridzul.azman@ninjavan.co', 'akhba.sulaiman@ninjavan.co', 'syafiq.rusly@ninjavan.co', 'alrashid.nazir@ninjavan.co', 'rosdi.sabudin@ninjavan.co', 'aniq.rodzi@ninjavan.co', 'zikri.akbar@ninjavan.co', 'khairul.nizam@ninjavan.co', 'syukri.yuswan@ninjavan.co', 'nazirul.razak@ninjavan.co', 'azeem.zahid@ninjavan.co', 'rafizan.rashid@ninjavan.co', 'danial.mustapha@ninjavan.co', 'shazueen.bolhassan@ninjavan.co', 'khaidir.fathi@ninjavan.co', 'zahid.almi@ninjavan.co', 'aiman.ghani@ninjavan.co', 'nazri.noh@ninjavan.co', 'irman.ismail@ninjavan.co', 'amzar.azmee@ninjavan.co', 'shamirul.eizlan@ninjavan.co', 'azman.musanip@ninjavan.co', 'fareez.zainuddin@ninjavan.co', 'nazrul.nizam@ninjavan.co', 'ashraf.akharan@ninjavan.co', 'syazwan.saharudin@ninjavan.co', 'faizal.syarip@ninjavan.co', 'aniq.halim@ninjavan.co', 'ahmad.mustaffa@ninjavan.co', 'arfaizul.arapah@ninjavan.co', 'aiman.kanil@ninjavan.co') AND (display_name IS NULL OR display_name = '');
