"""Headcount (2026-10-02, staging). A place's headcount is the people posted there (Staff & Org Chart) plus its vacant seats --
seats that are planned, or held by someone whose email is not known yet. Management View -> Capacity reads this instead of an
uploaded workbook.

Three kinds of place, by the seat's designation (V60): a STATION holds Station Head / Fleet Assistant seats, a ZONE holds Region Head /
Regional Fleet Supervisor seats, and HQ holds Fleet Admin seats. headcount_seats.station keeps the place's name (a station, a zone, or
"HQ") and place_type says which.

Who may change the seats (Manager and HOD, per the Fleet Manager):
  * the HOD (and the Superadmin) add a seat straight away;
  * a Manager's new seat is 'pending' until the HOD (or Superadmin) approves it;
  * a Manager or the HOD removes a seat with no approval.
People are not removed here -- a leaver is removed from the Staff & Org Chart by the Fleet Admin team.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import CurrentUser, get_current_user, parse_scope_values, tier_of
from stations import HUBS, REGIONS, ZONES_BY_REGION

router = APIRouter()

DESIGNATIONS = {
    "station_head": "Station Head", "fleet_assistant": "Fleet Assistant",
    "region_head": "Region Head", "rfs": "Regional Fleet Supervisor",
    "fleet_admin": "Fleet Admin",
}
PLACE_TYPES = {"station_head": "station", "fleet_assistant": "station", "region_head": "zone", "rfs": "zone", "fleet_admin": "hq"}
HQ_PLACE = "HQ"


def _can_view(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager", "hq_staff")


def _can_change(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager")


def _is_hod(user: CurrentUser) -> bool:
    return user.role == "admin" or user.position == "hod"


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def headcount_by_station() -> dict[str, dict[str, int]]:
    """{station name: {"filled": people posted there, "tba": approved seats, "pending": seats waiting for the HOD}}."""
    out: dict[str, dict[str, int]] = {name: {"filled": 0, "tba": 0, "pending": 0} for name, *_ in HUBS.values()}
    for role, st, raw, home_st, home_raw in await db.fetch_all(
        "SELECT role, scope_type, scope_values, home_scope_type, home_scope_values FROM users"
    ):
        if tier_of(role) != "station":
            continue
        scope_type, values = (home_st, parse_scope_values(home_raw)) if home_st else (st, parse_scope_values(raw))
        if scope_type != "station":
            continue
        for v in values:
            if v in out:
                out[v]["filled"] += 1
    for station, status in await db.fetch_all("SELECT station, status FROM headcount_seats"):
        if station in out:
            out[station]["tba" if status == "approved" else "pending"] += 1
    return out


def designation_of(role: str) -> str | None:
    """The seat kind a position fills, or None for positions that have no headcount seats (HOD, Manager, OPEX ...)."""
    if role in ("station_head", "region_head", "rfs", "fleet_admin"):
        return role
    return "fleet_assistant" if tier_of(role) == "station" else None  # Fleet Assistant, and the old unspecific 'station' title


def places_for(role: str, scope_type: str, values: list[str]) -> list[str]:
    """The seat places (station names / zone names / "HQ") a posting fills; empty when this position has no seats or is posted at some
    other level (e.g. a Region Head given a whole region)."""
    designation = designation_of(role)
    if designation is None:
        return []
    kind = PLACE_TYPES[designation]
    if kind == "hq":
        return [HQ_PLACE] if scope_type in ("hq", "all") else []
    return list(values) if scope_type == kind else []


async def missing_vacant_seat(station_names: list[str], role: str) -> str | None:
    """The first place among these with no vacant (approved) seat for this role's designation, or None when every one has one.
    The Fleet Admin team can only fill a seat a Manager / HOD has opened -- they cannot add headcount."""
    designation = designation_of(role)
    if designation is None:
        return None
    for station in station_names:
        row = await db.fetch_one(
            "SELECT id FROM headcount_seats WHERE station = %s AND designation = %s AND status = 'approved' LIMIT 1", (station, designation)
        )
        if row is None:
            return station
    return None


async def vacate(station_names: list[str], role: str, who: str, note: str | None, by: str) -> None:
    """A person left a place: their seat stays (headcount only changes by a Manager / HOD), now vacant until someone fills it."""
    designation = designation_of(role)
    if designation is None:
        return
    now = _now()
    for station in station_names:
        await db.execute(
            """INSERT INTO headcount_seats (station, place_type, designation, note, status, requested_by, requested_at, decided_by, decided_at)
               VALUES (%s, %s, %s, %s, 'approved', %s, %s, %s, %s)""",
            (station, PLACE_TYPES[designation], designation, note or f"Vacated by {who}", by, now, by, now),
        )


def _zone_region(zone: str) -> str:
    return next((r for r, zs in ZONES_BY_REGION.items() if zone in zs), "")


def _place_info(place: str, place_type: str) -> tuple[str, str]:
    """(zone, region) of a seat's place, for filtering and sorting."""
    if place_type == "hq":
        return "", HQ_PLACE
    if place_type == "zone":
        return place, _zone_region(place)
    hub = next((h for h in HUBS.values() if h[0] == place), None)
    return (hub[2], hub[3]) if hub else ("", "")


