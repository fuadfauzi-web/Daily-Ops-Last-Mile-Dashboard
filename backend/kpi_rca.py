"""KPI Dashboard RCA views (staging, 2026-09-26): Invalid POD, COD RTS, the Weekly KPI results and a generic table (OPEX result).

The KPI page is the RCA side of the KPIs: the OPEX team's dashboard shows the result (a %), this shows WHY -- by hub, reason,
driver, shipper, with the tracking numbers behind every number. Data comes from the files the team already works with, uploaded
on the KPI page (kpi_data.py); once the matching Metabase questions exist they can replace the uploads.

Scope: a hub / station outside the viewer's scope is never returned. Anything that can't be matched to one of the 143 stations
is only visible to a nationwide viewer.
"""
import logging
import re
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException

import kpi_data as kd
from auth import CurrentUser, get_current_user
import kpi_targets
from kpi_targets import weekly_region_targets
from stations import ABBR_TO_HUB, FULL_NAME_TO_HUB, HUBS

log = logging.getLogger("kpi_rca")
router = APIRouter()

TN_ROWS_CAP = 5000


def _idx(row: dict) -> dict:
    return {kd.norm(k): v for k, v in row.items()}


def _s(value) -> str:
    return "" if value is None else str(value).strip()


def _num(value) -> float:
    try:
        return float(str(value).replace(",", "")) if value not in (None, "") else 0.0
    except ValueError:
        return 0.0


def _in_scope(code: str | None, user: CurrentUser) -> bool:
    """code = a hub code of one of our stations, or None when the row could not be matched to a station. East Malaysia (Retail, not Last Mile) is
    left out of every KPI page unless an admin switched it on (Admin -> KPI Settings)."""
    if code and code in HUBS and kpi_targets.excluded_region(HUBS[code][3]):
        return False
    if user.scope_type == "all":
        return True
    if code is None or code not in HUBS:
        return False
    name, _full, zone, region = HUBS[code]
    if user.scope_type == "region":
        return region in user.scope_values
    if user.scope_type == "zone":
        return zone in user.scope_values
    if user.scope_type == "station":
        return name in user.scope_values
    return False


def _hub_meta(code: str | None, raw_name: str) -> dict:
    if code and code in HUBS:
        name, _full, zone, region = HUBS[code]
        return {"code": code, "name": name, "zone": zone, "region": region}
    label = raw_name or "(unknown)"
    return {"code": raw_name or "?", "name": label, "zone": "Unknown", "region": "Unknown"}


def _monday(day_text: str) -> str | None:
    try:
        d = date.fromisoformat(day_text[:10])
    except ValueError:
        return None
    return (d - timedelta(days=d.weekday())).isoformat()


def _week_label(monday: str) -> str:
    d = date.fromisoformat(monday)
    e = d + timedelta(days=6)
    return f"{d.day} {d.strftime('%b')} – {e.day} {e.strftime('%b')}"


# ------------------------------------------------------------------------------------------------ Invalid POD

def _pod_hub_code(hub_short_name: str) -> str | None:
    return FULL_NAME_TO_HUB.get(hub_short_name.strip().lower())


# ------------------------------------------------------------------------------------------------ COD RTS

def _hub_code_from_code(text: str) -> str | None:
    """A hub code from a file to one of our stations. Older files carry the previous numbering ("C3-MTG-7-80" for today's
    "C3-MTG-7-78"), so if the exact code isn't known the station abbreviation in the middle ("MTG") decides."""
    t = text.strip()
    if t in HUBS:
        return t
    parts = t.split("-")
    return ABBR_TO_HUB.get(parts[1].upper()) if len(parts) >= 3 and parts[0][:1].upper() == "C" else None


# ------------------------------------------------------------------------------------------------ Weekly KPI results

