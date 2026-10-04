"""Assets (2026-10-03, staging): Fleet Admin -> Assets keeps the Fleet Admin team's asset lists in one tab, by category. The first category is STATION INVENTORY:
for every station, each item it should have -- laptops, scanners, cages, baskets, fans, fire extinguishers ... -- with how many are good and how many damaged,
and a remark (V70 loaded it from the zone workbooks in the Fleet Inventory Drive folder). More categories (fire extinguisher renewals, weighing scales ...) follow.

HQ staff and above can read; only the Fleet Admin role edits. A station that has no inventory yet starts from the standard item list.
"""
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user
from stations import HUBS

router = APIRouter()

# The standard item list, in the order of the station tabs, with the group each belongs to (for filtering and totals).
STANDARD_ITEMS = [
    ("LAPTOP", "IT & devices"), ("BARCODE SCANNER / WIRE SCANNER", "IT & devices"), ("SUPER SCANNER", "IT & devices"), ("CAGE", "Handling"),
    ("INDUSTRIAL BASKET (GREY)", "Handling"), ("PALLET JACK", "Handling"), ("WHITEBOARD", "Furniture & fittings"), ("NOTICE BOARD", "Furniture & fittings"),
    ("OFFICE TABLE", "Furniture & fittings"), ("OFFICE CHAIR", "Furniture & fittings"), ("HVI LOCKERS", "Furniture & fittings"), ("A4 PRINTER", "IT & devices"),
    ("INDUSTRIAL STAND FAN", "Cooling & water"), ("TABLE FAN", "Cooling & water"), ("INDUSTRIAL FLOOR FAN", "Cooling & water"), ("INDUSTRIAL WALL FAN", "Cooling & water"),
    ("DISINFECTION SPRAY", "Safety & health"), ("BILL COUNTERS", "Cash & weighing"), ("HAND TROLLEY", "Handling"), ("METAL CASH BOX", "Cash & weighing"),
    ("SAFE BOX", "Cash & weighing"), ("GUN TEMPERATURE SCANNER", "Safety & health"), ("STAND TEMPERATURE SCANNER", "Safety & health"), ("SIGNBOARD", "Furniture & fittings"),
    ("FIRE EXTINGUISHER", "Safety & health"), ("WEIGHING SCALE", "Cash & weighing"), ("FIRST AID", "Safety & health"), ("STATION TELEPHONE", "IT & devices"),
    ("WIFI", "IT & devices"), ("DELIVERY BAG", "Handling"), ("CCTV", "IT & devices"), ("THERMAL PRINTER", "IT & devices"), ("COWAY", "Cooling & water"),
]
GROUPS = ["IT & devices", "Handling", "Furniture & fittings", "Cooling & water", "Safety & health", "Cash & weighing", "Other"]
_GROUP_OF = dict(STANDARD_ITEMS) | {"LG WATER DISPENSER": "Cooling & water", "RAMP": "Handling", "SORTING TABLE": "Handling", "SAFETY CONE": "Safety & health", "LUMBER SUPPORT": "Safety & health"}
_STATIONS = {h[0]: h for h in HUBS.values()}


def group_of(item: str) -> str:
    return _GROUP_OF.get(item.upper(), "Other")


