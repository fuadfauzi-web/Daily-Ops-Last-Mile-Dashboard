"""Hypercare Shippers (2026-10-08, was Shipper Radar): the High-Value Shippers tab's tracking-number level data, the SLA each of
those shippers is held to, and the guideline links of the Special Handling shippers.

High-Value shippers: Zalora NXD (the tracking numbers of query 1296, matched into query 78 for age / last scan, same trick as
Cold Chain with query 1410), Amway (AMNV), Watson (WATSN prefix), Zitron (ZTRON prefix), Ceva (LSGMY prefix) and Fujifilm (FUJIF prefix). Parcels are the
active ones of query 78 at their last-scan hub, only the 151 stations -- the same ground every Station Health number uses.

SLAs are set by the Superadmin (Superadmin -> Hypercare Settings): Attempt (the parcel needs a valid attempt) and Delivery (the parcel must be
delivered), each Same day / Next day / Within 2 days / Within 3 days, counted from the parcel's first sweep at its current hub
(query 78's days_since_current_hub_first_sweep, the age the rest of the app uses). The defaults below are used until the Superadmin
saves a value: a row exists in hypercare_settings only for a shipper somebody has edited.
"""
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from aggregate import (
    AGING_BUCKET_KEYS, AGING_BUCKET_LABELS, AGING_KEYS, HUBS, _age_bucket, _empty_aging_row, hypercare_sla_shipper,
)
from auth import CurrentUser, get_current_user

log = logging.getLogger("hypercare")
router = APIRouter()

SLA_OPTIONS = [
    {"days": 0, "label": "Same day"},
    {"days": 1, "label": "Next day"},
    {"days": 2, "label": "Within 2 days"},
    {"days": 3, "label": "Within 3 days"},
]
_SLA_LABEL = {o["days"]: o["label"] for o in SLA_OPTIONS}

# key -> (label, default attempt days, default delivery days)
# Amway rule from the Fleet Manager's original Shipper Watch spec: attempt on day 0, delivered before day 3. Zitron and Ceva "SLA same like Amway"
# (2026-10-08). Zalora NXD (next-day delivery) defaults to attempt same day / delivery next day -- an assumption, change it in Hypercare Settings.
HIGH_VALUE = {
    "zalora": ("Zalora NXD", 0, 1),
    "amway": ("Amway", 0, 3),
    "watson": ("Watson", 0, 3),
    "zitron": ("Zitron", 0, 3),
    "ceva": ("Ceva", 0, 3),
    "fujifilm": ("Fujifilm", 0, 3),  # 2026-10-09: no SLA was specified for Fujifilm, so it starts like the other prefix-matched shippers (same as Amway); the Superadmin changes it in Hypercare Settings
}
# key -> label. Their special flow is explained by a slide deck whose link the Superadmin pastes in (not given yet).
SPECIAL = {"orca": "Orca", "sodaxpress": "Soda Express"}

TN_ROWS_CAP = 3000

_rows_by_shipper: dict[str, list[dict]] = {k: [] for k in HIGH_VALUE}
_captured_at: str | None = None


def shipper_of(tn: str | None, zalora_tns: set[str]) -> str | None:
    """Which high-value shipper a tracking number belongs to, or None."""
    if not tn:
        return None
    if tn in zalora_tns:
        return "zalora"
    return hypercare_sla_shipper(tn)


def refresh(health_rows: list[dict], zalora_tns: set[str], captured_at: datetime) -> None:
    """Called every refresh (main.py): keeps the high-value shippers' parcels in memory, TN level."""
    global _rows_by_shipper, _captured_at
    out: dict[str, list[dict]] = {k: [] for k in HIGH_VALUE}
    for r in health_rows:
        hub = r.get("last_scan_hub_name")
        if hub not in HUBS:
            continue
        key = shipper_of(r.get("tracking_id"), zalora_tns)
        if key is None:
            continue
        name, _full, zone, region = HUBS[hub]
        try:
            age = int(r.get("days_since_current_hub_first_sweep") or 0)
        except (TypeError, ValueError):
            age = 0
        out[key].append({
            "station_code": hub, "station_name": name, "zone": zone, "region": region,
            "tracking_number": r.get("tracking_id"), "status": r.get("granular_status"),
            "attempts": r.get("delivery_attempts") or 0, "age": age, "tag": r.get("tag"), "cod": r.get("cod"),
            "dest_hub": r.get("dest_hub"), "last_scan": r.get("last_scan_datetime"),
        })
    _rows_by_shipper = out
    _captured_at = captured_at.isoformat()