async def vacant_seats() -> list[dict]:
    """Approved seats, for the Staff list (a vacant row each) -- with the place's zone and region."""
    out = []
    for sid, station, place_type, designation, note in await db.fetch_all(
        "SELECT id, station, place_type, designation, note FROM headcount_seats WHERE status = 'approved' ORDER BY station, id"
    ):
        zone, region = _place_info(station, place_type)
        out.append({
            "id": sid, "station": station, "place_type": place_type, "zone": zone, "region": region,
            "designation": designation, "label": DESIGNATIONS.get(designation, designation), "note": note,
        })
    return out


async def consume_seat(station_names: list[str], role: str) -> None:
    """A real person was added to these stations: use up one matching approved seat per station (the oldest), so the same
    person is not counted twice -- once as a TBA seat and once as themselves."""
    designation = designation_of(role)
    if designation is None:
        return
    for station in station_names:
        row = await db.fetch_one(
            "SELECT id FROM headcount_seats WHERE station = %s AND designation = %s AND status = 'approved' ORDER BY id LIMIT 1",
            (station, designation),
        )
        if row:
            await db.execute("DELETE FROM headcount_seats WHERE id = %s", (row[0],))


def _seat_out(r) -> dict:
    return {
        "id": r[0], "station": r[1], "designation": r[2], "label": DESIGNATIONS.get(r[2], r[2]), "note": r[3], "status": r[4],
        "requested_by": r[5], "requested_at": str(r[6]), "decided_by": r[7], "place_type": r[8] or PLACE_TYPES.get(r[2], "station"),
    }


_EMPTY = {"filled": 0, "tba": 0, "pending": 0}


async def headcount_by_place() -> tuple[dict[str, dict], dict[str, int], int]:
    """Zone and HQ headcount: ({zone: {"region", "region_head": {filled, tba, pending}, "rfs": {...}}}, HQ's Fleet Admin {filled, tba, pending},
    how many different Region Heads / RFS are posted at a zone). Someone who covers two zones is counted in each zone's row but once in the last number."""
    zones = {z: {"region": r, "region_head": dict(_EMPTY), "rfs": dict(_EMPTY)} for r in REGIONS for z in ZONES_BY_REGION.get(r, [])}
    hq = dict(_EMPTY)
    zone_people: set[str] = set()
    for email, role, st, raw, home_st, home_raw in await db.fetch_all(
        "SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values FROM users"
    ):
        if role not in ("region_head", "rfs", "fleet_admin"):
            continue
        scope_type, values = (home_st, parse_scope_values(home_raw)) if home_st else (st, parse_scope_values(raw))
        for place in places_for(role, scope_type, values):
            if place == HQ_PLACE:
                hq["filled"] += 1
            elif place in zones:
                zones[place][role]["filled"] += 1
                zone_people.add(email.lower())
    for place, designation, status in await db.fetch_all(
        "SELECT station, designation, status FROM headcount_seats WHERE designation IN ('region_head', 'rfs', 'fleet_admin')"
    ):
        key = "tba" if status == "approved" else "pending"
        if designation == "fleet_admin" and place == HQ_PLACE:
            hq[key] += 1
        elif designation != "fleet_admin" and place in zones:
            zones[place][designation][key] += 1
    return zones, hq, len(zone_people)


