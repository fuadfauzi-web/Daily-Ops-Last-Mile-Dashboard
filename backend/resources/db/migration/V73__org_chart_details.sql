-- 2026-10-03: what the org chart and the staff details need beyond access.
--  * users.job_title: the title shown on the chart ("Team Lead (Admin & Ops Support- LM)"), when it is more than the position;
--  * users.based_station: where a Region Head / RFS sits (the sheet's "St.Based"): they manage a zone but are based at a station;
--  * org_people: people who are on the chart but do NOT have dashboard access -- the HOO, the HOD, the Fleet Strategist, the Fleet Manager of Southern
--    (the owner keeps the Superadmin role but shows as the Southern Manager) and the Admin (LM) interns. branch says where they hang:
--    hoo | hod | strategist | region_manager (with region) | admin_support.
-- Mobile / employee ID for the Region Heads, RFS, Managers and the Fleet Admin team come from the MY - Fleet Management sheet; a value somebody already typed in is kept.
ALTER TABLE users
  ADD COLUMN job_title VARCHAR(80) NULL AFTER employee_id,
  ADD COLUMN based_station VARCHAR(100) NULL AFTER job_title;

CREATE TABLE org_people (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  title       VARCHAR(120) NULL,
  email       VARCHAR(255) NULL,
  phone       VARCHAR(40)  NULL,
  employee_id VARCHAR(30)  NULL,
  branch      VARCHAR(20)  NOT NULL,
  region      VARCHAR(40)  NULL,
  sort_no     INT          NULL,
  updated_by  VARCHAR(255) NULL,
  updated_at  DATETIME     NULL,
  PRIMARY KEY (id)
);

INSERT INTO org_people (name, title, email, phone, employee_id, branch, region, sort_no, updated_by) VALUES
  ('Adrian Woon', '(HOO) Head of Operation', 'adrian.woon@ninjavan.co', '012 - 205 5230', NULL, 'hoo', NULL, 1, 'fuad.mawardi@ninjavan.co'),
  ('Noras Fawilah', '(HOD) Head of Department, Fleet Last Mile', 'noras.fawilah@ninjavan.co', '013-289 5088', NULL, 'hod', NULL, 2, 'fuad.mawardi@ninjavan.co'),
  ('Muhammad Amirul Izzat Bin Yazid', 'Senior Fleet Strategist', 'izzat.yazid@ninjavan.co', '012-390 0287', 'NVMY0184', 'strategist', NULL, 3, 'fuad.mawardi@ninjavan.co'),
  ('Mohd Fuad Fauzi Bin Mawardi', 'Fleet Manager - Southern', 'fuad.mawardi@ninjavan.co', '012 - 226 3597', 'NVMY3593', 'region_manager', 'Southern', 4, 'fuad.mawardi@ninjavan.co'),
  ('Aqilla Najwa Binti Mohd Sazuki', 'Admin (LM) - Intern', 'aqilla.najwa@ninjavan.co', '012-7226501', NULL, 'admin_support', NULL, 5, 'fuad.mawardi@ninjavan.co'),
  ('Haris Bin Sahir', 'Admin (LM) - Intern', 'haris.sahir@ninjavan.co', '012-7226370', NULL, 'admin_support', NULL, 6, 'fuad.mawardi@ninjavan.co');

-- The two Admin (LM) interns are on the chart as people now, so their two vacant Fleet Admin seats (V60) go; the Fleet Admin headcount still adds up
-- (the interns count as people there).
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