# ----------------------------------------------------------------------------------------------------- settings

async def _load_settings() -> dict[str, dict]:
    try:
        rows = await db.fetch_all("SELECT shipper_key, attempt_days, delivery_days, guideline_url, guideline_note FROM hypercare_settings")
    except Exception:  # noqa: BLE001 - a missing table (migration not applied yet) must not break the tab, defaults apply
        log.warning("hypercare_settings could not be read -- using the defaults")
        return {}
    return {r[0]: {"attempt_days": r[1], "delivery_days": r[2], "guideline_url": r[3], "guideline_note": r[4]} for r in rows}


def _sla_for(key: str, settings: dict[str, dict]) -> tuple[int, int]:
    _label, d_attempt, d_delivery = HIGH_VALUE[key]
    s = settings.get(key) or {}
    attempt = s.get("attempt_days")
    delivery = s.get("delivery_days")
    return (d_attempt if attempt is None else int(attempt), d_delivery if delivery is None else int(delivery))


class SlaOption(BaseModel):
    days: int
    label: str


class HighValueConfig(BaseModel):
    key: str
    label: str
    attempt_days: int
    delivery_days: int
    attempt_label: str
    delivery_label: str


class SpecialConfig(BaseModel):
    key: str
    label: str
    guideline_url: str | None
    guideline_note: str | None


class HypercareConfig(BaseModel):
    sla_options: list[SlaOption]
    high_value: list[HighValueConfig]
    special: list[SpecialConfig]
    can_edit: bool


@router.get("/api/hypercare/config", response_model=HypercareConfig)
async def config(user: CurrentUser = Depends(get_current_user)):
    settings = await _load_settings()
    high = []
    for key, (label, _a, _d) in HIGH_VALUE.items():
        attempt, delivery = _sla_for(key, settings)
        high.append({
            "key": key, "label": label, "attempt_days": attempt, "delivery_days": delivery,
            "attempt_label": _SLA_LABEL.get(attempt, f"Within {attempt} days"), "delivery_label": _SLA_LABEL.get(delivery, f"Within {delivery} days"),
        })
    special = [
        {"key": key, "label": label, "guideline_url": (settings.get(key) or {}).get("guideline_url"), "guideline_note": (settings.get(key) or {}).get("guideline_note")}
        for key, label in SPECIAL.items()
    ]
    return {"sla_options": SLA_OPTIONS, "high_value": high, "special": special, "can_edit": user.role == "admin"}


class SettingIn(BaseModel):
    shipper_key: str
    attempt_days: int | None = None
    delivery_days: int | None = None
    guideline_url: str | None = None
    guideline_note: str | None = None


class SettingsIn(BaseModel):
    items: list[SettingIn]


@router.put("/api/hypercare/settings", response_model=HypercareConfig)
async def put_settings(payload: SettingsIn, user: CurrentUser = Depends(get_current_user)):
    """Superadmin only: SLA days of the high-value shippers and guideline link / note of the special-handling ones."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the Superadmin can change the Hypercare settings")
    now = datetime.now(timezone.utc).replace(microsecond=0)
    for item in payload.items:
        key = item.shipper_key
        if key not in HIGH_VALUE and key not in SPECIAL:
            raise HTTPException(status_code=422, detail=f"Unknown shipper {key!r}")
        if key in HIGH_VALUE:
            for days in (item.attempt_days, item.delivery_days):
                if days is not None and days not in _SLA_LABEL:
                    raise HTTPException(status_code=422, detail="SLA must be Same day, Next day, Within 2 days or Within 3 days")
        url = (item.guideline_url or "").strip() or None
        if url and not re.match(r"^https?://", url, re.IGNORECASE):
            raise HTTPException(status_code=422, detail="The guideline link must start with http:// or https://")
        note = (item.guideline_note or "").strip() or None
        if note and len(note) > 4000:
            raise HTTPException(status_code=422, detail="The guideline note is too long (4000 characters at most)")
        await db.execute("DELETE FROM hypercare_settings WHERE shipper_key = %s", (key,))
        await db.execute(
            """INSERT INTO hypercare_settings (shipper_key, attempt_days, delivery_days, guideline_url, guideline_note, updated_by, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (key, item.attempt_days if key in HIGH_VALUE else None, item.delivery_days if key in HIGH_VALUE else None, url, note, user.email, now),
        )
    return await config(user)