@router.get("/api/headcount")
async def headcount(user: CurrentUser = Depends(get_current_user)):
    if not _can_view(user):
        raise HTTPException(status_code=403, detail="HQ staff access required")
    counts = await headcount_by_station()
    stations = []
    for name, _full, zone, region in sorted(HUBS.values(), key=lambda h: h[0]):
        c = counts[name]
        stations.append({"name": name, "zone": zone, "region": region, **c, "total": c["filled"] + c["tba"]})
    seats = [
        _seat_out(r)
        for r in await db.fetch_all(
            "SELECT id, station, designation, note, status, requested_by, requested_at, decided_by, place_type FROM headcount_seats ORDER BY station, id"
        )
    ]
    zone_counts, hq_counts, zone_people = await headcount_by_place()
    zones = []
    for r in REGIONS:
        for z in ZONES_BY_REGION.get(r, []):
            c = zone_counts[z]
            tot = lambda k: {**c[k], "total": c[k]["filled"] + c[k]["tba"]}
            zones.append({"name": z, "region": r, "region_head": tot("region_head"), "rfs": tot("rfs"),
                          "total": c["region_head"]["filled"] + c["region_head"]["tba"] + c["rfs"]["filled"] + c["rfs"]["tba"]})
    return {
        "stations": stations,
        "zones": zones,
        "zone_people": zone_people,
        "hq": {"fleet_admin": {**hq_counts, "total": hq_counts["filled"] + hq_counts["tba"]}},
        "seats": seats,
        "can_change": _can_change(user),
        "can_approve": _is_hod(user),
        "needs_approval": _can_change(user) and not _is_hod(user),  # a Manager's new seat waits for the HOD
    }


class SeatIn(BaseModel):
    station: str = ""  # the place: a station for SH / FA seats, a zone for RH / RFS seats; ignored for Fleet Admin (HQ)
    designation: str = "fleet_assistant"
    note: str | None = None


@router.post("/api/headcount/seats")
async def add_seat(payload: SeatIn, user: CurrentUser = Depends(get_current_user)):
    if not _can_change(user):
        raise HTTPException(status_code=403, detail="Only a Manager or the HOD can add headcount")
    if payload.designation not in DESIGNATIONS:
        raise HTTPException(status_code=422, detail=f"designation must be one of {sorted(DESIGNATIONS)}")
    place_type = PLACE_TYPES[payload.designation]
    place = HQ_PLACE if place_type == "hq" else payload.station
    if place_type == "station" and place not in {h[0] for h in HUBS.values()}:
        raise HTTPException(status_code=422, detail="Pick a station")
    if place_type == "zone" and place not in {z for zs in ZONES_BY_REGION.values() for z in zs}:
        raise HTTPException(status_code=422, detail="Pick a zone")
    note = (payload.note or "").strip() or None
    if note and len(note) > 200:
        raise HTTPException(status_code=422, detail="Note is too long (max 200 characters)")
    now = _now()
    approved = _is_hod(user)
    await db.execute(
        """INSERT INTO headcount_seats (station, place_type, designation, note, status, requested_by, requested_at, decided_by, decided_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (place, place_type, payload.designation, note, "approved" if approved else "pending", user.email, now,
         user.email if approved else None, now if approved else None),
    )
    return {"ok": True, "status": "approved" if approved else "pending"}


async def _seat(seat_id: int):
    row = await db.fetch_one("SELECT id, station, designation, note, status, requested_by FROM headcount_seats WHERE id = %s", (seat_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="Seat not found")
    return row


@router.delete("/api/headcount/seats/{seat_id}")
async def remove_seat(seat_id: int, user: CurrentUser = Depends(get_current_user)):
    """Remove a seat -- no approval needed, for a Manager or the HOD."""
    if not _can_change(user):
        raise HTTPException(status_code=403, detail="Only a Manager or the HOD can remove headcount")
    await _seat(seat_id)
    await db.execute("DELETE FROM headcount_seats WHERE id = %s", (seat_id,))
    return {"ok": True}


@router.post("/api/headcount/seats/{seat_id}/approve")
async def approve_seat(seat_id: int, user: CurrentUser = Depends(get_current_user)):
    if not _is_hod(user):
        raise HTTPException(status_code=403, detail="Only the HOD can approve added headcount")
    row = await _seat(seat_id)
    if row[4] != "pending":
        raise HTTPException(status_code=409, detail="That seat is not waiting for approval")
    await db.execute(
        "UPDATE headcount_seats SET status = 'approved', decided_by = %s, decided_at = %s WHERE id = %s",
        (user.email, _now(), seat_id),
    )
    return {"ok": True}


@router.post("/api/headcount/seats/{seat_id}/reject")
async def reject_seat(seat_id: int, user: CurrentUser = Depends(get_current_user)):
    if not _is_hod(user):
        raise HTTPException(status_code=403, detail="Only the HOD can reject added headcount")
    row = await _seat(seat_id)
    if row[4] != "pending":
        raise HTTPException(status_code=409, detail="That seat is not waiting for approval")
    await db.execute("DELETE FROM headcount_seats WHERE id = %s", (seat_id,))
    return {"ok": True}
