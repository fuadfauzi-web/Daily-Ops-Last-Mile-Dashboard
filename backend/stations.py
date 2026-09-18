"""Static reference data: nationwide hub codes -> station name / zone / region.

Sourced from the "Region List" master sheet (143 active/virtual stations across 5
regions, snapshot 2026-09-18). Rarely changes, so it is hardcoded rather than stored
in the database -- if a station opens, closes, or a hub code changes, update this
dict and redeploy.
"""

# hub_code -> (station_name, station_name_full, zone, region)
HUBS: dict[str, tuple[str, str, str, str]] = {
    # East Coast
    'D3-BEN-8-117': ('Bentong', 'Station Bentong', 'East Coast 1', 'East Coast'),
    'B1-GBG-29-35': ('Gambang', 'Station Gambang', 'East Coast 1', 'East Coast'),
    'B1-JKA-31-31': ('Jengka', 'Station Jengka', 'East Coast 1', 'East Coast'),
    'B1-JER-31-30': ('Jerantut', 'Station Jerantut', 'East Coast 1', 'East Coast'),
    'B1-LIP-29-36': ('Kuala Lipis', 'Station Kuala Lipis', 'East Coast 1', 'East Coast'),
    'B1-KUA-29-37': ('Kuantan', 'Station Kuantan', 'East Coast 1', 'East Coast'),
    'B1-MSH-29-34': ('Muadzam Shah', 'Station Muadzam Shah', 'East Coast 1', 'East Coast'),
    'B1-PKN-29-33': ('Pekan', 'Station Pekan', 'East Coast 1', 'East Coast'),
    'D3-RUB-8-118': ('Raub', 'Station Raub', 'East Coast 1', 'East Coast'),
    'B1-RPN-29-32': ('Rompin', 'Station Rompin', 'East Coast 1', 'East Coast'),
    'B1-TMH-31-29': ('Temerloh', 'Station Temerloh', 'East Coast 1', 'East Coast'),
    'B1-TRI-31-28': ('Triang', 'Station Triang', 'East Coast 1', 'East Coast'),
    'A2-AJL-3-13': ('Ajil', 'Station Ajil', 'East Coast 2', 'East Coast'),
    'A2-PYG-3-17': ('Bukit Payong', 'Station Bukit Payong', 'East Coast 2', 'East Coast'),
    'B1-CHU-31-27': ('Chukai', 'Station Chukai', 'East Coast 2', 'East Coast'),
    'A2-DGN-3-15': ('Dungun', 'Station Dungun', 'East Coast 2', 'East Coast'),
    'A2-GBK-3-11': ('Gong Badak', 'Station Gong Badak', 'East Coast 2', 'East Coast'),
    'A1-JTH-26-5': ('Jerteh', 'Station Jerteh', 'East Coast 2', 'East Coast'),
    'A2-MRG-3-12': ('Marang', 'Station Marang', 'East Coast 2', 'East Coast'),
    'A2-PAK-3-14': ('Paka', 'Station Paka', 'East Coast 2', 'East Coast'),
    'A2-STU-3-16': ('Setiu', 'Station Setiu', 'East Coast 2', 'East Coast'),
    'A1-BCK-24-8': ('Bachok', 'Station Bachok', 'East Coast 3', 'East Coast'),
    'AB1-GUA-24-10': ('Gua Musang', 'Station Gua Musang', 'East Coast 3', 'East Coast'),
    'A1-KET-24-7': ('Ketereh', 'Station Ketereh', 'East Coast 3', 'East Coast'),
    'A1-KBR-26-1': ('Kota Bharu', 'Station Kota Bharu', 'East Coast 3', 'East Coast'),
    'A1-RAI-26-3': ('Kuala Krai', 'Station Kuala Krai', 'East Coast 3', 'East Coast'),
    'A1-MAC-24-9': ('Machang', 'Station Machang', 'East Coast 3', 'East Coast'),
    'A1-PAS-26-2': ('Pasir Mas', 'Station Pasir Mas', 'East Coast 3', 'East Coast'),
    'A1-PTH-26-4': ('Pasir Puteh', 'Station Pasir Puteh', 'East Coast 3', 'East Coast'),
    'A1-WKB-24-6': ('Wakaf Bharu', 'Station Wakaf Bharu', 'East Coast 3', 'East Coast'),
    # East Malaysia
    'E1-BFT-1-138': ('Beaufort', 'Station Beaufort', 'East Malaysia 1', 'East Malaysia'),
    'E1-INM-1-132': ('Inanam', 'Station Inanam', 'East Malaysia 1', 'East Malaysia'),
    'E1-KGU-1-136': ('Keningau', 'Station Keningau', 'East Malaysia 1', 'East Malaysia'),
    'E2A-LBN-1-143': ('Labuan', 'Station Labuan', 'East Malaysia 1', 'East Malaysia'),
    'E1-PPR-1-137': ('Papar', 'Station Papar', 'East Malaysia 1', 'East Malaysia'),
    'E1-PMP-1-135': ('Penampang', 'Station Penampang', 'East Malaysia 1', 'East Malaysia'),
    'E1-SGR-1-133': ('Sepanggar', 'Station Sepanggar', 'East Malaysia 1', 'East Malaysia'),
    'E1-TUA-1-134': ('Tuaran', 'Station Tuaran', 'East Malaysia 1', 'East Malaysia'),
    'E2-KBT-1-142': ('Kota Kinabatangan', 'Station Kinabatangan', 'East Malaysia 2', 'East Malaysia'),
    'E2-LDU-1-140': ('Lahad Datu', 'Station Lahad Datu', 'East Malaysia 2', 'East Malaysia'),
    'E1-SDK-1-131': ('Sandakan', 'Station Sandakan', 'East Malaysia 2', 'East Malaysia'),
    'E2-SMM-1-141': ('Semporna', 'Station Semporna', 'East Malaysia 2', 'East Malaysia'),
    'E2-TWU-1-139': ('Tawau', 'Station Tawau', 'East Malaysia 2', 'East Malaysia'),
    # Klang Valley
    'D3-KSR-10-110': ('Kuala Selangor', 'Station Kuala Selangor', 'Zone B', 'Klang Valley'),
    'D4-PCK-4-123': ('Puncak Alam', 'Station Puncak Alam', 'Zone B', 'Klang Valley'),
    'D3-RPG-10-112': ('Rantau Panjang', 'Station Rantau Panjang', 'Zone B', 'Klang Valley'),
    'D4-ALM-2-129': ('Setia Alam', 'Station Setia Alam', 'Zone B', 'Klang Valley'),
    'D3-SBR-10-111': ('Sungai Besar', 'Station Sungai Besar', 'Zone B', 'Klang Valley'),
    'D2-ARA-14-102': ('Ara Damansara', 'Station Ara Damansara', 'Zone C', 'Klang Valley'),
    'D4-BRP-4-125': ('Bukit Rahman Putra', 'Station Bukit Rahman Putra', 'Zone C', 'Klang Valley'),
    'D2-KEP-12-108': ('Kepong', 'Station Kepong', 'Zone C', 'Klang Valley'),
    'D1-DAM-22-86': ('Mutiara Damansara', 'Station Mutiara Damansara', 'Zone C', 'Klang Valley'),
    'D3-RWG-8-115': ('Rawang', 'Station Rawang', 'Zone C', 'Klang Valley'),
    'D4-SZB-2-127': ('Subang', 'Station Subang', 'Zone C', 'Klang Valley'),
    'D3-KKB-8-116': ('Kuala Kubu Baru', 'Station Kuala Kubu Baru', 'Zone D', 'Klang Valley'),
    'D1-SEG-20-93': ('Segambut', 'Station Segambut', 'Zone D', 'Klang Valley'),
    'D1-SLG-18-94': ('Selayang', 'Station Selayang', 'Zone D', 'Klang Valley'),
    'D1-STL-22-89': ('Sentul', 'Station Sentul', 'Zone D', 'Klang Valley'),
    'D1-CKT-20-92': ('Chow Kit', 'Station Chow Kit', 'Zone E', 'Klang Valley'),
    'D1-MLT-16-101': ('Melawati', 'Station Wangsa Melawati', 'Zone E', 'Klang Valley'),
    'D1-SHM-16-99': ('Shamelin', 'Station Shamelin', 'Zone E', 'Klang Valley'),
    'D1-WMJ-22-88': ('Wangsa Maju', 'Station Wangsa Maju', 'Zone E', 'Klang Valley'),
    'D1-AMP-16-100': ('Ampang', 'Station Ampang', 'Zone F', 'Klang Valley'),
    'D1-BMC-16-98': ('Bandar Mahkota Cheras', 'Station Bandar Mahkota Cheras', 'Zone F', 'Klang Valley'),
    'D2-BTR-14-105': ('Bandar Tun Razak', 'Station Bandar Tun Razak', 'Zone F', 'Klang Valley'),
    'D1-CHE-18-96': ('Cheras', 'Station Cheras', 'Zone F', 'Klang Valley'),
    'D1-TMJ-18-97': ('Taman Mega Jaya', 'Station Taman Mega Jaya', 'Zone F', 'Klang Valley'),
    'D3-BGI-10-114': ('Bangi', 'Station Bangi', 'Zone G', 'Klang Valley'),
    'D3-KAJ-6-121': ('Kajang', 'Station Kajang', 'Zone G', 'Klang Valley'),
    'D4-STG-4-124': ('Salak Tinggi', 'Station Salak Tinggi', 'Zone G', 'Klang Valley'),
    'D3-SYH-6-119': ('Semenyih', 'Station Semenyih', 'Zone G', 'Klang Valley'),
    'D4-SRD-4-126': ('Serdang', 'Station Serdang', 'Zone G', 'Klang Valley'),
    'D1-BGR-22-87': ('Bangsar', 'Station Bangsar', 'Zone H', 'Klang Valley'),
    'D2-OUG-12-106': ('Oug', 'Station OUG', 'Zone H', 'Klang Valley'),
    'D1-PJY-18-95': ('Petaling Jaya', 'Station Petaling Jaya', 'Zone H', 'Klang Valley'),
    'D1-SUN-20-91': ('Sunway', 'Station Sunway', 'Zone H', 'Klang Valley'),
    'D2-DSA-12-107': ('Taman Desa', 'Station Taman Desa', 'Zone H', 'Klang Valley'),
    'D3-CJY-6-120': ('Cyberjaya', 'Station Cyberjaya', 'Zone I', 'Klang Valley'),
    'D4-KMU-2-130': ('Kota Kemuning', 'Station Kota Kemuning', 'Zone I', 'Klang Valley'),
    'D2-PUC-14-104': ('Puchong', 'Station Puchong', 'Zone I', 'Klang Valley'),
    'D2-SHA-14-103': ('Shah Alam', 'Station Shah Alam', 'Zone I', 'Klang Valley'),
    'D3-BAN-6-122': ('Banting', 'Station Banting', 'Zone J', 'Klang Valley'),
    'D4-BTK-2-128': ('Botanik', 'Station Botanik', 'Zone J', 'Klang Valley'),
    'D2-KLG-12-109': ('Klang', 'Station Klang', 'Zone J', 'Klang Valley'),
    'D3-PKL-10-113': ('Port Klang', 'Station Port Klang', 'Zone J', 'Klang Valley'),
    'D1-RBY-20-90': ('Rimbayu', 'Station Rimbayu', 'Zone J', 'Klang Valley'),
    # Northern
    'A3-AOR-28-22': ('Alor Setar', 'Station Alor Setar', 'North 1', 'Northern'),
    'A3-BAL-28-24': ('Baling', 'Station Baling', 'North 1', 'Northern'),
    'A3-GRN-30-21': ('Gurun', 'Station Gurun', 'North 1', 'Northern'),
    'A3-JIT-28-23': ('Jitra', 'Station Jitra', 'North 1', 'Northern'),
    'A3-KGR-30-20': ('Kangar', 'Station Kangar', 'North 1', 'Northern'),
    'B2-KLM-27-38': ('Kulim', 'Station Kulim', 'North 1', 'Northern'),
    'A3-LGK-30-18': ('Langkawi', 'Station Langkawi', 'North 1', 'Northern'),
    'A3-PDG-28-25': ('Pendang', 'Station Pendang', 'North 1', 'Northern'),
    'A3-PSN-28-26': ('Pokok Sena', 'Station Pokok Sena', 'North 1', 'Northern'),
    'A3-SPT-30-19': ('Sungai Petani', 'Station Sungai Petani', 'North 1', 'Northern'),
    'B2-BAY-25-43': ('Bayan Lepas', 'Station Bayan Lepas', 'North 2', 'Northern'),
    'B2-BKM-25-45': ('Bukit Mertajam', 'Station Bukit Mertajam', 'North 2', 'Northern'),
    'B2-BWH-27-39': ('Butterworth', 'Station Butterworth', 'North 2', 'Northern'),
    'B2-FLM-25-44': ('Farlim', 'Station Farlim', 'North 2', 'Northern'),
    'B2-GEO-25-42': ('Georgetown', 'Station Georgetown', 'North 2', 'Northern'),
    'B2-BTS-27-40': ('Kepala Batas', 'Station Kepala Batas', 'North 2', 'Northern'),
    'B2-SIM-27-41': ('Simpang Ampat', 'Station Simpang Ampat', 'North 2', 'Northern'),
    'B3-BAG-19-53': ('Bagan Serai', 'Station Bagan Serai', 'North 3', 'Northern'),
    'B3-GAJ-23-46': ('Batu Gajah', 'Station Batu Gajah', 'North 3', 'Northern'),
    'B3-CMN-21-50': ('Cameron Highlands', 'Station Cameron Highlands', 'North 3', 'Northern'),
    'B3-GER-21-51': ('Gerik', 'Station Gerik', 'North 3', 'Northern'),
    'B3-IPH-19-56': ('Ipoh', 'Station Ipoh', 'North 3', 'Northern'),
    'B3-SAR-21-52': ('Kuala Kangsar', 'Station Kuala Kangsar', 'North 3', 'Northern'),
    'B3-STW-19-55': ('Sitiawan', 'Station Sitiawan', 'North 3', 'Northern'),
    'B3-SLM-23-47': ('Slim River', 'Station Slim River', 'North 3', 'Northern'),
    'B3-TPG-19-54': ('Taiping', 'Station Taiping', 'North 3', 'Northern'),
    'B3-TAP-23-48': ('Tapah', 'Station Tapah', 'North 3', 'Northern'),
    'B3-TIN-21-49': ('Teluk Intan', 'Station Teluk Intan', 'North 3', 'Northern'),
    # Southern
    'C1-MAS-15-65': ('Kota Masai', 'Station Kota Masai', 'South 1', 'Southern'),
    'C1-TGI-17-57': ('Kota Tinggi', 'Station Kota Tinggi', 'South 1', 'Southern'),
    'C1-LKN-13-67': ('Larkin', 'Station Larkin', 'South 1', 'Southern'),
    'C1-PSG-15-63': ('Pasir Gudang', 'Station Pasir Gudang', 'South 1', 'Southern'),
    'C1-PWR-17-58': ('Penawar', 'Station Penawar', 'South 1', 'Southern'),
    'C1-TRM-15-66': ('Ulu Tiram', 'Station Ulu Tiram', 'South 1', 'Southern'),
    'C1-GLG-17-59': ('Gelang Patah', 'Station Gelang Patah', 'South 2', 'Southern'),
    'C1-KEM-13-68': ('Kempas', 'Station Kempas', 'South 2', 'Southern'),
    'C1-KLI-15-64': ('Kulai', 'Station Kulai', 'South 2', 'Southern'),
    'C1-AUS-15-62': ('Mount Austin', 'Station Mount Austin', 'South 2', 'Southern'),
    'C1-NSJ-17-60': ('Nusajaya', 'Station Nusajaya', 'South 2', 'Southern'),
    'C1-PTN-17-61': ('Pontian', 'Station Pontian', 'South 2', 'Southern'),
    'C2-HTM-9-75': ('Ayer Hitam', 'Station Ayer Hitam', 'South 3', 'Southern'),
    'C2-BPT-9-74': ('Batu Pahat', 'Station Batu Pahat', 'South 3', 'Southern'),
    'C2-GMR-11-72': ('Bukit Gambir', 'Station Bukit Gambir', 'South 3', 'Southern'),
    'C2-KLU-11-70': ('Kluang', 'Station Kluang', 'South 3', 'Southern'),
    'C2-MSG-11-69': ('Mersing', 'Station Mersing', 'South 3', 'Southern'),
    'C2-MUA-9-73': ('Muar', 'Station Muar', 'South 3', 'Southern'),
    'C2-SGT-11-71': ('Segamat', 'Station Segamat', 'South 3', 'Southern'),
    'C3-AGH-7-77': ('Alor Gajah', 'Station Alor Gajah', 'South 4', 'Southern'),
    'C4-BHU-5-80': ('Bahau', 'Station Bahau', 'South 4', 'Southern'),
    'C4-GMS-5-81': ('Gemas', 'Station Gemas', 'South 4', 'Southern'),
    'C3-JAS-7-79': ('Jasin', 'Station Jasin', 'South 4', 'Southern'),
    'C3-MTG-7-78': ('Melaka Tengah', 'Station Melaka Tengah', 'South 4', 'Southern'),
    'C4-NIL-5-85': ('Nilai', 'Station Nilai', 'South 4', 'Southern'),
    'C4-PDS-5-84': ('Port Dickson', 'Station Port Dickson', 'South 4', 'Southern'),
    'C4-SWG-5-82': ('Senawang', 'Station Senawang', 'South 4', 'Southern'),
    'C4-SBN-5-83': ('Seremban', 'Station Seremban', 'South 4', 'Southern'),
    'C3-MYK-7-76': ('Tanjung Minyak', 'Station Tanjung Minyak', 'South 4', 'Southern'),
}