# ------------------------------------------------------------------------------------------------- TN level views

def _scope_rows(rows: list[dict], user: CurrentUser) -> list[dict]:
    if user.scope_type == "all":
        return rows
    if user.scope_type == "region":
        return [r for r in rows if r["region"] in user.scope_values]
    if user.scope_type == "zone":
        return [r for r in rows if r["zone"] in user.scope_values]
    if user.scope_type == "station":
        return [r for r in rows if r["station_name"] in user.scope_values]
    return []


def _state(allowed_days: int, age: int, done: bool = False) -> str:
    if done:
        return "Done"
    remaining = allowed_days - age
    if remaining < 0:
        return "Breached"
    if remaining == 0:
        return "Due today"
    return "On track"


def _tn_with_sla(r: dict, attempt_days: int, delivery_days: int) -> dict:
    return {
        **r,
        "attempt_sla": _state(attempt_days, r["age"], done=r["attempts"] > 0),
        "delivery_sla": _state(delivery_days, r["age"]),
    }


class HcFields(BaseModel):
    total: int
    age_0: int
    age_1: int
    age_2: int
    age_3: int
    age_4_5: int
    age_6_7: int
    age_8_plus: int
    attempt_breach: int
    delivery_breach: int


class HcStationRow(HcFields):
    station_code: str
    station_name: str
    zone: str
    region: str


class HcGroupRow(HcFields):
    key: str
    region: str
    station_count: int


class HcTnRow(BaseModel):
    station_code: str
    station_name: str
    tracking_number: str | None
    status: str | None
    attempts: int
    age: int
    tag: str | None
    cod: str | None
    dest_hub: str | None
    last_scan: str | None = None
    attempt_sla: str
    delivery_sla: str


class ColumnDef(BaseModel):
    key: str
    label: str


class SlaInfo(BaseModel):
    attempt_label: str
    delivery_label: str


class HcShipperResponse(BaseModel):
    captured_at: str | None
    type: str
    type_label: str
    buckets: list[str]
    stations: list[HcStationRow]
    zones: list[HcGroupRow]
    regions: list[HcGroupRow]
    tn_rows: list[HcTnRow]
    tn_rows_total: int
    tn_rows_truncated: bool
    extra_columns: list[ColumnDef]
    tn_extra_columns: list[ColumnDef]
    sla: SlaInfo
    footer_note: str


_EXTRA_COLUMNS = [{"key": "attempt_breach", "label": "Attempt SLA breached"}, {"key": "delivery_breach", "label": "Delivery SLA breached"}]
_TN_EXTRA_COLUMNS = [{"key": "attempt_sla", "label": "Attempt SLA"}, {"key": "delivery_sla", "label": "Delivery SLA"}]
_PIVOT_KEYS = AGING_KEYS + ("attempt_breach", "delivery_breach")


def _pivot(tn_rows: list[dict]) -> list[dict]:
    stations: dict[str, dict] = {}
    for r in tn_rows:
        row = stations.get(r["station_code"])
        if row is None:
            row = stations[r["station_code"]] = {**_empty_aging_row(r["station_code"]), "attempt_breach": 0, "delivery_breach": 0}
        row[AGING_BUCKET_KEYS[_age_bucket(r["age"])]] += 1
        row["total"] += 1
        if r["attempt_sla"] == "Breached":
            row["attempt_breach"] += 1
        if r["delivery_sla"] == "Breached":
            row["delivery_breach"] += 1
    return list(stations.values())