# The "Station KPI W0W" sheet of the team's Dashboard WoW file is read BY POSITION (several headers are blank or mislabelled --
# e.g. "SUCCESS RATE 90%" holds the success COUNT and the rate is in the unnamed column after it).
WEEKLY_COLUMNS = [
    # (position, key, label, kind, target, direction)   direction: "higher" = higher is better
    (5, "success_rate", "Success Rate", "pct", 0.90, "higher"),
    (6, "d0", "D-0", "pct", 0.88, "higher"),
    (9, "fifo_d0", "FIFO D0", "pct", 0.96, "higher"),
    (10, "d3", "D-3", "pct", 0.96, "higher"),
    (11, "t7", "T-7", "pct", 1.00, "higher"),
    (12, "cod_rts", "COD RTS Rate", "pct", 0.09, "lower"),
    (13, "sweep", "Sweep Rate", "pct", 0.98, "higher"),
    (14, "prior", "Prior", "pct", 0.92, "higher"),
    (15, "invalid_pod", "Invalid POD", "pct", 0.25, "lower"),
    (17, "complaint", "Complaint Rate", "pct", 0.0004, "lower"),
    (19, "lost", "Lost Rate", "pct", 0.00005, "lower"),
    (23, "shp_inbound", "Shipment Inbound", "pct", 0.99, "higher"),
    (28, "rpu", "RPU Performance", "pct", None, "higher"),
]
# The targets above are the standard ones (Klang Valley / Northern / Southern); East Coast and East Malaysia differ for some KPIs, so the view also gets
# region_targets (kpi_targets.py) and judges every scope against its own region's.
WEEKLY_COUNTS = [(3, "total_routed", "Total Routed"), (4, "total_success", "Total Success"), (16, "complaint_count", "Complaints"), (18, "lost_count", "Lost"), (22, "fresh_received", "Fresh Received")]


def _region_zone_names() -> tuple[set[str], set[str], dict[str, tuple[str, str]]]:
    regions = {v[3].lower() for v in HUBS.values()}
    zones = {v[2].lower() for v in HUBS.values()}
    stations = {v[0].lower(): (v[2], v[3]) for v in HUBS.values()}
    return regions, zones, stations


def build_weekly_kpi(rows: list[dict], user: CurrentUser) -> dict:
    if not rows:
        return {"weeks": [], "rows": [], "kpis": [], "counts": []}
    keys = list(rows[0].keys())
    regions, zones, stations = _region_zone_names()

    def at(row: dict, pos: int):
        return row.get(keys[pos]) if pos < len(keys) else None

    out = []
    weeks: set[int] = set()
    for r in rows:
        name = _s(at(r, 2))
        week = at(r, 1)
        if not name or not isinstance(week, (int, float)):
            continue
        low = name.lower()
        if low in stations:
            level, zone, region = "station", *stations[low]
        elif low in zones:
            level, zone = "zone", name
            region = next((v[3] for v in HUBS.values() if v[2].lower() == low), "")
        elif low in regions:
            level, zone, region = "region", "", name
        else:
            continue
        if kpi_targets.excluded_region(region):
            continue
        if user.scope_type != "all":
            if level != "station" or not _in_scope(next((c for c, v in HUBS.items() if v[0].lower() == low), None), user):
                continue
        values = {}
        for pos, key, _label, _kind, _target, _dir in WEEKLY_COLUMNS:
            v = at(r, pos)
            values[key] = float(v) if isinstance(v, (int, float)) else None
        counts = {key: (float(at(r, pos)) if isinstance(at(r, pos), (int, float)) else None) for pos, key, _l in WEEKLY_COUNTS}
        weeks.add(int(week))
        out.append({"week": int(week), "name": name, "level": level, "zone": zone, "region": region, "values": values, "counts": counts})
    return {
        "weeks": sorted(weeks),
        "rows": out,
        "kpis": [{"key": k, "label": l, "target": t, "direction": d} for _p, k, l, _kind, t, d in WEEKLY_COLUMNS],
        "region_targets": weekly_region_targets(),
        "counts": [{"key": k, "label": l} for _p, k, l in WEEKLY_COUNTS],
    }


# ------------------------------------------------------------------------------------------------ endpoints

async def _rows(dataset: str):
    got = await kd.load_rows(dataset)
    if got is None:
        return None, []
    return got[0], got[1]


@router.get("/api/kpi/weekly")
async def kpi_weekly(user: CurrentUser = Depends(get_current_user)):
    meta, rows = await _rows("weekly_kpi")
    if meta is None:
        return {"has_data": False}
    await kpi_targets.ensure_fresh()
    return {"has_data": True, "meta": meta, **build_weekly_kpi(rows, user)}