REGIONS: list[str] = sorted({v[3] for v in HUBS.values()})

ZONES_BY_REGION: dict[str, list[str]] = {}
for _hub, (_name, _full, _zone, _region) in HUBS.items():
    ZONES_BY_REGION.setdefault(_region, set()).add(_zone)
ZONES_BY_REGION = {r: sorted(zs) for r, zs in sorted(ZONES_BY_REGION.items())}

ZONES: list[str] = sorted({v[2] for v in HUBS.values()})

# Full station name (as used by Redash queries like "OPEX: Total Shipments & Parcels
# by Hub" and "FLEET: LM Delivery Performance", e.g. "Station Larkin") -> hub code.
# Lookup is case-insensitive; not every row in those queries matches a known station
# (some are non-network partner locations) -- unmatched rows are simply skipped.
FULL_NAME_TO_HUB: dict[str, str] = {v[1].lower(): k for k, v in HUBS.items()}

# Short station abbreviation (the 2nd hyphen-separated segment of a hub code, e.g.
# "LKN" in "C1-LKN-13-67") -> hub code. This is the code drivers' names are prefixed
# with in query 512 (e.g. "HTM - HD - AIZAT"), so it's how attendance/driver rows get
# matched back to a home station.
ABBR_TO_HUB: dict[str, str] = {hub.split("-")[1]: hub for hub in HUBS if len(hub.split("-")) > 1}


def station_lookup(hub_code: str) -> tuple[str, str, str, str] | None:
    return HUBS.get(hub_code)