def _rollup(station_rows: list[dict], group_key: str) -> list[dict]:
    groups: dict[str, dict] = {}
    for row in station_rows:
        key = row[group_key]
        g = groups.setdefault(key, {"key": key, "region": row["region"], "station_count": 0, **{k: 0 for k in _PIVOT_KEYS}})
        for k in _PIVOT_KEYS:
            g[k] += row[k]
        g["station_count"] += 1
    return list(groups.values())


@router.get("/api/hypercare/shipper/{key}", response_model=HcShipperResponse)
async def shipper_detail(key: str, user: CurrentUser = Depends(get_current_user)):
    if key not in HIGH_VALUE:
        raise HTTPException(status_code=404, detail="Unknown shipper")
    label = HIGH_VALUE[key][0]
    settings = await _load_settings()
    attempt_days, delivery_days = _sla_for(key, settings)
    sla = {"attempt_label": _SLA_LABEL.get(attempt_days, str(attempt_days)), "delivery_label": _SLA_LABEL.get(delivery_days, str(delivery_days))}
    note = (
        "Active parcels at the hub that last scanned them (station hubs only). Age = days since the parcel's first sweep at its current hub. "
        "Attempt SLA: a valid attempt is needed within the allowed days of that first sweep (Done once the parcel has an attempt); "
        "Delivery SLA: the parcel must be delivered within them (still here = not delivered yet). Breached = past the allowed day, Due today = on the last allowed day. "
        "SLAs are set by the Superadmin."
    )
    base = {
        "type": key, "type_label": label, "buckets": list(AGING_BUCKET_LABELS.values()), "extra_columns": _EXTRA_COLUMNS,
        "tn_extra_columns": _TN_EXTRA_COLUMNS, "sla": sla, "footer_note": note,
    }
    if _captured_at is None:
        return {**base, "captured_at": None, "stations": [], "zones": [], "regions": [], "tn_rows": [], "tn_rows_total": 0, "tn_rows_truncated": False}

    scoped = [_tn_with_sla(r, attempt_days, delivery_days) for r in _scope_rows(_rows_by_shipper.get(key, []), user)]
    stations = _pivot(scoped)
    tn_rows = sorted(scoped, key=lambda r: r["age"], reverse=True)
    total = len(tn_rows)
    return {
        **base,
        "captured_at": _captured_at,
        "stations": stations,
        "zones": _rollup(stations, "zone"),
        "regions": _rollup(stations, "region"),
        "tn_rows": tn_rows[:TN_ROWS_CAP],
        "tn_rows_total": total,
        "tn_rows_truncated": total > TN_ROWS_CAP,
    }


class HighValueRow(BaseModel):
    key: str
    label: str
    attempt_label: str
    delivery_label: str
    parcels: int
    attempt_breach: int
    delivery_breach: int
    attempt_due_today: int
    delivery_due_today: int


class HighValueOverview(BaseModel):
    captured_at: str | None
    shippers: list[HighValueRow]


@router.get("/api/hypercare/high-value", response_model=HighValueOverview)
async def high_value_overview(user: CurrentUser = Depends(get_current_user)):
    settings = await _load_settings()
    out = []
    for key, (label, _a, _d) in HIGH_VALUE.items():
        attempt_days, delivery_days = _sla_for(key, settings)
        rows = [_tn_with_sla(r, attempt_days, delivery_days) for r in _scope_rows(_rows_by_shipper.get(key, []), user)]
        out.append({
            "key": key, "label": label,
            "attempt_label": _SLA_LABEL.get(attempt_days, str(attempt_days)), "delivery_label": _SLA_LABEL.get(delivery_days, str(delivery_days)),
            "parcels": len(rows),
            "attempt_breach": sum(1 for r in rows if r["attempt_sla"] == "Breached"),
            "delivery_breach": sum(1 for r in rows if r["delivery_sla"] == "Breached"),
            "attempt_due_today": sum(1 for r in rows if r["attempt_sla"] == "Due today"),
            "delivery_due_today": sum(1 for r in rows if r["delivery_sla"] == "Due today"),
        })
    return {"captured_at": _captured_at, "shippers": out}
