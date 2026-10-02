-- 2026-10-02: station staff (Station Heads and Fleet Assistants) from the MY - Fleet Management sheet ('SH & FA Manpower'), so the PIC box
-- can find the people looking after any station. Role = position (station_head / fleet_assistant), scope = their own station.
-- Left out: vacant rows and people whose email is still TBA. From now on the Fleet Admin team keeps this list up to date in the Staff & Org Chart tab.
-- Idempotent: INSERT IGNORE never touches someone who already has access (their role / scope stay as set in Settings -> Users);
-- the UPDATE only fills in a name for people who have none.
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