def _can_view(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager", "hq_staff")


def _can_edit(user: CurrentUser) -> bool:
    return user.position == "fleet_admin"  # only the Fleet Admin role edits this module for now (not even the Superadmin; Role Tester -> Fleet Admin to try it)


def _require_editor(user: CurrentUser) -> None:
    if not _can_edit(user):
        raise HTTPException(status_code=403, detail="Only the Fleet Admin team can edit assets")


class ItemIn(BaseModel):
    item: str
    uom: str | None = None
    good: int | str | None = None
    damaged: int | str | None = None
    remarks: str | None = None


class InventoryIn(BaseModel):
    items: list[ItemIn]
    # True: the station's list becomes exactly these items (an item left out is removed). False: only these items are added / changed.
    replace: bool = False


def _count(value, label: str):
    if value is None:
        return None
    s = str(value).strip()
    if s == "":
        return None
    if not re.fullmatch(r"\d{1,6}", s):
        raise HTTPException(status_code=422, detail=f"{label}: use a whole number (got {value!r})")
    return int(s)


def _clean_item(it: ItemIn) -> dict:
    name = " ".join((it.item or "").split()).upper()
    if not name:
        raise HTTPException(status_code=422, detail="An item needs a name")
    if len(name) > 120:
        raise HTTPException(status_code=422, detail=f"{name[:30]}...: name is too long (120 characters at most)")
    uom = " ".join((it.uom or "").split()).lower() or "unit"
    if len(uom) > 20:
        raise HTTPException(status_code=422, detail=f"{name}: unit is too long")
    remarks = " ".join((it.remarks or "").split()) or None
    if remarks and len(remarks) > 300:
        raise HTTPException(status_code=422, detail=f"{name}: remark is too long (300 characters at most)")
    return {"item": name, "uom": uom, "good": _count(it.good, f"{name} good"), "damaged": _count(it.damaged, f"{name} damaged"), "remarks": remarks}


@router.get("/api/assets/inventory")
async def inventory(user: CurrentUser = Depends(get_current_user)):
    if not _can_view(user):
        raise HTTPException(status_code=403, detail="HQ staff access required")
    rows = await db.fetch_all("SELECT station, item, uom, good, damaged, remarks, sort_no, updated_by, updated_at FROM asset_inventory ORDER BY station, sort_no, item")
    items = [
        {"station": r[0], "item": r[1], "group": group_of(r[1]), "uom": r[2] or "unit", "good": r[3], "damaged": r[4], "remarks": r[5] or "",
         "updated_by": r[7], "updated_at": str(r[8])[:16] if r[8] else None}
        for r in rows
    ]
    stations = []
    for name, (_n, _full, zone, region) in sorted(_STATIONS.items()):
        mine = [i for i in items if i["station"] == name]
        stations.append({
            "name": name, "zone": zone, "region": region, "items": len(mine),
            "good": sum(i["good"] or 0 for i in mine), "damaged": sum(i["damaged"] or 0 for i in mine),
            "updated_at": max((i["updated_at"] for i in mine if i["updated_at"]), default=None),
        })
    return {
        "items": items, "stations": stations, "groups": GROUPS, "standard": [{"item": n, "group": g} for n, g in STANDARD_ITEMS],
        "can_edit": _can_edit(user),
    }


@router.put("/api/assets/inventory/{station}")
async def save_inventory(station: str, payload: InventoryIn, user: CurrentUser = Depends(get_current_user)):
    """Add / change items of one station (or replace its whole list). An item that exists is updated with what is sent; a new one is added."""
    _require_editor(user)
    if station not in _STATIONS:
        raise HTTPException(status_code=404, detail=f"Not a station: {station!r}")
    if not payload.items and not payload.replace:
        raise HTTPException(status_code=422, detail="No items given")
    if len(payload.items) > 200:
        raise HTTPException(status_code=422, detail="200 items at most in one go")
    cleaned = []
    seen = set()
    for it in payload.items:
        c = _clean_item(it)
        if c["item"] in seen:
            raise HTTPException(status_code=422, detail=f"{c['item']} is listed twice")
        seen.add(c["item"])
        cleaned.append(c)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    existing = {r[0]: r[1] for r in await db.fetch_all("SELECT item, sort_no FROM asset_inventory WHERE station = %s", (station,))}
    next_no = max([n or 0 for n in existing.values()] + [0]) + 1
    added = updated = 0
    for pos, c in enumerate(cleaned, start=1):
        if c["item"] in existing:
            await db.execute(
                "UPDATE asset_inventory SET uom=%s, good=%s, damaged=%s, remarks=%s, updated_by=%s, updated_at=%s WHERE station=%s AND item=%s",
                (c["uom"], c["good"], c["damaged"], c["remarks"], user.email, now, station, c["item"]),
            )
            updated += 1
        else:
            await db.execute(
                "INSERT INTO asset_inventory (station, item, uom, good, damaged, remarks, sort_no, updated_by, updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (station, c["item"], c["uom"], c["good"], c["damaged"], c["remarks"], pos if payload.replace else next_no, user.email, now),
            )
            next_no += 1
            added += 1
    removed = 0
    if payload.replace:
        for item in [i for i in existing if i not in seen]:
            await db.execute("DELETE FROM asset_inventory WHERE station = %s AND item = %s", (station, item))
            removed += 1
    return {"ok": True, "added": added, "updated": updated, "removed": removed}


@router.delete("/api/assets/inventory/{station}")
async def delete_item(station: str, item: str, user: CurrentUser = Depends(get_current_user)):
    """Remove one item from a station's list (the item name is a query parameter: some contain a slash)."""
    _require_editor(user)
    name = " ".join(item.split()).upper()
    if not await db.fetch_one("SELECT item FROM asset_inventory WHERE station = %s AND item = %s", (station, name)):
        raise HTTPException(status_code=404, detail="Item not found")
    await db.execute("DELETE FROM asset_inventory WHERE station = %s AND item = %s", (station, name))
    return {"ok": True}
