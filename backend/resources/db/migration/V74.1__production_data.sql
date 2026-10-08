-- V74.1 production data: DML only from V46,47,49,51-54,56,57,60,69,70,72,73 (staging order)

-- from V46__regional_leadership_access.sql
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

-- from V47__fleet_managers_and_admin_access.sql
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

-- from V49__fleet_admin_role.sql
UPDATE users SET role = 'fleet_admin'
WHERE LOWER(email) IN ('sharifah.ibrahim@ninjavan.co', 'adilah.aziz@ninjavan.co', 'afiq.razami@ninjavan.co', 'farahin.halil@ninjavan.co')
  AND role = 'manager' AND scope_type = 'all';

-- from V51__position_roles_and_hq_scope.sql
UPDATE users SET role = 'region_head'
WHERE role = 'region' AND scope_type = 'zone' AND display_name LIKE '% (RH - %';
UPDATE users SET role = 'rfs'
WHERE role = 'region' AND scope_type = 'zone' AND display_name LIKE '% (RFS - %';
UPDATE users SET scope_type = 'hq', scope_values = NULL
WHERE LOWER(email) IN ('sharifah.ibrahim@ninjavan.co','adilah.aziz@ninjavan.co','afiq.razami@ninjavan.co','farahin.halil@ninjavan.co')
  AND role = 'fleet_admin' AND scope_type = 'all';

-- from V52__station_staff.sql
INSERT IGNORE INTO users (email, role, scope_type, scope_values, display_name, invited_by) VALUES
  ('zahirudin.zainal@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bentong'), 'Zahirudin Bin Zainal (FA - Bentong)', 'fuad.mawardi@ninjavan.co'),
  ('hazieq.haznan@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bentong'), 'Mohd Hazieq Aieman Bin Haznan (SH - Bentong)', 'fuad.mawardi@ninjavan.co'),
  ('izwan.haron@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gambang'), 'Syed Izwan Hafiz Bin Syed Haron (FA - Gambang)', 'fuad.mawardi@ninjavan.co'),
  ('syahmi.sabri@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Gambang'), 'Muhammad Syahmi Rukaini Bin Md Sabri (SH - Gambang)', 'fuad.mawardi@ninjavan.co'),
  ('haziq.lajis@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Jengka'), 'Muhammad Haziq Bin Md Lajis (FA - Jengka)', 'fuad.mawardi@ninjavan.co'),
  ('aliff.azizan@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Jengka'), 'Aliff Nizamuddin Bin Azizan (SH - Jengka)', 'fuad.mawardi@ninjavan.co'),
  ('hadzrin.samsudin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Jerantut'), 'Muhammad Hadzrin Bin Samsudin (FA - Jerantut)', 'fuad.mawardi@ninjavan.co'),
  ('muhammad.annuar@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Jerantut'), 'Muhammad Bin Mohamad Annuar (SH - Jerantut)', 'fuad.mawardi@ninjavan.co'),
  ('ain.ishak@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuala Lipis'), 'Ain Najiyah Binti Ishak (FA - Kuala Lipis)', 'fuad.mawardi@ninjavan.co'),
  ('fahim.fadhli@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kuala Lipis'), 'Muhamad Fahim Bin Muhamad Fadhli (SH - Kuala Lipis)', 'fuad.mawardi@ninjavan.co'),
  ('ridhuan.azhar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuantan'), 'Muhammad Ridhuan Mohamed @ Azhar (FA - Kuantan)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.halim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuantan'), 'Muhammad Aiman Bin Abdul Halim (FA - Kuantan)', 'fuad.mawardi@ninjavan.co'),
  ('amirul.mazlan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuantan'), 'Mohd Amirul Hafizi Bin Mazlan (FA - Kuantan)', 'fuad.mawardi@ninjavan.co'),
  ('fatin.zainuddin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kuantan'), 'Fatin Farihah Binti Zainuddin (SH - Kuantan)', 'fuad.mawardi@ninjavan.co'),
  ('afi.wanrazali@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Muadzam Shah'), 'Wan Muhamad Afi Izzuddin Bin Wan Razali (FA - Muadzam Shah)', 'fuad.mawardi@ninjavan.co'),
  ('fadhli.zahari@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Muadzam Shah'), 'Muhammad Nur Fadhli Bin Zahari (SH - Muadzam Shah)', 'fuad.mawardi@ninjavan.co'),
  ('idlan.darus@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Pekan'), 'Mohamad Idlan Faiz Bin Mohamad Darus (FA - Pekan)', 'fuad.mawardi@ninjavan.co'),
  ('farhana.zainuddin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Pekan'), 'Nur Farhana Binti Zainuddin (SH - Pekan)', 'fuad.mawardi@ninjavan.co'),
  ('shahiran.jamizan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Raub'), 'Muhamad Shahiran Bin Jamizan (FA - Raub)', 'fuad.mawardi@ninjavan.co'),
  ('asyraf.rahmat@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Raub'), 'Muhamad Asyraf Bin Rahmat (SH - Raub)', 'fuad.mawardi@ninjavan.co'),
  ('sufian.mohdzairi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Rompin'), 'Mohammad Sufian Bin Mohd Zairi (FA - Rompin)', 'fuad.mawardi@ninjavan.co'),
  ('ain.sezali@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Rompin'), 'Nor''Ain Binti Sezali (SH - Rompin)', 'fuad.mawardi@ninjavan.co'),
  ('aizat.khairulnazri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Temerloh'), 'Ahmad Aizat Bin Khairul Nazri (FA - Temerloh)', 'fuad.mawardi@ninjavan.co'),
  ('ridzuan.ludin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Temerloh'), 'Mohamad Ridzuan Bakri Bin Mohd Ludin (SH - Temerloh)', 'fuad.mawardi@ninjavan.co'),
  ('faratul.hakimi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Triang'), 'Faratul Isna Binti Hakimi (FA - Triang)', 'fuad.mawardi@ninjavan.co'),
  ('ridzuan.salam@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Triang'), 'Mohd Ridzuan Bin Abdul Salam (SH - Triang)', 'fuad.mawardi@ninjavan.co'),
  ('nazreen.mohd@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ajil'), 'Ahmad Nazreen Bin Mohd (FA - Ajil)', 'fuad.mawardi@ninjavan.co'),
  ('syed.aluwi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Ajil'), 'Syed Mohd Saifuldin Bin Syed Aluwi (SH - Ajil)', 'fuad.mawardi@ninjavan.co'),
  ('nasrul.nizam@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bukit Payong'), 'Ahmad Nasrul Nizam Bin Nassiruddin (FA - Bukit Payong)', 'fuad.mawardi@ninjavan.co'),
  ('naim.nor@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bukit Payong'), 'Muhammad Naim Bin Mohd Nor (FA - Bukit Payong)', 'fuad.mawardi@ninjavan.co'),
  ('ahmad.syakir@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bukit Payong'), 'Ahmad Syakir Bin Manti @ Mahadi (SH - Bukit Payong)', 'fuad.mawardi@ninjavan.co'),
  ('rahim.nor@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Chukai'), 'Abdul Rahim Bin Mohd Nor (FA - Chukai)', 'fuad.mawardi@ninjavan.co'),
  ('mohammad.abdullah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Chukai'), 'Mohammad Aiman Bin Abdullah (FA - Chukai)', 'fuad.mawardi@ninjavan.co'),
  ('khaizuran.bakhril@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Chukai'), 'Mohammad Khaizuran Bin Bakhril (SH - Chukai)', 'fuad.mawardi@ninjavan.co'),
  ('haniff.hamasakee@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Dungun'), 'Mohd Haniff Bin Hamasakee (FA - Dungun)', 'fuad.mawardi@ninjavan.co'),
  ('hakimi.mohamad@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Dungun'), 'Hakimi bin Mohamad (SH - Dungun)', 'fuad.mawardi@ninjavan.co'),
  ('zukri.jalil@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gong Badak'), 'Mohd Zukri Bin Abd Jalil (FA - Gong Badak)', 'fuad.mawardi@ninjavan.co'),
  ('zaim.adnan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gong Badak'), 'Muhd Zaim Hamidi Bin Adnan (FA - Gong Badak)', 'fuad.mawardi@ninjavan.co'),
  ('nursalam.rusli@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Gong Badak'), 'Muhammad Nursalam bin Rusli (SH - Gong Badak)', 'fuad.mawardi@ninjavan.co'),
  ('haris.setapa@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Jerteh'), 'Nik Mohd Haris Bin Nik Setapa (FA - Jerteh)', 'fuad.mawardi@ninjavan.co'),
  ('hazim.firdaus@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Jerteh'), 'Mohd Hazim Firdaus Bin Idris (SH - Jerteh)', 'fuad.mawardi@ninjavan.co'),
  ('adam.saidi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Marang'), 'Muhammad Adam Ikhwan Bin Md Saidi (FA - Marang)', 'fuad.mawardi@ninjavan.co'),
  ('syahrir.sulaiman@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Marang'), 'Tengku Ahmad Syahrir Bin Tengku Sulaiman (SH - Marang)', 'fuad.mawardi@ninjavan.co'),
  ('razin.zamri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Paka'), 'Muhammad Razin Zakwan Bin Zamri (FA - Paka)', 'fuad.mawardi@ninjavan.co'),
  ('hafizi.jalil@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Paka'), 'Muhammad Hafizi Bin Abdul Jalil (SH - Paka)', 'fuad.mawardi@ninjavan.co'),
  ('syahrul.husin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Setiu'), 'Mohd Syahrul Izwan Bin Husin (FA - Setiu)', 'fuad.mawardi@ninjavan.co'),
  ('ahmad.fahmie@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Setiu'), 'Ahmad Fahmie Bin Mat Nasir (SH - Setiu)', 'fuad.mawardi@ninjavan.co'),
  ('izamudin.izlan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bachok'), 'Mohamad Izamudin Haziq Bin Izlan (FA - Bachok)', 'fuad.mawardi@ninjavan.co'),
  ('khairul.ali@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bachok'), 'Khairul Azry Bin Md Ali (SH - Bachok)', 'fuad.mawardi@ninjavan.co'),
  ('nabil.aziz@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gua Musang'), 'Ku Muhammad Nabil Bin Ku Aziz (FA - Gua Musang)', 'fuad.mawardi@ninjavan.co'),
  ('rizal.saod@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Gua Musang'), 'Mohd Rizal Bin Saod (SH - Gua Musang)', 'fuad.mawardi@ninjavan.co'),
  ('ahmad.marzuki@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ketereh'), 'Ahmad Ariff Bin Marzuki (FA - Ketereh)', 'fuad.mawardi@ninjavan.co'),
  ('ahmad.affan@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Ketereh'), 'Ahmad Affan Bin Shamsuri (SH - Ketereh)', 'fuad.mawardi@ninjavan.co'),
  ('shazaril.shukri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Bharu'), 'Shazaril Shafrie Bin Shukri (FA - Kota Bharu)', 'fuad.mawardi@ninjavan.co'),
  ('ihsan.mazli@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Bharu'), 'Muhammad Ihsan Bin Mazli (FA - Kota Bharu)', 'fuad.mawardi@ninjavan.co'),
  ('zihni.zamani@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kota Bharu'), 'Muhammad Zihni Bin Zamani (SH - Kota Bharu)', 'fuad.mawardi@ninjavan.co'),
  ('nabil.ahkram@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuala Krai'), 'Muhammad Nabil Ahkram Bin Mohd Zawawi (FA - Kuala Krai)', 'fuad.mawardi@ninjavan.co'),
  ('hanif.idrus@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kuala Krai'), 'Mohamad Hanif Bin Idrus (SH - Kuala Krai)', 'fuad.mawardi@ninjavan.co'),
  ('afif.aljafry@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Machang'), 'Mohd Afif Shahrizad Bin Aljafry (FA - Machang)', 'fuad.mawardi@ninjavan.co'),
  ('azrul.baharuddin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Machang'), 'Muhammad Azrul Bin Baharuddin (FA - Machang)', 'fuad.mawardi@ninjavan.co'),
  ('farhan.ikhwan@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Machang'), 'Farhan Ikhwan Bin Johari Ariffin (SH - Machang)', 'fuad.mawardi@ninjavan.co'),
  ('khairudin.asri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Pasir Mas'), 'Mohd Khairudin Bin Mohd Asri (FA - Pasir Mas)', 'fuad.mawardi@ninjavan.co'),
  ('azrin.hamid@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Pasir Mas'), 'Muhammad Azrin Bin Hamid (SH - Pasir Mas)', 'fuad.mawardi@ninjavan.co'),
  ('amirul.rushdan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Pasir Puteh'), 'Wan Amirul Afnan Bin Wan Rushdan (FA - Pasir Puteh)', 'fuad.mawardi@ninjavan.co'),
  ('chin.shen@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Pasir Puteh'), 'Lau Chin Shen (SH - Pasir Puteh)', 'fuad.mawardi@ninjavan.co'),
  ('amir.afizan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Wakaf Bharu'), 'Muhamad Amir Afizan Bin Abdullah (FA - Wakaf Bharu)', 'fuad.mawardi@ninjavan.co'),
  ('syahrul.muhamad@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Wakaf Bharu'), 'Muhamad Syahrul Azwan Bin Muhamad (FA - Wakaf Bharu)', 'fuad.mawardi@ninjavan.co'),
  ('esmat.fahmi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Wakaf Bharu'), 'Mohamad Esmat Fahmi Bin Rahim (SH - Wakaf Bharu)', 'fuad.mawardi@ninjavan.co'),
  ('ammar.ismail@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Beaufort'), 'Mohd Ammar Muftar Bin Ismail (FA - Beaufort)', 'fuad.mawardi@ninjavan.co'),
  ('norathirah.jusli@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Beaufort'), 'Norathirah Binti Jusli (SH - Beaufort)', 'fuad.mawardi@ninjavan.co'),
  ('jaidi.ghani@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Inanam'), 'Jaidi Bin Abd Ghani (FA - Inanam)', 'fuad.mawardi@ninjavan.co'),
  ('fajilah.ismail1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Inanam'), 'Nurfajilah Binti Ismail (FA - Inanam)', 'fuad.mawardi@ninjavan.co'),
  ('shahrizal.akmat@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Inanam'), 'Datu Shahrizal Bin Datu Akmat (SH - Inanam)', 'fuad.mawardi@ninjavan.co'),
  ('malwanraj.malik@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Keningau'), 'Malwanraj Malik (FA - Keningau)', 'fuad.mawardi@ninjavan.co'),
  ('azianaazinda.azmie@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Keningau'), 'Nor Aziana Aznida Binti Azmie (SH - Keningau)', 'fuad.mawardi@ninjavan.co'),
  ('azniezah.nordin1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Labuan'), 'Noor Azniezah Binti Nordin (FA - Labuan)', 'fuad.mawardi@ninjavan.co'),
  ('redzuan.maidin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Labuan'), 'Redzuan Bin Maidin (SH - Labuan)', 'fuad.mawardi@ninjavan.co'),
  ('zulhisyam.eli@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Papar'), 'Muhammad Zulhisyam Bin Eli @ Zulkipli (FA - Papar)', 'fuad.mawardi@ninjavan.co'),
  ('asyraf.taip@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Papar'), 'Muhammad Asyraf Bin Taip (SH - Papar)', 'fuad.mawardi@ninjavan.co'),
  ('iven.anthony2@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Penampang'), 'Iven Anthony (FA - Penampang)', 'fuad.mawardi@ninjavan.co'),
  ('afdhal.azamuddin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Penampang'), 'Afdhal Amirul Bin Azamuddin (FA - Penampang)', 'fuad.mawardi@ninjavan.co'),
  ('eldon.tang@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Penampang'), 'Eldon Tang Kiok Huat (SH - Penampang)', 'fuad.mawardi@ninjavan.co'),
  ('deniver.jupirin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sepanggar'), 'Deniver Jupirin (FA - Sepanggar)', 'fuad.mawardi@ninjavan.co'),
  ('aisyam.baharudin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Sepanggar'), 'Mohamad Aisyam Bin Baharudin (SH - Sepanggar)', 'fuad.mawardi@ninjavan.co'),
  ('khairilanwar.suhaili@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sepanggar'), 'Khairil Anwar Bin Suhaili (FA - Sepanggar)', 'fuad.mawardi@ninjavan.co'),
  ('sahirul.sadah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Tuaran'), 'Sahirul Bin Sadah (FA - Tuaran)', 'fuad.mawardi@ninjavan.co'),
  ('debbrolryne.jupirin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Tuaran'), 'Debbrolryne Jupirin (SH - Tuaran)', 'fuad.mawardi@ninjavan.co'),
  ('mohd.mahadir@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Kinabatangan'), 'Mohd Mahadir Bin Azman (FA - Kota Kinabatangan)', 'fuad.mawardi@ninjavan.co'),
  ('mdfazly.darong@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kota Kinabatangan'), 'M.d Fazly Bin Darong (SH - Kota Kinabatangan)', 'fuad.mawardi@ninjavan.co'),
  ('syazwansaufi.irwanto@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Lahad Datu'), 'Mohd Syazwan Saufi Bin Irwanto (SH - Lahad Datu)', 'fuad.mawardi@ninjavan.co'),
  ('fahmi.shaiffuddin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sandakan'), 'Pg Haniff Fahmi B Pg Omar Ali Shaiffuddin (FA - Sandakan)', 'fuad.mawardi@ninjavan.co'),
  ('hermogenes.friasjr@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sandakan'), 'Hermogenes Frias Jr (FA - Sandakan)', 'fuad.mawardi@ninjavan.co'),
  ('rustam.baharon@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Sandakan'), 'Mohd Rustam Bin Baharon (SH - Sandakan)', 'fuad.mawardi@ninjavan.co'),
  ('norasmah.madjaraha@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Semporna'), 'Norasmah Binti Madjaraha (FA - Semporna)', 'fuad.mawardi@ninjavan.co'),
  ('nizam.kassim@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Semporna'), 'Mohamad Nizam Bin Abu Kassim (SH - Semporna)', 'fuad.mawardi@ninjavan.co'),
  ('izwan.zulkornai@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Tawau'), 'Izwan Bin Zulkornai (FA - Tawau)', 'fuad.mawardi@ninjavan.co'),
  ('azlan.mohammad@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Tawau'), 'Azlan bin Mohammad (SH - Tawau)', 'fuad.mawardi@ninjavan.co'),
  ('muqzamir.ahmad2@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Batu Kawa'), 'Muqzamir Bin Ahmad (FA - Batu Kawa)', 'fuad.mawardi@ninjavan.co'),
  ('aidilshazwan.azamri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Batu Kawa'), 'Aidil Shazwan Bin Azamri (FA - Batu Kawa)', 'fuad.mawardi@ninjavan.co'),
  ('fazlin.mamin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Batu Kawa'), 'Noorfazlin binti Mamin (SH - Batu Kawa)', 'fuad.mawardi@ninjavan.co'),
  ('syafiq.zainal1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuching'), 'Syafiq Bin Zainal Abidin (FA - Kuching)', 'fuad.mawardi@ninjavan.co'),
  ('angelina.biddy@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kuching'), 'Angelina Michelle Anak Biddy (SH - Kuching)', 'fuad.mawardi@ninjavan.co'),
  ('lencaster.inyau@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Petra Jaya'), 'Lencaster Inyau (FA - Petra Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('amirul.malik@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Petra Jaya'), 'Amirul Afiq Bin Abdul Malik (FA - Petra Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('saifullah.zalmy@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Petra Jaya'), 'Mohamad Nik Saifullah Bin Mohamad Zalmy (SH - Petra Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('hafizzah.zainal@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Samarahan'), 'Sharifah Hafizzah Binti Tuanku Zainal (FA - Samarahan)', 'fuad.mawardi@ninjavan.co'),
  ('mohammadalhafiz.ahmadriduan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Samarahan'), 'Mohammad Al-Hafiz Bin Ahmad Riduan (FA - Samarahan)', 'fuad.mawardi@ninjavan.co'),
  ('waie.aziz@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Samarahan'), 'Mohd Wa''ie Bin Aziz (SH - Samarahan)', 'fuad.mawardi@ninjavan.co'),
  ('nurulain.wahid@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bintulu'), 'Nurulain Wahidah Binti Wahid (FA - Bintulu)', 'fuad.mawardi@ninjavan.co'),
  ('asfa.yusoff@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bintulu'), 'Muhammad Asfa Harith Bin Yusoff (SH - Bintulu)', 'fuad.mawardi@ninjavan.co'),
  ('kevin.malim1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Miri'), 'Kevin Roy Anak Malim (FA - Miri)', 'fuad.mawardi@ninjavan.co'),
  ('dyevin.john@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Miri'), 'Dyevin John (SH - Miri)', 'fuad.mawardi@ninjavan.co'),
  ('faizul.sauti@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Saratok'), 'Faizul Bin Sauti (SH - Saratok)', 'fuad.mawardi@ninjavan.co'),
  ('qairul.romi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sibu'), 'Qairul Hakim Bin Romi (FA - Sibu)', 'fuad.mawardi@ninjavan.co'),
  ('francis.li1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sibu'), 'Francis Anak Li (FA - Sibu)', 'fuad.mawardi@ninjavan.co'),
  ('garcia.ulie@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Sibu'), 'Garcia Anak Ulie (SH - Sibu)', 'fuad.mawardi@ninjavan.co'),
  ('hanis.daud@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Alor Setar'), 'Nur Hanis Binti Daud (FA - Alor Setar)', 'fuad.mawardi@ninjavan.co'),
  ('hafiz.khadib@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Alor Setar'), 'Muhammad Hafiz Fahmi Bin Abdul Khadib (FA - Alor Setar)', 'fuad.mawardi@ninjavan.co'),
  ('mohd.husaini1@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Alor Setar'), 'Mohd Husaini Bin Nasir (SH - Alor Setar)', 'fuad.mawardi@ninjavan.co'),
  ('shazmil.noh@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Baling'), 'Mohd Syazmil Bin Md Noh (FA - Baling)', 'fuad.mawardi@ninjavan.co'),
  ('syaifullah.hamid@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Baling'), 'Mohd Syaifullah Bin Hamid (FA - Baling)', 'fuad.mawardi@ninjavan.co'),
  ('zaideen.ahmad@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Baling'), 'Zaideen Bin Ahmad (SH - Baling)', 'fuad.mawardi@ninjavan.co'),
  ('anuar.wahab@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gurun'), 'Anuar Bin Abdul Wahab (FA - Gurun)', 'fuad.mawardi@ninjavan.co'),
  ('hakiim.manan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gurun'), 'Abdul Hakiim Bin Abd Manan (FA - Gurun)', 'fuad.mawardi@ninjavan.co'),
  ('khairil.najmi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Gurun'), 'Khairil Najmi Bin Isa (SH - Gurun)', 'fuad.mawardi@ninjavan.co'),
  ('hairul.anuar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Jitra'), 'Hairul Nassharudin Bin Anuar (FA - Jitra)', 'fuad.mawardi@ninjavan.co'),
  ('fadhril.ghazali@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Jitra'), 'Muhammad Fadhril Bin Ghazali (FA - Jitra)', 'fuad.mawardi@ninjavan.co'),
  ('rassul.rohani@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Jitra'), 'Mohammad Rassul Bin Rohani (SH - Jitra)', 'fuad.mawardi@ninjavan.co'),
  ('faizal.shukri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kangar'), 'Faizal Hamdi Bin Ahmad Shukri (FA - Kangar)', 'fuad.mawardi@ninjavan.co'),
  ('faris.fakhruddin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kangar'), 'Muhammad Faris Bin Fakhruddin (FA - Kangar)', 'fuad.mawardi@ninjavan.co'),
  ('sharol.azri@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kangar'), 'Sharol Azri Bin Halim (SH - Kangar)', 'fuad.mawardi@ninjavan.co'),
  ('shamsuri.shamsudin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kulim'), 'Muhamad Nur Shamsuri Bin Shamsudin (FA - Kulim)', 'fuad.mawardi@ninjavan.co'),
  ('zameri.liki@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kulim'), 'Mohd Zameri Bin Mat Liki (FA - Kulim)', 'fuad.mawardi@ninjavan.co'),
  ('shaffiq.nadzri@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kulim'), 'Mohammad Shaffiq Bin Mohammad Nadzri (SH - Kulim)', 'fuad.mawardi@ninjavan.co'),
  ('amirulfarhan.azizi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Langkawi'), 'Amirulfarhan Bin Azizi (FA - Langkawi)', 'fuad.mawardi@ninjavan.co'),
  ('faqrul.rodzi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Langkawi'), 'Mohd Faqrul Rodzi Bin Abidin (SH - Langkawi)', 'fuad.mawardi@ninjavan.co'),
  ('asyraf.shaari@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Pendang'), 'Muhd Asyraf Bin Shaari (FA - Pendang)', 'fuad.mawardi@ninjavan.co'),
  ('syafiq.suferi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Pendang'), 'Mohd Syafiq Bin Mohd Suferi (SH - Pendang)', 'fuad.mawardi@ninjavan.co'),
  ('yusuf.ghazali1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Pokok Sena'), 'Ahmad Yusuf Bin Ahmad Ghazali (FA - Pokok Sena)', 'fuad.mawardi@ninjavan.co'),
  ('syahril.shamsudin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Pokok Sena'), 'Syahrilnizam Fitri Bin Shamsudin (SH - Pokok Sena)', 'fuad.mawardi@ninjavan.co'),
  ('daud.nasir@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sungai Petani'), 'Muhammad Daud Bin Mohd Nasir (FA - Sungai Petani)', 'fuad.mawardi@ninjavan.co'),
  ('dinie.othman@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sungai Petani'), 'Dinie Bin Othman (FA - Sungai Petani)', 'fuad.mawardi@ninjavan.co'),
  ('ihsan.nasir@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Sungai Petani'), 'Muhammad Ihsan Bin Mohamad Nasir (SH - Sungai Petani)', 'fuad.mawardi@ninjavan.co'),
  ('syazwan.hazim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bayan Lepas'), 'Muhammad Syazwan Hazim Bin Mohamad Zubir (FA - Bayan Lepas)', 'fuad.mawardi@ninjavan.co'),
  ('akram.rahim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bayan Lepas'), 'Muhammad Akram bin Ab Rahim (FA - Bayan Lepas)', 'fuad.mawardi@ninjavan.co'),
  ('farizwan.akhir@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bayan Lepas'), 'Farizwan Bin Che Md Akhir (SH - Bayan Lepas)', 'fuad.mawardi@ninjavan.co'),
  ('khairul.zamri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bukit Mertajam'), 'Muhammad Khairul Hijazi Bin Muhammad Zamri (FA - Bukit Mertajam)', 'fuad.mawardi@ninjavan.co'),
  ('haikal.abdrazak@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bukit Mertajam'), 'Mohamad Haikal Bin Abd Razak (FA - Bukit Mertajam)', 'fuad.mawardi@ninjavan.co'),
  ('fitri.rodzi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bukit Mertajam'), 'Mohamad Fitri Bin Rodzi (SH - Bukit Mertajam)', 'fuad.mawardi@ninjavan.co'),
  ('aliff.rosli@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Butterworth'), 'Muhammad Aliff Firdaus Bin Rosli (FA - Butterworth)', 'fuad.mawardi@ninjavan.co'),
  ('hadirah.nasrin1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Butterworth'), 'Nur Hadirah Binti Mohd Nasrin (FA - Butterworth)', 'fuad.mawardi@ninjavan.co'),
  ('azri.azhar@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Butterworth'), 'Muhamad Azri Bin Azhar (SH - Butterworth)', 'fuad.mawardi@ninjavan.co'),
  ('aufa.zainal@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Farlim'), 'Muhammad Aufa Mukhriz Bin Zainal Abidin (FA - Farlim)', 'fuad.mawardi@ninjavan.co'),
  ('faiz.nasir@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Farlim'), 'Ahmad Faiz Najmi Bin Mohamad Nasir (FA - Farlim)', 'fuad.mawardi@ninjavan.co'),
  ('hasanizal.othman@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Farlim'), 'Ahmad Hasanizal Bin Othman (SH - Farlim)', 'fuad.mawardi@ninjavan.co'),
  ('hafiz.zamri1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Georgetown'), 'Muhammad Hafiz Bin Zamri (FA - Georgetown)', 'fuad.mawardi@ninjavan.co'),
  ('imran.ruslan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Georgetown'), 'Muhamad Al Imran Bin Ruslan (FA - Georgetown)', 'fuad.mawardi@ninjavan.co'),
  ('mohdsalehudeen.hairulanuar@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Georgetown'), 'Mohd Salehudeen Bin Hairul Anuar (SH - Georgetown)', 'fuad.mawardi@ninjavan.co'),
  ('siddhiq.saman@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kepala Batas'), 'Muhammad Siddhiq Bin Abu Saman (FA - Kepala Batas)', 'fuad.mawardi@ninjavan.co'),
  ('rusydan.awangdamit@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kepala Batas'), 'Awang Nur Rusydan Bin Awang Damit (FA - Kepala Batas)', 'fuad.mawardi@ninjavan.co'),
  ('adam.abdullah@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kepala Batas'), 'Mohamad Adam Bin Abdullah (SH - Kepala Batas)', 'fuad.mawardi@ninjavan.co'),
  ('prem.sinitharan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Simpang Ampat'), 'Prem A/l Sinitharan (FA - Simpang Ampat)', 'fuad.mawardi@ninjavan.co'),
  ('ikram.omar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Simpang Ampat'), 'Muhamad Ikram Bin Omar (FA - Simpang Ampat)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.aziz@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Simpang Ampat'), 'Aiman Bin Aziz (SH - Simpang Ampat)', 'fuad.mawardi@ninjavan.co'),
  ('hafizzuddin.nasir@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bagan Serai'), 'Muhammad Nurhafizzuddin Bin Mohamed Nasir (FA - Bagan Serai)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.sofian@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bagan Serai'), 'Muhammad Nur Aiman Hakim Bin Sofian (FA - Bagan Serai)', 'fuad.mawardi@ninjavan.co'),
  ('adam.haris@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bagan Serai'), 'Muhammad Adam Bin Haris (SH - Bagan Serai)', 'fuad.mawardi@ninjavan.co'),
  ('azreenshahrizal.hawari@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Batu Gajah'), 'Azreen Shahrizal Bin Hawari (FA - Batu Gajah)', 'fuad.mawardi@ninjavan.co'),
  ('imran.rashidi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Batu Gajah'), 'Muhammad Imran Bin Mhd Rashidi (FA - Batu Gajah)', 'fuad.mawardi@ninjavan.co'),
  ('fazly.zakaria@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Batu Gajah'), 'Mohamad Fazly Bin Zakaria (SH - Batu Gajah)', 'fuad.mawardi@ninjavan.co'),
  ('akram.shah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Cameron Highlands'), 'Muhamad Akram Bin Azmah Shah (FA - Cameron Highlands)', 'fuad.mawardi@ninjavan.co'),
  ('safwan.suhaimy@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Cameron Highlands'), 'Muhammad Safwan Bin Suhaimy (SH - Cameron Highlands)', 'fuad.mawardi@ninjavan.co'),
  ('syafiq.abdghoni@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gerik'), 'Mohamad Syafiq Lutfi Bin Abd Ghoni (FA - Gerik)', 'fuad.mawardi@ninjavan.co'),
  ('zahadi.zahari@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Gerik'), 'Ahmad Zahadi Bin Ahmad Zahari (SH - Gerik)', 'fuad.mawardi@ninjavan.co'),
  ('ahlil.mustaqim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ipoh'), 'Ahlil Mustaqim Anur @ Anuar (FA - Ipoh)', 'fuad.mawardi@ninjavan.co'),
  ('faiz.jana@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ipoh'), 'Mohamad Faiz Bin Jana (FA - Ipoh)', 'fuad.mawardi@ninjavan.co'),
  ('syazwan.eddy@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Ipoh'), 'Muhammad Izzad Syazwan Bin Eddy Noor (SH - Ipoh)', 'fuad.mawardi@ninjavan.co'),
  ('ainol.muzaffar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuala Kangsar'), 'Ainol Muzaffar Bin Abdul Muti (FA - Kuala Kangsar)', 'fuad.mawardi@ninjavan.co'),
  ('anas.malik@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kuala Kangsar'), 'Muhammad Anas Bin Abdul Malik (SH - Kuala Kangsar)', 'fuad.mawardi@ninjavan.co'),
  ('najmirul.rajuni@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sitiawan'), 'Muhammad Najmirul Bin Rajuni (FA - Sitiawan)', 'fuad.mawardi@ninjavan.co'),
  ('inammullah.mkadiri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sitiawan'), 'In Ammullah Bin M Kadiri (FA - Sitiawan)', 'fuad.mawardi@ninjavan.co'),
  ('izdihar.abdullah@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Sitiawan'), 'Muhammad Izdihar Bin Abdullah (SH - Sitiawan)', 'fuad.mawardi@ninjavan.co'),
  ('hazril.harun@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Slim River'), 'Muhammad Hazril Bin Harun (FA - Slim River)', 'fuad.mawardi@ninjavan.co'),
  ('kamil.hafiz@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Slim River'), 'Kamil Hafiz Bin Muharim Alam Shah (SH - Slim River)', 'fuad.mawardi@ninjavan.co'),
  ('rasyid.hazam@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Taiping'), 'Mohd Nur Rasyid Bin Noor Hazam (FA - Taiping)', 'fuad.mawardi@ninjavan.co'),
  ('faisal.ajam2@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Taiping'), 'Muhammad Faisal Bin Ajam (FA - Taiping)', 'fuad.mawardi@ninjavan.co'),
  ('nabil.fikri@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Taiping'), 'Muhamad Nabil Fikri Bin Ahmmad Rofee (SH - Taiping)', 'fuad.mawardi@ninjavan.co'),
  ('hafizzie.hasnan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Tapah'), 'Muhammad Hafizzie Bin Hasnan (FA - Tapah)', 'fuad.mawardi@ninjavan.co'),
  ('syahril.aziz@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Tapah'), 'Syahril Azhan Bin Abd Aziz (SH - Tapah)', 'fuad.mawardi@ninjavan.co'),
  ('faizal.kamalludin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Teluk Intan'), 'Muhammad Faizal Bin Kamalludin (FA - Teluk Intan)', 'fuad.mawardi@ninjavan.co'),
  ('ridhwan.jaafar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Teluk Intan'), 'Muhammad Ridhwan Bin Jaafar (FA - Teluk Intan)', 'fuad.mawardi@ninjavan.co'),
  ('haffiszie.hakim@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Teluk Intan'), 'Mohammad Haffiszie Bin Hakim (SH - Teluk Intan)', 'fuad.mawardi@ninjavan.co'),
  ('saiful.dollah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Masai'), 'Mohd Saiful Ridhwan Bin Dollah (FA - Kota Masai)', 'fuad.mawardi@ninjavan.co'),
  ('norazlina.jaafar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Masai'), 'Norazlina Binti Mohamaed Jaafar (FA - Kota Masai)', 'fuad.mawardi@ninjavan.co'),
  ('asrie.malik@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kota Masai'), 'Amir Asrie Bin Malik (SH - Kota Masai)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.jafridin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Tinggi'), 'Muhammad Aiman Bin Jafridin (FA - Kota Tinggi)', 'fuad.mawardi@ninjavan.co'),
  ('ariff.baharuddin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kota Tinggi'), 'Mohamad Ariff Din Bin Baharudin (SH - Kota Tinggi)', 'fuad.mawardi@ninjavan.co'),
  ('raokib.abdulkadir@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Larkin'), 'Muhammad Raokib Bin Abdul Kadir (FA - Larkin)', 'fuad.mawardi@ninjavan.co'),
  ('hanzholah.hasani@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Larkin'), 'Ahmad Hanzholah Bin Hasani (FA - Larkin)', 'fuad.mawardi@ninjavan.co'),
  ('putrinabila.mohdarfhan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Larkin'), 'Putri Nabilla Binti Mohd Arfhan (FA - Larkin)', 'fuad.mawardi@ninjavan.co'),
  ('riddaudin.seeh@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Larkin'), 'Muhammad Riddaudin Mohd Seeh (SH - Larkin)', 'fuad.mawardi@ninjavan.co'),
  ('firdaus.asri1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Pasir Gudang'), 'Muhammad Firdaus Bin Mohd Asri (FA - Pasir Gudang)', 'fuad.mawardi@ninjavan.co'),
  ('amiruddin.zailan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Pasir Gudang'), 'Muhammad Amiruddin bin Zailan (FA - Pasir Gudang)', 'fuad.mawardi@ninjavan.co'),
  ('haikal.rashid@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Pasir Gudang'), 'Muhammad Haikal Bin Abdul Rashid (SH - Pasir Gudang)', 'fuad.mawardi@ninjavan.co'),
  ('syazrin.badurisam@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Penawar'), 'Muhammad Syazrin Aiman Bin Badurisam (FA - Penawar)', 'fuad.mawardi@ninjavan.co'),
  ('najib.harison@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Penawar'), 'Mohamad Najib Bin Mohd Harison (SH - Penawar)', 'fuad.mawardi@ninjavan.co'),
  ('nasuha.kamalludin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ulu Tiram'), 'Nasuha Binti Kamalludin (FA - Ulu Tiram)', 'fuad.mawardi@ninjavan.co'),
  ('aidil.kamarudin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ulu Tiram'), 'Mohamad Aidil Fikrie Bin Kamarudin (FA - Ulu Tiram)', 'fuad.mawardi@ninjavan.co'),
  ('fauzan.salim@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Ulu Tiram'), 'Mohamad Fauzan Bin Salim (SH - Ulu Tiram)', 'fuad.mawardi@ninjavan.co'),
  ('taufiq.nadri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gelang Patah'), 'Taufiq Hidayat Bin Nadri (FA - Gelang Patah)', 'fuad.mawardi@ninjavan.co'),
  ('afiq.sukono@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gelang Patah'), 'Mohamad Afiq Bin Sukono (FA - Gelang Patah)', 'fuad.mawardi@ninjavan.co'),
  ('hakimi.razali@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Gelang Patah'), 'Muhammad Faris Hakimi Bin Razali (SH - Gelang Patah)', 'fuad.mawardi@ninjavan.co'),
  ('israafsolihin.shuib@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kempas'), 'Muhammad Nur Israaf Solihin Bin Mohd Shuib (FA - Kempas)', 'fuad.mawardi@ninjavan.co'),
  ('syawaluddin.roslan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kempas'), 'Muhamad Syawaluddin Bin Roslan (FA - Kempas)', 'fuad.mawardi@ninjavan.co'),
  ('syafiq.shafawi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kempas'), 'Muhammad Syafiq Bin Mohd Shafawi (SH - Kempas)', 'fuad.mawardi@ninjavan.co'),
  ('zaidi.zulkarnain@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kulai'), 'Mohamad Zaidi Bin Zulkarnain (FA - Kulai)', 'fuad.mawardi@ninjavan.co'),
  ('zulakmal.zulkahar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kulai'), 'Zulakmal Bin Zulkahar (FA - Kulai)', 'fuad.mawardi@ninjavan.co'),
  ('azmil.ismail@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kulai'), 'Muhamad Azmil Bin Ismail (SH - Kulai)', 'fuad.mawardi@ninjavan.co'),
  ('izrafil.kadir@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Mount Austin'), 'Muhammad Izrafil Bin Abdul Kadir (FA - Mount Austin)', 'fuad.mawardi@ninjavan.co'),
  ('fazdil.ismail@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Mount Austin'), 'Fazdil Bin Ismail (SH - Mount Austin)', 'fuad.mawardi@ninjavan.co'),
  ('shafiee.isham@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Nusajaya'), 'Mohamad Shafiee Bin Isham (FA - Nusajaya)', 'fuad.mawardi@ninjavan.co'),
  ('ahmadie.azuan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Nusajaya'), 'Ahmadie Muhammad Bin Muhammad Azuan (FA - Nusajaya)', 'fuad.mawardi@ninjavan.co'),
  ('arfan.narudin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Nusajaya'), 'Muhammad Arfan Bin Narudin (SH - Nusajaya)', 'fuad.mawardi@ninjavan.co'),
  ('luqman.musa@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Pontian'), 'Luqman Hakim Bin Musa (FA - Pontian)', 'fuad.mawardi@ninjavan.co'),
  ('hazim.rosli@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Pontian'), 'Muhammad Hazim Bin Rosli (SH - Pontian)', 'fuad.mawardi@ninjavan.co'),
  ('fatihah.masdi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ayer Hitam'), 'Nur Fatihah Binti Masdi (FA - Ayer Hitam)', 'fuad.mawardi@ninjavan.co'),
  ('zikhri.khair@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Ayer Hitam'), 'Muhamad Zikhri Bin Ahmad Khair (SH - Ayer Hitam)', 'fuad.mawardi@ninjavan.co'),
  ('faiq.mohtar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Batu Pahat'), 'Ahmad Faiq Bin Mohtar (FA - Batu Pahat)', 'fuad.mawardi@ninjavan.co'),
  ('auf.taib@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Batu Pahat'), 'Muhammad Auf Bin Mohd Taib (FA - Batu Pahat)', 'fuad.mawardi@ninjavan.co'),
  ('shahrul.azren@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Batu Pahat'), 'Mohd Shahrul Azren Bin Azman (SH - Batu Pahat)', 'fuad.mawardi@ninjavan.co'),
  ('fairoza.zainol@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bukit Gambir'), 'Fairoza Bin Zainol (FA - Bukit Gambir)', 'fuad.mawardi@ninjavan.co'),
  ('firdaus.wahid@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bukit Gambir'), 'Mohammad Firdaus Bin Abd Wahid (SH - Bukit Gambir)', 'fuad.mawardi@ninjavan.co'),
  ('azrie.shafiq@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kluang'), 'Azrie Shafiq Bin Saleh (FA - Kluang)', 'fuad.mawardi@ninjavan.co'),
  ('taufiq.nandil@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kluang'), 'Mohamad Taufiq Bin Nandil (FA - Kluang)', 'fuad.mawardi@ninjavan.co'),
  ('zulkarnain.shamsudin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kluang'), 'Zulkarnain Bin Muhammad @ Shamsudin (SH - Kluang)', 'fuad.mawardi@ninjavan.co'),
  ('hazwan.hasran@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Mersing'), 'Mohd Hazwan Bin Hasran (FA - Mersing)', 'fuad.mawardi@ninjavan.co'),
  ('syahid.noh@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Mersing'), 'Muhamad Syahid Bin Mohd Noh (SH - Mersing)', 'fuad.mawardi@ninjavan.co'),
  ('shahriswan.samah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Muar'), 'Shahriswan Bin Abu Samah (FA - Muar)', 'fuad.mawardi@ninjavan.co'),
  ('hafis.kassim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Muar'), 'Muhammad Hafis Bin Kassim (FA - Muar)', 'fuad.mawardi@ninjavan.co'),
  ('syakir.syed@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Muar'), 'Ahmad Syakir Bin Syed Abdul Kadir (SH - Muar)', 'fuad.mawardi@ninjavan.co'),
  ('nizar.nazrullah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Segamat'), 'Nizar Hilmi Bin Nazrullah (FA - Segamat)', 'fuad.mawardi@ninjavan.co'),
  ('jumain.parmo@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Segamat'), 'Mohamad Jumain Bin Parmo (FA - Segamat)', 'fuad.mawardi@ninjavan.co'),
  ('zahin.ghafor@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Segamat'), 'Mohd Zahin Bin Abd Ghafor (SH - Segamat)', 'fuad.mawardi@ninjavan.co'),
  ('hazmi.isa@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Alor Gajah'), 'Hazmi Faiz Bin Md Isa (FA - Alor Gajah)', 'fuad.mawardi@ninjavan.co'),
  ('nazarudin.jalal@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Alor Gajah'), 'Mohd Nazarudin Bin Abd Jalal (FA - Alor Gajah)', 'fuad.mawardi@ninjavan.co'),
  ('kamarulzulfekha.zaini@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Alor Gajah'), 'Kamarulzulfekha Bin Zaini (SH - Alor Gajah)', 'fuad.mawardi@ninjavan.co'),
  ('khairul.sani@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bahau'), 'Khairul Azwadi Bin Muhamad Sani (FA - Bahau)', 'fuad.mawardi@ninjavan.co'),
  ('haqim.norzafarin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bahau'), 'Iman Zul Haqim Bin Norzafarin (FA - Bahau)', 'fuad.mawardi@ninjavan.co'),
  ('naqib.anaqi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bahau'), 'Mohd Naqib Anaqi Bin Mohamad Nizam (SH - Bahau)', 'fuad.mawardi@ninjavan.co'),
  ('luqman.samin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Gemas'), 'Muhammad Luqman Hakim bin Samin (FA - Gemas)', 'fuad.mawardi@ninjavan.co'),
  ('anwar.azman@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Gemas'), 'Muhammad Anwar Irshadi Bin Azman (SH - Gemas)', 'fuad.mawardi@ninjavan.co'),
  ('anwar.husain@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Jasin'), 'Anwar Adenan Bin Husain (FA - Jasin)', 'fuad.mawardi@ninjavan.co'),
  ('arif.zakaria@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Jasin'), 'Muhammad Arif Bin Zakaria (FA - Jasin)', 'fuad.mawardi@ninjavan.co'),
  ('abi.ubaidah@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Jasin'), 'Abiubaidah Bin Asuan Kailani (SH - Jasin)', 'fuad.mawardi@ninjavan.co'),
  ('zulhilmi.zamili@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Melaka Tengah'), 'Muhammad Zulhilmi Bin Zamili (FA - Melaka Tengah)', 'fuad.mawardi@ninjavan.co'),
  ('ariff.jasman@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Melaka Tengah'), 'Nur Ariff Bin Jasman (FA - Melaka Tengah)', 'fuad.mawardi@ninjavan.co'),
  ('taufik.henra@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Melaka Tengah'), 'Muhammad Taufik Hidayat Bin Henra (FA - Melaka Tengah)', 'fuad.mawardi@ninjavan.co'),
  ('hafiz.kasron@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Melaka Tengah'), 'Muhammad Hafiz Bin Kasron (SH - Melaka Tengah)', 'fuad.mawardi@ninjavan.co'),
  ('shah.sorep@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Nilai'), 'Shah Badrul Bin Sorep (FA - Nilai)', 'fuad.mawardi@ninjavan.co'),
  ('faradisham.yunus@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Nilai'), 'Faradisham Binti Mohd Yunus (FA - Nilai)', 'fuad.mawardi@ninjavan.co'),
  ('amar.asraf@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Nilai'), 'Muhammad Amar Asraf Bin Mustapha (SH - Nilai)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.fairus@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Port Dickson'), 'Muhammad Nor Aiman Na''im Bin Fairus (FA - Port Dickson)', 'fuad.mawardi@ninjavan.co'),
  ('ikmal.hakim@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Port Dickson'), 'Ikmal Hakim Bin Hamzah (SH - Port Dickson)', 'fuad.mawardi@ninjavan.co'),
  ('alif.asyraf@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Senawang'), 'Alif Asyraf Bin Nordin (FA - Senawang)', 'fuad.mawardi@ninjavan.co'),
  ('atiqah.najib@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Senawang'), 'Nur Atiqah Binti Mohd Najib (FA - Senawang)', 'fuad.mawardi@ninjavan.co'),
  ('afnan.roslan@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Senawang'), 'Mohamad Afnan Bin Roslan (SH - Senawang)', 'fuad.mawardi@ninjavan.co'),
  ('zamrill.zamzuri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Seremban'), 'Ahmad Zamrill Nashriq Bin Zamzuri (FA - Seremban)', 'fuad.mawardi@ninjavan.co'),
  ('muhammad.irfan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Seremban'), 'Putera Muhammad Irfan (FA - Seremban)', 'fuad.mawardi@ninjavan.co'),
  ('daarshan.ramash@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Seremban'), 'Daarshan Kumar A/L Ramash (SH - Seremban)', 'fuad.mawardi@ninjavan.co'),
  ('norhisham.ahmad@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Tanjung Minyak'), 'Muhammad Norhisham Shafie Bin Ahmad (FA - Tanjung Minyak)', 'fuad.mawardi@ninjavan.co'),
  ('saifulnaim.shaari@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Tanjung Minyak'), 'Saiful Naim Bin Sha''ari (FA - Tanjung Minyak)', 'fuad.mawardi@ninjavan.co'),
  ('ali.zainal@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Tanjung Minyak'), 'Mohammad Ali Zainal Abedeen Bin Ab Rahman (SH - Tanjung Minyak)', 'fuad.mawardi@ninjavan.co'),
  ('afiq.jasmi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuala Selangor'), 'Mohd Afiq Bin Jasmi (FA - Kuala Selangor)', 'fuad.mawardi@ninjavan.co'),
  ('shukrie.khairie@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuala Selangor'), 'Muhammad Shukrie Bin Ahamad Khairie (FA - Kuala Selangor)', 'fuad.mawardi@ninjavan.co'),
  ('syamil.tahril@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kuala Selangor'), 'Ahmad Syamil Bin Ahmad Tahril (SH - Kuala Selangor)', 'fuad.mawardi@ninjavan.co'),
  ('amirul.mohammad@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Puncak Alam'), 'Mohamad ''Amirul Syafiq Bin Mohammad (FA - Puncak Alam)', 'fuad.mawardi@ninjavan.co'),
  ('zaki.sahir@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Puncak Alam'), 'Muhammad Zaki Bin Sahir (FA - Puncak Alam)', 'fuad.mawardi@ninjavan.co'),
  ('hanif.mazni@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Puncak Alam'), 'Mohammad Hanif Naufal Bin Mohd Mazni (SH - Puncak Alam)', 'fuad.mawardi@ninjavan.co'),
  ('saiful.sabri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Rantau Panjang'), 'Muhammad Saiful Azri Bin Che Mohd Sabri (FA - Rantau Panjang)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.kamarulzaman@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Rantau Panjang'), 'Muhammad Aiman Mukhriz Bin Kamarulzaman (FA - Rantau Panjang)', 'fuad.mawardi@ninjavan.co'),
  ('nurazuwan.mahadi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Rantau Panjang'), 'Muhammad Nurazuwan Bin Mahadi (SH - Rantau Panjang)', 'fuad.mawardi@ninjavan.co'),
  ('fadzlisham.suhaimi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Setia Alam'), 'Muhammad Fadzlisham Bin Suhaimi (FA - Setia Alam)', 'fuad.mawardi@ninjavan.co'),
  ('muhammadafiq.mazalan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Setia Alam'), 'Muhammad Afiq Bin Mazalan (FA - Setia Alam)', 'fuad.mawardi@ninjavan.co'),
  ('azwan.said@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Setia Alam'), 'Noor Azwan Bin Mohd Said (SH - Setia Alam)', 'fuad.mawardi@ninjavan.co'),
  ('nazirul.zulkafli@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sungai Besar'), 'Muhammad Nazirul Afiq Bin Mohd Zulkafli (FA - Sungai Besar)', 'fuad.mawardi@ninjavan.co'),
  ('farhan.azman2@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Sungai Besar'), 'Muhammad Farhan Bin Azman (SH - Sungai Besar)', 'fuad.mawardi@ninjavan.co'),
  ('firdaus.suferi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ara Damansara'), 'Muhammad Firdaus Bin Mohd Suferi (FA - Ara Damansara)', 'fuad.mawardi@ninjavan.co'),
  ('firdaus.fauzi2@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ara Damansara'), 'Mohamad Firdaus Bin Fauzi (FA - Ara Damansara)', 'fuad.mawardi@ninjavan.co'),
  ('eddy.shah@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Ara Damansara'), 'Mohammed Eddy Shah Bin Fakarudin (SH - Ara Damansara)', 'fuad.mawardi@ninjavan.co'),
  ('izriel.pisal@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bukit Rahman Putra'), 'Muhammad Izriel Izmal Bin Muhamad Pisal (FA - Bukit Rahman Putra)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.sahifulriza@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bukit Rahman Putra'), 'Aiman Nur Yasin Bin Sahifulriza (FA - Bukit Rahman Putra)', 'fuad.mawardi@ninjavan.co'),
  ('safiq.syafril@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bukit Rahman Putra'), 'Muhammad Safiq Bin Syafril (SH - Bukit Rahman Putra)', 'fuad.mawardi@ninjavan.co'),
  ('aziz.khan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kepong'), 'Aziz Khan (FA - Kepong)', 'fuad.mawardi@ninjavan.co'),
  ('fairuz.yaacob@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kepong'), 'Mohammad Fairuz Bin Yaacob (SH - Kepong)', 'fuad.mawardi@ninjavan.co'),
  ('azlan.sarif@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Mutiara Damansara'), 'Mohamad Azlan Bin Mohd Sarif (FA - Mutiara Damansara)', 'fuad.mawardi@ninjavan.co'),
  ('aisyah.saad@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Mutiara Damansara'), 'Aisyah Binti Saad (FA - Mutiara Damansara)', 'fuad.mawardi@ninjavan.co'),
  ('norazman.karim1@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Mutiara Damansara'), 'Norazman Bin Karim (SH - Mutiara Damansara)', 'fuad.mawardi@ninjavan.co'),
  ('haziq.husairi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Rawang'), 'Muhammad Haziq Haikal Bin Husairi (FA - Rawang)', 'fuad.mawardi@ninjavan.co'),
  ('adzlan.mohamadyusoff@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Rawang'), 'Adzlan Yusoff Bin Mohamad Yusoff (FA - Rawang)', 'fuad.mawardi@ninjavan.co'),
  ('azrul.azman@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Rawang'), 'Muhammad Azrul Bin Azman (SH - Rawang)', 'fuad.mawardi@ninjavan.co'),
  ('khairul.roges@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Subang'), 'Mohamad Khairul Fekriy Bin Mohd Ramadhan Roges (FA - Subang)', 'fuad.mawardi@ninjavan.co'),
  ('amirul.faris@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Subang'), 'Mohamad Amirul Amin Bin Mohd Faris David (FA - Subang)', 'fuad.mawardi@ninjavan.co'),
  ('shahril.hissham@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Subang'), 'Muhammad Shahril Bin Hissham (SH - Subang)', 'fuad.mawardi@ninjavan.co'),
  ('amirul.zamberi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kuala Kubu Baru'), 'Muhammad Amirul Bin Zamberi (FA - Kuala Kubu Baru)', 'fuad.mawardi@ninjavan.co'),
  ('jamal.azwie@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kuala Kubu Baru'), 'Muhammad Jamal Azwie Bin Mohd Johan (SH - Kuala Kubu Baru)', 'fuad.mawardi@ninjavan.co'),
  ('amierul.zuhide@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Segambut'), 'Amierul Akmal Bin Zuhide (SH - Segambut)', 'fuad.mawardi@ninjavan.co'),
  ('hakimi.sukari@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Selayang'), 'Muhammad Ikhmal Hakimi Bin Mohd Sukari (FA - Selayang)', 'fuad.mawardi@ninjavan.co'),
  ('farisamin.rasli@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Selayang'), 'Muhammad Faris Amin Bin Rasli (FA - Selayang)', 'fuad.mawardi@ninjavan.co'),
  ('suhail.azzahari@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Selayang'), 'Suhail Bin Azzahari (SH - Selayang)', 'fuad.mawardi@ninjavan.co'),
  ('adif.mohdafiqiqbal@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sentul'), 'Muhammad Adif Bin Mohd Afiq Iqbal (FA - Sentul)', 'fuad.mawardi@ninjavan.co'),
  ('ilham.aswin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sentul'), 'Muhammad Ilham Bin Aswin (FA - Sentul)', 'fuad.mawardi@ninjavan.co'),
  ('fahmi.kamsani@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sentul'), 'Muhammad Ariff Fahmi Bin Kamsani (FA - Sentul)', 'fuad.mawardi@ninjavan.co'),
  ('najib.halif@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Sentul'), 'Muhammad Najib Bin Halif (SH - Sentul)', 'fuad.mawardi@ninjavan.co'),
  ('mohammadshafiq.sapeei@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Chow Kit'), 'Mohammad Shafiq Bin Sapeei (FA - Chow Kit)', 'fuad.mawardi@ninjavan.co'),
  ('amirul.azlan@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Chow Kit'), 'Muhammad Amirul Asyraf Bin Azlan (SH - Chow Kit)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.alpin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Shamelin'), 'Aiman Firdaus Bin Alpin (FA - Shamelin)', 'fuad.mawardi@ninjavan.co'),
  ('norsafuwan.norazman@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Shamelin'), 'Muhamad Norsafuwan Bin Norazman (FA - Shamelin)', 'fuad.mawardi@ninjavan.co'),
  ('fitri.hassim@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Shamelin'), 'Mohammad Fitri Bin Hassim (SH - Shamelin)', 'fuad.mawardi@ninjavan.co'),
  ('zaidi.mokhtar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Wangsa Maju'), 'Mohd Zaidi Bin Mokhtar (FA - Wangsa Maju)', 'fuad.mawardi@ninjavan.co'),
  ('ashraf.rahmat@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Wangsa Maju'), 'Muhammad Ashraf Bin Rahmat (FA - Wangsa Maju)', 'fuad.mawardi@ninjavan.co'),
  ('hyder.nazlim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Wangsa Maju'), 'Hyder Hazry Bin Nazlim (FA - Wangsa Maju)', 'fuad.mawardi@ninjavan.co'),
  ('fasil.haruddin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Wangsa Maju'), 'Muhammad Fasil Zulfikar Bin Haruddin (SH - Wangsa Maju)', 'fuad.mawardi@ninjavan.co'),
  ('brian.edward@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Melawati'), 'Brian A/l Edward (FA - Melawati)', 'fuad.mawardi@ninjavan.co'),
  ('afiq.afifuddin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Melawati'), 'Afiq Afifuddin Bin Mohd Rodzi (FA - Melawati)', 'fuad.mawardi@ninjavan.co'),
  ('solehuddin.radzi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Melawati'), 'Solehuddin Bin Mohd Radzi (SH - Melawati)', 'fuad.mawardi@ninjavan.co'),
  ('muhamadasyraf.mustafar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ampang'), 'Muhamad Asyraf Bin Mustafar (FA - Ampang)', 'fuad.mawardi@ninjavan.co'),
  ('rufendy.musa1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Ampang'), 'Rufendy Bin Musa (FA - Ampang)', 'fuad.mawardi@ninjavan.co'),
  ('farah.aripin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Ampang'), 'Farah Aqilah Binti Md Aripin (SH - Ampang)', 'fuad.mawardi@ninjavan.co'),
  ('muqri.sham@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bandar Mahkota Cheras'), 'Mohamad Muqri Hakim Bin Radzly Sham (FA - Bandar Mahkota Cheras)', 'fuad.mawardi@ninjavan.co'),
  ('sahrul.ridwan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bandar Mahkota Cheras'), 'Sahrul Ridwan (FA - Bandar Mahkota Cheras)', 'fuad.mawardi@ninjavan.co'),
  ('areff.mahdi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bandar Mahkota Cheras'), 'Mohd Arieff Bin Mahdi (SH - Bandar Mahkota Cheras)', 'fuad.mawardi@ninjavan.co'),
  ('mohd.nazirom@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bandar Tun Razak'), 'Mohd Faizal Bin Nazirom (FA - Bandar Tun Razak)', 'fuad.mawardi@ninjavan.co'),
  ('aliff.rosidy@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bandar Tun Razak'), 'Mohamad Aliff Ridzwan Bin Mohd Rosidy (FA - Bandar Tun Razak)', 'fuad.mawardi@ninjavan.co'),
  ('norman.razak@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bandar Tun Razak'), 'Norman Haiqal bin Ab Razak (FA - Bandar Tun Razak)', 'fuad.mawardi@ninjavan.co'),
  ('ameer.jasni@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bandar Tun Razak'), 'Muhamad Ameer Bin Jasni (SH - Bandar Tun Razak)', 'fuad.mawardi@ninjavan.co'),
  ('farid.hakim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Cheras'), 'Muhd Farid Hakim Bin Mohd Jaafar (FA - Cheras)', 'fuad.mawardi@ninjavan.co'),
  ('shahzwan.haikal@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Cheras'), 'Muhammad Shahzwan Haikal Bin Mohamad Roffli (FA - Cheras)', 'fuad.mawardi@ninjavan.co'),
  ('fauzul.ahmad@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Cheras'), 'Ahmad Fauzul Azim Bin Sager Ahmad (SH - Cheras)', 'fuad.mawardi@ninjavan.co'),
  ('harith.huzairi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Taman Mega Jaya'), 'Harith Akmal Bin Huzairi (FA - Taman Mega Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('muhammad.isa@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Taman Mega Jaya'), 'Muhammad Zaid Bin Mat Isa (FA - Taman Mega Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('firdaus.hadi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Taman Mega Jaya'), 'Muhammad Firdaus Bin Abdul Hadi (SH - Taman Mega Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('azmil.rosdan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bangi'), 'Datu Azmil Bin Rosdan (FA - Bangi)', 'fuad.mawardi@ninjavan.co'),
  ('affieq.ridzuan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bangi'), 'Muhammad Affieq Aiman Bin Mohammad Ridzuan (FA - Bangi)', 'fuad.mawardi@ninjavan.co'),
  ('fahmi.fuad@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bangi'), 'Muhammad Fahmi Bin Mohd Fuad (SH - Bangi)', 'fuad.mawardi@ninjavan.co'),
  ('fathul.nazarudin@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kajang'), 'Muhammad Fathul Afiq Bin Nazarudin (FA - Kajang)', 'fuad.mawardi@ninjavan.co'),
  ('mustafa.daniar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kajang'), 'Mustafa Daniar Bin Hassan (FA - Kajang)', 'fuad.mawardi@ninjavan.co'),
  ('zul.haris@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kajang'), 'Mohd Zul Halili Bin Haris (SH - Kajang)', 'fuad.mawardi@ninjavan.co'),
  ('izmi.aiza@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Salak Tinggi'), 'Muhammad Izmi Aiza Bin Rusdi (FA - Salak Tinggi)', 'fuad.mawardi@ninjavan.co'),
  ('muizzuddin.daud@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Salak Tinggi'), 'Mohd Muizzuddin Rusyaidi Bin Daud (FA - Salak Tinggi)', 'fuad.mawardi@ninjavan.co'),
  ('abdul.hadi@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Salak Tinggi'), 'Abdul Hadi Bin Jamaludin Afghani (SH - Salak Tinggi)', 'fuad.mawardi@ninjavan.co'),
  ('izzuan.ayob@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Semenyih'), 'Mohd Izzuan Bin Ayob (FA - Semenyih)', 'fuad.mawardi@ninjavan.co'),
  ('thaqif.hidzir@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Semenyih'), 'Muhammad Thaqif Bin Hidzir (FA - Semenyih)', 'fuad.mawardi@ninjavan.co'),
  ('noramin.mohammadzani@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Semenyih'), 'Mohammad Nor Amin Bin Mohammad Zani (FA - Semenyih)', 'fuad.mawardi@ninjavan.co'),
  ('najmuddin.khalib@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Semenyih'), 'Muhammad Najmuddin Bin Khalib (SH - Semenyih)', 'fuad.mawardi@ninjavan.co'),
  ('farhan.hashim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Serdang'), 'Mohammad Farhan Bin Nor Hashim (FA - Serdang)', 'fuad.mawardi@ninjavan.co'),
  ('azwan.ramli@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Serdang'), 'Mohammad Azwan Bin Ramli (FA - Serdang)', 'fuad.mawardi@ninjavan.co'),
  ('ahmad.hazlan@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Serdang'), 'Ahmad Syaiful Bin Hazlan (SH - Serdang)', 'fuad.mawardi@ninjavan.co'),
  ('alif.hisham@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bangsar'), 'Muhamad Alif Hakimi Bin Hisham (FA - Bangsar)', 'fuad.mawardi@ninjavan.co'),
  ('amiruddin.anzmi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Bangsar'), 'Muhammad Amiruddin Bin Mohd Anzmi (FA - Bangsar)', 'fuad.mawardi@ninjavan.co'),
  ('wanahmadaiman.othman@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Bangsar'), 'Wan Ahmad Aiman Bin Wan Othman (SH - Bangsar)', 'fuad.mawardi@ninjavan.co'),
  ('muhammad.syahmin1@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Oug'), 'Muhammad Syahmin (FA - Oug)', 'fuad.mawardi@ninjavan.co'),
  ('rusdi.abdullah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Oug'), 'Mohd Rusdi Bin Abdullah (FA - Oug)', 'fuad.mawardi@ninjavan.co'),
  ('jenang.acheng@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Oug'), 'Jenang Anak Acheng (FA - Oug)', 'fuad.mawardi@ninjavan.co'),
  ('aiman.redhuwan@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Oug'), 'Muhammad Aiman Izwan Bin Redhuwan (SH - Oug)', 'fuad.mawardi@ninjavan.co'),
  ('qayyum.jamal@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Petaling Jaya'), 'Ahmad Qayyum Bin Ahmad Jamal (FA - Petaling Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('nurrusydiah.abdullah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Petaling Jaya'), 'Nurrusydiah Binti Abdullah (FA - Petaling Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('farhan.kodari@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Petaling Jaya'), 'Muhammad Amir Farhan Bin Mohammad Kodari (SH - Petaling Jaya)', 'fuad.mawardi@ninjavan.co'),
  ('syariff.sukri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sunway'), 'Ahmad Syariff Bin Ahmad Sukri (FA - Sunway)', 'fuad.mawardi@ninjavan.co'),
  ('hamzah.isa@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Sunway'), 'Hamzah Bin Isa (FA - Sunway)', 'fuad.mawardi@ninjavan.co'),
  ('adam.azrin@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Sunway'), 'Adam Bin Azrin (SH - Sunway)', 'fuad.mawardi@ninjavan.co'),
  ('kamarul.zain@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Taman Desa'), 'Kamarul Lokman Hakim Bin Md Zain (FA - Taman Desa)', 'fuad.mawardi@ninjavan.co'),
  ('addin.johari@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Taman Desa'), 'Muhammad Addin Bin Johari (FA - Taman Desa)', 'fuad.mawardi@ninjavan.co'),
  ('majid.sajari@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Taman Desa'), 'Abdul Majid Bin Mohammad Sajari (SH - Taman Desa)', 'fuad.mawardi@ninjavan.co'),
  ('arif.ramzi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Cyberjaya'), 'Muhamad Arif Hamdi Bin Muhamad Ramzi (FA - Cyberjaya)', 'fuad.mawardi@ninjavan.co'),
  ('nazman.ramlan@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Cyberjaya'), 'Ahmad Nazman Bin Ramlan (FA - Cyberjaya)', 'fuad.mawardi@ninjavan.co'),
  ('arif.zakri@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Cyberjaya'), 'Muhammad Arif Bin Zakri (SH - Cyberjaya)', 'fuad.mawardi@ninjavan.co'),
  ('saiful.hizam@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Kemuning'), 'Saiful Adam Bin Nik Khairul Hizam (FA - Kota Kemuning)', 'fuad.mawardi@ninjavan.co'),
  ('azraei.mohdanuar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Kemuning'), 'Muhammad Azraei Najmi Bin Mohd Anuar (FA - Kota Kemuning)', 'fuad.mawardi@ninjavan.co'),
  ('aelfaiez.wananuar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Kota Kemuning'), 'Wan Aelfaiez Nur Bin Wan Anuar (FA - Kota Kemuning)', 'fuad.mawardi@ninjavan.co'),
  ('rafiqi.w.rukman@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Kota Kemuning'), 'Wan Muhammad Rafiqi Bin W.Rukman (SH - Kota Kemuning)', 'fuad.mawardi@ninjavan.co'),
  ('aaron.abdullah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Puchong'), 'Aaron Amin Syibli Bin Abdullah (FA - Puchong)', 'fuad.mawardi@ninjavan.co'),
  ('nuridzham.sayuji@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Puchong'), 'Mohammad Nuridzham Bin Mohd Sayuji (FA - Puchong)', 'fuad.mawardi@ninjavan.co'),
  ('iqzzat.norhas@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Puchong'), 'Muhammad Iqzzat Bin Norhas (SH - Puchong)', 'fuad.mawardi@ninjavan.co'),
  ('amin.ibrahim@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Shah Alam'), 'Muhammad Amin Bin Ibrahim (FA - Shah Alam)', 'fuad.mawardi@ninjavan.co'),
  ('syamil.abdullah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Shah Alam'), 'Muhammad Syamil Bin Abdullah (FA - Shah Alam)', 'fuad.mawardi@ninjavan.co'),
  ('zulkarnain.dollah@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Shah Alam'), 'Mohammad Zulkarnain Bin Dollah (FA - Shah Alam)', 'fuad.mawardi@ninjavan.co'),
  ('haiqal.gani@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Shah Alam'), 'Muhammad Haiqal Bin Dollah Gani (SH - Shah Alam)', 'fuad.mawardi@ninjavan.co'),
  ('hayad.jamian@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Banting'), 'Muhammad Noor Hayad Bin Jamian (FA - Banting)', 'fuad.mawardi@ninjavan.co'),
  ('firdaus.raman@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Banting'), 'Mohd Firdaus Bin Abdul Raman (SH - Banting)', 'fuad.mawardi@ninjavan.co'),
  ('azrul.iswandy@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Botanik'), 'Azrul Amali Bin Iswandy (FA - Botanik)', 'fuad.mawardi@ninjavan.co'),
  ('izwanshah.iskandar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Botanik'), 'Izwanshah Bin Iskandar (FA - Botanik)', 'fuad.mawardi@ninjavan.co'),
  ('hakimm.amizon@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Botanik'), 'Muhammad Hakimm Alhafiz Bin Amizon (SH - Botanik)', 'fuad.mawardi@ninjavan.co'),
  ('haiman.suhaimi@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Klang'), 'Arif Haiman Bin Suhaimi (FA - Klang)', 'fuad.mawardi@ninjavan.co'),
  ('muhammad.jeffri@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Klang'), 'Muhammad Daniel Bin Jeffri (FA - Klang)', 'fuad.mawardi@ninjavan.co'),
  ('muzaffar.zamri@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Klang'), 'Muzaffar Azraf Bin Zamri (SH - Klang)', 'fuad.mawardi@ninjavan.co'),
  ('hafiz.anuar@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Port Klang'), 'Muhammad Hafiz Bin Anuar (FA - Port Klang)', 'fuad.mawardi@ninjavan.co'),
  ('shahmin.mohamadali@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Port Klang'), 'Mohamad Shahmin Bin Mohamad Ali (FA - Port Klang)', 'fuad.mawardi@ninjavan.co'),
  ('nurilham.zulkifli@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Port Klang'), 'Mohammad Nurilham Bin Zulkifli (SH - Port Klang)', 'fuad.mawardi@ninjavan.co'),
  ('danish.luqman@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Rimbayu'), 'Mohd Danish Bin Luqman Loke (FA - Rimbayu)', 'fuad.mawardi@ninjavan.co'),
  ('naim.najib@ninjavan.co', 'fleet_assistant', 'station', JSON_ARRAY('Rimbayu'), 'Muhammad Naim Fikri Bin Mad Najib (FA - Rimbayu)', 'fuad.mawardi@ninjavan.co'),
  ('mazli.yahya@ninjavan.co', 'station_head', 'station', JSON_ARRAY('Rimbayu'), 'Mazli Shah Bin Yahya (SH - Rimbayu)', 'fuad.mawardi@ninjavan.co');
UPDATE users SET display_name = CASE LOWER(email)
    WHEN 'zahirudin.zainal@ninjavan.co' THEN 'Zahirudin Bin Zainal (FA - Bentong)'
    WHEN 'hazieq.haznan@ninjavan.co' THEN 'Mohd Hazieq Aieman Bin Haznan (SH - Bentong)'
    WHEN 'izwan.haron@ninjavan.co' THEN 'Syed Izwan Hafiz Bin Syed Haron (FA - Gambang)'
    WHEN 'syahmi.sabri@ninjavan.co' THEN 'Muhammad Syahmi Rukaini Bin Md Sabri (SH - Gambang)'
    WHEN 'haziq.lajis@ninjavan.co' THEN 'Muhammad Haziq Bin Md Lajis (FA - Jengka)'
    WHEN 'aliff.azizan@ninjavan.co' THEN 'Aliff Nizamuddin Bin Azizan (SH - Jengka)'
    WHEN 'hadzrin.samsudin@ninjavan.co' THEN 'Muhammad Hadzrin Bin Samsudin (FA - Jerantut)'
    WHEN 'muhammad.annuar@ninjavan.co' THEN 'Muhammad Bin Mohamad Annuar (SH - Jerantut)'
    WHEN 'ain.ishak@ninjavan.co' THEN 'Ain Najiyah Binti Ishak (FA - Kuala Lipis)'
    WHEN 'fahim.fadhli@ninjavan.co' THEN 'Muhamad Fahim Bin Muhamad Fadhli (SH - Kuala Lipis)'
    WHEN 'ridhuan.azhar@ninjavan.co' THEN 'Muhammad Ridhuan Mohamed @ Azhar (FA - Kuantan)'
    WHEN 'aiman.halim@ninjavan.co' THEN 'Muhammad Aiman Bin Abdul Halim (FA - Kuantan)'
    WHEN 'amirul.mazlan@ninjavan.co' THEN 'Mohd Amirul Hafizi Bin Mazlan (FA - Kuantan)'
    WHEN 'fatin.zainuddin@ninjavan.co' THEN 'Fatin Farihah Binti Zainuddin (SH - Kuantan)'
    WHEN 'afi.wanrazali@ninjavan.co' THEN 'Wan Muhamad Afi Izzuddin Bin Wan Razali (FA - Muadzam Shah)'
    WHEN 'fadhli.zahari@ninjavan.co' THEN 'Muhammad Nur Fadhli Bin Zahari (SH - Muadzam Shah)'
    WHEN 'idlan.darus@ninjavan.co' THEN 'Mohamad Idlan Faiz Bin Mohamad Darus (FA - Pekan)'
    WHEN 'farhana.zainuddin@ninjavan.co' THEN 'Nur Farhana Binti Zainuddin (SH - Pekan)'
    WHEN 'shahiran.jamizan@ninjavan.co' THEN 'Muhamad Shahiran Bin Jamizan (FA - Raub)'
    WHEN 'asyraf.rahmat@ninjavan.co' THEN 'Muhamad Asyraf Bin Rahmat (SH - Raub)'
    WHEN 'sufian.mohdzairi@ninjavan.co' THEN 'Mohammad Sufian Bin Mohd Zairi (FA - Rompin)'
    WHEN 'ain.sezali@ninjavan.co' THEN 'Nor''Ain Binti Sezali (SH - Rompin)'
    WHEN 'aizat.khairulnazri@ninjavan.co' THEN 'Ahmad Aizat Bin Khairul Nazri (FA - Temerloh)'
    WHEN 'ridzuan.ludin@ninjavan.co' THEN 'Mohamad Ridzuan Bakri Bin Mohd Ludin (SH - Temerloh)'
    WHEN 'faratul.hakimi@ninjavan.co' THEN 'Faratul Isna Binti Hakimi (FA - Triang)'
    WHEN 'ridzuan.salam@ninjavan.co' THEN 'Mohd Ridzuan Bin Abdul Salam (SH - Triang)'
    WHEN 'nazreen.mohd@ninjavan.co' THEN 'Ahmad Nazreen Bin Mohd (FA - Ajil)'
    WHEN 'syed.aluwi@ninjavan.co' THEN 'Syed Mohd Saifuldin Bin Syed Aluwi (SH - Ajil)'
    WHEN 'nasrul.nizam@ninjavan.co' THEN 'Ahmad Nasrul Nizam Bin Nassiruddin (FA - Bukit Payong)'
    WHEN 'naim.nor@ninjavan.co' THEN 'Muhammad Naim Bin Mohd Nor (FA - Bukit Payong)'
    WHEN 'ahmad.syakir@ninjavan.co' THEN 'Ahmad Syakir Bin Manti @ Mahadi (SH - Bukit Payong)'
    WHEN 'rahim.nor@ninjavan.co' THEN 'Abdul Rahim Bin Mohd Nor (FA - Chukai)'
    WHEN 'mohammad.abdullah@ninjavan.co' THEN 'Mohammad Aiman Bin Abdullah (FA - Chukai)'
    WHEN 'khaizuran.bakhril@ninjavan.co' THEN 'Mohammad Khaizuran Bin Bakhril (SH - Chukai)'
    WHEN 'haniff.hamasakee@ninjavan.co' THEN 'Mohd Haniff Bin Hamasakee (FA - Dungun)'
    WHEN 'hakimi.mohamad@ninjavan.co' THEN 'Hakimi bin Mohamad (SH - Dungun)'
    WHEN 'zukri.jalil@ninjavan.co' THEN 'Mohd Zukri Bin Abd Jalil (FA - Gong Badak)'
    WHEN 'zaim.adnan@ninjavan.co' THEN 'Muhd Zaim Hamidi Bin Adnan (FA - Gong Badak)'
    WHEN 'nursalam.rusli@ninjavan.co' THEN 'Muhammad Nursalam bin Rusli (SH - Gong Badak)'
    WHEN 'haris.setapa@ninjavan.co' THEN 'Nik Mohd Haris Bin Nik Setapa (FA - Jerteh)'
    WHEN 'hazim.firdaus@ninjavan.co' THEN 'Mohd Hazim Firdaus Bin Idris (SH - Jerteh)'
    WHEN 'adam.saidi@ninjavan.co' THEN 'Muhammad Adam Ikhwan Bin Md Saidi (FA - Marang)'
    WHEN 'syahrir.sulaiman@ninjavan.co' THEN 'Tengku Ahmad Syahrir Bin Tengku Sulaiman (SH - Marang)'
    WHEN 'razin.zamri@ninjavan.co' THEN 'Muhammad Razin Zakwan Bin Zamri (FA - Paka)'
    WHEN 'hafizi.jalil@ninjavan.co' THEN 'Muhammad Hafizi Bin Abdul Jalil (SH - Paka)'
    WHEN 'syahrul.husin@ninjavan.co' THEN 'Mohd Syahrul Izwan Bin Husin (FA - Setiu)'
    WHEN 'ahmad.fahmie@ninjavan.co' THEN 'Ahmad Fahmie Bin Mat Nasir (SH - Setiu)'
    WHEN 'izamudin.izlan@ninjavan.co' THEN 'Mohamad Izamudin Haziq Bin Izlan (FA - Bachok)'
    WHEN 'khairul.ali@ninjavan.co' THEN 'Khairul Azry Bin Md Ali (SH - Bachok)'
    WHEN 'nabil.aziz@ninjavan.co' THEN 'Ku Muhammad Nabil Bin Ku Aziz (FA - Gua Musang)'
    WHEN 'rizal.saod@ninjavan.co' THEN 'Mohd Rizal Bin Saod (SH - Gua Musang)'
    WHEN 'ahmad.marzuki@ninjavan.co' THEN 'Ahmad Ariff Bin Marzuki (FA - Ketereh)'
    WHEN 'ahmad.affan@ninjavan.co' THEN 'Ahmad Affan Bin Shamsuri (SH - Ketereh)'
    WHEN 'shazaril.shukri@ninjavan.co' THEN 'Shazaril Shafrie Bin Shukri (FA - Kota Bharu)'
    WHEN 'ihsan.mazli@ninjavan.co' THEN 'Muhammad Ihsan Bin Mazli (FA - Kota Bharu)'
    WHEN 'zihni.zamani@ninjavan.co' THEN 'Muhammad Zihni Bin Zamani (SH - Kota Bharu)'
    WHEN 'nabil.ahkram@ninjavan.co' THEN 'Muhammad Nabil Ahkram Bin Mohd Zawawi (FA - Kuala Krai)'
    WHEN 'hanif.idrus@ninjavan.co' THEN 'Mohamad Hanif Bin Idrus (SH - Kuala Krai)'
    WHEN 'afif.aljafry@ninjavan.co' THEN 'Mohd Afif Shahrizad Bin Aljafry (FA - Machang)'
    WHEN 'azrul.baharuddin@ninjavan.co' THEN 'Muhammad Azrul Bin Baharuddin (FA - Machang)'
    WHEN 'farhan.ikhwan@ninjavan.co' THEN 'Farhan Ikhwan Bin Johari Ariffin (SH - Machang)'
    WHEN 'khairudin.asri@ninjavan.co' THEN 'Mohd Khairudin Bin Mohd Asri (FA - Pasir Mas)'
    WHEN 'azrin.hamid@ninjavan.co' THEN 'Muhammad Azrin Bin Hamid (SH - Pasir Mas)'
    WHEN 'amirul.rushdan@ninjavan.co' THEN 'Wan Amirul Afnan Bin Wan Rushdan (FA - Pasir Puteh)'
    WHEN 'chin.shen@ninjavan.co' THEN 'Lau Chin Shen (SH - Pasir Puteh)'
    WHEN 'amir.afizan@ninjavan.co' THEN 'Muhamad Amir Afizan Bin Abdullah (FA - Wakaf Bharu)'
    WHEN 'syahrul.muhamad@ninjavan.co' THEN 'Muhamad Syahrul Azwan Bin Muhamad (FA - Wakaf Bharu)'
    WHEN 'esmat.fahmi@ninjavan.co' THEN 'Mohamad Esmat Fahmi Bin Rahim (SH - Wakaf Bharu)'
    WHEN 'ammar.ismail@ninjavan.co' THEN 'Mohd Ammar Muftar Bin Ismail (FA - Beaufort)'
    WHEN 'norathirah.jusli@ninjavan.co' THEN 'Norathirah Binti Jusli (SH - Beaufort)'
    WHEN 'jaidi.ghani@ninjavan.co' THEN 'Jaidi Bin Abd Ghani (FA - Inanam)'
    WHEN 'fajilah.ismail1@ninjavan.co' THEN 'Nurfajilah Binti Ismail (FA - Inanam)'
    WHEN 'shahrizal.akmat@ninjavan.co' THEN 'Datu Shahrizal Bin Datu Akmat (SH - Inanam)'
    WHEN 'malwanraj.malik@ninjavan.co' THEN 'Malwanraj Malik (FA - Keningau)'
    WHEN 'azianaazinda.azmie@ninjavan.co' THEN 'Nor Aziana Aznida Binti Azmie (SH - Keningau)'
    WHEN 'azniezah.nordin1@ninjavan.co' THEN 'Noor Azniezah Binti Nordin (FA - Labuan)'
    WHEN 'redzuan.maidin@ninjavan.co' THEN 'Redzuan Bin Maidin (SH - Labuan)'
    WHEN 'zulhisyam.eli@ninjavan.co' THEN 'Muhammad Zulhisyam Bin Eli @ Zulkipli (FA - Papar)'
    WHEN 'asyraf.taip@ninjavan.co' THEN 'Muhammad Asyraf Bin Taip (SH - Papar)'
    WHEN 'iven.anthony2@ninjavan.co' THEN 'Iven Anthony (FA - Penampang)'
    WHEN 'afdhal.azamuddin@ninjavan.co' THEN 'Afdhal Amirul Bin Azamuddin (FA - Penampang)'
    WHEN 'eldon.tang@ninjavan.co' THEN 'Eldon Tang Kiok Huat (SH - Penampang)'
    WHEN 'deniver.jupirin@ninjavan.co' THEN 'Deniver Jupirin (FA - Sepanggar)'
    WHEN 'aisyam.baharudin@ninjavan.co' THEN 'Mohamad Aisyam Bin Baharudin (SH - Sepanggar)'
    WHEN 'khairilanwar.suhaili@ninjavan.co' THEN 'Khairil Anwar Bin Suhaili (FA - Sepanggar)'
    WHEN 'sahirul.sadah@ninjavan.co' THEN 'Sahirul Bin Sadah (FA - Tuaran)'
    WHEN 'debbrolryne.jupirin@ninjavan.co' THEN 'Debbrolryne Jupirin (SH - Tuaran)'
    WHEN 'mohd.mahadir@ninjavan.co' THEN 'Mohd Mahadir Bin Azman (FA - Kota Kinabatangan)'
    WHEN 'mdfazly.darong@ninjavan.co' THEN 'M.d Fazly Bin Darong (SH - Kota Kinabatangan)'
    WHEN 'syazwansaufi.irwanto@ninjavan.co' THEN 'Mohd Syazwan Saufi Bin Irwanto (SH - Lahad Datu)'
    WHEN 'fahmi.shaiffuddin@ninjavan.co' THEN 'Pg Haniff Fahmi B Pg Omar Ali Shaiffuddin (FA - Sandakan)'
    WHEN 'hermogenes.friasjr@ninjavan.co' THEN 'Hermogenes Frias Jr (FA - Sandakan)'
    WHEN 'rustam.baharon@ninjavan.co' THEN 'Mohd Rustam Bin Baharon (SH - Sandakan)'
    WHEN 'norasmah.madjaraha@ninjavan.co' THEN 'Norasmah Binti Madjaraha (FA - Semporna)'
    WHEN 'nizam.kassim@ninjavan.co' THEN 'Mohamad Nizam Bin Abu Kassim (SH - Semporna)'
    WHEN 'izwan.zulkornai@ninjavan.co' THEN 'Izwan Bin Zulkornai (FA - Tawau)'
    WHEN 'azlan.mohammad@ninjavan.co' THEN 'Azlan bin Mohammad (SH - Tawau)'
    WHEN 'muqzamir.ahmad2@ninjavan.co' THEN 'Muqzamir Bin Ahmad (FA - Batu Kawa)'
    WHEN 'aidilshazwan.azamri@ninjavan.co' THEN 'Aidil Shazwan Bin Azamri (FA - Batu Kawa)'
    WHEN 'fazlin.mamin@ninjavan.co' THEN 'Noorfazlin binti Mamin (SH - Batu Kawa)'
    WHEN 'syafiq.zainal1@ninjavan.co' THEN 'Syafiq Bin Zainal Abidin (FA - Kuching)'
    WHEN 'angelina.biddy@ninjavan.co' THEN 'Angelina Michelle Anak Biddy (SH - Kuching)'
    WHEN 'lencaster.inyau@ninjavan.co' THEN 'Lencaster Inyau (FA - Petra Jaya)'
    WHEN 'amirul.malik@ninjavan.co' THEN 'Amirul Afiq Bin Abdul Malik (FA - Petra Jaya)'
    WHEN 'saifullah.zalmy@ninjavan.co' THEN 'Mohamad Nik Saifullah Bin Mohamad Zalmy (SH - Petra Jaya)'
    WHEN 'hafizzah.zainal@ninjavan.co' THEN 'Sharifah Hafizzah Binti Tuanku Zainal (FA - Samarahan)'
    WHEN 'mohammadalhafiz.ahmadriduan@ninjavan.co' THEN 'Mohammad Al-Hafiz Bin Ahmad Riduan (FA - Samarahan)'
    WHEN 'waie.aziz@ninjavan.co' THEN 'Mohd Wa''ie Bin Aziz (SH - Samarahan)'
    WHEN 'nurulain.wahid@ninjavan.co' THEN 'Nurulain Wahidah Binti Wahid (FA - Bintulu)'
    WHEN 'asfa.yusoff@ninjavan.co' THEN 'Muhammad Asfa Harith Bin Yusoff (SH - Bintulu)'
    WHEN 'kevin.malim1@ninjavan.co' THEN 'Kevin Roy Anak Malim (FA - Miri)'
    WHEN 'dyevin.john@ninjavan.co' THEN 'Dyevin John (SH - Miri)'
    WHEN 'faizul.sauti@ninjavan.co' THEN 'Faizul Bin Sauti (SH - Saratok)'
    WHEN 'qairul.romi@ninjavan.co' THEN 'Qairul Hakim Bin Romi (FA - Sibu)'
    WHEN 'francis.li1@ninjavan.co' THEN 'Francis Anak Li (FA - Sibu)'
    WHEN 'garcia.ulie@ninjavan.co' THEN 'Garcia Anak Ulie (SH - Sibu)'
    WHEN 'hanis.daud@ninjavan.co' THEN 'Nur Hanis Binti Daud (FA - Alor Setar)'
    WHEN 'hafiz.khadib@ninjavan.co' THEN 'Muhammad Hafiz Fahmi Bin Abdul Khadib (FA - Alor Setar)'
    WHEN 'mohd.husaini1@ninjavan.co' THEN 'Mohd Husaini Bin Nasir (SH - Alor Setar)'
    WHEN 'shazmil.noh@ninjavan.co' THEN 'Mohd Syazmil Bin Md Noh (FA - Baling)'
    WHEN 'syaifullah.hamid@ninjavan.co' THEN 'Mohd Syaifullah Bin Hamid (FA - Baling)'
    WHEN 'zaideen.ahmad@ninjavan.co' THEN 'Zaideen Bin Ahmad (SH - Baling)'
    WHEN 'anuar.wahab@ninjavan.co' THEN 'Anuar Bin Abdul Wahab (FA - Gurun)'
    WHEN 'hakiim.manan@ninjavan.co' THEN 'Abdul Hakiim Bin Abd Manan (FA - Gurun)'
    WHEN 'khairil.najmi@ninjavan.co' THEN 'Khairil Najmi Bin Isa (SH - Gurun)'
    WHEN 'hairul.anuar@ninjavan.co' THEN 'Hairul Nassharudin Bin Anuar (FA - Jitra)'
    WHEN 'fadhril.ghazali@ninjavan.co' THEN 'Muhammad Fadhril Bin Ghazali (FA - Jitra)'
    WHEN 'rassul.rohani@ninjavan.co' THEN 'Mohammad Rassul Bin Rohani (SH - Jitra)'
    WHEN 'faizal.shukri@ninjavan.co' THEN 'Faizal Hamdi Bin Ahmad Shukri (FA - Kangar)'
    WHEN 'faris.fakhruddin@ninjavan.co' THEN 'Muhammad Faris Bin Fakhruddin (FA - Kangar)'
    WHEN 'sharol.azri@ninjavan.co' THEN 'Sharol Azri Bin Halim (SH - Kangar)'
    WHEN 'shamsuri.shamsudin@ninjavan.co' THEN 'Muhamad Nur Shamsuri Bin Shamsudin (FA - Kulim)'
    WHEN 'zameri.liki@ninjavan.co' THEN 'Mohd Zameri Bin Mat Liki (FA - Kulim)'
    WHEN 'shaffiq.nadzri@ninjavan.co' THEN 'Mohammad Shaffiq Bin Mohammad Nadzri (SH - Kulim)'
    WHEN 'amirulfarhan.azizi@ninjavan.co' THEN 'Amirulfarhan Bin Azizi (FA - Langkawi)'
    WHEN 'faqrul.rodzi@ninjavan.co' THEN 'Mohd Faqrul Rodzi Bin Abidin (SH - Langkawi)'
    WHEN 'asyraf.shaari@ninjavan.co' THEN 'Muhd Asyraf Bin Shaari (FA - Pendang)'
    WHEN 'syafiq.suferi@ninjavan.co' THEN 'Mohd Syafiq Bin Mohd Suferi (SH - Pendang)'
    WHEN 'yusuf.ghazali1@ninjavan.co' THEN 'Ahmad Yusuf Bin Ahmad Ghazali (FA - Pokok Sena)'
    WHEN 'syahril.shamsudin@ninjavan.co' THEN 'Syahrilnizam Fitri Bin Shamsudin (SH - Pokok Sena)'
    WHEN 'daud.nasir@ninjavan.co' THEN 'Muhammad Daud Bin Mohd Nasir (FA - Sungai Petani)'
    WHEN 'dinie.othman@ninjavan.co' THEN 'Dinie Bin Othman (FA - Sungai Petani)'
    WHEN 'ihsan.nasir@ninjavan.co' THEN 'Muhammad Ihsan Bin Mohamad Nasir (SH - Sungai Petani)'
    WHEN 'syazwan.hazim@ninjavan.co' THEN 'Muhammad Syazwan Hazim Bin Mohamad Zubir (FA - Bayan Lepas)'
    WHEN 'akram.rahim@ninjavan.co' THEN 'Muhammad Akram bin Ab Rahim (FA - Bayan Lepas)'
    WHEN 'farizwan.akhir@ninjavan.co' THEN 'Farizwan Bin Che Md Akhir (SH - Bayan Lepas)'
    WHEN 'khairul.zamri@ninjavan.co' THEN 'Muhammad Khairul Hijazi Bin Muhammad Zamri (FA - Bukit Mertajam)'
    WHEN 'haikal.abdrazak@ninjavan.co' THEN 'Mohamad Haikal Bin Abd Razak (FA - Bukit Mertajam)'
    WHEN 'fitri.rodzi@ninjavan.co' THEN 'Mohamad Fitri Bin Rodzi (SH - Bukit Mertajam)'
    WHEN 'aliff.rosli@ninjavan.co' THEN 'Muhammad Aliff Firdaus Bin Rosli (FA - Butterworth)'
    WHEN 'hadirah.nasrin1@ninjavan.co' THEN 'Nur Hadirah Binti Mohd Nasrin (FA - Butterworth)'
    WHEN 'azri.azhar@ninjavan.co' THEN 'Muhamad Azri Bin Azhar (SH - Butterworth)'
    WHEN 'aufa.zainal@ninjavan.co' THEN 'Muhammad Aufa Mukhriz Bin Zainal Abidin (FA - Farlim)'
    WHEN 'faiz.nasir@ninjavan.co' THEN 'Ahmad Faiz Najmi Bin Mohamad Nasir (FA - Farlim)'
    WHEN 'hasanizal.othman@ninjavan.co' THEN 'Ahmad Hasanizal Bin Othman (SH - Farlim)'
    WHEN 'hafiz.zamri1@ninjavan.co' THEN 'Muhammad Hafiz Bin Zamri (FA - Georgetown)'
    WHEN 'imran.ruslan@ninjavan.co' THEN 'Muhamad Al Imran Bin Ruslan (FA - Georgetown)'
    WHEN 'mohdsalehudeen.hairulanuar@ninjavan.co' THEN 'Mohd Salehudeen Bin Hairul Anuar (SH - Georgetown)'
    WHEN 'siddhiq.saman@ninjavan.co' THEN 'Muhammad Siddhiq Bin Abu Saman (FA - Kepala Batas)'
    WHEN 'rusydan.awangdamit@ninjavan.co' THEN 'Awang Nur Rusydan Bin Awang Damit (FA - Kepala Batas)'
    WHEN 'adam.abdullah@ninjavan.co' THEN 'Mohamad Adam Bin Abdullah (SH - Kepala Batas)'
    WHEN 'prem.sinitharan@ninjavan.co' THEN 'Prem A/l Sinitharan (FA - Simpang Ampat)'
    WHEN 'ikram.omar@ninjavan.co' THEN 'Muhamad Ikram Bin Omar (FA - Simpang Ampat)'
    WHEN 'aiman.aziz@ninjavan.co' THEN 'Aiman Bin Aziz (SH - Simpang Ampat)'
    WHEN 'hafizzuddin.nasir@ninjavan.co' THEN 'Muhammad Nurhafizzuddin Bin Mohamed Nasir (FA - Bagan Serai)'
    WHEN 'aiman.sofian@ninjavan.co' THEN 'Muhammad Nur Aiman Hakim Bin Sofian (FA - Bagan Serai)'
    WHEN 'adam.haris@ninjavan.co' THEN 'Muhammad Adam Bin Haris (SH - Bagan Serai)'
    WHEN 'azreenshahrizal.hawari@ninjavan.co' THEN 'Azreen Shahrizal Bin Hawari (FA - Batu Gajah)'
    WHEN 'imran.rashidi@ninjavan.co' THEN 'Muhammad Imran Bin Mhd Rashidi (FA - Batu Gajah)'
    WHEN 'fazly.zakaria@ninjavan.co' THEN 'Mohamad Fazly Bin Zakaria (SH - Batu Gajah)'
    WHEN 'akram.shah@ninjavan.co' THEN 'Muhamad Akram Bin Azmah Shah (FA - Cameron Highlands)'
    WHEN 'safwan.suhaimy@ninjavan.co' THEN 'Muhammad Safwan Bin Suhaimy (SH - Cameron Highlands)'
    WHEN 'syafiq.abdghoni@ninjavan.co' THEN 'Mohamad Syafiq Lutfi Bin Abd Ghoni (FA - Gerik)'
    WHEN 'zahadi.zahari@ninjavan.co' THEN 'Ahmad Zahadi Bin Ahmad Zahari (SH - Gerik)'
    WHEN 'ahlil.mustaqim@ninjavan.co' THEN 'Ahlil Mustaqim Anur @ Anuar (FA - Ipoh)'
    WHEN 'faiz.jana@ninjavan.co' THEN 'Mohamad Faiz Bin Jana (FA - Ipoh)'
    WHEN 'syazwan.eddy@ninjavan.co' THEN 'Muhammad Izzad Syazwan Bin Eddy Noor (SH - Ipoh)'
    WHEN 'ainol.muzaffar@ninjavan.co' THEN 'Ainol Muzaffar Bin Abdul Muti (FA - Kuala Kangsar)'
    WHEN 'anas.malik@ninjavan.co' THEN 'Muhammad Anas Bin Abdul Malik (SH - Kuala Kangsar)'
    WHEN 'najmirul.rajuni@ninjavan.co' THEN 'Muhammad Najmirul Bin Rajuni (FA - Sitiawan)'
    WHEN 'inammullah.mkadiri@ninjavan.co' THEN 'In Ammullah Bin M Kadiri (FA - Sitiawan)'
    WHEN 'izdihar.abdullah@ninjavan.co' THEN 'Muhammad Izdihar Bin Abdullah (SH - Sitiawan)'
    WHEN 'hazril.harun@ninjavan.co' THEN 'Muhammad Hazril Bin Harun (FA - Slim River)'
    WHEN 'kamil.hafiz@ninjavan.co' THEN 'Kamil Hafiz Bin Muharim Alam Shah (SH - Slim River)'
    WHEN 'rasyid.hazam@ninjavan.co' THEN 'Mohd Nur Rasyid Bin Noor Hazam (FA - Taiping)'
    WHEN 'faisal.ajam2@ninjavan.co' THEN 'Muhammad Faisal Bin Ajam (FA - Taiping)'
    WHEN 'nabil.fikri@ninjavan.co' THEN 'Muhamad Nabil Fikri Bin Ahmmad Rofee (SH - Taiping)'
    WHEN 'hafizzie.hasnan@ninjavan.co' THEN 'Muhammad Hafizzie Bin Hasnan (FA - Tapah)'
    WHEN 'syahril.aziz@ninjavan.co' THEN 'Syahril Azhan Bin Abd Aziz (SH - Tapah)'
    WHEN 'faizal.kamalludin@ninjavan.co' THEN 'Muhammad Faizal Bin Kamalludin (FA - Teluk Intan)'
    WHEN 'ridhwan.jaafar@ninjavan.co' THEN 'Muhammad Ridhwan Bin Jaafar (FA - Teluk Intan)'
    WHEN 'haffiszie.hakim@ninjavan.co' THEN 'Mohammad Haffiszie Bin Hakim (SH - Teluk Intan)'
    WHEN 'saiful.dollah@ninjavan.co' THEN 'Mohd Saiful Ridhwan Bin Dollah (FA - Kota Masai)'
    WHEN 'norazlina.jaafar@ninjavan.co' THEN 'Norazlina Binti Mohamaed Jaafar (FA - Kota Masai)'
    WHEN 'asrie.malik@ninjavan.co' THEN 'Amir Asrie Bin Malik (SH - Kota Masai)'
    WHEN 'aiman.jafridin@ninjavan.co' THEN 'Muhammad Aiman Bin Jafridin (FA - Kota Tinggi)'
    WHEN 'ariff.baharuddin@ninjavan.co' THEN 'Mohamad Ariff Din Bin Baharudin (SH - Kota Tinggi)'
    WHEN 'raokib.abdulkadir@ninjavan.co' THEN 'Muhammad Raokib Bin Abdul Kadir (FA - Larkin)'
    WHEN 'hanzholah.hasani@ninjavan.co' THEN 'Ahmad Hanzholah Bin Hasani (FA - Larkin)'
    WHEN 'putrinabila.mohdarfhan@ninjavan.co' THEN 'Putri Nabilla Binti Mohd Arfhan (FA - Larkin)'
    WHEN 'riddaudin.seeh@ninjavan.co' THEN 'Muhammad Riddaudin Mohd Seeh (SH - Larkin)'
    WHEN 'firdaus.asri1@ninjavan.co' THEN 'Muhammad Firdaus Bin Mohd Asri (FA - Pasir Gudang)'
    WHEN 'amiruddin.zailan@ninjavan.co' THEN 'Muhammad Amiruddin bin Zailan (FA - Pasir Gudang)'
    WHEN 'haikal.rashid@ninjavan.co' THEN 'Muhammad Haikal Bin Abdul Rashid (SH - Pasir Gudang)'
    WHEN 'syazrin.badurisam@ninjavan.co' THEN 'Muhammad Syazrin Aiman Bin Badurisam (FA - Penawar)'
    WHEN 'najib.harison@ninjavan.co' THEN 'Mohamad Najib Bin Mohd Harison (SH - Penawar)'
    WHEN 'nasuha.kamalludin@ninjavan.co' THEN 'Nasuha Binti Kamalludin (FA - Ulu Tiram)'
    WHEN 'aidil.kamarudin@ninjavan.co' THEN 'Mohamad Aidil Fikrie Bin Kamarudin (FA - Ulu Tiram)'
    WHEN 'fauzan.salim@ninjavan.co' THEN 'Mohamad Fauzan Bin Salim (SH - Ulu Tiram)'
    WHEN 'taufiq.nadri@ninjavan.co' THEN 'Taufiq Hidayat Bin Nadri (FA - Gelang Patah)'
    WHEN 'afiq.sukono@ninjavan.co' THEN 'Mohamad Afiq Bin Sukono (FA - Gelang Patah)'
    WHEN 'hakimi.razali@ninjavan.co' THEN 'Muhammad Faris Hakimi Bin Razali (SH - Gelang Patah)'
    WHEN 'israafsolihin.shuib@ninjavan.co' THEN 'Muhammad Nur Israaf Solihin Bin Mohd Shuib (FA - Kempas)'
    WHEN 'syawaluddin.roslan@ninjavan.co' THEN 'Muhamad Syawaluddin Bin Roslan (FA - Kempas)'
    WHEN 'syafiq.shafawi@ninjavan.co' THEN 'Muhammad Syafiq Bin Mohd Shafawi (SH - Kempas)'
    WHEN 'zaidi.zulkarnain@ninjavan.co' THEN 'Mohamad Zaidi Bin Zulkarnain (FA - Kulai)'
    WHEN 'zulakmal.zulkahar@ninjavan.co' THEN 'Zulakmal Bin Zulkahar (FA - Kulai)'
    WHEN 'azmil.ismail@ninjavan.co' THEN 'Muhamad Azmil Bin Ismail (SH - Kulai)'
    WHEN 'izrafil.kadir@ninjavan.co' THEN 'Muhammad Izrafil Bin Abdul Kadir (FA - Mount Austin)'
    WHEN 'fazdil.ismail@ninjavan.co' THEN 'Fazdil Bin Ismail (SH - Mount Austin)'
    WHEN 'shafiee.isham@ninjavan.co' THEN 'Mohamad Shafiee Bin Isham (FA - Nusajaya)'
    WHEN 'ahmadie.azuan@ninjavan.co' THEN 'Ahmadie Muhammad Bin Muhammad Azuan (FA - Nusajaya)'
    WHEN 'arfan.narudin@ninjavan.co' THEN 'Muhammad Arfan Bin Narudin (SH - Nusajaya)'
    WHEN 'luqman.musa@ninjavan.co' THEN 'Luqman Hakim Bin Musa (FA - Pontian)'
    WHEN 'hazim.rosli@ninjavan.co' THEN 'Muhammad Hazim Bin Rosli (SH - Pontian)'
    WHEN 'fatihah.masdi@ninjavan.co' THEN 'Nur Fatihah Binti Masdi (FA - Ayer Hitam)'
    WHEN 'zikhri.khair@ninjavan.co' THEN 'Muhamad Zikhri Bin Ahmad Khair (SH - Ayer Hitam)'
    WHEN 'faiq.mohtar@ninjavan.co' THEN 'Ahmad Faiq Bin Mohtar (FA - Batu Pahat)'
    WHEN 'auf.taib@ninjavan.co' THEN 'Muhammad Auf Bin Mohd Taib (FA - Batu Pahat)'
    WHEN 'shahrul.azren@ninjavan.co' THEN 'Mohd Shahrul Azren Bin Azman (SH - Batu Pahat)'
    WHEN 'fairoza.zainol@ninjavan.co' THEN 'Fairoza Bin Zainol (FA - Bukit Gambir)'
    WHEN 'firdaus.wahid@ninjavan.co' THEN 'Mohammad Firdaus Bin Abd Wahid (SH - Bukit Gambir)'
    WHEN 'azrie.shafiq@ninjavan.co' THEN 'Azrie Shafiq Bin Saleh (FA - Kluang)'
    WHEN 'taufiq.nandil@ninjavan.co' THEN 'Mohamad Taufiq Bin Nandil (FA - Kluang)'
    WHEN 'zulkarnain.shamsudin@ninjavan.co' THEN 'Zulkarnain Bin Muhammad @ Shamsudin (SH - Kluang)'
    WHEN 'hazwan.hasran@ninjavan.co' THEN 'Mohd Hazwan Bin Hasran (FA - Mersing)'
    WHEN 'syahid.noh@ninjavan.co' THEN 'Muhamad Syahid Bin Mohd Noh (SH - Mersing)'
    WHEN 'shahriswan.samah@ninjavan.co' THEN 'Shahriswan Bin Abu Samah (FA - Muar)'
    WHEN 'hafis.kassim@ninjavan.co' THEN 'Muhammad Hafis Bin Kassim (FA - Muar)'
    WHEN 'syakir.syed@ninjavan.co' THEN 'Ahmad Syakir Bin Syed Abdul Kadir (SH - Muar)'
    WHEN 'nizar.nazrullah@ninjavan.co' THEN 'Nizar Hilmi Bin Nazrullah (FA - Segamat)'
    WHEN 'jumain.parmo@ninjavan.co' THEN 'Mohamad Jumain Bin Parmo (FA - Segamat)'
    WHEN 'zahin.ghafor@ninjavan.co' THEN 'Mohd Zahin Bin Abd Ghafor (SH - Segamat)'
    WHEN 'hazmi.isa@ninjavan.co' THEN 'Hazmi Faiz Bin Md Isa (FA - Alor Gajah)'
    WHEN 'nazarudin.jalal@ninjavan.co' THEN 'Mohd Nazarudin Bin Abd Jalal (FA - Alor Gajah)'
    WHEN 'kamarulzulfekha.zaini@ninjavan.co' THEN 'Kamarulzulfekha Bin Zaini (SH - Alor Gajah)'
    WHEN 'khairul.sani@ninjavan.co' THEN 'Khairul Azwadi Bin Muhamad Sani (FA - Bahau)'
    WHEN 'haqim.norzafarin@ninjavan.co' THEN 'Iman Zul Haqim Bin Norzafarin (FA - Bahau)'
    WHEN 'naqib.anaqi@ninjavan.co' THEN 'Mohd Naqib Anaqi Bin Mohamad Nizam (SH - Bahau)'
    WHEN 'luqman.samin@ninjavan.co' THEN 'Muhammad Luqman Hakim bin Samin (FA - Gemas)'
    WHEN 'anwar.azman@ninjavan.co' THEN 'Muhammad Anwar Irshadi Bin Azman (SH - Gemas)'
    WHEN 'anwar.husain@ninjavan.co' THEN 'Anwar Adenan Bin Husain (FA - Jasin)'
    WHEN 'arif.zakaria@ninjavan.co' THEN 'Muhammad Arif Bin Zakaria (FA - Jasin)'
    WHEN 'abi.ubaidah@ninjavan.co' THEN 'Abiubaidah Bin Asuan Kailani (SH - Jasin)'
    WHEN 'zulhilmi.zamili@ninjavan.co' THEN 'Muhammad Zulhilmi Bin Zamili (FA - Melaka Tengah)'
    WHEN 'ariff.jasman@ninjavan.co' THEN 'Nur Ariff Bin Jasman (FA - Melaka Tengah)'
    WHEN 'taufik.henra@ninjavan.co' THEN 'Muhammad Taufik Hidayat Bin Henra (FA - Melaka Tengah)'
    WHEN 'hafiz.kasron@ninjavan.co' THEN 'Muhammad Hafiz Bin Kasron (SH - Melaka Tengah)'
    WHEN 'shah.sorep@ninjavan.co' THEN 'Shah Badrul Bin Sorep (FA - Nilai)'
    WHEN 'faradisham.yunus@ninjavan.co' THEN 'Faradisham Binti Mohd Yunus (FA - Nilai)'
    WHEN 'amar.asraf@ninjavan.co' THEN 'Muhammad Amar Asraf Bin Mustapha (SH - Nilai)'
    WHEN 'aiman.fairus@ninjavan.co' THEN 'Muhammad Nor Aiman Na''im Bin Fairus (FA - Port Dickson)'
    WHEN 'ikmal.hakim@ninjavan.co' THEN 'Ikmal Hakim Bin Hamzah (SH - Port Dickson)'
    WHEN 'alif.asyraf@ninjavan.co' THEN 'Alif Asyraf Bin Nordin (FA - Senawang)'
    WHEN 'atiqah.najib@ninjavan.co' THEN 'Nur Atiqah Binti Mohd Najib (FA - Senawang)'
    WHEN 'afnan.roslan@ninjavan.co' THEN 'Mohamad Afnan Bin Roslan (SH - Senawang)'
    WHEN 'zamrill.zamzuri@ninjavan.co' THEN 'Ahmad Zamrill Nashriq Bin Zamzuri (FA - Seremban)'
    WHEN 'muhammad.irfan@ninjavan.co' THEN 'Putera Muhammad Irfan (FA - Seremban)'
    WHEN 'daarshan.ramash@ninjavan.co' THEN 'Daarshan Kumar A/L Ramash (SH - Seremban)'
    WHEN 'norhisham.ahmad@ninjavan.co' THEN 'Muhammad Norhisham Shafie Bin Ahmad (FA - Tanjung Minyak)'
    WHEN 'saifulnaim.shaari@ninjavan.co' THEN 'Saiful Naim Bin Sha''ari (FA - Tanjung Minyak)'
    WHEN 'ali.zainal@ninjavan.co' THEN 'Mohammad Ali Zainal Abedeen Bin Ab Rahman (SH - Tanjung Minyak)'
    WHEN 'afiq.jasmi@ninjavan.co' THEN 'Mohd Afiq Bin Jasmi (FA - Kuala Selangor)'
    WHEN 'shukrie.khairie@ninjavan.co' THEN 'Muhammad Shukrie Bin Ahamad Khairie (FA - Kuala Selangor)'
    WHEN 'syamil.tahril@ninjavan.co' THEN 'Ahmad Syamil Bin Ahmad Tahril (SH - Kuala Selangor)'
    WHEN 'amirul.mohammad@ninjavan.co' THEN 'Mohamad ''Amirul Syafiq Bin Mohammad (FA - Puncak Alam)'
    WHEN 'zaki.sahir@ninjavan.co' THEN 'Muhammad Zaki Bin Sahir (FA - Puncak Alam)'
    WHEN 'hanif.mazni@ninjavan.co' THEN 'Mohammad Hanif Naufal Bin Mohd Mazni (SH - Puncak Alam)'
    WHEN 'saiful.sabri@ninjavan.co' THEN 'Muhammad Saiful Azri Bin Che Mohd Sabri (FA - Rantau Panjang)'
    WHEN 'aiman.kamarulzaman@ninjavan.co' THEN 'Muhammad Aiman Mukhriz Bin Kamarulzaman (FA - Rantau Panjang)'
    WHEN 'nurazuwan.mahadi@ninjavan.co' THEN 'Muhammad Nurazuwan Bin Mahadi (SH - Rantau Panjang)'
    WHEN 'fadzlisham.suhaimi@ninjavan.co' THEN 'Muhammad Fadzlisham Bin Suhaimi (FA - Setia Alam)'
    WHEN 'muhammadafiq.mazalan@ninjavan.co' THEN 'Muhammad Afiq Bin Mazalan (FA - Setia Alam)'
    WHEN 'azwan.said@ninjavan.co' THEN 'Noor Azwan Bin Mohd Said (SH - Setia Alam)'
    WHEN 'nazirul.zulkafli@ninjavan.co' THEN 'Muhammad Nazirul Afiq Bin Mohd Zulkafli (FA - Sungai Besar)'
    WHEN 'farhan.azman2@ninjavan.co' THEN 'Muhammad Farhan Bin Azman (SH - Sungai Besar)'
    WHEN 'firdaus.suferi@ninjavan.co' THEN 'Muhammad Firdaus Bin Mohd Suferi (FA - Ara Damansara)'
    WHEN 'firdaus.fauzi2@ninjavan.co' THEN 'Mohamad Firdaus Bin Fauzi (FA - Ara Damansara)'
    WHEN 'eddy.shah@ninjavan.co' THEN 'Mohammed Eddy Shah Bin Fakarudin (SH - Ara Damansara)'
    WHEN 'izriel.pisal@ninjavan.co' THEN 'Muhammad Izriel Izmal Bin Muhamad Pisal (FA - Bukit Rahman Putra)'
    WHEN 'aiman.sahifulriza@ninjavan.co' THEN 'Aiman Nur Yasin Bin Sahifulriza (FA - Bukit Rahman Putra)'
    WHEN 'safiq.syafril@ninjavan.co' THEN 'Muhammad Safiq Bin Syafril (SH - Bukit Rahman Putra)'
    WHEN 'aziz.khan@ninjavan.co' THEN 'Aziz Khan (FA - Kepong)'
    WHEN 'fairuz.yaacob@ninjavan.co' THEN 'Mohammad Fairuz Bin Yaacob (SH - Kepong)'
    WHEN 'azlan.sarif@ninjavan.co' THEN 'Mohamad Azlan Bin Mohd Sarif (FA - Mutiara Damansara)'
    WHEN 'aisyah.saad@ninjavan.co' THEN 'Aisyah Binti Saad (FA - Mutiara Damansara)'
    WHEN 'norazman.karim1@ninjavan.co' THEN 'Norazman Bin Karim (SH - Mutiara Damansara)'
    WHEN 'haziq.husairi@ninjavan.co' THEN 'Muhammad Haziq Haikal Bin Husairi (FA - Rawang)'
    WHEN 'adzlan.mohamadyusoff@ninjavan.co' THEN 'Adzlan Yusoff Bin Mohamad Yusoff (FA - Rawang)'
    WHEN 'azrul.azman@ninjavan.co' THEN 'Muhammad Azrul Bin Azman (SH - Rawang)'
    WHEN 'khairul.roges@ninjavan.co' THEN 'Mohamad Khairul Fekriy Bin Mohd Ramadhan Roges (FA - Subang)'
    WHEN 'amirul.faris@ninjavan.co' THEN 'Mohamad Amirul Amin Bin Mohd Faris David (FA - Subang)'
    WHEN 'shahril.hissham@ninjavan.co' THEN 'Muhammad Shahril Bin Hissham (SH - Subang)'
    WHEN 'amirul.zamberi@ninjavan.co' THEN 'Muhammad Amirul Bin Zamberi (FA - Kuala Kubu Baru)'
    WHEN 'jamal.azwie@ninjavan.co' THEN 'Muhammad Jamal Azwie Bin Mohd Johan (SH - Kuala Kubu Baru)'
    WHEN 'amierul.zuhide@ninjavan.co' THEN 'Amierul Akmal Bin Zuhide (SH - Segambut)'
    WHEN 'hakimi.sukari@ninjavan.co' THEN 'Muhammad Ikhmal Hakimi Bin Mohd Sukari (FA - Selayang)'
    WHEN 'farisamin.rasli@ninjavan.co' THEN 'Muhammad Faris Amin Bin Rasli (FA - Selayang)'
    WHEN 'suhail.azzahari@ninjavan.co' THEN 'Suhail Bin Azzahari (SH - Selayang)'
    WHEN 'adif.mohdafiqiqbal@ninjavan.co' THEN 'Muhammad Adif Bin Mohd Afiq Iqbal (FA - Sentul)'
    WHEN 'ilham.aswin@ninjavan.co' THEN 'Muhammad Ilham Bin Aswin (FA - Sentul)'
    WHEN 'fahmi.kamsani@ninjavan.co' THEN 'Muhammad Ariff Fahmi Bin Kamsani (FA - Sentul)'
    WHEN 'najib.halif@ninjavan.co' THEN 'Muhammad Najib Bin Halif (SH - Sentul)'
    WHEN 'mohammadshafiq.sapeei@ninjavan.co' THEN 'Mohammad Shafiq Bin Sapeei (FA - Chow Kit)'
    WHEN 'amirul.azlan@ninjavan.co' THEN 'Muhammad Amirul Asyraf Bin Azlan (SH - Chow Kit)'
    WHEN 'aiman.alpin@ninjavan.co' THEN 'Aiman Firdaus Bin Alpin (FA - Shamelin)'
    WHEN 'norsafuwan.norazman@ninjavan.co' THEN 'Muhamad Norsafuwan Bin Norazman (FA - Shamelin)'
    WHEN 'fitri.hassim@ninjavan.co' THEN 'Mohammad Fitri Bin Hassim (SH - Shamelin)'
    WHEN 'zaidi.mokhtar@ninjavan.co' THEN 'Mohd Zaidi Bin Mokhtar (FA - Wangsa Maju)'
    WHEN 'ashraf.rahmat@ninjavan.co' THEN 'Muhammad Ashraf Bin Rahmat (FA - Wangsa Maju)'
    WHEN 'hyder.nazlim@ninjavan.co' THEN 'Hyder Hazry Bin Nazlim (FA - Wangsa Maju)'
    WHEN 'fasil.haruddin@ninjavan.co' THEN 'Muhammad Fasil Zulfikar Bin Haruddin (SH - Wangsa Maju)'
    WHEN 'brian.edward@ninjavan.co' THEN 'Brian A/l Edward (FA - Melawati)'
    WHEN 'afiq.afifuddin@ninjavan.co' THEN 'Afiq Afifuddin Bin Mohd Rodzi (FA - Melawati)'
    WHEN 'solehuddin.radzi@ninjavan.co' THEN 'Solehuddin Bin Mohd Radzi (SH - Melawati)'
    WHEN 'muhamadasyraf.mustafar@ninjavan.co' THEN 'Muhamad Asyraf Bin Mustafar (FA - Ampang)'
    WHEN 'rufendy.musa1@ninjavan.co' THEN 'Rufendy Bin Musa (FA - Ampang)'
    WHEN 'farah.aripin@ninjavan.co' THEN 'Farah Aqilah Binti Md Aripin (SH - Ampang)'
    WHEN 'muqri.sham@ninjavan.co' THEN 'Mohamad Muqri Hakim Bin Radzly Sham (FA - Bandar Mahkota Cheras)'
    WHEN 'sahrul.ridwan@ninjavan.co' THEN 'Sahrul Ridwan (FA - Bandar Mahkota Cheras)'
    WHEN 'areff.mahdi@ninjavan.co' THEN 'Mohd Arieff Bin Mahdi (SH - Bandar Mahkota Cheras)'
    WHEN 'mohd.nazirom@ninjavan.co' THEN 'Mohd Faizal Bin Nazirom (FA - Bandar Tun Razak)'
    WHEN 'aliff.rosidy@ninjavan.co' THEN 'Mohamad Aliff Ridzwan Bin Mohd Rosidy (FA - Bandar Tun Razak)'
    WHEN 'norman.razak@ninjavan.co' THEN 'Norman Haiqal bin Ab Razak (FA - Bandar Tun Razak)'
    WHEN 'ameer.jasni@ninjavan.co' THEN 'Muhamad Ameer Bin Jasni (SH - Bandar Tun Razak)'
    WHEN 'farid.hakim@ninjavan.co' THEN 'Muhd Farid Hakim Bin Mohd Jaafar (FA - Cheras)'
    WHEN 'shahzwan.haikal@ninjavan.co' THEN 'Muhammad Shahzwan Haikal Bin Mohamad Roffli (FA - Cheras)'
    WHEN 'fauzul.ahmad@ninjavan.co' THEN 'Ahmad Fauzul Azim Bin Sager Ahmad (SH - Cheras)'
    WHEN 'harith.huzairi@ninjavan.co' THEN 'Harith Akmal Bin Huzairi (FA - Taman Mega Jaya)'
    WHEN 'muhammad.isa@ninjavan.co' THEN 'Muhammad Zaid Bin Mat Isa (FA - Taman Mega Jaya)'
    WHEN 'firdaus.hadi@ninjavan.co' THEN 'Muhammad Firdaus Bin Abdul Hadi (SH - Taman Mega Jaya)'
    WHEN 'azmil.rosdan@ninjavan.co' THEN 'Datu Azmil Bin Rosdan (FA - Bangi)'
    WHEN 'affieq.ridzuan@ninjavan.co' THEN 'Muhammad Affieq Aiman Bin Mohammad Ridzuan (FA - Bangi)'
    WHEN 'fahmi.fuad@ninjavan.co' THEN 'Muhammad Fahmi Bin Mohd Fuad (SH - Bangi)'
    WHEN 'fathul.nazarudin@ninjavan.co' THEN 'Muhammad Fathul Afiq Bin Nazarudin (FA - Kajang)'
    WHEN 'mustafa.daniar@ninjavan.co' THEN 'Mustafa Daniar Bin Hassan (FA - Kajang)'
    WHEN 'zul.haris@ninjavan.co' THEN 'Mohd Zul Halili Bin Haris (SH - Kajang)'
    WHEN 'izmi.aiza@ninjavan.co' THEN 'Muhammad Izmi Aiza Bin Rusdi (FA - Salak Tinggi)'
    WHEN 'muizzuddin.daud@ninjavan.co' THEN 'Mohd Muizzuddin Rusyaidi Bin Daud (FA - Salak Tinggi)'
    WHEN 'abdul.hadi@ninjavan.co' THEN 'Abdul Hadi Bin Jamaludin Afghani (SH - Salak Tinggi)'
    WHEN 'izzuan.ayob@ninjavan.co' THEN 'Mohd Izzuan Bin Ayob (FA - Semenyih)'
    WHEN 'thaqif.hidzir@ninjavan.co' THEN 'Muhammad Thaqif Bin Hidzir (FA - Semenyih)'
    WHEN 'noramin.mohammadzani@ninjavan.co' THEN 'Mohammad Nor Amin Bin Mohammad Zani (FA - Semenyih)'
    WHEN 'najmuddin.khalib@ninjavan.co' THEN 'Muhammad Najmuddin Bin Khalib (SH - Semenyih)'
    WHEN 'farhan.hashim@ninjavan.co' THEN 'Mohammad Farhan Bin Nor Hashim (FA - Serdang)'
    WHEN 'azwan.ramli@ninjavan.co' THEN 'Mohammad Azwan Bin Ramli (FA - Serdang)'
    WHEN 'ahmad.hazlan@ninjavan.co' THEN 'Ahmad Syaiful Bin Hazlan (SH - Serdang)'
    WHEN 'alif.hisham@ninjavan.co' THEN 'Muhamad Alif Hakimi Bin Hisham (FA - Bangsar)'
    WHEN 'amiruddin.anzmi@ninjavan.co' THEN 'Muhammad Amiruddin Bin Mohd Anzmi (FA - Bangsar)'
    WHEN 'wanahmadaiman.othman@ninjavan.co' THEN 'Wan Ahmad Aiman Bin Wan Othman (SH - Bangsar)'
    WHEN 'muhammad.syahmin1@ninjavan.co' THEN 'Muhammad Syahmin (FA - Oug)'
    WHEN 'rusdi.abdullah@ninjavan.co' THEN 'Mohd Rusdi Bin Abdullah (FA - Oug)'
    WHEN 'jenang.acheng@ninjavan.co' THEN 'Jenang Anak Acheng (FA - Oug)'
    WHEN 'aiman.redhuwan@ninjavan.co' THEN 'Muhammad Aiman Izwan Bin Redhuwan (SH - Oug)'
    WHEN 'qayyum.jamal@ninjavan.co' THEN 'Ahmad Qayyum Bin Ahmad Jamal (FA - Petaling Jaya)'
    WHEN 'nurrusydiah.abdullah@ninjavan.co' THEN 'Nurrusydiah Binti Abdullah (FA - Petaling Jaya)'
    WHEN 'farhan.kodari@ninjavan.co' THEN 'Muhammad Amir Farhan Bin Mohammad Kodari (SH - Petaling Jaya)'
    WHEN 'syariff.sukri@ninjavan.co' THEN 'Ahmad Syariff Bin Ahmad Sukri (FA - Sunway)'
    WHEN 'hamzah.isa@ninjavan.co' THEN 'Hamzah Bin Isa (FA - Sunway)'
    WHEN 'adam.azrin@ninjavan.co' THEN 'Adam Bin Azrin (SH - Sunway)'
    WHEN 'kamarul.zain@ninjavan.co' THEN 'Kamarul Lokman Hakim Bin Md Zain (FA - Taman Desa)'
    WHEN 'addin.johari@ninjavan.co' THEN 'Muhammad Addin Bin Johari (FA - Taman Desa)'
    WHEN 'majid.sajari@ninjavan.co' THEN 'Abdul Majid Bin Mohammad Sajari (SH - Taman Desa)'
    WHEN 'arif.ramzi@ninjavan.co' THEN 'Muhamad Arif Hamdi Bin Muhamad Ramzi (FA - Cyberjaya)'
    WHEN 'nazman.ramlan@ninjavan.co' THEN 'Ahmad Nazman Bin Ramlan (FA - Cyberjaya)'
    WHEN 'arif.zakri@ninjavan.co' THEN 'Muhammad Arif Bin Zakri (SH - Cyberjaya)'
    WHEN 'saiful.hizam@ninjavan.co' THEN 'Saiful Adam Bin Nik Khairul Hizam (FA - Kota Kemuning)'
    WHEN 'azraei.mohdanuar@ninjavan.co' THEN 'Muhammad Azraei Najmi Bin Mohd Anuar (FA - Kota Kemuning)'
    WHEN 'aelfaiez.wananuar@ninjavan.co' THEN 'Wan Aelfaiez Nur Bin Wan Anuar (FA - Kota Kemuning)'
    WHEN 'rafiqi.w.rukman@ninjavan.co' THEN 'Wan Muhammad Rafiqi Bin W.Rukman (SH - Kota Kemuning)'
    WHEN 'aaron.abdullah@ninjavan.co' THEN 'Aaron Amin Syibli Bin Abdullah (FA - Puchong)'
    WHEN 'nuridzham.sayuji@ninjavan.co' THEN 'Mohammad Nuridzham Bin Mohd Sayuji (FA - Puchong)'
    WHEN 'iqzzat.norhas@ninjavan.co' THEN 'Muhammad Iqzzat Bin Norhas (SH - Puchong)'
    WHEN 'amin.ibrahim@ninjavan.co' THEN 'Muhammad Amin Bin Ibrahim (FA - Shah Alam)'
    WHEN 'syamil.abdullah@ninjavan.co' THEN 'Muhammad Syamil Bin Abdullah (FA - Shah Alam)'
    WHEN 'zulkarnain.dollah@ninjavan.co' THEN 'Mohammad Zulkarnain Bin Dollah (FA - Shah Alam)'
    WHEN 'haiqal.gani@ninjavan.co' THEN 'Muhammad Haiqal Bin Dollah Gani (SH - Shah Alam)'
    WHEN 'hayad.jamian@ninjavan.co' THEN 'Muhammad Noor Hayad Bin Jamian (FA - Banting)'
    WHEN 'firdaus.raman@ninjavan.co' THEN 'Mohd Firdaus Bin Abdul Raman (SH - Banting)'
    WHEN 'azrul.iswandy@ninjavan.co' THEN 'Azrul Amali Bin Iswandy (FA - Botanik)'
    WHEN 'izwanshah.iskandar@ninjavan.co' THEN 'Izwanshah Bin Iskandar (FA - Botanik)'
    WHEN 'hakimm.amizon@ninjavan.co' THEN 'Muhammad Hakimm Alhafiz Bin Amizon (SH - Botanik)'
    WHEN 'haiman.suhaimi@ninjavan.co' THEN 'Arif Haiman Bin Suhaimi (FA - Klang)'
    WHEN 'muhammad.jeffri@ninjavan.co' THEN 'Muhammad Daniel Bin Jeffri (FA - Klang)'
    WHEN 'muzaffar.zamri@ninjavan.co' THEN 'Muzaffar Azraf Bin Zamri (SH - Klang)'
    WHEN 'hafiz.anuar@ninjavan.co' THEN 'Muhammad Hafiz Bin Anuar (FA - Port Klang)'
    WHEN 'shahmin.mohamadali@ninjavan.co' THEN 'Mohamad Shahmin Bin Mohamad Ali (FA - Port Klang)'
    WHEN 'nurilham.zulkifli@ninjavan.co' THEN 'Mohammad Nurilham Bin Zulkifli (SH - Port Klang)'
    WHEN 'danish.luqman@ninjavan.co' THEN 'Mohd Danish Bin Luqman Loke (FA - Rimbayu)'
    WHEN 'naim.najib@ninjavan.co' THEN 'Muhammad Naim Fikri Bin Mad Najib (FA - Rimbayu)'
    WHEN 'mazli.yahya@ninjavan.co' THEN 'Mazli Shah Bin Yahya (SH - Rimbayu)'
    ELSE display_name END
WHERE (display_name IS NULL OR display_name = '') AND LOWER(email) IN (
  'zahirudin.zainal@ninjavan.co',
  'hazieq.haznan@ninjavan.co',
  'izwan.haron@ninjavan.co',
  'syahmi.sabri@ninjavan.co',
  'haziq.lajis@ninjavan.co',
  'aliff.azizan@ninjavan.co',
  'hadzrin.samsudin@ninjavan.co',
  'muhammad.annuar@ninjavan.co',
  'ain.ishak@ninjavan.co',
  'fahim.fadhli@ninjavan.co',
  'ridhuan.azhar@ninjavan.co',
  'aiman.halim@ninjavan.co',
  'amirul.mazlan@ninjavan.co',
  'fatin.zainuddin@ninjavan.co',
  'afi.wanrazali@ninjavan.co',
  'fadhli.zahari@ninjavan.co',
  'idlan.darus@ninjavan.co',
  'farhana.zainuddin@ninjavan.co',
  'shahiran.jamizan@ninjavan.co',
  'asyraf.rahmat@ninjavan.co',
  'sufian.mohdzairi@ninjavan.co',
  'ain.sezali@ninjavan.co',
  'aizat.khairulnazri@ninjavan.co',
  'ridzuan.ludin@ninjavan.co',
  'faratul.hakimi@ninjavan.co',
  'ridzuan.salam@ninjavan.co',
  'nazreen.mohd@ninjavan.co',
  'syed.aluwi@ninjavan.co',
  'nasrul.nizam@ninjavan.co',
  'naim.nor@ninjavan.co',
  'ahmad.syakir@ninjavan.co',
  'rahim.nor@ninjavan.co',
  'mohammad.abdullah@ninjavan.co',
  'khaizuran.bakhril@ninjavan.co',
  'haniff.hamasakee@ninjavan.co',
  'hakimi.mohamad@ninjavan.co',
  'zukri.jalil@ninjavan.co',
  'zaim.adnan@ninjavan.co',
  'nursalam.rusli@ninjavan.co',
  'haris.setapa@ninjavan.co',
  'hazim.firdaus@ninjavan.co',
  'adam.saidi@ninjavan.co',
  'syahrir.sulaiman@ninjavan.co',
  'razin.zamri@ninjavan.co',
  'hafizi.jalil@ninjavan.co',
  'syahrul.husin@ninjavan.co',
  'ahmad.fahmie@ninjavan.co',
  'izamudin.izlan@ninjavan.co',
  'khairul.ali@ninjavan.co',
  'nabil.aziz@ninjavan.co',
  'rizal.saod@ninjavan.co',
  'ahmad.marzuki@ninjavan.co',
  'ahmad.affan@ninjavan.co',
  'shazaril.shukri@ninjavan.co',
  'ihsan.mazli@ninjavan.co',
  'zihni.zamani@ninjavan.co',
  'nabil.ahkram@ninjavan.co',
  'hanif.idrus@ninjavan.co',
  'afif.aljafry@ninjavan.co',
  'azrul.baharuddin@ninjavan.co',
  'farhan.ikhwan@ninjavan.co',
  'khairudin.asri@ninjavan.co',
  'azrin.hamid@ninjavan.co',
  'amirul.rushdan@ninjavan.co',
  'chin.shen@ninjavan.co',
  'amir.afizan@ninjavan.co',
  'syahrul.muhamad@ninjavan.co',
  'esmat.fahmi@ninjavan.co',
  'ammar.ismail@ninjavan.co',
  'norathirah.jusli@ninjavan.co',
  'jaidi.ghani@ninjavan.co',
  'fajilah.ismail1@ninjavan.co',
  'shahrizal.akmat@ninjavan.co',
  'malwanraj.malik@ninjavan.co',
  'azianaazinda.azmie@ninjavan.co',
  'azniezah.nordin1@ninjavan.co',
  'redzuan.maidin@ninjavan.co',
  'zulhisyam.eli@ninjavan.co',
  'asyraf.taip@ninjavan.co',
  'iven.anthony2@ninjavan.co',
  'afdhal.azamuddin@ninjavan.co',
  'eldon.tang@ninjavan.co',
  'deniver.jupirin@ninjavan.co',
  'aisyam.baharudin@ninjavan.co',
  'khairilanwar.suhaili@ninjavan.co',
  'sahirul.sadah@ninjavan.co',
  'debbrolryne.jupirin@ninjavan.co',
  'mohd.mahadir@ninjavan.co',
  'mdfazly.darong@ninjavan.co',
  'syazwansaufi.irwanto@ninjavan.co',
  'fahmi.shaiffuddin@ninjavan.co',
  'hermogenes.friasjr@ninjavan.co',
  'rustam.baharon@ninjavan.co',
  'norasmah.madjaraha@ninjavan.co',
  'nizam.kassim@ninjavan.co',
  'izwan.zulkornai@ninjavan.co',
  'azlan.mohammad@ninjavan.co',
  'muqzamir.ahmad2@ninjavan.co',
  'aidilshazwan.azamri@ninjavan.co',
  'fazlin.mamin@ninjavan.co',
  'syafiq.zainal1@ninjavan.co',
  'angelina.biddy@ninjavan.co',
  'lencaster.inyau@ninjavan.co',
  'amirul.malik@ninjavan.co',
  'saifullah.zalmy@ninjavan.co',
  'hafizzah.zainal@ninjavan.co',
  'mohammadalhafiz.ahmadriduan@ninjavan.co',
  'waie.aziz@ninjavan.co',
  'nurulain.wahid@ninjavan.co',
  'asfa.yusoff@ninjavan.co',
  'kevin.malim1@ninjavan.co',
  'dyevin.john@ninjavan.co',
  'faizul.sauti@ninjavan.co',
  'qairul.romi@ninjavan.co',
  'francis.li1@ninjavan.co',
  'garcia.ulie@ninjavan.co',
  'hanis.daud@ninjavan.co',
  'hafiz.khadib@ninjavan.co',
  'mohd.husaini1@ninjavan.co',
  'shazmil.noh@ninjavan.co',
  'syaifullah.hamid@ninjavan.co',
  'zaideen.ahmad@ninjavan.co',
  'anuar.wahab@ninjavan.co',
  'hakiim.manan@ninjavan.co',
  'khairil.najmi@ninjavan.co',
  'hairul.anuar@ninjavan.co',
  'fadhril.ghazali@ninjavan.co',
  'rassul.rohani@ninjavan.co',
  'faizal.shukri@ninjavan.co',
  'faris.fakhruddin@ninjavan.co',
  'sharol.azri@ninjavan.co',
  'shamsuri.shamsudin@ninjavan.co',
  'zameri.liki@ninjavan.co',
  'shaffiq.nadzri@ninjavan.co',
  'amirulfarhan.azizi@ninjavan.co',
  'faqrul.rodzi@ninjavan.co',
  'asyraf.shaari@ninjavan.co',
  'syafiq.suferi@ninjavan.co',
  'yusuf.ghazali1@ninjavan.co',
  'syahril.shamsudin@ninjavan.co',
  'daud.nasir@ninjavan.co',
  'dinie.othman@ninjavan.co',
  'ihsan.nasir@ninjavan.co',
  'syazwan.hazim@ninjavan.co',
  'akram.rahim@ninjavan.co',
  'farizwan.akhir@ninjavan.co',
  'khairul.zamri@ninjavan.co',
  'haikal.abdrazak@ninjavan.co',
  'fitri.rodzi@ninjavan.co',
  'aliff.rosli@ninjavan.co',
  'hadirah.nasrin1@ninjavan.co',
  'azri.azhar@ninjavan.co',
  'aufa.zainal@ninjavan.co',
  'faiz.nasir@ninjavan.co',
  'hasanizal.othman@ninjavan.co',
  'hafiz.zamri1@ninjavan.co',
  'imran.ruslan@ninjavan.co',
  'mohdsalehudeen.hairulanuar@ninjavan.co',
  'siddhiq.saman@ninjavan.co',
  'rusydan.awangdamit@ninjavan.co',
  'adam.abdullah@ninjavan.co',
  'prem.sinitharan@ninjavan.co',
  'ikram.omar@ninjavan.co',
  'aiman.aziz@ninjavan.co',
  'hafizzuddin.nasir@ninjavan.co',
  'aiman.sofian@ninjavan.co',
  'adam.haris@ninjavan.co',
  'azreenshahrizal.hawari@ninjavan.co',
  'imran.rashidi@ninjavan.co',
  'fazly.zakaria@ninjavan.co',
  'akram.shah@ninjavan.co',
  'safwan.suhaimy@ninjavan.co',
  'syafiq.abdghoni@ninjavan.co',
  'zahadi.zahari@ninjavan.co',
  'ahlil.mustaqim@ninjavan.co',
  'faiz.jana@ninjavan.co',
  'syazwan.eddy@ninjavan.co',
  'ainol.muzaffar@ninjavan.co',
  'anas.malik@ninjavan.co',
  'najmirul.rajuni@ninjavan.co',
  'inammullah.mkadiri@ninjavan.co',
  'izdihar.abdullah@ninjavan.co',
  'hazril.harun@ninjavan.co',
  'kamil.hafiz@ninjavan.co',
  'rasyid.hazam@ninjavan.co',
  'faisal.ajam2@ninjavan.co',
  'nabil.fikri@ninjavan.co',
  'hafizzie.hasnan@ninjavan.co',
  'syahril.aziz@ninjavan.co',
  'faizal.kamalludin@ninjavan.co',
  'ridhwan.jaafar@ninjavan.co',
  'haffiszie.hakim@ninjavan.co',
  'saiful.dollah@ninjavan.co',
  'norazlina.jaafar@ninjavan.co',
  'asrie.malik@ninjavan.co',
  'aiman.jafridin@ninjavan.co',
  'ariff.baharuddin@ninjavan.co',
  'raokib.abdulkadir@ninjavan.co',
  'hanzholah.hasani@ninjavan.co',
  'putrinabila.mohdarfhan@ninjavan.co',
  'riddaudin.seeh@ninjavan.co',
  'firdaus.asri1@ninjavan.co',
  'amiruddin.zailan@ninjavan.co',
  'haikal.rashid@ninjavan.co',
  'syazrin.badurisam@ninjavan.co',
  'najib.harison@ninjavan.co',
  'nasuha.kamalludin@ninjavan.co',
  'aidil.kamarudin@ninjavan.co',
  'fauzan.salim@ninjavan.co',
  'taufiq.nadri@ninjavan.co',
  'afiq.sukono@ninjavan.co',
  'hakimi.razali@ninjavan.co',
  'israafsolihin.shuib@ninjavan.co',
  'syawaluddin.roslan@ninjavan.co',
  'syafiq.shafawi@ninjavan.co',
  'zaidi.zulkarnain@ninjavan.co',
  'zulakmal.zulkahar@ninjavan.co',
  'azmil.ismail@ninjavan.co',
  'izrafil.kadir@ninjavan.co',
  'fazdil.ismail@ninjavan.co',
  'shafiee.isham@ninjavan.co',
  'ahmadie.azuan@ninjavan.co',
  'arfan.narudin@ninjavan.co',
  'luqman.musa@ninjavan.co',
  'hazim.rosli@ninjavan.co',
  'fatihah.masdi@ninjavan.co',
  'zikhri.khair@ninjavan.co',
  'faiq.mohtar@ninjavan.co',
  'auf.taib@ninjavan.co',
  'shahrul.azren@ninjavan.co',
  'fairoza.zainol@ninjavan.co',
  'firdaus.wahid@ninjavan.co',
  'azrie.shafiq@ninjavan.co',
  'taufiq.nandil@ninjavan.co',
  'zulkarnain.shamsudin@ninjavan.co',
  'hazwan.hasran@ninjavan.co',
  'syahid.noh@ninjavan.co',
  'shahriswan.samah@ninjavan.co',
  'hafis.kassim@ninjavan.co',
  'syakir.syed@ninjavan.co',
  'nizar.nazrullah@ninjavan.co',
  'jumain.parmo@ninjavan.co',
  'zahin.ghafor@ninjavan.co',
  'hazmi.isa@ninjavan.co',
  'nazarudin.jalal@ninjavan.co',
  'kamarulzulfekha.zaini@ninjavan.co',
  'khairul.sani@ninjavan.co',
  'haqim.norzafarin@ninjavan.co',
  'naqib.anaqi@ninjavan.co',
  'luqman.samin@ninjavan.co',
  'anwar.azman@ninjavan.co',
  'anwar.husain@ninjavan.co',
  'arif.zakaria@ninjavan.co',
  'abi.ubaidah@ninjavan.co',
  'zulhilmi.zamili@ninjavan.co',
  'ariff.jasman@ninjavan.co',
  'taufik.henra@ninjavan.co',
  'hafiz.kasron@ninjavan.co',
  'shah.sorep@ninjavan.co',
  'faradisham.yunus@ninjavan.co',
  'amar.asraf@ninjavan.co',
  'aiman.fairus@ninjavan.co',
  'ikmal.hakim@ninjavan.co',
  'alif.asyraf@ninjavan.co',
  'atiqah.najib@ninjavan.co',
  'afnan.roslan@ninjavan.co',
  'zamrill.zamzuri@ninjavan.co',
  'muhammad.irfan@ninjavan.co',
  'daarshan.ramash@ninjavan.co',
  'norhisham.ahmad@ninjavan.co',
  'saifulnaim.shaari@ninjavan.co',
  'ali.zainal@ninjavan.co',
  'afiq.jasmi@ninjavan.co',
  'shukrie.khairie@ninjavan.co',
  'syamil.tahril@ninjavan.co',
  'amirul.mohammad@ninjavan.co',
  'zaki.sahir@ninjavan.co',
  'hanif.mazni@ninjavan.co',
  'saiful.sabri@ninjavan.co',
  'aiman.kamarulzaman@ninjavan.co',
  'nurazuwan.mahadi@ninjavan.co',
  'fadzlisham.suhaimi@ninjavan.co',
  'muhammadafiq.mazalan@ninjavan.co',
  'azwan.said@ninjavan.co',
  'nazirul.zulkafli@ninjavan.co',
  'farhan.azman2@ninjavan.co',
  'firdaus.suferi@ninjavan.co',
  'firdaus.fauzi2@ninjavan.co',
  'eddy.shah@ninjavan.co',
  'izriel.pisal@ninjavan.co',
  'aiman.sahifulriza@ninjavan.co',
  'safiq.syafril@ninjavan.co',
  'aziz.khan@ninjavan.co',
  'fairuz.yaacob@ninjavan.co',
  'azlan.sarif@ninjavan.co',
  'aisyah.saad@ninjavan.co',
  'norazman.karim1@ninjavan.co',
  'haziq.husairi@ninjavan.co',
  'adzlan.mohamadyusoff@ninjavan.co',
  'azrul.azman@ninjavan.co',
  'khairul.roges@ninjavan.co',
  'amirul.faris@ninjavan.co',
  'shahril.hissham@ninjavan.co',
  'amirul.zamberi@ninjavan.co',
  'jamal.azwie@ninjavan.co',
  'amierul.zuhide@ninjavan.co',
  'hakimi.sukari@ninjavan.co',
  'farisamin.rasli@ninjavan.co',
  'suhail.azzahari@ninjavan.co',
  'adif.mohdafiqiqbal@ninjavan.co',
  'ilham.aswin@ninjavan.co',
  'fahmi.kamsani@ninjavan.co',
  'najib.halif@ninjavan.co',
  'mohammadshafiq.sapeei@ninjavan.co',
  'amirul.azlan@ninjavan.co',
  'aiman.alpin@ninjavan.co',
  'norsafuwan.norazman@ninjavan.co',
  'fitri.hassim@ninjavan.co',
  'zaidi.mokhtar@ninjavan.co',
  'ashraf.rahmat@ninjavan.co',
  'hyder.nazlim@ninjavan.co',
  'fasil.haruddin@ninjavan.co',
  'brian.edward@ninjavan.co',
  'afiq.afifuddin@ninjavan.co',
  'solehuddin.radzi@ninjavan.co',
  'muhamadasyraf.mustafar@ninjavan.co',
  'rufendy.musa1@ninjavan.co',
  'farah.aripin@ninjavan.co',
  'muqri.sham@ninjavan.co',
  'sahrul.ridwan@ninjavan.co',
  'areff.mahdi@ninjavan.co',
  'mohd.nazirom@ninjavan.co',
  'aliff.rosidy@ninjavan.co',
  'norman.razak@ninjavan.co',
  'ameer.jasni@ninjavan.co',
  'farid.hakim@ninjavan.co',
  'shahzwan.haikal@ninjavan.co',
  'fauzul.ahmad@ninjavan.co',
  'harith.huzairi@ninjavan.co',
  'muhammad.isa@ninjavan.co',
  'firdaus.hadi@ninjavan.co',
  'azmil.rosdan@ninjavan.co',
  'affieq.ridzuan@ninjavan.co',
  'fahmi.fuad@ninjavan.co',
  'fathul.nazarudin@ninjavan.co',
  'mustafa.daniar@ninjavan.co',
  'zul.haris@ninjavan.co',
  'izmi.aiza@ninjavan.co',
  'muizzuddin.daud@ninjavan.co',
  'abdul.hadi@ninjavan.co',
  'izzuan.ayob@ninjavan.co',
  'thaqif.hidzir@ninjavan.co',
  'noramin.mohammadzani@ninjavan.co',
  'najmuddin.khalib@ninjavan.co',
  'farhan.hashim@ninjavan.co',
  'azwan.ramli@ninjavan.co',
  'ahmad.hazlan@ninjavan.co',
  'alif.hisham@ninjavan.co',
  'amiruddin.anzmi@ninjavan.co',
  'wanahmadaiman.othman@ninjavan.co',
  'muhammad.syahmin1@ninjavan.co',
  'rusdi.abdullah@ninjavan.co',
  'jenang.acheng@ninjavan.co',
  'aiman.redhuwan@ninjavan.co',
  'qayyum.jamal@ninjavan.co',
  'nurrusydiah.abdullah@ninjavan.co',
  'farhan.kodari@ninjavan.co',
  'syariff.sukri@ninjavan.co',
  'hamzah.isa@ninjavan.co',
  'adam.azrin@ninjavan.co',
  'kamarul.zain@ninjavan.co',
  'addin.johari@ninjavan.co',
  'majid.sajari@ninjavan.co',
  'arif.ramzi@ninjavan.co',
  'nazman.ramlan@ninjavan.co',
  'arif.zakri@ninjavan.co',
  'saiful.hizam@ninjavan.co',
  'azraei.mohdanuar@ninjavan.co',
  'aelfaiez.wananuar@ninjavan.co',
  'rafiqi.w.rukman@ninjavan.co',
  'aaron.abdullah@ninjavan.co',
  'nuridzham.sayuji@ninjavan.co',
  'iqzzat.norhas@ninjavan.co',
  'amin.ibrahim@ninjavan.co',
  'syamil.abdullah@ninjavan.co',
  'zulkarnain.dollah@ninjavan.co',
  'haiqal.gani@ninjavan.co',
  'hayad.jamian@ninjavan.co',
  'firdaus.raman@ninjavan.co',
  'azrul.iswandy@ninjavan.co',
  'izwanshah.iskandar@ninjavan.co',
  'hakimm.amizon@ninjavan.co',
  'haiman.suhaimi@ninjavan.co',
  'muhammad.jeffri@ninjavan.co',
  'muzaffar.zamri@ninjavan.co',
  'hafiz.anuar@ninjavan.co',
  'shahmin.mohamadali@ninjavan.co',
  'nurilham.zulkifli@ninjavan.co',
  'danish.luqman@ninjavan.co',
  'naim.najib@ninjavan.co',
  'mazli.yahya@ninjavan.co');

-- from V53__home_posting.sql
UPDATE users SET home_scope_type = scope_type, home_scope_values = scope_values WHERE home_scope_type IS NULL;

-- from V54__headcount_seats.sql
INSERT INTO headcount_seats (station, designation, note, status, requested_by, requested_at, decided_by, decided_at) VALUES
  ('Kuching', 'fleet_assistant', 'Mohammad Syafiq Bin Sulaiman (email TBA)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('Setia Alam', 'fleet_assistant', 'Muhamad Asyraf Bin Muhamed Suzeli (email TBA)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('Kepong', 'fleet_assistant', 'Muhammad Ryan Merannto Bin Abdullah (email TBA)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('Chow Kit', 'fleet_assistant', 'Vacant (TBA)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW());

-- from V56__staff_contact.sql
UPDATE users SET phone = COALESCE(phone, '017-9386778'), employee_id = COALESCE(employee_id, 'NVMY6315') WHERE LOWER(email) = 'zahirudin.zainal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-5747624'), employee_id = COALESCE(employee_id, 'NVMY4595') WHERE LOWER(email) = 'hazieq.haznan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-2840264'), employee_id = COALESCE(employee_id, 'NVMY7417') WHERE LOWER(email) = 'izwan.haron@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-2340509'), employee_id = COALESCE(employee_id, 'NVMY7807') WHERE LOWER(email) = 'syahmi.sabri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014 6087102'), employee_id = COALESCE(employee_id, '10033451') WHERE LOWER(email) = 'haziq.lajis@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-2152743'), employee_id = COALESCE(employee_id, 'NVMY8858') WHERE LOWER(email) = 'aliff.azizan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-25482465'), employee_id = COALESCE(employee_id, 'NVMY5361') WHERE LOWER(email) = 'hadzrin.samsudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-35638769'), employee_id = COALESCE(employee_id, 'NVMY1965') WHERE LOWER(email) = 'muhammad.annuar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9144171'), employee_id = COALESCE(employee_id, 'NVMY7270') WHERE LOWER(email) = 'ain.ishak@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9600406'), employee_id = COALESCE(employee_id, 'NVMY5335') WHERE LOWER(email) = 'fahim.fadhli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-915 0554'), employee_id = COALESCE(employee_id, 'NVMY1018') WHERE LOWER(email) = 'ridhuan.azhar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4975435'), employee_id = COALESCE(employee_id, 'NVMY9193') WHERE LOWER(email) = 'aiman.halim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-61023972'), employee_id = COALESCE(employee_id, 'NVMY8862') WHERE LOWER(email) = 'amirul.mazlan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-19816982'), employee_id = COALESCE(employee_id, 'NVMY5680') WHERE LOWER(email) = 'fatin.zainuddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-5331416'), employee_id = COALESCE(employee_id, '10035933') WHERE LOWER(email) = 'afi.wanrazali@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-2511095'), employee_id = COALESCE(employee_id, 'NVMY8080H') WHERE LOWER(email) = 'fadhli.zahari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-6319387'), employee_id = COALESCE(employee_id, 'NVMY9399') WHERE LOWER(email) = 'idlan.darus@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9419930'), employee_id = COALESCE(employee_id, 'NVMY8119') WHERE LOWER(email) = 'farhana.zainuddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-37570040'), employee_id = COALESCE(employee_id, 'NVMY9320') WHERE LOWER(email) = 'shahiran.jamizan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-9542644'), employee_id = COALESCE(employee_id, 'NVMY1088') WHERE LOWER(email) = 'asyraf.rahmat@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-8118925'), employee_id = COALESCE(employee_id, '10036042') WHERE LOWER(email) = 'sufian.mohdzairi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-9130359'), employee_id = COALESCE(employee_id, 'NVMY2375H') WHERE LOWER(email) = 'ain.sezali@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-9343905'), employee_id = COALESCE(employee_id, '10035808') WHERE LOWER(email) = 'aizat.khairulnazri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-2963949'), employee_id = COALESCE(employee_id, '10035810') WHERE LOWER(email) = 'ridzuan.ludin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-8533097'), employee_id = COALESCE(employee_id, '10035983') WHERE LOWER(email) = 'faratul.hakimi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-11191817'), employee_id = COALESCE(employee_id, 'NVMY0995') WHERE LOWER(email) = 'ridzuan.salam@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-3146005'), employee_id = COALESCE(employee_id, 'NVMY9613') WHERE LOWER(email) = 'nazreen.mohd@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2985314'), employee_id = COALESCE(employee_id, 'NVMY3731') WHERE LOWER(email) = 'syed.aluwi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-62190081'), employee_id = COALESCE(employee_id, 'NVMY7447') WHERE LOWER(email) = 'nasrul.nizam@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-9113074'), employee_id = COALESCE(employee_id, 'NVMY7141') WHERE LOWER(email) = 'naim.nor@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-2779901'), employee_id = COALESCE(employee_id, 'NVMY0017') WHERE LOWER(email) = 'ahmad.syakir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-20989663'), employee_id = COALESCE(employee_id, 'NVMY9692') WHERE LOWER(email) = 'rahim.nor@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-9039902'), employee_id = COALESCE(employee_id, 'NVMY9691') WHERE LOWER(email) = 'mohammad.abdullah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-8717778'), employee_id = COALESCE(employee_id, 'NVMY5091') WHERE LOWER(email) = 'khaizuran.bakhril@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-25591714'), employee_id = COALESCE(employee_id, 'NVMY9974') WHERE LOWER(email) = 'haniff.hamasakee@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-5321955'), employee_id = COALESCE(employee_id, 'NVMY5358') WHERE LOWER(email) = 'hakimi.mohamad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-25700507'), employee_id = COALESCE(employee_id, 'NVMY5084') WHERE LOWER(email) = 'zukri.jalil@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9632945'), employee_id = COALESCE(employee_id, '10035858') WHERE LOWER(email) = 'zaim.adnan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-8490336'), employee_id = COALESCE(employee_id, 'NVMY0512') WHERE LOWER(email) = 'nursalam.rusli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-8039005'), employee_id = COALESCE(employee_id, 'NVMY3756') WHERE LOWER(email) = 'haris.setapa@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-5445113'), employee_id = COALESCE(employee_id, 'NVMY2146') WHERE LOWER(email) = 'hazim.firdaus@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-2071474'), employee_id = COALESCE(employee_id, 'NVMY6913') WHERE LOWER(email) = 'adam.saidi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-4347647'), employee_id = COALESCE(employee_id, 'NVMY0594') WHERE LOWER(email) = 'syahrir.sulaiman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-5954663'), employee_id = COALESCE(employee_id, '10035639') WHERE LOWER(email) = 'razin.zamri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-26001848'), employee_id = COALESCE(employee_id, 'NVMY0199') WHERE LOWER(email) = 'hafizi.jalil@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9993818'), employee_id = COALESCE(employee_id, 'NVMY4584') WHERE LOWER(email) = 'syahrul.husin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9236083'), employee_id = COALESCE(employee_id, 'NVMY0934') WHERE LOWER(email) = 'ahmad.fahmie@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4894327'), employee_id = COALESCE(employee_id, 'NVMY6124') WHERE LOWER(email) = 'izamudin.izlan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2663954'), employee_id = COALESCE(employee_id, 'NVMY3931') WHERE LOWER(email) = 'khairul.ali@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-7613364'), employee_id = COALESCE(employee_id, 'NVMY10493') WHERE LOWER(email) = 'nabil.aziz@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-58838923'), employee_id = COALESCE(employee_id, 'NVMY1508') WHERE LOWER(email) = 'rizal.saod@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-5173621'), employee_id = COALESCE(employee_id, 'NVMY6132') WHERE LOWER(email) = 'ahmad.marzuki@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-910 4064'), employee_id = COALESCE(employee_id, 'NVMY1812') WHERE LOWER(email) = 'ahmad.affan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-8185772'), employee_id = COALESCE(employee_id, 'NVMY5365') WHERE LOWER(email) = 'shazaril.shukri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-5032357'), employee_id = COALESCE(employee_id, 'NVMY8996') WHERE LOWER(email) = 'ihsan.mazli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-9359356'), employee_id = COALESCE(employee_id, 'NVMY0229') WHERE LOWER(email) = 'zihni.zamani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-5334658'), employee_id = COALESCE(employee_id, 'NVMY5089') WHERE LOWER(email) = 'nabil.ahkram@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-5033421'), employee_id = COALESCE(employee_id, 'NVMY0115') WHERE LOWER(email) = 'hanif.idrus@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-8374826'), employee_id = COALESCE(employee_id, 'NVMY9113') WHERE LOWER(email) = 'afif.aljafry@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-9723842'), employee_id = COALESCE(employee_id, 'NVMY3162H') WHERE LOWER(email) = 'azrul.baharuddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-5436395'), employee_id = COALESCE(employee_id, 'NVMY1353') WHERE LOWER(email) = 'farhan.ikhwan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-9698395'), employee_id = COALESCE(employee_id, 'NVMY2948') WHERE LOWER(email) = 'khairudin.asri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-3763379'), employee_id = COALESCE(employee_id, 'NVMY0189') WHERE LOWER(email) = 'azrin.hamid@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4227671'), employee_id = COALESCE(employee_id, 'NVMY2938') WHERE LOWER(email) = 'amirul.rushdan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-6435928'), employee_id = COALESCE(employee_id, 'NVMY5367') WHERE LOWER(email) = 'chin.shen@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-29490254'), employee_id = COALESCE(employee_id, 'NVMY7065H') WHERE LOWER(email) = 'amir.afizan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-7623108'), employee_id = COALESCE(employee_id, 'NVMY4282H') WHERE LOWER(email) = 'syahrul.muhamad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2424210'), employee_id = COALESCE(employee_id, 'NVMY0822') WHERE LOWER(email) = 'esmat.fahmi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-21825400'), employee_id = COALESCE(employee_id, 'NVMY10189') WHERE LOWER(email) = 'ammar.ismail@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-7859659'), employee_id = COALESCE(employee_id, 'NVMY9902') WHERE LOWER(email) = 'norathirah.jusli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-8755065'), employee_id = COALESCE(employee_id, '10034787') WHERE LOWER(email) = 'jaidi.ghani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-2495117 / 011-16375056'), employee_id = COALESCE(employee_id, '10034788') WHERE LOWER(email) = 'fajilah.ismail1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-8655654'), employee_id = COALESCE(employee_id, 'NVMY9396') WHERE LOWER(email) = 'shahrizal.akmat@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-3143 6377'), employee_id = COALESCE(employee_id, '10036100') WHERE LOWER(email) = 'malwanraj.malik@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-2838347'), employee_id = COALESCE(employee_id, 'NVMY10584') WHERE LOWER(email) = 'azianaazinda.azmie@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-8459675'), employee_id = COALESCE(employee_id, '10034769') WHERE LOWER(email) = 'azniezah.nordin1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-5103857'), employee_id = COALESCE(employee_id, 'NVMY6632') WHERE LOWER(email) = 'redzuan.maidin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-62192495'), employee_id = COALESCE(employee_id, '10034326') WHERE LOWER(email) = 'zulhisyam.eli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-21559800'), employee_id = COALESCE(employee_id, 'NVMY10418') WHERE LOWER(email) = 'asyraf.taip@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-6488044'), employee_id = COALESCE(employee_id, '10034254') WHERE LOWER(email) = 'iven.anthony2@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-24827570'), employee_id = COALESCE(employee_id, '10034642') WHERE LOWER(email) = 'afdhal.azamuddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-61276405'), employee_id = COALESCE(employee_id, 'NVMY9191') WHERE LOWER(email) = 'eldon.tang@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-19050257'), employee_id = COALESCE(employee_id, 'NVMY10180') WHERE LOWER(email) = 'deniver.jupirin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-54554401'), employee_id = COALESCE(employee_id, 'NVMY9509') WHERE LOWER(email) = 'aisyam.baharudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-3143235'), employee_id = COALESCE(employee_id, '10035873') WHERE LOWER(email) = 'khairilanwar.suhaili@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-9618299'), employee_id = COALESCE(employee_id, 'NVMY4455H') WHERE LOWER(email) = 'sahirul.sadah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-25328016'), employee_id = COALESCE(employee_id, 'NVMY6314') WHERE LOWER(email) = 'debbrolryne.jupirin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9276769'), employee_id = COALESCE(employee_id, 'NVMY10485') WHERE LOWER(email) = 'mohd.mahadir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-31512047'), employee_id = COALESCE(employee_id, 'NVMY10290') WHERE LOWER(email) = 'mdfazly.darong@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-9926482'), employee_id = COALESCE(employee_id, 'NVMY10288') WHERE LOWER(email) = 'syazwansaufi.irwanto@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-8673631'), employee_id = COALESCE(employee_id, 'NVMY9194') WHERE LOWER(email) = 'fahmi.shaiffuddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-9695365'), employee_id = COALESCE(employee_id, 'NVMY10289') WHERE LOWER(email) = 'hermogenes.friasjr@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-8980592'), employee_id = COALESCE(employee_id, 'NVMY1959') WHERE LOWER(email) = 'rustam.baharon@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6713367'), employee_id = COALESCE(employee_id, 'NVMY5774') WHERE LOWER(email) = 'norasmah.madjaraha@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-5712176'), employee_id = COALESCE(employee_id, 'NVMY9799') WHERE LOWER(email) = 'nizam.kassim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-6792672'), employee_id = COALESCE(employee_id, 'NVMY9195') WHERE LOWER(email) = 'izwan.zulkornai@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-7860279'), employee_id = COALESCE(employee_id, 'NVMY8998') WHERE LOWER(email) = 'azlan.mohammad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-9842699'), employee_id = COALESCE(employee_id, 'NVMY9468H') WHERE LOWER(email) = 'muqzamir.ahmad2@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-8078836'), employee_id = COALESCE(employee_id, '10035927') WHERE LOWER(email) = 'aidilshazwan.azamri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-6865824'), employee_id = COALESCE(employee_id, 'NVMY4622') WHERE LOWER(email) = 'fazlin.mamin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-39805176'), employee_id = COALESCE(employee_id, '10034396') WHERE LOWER(email) = 'syafiq.zainal1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-14092832'), employee_id = COALESCE(employee_id, 'NVMY9186') WHERE LOWER(email) = 'angelina.biddy@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-6821530'), employee_id = COALESCE(employee_id, '10035645') WHERE LOWER(email) = 'lencaster.inyau@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-7991961'), employee_id = COALESCE(employee_id, '10035596') WHERE LOWER(email) = 'amirul.malik@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-70784866'), employee_id = COALESCE(employee_id, 'NVMY9517') WHERE LOWER(email) = 'saifullah.zalmy@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4436483'), employee_id = COALESCE(employee_id, 'NVMY10407') WHERE LOWER(email) = 'hafizzah.zainal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-7865748'), employee_id = COALESCE(employee_id, '10033446') WHERE LOWER(email) = 'mohammadalhafiz.ahmadriduan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-64667704'), employee_id = COALESCE(employee_id, 'NVMY6131') WHERE LOWER(email) = 'waie.aziz@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-8380940'), employee_id = COALESCE(employee_id, '10034146') WHERE LOWER(email) = 'nurulain.wahid@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-3289387'), employee_id = COALESCE(employee_id, '10035501') WHERE LOWER(email) = 'asfa.yusoff@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-25116902'), employee_id = COALESCE(employee_id, '10034661') WHERE LOWER(email) = 'kevin.malim1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-3386806'), employee_id = COALESCE(employee_id, 'NVMY10401') WHERE LOWER(email) = 'dyevin.john@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-5918401'), employee_id = COALESCE(employee_id, 'NVMY9395') WHERE LOWER(email) = 'faizul.sauti@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-2080441'), employee_id = COALESCE(employee_id, '10034829') WHERE LOWER(email) = 'qairul.romi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-2786634'), employee_id = COALESCE(employee_id, '10034252') WHERE LOWER(email) = 'francis.li1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-8883521'), employee_id = COALESCE(employee_id, 'NVMY7136') WHERE LOWER(email) = 'garcia.ulie@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-7594261'), employee_id = COALESCE(employee_id, 'NVMY4180') WHERE LOWER(email) = 'hanis.daud@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-14412452'), employee_id = COALESCE(employee_id, '10035662') WHERE LOWER(email) = 'hafiz.khadib@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-3643604'), employee_id = COALESCE(employee_id, 'NVMY2521H') WHERE LOWER(email) = 'mohd.husaini1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-56340234'), employee_id = COALESCE(employee_id, 'NVMY1525') WHERE LOWER(email) = 'shazmil.noh@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-19631125'), employee_id = COALESCE(employee_id, 'NVMY1336H') WHERE LOWER(email) = 'syaifullah.hamid@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-7020289'), employee_id = COALESCE(employee_id, 'NVMY1282') WHERE LOWER(email) = 'zaideen.ahmad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-9599140'), employee_id = COALESCE(employee_id, '10032559') WHERE LOWER(email) = 'anuar.wahab@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-36630603'), employee_id = COALESCE(employee_id, 'NVMY9202') WHERE LOWER(email) = 'hakiim.manan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-6012617'), employee_id = COALESCE(employee_id, 'NVMY0081') WHERE LOWER(email) = 'khairil.najmi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-9939252'), employee_id = COALESCE(employee_id, 'NVMY8627') WHERE LOWER(email) = 'hairul.anuar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-4286830'), employee_id = COALESCE(employee_id, 'NVMY3833H') WHERE LOWER(email) = 'fadhril.ghazali@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-5524904'), employee_id = COALESCE(employee_id, 'NVMY0911') WHERE LOWER(email) = 'rassul.rohani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-61976744'), employee_id = COALESCE(employee_id, 'NVMY2560H') WHERE LOWER(email) = 'faizal.shukri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-4826368'), employee_id = COALESCE(employee_id, 'NVMY4766') WHERE LOWER(email) = 'faris.fakhruddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-5541755'), employee_id = COALESCE(employee_id, 'NVMY0581') WHERE LOWER(email) = 'sharol.azri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-10840991'), employee_id = COALESCE(employee_id, '10035844') WHERE LOWER(email) = 'shamsuri.shamsudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-35938121'), employee_id = COALESCE(employee_id, '10101890') WHERE LOWER(email) = 'zameri.liki@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-5273183'), employee_id = COALESCE(employee_id, 'NVMY3957H') WHERE LOWER(email) = 'shaffiq.nadzri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-61745696'), employee_id = COALESCE(employee_id, 'NVMY3770') WHERE LOWER(email) = 'amirulfarhan.azizi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-14956962 / 011-59641262'), employee_id = COALESCE(employee_id, 'NVMY0436') WHERE LOWER(email) = 'faqrul.rodzi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-2513623'), employee_id = COALESCE(employee_id, '10034666') WHERE LOWER(email) = 'asyraf.shaari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-26548384'), employee_id = COALESCE(employee_id, 'NVMY1016') WHERE LOWER(email) = 'syafiq.suferi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-5417640'), employee_id = COALESCE(employee_id, '10034665') WHERE LOWER(email) = 'yusuf.ghazali1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-4166840'), employee_id = COALESCE(employee_id, 'NVMY5307') WHERE LOWER(email) = 'syahril.shamsudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-69426468'), employee_id = COALESCE(employee_id, 'NVMY5340') WHERE LOWER(email) = 'daud.nasir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-7550593'), employee_id = COALESCE(employee_id, 'NVMY10585') WHERE LOWER(email) = 'dinie.othman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2256657'), employee_id = COALESCE(employee_id, 'NVMY0207') WHERE LOWER(email) = 'ihsan.nasir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-4606564'), employee_id = COALESCE(employee_id, 'NVMY1523') WHERE LOWER(email) = 'syazwan.hazim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-6693943'), employee_id = COALESCE(employee_id, 'NVMY7604') WHERE LOWER(email) = 'akram.rahim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-4320619'), employee_id = COALESCE(employee_id, 'NVMY1286') WHERE LOWER(email) = 'farizwan.akhir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-5410257'), employee_id = COALESCE(employee_id, 'NVMY6320') WHERE LOWER(email) = 'khairul.zamri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-3200218'), employee_id = COALESCE(employee_id, '10036039') WHERE LOWER(email) = 'haikal.abdrazak@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-7750349'), employee_id = COALESCE(employee_id, 'NVMY6319') WHERE LOWER(email) = 'fitri.rodzi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-529 5960'), employee_id = COALESCE(employee_id, 'NVMY1967') WHERE LOWER(email) = 'aliff.rosli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-9093103'), employee_id = COALESCE(employee_id, '10034142') WHERE LOWER(email) = 'hadirah.nasrin1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-37214139'), employee_id = COALESCE(employee_id, 'NVMY8629') WHERE LOWER(email) = 'azri.azhar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-55543034'), employee_id = COALESCE(employee_id, '10034458') WHERE LOWER(email) = 'aufa.zainal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-8277826'), employee_id = COALESCE(employee_id, '10034977') WHERE LOWER(email) = 'faiz.nasir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-67646507'), employee_id = COALESCE(employee_id, '10035305') WHERE LOWER(email) = 'hasanizal.othman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-19290421'), employee_id = COALESCE(employee_id, '10036096') WHERE LOWER(email) = 'hafiz.zamri1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4444079'), employee_id = COALESCE(employee_id, '10036163') WHERE LOWER(email) = 'imran.ruslan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-5041561'), employee_id = COALESCE(employee_id, '10102024') WHERE LOWER(email) = 'mohdsalehudeen.hairulanuar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4198042'), employee_id = COALESCE(employee_id, 'NVMY1666') WHERE LOWER(email) = 'siddhiq.saman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-26758298'), employee_id = COALESCE(employee_id, '10036037') WHERE LOWER(email) = 'rusydan.awangdamit@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-8431430'), employee_id = COALESCE(employee_id, '10035303') WHERE LOWER(email) = 'adam.abdullah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-8885031'), employee_id = COALESCE(employee_id, '10035872') WHERE LOWER(email) = 'prem.sinitharan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-3410587'), employee_id = COALESCE(employee_id, '10036146') WHERE LOWER(email) = 'ikram.omar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-68353863'), employee_id = COALESCE(employee_id, '10036162') WHERE LOWER(email) = 'aiman.aziz@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-24079909'), employee_id = COALESCE(employee_id, 'NVMY4771') WHERE LOWER(email) = 'hafizzuddin.nasir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-6655821'), employee_id = COALESCE(employee_id, 'NVMY10495') WHERE LOWER(email) = 'aiman.sofian@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-5950129'), employee_id = COALESCE(employee_id, 'NVMY2149') WHERE LOWER(email) = 'adam.haris@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-37859306'), employee_id = COALESCE(employee_id, '10032834') WHERE LOWER(email) = 'azreenshahrizal.hawari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-14388870'), employee_id = COALESCE(employee_id, 'NVMY5348') WHERE LOWER(email) = 'imran.rashidi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-4450179'), employee_id = COALESCE(employee_id, 'NVMY4033') WHERE LOWER(email) = 'fazly.zakaria@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-3954015'), employee_id = COALESCE(employee_id, 'NVMY10586') WHERE LOWER(email) = 'akram.shah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-4445217'), employee_id = COALESCE(employee_id, 'NVMY5778') WHERE LOWER(email) = 'safwan.suhaimy@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-5227022'), employee_id = COALESCE(employee_id, '10036093') WHERE LOWER(email) = 'syafiq.abdghoni@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-2033035'), employee_id = COALESCE(employee_id, 'NVMY1013') WHERE LOWER(email) = 'zahadi.zahari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-2677859'), employee_id = COALESCE(employee_id, 'NVMY1593') WHERE LOWER(email) = 'ahlil.mustaqim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4469663'), employee_id = COALESCE(employee_id, 'NVMY7002H') WHERE LOWER(email) = 'faiz.jana@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-5016196'), employee_id = COALESCE(employee_id, 'NVMY0502') WHERE LOWER(email) = 'syazwan.eddy@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-3595969'), employee_id = COALESCE(employee_id, 'NVMY1513') WHERE LOWER(email) = 'ainol.muzaffar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-5161055'), employee_id = COALESCE(employee_id, 'NVMY0825') WHERE LOWER(email) = 'anas.malik@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-7168685'), employee_id = COALESCE(employee_id, 'NVMY10597') WHERE LOWER(email) = 'najmirul.rajuni@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-5545415'), employee_id = COALESCE(employee_id, '10033443') WHERE LOWER(email) = 'inammullah.mkadiri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4025339'), employee_id = COALESCE(employee_id, 'NVMY2935') WHERE LOWER(email) = 'izdihar.abdullah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-5655561'), employee_id = COALESCE(employee_id, 'NVMY2616H') WHERE LOWER(email) = 'hazril.harun@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-3493475'), employee_id = COALESCE(employee_id, 'NVMY1355') WHERE LOWER(email) = 'kamil.hafiz@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-4793665'), employee_id = COALESCE(employee_id, 'NVMY1806') WHERE LOWER(email) = 'rasyid.hazam@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-3581676'), employee_id = COALESCE(employee_id, 'NVMY4086H') WHERE LOWER(email) = 'faisal.ajam2@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-16465487'), employee_id = COALESCE(employee_id, 'NVMY0171') WHERE LOWER(email) = 'nabil.fikri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-678 3390'), employee_id = COALESCE(employee_id, 'NVMY5691') WHERE LOWER(email) = 'hafizzie.hasnan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-4247880'), employee_id = COALESCE(employee_id, 'NVMY4321H') WHERE LOWER(email) = 'syahril.aziz@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-5635907'), employee_id = COALESCE(employee_id, 'NVMY4032') WHERE LOWER(email) = 'faizal.kamalludin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-5079577'), employee_id = COALESCE(employee_id, '10036121') WHERE LOWER(email) = 'ridhwan.jaafar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-6438794'), employee_id = COALESCE(employee_id, 'NVMY10170') WHERE LOWER(email) = 'haffiszie.hakim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-4189903'), employee_id = COALESCE(employee_id, 'NVMY8051') WHERE LOWER(email) = 'saiful.dollah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-19568439'), employee_id = COALESCE(employee_id, '10036158') WHERE LOWER(email) = 'norazlina.jaafar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-6744574'), employee_id = COALESCE(employee_id, '10034586') WHERE LOWER(email) = 'asrie.malik@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2432080'), employee_id = COALESCE(employee_id, 'NVMY4253H') WHERE LOWER(email) = 'aiman.jafridin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-2107971'), employee_id = COALESCE(employee_id, 'NVMY0826') WHERE LOWER(email) = 'ariff.baharuddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2132556'), employee_id = COALESCE(employee_id, '10036123') WHERE LOWER(email) = 'raokib.abdulkadir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-63792534'), employee_id = COALESCE(employee_id, 'NVMY10410') WHERE LOWER(email) = 'hanzholah.hasani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-11616521'), employee_id = COALESCE(employee_id, '10035872') WHERE LOWER(email) = 'putrinabila.mohdarfhan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-21728136'), employee_id = COALESCE(employee_id, '10036156') WHERE LOWER(email) = 'riddaudin.seeh@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-7434414'), employee_id = COALESCE(employee_id, '10032534') WHERE LOWER(email) = 'firdaus.asri1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-3360147'), employee_id = COALESCE(employee_id, '10035070') WHERE LOWER(email) = 'amiruddin.zailan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-60770600'), employee_id = COALESCE(employee_id, 'NVMY9908') WHERE LOWER(email) = 'haikal.rashid@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-7236862'), employee_id = COALESCE(employee_id, '10034522') WHERE LOWER(email) = 'syazrin.badurisam@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-2744264'), employee_id = COALESCE(employee_id, 'NVMY7791') WHERE LOWER(email) = 'najib.harison@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-958 2348'), employee_id = COALESCE(employee_id, 'NYMY6249') WHERE LOWER(email) = 'nasuha.kamalludin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-63616367'), employee_id = COALESCE(employee_id, 'NVMY4259H') WHERE LOWER(email) = 'aidil.kamarudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-7403787'), employee_id = COALESCE(employee_id, 'NVMY5346') WHERE LOWER(email) = 'fauzan.salim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-7297998'), employee_id = COALESCE(employee_id, '10034428') WHERE LOWER(email) = 'taufiq.nadri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-7690258'), employee_id = COALESCE(employee_id, '10036176') WHERE LOWER(email) = 'afiq.sukono@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-64076420'), employee_id = COALESCE(employee_id, 'NVMY9834H') WHERE LOWER(email) = 'hakimi.razali@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-8914240'), employee_id = COALESCE(employee_id, '10035743') WHERE LOWER(email) = 'israafsolihin.shuib@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-27142033'), employee_id = COALESCE(employee_id, '10036197') WHERE LOWER(email) = 'syawaluddin.roslan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-7830912'), employee_id = COALESCE(employee_id, '10035698') WHERE LOWER(email) = 'syafiq.shafawi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-6521655'), employee_id = COALESCE(employee_id, '10032540') WHERE LOWER(email) = 'zaidi.zulkarnain@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-4506533'), employee_id = COALESCE(employee_id, '10036206') WHERE LOWER(email) = 'zulakmal.zulkahar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-39549225'), employee_id = COALESCE(employee_id, '10031853') WHERE LOWER(email) = 'azmil.ismail@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-60506151'), employee_id = COALESCE(employee_id, 'NVMY10496') WHERE LOWER(email) = 'izrafil.kadir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-9473145'), employee_id = COALESCE(employee_id, 'NVMY1518') WHERE LOWER(email) = 'fazdil.ismail@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-36812096'), employee_id = COALESCE(employee_id, '10035597') WHERE LOWER(email) = 'shafiee.isham@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-29854938'), employee_id = COALESCE(employee_id, '10034825') WHERE LOWER(email) = 'ahmadie.azuan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-36120791'), employee_id = COALESCE(employee_id, '10035372') WHERE LOWER(email) = 'arfan.narudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-7309544'), employee_id = COALESCE(employee_id, '10036142') WHERE LOWER(email) = 'luqman.musa@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-16870618'), employee_id = COALESCE(employee_id, '10035877') WHERE LOWER(email) = 'hazim.rosli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-9542954'), employee_id = COALESCE(employee_id, 'NVMY5782') WHERE LOWER(email) = 'fatihah.masdi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-7846339'), employee_id = COALESCE(employee_id, 'NVMY3445') WHERE LOWER(email) = 'zikhri.khair@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-26383428 / 017-7478457'), employee_id = COALESCE(employee_id, 'NVMY3751') WHERE LOWER(email) = 'faiq.mohtar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-11473945'), employee_id = COALESCE(employee_id, 'NVMY4991H') WHERE LOWER(email) = 'auf.taib@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-4581870'), employee_id = COALESCE(employee_id, 'NVMY1522') WHERE LOWER(email) = 'shahrul.azren@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-6644738'), employee_id = COALESCE(employee_id, 'NVMY6666') WHERE LOWER(email) = 'fairoza.zainol@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017- 665 9357'), employee_id = COALESCE(employee_id, 'NVMY0126') WHERE LOWER(email) = 'firdaus.wahid@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-7972855'), employee_id = COALESCE(employee_id, 'NVMY1754') WHERE LOWER(email) = 'azrie.shafiq@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-7260354'), employee_id = COALESCE(employee_id, 'NVMY3753') WHERE LOWER(email) = 'taufiq.nandil@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-2023808'), employee_id = COALESCE(employee_id, '10101964') WHERE LOWER(email) = 'zulkarnain.shamsudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-33049171'), employee_id = COALESCE(employee_id, 'NVMY5326') WHERE LOWER(email) = 'hazwan.hasran@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-26676053'), employee_id = COALESCE(employee_id, 'NVMY0926') WHERE LOWER(email) = 'syahid.noh@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-7601080'), employee_id = COALESCE(employee_id, 'NVMY1515') WHERE LOWER(email) = 'shahriswan.samah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-6553601'), employee_id = COALESCE(employee_id, 'NVMY9178') WHERE LOWER(email) = 'hafis.kassim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-4834544 / 013-9565657'), employee_id = COALESCE(employee_id, 'NVMY1349') WHERE LOWER(email) = 'syakir.syed@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-7442155'), employee_id = COALESCE(employee_id, 'NVMY6886') WHERE LOWER(email) = 'nizar.nazrullah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-51352648'), employee_id = COALESCE(employee_id, 'NVMY1808') WHERE LOWER(email) = 'jumain.parmo@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-7147536'), employee_id = COALESCE(employee_id, 'NVMY0457') WHERE LOWER(email) = 'zahin.ghafor@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-6647065'), employee_id = COALESCE(employee_id, 'NVMY4656H') WHERE LOWER(email) = 'hazmi.isa@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-14388009'), employee_id = COALESCE(employee_id, 'NVMY2211H') WHERE LOWER(email) = 'nazarudin.jalal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-7145547'), employee_id = COALESCE(employee_id, 'NVMY1512') WHERE LOWER(email) = 'kamarulzulfekha.zaini@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-11559505'), employee_id = COALESCE(employee_id, 'NVMY8343') WHERE LOWER(email) = 'khairul.sani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-6591447'), employee_id = COALESCE(employee_id, 'NVMY10599') WHERE LOWER(email) = 'haqim.norzafarin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-2395102'), employee_id = COALESCE(employee_id, 'NVMY1961') WHERE LOWER(email) = 'naqib.anaqi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-36370566'), employee_id = COALESCE(employee_id, 'NVMY10280') WHERE LOWER(email) = 'luqman.samin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6137596'), employee_id = COALESCE(employee_id, 'NVMY7135') WHERE LOWER(email) = 'anwar.azman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9460034'), employee_id = COALESCE(employee_id, 'NVMY8052') WHERE LOWER(email) = 'anwar.husain@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-10128247'), employee_id = COALESCE(employee_id, 'NVMY7950') WHERE LOWER(email) = 'arif.zakaria@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-2426424'), employee_id = COALESCE(employee_id, 'NVMY0007') WHERE LOWER(email) = 'abi.ubaidah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-5630353'), employee_id = COALESCE(employee_id, 'NVMY7603') WHERE LOWER(email) = 'zulhilmi.zamili@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-23103633'), employee_id = COALESCE(employee_id, '10035643') WHERE LOWER(email) = 'ariff.jasman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-3525326'), employee_id = COALESCE(employee_id, 'NVMY7457') WHERE LOWER(email) = 'taufik.henra@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6732564'), employee_id = COALESCE(employee_id, 'NVMY0198') WHERE LOWER(email) = 'hafiz.kasron@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '6172986804'), employee_id = COALESCE(employee_id, 'NVMY5410') WHERE LOWER(email) = 'shah.sorep@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-6447880'), employee_id = COALESCE(employee_id, 'NVMY9197') WHERE LOWER(email) = 'faradisham.yunus@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-4045149'), employee_id = COALESCE(employee_id, 'NVMY1200') WHERE LOWER(email) = 'amar.asraf@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-3487158'), employee_id = COALESCE(employee_id, '10036204') WHERE LOWER(email) = 'aiman.fairus@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-6980762'), employee_id = COALESCE(employee_id, 'NVMY1814') WHERE LOWER(email) = 'ikmal.hakim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-3919332'), employee_id = COALESCE(employee_id, 'NVMY10184') WHERE LOWER(email) = 'alif.asyraf@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-7636234'), employee_id = COALESCE(employee_id, 'NVMY7300') WHERE LOWER(email) = 'atiqah.najib@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-32378847'), employee_id = COALESCE(employee_id, 'NVMY1357') WHERE LOWER(email) = 'afnan.roslan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-21172365'), employee_id = COALESCE(employee_id, '141892483') WHERE LOWER(email) = 'zamrill.zamzuri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-2197287'), employee_id = COALESCE(employee_id, '10035932') WHERE LOWER(email) = 'muhammad.irfan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-6210995'), employee_id = COALESCE(employee_id, '10032644') WHERE LOWER(email) = 'daarshan.ramash@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6327320'), employee_id = COALESCE(employee_id, 'NVMY3449') WHERE LOWER(email) = 'norhisham.ahmad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-2999783'), employee_id = COALESCE(employee_id, '10035869') WHERE LOWER(email) = 'saifulnaim.shaari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-6303006'), employee_id = COALESCE(employee_id, 'NVMY0423') WHERE LOWER(email) = 'ali.zainal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-3174217'), employee_id = COALESCE(employee_id, 'NVMY8464') WHERE LOWER(email) = 'afiq.jasmi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-3942903'), employee_id = COALESCE(employee_id, 'NVMY8648') WHERE LOWER(email) = 'shukrie.khairie@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-7744387'), employee_id = COALESCE(employee_id, 'NVMY1559') WHERE LOWER(email) = 'syamil.tahril@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-8438484'), employee_id = COALESCE(employee_id, 'NVMY9405') WHERE LOWER(email) = 'amirul.mohammad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4992264'), employee_id = COALESCE(employee_id, '10035876') WHERE LOWER(email) = 'zaki.sahir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-39732811'), employee_id = COALESCE(employee_id, 'NVMY7817') WHERE LOWER(email) = 'hanif.mazni@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-69175148'), employee_id = COALESCE(employee_id, '10102414') WHERE LOWER(email) = 'saiful.sabri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-6700154'), employee_id = COALESCE(employee_id, '10034463') WHERE LOWER(email) = 'aiman.kamarulzaman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-31229967'), employee_id = COALESCE(employee_id, 'NVMY8473') WHERE LOWER(email) = 'nurazuwan.mahadi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2381626'), employee_id = COALESCE(employee_id, '10034461') WHERE LOWER(email) = 'fadzlisham.suhaimi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-2764629'), employee_id = COALESCE(employee_id, '10035986') WHERE LOWER(email) = 'muhammadafiq.mazalan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-3930756'), employee_id = COALESCE(employee_id, 'NVMY7967') WHERE LOWER(email) = 'azwan.said@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-2937046'), employee_id = COALESCE(employee_id, 'NVMY5080') WHERE LOWER(email) = 'nazirul.zulkafli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-3237987'), employee_id = COALESCE(employee_id, '10034515') WHERE LOWER(email) = 'farhan.azman2@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-21461421'), employee_id = COALESCE(employee_id, 'NVMY8117') WHERE LOWER(email) = 'firdaus.suferi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-10247228'), employee_id = COALESCE(employee_id, 'NVMY9979') WHERE LOWER(email) = 'firdaus.fauzi2@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-9067292'), employee_id = COALESCE(employee_id, '10102137') WHERE LOWER(email) = 'eddy.shah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-37343439'), employee_id = COALESCE(employee_id, '10036062') WHERE LOWER(email) = 'izriel.pisal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-3672820'), employee_id = COALESCE(employee_id, '10036063') WHERE LOWER(email) = 'aiman.sahifulriza@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-39022446'), employee_id = COALESCE(employee_id, 'NVMY7562') WHERE LOWER(email) = 'safiq.syafril@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-8737448'), employee_id = COALESCE(employee_id, '10036060') WHERE LOWER(email) = 'aziz.khan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-8806290'), employee_id = COALESCE(employee_id, 'NVMY0743H') WHERE LOWER(email) = 'fairuz.yaacob@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-11851324'), employee_id = COALESCE(employee_id, 'NVMY8645') WHERE LOWER(email) = 'azlan.sarif@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-8026054'), employee_id = COALESCE(employee_id, '10033614') WHERE LOWER(email) = 'aisyah.saad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-2307646'), employee_id = COALESCE(employee_id, 'NVMY9685') WHERE LOWER(email) = 'norazman.karim1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-2661496'), employee_id = COALESCE(employee_id, '10033593') WHERE LOWER(email) = 'haziq.husairi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-24408750'), employee_id = COALESCE(employee_id, '10035879') WHERE LOWER(email) = 'adzlan.mohamadyusoff@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-33270766'), employee_id = COALESCE(employee_id, 'NVMY5391') WHERE LOWER(email) = 'azrul.azman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-7110481'), employee_id = COALESCE(employee_id, 'NVMY8636') WHERE LOWER(email) = 'khairul.roges@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-2688037'), employee_id = COALESCE(employee_id, 'NVMY6882') WHERE LOWER(email) = 'amirul.faris@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-8858172'), employee_id = COALESCE(employee_id, 'NVMY7794') WHERE LOWER(email) = 'shahril.hissham@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-8139961'), employee_id = COALESCE(employee_id, 'NVMY7399') WHERE LOWER(email) = 'amirul.zamberi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-356 6325'), employee_id = COALESCE(employee_id, 'NVMY0211') WHERE LOWER(email) = 'jamal.azwie@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-4280935'), employee_id = COALESCE(employee_id, 'NVMY3755') WHERE LOWER(email) = 'amierul.zuhide@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013 - 442 3407'), employee_id = COALESCE(employee_id, '10034144') WHERE LOWER(email) = 'hakimi.sukari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-9551530'), employee_id = COALESCE(employee_id, '10033617') WHERE LOWER(email) = 'farisamin.rasli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-4031104'), employee_id = COALESCE(employee_id, 'NVMY4774') WHERE LOWER(email) = 'suhail.azzahari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-69421395'), employee_id = COALESCE(employee_id, '10036134') WHERE LOWER(email) = 'adif.mohdafiqiqbal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2068518'), employee_id = COALESCE(employee_id, '10035741') WHERE LOWER(email) = 'ilham.aswin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9799930'), employee_id = COALESCE(employee_id, '10035742') WHERE LOWER(email) = 'fahmi.kamsani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-2314303'), employee_id = COALESCE(employee_id, 'NVMY8344') WHERE LOWER(email) = 'najib.halif@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-6447650'), employee_id = COALESCE(employee_id, '10036099') WHERE LOWER(email) = 'mohammadshafiq.sapeei@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-6515926'), employee_id = COALESCE(employee_id, 'NVMY0741H') WHERE LOWER(email) = 'amirul.azlan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-5635234'), employee_id = COALESCE(employee_id, 'NVMY5333') WHERE LOWER(email) = 'aiman.alpin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-3627218'), employee_id = COALESCE(employee_id, '10034143') WHERE LOWER(email) = 'norsafuwan.norazman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-64010260'), employee_id = COALESCE(employee_id, 'NVMY0127') WHERE LOWER(email) = 'fitri.hassim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-15539296'), employee_id = COALESCE(employee_id, 'NVMY7969') WHERE LOWER(email) = 'zaidi.mokhtar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-31526152'), employee_id = COALESCE(employee_id, 'NVMY8342') WHERE LOWER(email) = 'ashraf.rahmat@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-6178387'), employee_id = COALESCE(employee_id, '10036167') WHERE LOWER(email) = 'hyder.nazlim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-23395490'), employee_id = COALESCE(employee_id, 'NVMY3732') WHERE LOWER(email) = 'fasil.haruddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-6974284'), employee_id = COALESCE(employee_id, 'NVMY9419') WHERE LOWER(email) = 'brian.edward@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-74917832'), employee_id = COALESCE(employee_id, 'NVMY8242H') WHERE LOWER(email) = 'afiq.afifuddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-56444752'), employee_id = COALESCE(employee_id, 'NVMY5334') WHERE LOWER(email) = 'solehuddin.radzi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2398260'), employee_id = COALESCE(employee_id, '10033587') WHERE LOWER(email) = 'muhamadasyraf.mustafar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-9219892'), employee_id = COALESCE(employee_id, '10034148') WHERE LOWER(email) = 'rufendy.musa1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-7374684'), employee_id = COALESCE(employee_id, 'NVMY9008') WHERE LOWER(email) = 'farah.aripin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6332407'), employee_id = COALESCE(employee_id, 'NVMY7451') WHERE LOWER(email) = 'muqri.sham@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-12516522'), employee_id = COALESCE(employee_id, 'NVMY10589') WHERE LOWER(email) = 'sahrul.ridwan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-5034731'), employee_id = COALESCE(employee_id, 'NVMY7977') WHERE LOWER(email) = 'areff.mahdi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018 - 2855628'), employee_id = COALESCE(employee_id, 'NVMY9317') WHERE LOWER(email) = 'mohd.nazirom@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2371163'), employee_id = COALESCE(employee_id, 'NVMY9615') WHERE LOWER(email) = 'aliff.rosidy@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-5560607'), employee_id = COALESCE(employee_id, 'NVMY8646') WHERE LOWER(email) = 'norman.razak@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-9854166'), employee_id = COALESCE(employee_id, 'NVMY4038') WHERE LOWER(email) = 'ameer.jasni@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-5875119'), employee_id = COALESCE(employee_id, 'NVMY0522') WHERE LOWER(email) = 'farid.hakim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-236 7246'), employee_id = COALESCE(employee_id, 'NVMY10046') WHERE LOWER(email) = 'shahzwan.haikal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018 - 2625854'), employee_id = COALESCE(employee_id, 'NVMY4182') WHERE LOWER(email) = 'fauzul.ahmad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-11519879'), employee_id = COALESCE(employee_id, 'NVMY4041') WHERE LOWER(email) = 'harith.huzairi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-28835687'), employee_id = COALESCE(employee_id, 'NVMY8234') WHERE LOWER(email) = 'muhammad.isa@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-243 3808'), employee_id = COALESCE(employee_id, 'NVMY1092') WHERE LOWER(email) = 'firdaus.hadi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6641722'), employee_id = COALESCE(employee_id, 'NVMY9682') WHERE LOWER(email) = 'azmil.rosdan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-3731398'), employee_id = COALESCE(employee_id, '10035071') WHERE LOWER(email) = 'affieq.ridzuan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-2593165'), employee_id = COALESCE(employee_id, 'NVMY4508') WHERE LOWER(email) = 'fahmi.fuad@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-11987992'), employee_id = COALESCE(employee_id, 'NVMY4411') WHERE LOWER(email) = 'fathul.nazarudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-7233108'), employee_id = COALESCE(employee_id, '10101559') WHERE LOWER(email) = 'mustafa.daniar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-3223899'), employee_id = COALESCE(employee_id, 'NVMY4225H') WHERE LOWER(email) = 'zul.haris@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-603 1641'), employee_id = COALESCE(employee_id, 'NVMY2318H') WHERE LOWER(email) = 'izmi.aiza@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-36970568'), employee_id = COALESCE(employee_id, NULL) WHERE LOWER(email) = 'muizzuddin.daud@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-900 9084'), employee_id = COALESCE(employee_id, 'NVMY0328') WHERE LOWER(email) = 'abdul.hadi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-528 8562'), employee_id = COALESCE(employee_id, 'NVMY0443') WHERE LOWER(email) = 'izzuan.ayob@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-4429820'), employee_id = COALESCE(employee_id, 'NVMY4413') WHERE LOWER(email) = 'thaqif.hidzir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-2123 6325'), employee_id = COALESCE(employee_id, '10102077') WHERE LOWER(email) = 'noramin.mohammadzani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-5054427'), employee_id = COALESCE(employee_id, 'NVMY0503') WHERE LOWER(email) = 'najmuddin.khalib@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-3454991'), employee_id = COALESCE(employee_id, 'NVMY5396') WHERE LOWER(email) = 'farhan.hashim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-3495940'), employee_id = COALESCE(employee_id, 'NVMY7810') WHERE LOWER(email) = 'azwan.ramli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-8276567'), employee_id = COALESCE(employee_id, 'NVMY9005') WHERE LOWER(email) = 'ahmad.hazlan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-3628711'), employee_id = COALESCE(employee_id, '10036074') WHERE LOWER(email) = 'alif.hisham@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-9898512'), employee_id = COALESCE(employee_id, '10102658') WHERE LOWER(email) = 'amiruddin.anzmi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-3889082'), employee_id = COALESCE(employee_id, '10101732') WHERE LOWER(email) = 'wanahmadaiman.othman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-4154992'), employee_id = COALESCE(employee_id, '10034824') WHERE LOWER(email) = 'muhammad.syahmin1@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2265362'), employee_id = COALESCE(employee_id, 'NVMY4786') WHERE LOWER(email) = 'rusdi.abdullah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-25165908'), employee_id = COALESCE(employee_id, '10036164') WHERE LOWER(email) = 'jenang.acheng@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2265362'), employee_id = COALESCE(employee_id, 'NVMY7775') WHERE LOWER(email) = 'aiman.redhuwan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-35526643'), employee_id = COALESCE(employee_id, 'NVMY9011') WHERE LOWER(email) = 'qayyum.jamal@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-3473700'), employee_id = COALESCE(employee_id, '10035815') WHERE LOWER(email) = 'nurrusydiah.abdullah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6764379'), employee_id = COALESCE(employee_id, 'NVMY6016H') WHERE LOWER(email) = 'farhan.kodari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-3660455'), employee_id = COALESCE(employee_id, 'NVMY9507') WHERE LOWER(email) = 'syariff.sukri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2416704'), employee_id = COALESCE(employee_id, 'NVMY8229') WHERE LOWER(email) = 'hamzah.isa@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-23644907'), employee_id = COALESCE(employee_id, 'NVMY9326') WHERE LOWER(email) = 'adam.azrin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-14365825'), employee_id = COALESCE(employee_id, '10032543') WHERE LOWER(email) = 'kamarul.zain@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-3179165'), employee_id = COALESCE(employee_id, '10032501') WHERE LOWER(email) = 'addin.johari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-8846894'), employee_id = COALESCE(employee_id, 'NVMY7973') WHERE LOWER(email) = 'majid.sajari@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-3449362'), employee_id = COALESCE(employee_id, 'NVMY9688') WHERE LOWER(email) = 'arif.ramzi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-40609802'), employee_id = COALESCE(employee_id, '10036043') WHERE LOWER(email) = 'nazman.ramlan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-3602171'), employee_id = COALESCE(employee_id, 'NVMY6887') WHERE LOWER(email) = 'arif.zakri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-2994140'), employee_id = COALESCE(employee_id, 'NVMY8640') WHERE LOWER(email) = 'saiful.hizam@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-2076 8036'), employee_id = COALESCE(employee_id, '10035984') WHERE LOWER(email) = 'azraei.mohdanuar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-60997734'), employee_id = COALESCE(employee_id, '10036132') WHERE LOWER(email) = 'aelfaiez.wananuar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '0 11-56387627'), employee_id = COALESCE(employee_id, '10036098') WHERE LOWER(email) = 'rafiqi.w.rukman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-26473284'), employee_id = COALESCE(employee_id, 'NVMY10602') WHERE LOWER(email) = 'aaron.abdullah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, 'keningau'), employee_id = COALESCE(employee_id, 'NVMY9910') WHERE LOWER(email) = 'nuridzham.sayuji@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '0 11-2859 2759'), employee_id = COALESCE(employee_id, 'NVMY5650') WHERE LOWER(email) = 'iqzzat.norhas@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-9110792'), employee_id = COALESCE(employee_id, '10035807') WHERE LOWER(email) = 'amin.ibrahim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-2432 9270'), employee_id = COALESCE(employee_id, '10032705') WHERE LOWER(email) = 'syamil.abdullah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-6583711'), employee_id = COALESCE(employee_id, '10036135') WHERE LOWER(email) = 'zulkarnain.dollah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-24329248'), employee_id = COALESCE(employee_id, '10101747') WHERE LOWER(email) = 'haiqal.gani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-31462081'), employee_id = COALESCE(employee_id, 'NVMY2154') WHERE LOWER(email) = 'hayad.jamian@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011 - 23221833'), employee_id = COALESCE(employee_id, 'NVMY0148') WHERE LOWER(email) = 'firdaus.raman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-61682047'), employee_id = COALESCE(employee_id, 'NVMY5305') WHERE LOWER(email) = 'azrul.iswandy@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-28113289'), employee_id = COALESCE(employee_id, '10035671') WHERE LOWER(email) = 'izwanshah.iskandar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-550 1994'), employee_id = COALESCE(employee_id, 'NVMY0493') WHERE LOWER(email) = 'hakimm.amizon@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-6906942'), employee_id = COALESCE(employee_id, '10034696') WHERE LOWER(email) = 'haiman.suhaimi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6566396'), employee_id = COALESCE(employee_id, '10032797') WHERE LOWER(email) = 'muhammad.jeffri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-15785751'), employee_id = COALESCE(employee_id, '10035857') WHERE LOWER(email) = 'muzaffar.zamri@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-28762348'), employee_id = COALESCE(employee_id, 'NVMY3290') WHERE LOWER(email) = 'hafiz.anuar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2325404'), employee_id = COALESCE(employee_id, 'NVMY3105H') WHERE LOWER(email) = 'shahmin.mohamadali@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-2553430'), employee_id = COALESCE(employee_id, 'NVMY3320H') WHERE LOWER(email) = 'nurilham.zulkifli@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-7157600'), employee_id = COALESCE(employee_id, '10102527') WHERE LOWER(email) = 'danish.luqman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-28270351'), employee_id = COALESCE(employee_id, 'NVMY6888') WHERE LOWER(email) = 'naim.najib@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2479501'), employee_id = COALESCE(employee_id, 'NVMY9334') WHERE LOWER(email) = 'mazli.yahya@ninjavan.co';

-- from V57__premises.sql
INSERT INTO premises (station, station_code, address, latitude, longitude, sqft, launched_date, license_expiry, license_doc_url, tenancy_end, rental, deposit, tenancy_doc_urls, remarks, chat_url, contract_ref, updated_by) VALUES
  ('Shah Alam', '207', 'No 16 , Jalan Tp 3/2 Taman Perindustrian Uep , 47620 Subang Jaya , Selangor', 3.04103, 101.568149, 1600, '2018-05-12', '2027-01-15', 'https://drive.google.com/open?id=128_QPSdN43A9oHBQDnVSv5jBzxSut9pX&usp=drive_copy', '2027-01-31', 4300, 8600, 'https://drive.google.com/file/d/1gJpsUDf-dJOeoXNmOvzBBrxCgN2I7hIj/view?usp=drive_link
https://drive.google.com/file/d/1HBZlA3tB6emOZdTifG8u5iLAukZwSMpg/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAz2ZbFZo?cls=7', 'CY2024-NV-MYS-00199', 'fuad.mawardi@ninjavan.co'),
  ('Port Klang', '310', 'No 36 Jalan Selat Selatan 15 Kaw 11 D/A Jalan Banting Pandamaran 42000 Port Klang', 2.992994, 101.414712, 1599.7, '2018-09-24', '2026-12-31', 'https://drive.google.com/file/d/1_U4pAj5rjsCIMlGVlov_m8HnztQUnI1L/view?usp=drive_link', '2026-09-30', 3800, 7600, 'https://drive.google.com/file/d/1Coy7t0r4mh2vI-FAA8QXnmQJfeqAeMhv/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAtNi3Cvc?cls=7', 'CY2024-NV-MYS-00298', 'fuad.mawardi@ninjavan.co'),
  ('Klang', '151', '18-G, Jalan Kuda 1/Ku1, Taman Bukit Kuda, 41300 Jalan Batu Tiga Lama, Klang, Selangor.', 3.052756, 101.467576, 1800, '2017-12-09', '2026-12-31', 'https://drive.google.com/file/d/1TNCEnuVcsZT4k93fdH0BKdhl4NQ9BZOc/view?usp=drive_link', '2027-01-31', 3100, 6000, 'https://drive.google.com/file/d/1Ro0fVYRezNPFlN2aJwt4fzUOuMO6R66c/view?usp=drive_link
https://drive.google.com/file/d/1mhOrYjeJsPccQEQo92Aqj8_Au9AXMYL3/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAR_tVkto?cls=7', 'CY2024-NV-MYS-00069', 'fuad.mawardi@ninjavan.co'),
  ('Kota Kemuning', '346', 'NO.1 (GROUND FLOOR), JALAN ANGGERIK TAINIA AW31AW , KOTA KEMUNING , 40460 SHAH ALAM', 2.984857, 101.531705, 2015, '2018-10-01', '2025-11-14', 'https://drive.google.com/file/d/1I5XOChq7K9dEW0HeEK8uhsSA2rO2mUYM/view?usp=drive_link', '2027-09-14', 5000, 10000, 'https://drive.google.com/file/d/10NBZBvwT_8bUyBq31iAd_JOlnUumG_hL/view?usp=drive_link', 'BL pending by RH', 'https://chat.google.com/room/AAAAPKCQOr0?cls=7', 'CY2024-NV-MYS-00071', 'fuad.mawardi@ninjavan.co'),
  ('Setia Alam', '104274', '85-G, Jalan Aman Perdana 1D/KU5, Taman Aman Perdana, 41050 Klang, Selangor', 3.11179, 101.411745, 1275, '2018-11-05', '2026-12-31', 'https://drive.google.com/file/d/1bRRycTVlhpjZZ-bFTjIMUWV2LI1CfSbK/view?usp=drive_link', '2026-07-14', 4300, 8600, 'https://drive.google.com/file/d/1rcsO5cqx4WS91Ff_6IPE5HOYW1u6dQFd/view?usp=drive_link
https://drive.google.com/file/d/1fOjcI6juGXBR5HHHY1T5DzHaQrX__vU8/view?usp=drive_link', 'TA waiting approval email', 'https://chat.google.com/room/AAAAfTL0aC8?cls=7', 'CY2024-NV-MYS-00073', 'fuad.mawardi@ninjavan.co'),
  ('Segambut', '342', '762 Jalan Ipoh Batu 4 1/2, Taman Kok Lian, 51200 Wilayah Persekutuan Kuala Lumpur.', 3.199087905816714, 101.678002967089, 1500, '2018-08-10', '2023-01-23', 'https://drive.google.com/file/d/1I1uGFXfmWJmQxRUlZaEGBvVNjom9DXgx/view?usp=sharing', '2026-06-14', 4500, 9000, 'https://drive.google.com/file/d/19X9BYje29gN546R3rCJUEUdmUT2NE_ZA/view?usp=drive_link', 'TA pending update legal BL -website blocked (30 sept 26)', 'https://chat.google.com/room/AAAAadq_CuE?cls=7', 'CY2024-NV-MYS-00072', 'fuad.mawardi@ninjavan.co'),
  ('Kepong', '203', '40, Jalan Tembaga Sd 5/2G, Bandar Sri Damansara, 52200 Kuala Lumpur', 3.201783, 101.616559, 1194.8, '2017-10-09', '2026-12-31', 'https://drive.google.com/file/d/1eOgd3lRHXS00UfRXz1V5BD2rc0TC9bOb/view?usp=drive_link', '2026-12-31', 4500, 9000, 'https://drive.google.com/file/d/1tF4OoKqlVKZLxPD_2e_zU2szg0zCxN7b/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA33j5LWo?cls=7', 'CY2024-NV-MYS-00074', 'fuad.mawardi@ninjavan.co'),
  ('Subang', '199', 'No. 33-1, Jalan Zuhrah BH U5/BH, Seksyen U5, Taman Subang Murni, 40150 Shah Alam, Selangor', 3.1623744560505553, 101.5437694072695, 1680, '2017-10-16', '2026-12-31', 'https://drive.google.com/file/d/1cx19b1nNA_pIVahxzi5e_njvhKeHBGoy/view?usp=drive_link', '2025-08-31', 3700, 7400, 'https://drive.google.com/file/d/1tCKr8LYFW3I-lkWRGZVRCg-x1ka_s418/view?usp=drive_link', 'TA - Pending sign', 'https://chat.google.com/room/AAAAlQU6mP8?cls=7', 'CY2024-NV-MYS-00083', 'fuad.mawardi@ninjavan.co'),
  ('Mutiara Damansara', '274', '16, Jalan TSB 9, Taman Industri Sungai Buloh, 47000 Petaling Jaya, Selangor', 3.1691996832403135, 101.5716858088699, 1600, '2018-10-15', '2026-11-17', 'https://drive.google.com/file/d/1BwJp-caubpr45zZRRFstnjOCVLqzXbE0/view?usp=drive_link', '2026-09-30', 3600, 7200, 'https://drive.google.com/file/d/1MWr1T5PSw2YznQkjYI-u0rNmSz_bdhNd/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA-1AMnSk?cls=7', 'CY2024-NV-MYS-00112', 'fuad.mawardi@ninjavan.co'),
  ('Ara Damansara', '370', '105G, Jalan Pju 1A/41B, Pusat Dagangan Nzx, 47301, Petaling Jaya, Selangor', 3.0060465206896043, 101.69147450953623, 1800, '2018-10-22', '2026-12-31', 'https://drive.google.com/file/d/17LjPcZWDzbvAhe2q_Y4I0tlHnbr7e6VC/view?usp=drive_link', '2026-12-14', 4300, 8600, 'https://drive.google.com/file/d/1A3TmZD1Y5z9HMtRH2jSWAUDodGpbZjHb/view?usp=share_link
https://drive.google.com/file/d/1txvGEbh9mI1soGS5LSip2srhT_o07g4D/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA99yisEk?cls=7', 'CY2024-NV-MYS-00084', 'fuad.mawardi@ninjavan.co'),
  ('Selayang', '584', 'A-G-8, Jalan SH 1/1A, Selayang Heights, 68100 Batu Caves, Selangor', 3.2660249, 101.651859, 1950, '2021-05-17', '2026-12-31', 'https://drive.google.com/file/d/1F0hrPYfwLmhpxKJFDh16zbKaYFvBMp7a/view?usp=drive_link', '2026-10-14', 5000, 10000, 'https://drive.google.com/file/d/1yzzpwsTAZXfmiofe3AJN7KxChtJn38K-/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA8qVLuRM?cls=7', 'CY2024-NV-MYS-00223', 'fuad.mawardi@ninjavan.co'),
  ('Serdang', '215', 'No.14 (ground floor), Jalan indah 2/8, Taman Universiti Indah, 43300 Seri Kembangan, Selangor', 3.005339, 101.693799, 1650, '2017-11-13', '2026-12-03', 'https://drive.google.com/file/d/1Ya381zj_wHUAz6UtV0UDZKoUVXZIayJ6/view?usp=drive_link', '2026-11-30', 3300, 6000, 'https://drive.google.com/file/d/15SqVfRxKzc7fZII0W5OrYIFopqaBK5iM/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA6t2wvJo?cls=7', 'CY2024-NV-MYS-00113', 'fuad.mawardi@ninjavan.co'),
  ('Cheras', '334', 'No 3 Jalan 25 Taman Megah 43200 Cheras Selangor', 3.055304, 101.769728, 2000, '2018-08-10', '2026-12-01', 'https://drive.google.com/file/d/1uIBI8PVMDFcU9Y4kmPrzjfjgiT5OvYaX/view?usp=drive_link', '2026-09-30', 3300, 6600, 'https://drive.google.com/file/d/1bFT4gRg14ZcSA8ZdCKC1OFL7qhtXQIJW/view?usp=drive_link
https://drive.google.com/file/d/1HxAdbNXljN8VG8mvXIUMOCbIou5Vi7Bq/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAIfeqJMk?cls=7', 'CY2024-NV-MYS-00114', 'fuad.mawardi@ninjavan.co'),
  ('Kajang', '213', '33, Jalan Ba 11, Perindustrian Bukit Angkat, 43000 Kajang, Selangor', 3.006694, 101.763161, 1600, '2017-05-01', '2027-07-17', 'https://drive.google.com/file/d/1uE1Vh3h1vqnWJcF5d97183CtdwoDyIXX/view?usp=drive_link', '2026-05-13', 3600, 7200, 'https://drive.google.com/file/d/1XINxflxqc7k27lmqN6NeYQsU-3OBeecm/view?usp=drive_link', 'TA pending sign', 'https://chat.google.com/room/AAAA5lCJUF8?cls=7', 'CY2024-NV-MYS-00115', 'fuad.mawardi@ninjavan.co'),
  ('Bangi', '294', '17, JALAN 7/1B, Seksyen 7, 43650 Bandar Baru Bangi, Selangor.', 2.967273, 101.774816, 1765.3, '2018-09-11', '2026-12-31', 'https://drive.google.com/file/d/1XrxPJeR7QjqXyGRBUBjAZc0KSOlOSieJ/view?usp=drive_link', '2026-07-23', 4180, 7600, 'https://drive.google.com/file/d/1pHHoQ8sHFjgc7RSIhPqKLTMoReesLmpM/view?usp=drive_link', 'TA pending sign', 'https://chat.google.com/room/AAAAaY2T9dY?cls=7', 'CY2024-NV-MYS-00119', 'fuad.mawardi@ninjavan.co'),
  ('Cyberjaya', '211', 'No. 18 (Ground Floor), Jalan 19/1, Masreca 19, Persiaran Rimba Permai, Cyber 10, 63000 Cyberjaya Selamgor', 2.9014767536171213, 101.62965124866577, 1327, '2017-10-03', '2025-12-31', 'https://drive.google.com/file/d/1WsYW1GtyK-dthqiia8pGsM7j-LrNxpcT/view?usp=drive_link', '2027-08-31', 5500, 11000, 'https://drive.google.com/file/d/12MNbDzhZXLRZxsqomMy0-ULLMRz5zGBt/view?usp=drive_link', 'BL pending', 'https://chat.google.com/room/AAAAdG0uC1c?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Sunway', '358', '8 , Jalan Pjs 7/20A, Bandar Sunway, 46150, Petaling Jaya , Selangor', 3.073977, 101.616205, 1760, '2018-11-13', '2025-09-01', 'https://drive.google.com/file/d/14TJKeVzrD_W2UZ8zcgvAbOK6BO2-FEVz/view?usp=drive_link', '2026-07-31', 4300, 12900, 'https://drive.google.com/file/d/1bCMyN3fjUPiYCu10WI4shhBHrwPwxnOc/view?usp=drive_link', 'TA pending sign BL pending', 'https://chat.google.com/room/AAAAWIbP2MQ?cls=7', 'CY2024-NV-MYS-00142', 'fuad.mawardi@ninjavan.co'),
  ('Oug', '209', 'No.45 Jalan 9/152 Taman Perindustrian Oug 58200 Kuala Lumpur', 3.069733, 101.661243, 2825, '2017-11-06', '2027-09-30', 'https://drive.google.com/file/d/1B5j0RNFGvZ-hnZgtbTPkLjPLmem9ZHR7/view?usp=drive_link', '2026-07-31', 4500, 9000, 'https://drive.google.com/file/d/1K6MSiIMjPo1QWd2MoJ2qZFdE5te1x7mc/view?usp=drive_link', 'TA pending sign', 'https://chat.google.com/room/AAAAeOsZej4?cls=7', 'CY2024-NV-MYS-00143', 'fuad.mawardi@ninjavan.co'),
  ('Petaling Jaya', '219', '56, Jalan 19/3, Section 19, 46300 Petaling Jaya, Selangor', 3.120181, 101.629209, 1875, '2017-11-20', '2026-12-31', 'https://drive.google.com/file/d/16uItjHo-sZKevCjNilZNItP_7v8lT2Ce/view?usp=drive_link', '2026-12-30', 5200, 10400, 'https://drive.google.com/file/d/16rgj5bTk2aYKNg0PEk3ffvWPwTqiAAND/view?usp=drive_link
https://drive.google.com/file/d/17aHrPVY6ym929ZkCoe4vAUB8zTvspZK0/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA-9eUza8?cls=7', 'CY2024-NV-MYS-00144', 'fuad.mawardi@ninjavan.co'),
  ('Taman Desa', '314', 'No.33 Ground Floor,Jalan Indrahana 2, Taman Indrahana ,Jalan Kuchai Lama, 58100 Kuala Lumpur', 3.091687, 101.68089, 1780, '2019-09-03', '2027-03-05', 'https://drive.google.com/file/d/17Es2Lip5GvNGKP9AkuWE6LRohdGOVCxp/view?usp=drive_link', '2027-12-30', 3528, 6400, 'https://drive.google.com/file/d/1ONsn9oS36nm42aVg4SAFK6VIyL5TFfR9/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAZ55kFvw?cls=7', 'CY2024-NV-MYS-00145', 'fuad.mawardi@ninjavan.co'),
  ('Puchong', '318', '58, Jalan Bp 7/11, Bandar Bukit Puchong, 47120 Puchong, Selangor', 2.9859293, 101.6188218, 1760, '2018-09-24', '2026-10-20', 'https://drive.google.com/file/d/1tNb9agQwJ2WtqIONQYb10BQyKlqqZ-43/view?usp=drive_link', '2026-12-31', 3100, 6200, 'https://drive.google.com/file/d/1UwnhxjedMPdfuRkdxC1xAjcmFB_DWMSH/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAZqe6t8c?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Chow Kit', '197', 'No 41 Jalan Taiping Off Jalan Pahang 50400 Kuala Lumpur', 3.1714559, 101.6979641, 1700, '2019-05-27', '2026-12-18', 'https://drive.google.com/file/d/1gAwdGVDfIENGcX2l1a8bwn6bua58asCy/view?usp=drive_link', '2027-12-31', 4800, 9000, 'https://drive.google.com/file/d/1rQtJIsuYVwfOqkLn1fl17VTQDIOWU5Tl/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAM9I-p8w?cls=7', 'CY2024-NV-MYS-00146', 'fuad.mawardi@ninjavan.co'),
  ('Ampang', '84', 'No. 11C, Jalan Nirwana 39, Taman Nirwana, 68000 Kuala Lumpur, Selangor', 3.148068197559927, 101.75187582124443, 1500, '2017-02-13', '2026-12-31', 'https://drive.google.com/file/d/137tZtm98jsTlWqNMyPd6cWBL4PYQNjye/view?usp=drive_link', '2027-08-31', 3800, 7600, 'https://drive.google.com/file/d/1NIUBswygtTasODmrp7MbH5fj49_Se0hN/view?usp=sharing', NULL, 'https://chat.google.com/room/AAAAF3cr4V4?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Wangsa Maju', '218', 'No, 15 Ground Floor Jalan 10/23A, Medan Makmur Setapak 53300 Kuala Lumpur', 3.197838, 101.720575, 1400, '2017-11-13', '2026-12-24', 'https://drive.google.com/file/d/1UDXts8oti63mbS23vUPhgmTZioXjkoYC/view?usp=drive_link', '2026-12-31', 4000, 7260, 'https://drive.google.com/file/d/1WXGSI2xc713t_2RcN3nBxpJNnts0i4Vq/view?usp=drive_link
https://drive.google.com/file/d/1Vny-gV3M5Db6CgVmJVmyODSnqZ04-oAR/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAeapLFgY?cls=7', 'CY2024-NV-MYS-00147', 'fuad.mawardi@ninjavan.co'),
  ('Bandar Tun Razak', '417', 'No. 34, Jalan 13/118B, Desa Tun Razak, Cheras, 56000 Kuala Lumpur', 3.0820105, 101.7160353, 1650, '2019-05-27', '2027-05-05', 'https://drive.google.com/file/d/1xOmdU7_vPA4C0vEqsQHMFTmbyLvEL7d_/view?usp=drive_link', '2028-04-30', 5445, 10890, 'https://drive.google.com/file/d/1ZVxwOCI9AD4ph35RFnSiyXgWkZXyIKeo/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA64EiR30?cls=7', 'CY2024-NV-MYS-00148', 'fuad.mawardi@ninjavan.co'),
  ('Melawati', '583', 'No. 38, Ground Floor, Jalan Wangsa Setia 3, Taman Wangsa Melawati, Setapak, 53300 Kuala Lumpur', 3.0820105, 101.7160353, 1000, '2021-05-01', '2026-12-18', 'https://drive.google.com/file/d/1eL4VdtTo7YqFFXtAERC8xgMZww_5rK9V/view?usp=drive_link', '2026-05-15', 4800, 8400, 'https://drive.google.com/file/d/17Hn_8KQPtWsCdhSOSYOeyngeeNUzPrHw/view?usp=drive_link
https://drive.google.com/file/d/17bUKQ6MHC9Ab53mhYxoDYVlEyb2xQWTJ/view?usp=drive_link
https://drive.google.com/file/d/1EAeuhNDXMQ_LxV4jn8BGWCA0_bVmI00Z/view?usp=drive_link', 'TA pending sign', 'https://chat.google.com/room/AAAAetxCEU0?cls=7', 'CY2024-NV-MYS-00150', 'fuad.mawardi@ninjavan.co'),
  ('Kuala Selangor', '180', '19, Jalan Raja Abdullah,45000 Kuala Selangor, Selangor.', 3.34104, 101.250495, 1540, '2017-09-13', '2026-12-31', 'https://drive.google.com/file/d/1PzsFti6KMRm8b4-E5_y8x2jifNWDKA-I/view?usp=drive_link', '2027-12-31', 2300, 4600, 'https://drive.google.com/file/d/1CJLMI_JBkixgB16DEhKlWSkaLY_taBeI/view?usp=drive_link
https://drive.google.com/file/d/1a4WJz58xbySmCFwvMMbysWr7_6Iiqr3p/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAHuTqH54?cls=7', 'CY2024-NV-MYS-00064', 'fuad.mawardi@ninjavan.co'),
  ('Banting', '172', 'No 19, Jalan Emas 13, Bandar Sungai Emas, 42700, Banting Selangor', 2.82423, 101.536833, 2200, '2017-10-20', '2026-12-31', 'https://drive.google.com/file/d/13dmMdze8_A1aMowlGUIfsV3gkM0QMJ-S/view?usp=drive_link', '2026-08-30', 3000, 9000, 'https://drive.google.com/file/d/19ihU1P9N7czFSfKHDtcyBdh4AryaQwPw/view?usp=drive_link', 'TA pending approval in email', 'https://chat.google.com/room/AAAAsWYHhTw?cls=7', 'CY2024-NV-MYS-00158', 'fuad.mawardi@ninjavan.co'),
  ('Rawang', '216', 'NO 22 JALAN CEMPAKA 2,KAWASAN ANUGERAH SURIA,48000,RAWANG SELANGOR', 3.36153033528003, 101.569796843379, 2000, '2017-10-02', '2026-12-31', 'https://drive.google.com/file/d/1jjlmXt8AIB3zoWaIQPQAtVyYLQHsF-QZ/view?usp=drive_link', '2026-04-30', 3000, 6000, 'https://drive.google.com/file/d/1ApIt4D2E8FXal3dCQqxEstNSBFHGxNiL/view?usp=drive_link', 'TA pending update legal', 'https://chat.google.com/room/AAAAoQx4Fcc?cls=7', 'CY2024-NV-MYS-00159', 'fuad.mawardi@ninjavan.co'),
  ('Sungai Besar', '413', '17, Pt 1200, Jalan Sbbc 9, Sungai Besar Business Centre, 45300 Sungai Besar, Selangor', 3.672425, 100.988846, 2000, '2019-02-25', '2026-12-31', 'https://drive.google.com/file/d/1Y34XEcXJ2ODVa3RbAD8dixAdgJxoQ8dP/view?usp=drive_link', '2026-12-31', 2415, 4000, 'https://drive.google.com/file/d/1j-HIH37ljtlD5atH6jcO71mRh5ckyjJP/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAgPBfnm4?cls=7', 'CY2024-NV-MYS-00065', 'fuad.mawardi@ninjavan.co'),
  ('Salak Tinggi', '389', '24-G, Ground Floor, Jalan Gemilang 2, Pusat Perniagaan Gemilang, 43900 Sepang, Selangor', 2.807429, 101.697801, 1800, '2018-12-13', '2026-12-31', 'https://drive.google.com/file/d/1lRl22MYoaryQdmamXJTOpRS1TFj_oPHC/view?usp=drive_link', '2026-12-14', 2100, 4200, 'https://drive.google.com/file/d/1eFmWFmA9rYV0sEA4FDw38sQLI6_8ItxH/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAiYHSvUo?cls=7', 'CY2024-NV-MYS-00166', 'fuad.mawardi@ninjavan.co'),
  ('Kuala Kubu Baru', '425', 'No 7, Jalan Gamelan 2, Taman Gamelan, 44000, Kuala Kubu Baru, Selangor', 3.557244, 101.658258, 1200, '2019-01-15', '2026-12-31', 'https://drive.google.com/file/d/1ru0dXM75RZE_1p1rb5kTwozAOkKpTVTY/view?usp=drive_link', '2027-01-14', 2500, 4000, 'https://drive.google.com/file/d/1izyv0G0mcoWfFI_bTVIyA7qFPuTU7msB/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAy3JyQWs?cls=7', 'CY2024-NV-MYS-00167', 'fuad.mawardi@ninjavan.co'),
  ('Puncak Alam', '338', 'No 118-G Jalan PPAJ 1/1, Pusat Perdagangan Alam Jaya 42300 Bandar Puncak Alam, Selangor', 3.241405, 101.446436, 2800, '2018-08-10', '2026-12-31', 'https://drive.google.com/file/d/1afSD4tNB5ckvdIxIwPSmk0vmcAhn_DP4/view?usp=drive_link', '2028-12-31', 2940, 5880, 'https://drive.google.com/file/d/1yNnZ_DBF-rY_Kb41dnp2B8YpSraO9Jjt/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA-lQgm2M?cls=7', 'CY2024-NV-MYS-00066', 'fuad.mawardi@ninjavan.co'),
  ('Semenyih', '298', 'No. 16-G, Jalan 5/8, Bandar Rinching, 43500 Semenyih Selangor', 2.927654, 101.857942, 1540, '2018-09-18', '2027-03-11', 'https://drive.google.com/file/d/1Y1R8JsEc-KBStKjhkVHI2SS0JUbRLvm8/view?usp=drive_link', '2027-08-13', 3000, 6000, 'https://drive.google.com/file/d/1-a95TL_1RVSQzB5_sfJ1ArVYdJ_HHvMJ/view?usp=sharing', NULL, 'https://chat.google.com/room/AAAAn8xdf4k?cls=7', 'CY2024-NV-MYS-00168', 'fuad.mawardi@ninjavan.co'),
  ('Mersing', '454', '356, Jalan Wawasan, 86800 Mersing, Johor', 2.416511, 103.839555, 2800, '2019-07-15', '2026-12-31', 'https://drive.google.com/file/d/1bBWHlJ8wtIdZMBP9KdwYIxzWUw1F7TKm/view?usp=drive_link', '2026-07-15', 1815, 3300, 'https://drive.google.com/file/d/1o-piVrjPeAPFDkm5ICKJX_5ZAzNvOcgP/view?usp=sharing', NULL, 'https://chat.google.com/room/AAAAh5b89vo?cls=7', 'CY2024-NV-MYS-00169', 'fuad.mawardi@ninjavan.co'),
  ('Batu Pahat', '143', 'No 1, Jalan Perniagaan Ceria 1, Pusat Perniagaan Ceria, 83000 Batu Pahat, Johor', 1.864654, 102.9665454, 3000, '2017-05-16', '2026-12-31', 'https://drive.google.com/file/d/1zPNjQrrG-UEN8CPB35e1-g-HffeRYUJv/view?usp=drive_link', '2027-07-31', 3465, 6000, 'https://drive.google.com/file/d/1j1ozHCdUbVqFmq2ILRDwoGqQJM701Cb_/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAoc9TiJo?cls=7', 'CY2024-NV-MYS-00173', 'fuad.mawardi@ninjavan.co'),
  ('Muar', '228', 'No. 28 Jalan Perniagaan Merah 1, Pusat Perniagaan Mas Merah, 84000 Muar, Johor', 2.065683, 102.597014, 2640, '2017-11-17', '2026-12-31', 'https://drive.google.com/file/d/1YOShbCBEZkNVg_uqyxO_xns4-Wc42oj0/view?usp=drive_link', '2026-11-30', 4000, 7600, 'https://drive.google.com/file/d/1nty8w8XQYw9AjOnoobuiQSSKbgSkenYN/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAASKaeTRQ?cls=7', 'Done', 'fuad.mawardi@ninjavan.co'),
  ('Bukit Gambir', '538', '29 Jalan Perdagangan 8, Pusat Perdagangan Bukit Gambir, Bukit Gambir, 84800 Tangkak, Johor.', 2.214941, 102.6611, 1800, '2020-08-17', '2026-12-31', 'https://drive.google.com/file/d/1GIsFZgl-YEHx_Uw8UxAuD3GmXxJAlBMy/view?usp=drive_link', '2026-07-31', 1500, 3000, 'https://drive.google.com/file/d/1MKAQWbQ-EqNKAZG83Fb9799rxKNY7Whe/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA1rJdzoo?cls=7', 'Done', 'fuad.mawardi@ninjavan.co'),
  ('Segamat', '244', 'No 16 & 18 Jalan Muhibbah 2, Taman Muhibbah 85000 Segamat, Johor', 2.507736, 102.82257, 1400, '2018-04-04', '2026-12-31', 'https://drive.google.com/file/d/1HaKAAWETxU24CxYeybs8HRzXiZN49yUp/view?usp=drive_link', '2028-04-30', 3450, 10350, 'https://drive.google.com/file/d/1l7VhJGuSIb9QHYsy7J9CeWw4RdbVoDx4/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAjX_XCx4?cls=7', 'CY2024-NV-MYS-00176', 'fuad.mawardi@ninjavan.co'),
  ('Kluang', '263', 'No 4 & 5, Jalan Emas, Taman Kluang Jaya 86000 Kluang Johor', 2.020357, 103.306323, 4000, '2018-06-19', '2026-12-31', 'https://drive.google.com/file/d/1o3fRtQgz0y7i31ugbv5MaOPcMRM978B3/view?usp=drive_link', '2027-05-31', 4000, 7600, 'https://drive.google.com/file/d/1qxzLE0gTGLzkmZhRwtuDyHg_RuAWfS-r/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAy0_QSBI?cls=7', 'CY2024-NV-MYS-00178', 'fuad.mawardi@ninjavan.co'),
  ('Kulai', '498', '1293, Jalan Sri Putri 3/5. Taman Putri Kulai, 81000 Kulai, Johor', 1.655764, 103.569593, 2200, '2019-09-05', '2026-12-31', 'https://drive.google.com/file/d/1GpMxpQD2FzEJuwnP_ciLccAD67L2gs1l/view?usp=drive_link', '2027-08-31', 3000, 6000, 'https://drive.google.com/file/d/1xd68I6hNeRl5p9v5Ea40sicVCMtAllzq/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA06DJ1zc?cls=7', 'CY2024-NV-MYS-00179', 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', '513', '5, Jalan Sena 2, Taman Rinting, 81750 Masai, Johor Darul Ta''zim', 1.4921655600404378, 103.86801100992359, 1920, '2019-11-21', '2026-12-31', 'https://drive.google.com/file/d/19N0iouxh5_xvElDaGdiPJJF5JniMQ1dk/view?usp=drive_link', '2028-11-30', 2900, 5800, 'https://drive.google.com/file/d/1Nqp4bnGCakpJBIqzeYzRxCxpIZQ6PQRQ/view?usp=drive_link', 'BL - pending Bomba check', 'https://chat.google.com/room/AAAAxKcOvW4?cls=7', 'CY2024-NV-MYS-00180', 'fuad.mawardi@ninjavan.co'),
  ('Kempas', '3', 'No 1, Jalan Belati 2, Taman Perindustrian Maju Jaya, Off Jalan Kempas Lama, 81300 Johor Bahru, Johor', 1.549025, 103.699744, 6500, '2015-11-01', '2026-12-31', 'https://drive.google.com/file/d/1Uk0xdBuVbo1X6byXNxgPrMtZYzgOGSE7/view?usp=drive_link', '2026-03-14', 30000, 81000, 'https://drive.google.com/open?id=121QeDIFWdIi1Or886QUa1po0cTIjLZ8Q
https://drive.google.com/file/d/1LFEKNADfTCQza9F_YEOU5P63gt-Pwhhc/view?usp=drive_link', 'hub merge with warehouse Kempas (warehouse belum renew TA)', 'https://chat.google.com/room/AAAAxy3t99Y?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', '222', 'No 38 Jalan Bertam 6, Taman daya 81100 Johor Bahru, Johor.', 1.540417719, 103.760458824, 1600, '2017-11-11', '2021-12-31', 'https://drive.google.com/open?id=1d3vPumOOH8_j1HpFu84PA_oedYe0mNFt', '2027-06-30', 4000, 7600, 'https://drive.google.com/file/d/1Yn1pCqdI2Me6qye7idbho1nNzeA1PAl6/view?usp=drive_link
https://drive.google.com/file/d/14vPElNPgz0lTh9LhNT27gy59ndlCsxql/view?usp=drive_link', 'BL cannot apply as landlord add new partiton and it is not approved by Bomba and Council - (relocated on 8/11/2021) TA pending by legal', 'https://chat.google.com/room/AAAAjxq48Js?cls=7', 'CY2024-NV-MYS-00200', 'fuad.mawardi@ninjavan.co'),
  ('Penawar', '268', 'No.25 Jalan Dahlia 6, Taman Sri Penawar, 81930 Bandar Penawar, Johor', 1.5918298, 104.2266257, 1540, '2018-08-20', '2026-12-31', 'https://drive.google.com/file/d/1c0-k0J4BeIRYHCsu_i-I_5t57YPPWXml/view?usp=drive_link', '2026-10-31', 1900, 3600, 'https://drive.google.com/file/d/1GWqyNmaha9HZk6NUOUeZkClli5qork_A/view?usp=drive_link
https://drive.google.com/file/d/1SNTxpTjRcvXH-VHUx7Jft3JHEG9YEoFs/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAmADsznw?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', '499', '28, Jalan Niaga 16, 81900 Kota Tinggi, Johor', 1.729167, 103.902832, 1540, '2019-09-11', '2026-12-31', 'https://drive.google.com/file/d/1Hs96nRKd8QLAsRGBHzGEdGOj2IBvfhJ9/view?usp=drive_link', '2026-08-31', 2000, 4000, 'https://drive.google.com/file/d/1JOO3AwpmrpBsih2CHxFCrR2eVGeyf4Hb/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAbCe3mPM?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', '508', 'No. 61, Pontian Maju 2, Taman Perindustrian Pontian Maju 82000 Pontian, Johor Darul Ta''zim.', 1.489637433447301, 103.42437717007176, 2550, '2019-10-30', '2025-12-31', 'https://drive.google.com/file/d/1W1PkVjntQQ9RClDE8SFb5hztwO5zBWd_/view?usp=drive_link', '2027-12-31', 2400, 4800, 'https://drive.google.com/file/d/1iOVS95KX62d_-BconA7fzYKws4ukKlKE/view?usp=drive_link', 'BL - pending RFS', 'https://chat.google.com/room/AAAAmvvhYpQ?cls=7', 'CY2024-NV-MYS-00201', 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', '306', 'No 53, Jalan Bistari 16, 81300 Johor Bahru, Johor Darul Ta''zim', 1.4987269, 103.6448011, 2879, '2018-11-12', '2023-12-31', 'https://drive.google.com/file/d/1OkBq78qVhwzOz4wFQms9f1NrW9jujep8/view?usp=share_link', '2028-02-29', 4900, 9800, 'https://drive.google.com/file/d/1uz1dZuqVDVqytn3xUFMTdVk-EgmxIwtZ/view?usp=drive_link', 'BL - pending RH due to relocate', 'https://chat.google.com/room/AAAAuxdJKb4?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', '12', 'MP43 Jalan Lesung Batu Emas Utama, Taman Lesung Batu Emas, 78000, Alor Gajah, Melaka', 2.38048, 102.242828, 1400, '2018-11-01', '2027-01-04', 'https://drive.google.com/file/d/1pzP4zs1E5L-COTLCCPoUI9w_fAXDx0-F/view?usp=drive_link', '2026-09-30', 1500, 2800, 'https://drive.google.com/file/d/1sMMZpBn0eTMrb7YzPuLhs6aLsLnKddG3/view?usp=drive_link
https://drive.google.com/file/d/1XpvskvtSk8CjRDA1pn-PYaFuik-ZlJ5v/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAnnzHfQE?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', '366', 'JC 2079-G, Jalan BJB 3/2, Bandar Jasin Bestari 3, 77200 Bemban, Melaka', 2.2754898253696374, 102.38752323326135, 1540, '2018-10-15', '2027-07-25', 'https://drive.google.com/file/d/1v9BZHTMIwq9igcxfKK2hzR9W34_0DrLU/view?usp=drive_link', '2026-11-30', 1500, 3000, 'https://drive.google.com/file/d/19chjh4Ec-gn4MJkiUeBuG9qt8kdYA6zB/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA40F_vnU?cls=7', 'CY2024-NV-MYS-00236', 'fuad.mawardi@ninjavan.co'),
  ('Senawang', '9', 'No 61 GF, Jalan Senawang Perdana 2, Taman Senawang Perdana, 71450 Seremban, Negeri Sembilan', 2.655594595885986, 102.0029566984498, 1540, '2017-01-07', '2027-07-05', 'https://drive.google.com/open?id=1K8oi794WaMLo6oAbWcMAPAhJqEt7Dp0T&usp=drive_copy', '2027-03-31', 1650, 3000, 'https://drive.google.com/file/d/1-G0ki5nzboP7mFZnxmrV6PLrF1cx4lKg/view?usp=drive_link
https://drive.google.com/file/d/1WShJkiVrUfDpsXtmc7AbNuO3M5LqTJkK/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAADrLPr4w?cls=7', 'CY2024-NV-MYS-00202', 'fuad.mawardi@ninjavan.co'),
  ('Bahau', '354', 'No 1, Jalan Balau 2, Pusat Perindustrian Balau, Bandar Ioi, 72100 Bahau, Negeri Sembilan', 2.805372, 102.413311, 1400, '2018-10-01', '2026-12-31', 'https://drive.google.com/file/d/1iu4E1wYVuxCiHViCw0pEizW_mofMX_zq/view?usp=drive_link', '2025-11-30', 1300, 2600, 'https://drive.google.com/file/d/1t2YrZRDCKF9FSr-WaXV1hnoKlX3Xv5fb/view?usp=drive_link
https://drive.google.com/file/d/1aDeswCFwgEAvwWBKepa13EKWa_KpihcN/view?usp=drive_link', 'TA - merge with minisort Bahau (minisort belum renew TA)', 'https://chat.google.com/room/AAAAbtml1lk?cls=7', 'CY2024-NV-MYS-00203', 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', '462', 'Ground Floor, No. 12, Jalan Prima 5, Lukut Prima,71010, Port Dickson, Negeri Sembilan', 2.561613, 101.811271, 2540, '2019-07-17', '2026-12-31', 'https://drive.google.com/file/d/1u5aidrlqzblll8ZPcX0P3EE8yj-paQLg/view?usp=drive_link', '2026-09-30', 2057, 3774, 'https://drive.google.com/file/d/1wRW76Gx9LCR_Fgqll0BTg-75pwNIKnez/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAsivNLAw?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', '362', 'No.82, Lorong P/Am 4/1, Arab Malaysian Industry Park,71800 Nilai, Negeri Sembilan', 2.861911, 101.797866, 2300, '2018-11-07', '2027-04-03', 'https://drive.google.com/file/d/1E6EK9LNNhzCt383boqkcKv-Cv-rHPUtB/view?usp=drive_link', '2026-12-31', 2700, 5400, 'https://drive.google.com/file/d/1DIFYpEpgc3hNopxSEmT_qes7eviMELKm/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAcSCVXCs?cls=7', 'CY2024-NV-MYS-00204', 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', '511', '29, Jalan Kptu 1, Kawasan Perindustrian Tasik Utama, Durian Tunggal, 76100 Hang Tuah Jaya, Melaka', 2.279356, 102.268086, 2100, '2019-10-22', '2026-11-06', 'https://drive.google.com/file/d/1duqckJ0QHb7egL8e-Z6C513dAlPdInqv/view?usp=drive_link', '2027-10-14', 2700, 4400, 'https://drive.google.com/file/d/1hiRG6001thrO5dEYzAcVPv9XtH3M8Faj/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAdSJ0yN0?cls=7', 'CY2024-NV-MYS-00205', 'fuad.mawardi@ninjavan.co'),
  ('Ipoh', '6', 'No. 149502, Jalan Kuala Kangsar Igb International Industry Park, Perak, 30010 Ipoh', 4.65777, 101.11477, 18000, '2016-01-02', '2026-12-31', 'https://drive.google.com/file/d/1WFunFvENV32Cb77Lp0Eqdt7DJkkxGmk_/view?usp=drive_link', '2026-03-31', 0, 0, 'https://drive.google.com/open?id=1b92jaqekeZFebRRXTV8k-i_BjVetrSCy
https://drive.google.com/file/d/1l-80Z4Ey4coXkww2iL4Zg7o4QYUMfIut/view?usp=drive_link', 'TA pending by legal BL pending by sort PRK ( hub share tempat dgn sort)', 'https://chat.google.com/room/AAAA-OrZ_eI?cls=7', 'CY2024-NV-MYS-00160', 'fuad.mawardi@ninjavan.co'),
  ('Taiping', '226', '14, Jalan Perusahaan 14, Kawasan Perindustrian Kamunting, 34600 Kamunting, Perak', 4.88747, 100.70868, 3600, '2017-11-21', '2027-04-12', 'https://drive.google.com/file/d/1a-YvBkW3tfB8P5j5_uL2qsXzw0bJRH7U/view?usp=drive_link', '2026-11-06', 3125, 5500, 'https://drive.google.com/file/d/1JgomtK3-NpjGIJFO9EOaQVMQpEmRmjLA/view?usp=drive_link', 'BL in progress', 'https://chat.google.com/room/AAAAAm62VO4?cls=7', 'CY2025-NV-MYS-00335', 'fuad.mawardi@ninjavan.co'),
  ('Gerik', '510', 'Pt 13808, Jalan Suda Jaya, 33300 Gerik, Perak', 5.43569, 101.128998, 1490, '2019-10-14', '2026-12-18', 'https://drive.google.com/file/d/1AXxQx8y0wsfNtKHKSOVme7_fzk-eDQIU/view?usp=drive_link', '2026-09-30', 1200, 2200, 'https://drive.google.com/file/d/16oV0MueWrV_35YPTlDw-LoAorELOBuX8/view?usp=drive_link
https://drive.google.com/file/d/16ot_fzukCywo61qDMHmWUfROmp9z4AXY/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA1RuC88M?cls=7', 'CY2024-NV-MYS-00162', 'fuad.mawardi@ninjavan.co'),
  ('Kuala Kangsar', '496', '104,Persiaran Bougainvillea Utama 4, Bougainvillea Utama,33010 Kuala Kangsar Perak', 4.776046676107859, 100.89830810341648, 1200, '2019-08-16', '2027-02-25', 'https://drive.google.com/file/d/1Wy4rE_QeYdhd3k5AO4ER7Rl4cmjXMCBk/view?usp=drive_link', '2027-11-14', 1500, 3000, 'https://drive.google.com/file/d/1mHiWpSrmsKaArZ45wVQJ-PIsydZ_EmDy/view?usp=drive_link
https://drive.google.com/file/d/1gNpmVRkIy5QkHN_Yes9Ij56iA7rCS18b/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAHEEinrQ?cls=7', 'CY2024-NV-MYS-00163', 'fuad.mawardi@ninjavan.co'),
  ('Bagan Serai', '474', '9, Ground Floor, Lorong Siakap 1A, 34300 Bagan Serai, Perak', 5.011911, 100.533028, 1400, '2019-05-15', '2027-07-28', 'https://drive.google.com/file/d/1UlpVRa4ihHfpUB1-JUuTv4rRMnZ-Sk_U/view?usp=drive_link', '2026-04-30', 1550, 3100, 'https://drive.google.com/file/d/1L4n_A7h0Z0ojVBMyJscW6Bk1UBMNmcw5/view?usp=drive_link', 'TA waiting approval email', 'https://chat.google.com/room/AAAAVLVhgso?cls=7', 'CY2024-NV-MYS-00164', 'fuad.mawardi@ninjavan.co'),
  ('Slim River', '242', '111-A, Jalan Perdana 4, Pusat Perniagaan Slim Perdana, 35800 Slim River,Perak.', 3.842103, 101.393579, 2170, '2018-04-04', '2027-08-22', 'https://drive.google.com/file/d/1lLgs37Js90eJ8rj_5SFrrwEpWVE7xAq2/view?usp=drive_link', '2027-03-31', 1700, 3000, 'https://drive.google.com/file/d/1BmBEm2kanEZzAJ71lcJZgyZBj5ycDdkT/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAN2tunjs?cls=7', 'CY2025-NV-MYS-00345', 'fuad.mawardi@ninjavan.co'),
  ('Tapah', '442', 'No. 62, Gf & 1St Flr, Jalan Wallagonia 3, Taman University Wallagonia, 35400 Tapah Road, Perak', 4.184034, 101.220286, 2660, '2019-03-25', '2027-09-19', 'https://drive.google.com/file/d/1Zbq1HePMa4tL-wS6W5Xkszf4a8k2Q6QR/view?usp=drive_link', '2026-03-31', 2180, 1800, 'https://drive.google.com/file/d/1xXjDW9ZoX4Q_jWZzVkysOdVsKvhe9xkL/view?usp=drive_link', 'TA pending by legal (extension)', 'https://chat.google.com/room/AAAADqbIFGo?cls=7', 'CY2024-NV-MYS-00171', 'fuad.mawardi@ninjavan.co'),
  ('Sitiawan', '248', 'No. 179, Jalan Acheh 4, Medan Acheh, 32000 Sitiawan, Perak.', 4.235753, 100.687388, 3530, '2018-04-23', '2026-12-31', 'https://drive.google.com/file/d/1XxNZDyC4RKsPT9qFh0N9vXpRqwiA80F_/view?usp=drive_link', '2026-03-31', 3050, 5800, 'https://drive.google.com/file/d/1RTh0tKtF0u95DiWo5BOZXkRmag972rBw/view?usp=drive_link
https://drive.google.com/file/d/1Uh_VWOGWM03pCDoMgg1fQ2SzV2zRJ7tz/view?usp=drive_link', 'TA pending update from legal', 'https://chat.google.com/room/AAAANRiOyIU?cls=7', 'CY2024-NV-MYS-00172', 'fuad.mawardi@ninjavan.co'),
  ('Teluk Intan', '302', 'No.25, Tingkat Bawah, Lorong Regat Syahbandar, Pusat Perniagaan Intan Flora, 36000, Teluk Intan , Perak', 4.010315, 101.038663, 1600, '2018-10-15', '2026-12-31', 'https://drive.google.com/file/d/1GUwzQifuMqqkR00J8iVsKSOqAJ7H_b9D/view?usp=drive_link', '2026-05-31', 1800, 3400, 'https://drive.google.com/file/d/1MV_I1s6KtRa0z6QLWETq41LbNhAac0du/view?usp=drive_link
https://drive.google.com/file/d/1EVVvTnirsKYzitSWn82Z0eGymMpGgEAe/view?usp=drive_link', 'TA pending email by admin', 'https://chat.google.com/room/AAAA0pDxp7g?cls=7', 'CY2024-NV-MYS-00177', 'fuad.mawardi@ninjavan.co'),
  ('Cameron Highlands', '486', 'Si-G-2, Somersquare Golden Hill, Jalan Golden Hill 12, Cameron Golden Hill, 39000 Tanah Rata, Cameron Highlands, Pahang', 4.486541, 101.373931, 840, '2020-09-01', '2026-12-31', 'https://drive.google.com/file/d/1Ea_TEHmFhrGA_JF61MvaMynoWgxP2s1U/view?usp=sharing', '2026-08-31', 2400, 4800, 'https://drive.google.com/file/d/1lPdgnBewBijr8FehrAfFLyzKWGBw8Lrq/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAZwlqhBg?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Batu Gajah', '518', 'No 40, Persiaran Bg Perdana 7, Taman Batu Gajah Perdana, 31550 Batu Gajah Perak.', 4.497835, 101.022505, 2250, '2020-01-29', '2027-03-15', 'https://drive.google.com/file/d/1WQEuj9_9-MSZdwCGfqv0o2drjYuC1sIe/view?usp=drive_link', '2027-01-31', 1500, 1100, 'https://drive.google.com/file/d/1gHpny7Q4FrrjvF6AdN4B-BtgOgMKxO-e/view?usp=drive_link
https://drive.google.com/file/d/1Idr3YoA96ta1k2kStYwh4i04sSAymzGs/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAe-nB3iY?cls=7', 'CY2024-NV-MYS-00181', 'fuad.mawardi@ninjavan.co'),
  ('Kangar', '350', '146, Jalan Jejawi Sematang, Taman Utara Jejawi, 02600 Arau, Perlis', 6.446705, 100.230039, 2288, '2018-10-01', '2027-03-11', 'https://drive.google.com/file/d/1JlDNv0JDBZb2yKyO1i1hKSjjMM1GxOp0/view?usp=drive_link', '2026-12-31', 1750, 3000, 'https://drive.google.com/file/d/1fvp_t_fHplX_-jtY64nxpNjjIWP-Q6FX/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAeY5R7mU?cls=7', 'CY2024-NV-MYS-00294', 'fuad.mawardi@ninjavan.co'),
  ('Pendang', '552', 'No. 16, Tingkat Bawah, Jalan Bestari 1, Taman Bestari, 06700 Pendang, Kedah Darul Aman.', 5.984165, 100.462256, 1400, '2020-10-05', '2026-12-31', 'https://drive.google.com/file/d/1rlY0DviZXrVAqyxor5xmLtEwlFSzuDO_/view?usp=drive_link', '2026-09-30', 1900, 3800, 'https://drive.google.com/file/d/12XtxQJsrEeyUzfa2WPhrWT5pGdLU0bX1/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAALmeF9BA?cls=7', 'CY2024-NV-MYS-00290', 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', '192', 'No C22, Susur Lencongan Timur Kanan Kawasan Perindustrian Cendana 08000 Sungai Petani Kedah', 5.60392695021665, 100.49811064971982, 1400, '2017-01-08', '2026-12-31', 'https://drive.google.com/file/d/1Dk0amaCOcI-KHkoTVCwnFgAuYYrExcCD/view?usp=drive_link', '2026-09-30', 21000, 84000, 'https://drive.google.com/file/d/1miF7E4Pu4lX-NhVhyD6N4Ej5GBwwWIoT/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAZPPAvm4?cls=7', 'CY2024-NV-MYS-00070', 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', '188', '9 Langkawi Mall, Persiaran Bunga Raya 1, Mukim Kuah, 07000 Langkawi, Kedah', 6.327797, 99.84342, 1200, '2017-01-12', '2027-08-31', 'https://drive.google.com/file/d/1mwOjCaIuTG9hntRs4EN-oTjvxqQUUZaY/view?usp=drive_link', '2027-01-31', 2100, 6000, 'https://drive.google.com/file/d/1qMOAyTmPk-o2jct9rqrNl1m9531DfmsB/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA6z7k0Vg?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', '52', 'No. 333, Jalan Perusahaan 2, Kawasan Perindustrian Bandar Baru Mergong, 05150 Alor Setar, Kedah', 6.126846, 100.337997, 3800, '2016-09-01', '2027-05-09', 'https://drive.google.com/file/d/1XgOSxF9Xk4jZZn0iAA-5-QfPkme3VZcR/view?usp=drive_link', '2026-10-31', 4500, 9000, 'https://drive.google.com/file/d/1tha8cnqLKHsL2zAsOXxzAAmBPNI02WuA/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA68Jdak4?cls=7', 'CY2024-NV-MYS-00291', 'fuad.mawardi@ninjavan.co'),
  ('Kulim', '401', 'No. 42, Jalan Waja Indah 1, Taman Waja Indah, 09000 Kulim, Kedah.', 5.418565, 100.567589, 1920, '2018-12-17', '2026-11-07', 'https://drive.google.com/file/d/12KmLY4DTMbCNtkTtjQQ3ti4KNs21MZ2U/view?usp=drive_link', '2027-06-30', 2550, 5100, 'https://drive.google.com/file/d/1Ar-3jEfcRu7PHGbtbvNPOYip7nbQm82B/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAoAKF-hI?cls=7', 'CY2024-NV-MYS-00075', 'fuad.mawardi@ninjavan.co'),
  ('Jitra', '470', '36, Ground Floor, Jalan Kpj 2/1, Kompleks Perniagaan Jitra 2, 06000 Jitra, Kedah', 6.254976, 100.418872, 1200, '2019-05-16', '2027-07-20', 'https://drive.google.com/file/d/1-RAatirNNHnopRGSO_2ub-d7RnAc7GZX/view?usp=drive_link', '2028-05-15', 1950, 5700, 'https://drive.google.com/file/d/10IGzuavW69hXnHWDjEsWj-gFftTUtY2H/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAky0La2I?cls=7', 'CY2024-NV-MYS-00076', 'fuad.mawardi@ninjavan.co'),
  ('Baling', '514', 'No. 1, Smart Auto Koperasi, Lot 102, Taman Desa Cempa, Batu 42, Mukim Pulai, 09100 Baling, Kedah Darul Aman.', 5.654122, 100.867554, 3180, '2019-12-16', '2027-02-08', 'https://drive.google.com/file/d/1OfPXKh_wmnW5D4c05pmv14g5P4RhGCrf/view?usp=drive_link', '2026-08-31', 2500, 5000, 'https://drive.google.com/file/d/1ALiDa07uOMhMRTx8KoMXYlUuaOzGYxST/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAAT_RwkU?cls=7', 'CY2024-NV-MYS-00149', 'fuad.mawardi@ninjavan.co'),
  ('Georgetown', '193', '16,Jalan Bawasah, 10050, Georgetown, Pulau Pinang', 5.421235, 100.325713, 3907, '2017-09-01', '2026-12-31', 'https://drive.google.com/file/d/1tkWdFuL9ij8Tk8uY38Poc20TqeZep4RM/view?usp=drive_link', '2027-10-31', 5500, 9000, 'https://drive.google.com/file/d/1k2Waj3X_Qu0JYDXgowfQoG2sh-2e6zv0/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAnRycLW4?cls=7', 'CY2024-NV-MYS-00151', 'fuad.mawardi@ninjavan.co'),
  ('Butterworth', '5', '19, Lorong Mak Mandin 5/3, Kawasan Perindustrian Mak Mandin, 13400 Butterworth, Pulau Pinang', 5.418345, 100.388527, 1500, '2016-01-01', '2026-12-31', 'https://drive.google.com/file/d/1GPyK1gYUbk4ZT0SBnJ-Lrh8U0SyA-H7m/view?usp=drive_link', '2027-03-31', 4590, 8360, 'https://drive.google.com/file/d/1CmRYhHK-PW5g7iIiN01buxGmikQ7CbZp/view?usp=drive_link
https://drive.google.com/file/d/1-H86KmT7WQcEt8naZ3wxrVX4K5pKL3az/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAfwiwYuQ?cls=7', 'CY2024-NV-MYS-00152', 'fuad.mawardi@ninjavan.co'),
  ('Bayan Lepas', '446', '7, Lintang Beringin 10, Diamond Valley Industrial Park, Permatang Damar Laut, 11960 Batu Maung, Pulau Pinang', 5.283195493351792, 100.27123907166269, 3200, '2019-03-25', '2026-12-31', 'https://drive.google.com/file/d/16447wSYE7lWvdJkRt30Bg9gIZ5rsA5nb/view?usp=drive_link', '2027-03-31', 6500, 1300, 'https://drive.google.com/file/d/1DUBz_VldwFe64fKGSystfKZFzybp5NeU/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAMAjd9wg?cls=7', 'CY2024-NV-MYS-00153', 'fuad.mawardi@ninjavan.co'),
  ('Simpang Ampat', '466', 'No.99(GF) Jalan Tasek Mutiara 6, Pusat Komersial Bandar Tasek Mutiara, Persiaran Mutiara 2 14120 Simpang Ampat, Pulau Pinang.', 5.274165, 100.49171, 1700, '2019-04-22', '2026-12-31', 'https://drive.google.com/file/d/1o0Gelh-WBwXVLT7PkE89Wx5aLF3-FNg6/view?usp=drive_link', '2027-12-31', 3000, 5000, 'https://drive.google.com/file/d/17EqmzZM6BdCGhWiHxA2q5efBsbORR8zH/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA4G3HBHU?cls=7', 'CY2024-NV-MYS-00309', 'fuad.mawardi@ninjavan.co'),
  ('Kepala Batas', '103185', 'No. 9, Ground Floor, Persiaran Seksyen 4/4,Bandar Putera Bertam, 13200 Kepala Batas', 5.518683, 100.48389, 2000, '2021-05-20', '2026-12-31', 'https://drive.google.com/file/d/13niuv990boyhdo6jE3089MZUYumXYrhm/view?usp=drive_link', '2027-04-14', 4235, 7000, 'https://drive.google.com/file/d/1jbiV68Awc4A7gvJa1rQ34P6LFkftdHIp/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAEU0Qc_g?cls=7', 'CY2024-NV-MYS-00155', 'fuad.mawardi@ninjavan.co'),
  ('Kuantan', '13', '15, Jalan Im 14/9, Indera Mahkota Industrial Area, 25200 Kuantan, Pahang', 3.829102, 103.280286, 4200, '2016-05-03', '2026-12-31', 'https://drive.google.com/file/d/1PCXR-oQ1Z95XXO0rovuql2b7Ew16k4Gu/view?usp=drive_link', '2026-07-31', 25000, 50000, 'https://drive.google.com/file/d/1mHMJ6H0e3lhZ5GFB4bV0Kfad0GjI2Jzz/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAm0_bAzE?cls=7', 'Done', 'fuad.mawardi@ninjavan.co'),
  ('Pekan', '537', '24 (Ground Floor), Lorong Ketapang Mualim13, Taman Ketapang Mualim, 26600 Pekan, Pahang', 3.490285, 103.41355, 2300, '2020-08-19', '2026-12-31', 'https://drive.google.com/file/d/1hnwgMTDCFLqPbL95TxX9W-QY017zt0_p/view?usp=drive_link', '2026-07-15', 1700, 2600, 'https://drive.google.com/file/d/1wl3DJu3nxDEMz-3ZokFAA2gVWvhES5dX/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAASByHpEU?cls=7', 'CY2024-NV-MYS-00184', 'fuad.mawardi@ninjavan.co'),
  ('Temerloh', '236', 'Ground Floor Of No. B-83, Bengkel Simpang Songsang, Taman Sri Semantan, 28000 Temerloh, Pahang', 3.470312, 102.38298, 3300, '2018-03-19', '2026-12-31', 'https://drive.google.com/file/d/1PrVo0jpnfUAVHAbS09Xpr74ijLQ_O7Te/view?usp=drive_link', '2027-03-28', 1760, 3200, 'https://drive.google.com/file/d/1tvERfMo_Mzw4RPetfJd4z46Ty4zTkS4l/view?usp=drive_link
https://drive.google.com/file/d/19JKdSagg9Wh55ZzQk40gLXz7KOiHJ1m-/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA1grx7YA?cls=7', 'CY2024-NV-MYS-00185', 'fuad.mawardi@ninjavan.co'),
  ('Bentong', '393', 'P11 Tingkat Bawah Taman Benus Permai, 28700 Bentong, Pahang.', 3.4932115308841767, 101.93259500008017, 1400, '2018-12-10', '2026-12-31', 'https://drive.google.com/file/d/1ByhA8nLvEC8ddALoOx4uM0DKLYUp2wn1/view?usp=drive_link', '2026-09-30', 1800, 3600, 'https://drive.google.com/file/d/1OIa0wJ-JfMJ3yTYCTC9cJY4WyEt4TTfO/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAs_vUJXc?cls=7', 'CY2024-NV-MYS-00186', 'fuad.mawardi@ninjavan.co'),
  ('Kuala Lipis', '397', '1, Jalan Cheneras Indah 1, Taman Cheneras Indah, 27200 Kuala Lipis, Pahang', 4.169494, 102.033677, 1200, '2018-12-10', '2026-12-31', 'https://drive.google.com/file/d/1Tp9xBcHCXvoNGf7LU0ZkT5FF1J8eX1mS/view?usp=drive_link', '2028-03-31', 2100, 4200, 'https://drive.google.com/file/d/1Tp9xBcHCXvoNGf7LU0ZkT5FF1J8eX1mS/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAArXfpY6U?cls=7', 'CY2024-NV-MYS-00187', 'fuad.mawardi@ninjavan.co'),
  ('Triang', '500', '21, Ground Floor, Jalan Dagangan 6, Pusat Dagangan Triang, 28300 Triang, Pahang', 3.245943, 102.414916, 1050, '2019-09-17', '2026-12-31', 'https://drive.google.com/file/d/1xwlNStDqWgD2s9fCT_AP5utsP9AoEMoF/view?usp=drive_link', '2026-08-31', 1600, 2600, 'https://drive.google.com/file/d/1uWZ1bZr8CM4A4Ir7nRJcLaUaCa2NOJcm/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAaCiOU2A?cls=7', 'CY2024-NV-MYS-00257', 'fuad.mawardi@ninjavan.co'),
  ('Jerantut', '409', '13A, Ground Floor, Lorong Wawasan 2, Taman Wawasan, 27000 Jerantut, Pahang', 3.92983, 102.381212, 1400, '2018-12-01', '2026-12-31', 'https://drive.google.com/file/d/1USk-BtT-dXAWG7bD-px64JjGPHM8El2g/view?usp=drive_link', '2026-11-30', 2500, 4800, 'https://drive.google.com/file/d/1R4KY3FqTuzoBmmpu3J7ZBGygLvPuxlVT/view?usp=drive_link
https://drive.google.com/file/d/1mJLtjCfXKTTckxrDhRMVVVVN-8gB-vPz/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAT110sns?cls=7', 'CY2024-NV-MYS-00188', 'fuad.mawardi@ninjavan.co'),
  ('Muadzam Shah', '450', '31, Ground Floor, Jalan Makmur 2, Bandar Satelit, 26700 Muadzam Shah, Pahang', 3.069054, 103.069803, 1200, '2019-05-02', '2026-12-31', 'https://drive.google.com/file/d/1Go2eYQxtviUe5wv9lPpqPNk1k7LWrJ5B/view?usp=drive_link', '2028-04-30', 1500, 1500, 'https://drive.google.com/file/d/11gVf0Wh91xTdicknl7FLVEGieiHBHw2M/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAJecyjUA?cls=7', 'CY2024-NV-MYS-00189', 'fuad.mawardi@ninjavan.co'),
  ('Gambang', '501', 'NO. B30 GF JALAN BANDAR GAMBANG 4, PUSAT KOMERSIAL BANDAR GAMBANG 26300 KUANTAN PAHANG', 3.71059098660965, 103.11875242442666, 1540, '2019-09-17', '2026-12-31', 'https://drive.google.com/file/d/1LGYAvesJYqQ_vl0QEhaJLIcE1kNOXmYQ/view?usp=drive_link', '2026-10-31', 1400, 2800, 'https://drive.google.com/file/d/1tmaqt85zmNIHtgxqQh9rkXwvgaK08xOG/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAYvhf8Ts?cls=7', 'CY2024-NV-MYS-00273', 'fuad.mawardi@ninjavan.co'),
  ('Kota Bharu', '30', 'Lot 5125 Jalan Pengkalan Chepa, Kawasan Perindustrian 11, 16100 Pengkalan Chepa, Kelantan.', 6.14015, 102.304067, 8000, '2016-12-05', '2027-01-09', 'https://drive.google.com/file/d/1srIXxCbWG5-Y4hgpDGpij9duaup8FgHc/view?usp=drive_link', '2026-09-30', 4000, 12250, 'https://drive.google.com/file/d/1Qy1teiJVeezLCekcTlEQCK0MboRoVFOx/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAJKSvc6g?cls=7', 'CY2024-NV-MYS-00227', 'fuad.mawardi@ninjavan.co'),
  ('Pasir Mas', '485', 'Pt 929 Kg Tal 7, Jalan Pasir Pekan, 17030 Pasir Mas, Kelantan', 6.051877, 102.186645, 1750, '2019-07-01', '2027-08-11', 'https://drive.google.com/file/d/1El3gKK62-w56qB38yTtgWbiAwLXLYTdb/view?usp=drive_link', '2025-06-30', 1800, 4300, 'https://drive.google.com/file/d/1vOzoENG1Oq8-4yoBMAxVPH2SriUu06lc/view?usp=drive_link
https://drive.google.com/file/d/1mBb1Aab73QSDs8sEyllfqOBIAt0S2Fjw/view?usp=drive_link', 'TA pending legal sign', 'https://chat.google.com/room/AAAAeAfEIuo?cls=7', 'CY2024-NV-MYS-00228', 'fuad.mawardi@ninjavan.co'),
  ('Machang', '246', 'Lot 2424, Kampung Sungai Mas, 18500 Machang, Kelantan.', 5.757113, 102.264026, 1200, '2018-04-06', '2027-04-23', 'https://drive.google.com/file/d/1OvXy38CtjhCKLelog0jjJ0aqoVn0OjGz/view?usp=drive_link', '2028-10-31', 11000, 20000, 'https://drive.google.com/file/d/1yoTAdyHI-LA2M-ED4mQNDFaphJ0lGdyd/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAATC2bLUk?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Gua Musang', '458', '5087, Jalan Kempas 1/2, Bandar Utama Gua Musang,18300 ,Gua Musang, Kelantan', 4.884845, 101.974184, 1800, '2019-04-08', '2026-12-31', 'https://drive.google.com/file/d/1vSxAZB0HM5cxt8G7YO5hzKzy25BxcIPg/view?usp=drive_link', '2027-03-30', 2500, 4850, 'https://drive.google.com/file/d/1YGe6Dl-Mq_6Zc6njr_m-cYmTzwZ193Av/view?usp=sharing
https://drive.google.com/file/d/1bTKbTtlwIp-nurhLf-OGxYW1-evsszzd/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAKSPbQxk?cls=7', 'CY2024-NV-MYS-00230', 'fuad.mawardi@ninjavan.co'),
  ('Kuala Krai', '497', '3024, Kg Baru Sri Rahmat, 18000 Kuala Krai, Kelantan.', 5.502897776575713, 102.2219569203471, 1520, '2019-08-26', '2027-01-18', 'https://drive.google.com/file/d/1Fd1Bthb21xsnCRZ8VSbLTaYvfYj2SwGi/view?usp=drive_link', '2027-08-31', 700, 1400, 'https://drive.google.com/file/d/1W6pLVYS0DeYk7NCV57lNbl9bZNHZmCy-/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAuGnYz2M?cls=7', 'CY2024-NV-MYS-00231', 'fuad.mawardi@ninjavan.co'),
  ('Paka', '168', 'Lot Pt 196, Tingkat Bawah Dan Tingkat Atas, Pusat Niaga Paka, 23100 Paka, Dungun, Terengganu', 4.63716, 103.43765, 1600, '2017-07-17', '2026-12-31', 'https://drive.google.com/file/d/1iU_IexxPBzpU2Tgg0b-mBePbYvSUZb5r/view?usp=drive_link', '2025-09-30', 3000, 5200, 'https://drive.google.com/file/d/1w9CQ52nTt5wdBbr5QGZg6hLH5IGF9Myr/view?usp=drive_link
https://drive.google.com/file/d/1RwviuWxjTtuR6eG3LbOGdquh7mRMxD96/view?usp=drive_link', 'TA hold', 'https://chat.google.com/room/AAAAvmJP5Hs?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', '547', 'LOT 5487 , RUMAH KEDAI TINGKAT BAWAH , JALAN TOK GEBOK , PEKAN AJIL , 21800 HULU TERENGGANU , TERENGGANU .', 5.078333, 103.082531, 2100, '2020-09-07', '2026-12-31', 'https://drive.google.com/file/d/1ZYOCTTCy7jzywKRgfxHsAEtdl22Ts5P9/view?usp=drive_link', '2025-10-31', 2000, 4000, 'https://drive.google.com/file/d/1jtkDHlfm2_jGfOeec6YydyG5xkVrhPmw/view?usp=drive_link', 'TA hold', 'https://chat.google.com/room/AAAA4Aq54qw?cls=7', 'CY2024-NV-MYS-00214', 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', '23', 'Lot Sk 46, Kawasan Perindustrian Gong Badak , 21300 , Kuala Terengganu, Terengganu', 5.382811, 103.079934, 7200, '2016-01-08', '2026-12-31', 'https://drive.google.com/file/d/1B9NrAYZmv3OZFZH-EN9yuaJWrMXxaaNt/view?usp=drive_link', '2026-06-30', 21600, 5000, 'https://drive.google.com/open?id=1AQAIKBTNRAJXWStxX6wUpZxF5oKPoeBT
https://drive.google.com/file/d/1kRFt4DtcTjeRvpgUHIuviNBJqfVR8Ncm/view?usp=drive_link', 'TA pending update by legal', 'https://chat.google.com/room/AAAAmtjxWrk?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', '427', 'Tingkat 1, 79, Jalan Putra A/4, Taman Bandar Putra, Kampung Mak Lagam, Mukim Banggul, 24000 Kemaman, Terengganu', 4.191667, 103.410017, 1250, '2019-02-11', '2026-12-31', 'https://drive.google.com/file/d/1k4HxlWAw9eMBaU3uwyK8MGnqJinkW0q8/view?usp=drive_link', '2027-02-28', 1400, 2600, 'https://drive.google.com/file/d/1fmjlLAXd5UaDjLA27B_ZhdCR_Z4tXI1z/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAADynYFMo?cls=7', 'CY2024-NV-MYS-00215', 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', '326', 'Lot 818, Jalan D , Kenjing ,Bukit Puteri , Kg Seberang Jerteh ,22000 Jerteh, Terengganu', 5.750392, 102.488358, 1750, '2018-10-01', '2026-12-31', 'https://drive.google.com/file/d/1xtHYb-sm9Ja5x8sNr-lfFSX9slE3xH_r/view?usp=drive_link', '2027-08-31', 2100, 3600, 'https://drive.google.com/file/d/1TXPc0SIw9hKxFADFSsUnJe4Nb6V1npMX/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAvwitS0U?cls=7', 'CY2024-NV-MYS-00218', 'fuad.mawardi@ninjavan.co'),
  ('Pasir Puteh', '561', 'Pt2214-b, Bangunan Wisma Berkat, Jalan Pasir Puteh Bypass, 16800 Pasir Puteh, Kelantan', 5.832700313208425, 102.38301387151914, 2350, '2020-11-10', '2027-03-02', 'https://drive.google.com/file/d/1w9PCrdTO42UAg7du8WCzpMmPgoic86Sp/view?usp=drive_link', '2026-10-31', 1100, 2000, 'https://drive.google.com/file/d/1k6SKFHlk_ee9mtIHVs2E5sotTaYW0ePB/view?usp=drive_link', 'pending sign ninja, pending refund from owner RM2500-shoplot sebelah', 'https://chat.google.com/room/AAAAMGPjkpQ?cls=7', 'CY2025-NV-MYS-00313', 'fuad.mawardi@ninjavan.co'),
  ('Inanam', '117', 'Lot No.17, Block G, Sri Kemajuan Industrial Centre, Mile 6 1/2, Jalan Tuaran 88450 Kota Kinabalu Sabah', 5.995497, 116.140892, 3000, '2016-03-02', '2026-12-31', 'https://drive.google.com/file/d/1jFfoDzw-QlEnTYg24tJcEgolzb2BJ2xy/view?usp=drive_link', '2027-05-31', 4725, 9000, 'https://drive.google.com/file/d/1NcFM6cqgUOZlhR99oyf0SFU7RvFw8TOY/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAXmTHgHc?cls=7', 'CY2024-NV-MYS-00234', 'fuad.mawardi@ninjavan.co'),
  ('Sandakan', '234', 'Lot S-41, Industrial Lot, Phase 2, Bandar Letat Jaya, Jalan Lintas Utara, Mile 4, 90000 Sandakan, Sabah.', 5.868408029882832, 118.08404286595783, 6280, '2018-03-03', '2024-12-31', 'https://drive.google.com/file/d/1RvQA4yn05w_4
  ('Tawau', '252', 'TB 9139 & TB 9140 (Lot 42B & 43B), Perdana Square, Jalan Apas, Batu 3 ½, 91000 Tawau, Sabah', 4.25382, 117.919685, 1100, '2018-06-01', '2026-12-31', 'https://drive.google.com/file/d/1DQfJbVdzmQh3s1K2ms1nkNCtC9ldNMC7/view?usp=drive_link', '2027-10-31', 1900, 10500, 'https://drive.google.com/file/d/1jZI_DjHvlNKm_jNCV4iHVa2SccAdQfi3/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAsSsYOE4?cls=7', 'CY2024-NV-MYS-00037', 'fuad.mawardi@ninjavan.co'),
  ('Lahad Datu', '574', 'Mdld 6932, Lot 24, Ground Floor, Jalan Silam, Bandar Sri Perdana Phase 3, Lahad Datu, 91100 Sabah', 5.02841, 118.295968, 1200, '2021-04-19', '2026-12-31', 'https://drive.google.com/file/d/1Yzpr7yo8ljk_CmTEY5pbfvSMs3bxI_RR/view?usp=drive_link', '2026-03-31', 1700, 4000, 'https://drive.google.com/file/d/11TOICSuNH7x9duT5AXHitZYbwtZ83LIu/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAASpv6AiY?cls=7', 'CY2024-NV-MYS-00246', 'fuad.mawardi@ninjavan.co'),
  ('Labuan', '575', 'Lot 4, Taman Tan Boon How Shophouse Kampung Sungai Keling, Jalan Rancha-Rancha, W.P Labuan.', 5.292238889077125, 115.2242869872136, 1500, '2021-04-26', '2026-02-23', 'https://drive.google.com/file/d/1uUrPAW_Jpnp-_9QKSaaIe3apgR5pUrdx/view?usp=drive_link', '2028-07-31', 2800, 5600, 'https://drive.google.com/file/d/1MUETaDse-t4wGwKUnkfc0Vc5jjkh4eOv/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA13QJu2o?cls=7', 'CY2024-NV-MYS-00235', 'fuad.mawardi@ninjavan.co'),
  ('Miri', '121', 'Lot 53, Block 3, Miri Concession Land District, Jalan Piasau Road 2d, Piasau Road, 98000, Miri, Sarawak.', 4.439079, 114.006909, 5000, '2017-11-01', '2026-02-17', 'https://drive.google.com/file/d/1ajbltW2HyrVwVHnJcWPGQzqn0bskXx37/view?usp=drive_link', '2027-01-15', 3000, 9000, 'https://drive.google.com/file/d/1ee8LxKqFkO-6PfuWEs6Vcu0RWgD1Aklz/view?usp=drive_link
https://drive.google.com/file/d/1YWM-5InNhENHs2lyChDBpyMgqeUZ5PTp/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA1-0Dw_Q?cls=7', 'CY2024-NV-MYS-00036', 'fuad.mawardi@ninjavan.co'),
  ('Kuching', '139', 'Lot 1250, Block 8, Muara Tebas Land District, Demak Laut Industrial Park, 93050 Kuching Sarawak.', 1.5971, 110.4356, 4000, '2017-02-05', '2024-02-12', 'https://drive.google.com/file/d/14rH_xLFFoG7Di8BFq6LsmiRaipgGKxiQ/view?usp=share_link', '2025-07-31', 0, 16500, 'https://drive.google.com/file/d/1QbZDZzSQTyuIgUfH8Judv2J0L_lhCH69/view?usp=sharing', 'on Legal discussion - BL need director from Sarawak', 'https://chat.google.com/room/AAAAdVldIbs?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Bintulu', '147', 'LOT 1361, BLOCK 31 NO 15 JALAN TG BATU , BDA SHOPHOUSE , KEMENA LAND DISTRICT 97000 BINTULU SARAWAK', 3.190712, 113.04108, 1300, '2017-05-11', '2021-08-11', NULL, '2026-01-31', 2000, 4000, 'https://drive.google.com/file/d/1WGV0VltHwIc7WKcoUEkBiw7ZMV3bpRZU/view?usp=drive_link', 'Borang permohonan Lesen Bintulu.png on Legal discussion - BL need director from Sarawak', 'https://chat.google.com/room/AAAAmiEMF7Y?cls=7', 'CY2024-NV-MYS-00253', 'fuad.mawardi@ninjavan.co'),
  ('Sibu', '290', 'Ground Floor, 47 Jalan Lanang, Lorong Pulau Li Hua 2B, 96000 Sibu, Sarawak.', 2.258652461741797, 111.84472040720826, 1921, '2018-09-01', '2026-09-26', 'https://drive.google.com/file/d/16B4vdy1UbyzgorKiAphFz5c3nZAjzRKk/view?usp=drive_link', '2026-08-31', 3000, 6000, 'https://drive.google.com/file/d/1JU1lmoetoqtKc0NjqDKiU
  ('Keningau', '103560', 'Lot 32, Yun Fook Industrial Shoplots, Jalan Nabawan, 89000, Keningau Sabah', 5.326, 116.150639, 1200, '2021-10-15', '2025-12-31', 'https://drive.google.com/file/d/1OsTcnKVTFiv7BCgOes8bUVuYyzMlNovX/view?usp=drive_link', '2028-01-31', 1800, 4000, 'https://drive.google.com/file/d/1YeylM2M5Hdu6t1Yj7hYIja4Yt9rcZN4_/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAb-dhCyw?cls=7', 'CY2024-NV-MYS-00237', 'fuad.mawardi@ninjavan.co'),
  ('Papar', '103557', 'Ground Floor, Lot 70, Block 11, Papar Square Phase 1, 89600 Papar, Sabah.', 5.7244161, 115.9338267, 1200, '2021-10-15', '2025-12-31', 'https://drive.google.com/file/d/1ciGCRKZu6cMYeeLsHLeYBNCb7Pp6TFRp/view?usp=drive_link', '2026-10-31', 2000, 4000, 'https://drive.google.com/file/d/1T0IxaDaLrzKX5g_4XjhtU77eR4iu5cdL/view?usp=drive_link', 'Bill Cukai pending by owner.png Relocate, on extension', 'https://chat.google.com/room/AAAABtW3xoU?cls=7', 'CY2024-NV-MYS-00264', 'fuad.mawardi@ninjavan.co'),
  ('Semporna', '103559', 'Ground Floor Lot 177, Desa Seri Tong Talun, Jalan Seri Melur Tinagayan,91308, Semporna, Sabah', 4.466658, 118.594816, 1200, '2021-11-26', '2026-12-31', 'https://drive.google.com/file/d/1H4UBfEqHNrwlwElL1CCrg9Gz90tOzLaH/view?usp=drive_link', '2027-11-30', 3000, 6000, 'https://drive.google.com/file/d/1H5EqKiJTH0gijWUvmz51-M-MemLL3BbK/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAZ793pJ8?cls=7', 'CY2024-NV-MYS-00311', 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', '103433', 'PT 15417-A, Jalan Industri TMP 2, Taman Tanjung Minyak Perdana, 75260 Melaka.', 2.280598, 102.187039, 23056, '2021-09-13', '2026-10-20', 'https://drive.google.com/file/d/1Njvv-ynfgMFYRzWmgWtNtBb71MTOLPmg/view?usp=drive_link', '2026-08-31', 19800, 36000, 'https://drive.google.com/file/d/1CC1asgCQnEAqVe6z49gOxVqFTRByTlS9/view?usp=drive_link
https://drive.google.com/file/d/1M4CyhoN_fUxVwMhLHsrj9dTXoWyzybsc/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAARsRdstY?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', '103254', 'PT5363, Kampung Pak Kancil , Bandar Permaisuri, 22100 Setiu, Terengganu', 5.5075, 102.77935, 1800, '2021-09-13', '2026-12-31', 'https://drive.google.com/file/d/1_F7-q5pOzeCSz0Z6k_ipOsYhJA6fhKda/view?usp=drive_link', '2027-08-31', 1400, 3300, 'https://drive.google.com/file/d/1xlRIuDTb39qfS7kJWJxAx9Xqpm7fJJJ-/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA7p8eZu0?cls=7', 'CY2024-NV-MYS-00221', 'fuad.mawardi@ninjavan.co'),
  ('Ketereh', '103686', 'Lot 1912 Kampung Pasir Golok, 16450 Ketereh, Kota Bharu Kelantan.', 5.959982527379537, 102.23357552527008, 2000, '2021-12-20', '2027-01-02', 'https://drive.google.com/file/d/1TTczdvqueLjBhjldIOqAASBctdU5zIdR/view?usp=drive_link', '2025-12-31', 1150, 2000, 'https://drive.google.com/file/d/12zhMYapOk5ydE1eaMyFLoJCpdGGDjvKs/view?usp=drive_link
https://drive.google.com/file/d/1uom0jpqPpGi8s0GT8iHlIFA8KNduAzKF/view?usp=drive_link', 'TA pending approval in email', 'https://chat.google.com/room/AAAAgGBf34E?cls=7', 'CY2024-NV-MYS-00232', 'fuad.mawardi@ninjavan.co'),
  ('Wakaf Bharu', '103650', 'PT2941, JALAN PUTRI 2, TAMAN KOTA KUBANG LABU, BANDAR BARU PASIR PEKAN 16250 WAKAF BHARU KELANTAN', 6.119956, 102.217258, 1400, '2021-11-06', '2027-01-05', 'https://drive.google.com/file/d/1MmzHvSU299bMr9HCvh8VF_OpgLLv_PgF/view?usp=drive_link', '2026-10-31', 2500, 5000, 'https://drive.google.com/file/d/1mNggHNErXdnbvCBRHiWAh5TXp72e6TM2/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAPnUspQI?cls=7', 'CY2024-NV-MYS-00256', 'fuad.mawardi@ninjavan.co'),
  ('Dungun', '103652', 'Lot PT 20084, Kampung Binjai, Jalan Dungun Bukit Besi, 23000 Dungun Terengganu', 4.766976, 103.371803, 2000, '2021-11-06', '2026-12-31', 'https://drive.google.com/file/d/1pmRqfAxfI18t3a9PFUXwmCbz-0nzLaT2/view?usp=drive_link', '2027-10-31', 2205, 4000, 'https://drive.google.com/file/d/1D0lxkascFnzYtrhy9qP8GUtEfZxhnXAP/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAGLtgODc?cls=7', 'CY2024-NV-MYS-00222', 'fuad.mawardi@ninjavan.co'),
  ('Raub', '103253', 'No 12, Ground Floor, Lorong Maju Indah 1, Taman Maju Indah, 27600 Raub, Pahang', 3.81706, 101.84417, 1870, '2021-11-01', '2026-12-31', 'https://drive.google.com/file/d/1VNLnmbpDeKO4AIyDk8Dd8lMak9SByC60/view?usp=drive_link', '2026-10-31', 2530, 5060, 'https://drive.google.com/file/d/1eo2MV_Dd5hhYk7Ugg7-fRLA0AEvGXKTf/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAXkLUwXU?cls=7', 'CY2024-NV-MYS-00213', 'fuad.mawardi@ninjavan.co'),
  ('Rompin', '103665', '13, Jalan Ixora 1, Taman Ixora, 26800 Kuala Rompin, Pahang', 2.791756, 103.489163, 1733, '2021-11-25', '2026-12-31', 'https://drive.google.com/file/d/1YAVvkWt-FuMhAbKcWzG33YvWUOgXetIS/view?usp=drive_link', '2025-11-30', 1600, 3200, 'https://drive.google.com/file/d/1yo94wz5QYOFu6pX_51Da8cwQ8GRIZr0d/view?usp=drive_link', 'TA pending approval in email', 'https://chat.google.com/room/AAAAv9Aa0JE?cls=7', 'CY2024-NV-MYS-00190', 'fuad.mawardi@ninjavan.co'),
  ('Jengka', '103685', 'No. 11 TJI 1 Taman Jengka Indah, 26400 Bandar Jengka Pusat, Pahang.', 3.773030790455016, 102.55822730712073, 1400, '2021-12-18', '2026-12-31', 'https://drive.google.com/file/d/1N-Gho00EkMA8ZZDS0-yxfXGbid8Qb3U2/view?usp=drive_link', '2026-11-30', 1600, 3200, 'https://drive.google.com/file/d/1SW155WuTR99qOQ8wopwB6Hauy2kSQX-3/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAOZYAFYc?cls=7', 'CY2024-NV-MYS-00274', 'fuad.mawardi@ninjavan.co'),
  ('Bandar Mahkota Cheras', '103524', 'No. 2, Jalan Penggawa 4/2, Bandar Mahkota Cheras, 43200 Selangor.', 3.057185, 101.7839571, 1650, '2021-10-06', '2026-11-24', 'https://drive.google.com/file/d/1MFU_OMgpBoFFR_yqZSLvT9wkQ7r91Yog/view?usp=drive_link', '2026-09-30', 4400, 8250, 'https://drive.google.com/file/d/1hPagASX78cQaGN323wOn0LagLxw5JYqg/view?usp=drive_link', 'BL progress after relocate in Oct 2024', 'https://chat.google.com/room/AAAANFwKOGc?cls=7', 'CY2024-NV-MYS-00192', 'fuad.mawardi@ninjavan.co'),
  ('Shamelin', '103523', 'No 16 Jalan 6C/91 Taman Shamelin Perkasa 56100 Kuala Lumpur', 3.12531, 101.73712, 1600, '2021-10-06', '2026-12-22', 'https://drive.google.com/file/d/10KFATl-NX4Q9Mk3Y3Bdgt-zZ4PdJD_iM/view?usp=drive_link', '2026-09-14', 6850, 12700, 'https://drive.google.com/file/d/1-kpVGXDPPAIWrTct8519f45-G6mWXdcx/view?usp=drive_link
https://drive.google.com/file/d/1tPjLhRcDYofxg-syP8f3tp44Sq5yz3m9/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAtoP0sZM?cls=7', 'CY2024-NV-MYS-00193', 'fuad.mawardi@ninjavan.co'),
  ('Rimbayu', '103512', 'No.12A Jalan Rajawali 5，Batu 9 Kawasan Perusahaan Kebun Baru，42500 Telok Panglima Garang ，Selangor.', 2.9229221821871576, 101.48641186536027, 2400, '2021-10-04', '2023-12-31', 'https://drive.google.com/file/d/1a9UGj5kFcSh6yaKMWOObBN9M4MsS5xGt/view?usp=share_link', '2026-09-30', 5335, 8600, 'https://drive.google.com/file/d/1FWCmd-5sTDw4g9Ba-Cyn3XGIS7TqKMSO/view?usp=sharing
https://drive.google.com/file/d/1GAlRSqgNxvKyB5fLt-Dz7TeodGZXzhKA/view?usp=drive_link', 'BL cannot proceed sbb takde CF', 'https://chat.google.com/room/AAAAaSqK2EY?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Botanik', '103526', 'No 2 (GF), Jalan Jasmin 8, Bandar Botanik, 41200 Klang, Selangor.', 2.989543, 101.445318, 2000, '2021-10-04', '2026-12-31', 'https://drive.google.com/file/d/14WIZjZAFVPDGsMkUn5q1N6Y4xIdJEJC7/view?usp=drive_link', '2026-09-30', 4500, 9000, 'https://drive.google.com/file/d/1lzq2kO6sTshnxbDQIoiWgGPscUhlz6iX/view?usp=drive_link
https://drive.google.com/file/d/1U-VqiI8yq6zZ5qz-5awKibs3FeZ_njoj/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAkJVjBdM?cls=7', 'CY2024-NV-MYS-00195', 'fuad.mawardi@ninjavan.co'),
  ('Ayer Hitam', '103654', 'No 2, Jalan Putra 1, Taman Medan Putra 86100 Ayer Hitam, Johor.', 1.919697, 103.180896, 2320, '2021-11-08', '2026-12-31', 'https://drive.google.com/file/d/1usOWHe5V5Lgflg97n0THYMWeK3aCWhf0/view?usp=drive_link', '2026-10-31', 2800, 5600, 'https://drive.google.com/file/d/1C2maUOhAONstBDjlXn5qWjojngo0s62Y/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAFxWt-9Q?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', '103598', 'No 48, Ground Floor, Jalan Sena Sentral 7, Pusat Perniagaan Sena Sentral 06400 Pokok Sena, Kedah.', 6.179667, 100.528825, 1400, '2021-11-01', '2026-11-19', 'https://drive.google.com/file/d/1MZ_qkyA4Wcg1nrxEzSF1Do5B2RfTSGvj/view?usp=drive_link', '2026-10-15', 2000, 4000, 'https://drive.google.com/file/d/1Mp4VXZ3ZnRgUzmX9HLn-yhppZrUwPqO2/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAiibRr_g?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', '103660', '34, Jalan Iskandar Puteri 1/2, Taman Nusantara Prima, 81550 Gelang Patah Iskandar Puteri, Johor', 1.478718, 103.583024, 1680, '2021-11-15', '2024-12-31', 'https://drive.google.com/file/d/1Zlds9Rcnso-orUQLkMo1Z4OOOWjMzxHT/view?usp=drive_link', '2027-08-31', 3000, 6000, 'https://drive.google.com/file/d/13BSjY8Mgqh6s0S95mK9Bm1lNqPEgYDe9/view?usp=drive_link', 'BL in progress by RH', 'https://chat.google.com/room/AAAAMx93KT4?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Farlim', '103674', '3-G-7, Desa Mutiara Phase 2, Lorong Delima 20, 11700 Gelugor, Pulau Pinang', 5.378623, 100.302557, 1200, '2021-11-14', '2026-12-31', 'https://drive.google.com/file/d/1SY5AYiR5JTFSveKtLgGLGX-o4TWuvMld/view?usp=drive_link', '2027-12-31', 4500, 7800, 'https://drive.google.com/file/d/1snDJX2bT2kde6fyZd8vL_zBZUNzOfJaC/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAPJeLIm8?cls=7', 'CY2024-NV-MYS-00156', 'fuad.mawardi@ninjavan.co'),
  ('Gurun', '103858', 'No. 12 Tingkat Bawah, Jalan Jerai Bayu 2, Taman Jerai Bayu 08300 Gurun Kedah', 5.828611, 100.481564, 1200, '2021-12-16', '2026-12-31', 'https://drive.google.com/file/d/1acaKEgErFa6utrEqe3OamqH-pHCtCcng/view?usp=drive_link', '2027-03-14', 2000, 4000, 'https://drive.google.com/file/d/10QQsD1_-OXh25M-Wy_R8dS5qLFoyjy9q/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAaOQPD4c?cls=7', 'CY2025-NV-MYS-00321', 'fuad.mawardi@ninjavan.co'),
  ('Bukit Mertajam', '103943', 'No. 1, Medan Permai Jaya, Taman Permai Jaya, 14000 Bukit Mertajam, Pulau Pinang', 5.336603, 100.46077, 2452, '2022-01-05', '2026-12-31', 'https://drive.google.com/file/d/14qQPYmtuE-ax647NSVtY53uP-yRj9S7T/view?usp=drive_link', '2026-11-30', 4200, 3500, 'https://drive.google.com/file/d/1Ge-S6gF40XHtuIQsIN7TP5Jl_VwERZdg/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAXpIOImE?cls=7', 'CY2024-NV-MYS-00297', 'fuad.mawardi@ninjavan.co'),
  ('Samarahan', '103942', 'Ground Floor, Shoplot 9, Lot 1498, Medan Universiti Jalan Muara Tuang, 94300 Kota Samarahan, Sarawak.', 1.459652, 110.420854, 2000, '2022-01-03', '2025-08-22', 'https://drive.google.com/file/d/1iBksyQJeweiyVUyzIw1tz3Q77AiOGfoC/view?usp=drive_link', '2026-12-31', 2300, 4600, 'https://drive.google.com/file/d/1FaIzX1ca1QYqoXxtea_pnWwPCUQHuYfS/view?usp=drive_link
https://drive.google.com/file/d/1PsZdcygvEHo_hr8HefDAXIcwpTF8ulx4/view?usp=drive_link', 'pending cukai pintu from landlord', 'https://chat.google.com/room/AAAA2jAGHEM?cls=7', 'CY2024-NV-MYS-00292', 'fuad.mawardi@ninjavan.co'),
  ('Penampang', '103975', 'Padimas Point, Wisma Fanware, Block B, SH-0-15, Jalan Pintas,Penampang,89500 Penampang Sabah', 5.914206262436693, 116.08481355314869, 1200, '2022-01-12', '2025-12-31', 'https://drive.google.com/file/d/11z1rch9rtIo0nXJ1ilFqCEaZuhmH76_x/view?usp=drive_link', '2027-04-30', 3900, 7600, 'https://drive.google.com/file/d/1CTxd3qXxdv9ClTVDKv3eg54f75spHDxE/view?usp=drive_link
https://drive.google.com/file/d/1PsZdcygvEHo_hr8HefDAXIcwpTF8ulx4/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAADl2-mSw?cls=7', 'CY2025-NV-MYS-00347', 'fuad.mawardi@ninjavan.co'),
  ('Tuaran', '103976', 'Phase 1, Lot3A, ⁠T-junction Business Centre, km33 Jln KK-KB, Kg.Dungun, 89208, Tuaran, Sabah.', 6.216337889112206, 116.21504939671, 712, '2022-03-10', '2025-12-31', 'https://drive.google.com/file/d/1HyfbEbd6F6Zp0r4sZ8czVQwshnRkvVaA/view?usp=drive_link', '2026-02-28', 2500, 5000, 'https://drive.google.com/file/d/1sVOx8aLXRq4AfWGotlp19hzEhzDyW_tX/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAwytYF64?cls=7', 'CY2024-NV-MYS-00240', 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', '104406', 'NO. 1C JALAN PALMA RAJA 4, TAMAN DATO CHELLAM, 81800 ULU TIRAM, JOHOR', 1.576228, 103.816233, 1200, '2022-07-04', '2026-10-30', 'https://drive.google.com/file/d/12xP39dnLRyDRRkhRYiv5FrlV2U_8lPtr/view?usp=drive_link', '2027-05-31', 2200, 4400, 'https://drive.google.com/file/d/1r2Z6J4jRd9AXLduxSMfVMpVlc3Q4c9dW/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAA8jRV2kg?cls=7', 'CY2024-NV-MYS-00206', 'fuad.mawardi@ninjavan.co'),
  ('Beaufort', '104138', 'Lot No. 1, Ground & 1st Floor, Block D, Bandar Mingo, Phase 1, 89808 Beaufort, Sabah', 5.34397, 115.725152, 1200, '2022-02-24', '2026-12-31', 'https://drive.google.com/file/d/10H9wc3BAn3goo_titVv77D-C70x4VIRE/view?usp=drive_link', '2027-01-31', 2450, 4900, 'https://drive.google.com/file/d/1dHremxMxEpzWequH7S1q-5lETW1VLcD7/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAbj3knzA?cls=7', 'CY2025-NV-MYS-00314', 'fuad.mawardi@ninjavan.co'),
  ('Kota Kinabatangan', '104271', 'Lot Kedai, Block A-lot 5, Bangunan Sri Sazati 2, Simpang Genting Mewah, Batu 9 Bukit Garam, 90200, Kota Kinabatangan, Sabah', 5.6056787594327115, 117.8215221008743, 1250, '2022-03-14', '2026-12-31', 'https://drive.google.com/file/d/1R0cmmbSTwTyPt_BRvsmixWcXTvVFgy3d/view?usp=drive_link', '2026-03-04', 1600, 3200, 'https://drive.google.com/file/d/1SEqxYKWABLyuBtlPtftiq3qzgKmCbDL0/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAScLmBMk?cls=4', 'CY2024-NV-MYS-00258', 'fuad.mawardi@ninjavan.co'),
  ('Marang', '104056', 'Lot 7021 K-2 & K-3, Kg Sentol Patah, 21600 Marang, Terengganu', 5.170961, 103.193026, 1956, '2022-02-11', '2026-12-31', 'https://drive.google.com/file/d/1819PJNgRrzu_ZsPcjXvCZdFH891c3y0P/view?usp=drive_link', '2026-01-31', 1400, 3600, 'https://drive.google.com/file/d/1G_rSTFG0AvQv6-xt3oo3zspiKUcbKOw0/view?usp=drive_link', 'TA pending approval in email', 'https://chat.google.com/room/AAAAz-YZD2Q?cls=7', 'CY2024-NV-MYS-00225', 'fuad.mawardi@ninjavan.co'),
  ('Gemas', '104272', 'No 83, Jalan DS 2/4, Dataran Satria 2, 73400 Gemas, Negeri Sembilan', 2.587461, 102.57566, 1540, '2022-03-21', '2026-12-31', 'https://drive.google.com/file/d/1NIJqe1WAMbXGlft87LHPCZdPicZEMDuM/view?usp=drive_link', '2026-12-28', 1970, 3400, 'https://drive.google.com/file/d/11umaGsg8HDzT8QGkohsGhalwTJbLYBvI/view?usp=drive_link
https://drive.google.com/file/d/1Z3GUPrmzGeHsg0tpFblKdOM5xcOnMtjC/view?usp=drive_link', 'BL - pending SH', 'https://chat.google.com/room/AAAAev04h_w?cls=7', 'CY2024-NV-MYS-00196', 'fuad.mawardi@ninjavan.co'),
  ('Seremban', '104092', 'Ground Floor, No 540 Jalan Seremban Tiga 15, Seremban 3, 70300, Seremban, Negeri Sembilan', 2.675042, 101.935519, 2000, '2022-02-14', '2027-09-07', 'https://drive.google.com/open?id=1dRB8W9slWv0u5HZBfZL4Q05MpghMnBjF&usp=drive_copy', '2026-12-31', 2200, 4400, 'https://drive.google.com/file/d/1M7V0R7XDZN5L0sJVuAvKG4yx4Yq7kQ-K/view?usp=sharing
https://drive.google.com/file/d/1awLPUzJeEWu1PHh_SAkPnDSvSDj28Yv7/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAYyR1pAg?cls=7', 'CY2024-NV-MYS-00197', 'fuad.mawardi@ninjavan.co'),
  ('Saratok', '104405', '1st Floor, Lot 781, Wisma Lakis, Jalan Ong Ho San, Saratok Town District, 95400 Saratok', 1.73838, 111.33732, 1200, '2022-08-16', '2026-10-09', 'https://drive.google.com/file/d/1jG0WQxIHFqdZXEnlMFdqJV-Q1B7zK_Y2/view?usp=drive_link', '2026-09-30', 1350, 2600, 'https://drive.google.com/file/d/15CDFDlxMWiORfCXmbKOaulQGHwgsKzVr/view?usp=drive_link
https://drive.google.com/file/d/1DLhvWxwEdnz00tPq4gsiN-IdwMiE4za1/view?usp=drive_link
https://drive.google.com/file/d/1HV0Izxduw10kGT5hANsam7-FK6kD5Q1e/view?usp=drive_link
https://drive.google.com/file/d/188qv8TBqFefERbuoAOiB2LbtrjQxYMGr/view?usp=drive_link', 'Additional RM100 for security deposit - add in later in new TA (after sept 2026)', 'https://chat.google.com/room/AAAAqP7iy9Y?cls=7', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Rantau Panjang', '104604', 'No 62,62A Jalan Sungai Bilah 1/KU4, Kampung Rantau Panjang 42100 Klang', 3.069889, 101.414087, 2200, '2022-05-22', '2026-12-31', 'https://drive.google.com/file/d/1Open08kqCImAnu16JfexspC28XdC92V_/view?usp=drive_link', '2027-04-30', 3500, 7000, 'https://drive.google.com/file/d/1jaCjsdSakBmQ1ipn4l7hr2lRKU2pREsF/view?usp=drive_link
https://drive.google.com/file/d/14pZg5LIcTYraih3hdBUfzwNZyCjRkP_I/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAIrndbvI?cls=7', 'CY2024-NV-MYS-00208', 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', '104510', 'Lot 922, Sungai Rengas, 20050 Kuala Terengganu , Terengganu', 5.28175, 103.09706, 4800, '2022-04-22', '2026-12-31', 'https://drive.google.com/file/d/1EIrNEriACFspzHLEfBw3XsZCR0tY4VzZ/view?usp=drive_link', '2026-04-30', 3025, 7500, 'https://drive.google.com/file/d/1ryJIL4HnpSeni8g2pK7g-p3DgM75jEpZ/view?usp=drive_link
https://drive.google.com/file/d/1pR7UJZ8IVa1NnFCFtOYuf2_y0fmbgpbg/view?usp=drive_link', 'TA pending update legal', 'https://chat.google.com/room/AAAAq4lGVgI?cls=4', 'CY2024-NV-MYS-00226', 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', '104615', 'No 3, Jalan Selayur 5, Taman Pasir Putih, 81700 Pasir Gudang Johor', 1.4575085950945967, 103.94178005982299, 1540, '2022-05-23', '2026-12-31', 'https://drive.google.com/file/d/1RcdqeIlTo6xkyEBik-bn3hvnvWD53Zw0/view?usp=drive_link', '2026-03-31', 1710, 3420, 'https://drive.google.com/file/d/19Y-1GcxKIkan5Dc1vP-77q_v6qaOxGOw/view?usp=drive_link', 'TA pending update legal', 'https://chat.google.com/room/AAAAon57wu8?cls=4', 'CY2024-NV-MYS-00229', 'fuad.mawardi@ninjavan.co'),
  ('Bachok', '104601', 'Pt 454-C, Kampung Lembah Penghulu Kob, 16150 Bachok, Kelantan.', 6.07253553393817, 102.35641452524116, 1950, '2022-05-22', '2027-09-22', 'https://drive.google.com/file/d/1tijcru2V4FW3Ewd05ZUCXuPcGv823VW8/view?usp=drive_link', '2026-05-31', 1700, 3400, 'https://drive.google.com/file/d/137BtDu4ZCo2PgP2frAlsg6hX41gWJAYx/view?usp=drive_link
https://drive.google.com/file/d/18JRDN6Yubp12bv-oZwqeTSAXt4rmenZi/view?usp=drive_link', 'TA pending update legal', 'https://chat.google.com/room/AAAAJ8OmoBc?cls=7', 'CY2024-NV-MYS-00233', 'fuad.mawardi@ninjavan.co'),
  ('Larkin', '104714', '1, Jalan Riang 22/1, Taman Perindustrian Gembira, 81100 Johor Bahru, Johor Darul Ta''zim', 1.5242826667735876, 103.74562816487608, 2688, '2022-07-11', NULL, NULL, '2028-08-31', 4500, 9000, 'https://drive.google.com/file/d/1Nn6zECjVAD4h09AQd3Msc10yhppQQAhZ/view?usp=drive_link', 'BL pending station', 'https://chat.google.com/room/AAAA0fvgLEA?cls=7', 'CY2024-NV-MYS-00210', 'fuad.mawardi@ninjavan.co'),
  ('Taman Mega Jaya', '104874', '42A JALAN 6/2 PANDAN INDAH KOMERSIAL PANDAN INDAH 55100 K.L', 3.1319151, 101.7656837, 1450, '2022-08-29', '2026-12-31', 'https://drive.google.com/file/d/1x8hzNjhmZ8LEUJ6ZNRvutGcGt6ErPgZw/view?usp=drive_link', '2026-10-30', 3600, 9900, 'https://drive.google.com/file/d/1cxQxtYs6mkfHLxLEFjf_AtgJsnWZTXi3/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAfqJ9o1c?cls=7', 'CY2024-NV-MYS-00272', 'fuad.mawardi@ninjavan.co'),
  ('Batu Kawa', '104841', 'Ground Floor, Sublot 14, Lot 4787, Lorong 3, Jalan Dogan, 93250 Kuching', 1.5175407, 110.32871, 1522, '2022-08-25', '2026-09-14', 'https://drive.google.com/file/d/1O-s0emSuC0sljmit3px_XpXwtE5GS3rM/view?usp=drive_link', '2027-08-01', 2500, 5000, 'https://drive.google.com/file/d/1ZgRa04dSpKkbHK0aMH86CyRXU7gnMcp7/view?usp=drive_link', NULL, NULL, 'CY2024-NV-MYS-00241', 'fuad.mawardi@ninjavan.co'),
  ('Petra Jaya', '104842', 'Lot 14180 (sublot 47), Block 1, Metrocity, Jalan Matang, Petra Jaya, 90350, Kuching, Sarawak', 1.5662259712069269, 110.30854956406738, 1200, '2024-07-23', '2027-01-06', 'https://drive.google.com/file/d/1OJtqrnuAu7DpAOMwIv4aCNJ2M4NrVnUE/view?usp=drive_link', '2026-07-31', 2500, 7500, 'https://drive.google.com/open?id=1S4nBXZ77BkJJ9ZQusLlAGn_jHNd99EiC', NULL, 'https://chat.google.com/room/AAAA2NNFu7o?cls=1', 'CY2024-NV-MYS-00239', 'fuad.mawardi@ninjavan.co'),
  ('Sepanggar', '105812', 'Lot No. P-106-0, DBKK No. P-0-5, Ground Floor, Block P, Alamesra Plaza Utama, Phase 3 Off Sulaman Coastal Highway, Kuala Menggatal, 88450 Kota Kinabalu, Sabah.', 6.032157084428573, 116.1287440836733, 1500, '2024-09-17', '2025-12-31', 'https://drive.google.com/file/d/1BNo-6CsjH2mPJMnBvw49anc_c0XJQyxD/view?usp=drive_link', '2028-01-31', 3500, 10500, 'https://drive.google.com/file/d/1eGIjf8CYzbb9mulYsHCOcKs105bG8Njb/view?usp=drive_link', NULL, 'https://chat.google.com/room/AAAAkSK1z-I?cls=7', 'CY2024-NV-MYS-00245', 'fuad.mawardi@ninjavan.co'),
  ('Sentul', '105899', '20, Jalan 34/10A, Taman Perindustrian IKS, 68100 Batu Caves, KL.', 3.22095, 101.6881, 2403, '2025-03-03', NULL, 'https://drive.google.com/open?id=1YcEfLPClRaoTyVdGIys2sMytP6Ra5MO3', '2027-09-30', 5500, 16500, 'https://drive.google.com/open?id=10dp2N7aJOQFCDoPX6-01DsPAOczt_-1b', 'BL - in process', 'https://chat.google.com/room/AAAAkKot1CI?cls=1', NULL, 'fuad.mawardi@ninjavan.co'),
  ('Bangsar', '106102', '12 (Ground Floor) Lorong Ara Kiri Tiga, Lucky Garden, Bangsar, 59200 Kuala Lumpur', 3.128072658699102, 101.66886505958871, 1540, '2026-06-08', NULL, 'https://drive.google.com/open?id=1ti_zuTjEzyc-jTyXBDRDyQTVIec9Ti9t', '2028-05-30', 10000, 20000, 'https://drive.google.com/open?id=16ShQj9aVbdxjfROLWcXbWHA6JQ1T0mlT', 'BL - in process', NULL, NULL, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Rahman Putra', '106101', '39A, Jalan BRP 6/10, Bukit Rahman Putra, Seksyen U20, 47000 Shah Alam, Selangor', 3.22722658620395, 101.55851045093887, 1700, '2026-06-02', NULL, 'https://drive.google.com/open?id=1kVILQNY2NzNN5AriEy2ZZoiZubBlWeov', '2029-05-30', 3000, 6000, 'https://drive.google.com/open?id=1_I7jrvmn6GHB9RIAo4ZMYKtRZXX9djzF', NULL, NULL, NULL, 'fuad.mawardi@ninjavan.co');

-- from V60__headcount_zone_hq_seats.sql
INSERT INTO headcount_seats (station, place_type, designation, note, status, requested_by, requested_at, decided_by, decided_at) VALUES
  ('South 1', 'zone', 'rfs', 'Regional Fleet Supervisor South 1 (TBA in the sheet)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('South 2', 'zone', 'rfs', 'Regional Fleet Supervisor South 2 (TBA in the sheet)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('Zone B', 'zone', 'rfs', 'Regional Fleet Supervisor Zone B (TBA in the sheet)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('HQ', 'hq', 'fleet_admin', 'Aqilla Najwa, Admin (LM) intern (not in the app yet)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('HQ', 'hq', 'fleet_admin', 'Haris Sahir, Admin (LM) intern (not in the app yet)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('HQ', 'hq', 'fleet_admin', 'Vacant: Admin (LM) intern', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW());

-- from V69__vehicles.sql


-- from V70__asset_inventory.sql
INSERT INTO asset_inventory (station, item, uom, good, damaged, remarks, sort_no, updated_by) VALUES
  ('Pasir Gudang', 'LAPTOP', 'unit', 4, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'SUPER SCANNER', 'unit', 3, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'CAGE', 'unit', 3, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'INDUSTRIAL BASKET (GREY)', 'unit', 32, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'OFFICE TABLE', 'unit', 3, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'OFFICE CHAIR', 'unit', 2, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'INDUSTRIAL STAND FAN', 'unit', 1, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'INDUSTRIAL WALL FAN', 'unit', 2, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'DISINFECTION SPRAY', 'unit', 1, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'HAND TROLLEY', 'unit', 1, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'METAL CASH BOX', 'unit', 0, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, 'not in hub', 22, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, 'not in hub', 23, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'FIRE EXTINGUISHER', 'unit', 2, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'WEIGHING SCALE', 'unit', 1, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'STATION TELEPHONE', 'unit', 1, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'DELIVERY BAG', 'unit', 3, 0, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'CCTV', 'unit', 6, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Pasir Gudang', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'LAPTOP', 'unit', 3, NULL, '1 DAMAGE', 1, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 1, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'SUPER SCANNER', 'unit', 3, NULL, 'Cannot donwload google sheet ( 2 )', 3, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'CAGE', 'unit', 1, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'INDUSTRIAL BASKET (GREY)', 'unit', 29, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'OFFICE CHAIR', 'unit', 0, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'INDUSTRIAL STAND FAN', 'unit', 3, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'TABLE FAN', 'unit', 0, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'INDUSTRIAL FLOOR FAN', 'unit', 0, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'INDUSTRIAL WALL FAN', 'unit', 3, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'DISINFECTION SPRAY', 'unit', 0, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'BILL COUNTERS', 'unit', 0, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'METAL CASH BOX', 'unit', 0, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'GUN TEMPERATURE SCANNER', 'unit', 0, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'STAND TEMPERATURE SCANNER', 'unit', 0, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'FIRE EXTINGUISHER', 'unit', 3, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'WEIGHING SCALE', 'unit', 0, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'STATION TELEPHONE', 'unit', 0, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'WIFI', 'type', NULL, NULL, '832394659 · YES', 29, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'DELIVERY BAG', 'unit', 0, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'CCTV', 'unit', 6, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Kota Masai', 'COWAY', 'unit', 1, NULL, NULL, 34, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'LAPTOP', 'unit', 2, 1, 'keyboard probelm sometimes', 1, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 1, 2, 'wire problem', 2, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'SUPER SCANNER', 'unit', 1, 2, 'no sound,cannot scan', 3, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'CAGE', 'unit', NULL, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'INDUSTRIAL BASKET (GREY)', 'unit', 31, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'OFFICE TABLE', 'unit', 3, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'OFFICE CHAIR', 'unit', 3, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'INDUSTRIAL STAND FAN', 'unit', 1, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'INDUSTRIAL WALL FAN', 'unit', 2, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'BILL COUNTERS', 'unit', NULL, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'HAND TROLLEY', 'unit', NULL, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'METAL CASH BOX', 'unit', NULL, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'FIRE EXTINGUISHER', 'unit', 2, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'DELIVERY BAG', 'unit', 1, 0, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'CCTV', 'unit', 6, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Penawar', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'LAPTOP', 'unit', 3, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'SUPER SCANNER', 'unit', 3, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'CAGE', 'unit', 0, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'INDUSTRIAL BASKET (GREY)', 'unit', 27, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'OFFICE TABLE', 'unit', 2, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'OFFICE CHAIR', 'unit', 3, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'INDUSTRIAL STAND FAN', 'unit', 0, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'INDUSTRIAL WALL FAN', 'unit', 2, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'HAND TROLLEY', 'unit', 1, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'METAL CASH BOX', 'unit', 1, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'FIRE EXTINGUISHER', 'unit', 2, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'WEIGHING SCALE', 'unit', 1, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'STATION TELEPHONE', 'unit', 1, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'DELIVERY BAG', 'unit', 5, 0, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'CCTV', 'unit', 6, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Kota Tinggi', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'LAPTOP', 'unit', 3, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'SUPER SCANNER', 'unit', 3, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'CAGE', 'unit', 8, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'INDUSTRIAL BASKET (GREY)', 'unit', 13, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'NOTICE BOARD', 'unit', 1, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'OFFICE TABLE', 'unit', 3, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'OFFICE CHAIR', 'unit', 1, 2, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'INDUSTRIAL STAND FAN', 'unit', 0, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'INDUSTRIAL FLOOR FAN', 'unit', 2, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'HAND TROLLEY', 'unit', 0, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'METAL CASH BOX', 'unit', 1, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'FIRE EXTINGUISHER', 'unit', 2, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'WEIGHING SCALE', 'unit', 1, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'STATION TELEPHONE', 'unit', 1, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'DELIVERY BAG', 'unit', 0, 0, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'CCTV', 'unit', 7, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Ulu Tiram', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'LAPTOP', 'unit', 4, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'SUPER SCANNER', 'unit', 3, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'CAGE', 'unit', 1, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'INDUSTRIAL BASKET (GREY)', 'unit', 35, 2, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'NOTICE BOARD', 'unit', 4, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'OFFICE TABLE', 'unit', 4, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'OFFICE CHAIR', 'unit', 1, 1, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'HVI LOCKERS', 'unit', NULL, 0, 'unit', 11, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'A4 PRINTER', 'unit', 2, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'INDUSTRIAL STAND FAN', 'unit', 6, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'HAND TROLLEY', 'unit', 1, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'METAL CASH BOX', 'unit', 1, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'GUN TEMPERATURE SCANNER', 'unit', 2, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'STAND TEMPERATURE SCANNER', 'unit', 1, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'FIRE EXTINGUISHER', 'unit', 3, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'WEIGHING SCALE', 'unit', NULL, 0, 'unit', 26, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'STATION TELEPHONE', 'unit', NULL, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'WIFI', 'unit', NULL, NULL, 'MAXIS BROADBAND', 29, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'DELIVERY BAG', 'unit', 0, 1, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'CCTV', 'unit', 12, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'THERMAL PRINTER', 'unit', 2, 0, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Larkin', 'COWAY', 'unit', 2, 0, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'LAPTOP', 'unit', 2, 2, 'NO WIFI', 1, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, 1, 'WIRE PROBLEM', 2, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'SUPER SCANNER', 'unit', 2, 2, 'BATERRY PROBLEM', 3, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'CAGE', 'unit', 13, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'INDUSTRIAL BASKET (GREY)', 'unit', 33, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'PALLET JACK', 'unit', NULL, 1, 'HYDRAULIC PUMP PROBLEM', 6, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'NOTICE BOARD', 'unit', 1, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'OFFICE TABLE', 'unit', NULL, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'OFFICE CHAIR', 'unit', NULL, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'INDUSTRIAL STAND FAN', 'unit', 1, 2, 'NOT RUN ALRAEDY RESEND HQ', 13, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'BILL COUNTERS', 'unit', NULL, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'HAND TROLLEY', 'unit', NULL, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'METAL CASH BOX', 'unit', NULL, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'GUN TEMPERATURE SCANNER', 'unit', 4, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'STAND TEMPERATURE SCANNER', 'unit', 2, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'FIRE EXTINGUISHER', 'unit', 4, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'WEIGHING SCALE', 'unit', 1, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'DELIVERY BAG', 'unit', 4, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'CCTV', 'unit', 7, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Mount Austin', 'LG WATER DISPENSER', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'LAPTOP', 'unit', 2, 1, 'Charged did not function', 1, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'SUPER SCANNER', 'unit', 2, 1, 'Ghost Touch0', 3, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'CAGE', 'unit', 0, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'INDUSTRIAL BASKET (GREY)', 'unit', 11, 20, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'NOTICE BOARD', 'unit', 1, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'OFFICE TABLE', 'unit', 3, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'OFFICE CHAIR', 'unit', 0, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'INDUSTRIAL STAND FAN', 'unit', 2, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'INDUSTRIAL WALL FAN', 'unit', 2, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'BILL COUNTERS', 'unit', 0, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'HAND TROLLEY', 'unit', 0, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'METAL CASH BOX', 'unit', 0, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'FIRE EXTINGUISHER', 'unit', 0, 1, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'WEIGHING SCALE', 'unit', 0, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'STATION TELEPHONE', 'unit', 0, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'DELIVERY BAG', 'unit', 0, 0, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'CCTV', 'unit', 5, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Pontian', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'LAPTOP', 'unit', 1, 2, 'N/A', 1, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, 'N/A', 2, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'SUPER SCANNER', 'unit', 4, 3, 'CANNOT SCAN , CHARGE & TURN ON', 3, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'CAGE', 'unit', 14, NULL, 'N/A', 4, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'INDUSTRIAL BASKET (GREY)', 'unit', 25, NULL, 'N/A', 5, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'PALLET JACK', 'unit', 1, NULL, 'N/A', 6, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'WHITEBOARD', 'unit', 1, NULL, 'N/A', 7, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'NOTICE BOARD', 'unit', NULL, NULL, 'N/A', 8, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'OFFICE TABLE', 'unit', 2, NULL, 'N/A', 9, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'OFFICE CHAIR', 'unit', 2, NULL, 'N/A', 10, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'HVI LOCKERS', 'unit', 1, NULL, 'N/A', 11, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'A4 PRINTER', 'unit', 1, NULL, 'N/A', 12, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'INDUSTRIAL STAND FAN', 'unit', 1, NULL, 'N/A', 13, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'TABLE FAN', 'unit', NULL, NULL, 'N/A', 14, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, 'N/A', 15, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, 'N/A', 16, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'DISINFECTION SPRAY', 'unit', NULL, NULL, 'N/A', 17, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'BILL COUNTERS', 'unit', 1, NULL, 'N/A', 18, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'HAND TROLLEY', 'unit', 1, NULL, 'N/A', 19, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'METAL CASH BOX', 'unit', 1, NULL, 'N/A', 20, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'SAFE BOX', 'unit', 1, NULL, 'N/A', 21, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, 'N/A', 22, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, 'N/A', 23, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'SIGNBOARD', 'unit', 1, NULL, 'N/A', 24, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'FIRE EXTINGUISHER', 'unit', NULL, NULL, 'N/A', 25, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'WEIGHING SCALE', 'unit', NULL, NULL, 'N/A', 26, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'FIRST AID', 'unit', NULL, NULL, 'ITEM NOT COMPLETE', 27, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'STATION TELEPHONE', 'unit', NULL, 1, 'N/A', 28, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'DELIVERY BAG', 'unit', NULL, NULL, 'N/A', 30, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'CCTV', 'unit', 8, NULL, 'N/A', 31, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Nusajaya', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'LAPTOP', 'unit', 1, 2, 'HD NOT SUPPORT', 1, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'SUPER SCANNER', 'unit', 4, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'CAGE', 'unit', 5, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'INDUSTRIAL BASKET (GREY)', 'unit', 24, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'PALLET JACK', 'unit', NULL, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'OFFICE TABLE', 'unit', 4, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'OFFICE CHAIR', 'unit', 6, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'INDUSTRIAL STAND FAN', 'unit', NULL, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'INDUSTRIAL FLOOR FAN', 'unit', 2, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'INDUSTRIAL WALL FAN', 'unit', 1, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'BILL COUNTERS', 'unit', NULL, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'METAL CASH BOX', 'unit', NULL, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'SIGNBOARD', 'unit', NULL, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'FIRE EXTINGUISHER', 'unit', 1, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'STATION TELEPHONE', 'unit', NULL, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'DELIVERY BAG', 'unit', NULL, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'CCTV', 'unit', 4, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Kempas', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'LAPTOP', 'unit', 3, NULL, 'charging and usb port problem', 1, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, '-', 2, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'SUPER SCANNER', 'unit', 3, NULL, '-', 3, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'CAGE', 'unit', 37, NULL, '-', 4, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'INDUSTRIAL BASKET (GREY)', 'unit', NULL, NULL, '-', 5, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'PALLET JACK', 'unit', 1, 1, 'leakage', 6, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'WHITEBOARD', 'unit', 1, NULL, '-', 7, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'NOTICE BOARD', 'unit', 1, NULL, '-', 8, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'OFFICE TABLE', 'unit', 3, 1, '-', 9, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'OFFICE CHAIR', 'unit', 1, NULL, '-', 10, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'HVI LOCKERS', 'unit', 1, NULL, '-', 11, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'A4 PRINTER', 'unit', 1, NULL, '-', 12, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'INDUSTRIAL STAND FAN', 'unit', 2, NULL, '-', 13, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'TABLE FAN', 'unit', NULL, NULL, '-', 14, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, '-', 15, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'INDUSTRIAL WALL FAN', 'unit', 1, NULL, '-', 16, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'DISINFECTION SPRAY', 'unit', 1, 1, 'cannot be use', 17, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'BILL COUNTERS', 'unit', 1, NULL, '-', 18, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'HAND TROLLEY', 'unit', 1, NULL, '-', 19, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'METAL CASH BOX', 'unit', 1, NULL, '-', 20, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'SAFE BOX', 'unit', 1, NULL, '-', 21, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, '-', 22, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, '-', 23, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'SIGNBOARD', 'unit', 1, NULL, '-', 24, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'FIRE EXTINGUISHER', 'unit', 3, NULL, '-', 25, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'WEIGHING SCALE', 'unit', NULL, NULL, '-', 26, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'FIRST AID', 'unit', 1, NULL, '-', 27, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'STATION TELEPHONE', 'unit', NULL, NULL, '-', 28, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'DELIVERY BAG', 'unit', 2, 1, 'broken', 30, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'CCTV', 'unit', 6, NULL, '-', 31, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Gelang Patah', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'LAPTOP', 'unit', 3, NULL, '-', 1, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, '-', 2, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'SUPER SCANNER', 'unit', 4, NULL, '-', 3, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'CAGE', 'unit', 1, NULL, '-', 4, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'INDUSTRIAL BASKET (GREY)', 'unit', 23, NULL, '-', 5, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'PALLET JACK', 'unit', 1, NULL, '-', 6, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'WHITEBOARD', 'unit', 1, NULL, '-', 7, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'NOTICE BOARD', 'unit', 2, NULL, '-', 8, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'OFFICE TABLE', 'unit', 3, NULL, '-', 9, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'OFFICE CHAIR', 'unit', NULL, NULL, '-', 10, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'HVI LOCKERS', 'unit', 1, NULL, '-', 11, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'A4 PRINTER', 'unit', 1, NULL, '-', 12, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'INDUSTRIAL STAND FAN', 'unit', 4, NULL, '-', 13, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'TABLE FAN', 'unit', NULL, NULL, '-', 14, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, '-', 15, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, '-', 16, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'DISINFECTION SPRAY', 'unit', NULL, NULL, '-', 17, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'BILL COUNTERS', 'unit', 1, NULL, '-', 18, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'HAND TROLLEY', 'unit', 2, NULL, '-', 19, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'METAL CASH BOX', 'unit', NULL, NULL, '-', 20, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'SAFE BOX', 'unit', 1, NULL, '-', 21, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, '-', 22, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, '-', 23, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'SIGNBOARD', 'unit', 1, NULL, '-', 24, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'FIRE EXTINGUISHER', 'unit', 2, NULL, '-', 25, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'WEIGHING SCALE', 'unit', 1, NULL, '-', 26, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'FIRST AID', 'unit', 1, NULL, '-', 27, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'STATION TELEPHONE', 'unit', NULL, NULL, '-', 28, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'WIFI', 'type', NULL, NULL, '- · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'DELIVERY BAG', 'unit', 2, NULL, '-', 30, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'CCTV', 'unit', 5, NULL, '-', 31, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Kulai', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'LAPTOP', 'unit', 2, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'SUPER SCANNER', 'unit', 4, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'CAGE', 'unit', 6, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'INDUSTRIAL BASKET (GREY)', 'unit', 21, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'OFFICE CHAIR', 'unit', 1, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'INDUSTRIAL STAND FAN', 'unit', 0, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'TABLE FAN', 'unit', 0, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'INDUSTRIAL FLOOR FAN', 'unit', 2, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'INDUSTRIAL WALL FAN', 'unit', 0, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'DISINFECTION SPRAY', 'unit', 0, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'BILL COUNTERS', 'unit', 0, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'METAL CASH BOX', 'unit', 0, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'GUN TEMPERATURE SCANNER', 'unit', 0, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'STAND TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'FIRE EXTINGUISHER', 'unit', 4, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'WEIGHING SCALE', 'unit', 1, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'DELIVERY BAG', 'unit', 1, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'CCTV', 'unit', 7, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Port Dickson', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'LAPTOP', 'unit', 3, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'SUPER SCANNER', 'unit', 4, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'CAGE', 'unit', 4, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'INDUSTRIAL BASKET (GREY)', 'unit', 14, 2, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'OFFICE TABLE', 'unit', 4, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'OFFICE CHAIR', 'unit', 5, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'INDUSTRIAL STAND FAN', 'unit', 0, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'TABLE FAN', 'unit', 1, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'HAND TROLLEY', 'unit', 2, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'METAL CASH BOX', 'unit', 0, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'FIRE EXTINGUISHER', 'unit', 2, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'WEIGHING SCALE', 'unit', 1, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'STATION TELEPHONE', 'unit', 0, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'DELIVERY BAG', 'unit', 7, 0, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'CCTV', 'unit', 6, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'RAMP', 'unit', 0, 1, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Alor Gajah', 'COWAY', 'unit', 1, NULL, NULL, 34, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'LAPTOP', 'unit', 3, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'SUPER SCANNER', 'unit', 3, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'CAGE', 'unit', 6, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'INDUSTRIAL BASKET (GREY)', 'unit', 24, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'NOTICE BOARD', 'unit', 1, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'OFFICE TABLE', 'unit', 3, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'OFFICE CHAIR', 'unit', 2, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'INDUSTRIAL STAND FAN', 'unit', 4, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'HAND TROLLEY', 'unit', 1, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'METAL CASH BOX', 'unit', 1, 1, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'SAFE BOX', 'unit', 1, 1, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'FIRE EXTINGUISHER', 'unit', 2, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'WEIGHING SCALE', 'unit', 1, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'STATION TELEPHONE', 'unit', 0, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'DELIVERY BAG', 'unit', 2, 1, 'Beg Rosak', 30, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'CCTV', 'unit', 8, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Seremban', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'LAPTOP', 'unit', 4, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'SUPER SCANNER', 'unit', 4, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'CAGE', 'unit', NULL, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'INDUSTRIAL BASKET (GREY)', 'unit', 31, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'OFFICE TABLE', 'unit', 4, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'OFFICE CHAIR', 'unit', 2, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'INDUSTRIAL STAND FAN', 'unit', 3, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'BILL COUNTERS', 'unit', NULL, 1, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'HAND TROLLEY', 'unit', NULL, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'FIRE EXTINGUISHER', 'unit', 4, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'STATION TELEPHONE', 'unit', NULL, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'DELIVERY BAG', 'unit', NULL, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'CCTV', 'unit', 9, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Bahau', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'LAPTOP', 'unit', 3, 0, '0', 1, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 5, 0, '0', 2, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'SUPER SCANNER', 'unit', 5, 0, '0', 3, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'CAGE', 'unit', 6, 0, '0', 4, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'INDUSTRIAL BASKET (GREY)', 'unit', 33, 0, '0', 5, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'PALLET JACK', 'unit', 1, 0, '0', 6, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'WHITEBOARD', 'unit', 1, 0, '0', 7, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'NOTICE BOARD', 'unit', 2, 0, '0', 8, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'OFFICE TABLE', 'unit', 3, 0, '0', 9, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'OFFICE CHAIR', 'unit', 2, 0, '0', 10, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'HVI LOCKERS', 'unit', 1, 0, '0', 11, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'A4 PRINTER', 'unit', 2, 0, '0', 12, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'INDUSTRIAL STAND FAN', 'unit', 4, 0, '0', 13, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'TABLE FAN', 'unit', 0, 0, '0', 14, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, '0', 15, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, '0', 16, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'DISINFECTION SPRAY', 'unit', 1, 0, '0', 17, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'BILL COUNTERS', 'unit', 1, 0, '0', 18, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'HAND TROLLEY', 'unit', 1, 0, '0', 19, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'METAL CASH BOX', 'unit', 1, 0, '0', 20, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'SAFE BOX', 'unit', 1, 0, '0', 21, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'GUN TEMPERATURE SCANNER', 'unit', 1, 0, '0', 22, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'STAND TEMPERATURE SCANNER', 'unit', 1, 0, '0', 23, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'SIGNBOARD', 'unit', 1, 0, '0', 24, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'FIRE EXTINGUISHER', 'unit', 2, 0, '0', 25, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'WEIGHING SCALE', 'unit', 1, 0, '0', 26, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'FIRST AID', 'unit', 1, 0, '0', 27, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'STATION TELEPHONE', 'unit', 1, 0, '0', 28, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'DELIVERY BAG', 'unit', 8, 3, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'CCTV', 'unit', 6, 0, '0', 31, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Jasin', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'LAPTOP', 'unit', 3, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'SUPER SCANNER', 'unit', 3, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'CAGE', 'unit', 6, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'INDUSTRIAL BASKET (GREY)', 'unit', 22, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'PALLET JACK', 'unit', 1, 0, 'Y24031025-1/239', 6, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'NOTICE BOARD', 'unit', 3, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'OFFICE TABLE', 'unit', 4, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'OFFICE CHAIR', 'unit', 0, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'HVI LOCKERS', 'unit', 2, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'A4 PRINTER', 'unit', 1, 0, 'buy use petty cash', 12, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'INDUSTRIAL STAND FAN', 'unit', 3, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'HAND TROLLEY', 'unit', 2, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'METAL CASH BOX', 'unit', 0, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'FIRE EXTINGUISHER', 'unit', 1, 0, 'exp 07/10/2026', 25, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'WEIGHING SCALE', 'unit', 1, 0, 'already expired', 26, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'STATION TELEPHONE', 'unit', 0, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'WIFI', 'type', NULL, NULL, '1036578027(accout number) · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'DELIVERY BAG', 'unit', 3, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'CCTV', 'unit', 6, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'THERMAL PRINTER', 'unit', 1, 0, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Senawang', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 1, 2, 'WAYAR ROSAK', 2, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'SUPER SCANNER', 'unit', 5, 0, 'CHARGER POD ROSAK', 3, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'CAGE', 'unit', 6, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'INDUSTRIAL BASKET (GREY)', 'unit', 16, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'OFFICE TABLE', 'unit', 3, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'OFFICE CHAIR', 'unit', 2, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'INDUSTRIAL STAND FAN', 'unit', 1, 1, 'ROSAK', 13, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'HAND TROLLEY', 'unit', 2, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'METAL CASH BOX', 'unit', 1, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'FIRE EXTINGUISHER', 'unit', 2, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'WEIGHING SCALE', 'unit', 1, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'STATION TELEPHONE', 'unit', 1, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'DELIVERY BAG', 'unit', 1, 2, '2 BEG DAH ROSAK', 30, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'CCTV', 'unit', 9, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Nilai', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'LAPTOP', 'unit', 4, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'SUPER SCANNER', 'unit', 4, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'CAGE', 'unit', 11, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'INDUSTRIAL BASKET (GREY)', 'unit', 26, 0, '13 bakul dari pia', 5, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'OFFICE TABLE', 'unit', 5, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'OFFICE CHAIR', 'unit', 2, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'INDUSTRIAL STAND FAN', 'unit', 4, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'HAND TROLLEY', 'unit', 1, 0, 'buy using petty cash', 19, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'METAL CASH BOX', 'unit', 0, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'FIRE EXTINGUISHER', 'unit', 3, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'WEIGHING SCALE', 'unit', 1, 0, 'LH TO MM 8/5/2026 FOR RENEWAL LICIENCE', 26, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'STATION TELEPHONE', 'unit', 1, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'DELIVERY BAG', 'unit', 5, 3, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'CCTV', 'unit', 5, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Melaka Tengah', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'LAPTOP', 'unit', 3, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'SUPER SCANNER', 'unit', 4, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'CAGE', 'unit', 5, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'INDUSTRIAL BASKET (GREY)', 'unit', 36, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'OFFICE TABLE', 'unit', 3, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'OFFICE CHAIR', 'unit', 3, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'A4 PRINTER', 'unit', 2, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'INDUSTRIAL STAND FAN', 'unit', 3, 1, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'INDUSTRIAL WALL FAN', 'unit', 0, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'HAND TROLLEY', 'unit', 2, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'METAL CASH BOX', 'unit', 0, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'SIGNBOARD', 'unit', 0, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'FIRE EXTINGUISHER', 'unit', 4, 0, 'Tagging: UF112020Y913740 PW012025Y342125 UF112020Y913291 UF112020Y913623 Exp: 9 April 2027', 25, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'WEIGHING SCALE', 'unit', 0, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'STATION TELEPHONE', 'unit', 0, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'DELIVERY BAG', 'unit', 0, 2, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'CCTV', 'unit', 4, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Tanjung Minyak', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'LAPTOP', 'unit', 3, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'SUPER SCANNER', 'unit', 2, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'CAGE', 'unit', 0, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'INDUSTRIAL BASKET (GREY)', 'unit', 20, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'OFFICE TABLE', 'unit', 3, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'OFFICE CHAIR', 'unit', 2, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'INDUSTRIAL STAND FAN', 'unit', 3, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'TABLE FAN', 'unit', 0, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'INDUSTRIAL FLOOR FAN', 'unit', 0, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'INDUSTRIAL WALL FAN', 'unit', 0, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'DISINFECTION SPRAY', 'unit', 0, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'HAND TROLLEY', 'unit', 1, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'METAL CASH BOX', 'unit', 1, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'SAFE BOX', 'unit', 1, 1, 'lock elektronik dh rosak', 21, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'GUN TEMPERATURE SCANNER', 'unit', 0, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'STAND TEMPERATURE SCANNER', 'unit', 0, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'FIRE EXTINGUISHER', 'unit', 2, 0, 'Tagging: SR032022Y048494 SR032022Y048518 Exp: 11 FEBRUARY 2027', 25, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'WEIGHING SCALE', 'unit', 0, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'STATION TELEPHONE', 'unit', 0, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'DELIVERY BAG', 'unit', 0, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'CCTV', 'unit', 7, 0, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Gemas', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'SUPER SCANNER', 'unit', 4, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'CAGE', 'unit', 11, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'INDUSTRIAL BASKET (GREY)', 'unit', 23, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'HVI LOCKERS', 'unit', 2, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'INDUSTRIAL STAND FAN', 'unit', 3, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'HAND TROLLEY', 'unit', 3, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'FIRE EXTINGUISHER', 'unit', 3, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'DELIVERY BAG', 'unit', 11, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'CCTV', 'unit', 5, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Alor Setar', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'SUPER SCANNER', 'unit', 2, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'CAGE', 'unit', 14, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'INDUSTRIAL BASKET (GREY)', 'unit', 39, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'PALLET JACK', 'unit', 1, NULL, 'SERIAL NUMBER : V0855-0024', 6, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'HVI LOCKERS', 'unit', 2, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'INDUSTRIAL STAND FAN', 'unit', 2, 1, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'DISINFECTION SPRAY', 'unit', 1, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'HAND TROLLEY', 'unit', NULL, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'GUN TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'STAND TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'DELIVERY BAG', 'unit', 5, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'CCTV', 'unit', 4, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Sungai Petani', 'LG WATER DISPENSER', 'unit', 1, NULL, 'share with WH', 33, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'LAPTOP', 'unit', 2, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'SUPER SCANNER', 'unit', 3, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'CAGE', 'unit', NULL, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'INDUSTRIAL BASKET (GREY)', 'unit', 18, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'NOTICE BOARD', 'unit', 1, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'OFFICE TABLE', 'unit', 2, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'HVI LOCKERS', 'unit', NULL, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'INDUSTRIAL STAND FAN', 'unit', NULL, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'INDUSTRIAL FLOOR FAN', 'unit', 1, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'INDUSTRIAL WALL FAN', 'unit', 3, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'HAND TROLLEY', 'unit', NULL, 1, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'METAL CASH BOX', 'unit', NULL, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'FIRE EXTINGUISHER', 'unit', 1, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'WEIGHING SCALE', 'unit', 1, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'STATION TELEPHONE', 'unit', NULL, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'DELIVERY BAG', 'unit', NULL, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'CCTV', 'unit', 5, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Langkawi', 'LG WATER DISPENSER', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 4, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'SUPER SCANNER', 'unit', 5, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'CAGE', 'unit', 3, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'INDUSTRIAL BASKET (GREY)', 'unit', 28, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'INDUSTRIAL STAND FAN', 'unit', 0, NULL, 'VIEWNOTE', 13, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'TABLE FAN', 'unit', 0, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'INDUSTRIAL FLOOR FAN', 'unit', 2, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'INDUSTRIAL WALL FAN', 'unit', 0, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'DISINFECTION SPRAY', 'unit', 1, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'HAND TROLLEY', 'unit', 0, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'GUN TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'STAND TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'DELIVERY BAG', 'unit', 17, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'CCTV', 'unit', 7, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Kulim', 'LG WATER DISPENSER', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'SUPER SCANNER', 'unit', 4, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'CAGE', 'unit', 3, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'INDUSTRIAL BASKET (GREY)', 'unit', 28, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'NOTICE BOARD', 'unit', 3, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'OFFICE TABLE', 'unit', 2, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'OFFICE CHAIR', 'unit', 4, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'INDUSTRIAL STAND FAN', 'unit', 2, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'INDUSTRIAL WALL FAN', 'unit', 2, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'DISINFECTION SPRAY', 'unit', 1, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'METAL CASH BOX', 'unit', NULL, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'FIRE EXTINGUISHER', 'unit', 1, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'DELIVERY BAG', 'unit', NULL, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'CCTV', 'unit', 4, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Kangar', 'LG WATER DISPENSER', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'SUPER SCANNER', 'unit', 4, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'CAGE', 'unit', 4, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'INDUSTRIAL BASKET (GREY)', 'unit', 22, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'OFFICE CHAIR', 'unit', 5, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'INDUSTRIAL STAND FAN', 'unit', 0, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'TABLE FAN', 'unit', 0, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'INDUSTRIAL FLOOR FAN', 'unit', 0, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'INDUSTRIAL WALL FAN', 'unit', 1, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'DISINFECTION SPRAY', 'unit', 1, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'METAL CASH BOX', 'unit', 0, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'GUN TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'STAND TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'FIRE EXTINGUISHER', 'unit', 2, NULL, 'Tagging: UF052026Y937293, UF052026Y936657 Exp: 24 July 2027', 25, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'WEIGHING SCALE', 'unit', 0, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'DELIVERY BAG', 'unit', 10, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'CCTV', 'unit', 4, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'LUMBER SUPPORT', 'unit', 5, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'SORTING TABLE', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 34, 'fuad.mawardi@ninjavan.co'),
  ('Jitra', 'LG WATER DISPENSER', 'unit', 1, NULL, NULL, 35, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'LAPTOP', 'unit', 3, 0, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, 0, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'SUPER SCANNER', 'unit', 3, 0, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'CAGE', 'unit', 0, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'INDUSTRIAL BASKET (GREY)', 'unit', 12, 0, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'OFFICE TABLE', 'unit', 2, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'OFFICE CHAIR', 'unit', 2, 0, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'INDUSTRIAL STAND FAN', 'unit', 3, 0, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'INDUSTRIAL WALL FAN', 'unit', 2, 0, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'DISINFECTION SPRAY', 'unit', 1, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'HAND TROLLEY', 'unit', 3, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'METAL CASH BOX', 'unit', 0, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'GUN TEMPERATURE SCANNER', 'unit', 1, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'STAND TEMPERATURE SCANNER', 'unit', 1, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'FIRE EXTINGUISHER', 'unit', 2, 0, 'exp : 22/5/2026', 25, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'WEIGHING SCALE', 'unit', 0, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'STATION TELEPHONE', 'unit', 1, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'WIFI', 'type', NULL, NULL, '8960011808570039420 · MAXIS BROADBAND', 29, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'DELIVERY BAG', 'unit', 0, 0, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'CCTV', 'unit', 6, 0, 'NEED ANOTHER 3', 31, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Baling', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'LAPTOP', 'unit', 2, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'SUPER SCANNER', 'unit', 2, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'CAGE', 'unit', 0, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'INDUSTRIAL BASKET (GREY)', 'unit', 33, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'NOTICE BOARD', 'unit', 1, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'OFFICE CHAIR', 'unit', 1, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'INDUSTRIAL STAND FAN', 'unit', 2, 2, 'already landhaul to mm', 13, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'TABLE FAN', 'unit', 0, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'INDUSTRIAL FLOOR FAN', 'unit', 0, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'INDUSTRIAL WALL FAN', 'unit', 2, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'DISINFECTION SPRAY', 'unit', 0, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'GUN TEMPERATURE SCANNER', 'unit', 0, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'STAND TEMPERATURE SCANNER', 'unit', 0, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'WEIGHING SCALE', 'unit', 1, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'DELIVERY BAG', 'unit', 0, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'CCTV', 'unit', 4, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Pokok Sena', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'SUPER SCANNER', 'unit', 3, 1, 'CAN''T CHARGE', 3, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'CAGE', 'unit', 0, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'INDUSTRIAL BASKET (GREY)', 'unit', 33, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'OFFICE TABLE', 'unit', 4, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'OFFICE CHAIR', 'unit', 1, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'INDUSTRIAL STAND FAN', 'unit', 0, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'TABLE FAN', 'unit', 0, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'INDUSTRIAL FLOOR FAN', 'unit', 0, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'INDUSTRIAL WALL FAN', 'unit', 0, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'DISINFECTION SPRAY', 'unit', 0, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'HAND TROLLEY', 'unit', 2, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'GUN TEMPERATURE SCANNER', 'unit', 0, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'STAND TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'WEIGHING SCALE', 'unit', 0, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'STATION TELEPHONE', 'unit', 0, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'DELIVERY BAG', 'unit', 7, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'CCTV', 'unit', 6, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Gurun', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'LAPTOP', 'unit', 2, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'SUPER SCANNER', 'unit', 2, 2, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'CAGE', 'unit', NULL, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'INDUSTRIAL BASKET (GREY)', 'unit', 29, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'NOTICE BOARD', 'unit', 1, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'INDUSTRIAL STAND FAN', 'unit', 2, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'INDUSTRIAL WALL FAN', 'unit', 2, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'HAND TROLLEY', 'unit', NULL, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'METAL CASH BOX', 'unit', NULL, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'FIRE EXTINGUISHER', 'unit', 1, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'STATION TELEPHONE', 'unit', NULL, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'DELIVERY BAG', 'unit', 3, 3, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'CCTV', 'unit', 4, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Pendang', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'LAPTOP', 'unit', 2, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'SUPER SCANNER', 'unit', 2, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'CAGE', 'unit', 3, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'INDUSTRIAL BASKET (GREY)', 'unit', 28, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'OFFICE TABLE', 'unit', 6, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'OFFICE CHAIR', 'unit', 12, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'INDUSTRIAL STAND FAN', 'unit', 2, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'INDUSTRIAL WALL FAN', 'unit', 4, 1, 'Motor kipass rosak', 16, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'METAL CASH BOX', 'unit', NULL, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'GUN TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'STAND TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'WIFI', 'type', NULL, NULL, '1035157633 · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'DELIVERY BAG', 'unit', 2, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'CCTV', 'unit', 5, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Paka', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'LAPTOP', 'unit', 2, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, 1, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'SUPER SCANNER', 'unit', 3, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'CAGE', 'unit', 2, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'INDUSTRIAL BASKET (GREY)', 'unit', 27, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'INDUSTRIAL STAND FAN', 'unit', 2, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'INDUSTRIAL WALL FAN', 'unit', NULL, 1, 'MOTOR KIPAS ROSAK', 16, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'BILL COUNTERS', 'unit', NULL, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'HAND TROLLEY', 'unit', NULL, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'SAFE BOX', 'unit', NULL, 1, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'FIRE EXTINGUISHER', 'unit', NULL, 2, 'EXPIRED', 25, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'WIFI', 'type', NULL, NULL, '1049675505 · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'DELIVERY BAG', 'unit', NULL, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'CCTV', 'unit', 6, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Ajil', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'LAPTOP', 'unit', 4, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, 1, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'SUPER SCANNER', 'unit', 3, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'CAGE', 'unit', 12, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'INDUSTRIAL BASKET (GREY)', 'unit', 22, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'OFFICE TABLE', 'unit', 2, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'OFFICE CHAIR', 'unit', 4, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'INDUSTRIAL STAND FAN', 'unit', 2, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'TABLE FAN', 'unit', 3, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'INDUSTRIAL FLOOR FAN', 'unit', 0, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'INDUSTRIAL WALL FAN', 'unit', 1, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'HAND TROLLEY', 'unit', NULL, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'METAL CASH BOX', 'unit', NULL, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'GUN TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'STAND TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'FIRE EXTINGUISHER', 'unit', 5, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'STATION TELEPHONE', 'unit', NULL, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'WIFI', 'type', NULL, NULL, 'UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'DELIVERY BAG', 'unit', NULL, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'CCTV', 'unit', 7, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Gong Badak', 'COWAY', 'unit', NULL, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'SUPER SCANNER', 'unit', 4, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'CAGE', 'unit', NULL, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'INDUSTRIAL BASKET (GREY)', 'unit', 19, 5, 'BAD COND', 5, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'PALLET JACK', 'unit', 1, 1, 'LEAKING OIL SEAL', 6, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'INDUSTRIAL STAND FAN', 'unit', NULL, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'INDUSTRIAL WALL FAN', 'unit', 1, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'STATION TELEPHONE', 'unit', NULL, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'WIFI', 'type', NULL, NULL, '1055062531 · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'DELIVERY BAG', 'unit', 2, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'CCTV', 'unit', 6, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Chukai', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'LAPTOP', 'unit', 2, 1, 'ISD-134945', 1, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'SUPER SCANNER', 'unit', 3, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'CAGE', 'unit', 6, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'INDUSTRIAL BASKET (GREY)', 'unit', 29, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'NOTICE BOARD', 'unit', 1, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'OFFICE TABLE', 'unit', 3, 2, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'INDUSTRIAL STAND FAN', 'unit', 1, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'INDUSTRIAL FLOOR FAN', 'unit', 4, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'DISINFECTION SPRAY', 'unit', 1, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'HAND TROLLEY', 'unit', NULL, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'SAFE BOX', 'unit', NULL, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'WIFI', 'type', NULL, NULL, '1057224667 · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'DELIVERY BAG', 'unit', 4, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'CCTV', 'unit', 4, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Jerteh', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'LAPTOP', 'unit', 2, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'SUPER SCANNER', 'unit', 3, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'CAGE', 'unit', NULL, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'INDUSTRIAL BASKET (GREY)', 'unit', 27, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'NOTICE BOARD', 'unit', 1, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'INDUSTRIAL STAND FAN', 'unit', 3, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'STATION TELEPHONE', 'unit', NULL, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'WIFI', 'type', NULL, NULL, '1062697949 · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'DELIVERY BAG', 'unit', 2, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'CCTV', 'unit', 6, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Dungun', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'LAPTOP', 'unit', 2, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'SUPER SCANNER', 'unit', 3, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'CAGE', 'unit', 2, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'INDUSTRIAL BASKET (GREY)', 'unit', 30, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'OFFICE CHAIR', 'unit', 1, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'INDUSTRIAL STAND FAN', 'unit', 3, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'STAND TEMPERATURE SCANNER', 'unit', 1, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'FIRE EXTINGUISHER', 'unit', 1, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'WEIGHING SCALE', 'unit', 1, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'WIFI', 'type', NULL, NULL, '1063457194 · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'DELIVERY BAG', 'unit', 1, 2, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'CCTV', 'unit', 4, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Setiu', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'LAPTOP', 'unit', 1, 1, '1 hinge screen broken', 1, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 2, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'SUPER SCANNER', 'unit', 2, NULL, NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'CAGE', 'unit', NULL, NULL, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'INDUSTRIAL BASKET (GREY)', 'unit', 30, NULL, NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'PALLET JACK', 'unit', 1, NULL, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'WHITEBOARD', 'unit', 1, NULL, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'NOTICE BOARD', 'unit', 2, NULL, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'OFFICE TABLE', 'unit', 3, NULL, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'OFFICE CHAIR', 'unit', 3, NULL, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'HVI LOCKERS', 'unit', 1, NULL, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'A4 PRINTER', 'unit', 1, NULL, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'INDUSTRIAL STAND FAN', 'unit', 3, NULL, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'TABLE FAN', 'unit', NULL, NULL, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'INDUSTRIAL FLOOR FAN', 'unit', NULL, NULL, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'INDUSTRIAL WALL FAN', 'unit', NULL, NULL, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'DISINFECTION SPRAY', 'unit', NULL, NULL, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'BILL COUNTERS', 'unit', 1, NULL, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'HAND TROLLEY', 'unit', 1, NULL, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'METAL CASH BOX', 'unit', 1, NULL, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'SAFE BOX', 'unit', 1, NULL, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'GUN TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'STAND TEMPERATURE SCANNER', 'unit', NULL, NULL, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'SIGNBOARD', 'unit', 1, NULL, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'FIRE EXTINGUISHER', 'unit', 2, NULL, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'WEIGHING SCALE', 'unit', NULL, NULL, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'FIRST AID', 'unit', 1, NULL, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'STATION TELEPHONE', 'unit', 1, NULL, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'WIFI', 'type', NULL, NULL, '1066432509 · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'DELIVERY BAG', 'unit', 4, NULL, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'CCTV', 'unit', 6, NULL, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Marang', 'COWAY', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'LAPTOP', 'unit', 3, NULL, NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'BARCODE SCANNER / WIRE SCANNER', 'unit', 3, NULL, NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'SUPER SCANNER', 'unit', 3, 1, 'SS-21-10-0167', 3, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'CAGE', 'unit', 2, 0, NULL, 4, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'INDUSTRIAL BASKET (GREY)', 'unit', 18, 8, 'roller / pecah', 5, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'PALLET JACK', 'unit', 1, 0, NULL, 6, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'WHITEBOARD', 'unit', 1, 0, NULL, 7, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'NOTICE BOARD', 'unit', 2, 0, NULL, 8, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'OFFICE TABLE', 'unit', 4, 0, NULL, 9, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'OFFICE CHAIR', 'unit', 3, 2, NULL, 10, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'HVI LOCKERS', 'unit', 1, 0, NULL, 11, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'A4 PRINTER', 'unit', 1, 0, NULL, 12, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'INDUSTRIAL STAND FAN', 'unit', 5, 1, NULL, 13, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'TABLE FAN', 'unit', 0, 0, NULL, 14, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'INDUSTRIAL FLOOR FAN', 'unit', 0, 0, NULL, 15, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'INDUSTRIAL WALL FAN', 'unit', 0, 1, NULL, 16, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'DISINFECTION SPRAY', 'unit', 0, 0, NULL, 17, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'BILL COUNTERS', 'unit', 1, 0, NULL, 18, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'HAND TROLLEY', 'unit', 1, 0, NULL, 19, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'METAL CASH BOX', 'unit', 1, 0, NULL, 20, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'SAFE BOX', 'unit', 1, 0, NULL, 21, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'GUN TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 22, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'STAND TEMPERATURE SCANNER', 'unit', 0, 0, NULL, 23, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'SIGNBOARD', 'unit', 1, 0, NULL, 24, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'FIRE EXTINGUISHER', 'unit', 2, 0, NULL, 25, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'WEIGHING SCALE', 'unit', 0, 0, NULL, 26, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'FIRST AID', 'unit', 1, 0, NULL, 27, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'STATION TELEPHONE', 'unit', 1, 0, NULL, 28, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'WIFI', 'type', NULL, NULL, '1068490117 · UNIFI', 29, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'DELIVERY BAG', 'unit', 24, 0, NULL, 30, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'CCTV', 'unit', 6, 1, NULL, 31, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'SAFETY CONE', 'unit', 8, NULL, NULL, 32, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'THERMAL PRINTER', 'unit', 1, NULL, NULL, 33, 'fuad.mawardi@ninjavan.co'),
  ('Bukit Payong', 'COWAY', 'unit', 1, NULL, NULL, 34, 'fuad.mawardi@ninjavan.co');

-- from V72__attendance_launch_hybrid.sql
INSERT INTO hybrid_drivers (station, name, active, created_by, created_at)
  SELECT station, person_ref, 1, added_by, added_at FROM schedule_people WHERE person_type = 'hybrid';

-- from V73__org_chart_details.sql
INSERT INTO org_people (name, title, email, phone, employee_id, branch, region, sort_no, updated_by) VALUES
  ('Adrian Woon', '(HOO) Head of Operation', 'adrian.woon@ninjavan.co', '012 - 205 5230', NULL, 'hoo', NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Noras Fawilah', '(HOD) Head of Department, Fleet Last Mile', 'noras.fawilah@ninjavan.co', '013-289 5088', NULL, 'hod', NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Muhammad Amirul Izzat Bin Yazid', 'Senior Fleet Strategist', 'izzat.yazid@ninjavan.co', '012-390 0287', 'NVMY0184', 'strategist', NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Mohd Fuad Fauzi Bin Mawardi', 'Fleet Manager - Southern', 'fuad.mawardi@ninjavan.co', '012 - 226 3597', 'NVMY3593', 'region_manager', 'Southern', 4, 'fuad.mawardi@ninjavan.co'),
  ('Aqilla Najwa Binti Mohd Sazuki', 'Admin (LM) - Intern', 'aqilla.najwa@ninjavan.co', '012-7226501', NULL, 'admin_support', NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Haris Bin Sahir', 'Admin (LM) - Intern', 'haris.sahir@ninjavan.co', '012-7226370', NULL, 'admin_support', NULL, 6, 'fuad.mawardi@ninjavan.co');
DELETE FROM headcount_seats WHERE designation = 'fleet_admin' AND note LIKE '%intern (not in the app yet)%';
UPDATE users SET phone = COALESCE(phone, '012-2260805 / 017-637 3661'), employee_id = COALESCE(employee_id, 'NVMY0222'), based_station = COALESCE(based_station, 'Raub') WHERE LOWER(email) = 'syafiq.dawot@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2261305 / 011-3992 6690'), employee_id = COALESCE(employee_id, 'NVMY2147'), based_station = COALESCE(based_station, 'Dungun') WHERE LOWER(email) = 'basyir.jazalan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2265641 / 012-9654392'), employee_id = COALESCE(employee_id, 'NVMY0758'), based_station = COALESCE(based_station, 'Machang') WHERE LOWER(email) = 'shamil.aiman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2265571 / 016-4514040'), employee_id = COALESCE(employee_id, 'NVMY0927'), based_station = COALESCE(based_station, 'Kulim') WHERE LOWER(email) = 'faizal.ghazali@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2265579 / 017-5259661'), employee_id = COALESCE(employee_id, 'NVMY2344H'), based_station = COALESCE(based_station, 'Georgetown') WHERE LOWER(email) = 'hisyam.sukery@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-5668257 / 017-5510520'), employee_id = COALESCE(employee_id, 'NVMY0351'), based_station = COALESCE(based_station, 'Batu Gajah') WHERE LOWER(email) = 'amirullah.jamaluddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-9907840'), employee_id = COALESCE(employee_id, 'NVMY6904'), based_station = COALESCE(based_station, 'Ulu Tiram') WHERE LOWER(email) = 'alif.afif@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-5338735 / 017-5721501'), employee_id = COALESCE(employee_id, '10029722'), based_station = COALESCE(based_station, 'Kempas') WHERE LOWER(email) = 'faridzul.azman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2265724 / 012-9464066'), employee_id = COALESCE(employee_id, 'NVMY0470'), based_station = COALESCE(based_station, 'Muar') WHERE LOWER(email) = 'akhba.sulaiman@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2261796 / 016-2038324'), employee_id = COALESCE(employee_id, 'NVMY0223'), based_station = COALESCE(based_station, 'Bahau') WHERE LOWER(email) = 'syafiq.rusly@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2264163 / 011-62910517'), employee_id = COALESCE(employee_id, 'NVMY5315'), based_station = COALESCE(based_station, 'Kuala Selangor') WHERE LOWER(email) = 'alrashid.nazir@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2263179'), employee_id = COALESCE(employee_id, 'NVMY6898'), based_station = COALESCE(based_station, 'Kepong') WHERE LOWER(email) = 'rosdi.sabudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2263162'), employee_id = COALESCE(employee_id, 'NVMY0352'), based_station = COALESCE(based_station, 'Segambut') WHERE LOWER(email) = 'aniq.rodzi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2533918'), employee_id = COALESCE(employee_id, 'NVMY0321'), based_station = COALESCE(based_station, 'Shamelin') WHERE LOWER(email) = 'zikri.akbar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2533727 / 012-2702268'), employee_id = COALESCE(employee_id, 'NVMY0083'), based_station = COALESCE(based_station, 'Taman Mega Jaya') WHERE LOWER(email) = 'khairul.nizam@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2264165 / 013-3971948'), employee_id = COALESCE(employee_id, 'NVMY4768'), based_station = COALESCE(based_station, 'Serdang') WHERE LOWER(email) = 'syukri.yuswan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2263507 / 017-6057235'), employee_id = COALESCE(employee_id, 'NVMY7795'), based_station = COALESCE(based_station, 'Taman Desa') WHERE LOWER(email) = 'nazirul.razak@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '014-7887074'), employee_id = COALESCE(employee_id, 'NVMY9978'), based_station = COALESCE(based_station, 'Setia Alam') WHERE LOWER(email) = 'azeem.zahid@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-2533073 / 010-4556636'), employee_id = COALESCE(employee_id, 'NVMY0216'), based_station = COALESCE(based_station, 'Klang') WHERE LOWER(email) = 'rafizan.rashid@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-5339184 / 010-2049613'), employee_id = COALESCE(employee_id, 'NVMY3443'), based_station = COALESCE(based_station, 'Papar') WHERE LOWER(email) = 'danial.mustapha@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-3454078'), employee_id = COALESCE(employee_id, 'NVMY5313'), based_station = COALESCE(based_station, 'Petra Jaya') WHERE LOWER(email) = 'shazueen.bolhassan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-35332893'), employee_id = COALESCE(employee_id, 'NVMY5683'), based_station = COALESCE(based_station, 'Raub') WHERE LOWER(email) = 'khaidir.fathi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-9824130'), employee_id = COALESCE(employee_id, 'NVMY2145'), based_station = COALESCE(based_station, 'Gong Badak') WHERE LOWER(email) = 'zahid.almi@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-2022827'), employee_id = COALESCE(employee_id, 'NVMY2937'), based_station = COALESCE(based_station, 'Kuala Krai') WHERE LOWER(email) = 'aiman.ghani@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-9110819'), employee_id = COALESCE(employee_id, 'NVMY1561'), based_station = COALESCE(based_station, 'Alor Setar') WHERE LOWER(email) = 'nazri.noh@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '013-4758200'), employee_id = COALESCE(employee_id, 'NVMY2458'), based_station = COALESCE(based_station, 'Farlim') WHERE LOWER(email) = 'irman.ismail@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '016-6200542'), employee_id = COALESCE(employee_id, 'NVMY0766'), based_station = COALESCE(based_station, 'Taiping') WHERE LOWER(email) = 'amzar.azmee@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-6246553'), employee_id = COALESCE(employee_id, 'NVMY1278'), based_station = COALESCE(based_station, 'Jasin') WHERE LOWER(email) = 'shamirul.eizlan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-2573365'), employee_id = COALESCE(employee_id, 'NVMY0433'), based_station = COALESCE(based_station, 'Kepong') WHERE LOWER(email) = 'azman.musanip@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '018-6696207'), employee_id = COALESCE(employee_id, 'NVMY4188'), based_station = COALESCE(based_station, 'Batu Caves') WHERE LOWER(email) = 'fareez.zainuddin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-6798002'), employee_id = COALESCE(employee_id, 'NVMY4789'), based_station = COALESCE(based_station, 'Wangsa Maju') WHERE LOWER(email) = 'nazrul.nizam@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-12891101'), employee_id = COALESCE(employee_id, 'NVMY1091'), based_station = COALESCE(based_station, 'Eco Cheras') WHERE LOWER(email) = 'ashraf.akharan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '019-7772497'), employee_id = COALESCE(employee_id, 'NVMY5322'), based_station = COALESCE(based_station, 'Salak Tinggi') WHERE LOWER(email) = 'syazwan.saharudin@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-11470556'), employee_id = COALESCE(employee_id, 'NVMY10294'), based_station = COALESCE(based_station, NULL) WHERE LOWER(email) = 'faizal.syarip@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-3409160'), employee_id = COALESCE(employee_id, NULL), based_station = COALESCE(based_station, 'Kota Kemuning') WHERE LOWER(email) = 'aniq.halim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '010-903 2206'), employee_id = COALESCE(employee_id, 'NVMY0014'), based_station = COALESCE(based_station, 'Botanik') WHERE LOWER(email) = 'ahmad.mustaffa@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '011-17701415'), employee_id = COALESCE(employee_id, 'NVMY6630'), based_station = COALESCE(based_station, 'Sandakan') WHERE LOWER(email) = 'arfaizul.arapah@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '017-8090093'), employee_id = COALESCE(employee_id, 'NVMY7792'), based_station = COALESCE(based_station, 'Batu Kawa') WHERE LOWER(email) = 'aiman.kanil@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012 - 226 5723'), employee_id = COALESCE(employee_id, 'NVMY0240'), job_title = COALESCE(job_title, 'Manager - Klang Valley & SameDay') WHERE LOWER(email) = 'nazriq.roslan@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012 - 226 0165'), employee_id = COALESCE(employee_id, 'NVMY0287'), job_title = COALESCE(job_title, 'Manager - Northern') WHERE LOWER(email) = 'shahrul.hasriq@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012 - 566 9045'), employee_id = COALESCE(employee_id, 'NVMY0158'), job_title = COALESCE(job_title, 'Manager - East Coast') WHERE LOWER(email) = 'nazrul.makhtar@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-678 0490'), employee_id = COALESCE(employee_id, 'NVMY3140'), job_title = COALESCE(job_title, 'Team Lead (Admin & Ops Support- LM)') WHERE LOWER(email) = 'sharifah.ibrahim@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-7226410'), employee_id = COALESCE(employee_id, '10028551'), job_title = COALESCE(job_title, 'Operation Support (LM)') WHERE LOWER(email) = 'adilah.aziz@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-7223287'), employee_id = COALESCE(employee_id, '10035898'), job_title = COALESCE(job_title, 'Operation Support (LM)') WHERE LOWER(email) = 'afiq.razami@ninjavan.co';
UPDATE users SET phone = COALESCE(phone, '012-6778151'), employee_id = COALESCE(employee_id, '10035836'), job_title = COALESCE(job_title, 'Admin (LM)') WHERE LOWER(email) = 'farahin.halil@ninjavan.co';

UPDATE users SET home_scope_type=scope_type, home_scope_values=scope_values WHERE home_scope_type IS NULL;
