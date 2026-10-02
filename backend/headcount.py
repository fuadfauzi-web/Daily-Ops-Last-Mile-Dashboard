"""Headcount (2026-10-02, staging). A station's headcount is the people posted there (Staff & Org Chart) plus its TBA seats --
seats that are planned, or held by someone whose email is not known yet. Management View -> Capacity reads this instead of an
uploaded workbook.

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
from stations import HUBS

router = APIRouter()

DESIGNATIONS = {"station_head": "Station Head", "fleet_assistant": "Fleet Assistant"}


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


async def consume_seat(station_names: list[str], role: str) -> None:
    """A real person was added to these stations: use up one matching approved seat per station (the oldest), so the same
    person is not counted twice -- once as a TBA seat and once as themselves."""
    if tier_of(role) != "station":
        return
    designation = "station_head" if role == "station_head" else "fleet_assistant"
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
        "requested_by": r[5], "requested_at": str(r[6]), "decided_by": r[7],
    }


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
            "SELECT id, station, designation, note, status, requested_by, requested_at, decided_by FROM headcount_seats ORDER BY station, id"
        )
    ]
    return {
        "stations": stations,
        "seats": seats,
        "can_change": _can_change(user),
        "can_approve": _is_hod(user),
        "needs_approval": _can_change(user) and not _is_hod(user),  # a Manager's new seat waits for the HOD
    }


class SeatIn(BaseModel):
    station: str
    designation: str = "fleet_assistant"
    note: str | None = None


@router.post("/api/headcount/seats")
async def add_seat(payload: SeatIn, user: CurrentUser = Depends(get_current_user)):
    if not _can_change(user):
        raise HTTPException(status_code=403, detail="Only a Manager or the HOD can add headcount")
    if payload.station not in {h[0] for h in HUBS.values()}:
        raise HTTPException(status_code=422, detail="Pick a station")
    if payload.designation not in DESIGNATIONS:
        raise HTTPException(status_code=422, detail=f"designation must be one of {sorted(DESIGNATIONS)}")
    note = (payload.note or "").strip() or None
    if note and len(note) > 200:
        raise HTTPException(status_code=422, detail="Note is too long (max 200 characters)")
    now = _now()
    approved = _is_hod(user)
    await db.execute(
        """INSERT INTO headcount_seats (station, designation, note, status, requested_by, requested_at, decided_by, decided_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (payload.station, payload.designation, note, "approved" if approved else "pending", user.email, now,
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
