"""Headcount (2026-10-02, staging). A place's headcount is the people posted there (Staff & Org Chart) plus its vacant seats --
seats that are planned, or held by someone whose email is not known yet. Management View -> Capacity reads this instead of an
uploaded workbook.

Three kinds of place, by the seat's designation (V60): a STATION holds Station Head / Fleet Assistant seats, a ZONE holds Region Head /
Regional Fleet Supervisor seats, and HQ holds Fleet Admin seats. headcount_seats.station keeps the place's name (a station, a zone, or
"HQ") and place_type says which.

A seat can cover more than one place (V67): a Regional Fleet Supervisor who looks after South 1 and South 2 is ONE seat that sits in both zone
rows (headcount_seats.places holds the list; `station` keeps the first). The tables show it in each place; the cards count it once.

Who may change the seats (Manager and HOD, per the Fleet Manager):
  * the HOD (and the Superadmin) add a seat straight away;
  * a Manager's new seat is 'pending' until the HOD (or Superadmin) approves it;
  * a Manager or the HOD removes a seat with no approval.
People are not removed here -- a leaver is removed from the Staff & Org Chart by the Fleet Admin team.
"""
import json
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
_ZONES = {z for zs in ZONES_BY_REGION.values() for z in zs}


def can_see(user: CurrentUser) -> bool:
    """Headcount is for the Manager, the HOD and the Fleet Admin role (and the Superadmin). Other HQ roles -- OPEX, Recovery, Restock and any added
    later -- do not see it."""
    return user.role == "admin" or user.position in ("hod", "manager", "fleet_admin")


_can_view = can_see


def allowed_places(user: CurrentUser) -> set[str] | None:
    """The places (station names, zone names) this person's headcount covers, or None for everything. The HOD, the Fleet Admin role, the
    Superadmin and anyone whose own scope is HQ see it all; a Manager posted to a region / zone / station sees just that part."""
    if user.role == "admin" or user.position in ("hod", "fleet_admin"):
        return None
    kind, values = user.home_scope_type or "", set(user.home_scope_values or [])
    if kind in ("", "all", "hq"):
        return None
    out: set[str] = set()
    for name, _full, zone, region in HUBS.values():
        if (kind == "region" and region in values) or (kind == "zone" and zone in values) or (kind == "station" and name in values):
            out.add(name)
            if kind != "station":
                out.add(zone)
    return out


def _in_scope(places: list[str], allowed: set[str] | None, whole: bool = False) -> bool:
    if allowed is None:
        return True
    return all(p in allowed for p in places) if whole else any(p in allowed for p in places)


