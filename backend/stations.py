"""Static reference data: Southern Region hub codes -> station name / sub-region.

This rarely changes, so it's hardcoded rather than stored in the database. If a new
station opens or a hub code changes, update this dict and redeploy.
"""

# hub_code -> (station_name, sub_region)
SOUTH_HUBS: dict[str, tuple[str, str]] = {
    # South 1
    "C1-MAS-15-65": ("Kota Masai", "South 1"),
    "C1-TGI-17-57": ("Kota Tinggi", "South 1"),
    "C1-LKN-13-67": ("Larkin", "South 1"),
    "C1-PSG-15-63": ("Pasir Gudang", "South 1"),
    "C1-PWR-17-58": ("Penawar", "South 1"),
    "C1-TRM-15-66": ("Ulu Tiram", "South 1"),
    # South 2
    "C1-GLG-17-59": ("Gelang Patah", "South 2"),
    "C1-KEM-13-68": ("Kempas", "South 2"),
    "C1-AUS-15-62": ("Mount Austin", "South 2"),
    "C1-NSJ-17-60": ("Nusajaya", "South 2"),
    "C1-PTN-17-61": ("Pontian", "South 2"),
    "C1-KLI-15-64": ("Kulai", "South 2"),
    # South 3
    "C2-HTM-9-75": ("Ayer Hitam", "South 3"),
    "C2-BPT-9-74": ("Batu Pahat", "South 3"),
    "C2-GMR-11-72": ("Bukit Gambir", "South 3"),
    "C2-KLU-11-70": ("Kluang", "South 3"),
    "C2-MSG-11-69": ("Mersing", "South 3"),
    "C2-MUA-9-73": ("Muar", "South 3"),
    "C2-SGT-11-71": ("Segamat", "South 3"),
    # South 4
    "C3-AGH-7-77": ("Alor Gajah", "South 4"),
    "C4-BHU-5-80": ("Bahau", "South 4"),
    "C4-GMS-5-81": ("Gemas", "South 4"),
    "C3-JAS-7-79": ("Jasin", "South 4"),
    "C3-MTG-7-78": ("Melaka Tengah", "South 4"),
    "C4-NIL-5-85": ("Nilai", "South 4"),
    "C4-PDS-5-84": ("Port Dickson", "South 4"),
    "C4-SWG-5-82": ("Senawang", "South 4"),
    "C4-SBN-5-83": ("Seremban", "South 4"),
    "C3-MYK-7-76": ("Tanjung Minyak", "South 4"),
}

SUB_REGIONS = ["South 1", "South 2", "South 3", "South 4"]

REGION_NAME = "Southern"


def station_lookup(hub_code: str) -> tuple[str, str] | None:
    return SOUTH_HUBS.get(hub_code)