# ------------------------------------------------------------------------------------------------ OPEX result

_OPEX_LABELS = {"fifo": "FIFO", "d0_d2": "D0/D2", "d3": "D3", "d7": "D7", "prior": "Priority", "invalid_pod": "Invalid POD", "lost": "Lost", "cod_rts": "COD RTS"}
_OPEX_FILE = re.compile(r"last-mile-(?P<scope>.+?)-(?P<grain>daily|weekly)-(?P<from>\d{4}-\d{2}-\d{2})-to-(?P<to>\d{4}-\d{2}-\d{2})", re.I)


def _opex_num(value) -> float | None:
    try:
        return float(str(value).replace(",", "").replace("%", "")) if value not in (None, "") else None
    except ValueError:
        return None


def _decimals(value) -> int:
    s = str(value or "")
    return len(s.split(".")[1]) if "." in s else 0


def build_opex_result(columns: list[str], rows: list[dict], filename: str) -> dict | None:
    """The OPEX "Last Mile Performance" dashboard's Download CSV: one row per child of the chosen scope (regions -> areas -> hubs) with
    <kpi>_rate_pct, <kpi>_target_pct and <kpi>_met per KPI plus kpis_missed. None when the file is some other table. Everyone sees
    all of it -- the OPEX result is open to every user (Fleet Manager, 2026-09-26), unlike the RCA pages."""
    if not columns or not rows:
        return None
    first = columns[0]
    if kd.norm(first) not in ("hub", "area", "region", "zone"):
        return None
    kpis = [c[: -len("_rate_pct")] for c in columns if c.endswith("_rate_pct")]
    if not kpis:
        return None
    out = []
    for r in rows:
        name = str(r.get(first) or "").strip()
        if not name:
            continue
        code = _hub_code_from_code(name) if kd.norm(first) == "hub" else None
        if code and code in HUBS and kpi_targets.excluded_region(HUBS[code][3]):
            continue  # East Malaysia stations are left out unless an admin switched them on
        if not code and kpi_targets.excluded_region("East Malaysia") and re.match(r"\s*east\s*malaysia", name, re.I):
            continue  # ... and so are the East Malaysia region / area / zone rows
        values = {}
        for k in kpis:
            met = str(r.get(f"{k}_met") or "").strip().lower()
            values[k] = {"rate": _opex_num(r.get(f"{k}_rate_pct")), "target": _opex_num(r.get(f"{k}_target_pct")), "met": True if met == "met" else False if met == "missed" else None}
        missed = _opex_num(r.get("kpis_missed"))
        out.append({"name": name, "station": HUBS[code][0] if code and code in HUBS else None, "zone": HUBS[code][2] if code and code in HUBS else None,
                    "missed": int(missed) if missed is not None else sum(1 for v in values.values() if v["met"] is False), "values": values})
    sample = rows[0]
    m = _OPEX_FILE.search(filename or "")
    return {
        "level": kd.norm(first),
        "kpis": [{"key": k, "label": _OPEX_LABELS.get(k, k.replace("_", " ").title()), "decimals": _decimals(sample.get(f"{k}_rate_pct"))} for k in kpis],
        "rows": out,
        "scope": m.group("scope").replace("-", " ").upper() if m else None,
        "grain": m.group("grain").lower() if m else None,
        "from": m.group("from") if m else None,
        "to": m.group("to") if m else None,
    }


@router.get("/api/kpi/table/{dataset}")
async def kpi_table(dataset: str, user: CurrentUser = Depends(get_current_user)):
    """The uploaded OPEX result: the OPEX dashboard's own CSV gets a structured view (`opex`); any other table is shown as it is
    (columns + up to 5,000 rows). Open to every user -- no scope filter."""
    if dataset != "opex_result":
        raise HTTPException(status_code=404, detail="Unknown table")
    meta, rows = await _rows(dataset)
    if meta is None:
        return {"has_data": False}
    columns = list(rows[0].keys()) if rows else []
    return {
        "has_data": True, "meta": meta, "columns": columns, "rows": [[r.get(c) for c in columns] for r in rows[:5000]], "capped": len(rows) > 5000,
        "opex": build_opex_result(columns, rows, meta.get("filename", "")),
    }