def _can_change(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager")


def _is_hod(user: CurrentUser) -> bool:
    return user.role == "admin" or user.position == "hod"


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def seat_places(station: str, places_raw) -> list[str]:
    """The places a seat covers: the `places` list (V67), or just `station` for seats from before."""
    if places_raw:
        try:
            got = json.loads(places_raw) if isinstance(places_raw, str) else list(places_raw)
            if got:
                return [str(p) for p in got]
        except ValueError:
            pass
    return [station]


_SEAT_COLS = "id, station, places, place_type, designation, note, status, requested_by, requested_at, decided_by"


async def _seats(where: str = "", params: tuple = ()) -> list[dict]:
    out = []
    for r in await db.fetch_all(f"SELECT {_SEAT_COLS} FROM headcount_seats {where} ORDER BY station, id", params):
        out.append({
            "id": r[0], "station": r[1], "places": seat_places(r[1], r[2]), "place_type": r[3] or PLACE_TYPES.get(r[4], "station"),
            "designation": r[4], "note": r[5], "status": r[6], "requested_by": r[7], "requested_at": r[8], "decided_by": r[9],
        })
    return out


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
    for seat in await _seats():
        for place in seat["places"]:
            if place in out:
                out[place]["tba" if seat["status"] == "approved" else "pending"] += 1
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


async def _plan(designation: str, places: list[str]) -> tuple[list[int], list[str]]:
    """Which vacant seats would a person posted at `places` use up, and which places have none?  Seats are taken one at a time, the one that covers
    the most of what is still uncovered first (an exact match wins, then the oldest); a seat that covers two zones covers both of them."""
    seats = [s for s in await _seats("WHERE designation = %s AND status = 'approved'", (designation,))]
    remaining = list(places)
    take: list[int] = []
    while remaining:
        best = None
        for s in seats:
            hit = len(set(s["places"]) & set(remaining))
            if hit == 0:
                continue
            key = (hit, set(s["places"]) <= set(places), -s["id"])  # most covered, then not spilling over, then oldest
            if best is None or key > best[0]:
                best = (key, s)
        if best is None:
            break
        seats.remove(best[1])
        take.append(best[1]["id"])
        remaining = [p for p in remaining if p not in best[1]["places"]]
    return take, remaining


async def missing_vacant_seat(station_names: list[str], role: str) -> str | None:
    """The first place among these with no vacant (approved) seat for this role's designation, or None when every one has one.
    The Fleet Admin team can only fill a seat a Manager / HOD has opened -- they cannot add headcount."""
    designation = designation_of(role)
    if designation is None:
        return None
    _take, uncovered = await _plan(designation, list(station_names))
    return uncovered[0] if uncovered else None


async def vacate(station_names: list[str], role: str, who: str, note: str | None, by: str) -> None:
    """A person left a place: their seat stays (headcount only changes by a Manager / HOD), now vacant until someone fills it.
    Someone who covered two zones leaves one seat that covers both."""
    designation = designation_of(role)
    if designation is None or not station_names:
        return
    now = _now()
    kind = PLACE_TYPES[designation]
    groups = [[p] for p in station_names] if kind == "station" else [list(station_names)]
    for places in groups:
        await db.execute(
            """INSERT INTO headcount_seats (station, places, place_type, designation, note, status, requested_by, requested_at, decided_by, decided_at)
               VALUES (%s, %s, %s, %s, %s, 'approved', %s, %s, %s, %s)""",
            (places[0], json.dumps(places), kind, designation, note or f"Vacated by {who}", by, now, by, now),
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


async def vacant_seats(user: CurrentUser | None = None) -> list[dict]:
    """Approved seats, for the Staff list (a vacant row each) -- with the place's zone and region. Only those this person may see headcount for."""
    if user is not None and not can_see(user):
        return []
    allowed = allowed_places(user) if user is not None else None
    out = []
    for s in await _seats("WHERE status = 'approved'"):
        if not _in_scope(s["places"], allowed):
            continue
        zone, region = _place_info(s["station"], s["place_type"])
        out.append({
            "id": s["id"], "station": ", ".join(s["places"]), "places": s["places"], "place_type": s["place_type"], "zone": zone, "region": region,
            "designation": s["designation"], "label": DESIGNATIONS.get(s["designation"], s["designation"]), "note": s["note"],
        })
    return out


async def consume_seat(station_names: list[str], role: str) -> None:
    """A real person was added to these places: use up the matching vacant seat(s), so the same person is not counted twice -- once as a
    vacant seat and once as themselves."""
    designation = designation_of(role)
    if designation is None:
        return
    take, _uncovered = await _plan(designation, list(station_names))
    for sid in take:
        await db.execute("DELETE FROM headcount_seats WHERE id = %s", (sid,))


def _seat_out(s: dict) -> dict:
    return {
        "id": s["id"], "station": s["station"], "places": s["places"], "designation": s["designation"],
        "label": DESIGNATIONS.get(s["designation"], s["designation"]), "note": s["note"], "status": s["status"],
        "requested_by": s["requested_by"], "requested_at": str(s["requested_at"]), "decided_by": s["decided_by"], "place_type": s["place_type"],
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
    for seat in await _seats("WHERE designation IN ('region_head', 'rfs', 'fleet_admin')"):
        key = "tba" if seat["status"] == "approved" else "pending"
        for place in seat["places"]:
            if seat["designation"] == "fleet_admin" and place == HQ_PLACE:
                hq[key] += 1
            elif seat["designation"] != "fleet_admin" and place in zones:
                zones[place][seat["designation"]][key] += 1
    return zones, hq, len(zone_people)


async def _distinct_totals(seats: list[dict], allowed: set[str] | None = None) -> dict[str, dict[str, int]]:
    """Cards: each person and each seat counted once, even when it covers two places (only within `allowed`, when given)."""
    people = {"stations": set(), "zones": set(), "hq": set()}
    for email, role, st, raw, home_st, home_raw in await db.fetch_all(
        "SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values FROM users"
    ):
        designation = designation_of(role)
        if designation is None:
            continue
        scope_type, values = (home_st, parse_scope_values(home_raw)) if home_st else (st, parse_scope_values(raw))
        mine = places_for(role, scope_type, values)
        if mine and _in_scope(mine, allowed):
            people[{"station": "stations", "zone": "zones", "hq": "hq"}[PLACE_TYPES[designation]]].add(email.lower())
    out = {k: {"filled": len(v), "tba": 0, "pending": 0} for k, v in people.items()}
    for s in seats:
        if not _in_scope(s["places"], allowed):
            continue
        key = {"station": "stations", "zone": "zones", "hq": "hq"}[s["place_type"]]
        out[key]["tba" if s["status"] == "approved" else "pending"] += 1
    for v in out.values():
        v["total"] = v["filled"] + v["tba"]
    return out


@router.get("/api/headcount")
async def headcount(user: CurrentUser = Depends(get_current_user)):
    if not _can_view(user):
        raise HTTPException(status_code=403, detail="HQ staff access required")
    allowed = allowed_places(user)
    counts = await headcount_by_station()
    stations = []
    for name, _full, zone, region in sorted(HUBS.values(), key=lambda h: h[0]):
        if allowed is not None and name not in allowed:
            continue
        c = counts[name]
        stations.append({"name": name, "zone": zone, "region": region, **c, "total": c["filled"] + c["tba"]})
    raw_seats = [s for s in await _seats() if _in_scope(s["places"], allowed)]
    seats = [_seat_out(s) for s in raw_seats]
    zone_counts, hq_counts, _zone_people = await headcount_by_place()
    zones = []
    for r in REGIONS:
        for z in ZONES_BY_REGION.get(r, []):
            if allowed is not None and z not in allowed:
                continue
            c = zone_counts[z]
            tot = lambda k: {**c[k], "total": c[k]["filled"] + c[k]["tba"]}
            zones.append({"name": z, "region": r, "region_head": tot("region_head"), "rfs": tot("rfs"),
                          "total": c["region_head"]["filled"] + c["region_head"]["tba"] + c["rfs"]["filled"] + c["rfs"]["tba"]})
    return {
        "stations": stations,
        "zones": zones,
        "totals": await _distinct_totals(raw_seats, allowed),
        # HQ (the Fleet Admin team) is only for those whose headcount covers everything
        "hq": {"fleet_admin": {**hq_counts, "total": hq_counts["filled"] + hq_counts["tba"]}} if allowed is None else None,
        "seats": seats,
        "can_change": _can_change(user),
        "can_approve": _is_hod(user),
        "needs_approval": _can_change(user) and not _is_hod(user),  # a Manager's new seat waits for the HOD
    }


class SeatIn(BaseModel):
    station: str = ""  # one place (kept for older callers); `places` is the list
    places: list[str] = []  # the places the seat covers: stations for SH / FA, zones for RH / RFS (several allowed), nothing for Fleet Admin (HQ)
    designation: str = "fleet_assistant"
    note: str | None = None


@router.post("/api/headcount/seats")
async def add_seat(payload: SeatIn, user: CurrentUser = Depends(get_current_user)):
    if not _can_change(user):
        raise HTTPException(status_code=403, detail="Only a Manager or the HOD can add headcount")
    if payload.designation not in DESIGNATIONS:
        raise HTTPException(status_code=422, detail=f"designation must be one of {sorted(DESIGNATIONS)}")
    place_type = PLACE_TYPES[payload.designation]
    asked = [p for p in (payload.places or ([payload.station] if payload.station else [])) if p]
    places = [HQ_PLACE] if place_type == "hq" else list(dict.fromkeys(asked))
    if place_type == "station":
        valid = {h[0] for h in HUBS.values()}
        if not places or any(p not in valid for p in places):
            raise HTTPException(status_code=422, detail="Pick a station")
    if place_type == "zone" and (not places or any(p not in _ZONES for p in places)):
        raise HTTPException(status_code=422, detail="Pick a zone")
    if len(places) > 6:
        raise HTTPException(status_code=422, detail="A seat can cover 6 places at most")
    allowed = allowed_places(user)
    if allowed is not None and not _in_scope(places, allowed, whole=True):
        raise HTTPException(status_code=403, detail="That place is outside your scope")
    note = (payload.note or "").strip() or None
    if note and len(note) > 200:
        raise HTTPException(status_code=422, detail="Note is too long (max 200 characters)")
    now = _now()
    approved = _is_hod(user)
    await db.execute(
        """INSERT INTO headcount_seats (station, places, place_type, designation, note, status, requested_by, requested_at, decided_by, decided_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (places[0], json.dumps(places), place_type, payload.designation, note, "approved" if approved else "pending", user.email, now,
         user.email if approved else None, now if approved else None),
    )
    return {"ok": True, "status": "approved" if approved else "pending"}


async def _seat(seat_id: int, user: CurrentUser):
    row = await db.fetch_one("SELECT id, station, designation, note, status, requested_by, places FROM headcount_seats WHERE id = %s", (seat_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="Seat not found")
    if not _in_scope(seat_places(row[1], row[6]), allowed_places(user), whole=True):
        raise HTTPException(status_code=403, detail="That seat is outside your scope")
    return row


@router.delete("/api/headcount/seats/{seat_id}")
async def remove_seat(seat_id: int, user: CurrentUser = Depends(get_current_user)):
    """Remove a seat -- no approval needed, for a Manager or the HOD."""
    if not _can_change(user):
        raise HTTPException(status_code=403, detail="Only a Manager or the HOD can remove headcount")
    await _seat(seat_id, user)
    await db.execute("DELETE FROM headcount_seats WHERE id = %s", (seat_id,))
    return {"ok": True}


@router.post("/api/headcount/seats/{seat_id}/approve")
async def approve_seat(seat_id: int, user: CurrentUser = Depends(get_current_user)):
    if not _is_hod(user):
        raise HTTPException(status_code=403, detail="Only the HOD can approve added headcount")
    row = await _seat(seat_id, user)
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
    row = await _seat(seat_id, user)
    if row[4] != "pending":
        raise HTTPException(status_code=409, detail="That seat is not waiting for approval")
    await db.execute("DELETE FROM headcount_seats WHERE id = %s", (seat_id,))
    return {"ok": True}
