"""Staff & Org Chart (2026-10-02, staging): the Fleet Admin team's own list of who works where.

Two things are kept apart on purpose:
  * the POSTING -- a person's position and where they are based (users.role + users.home_scope_*). The Fleet Admin team
    maintains this here, for everyone (HQ staff included), because staff change.
  * the ACCESS -- what the person may see in the dashboard (users.scope_*). It starts out the same as the posting, and only a
    Manager / HOD, a Region Head / RFS or the Superadmin changes it, in Settings -> Users -- e.g. to give someone sent to
    rescue another station or region that station's or region's data. The Fleet Admin team never edits access.
Changing someone's posting here moves their access with it, unless their access was set by hand (then it is left alone and
shown as "Custom access", so whoever owns it can look at it).
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import POSITIONS, CurrentUser, get_current_user, parse_scope_values, tier_of
from stations import HUBS, REGIONS, ZONES, ZONES_BY_REGION
from tasklist import on_user_deleted as tasklist_user_deleted

router = APIRouter()

_OWNER_EMAIL = "fuad.mawardi@ninjavan.co"
_SHORT = {"region_head": "RH", "rfs": "RFS", "station_head": "SH", "fleet_assistant": "FA"}  # the sheet's own abbreviations
_HOME_TYPES = {"hq", "region", "zone", "station"}


def _can_view(user: CurrentUser) -> bool:
    return user.role in ("admin", "manager", "hq_staff")


def _can_edit(user: CurrentUser) -> bool:
    return user.role == "admin" or user.position == "fleet_admin"


def _require_editor(user: CurrentUser) -> None:
    if not _can_edit(user):
        raise HTTPException(status_code=403, detail="Only the Fleet Admin team can edit the staff list")


def compose_display_name(name: str, role: str, scope_type: str, scope_values: list[str]) -> str:
    """"Afnan Roslan (SH - Larkin)" -- the same label the PIC box shows."""
    tag = _SHORT.get(role) or POSITIONS.get(role, (role,))[0]
    where = "" if scope_type in ("all", "hq") else " - " + " & ".join(scope_values)
    return f"{name.strip()} ({tag}{where})"


def plain_name(display_name: str | None) -> str:
    """The person's name without the "(SH - Larkin)" label."""
    s = (display_name or "").rstrip()
    if s.endswith(")") and "(" in s:
        s = s[: s.rindex("(")]
    return s.strip()


def _norm(scope_type: str | None, values: list[str] | None) -> tuple[str, tuple[str, ...]]:
    st = "hq" if scope_type == "all" else (scope_type or "")
    return st, tuple(sorted(values or []))


def _home_of(row) -> tuple[str, list[str]]:
    """(scope_type, values) a person is POSTED to; people from before the split have no home yet, so their access is it."""
    _email, _role, st, raw, home_st, home_raw = row[:6]
    if home_st:
        return home_st, parse_scope_values(home_raw)
    return st, parse_scope_values(raw)


class StaffIn(BaseModel):
    email: str
    name: str
    role: str  # a position, see auth.POSITIONS
    scope_type: str  # where they are based: 'hq' | 'region' | 'zone' | 'station'
    scope_values: list[str] = []


def _validate(payload: StaffIn) -> None:
    if payload.role not in POSITIONS or tier_of(payload.role) == "admin":
        raise HTTPException(status_code=422, detail="Pick a position (the Superadmin role is not set here)")
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Type the person's name")
    if payload.scope_type not in _HOME_TYPES:
        raise HTTPException(status_code=422, detail=f"scope_type must be one of {sorted(_HOME_TYPES)}")
    hq_position = tier_of(payload.role) in ("manager", "hq_staff")
    if payload.scope_type == "hq":
        if not hq_position:
            raise HTTPException(status_code=422, detail="HQ is only for HQ staff (HOD, Manager, Fleet Admin, OPEX, Recovery, Restock)")
        return
    if not payload.scope_values:
        raise HTTPException(status_code=422, detail="Pick where they are based")
    valid = {
        "region": set(REGIONS), "zone": set(ZONES), "station": {h[0] for h in HUBS.values()},
    }[payload.scope_type]
    bad = [v for v in payload.scope_values if v not in valid]
    if bad:
        raise HTTPException(status_code=422, detail=f"Not a valid {payload.scope_type}: {bad}")
    if not hq_position and payload.scope_type == "region" and tier_of(payload.role) == "station":
        raise HTTPException(status_code=422, detail="Station staff are based at a station")


def _values_json(values: list[str]) -> str | None:
    return json.dumps(values) if values else None


async def _target(email: str):
    row = await db.fetch_one(
        "SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name FROM users WHERE LOWER(email) = %s",
        (email.strip().lower(),),
    )
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    if tier_of(row[1]) == "admin":
        raise HTTPException(status_code=403, detail="Superadmin accounts are managed by the Superadmin")
    return row


@router.get("/api/staff")
async def list_staff(user: CurrentUser = Depends(get_current_user)):
    if not _can_view(user):
        raise HTTPException(status_code=403, detail="HQ staff access required")
    rows = await db.fetch_all(
        "SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name, last_seen_at FROM users ORDER BY display_name, email"
    )
    out = []
    for r in rows:
        if tier_of(r[1]) == "admin":
            continue
        home_st, home_sv = _home_of(r)
        access = (r[2], parse_scope_values(r[3]))
        out.append({
            "email": r[0], "name": plain_name(r[6]) or r[0], "position": r[1],
            "home": {"scope_type": home_st, "scope_values": home_sv},
            "access": {"scope_type": access[0], "scope_values": access[1]},
            "custom_access": _norm(*access) != _norm(home_st, home_sv),
            "last_seen_at": str(r[7]) if r[7] else None,
        })
    return {"people": out, "can_edit": _can_edit(user)}


@router.post("/api/staff")
async def add_staff(payload: StaffIn, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    _validate(payload)
    email = payload.email.strip()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Type a valid email")
    if await db.fetch_one("SELECT email FROM users WHERE LOWER(email) = %s", (email.lower(),)):
        raise HTTPException(status_code=409, detail="That email is already in the list")
    values = _values_json(payload.scope_values)
    await db.execute(
        """INSERT INTO users (email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name, invited_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (email, payload.role, payload.scope_type, values, payload.scope_type, values,
         compose_display_name(payload.name, payload.role, payload.scope_type, payload.scope_values), user.email),
    )
    return {"ok": True}


@router.patch("/api/staff/{email}")
async def update_staff(email: str, payload: StaffIn, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    row = await _target(email)
    _validate(payload)
    # The owner stays the owner; and nobody can change their own posting into something that locks them out.
    if row[0].lower() == _OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="The app owner is managed by the Superadmin")
    old_home = _home_of(row)
    old_access = (row[2], parse_scope_values(row[3]))
    values = _values_json(payload.scope_values)
    custom = _norm(*old_access) != _norm(*old_home)
    if custom:  # access was set by hand (rescue cover ...): leave it, only the posting moves
        await db.execute(
            "UPDATE users SET role=%s, home_scope_type=%s, home_scope_values=%s, display_name=%s WHERE LOWER(email) = %s",
            (payload.role, payload.scope_type, values, compose_display_name(payload.name, payload.role, payload.scope_type, payload.scope_values), row[0].lower()),
        )
    else:  # access still follows the posting
        await db.execute(
            """UPDATE users SET role=%s, scope_type=%s, scope_values=%s, home_scope_type=%s, home_scope_values=%s, display_name=%s
               WHERE LOWER(email) = %s""",
            (payload.role, payload.scope_type, values, payload.scope_type, values,
             compose_display_name(payload.name, payload.role, payload.scope_type, payload.scope_values), row[0].lower()),
        )
    return {"ok": True, "custom_access": custom}


@router.delete("/api/staff/{email}")
async def delete_staff(email: str, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    if email.strip().lower() == user.email.lower():
        raise HTTPException(status_code=400, detail="You can't remove your own access")
    row = await _target(email)
    if row[0].lower() == _OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="The app owner is managed by the Superadmin")
    await purge_user(row[0])
    return {"ok": True}


async def purge_user(email: str) -> None:
    """Remove a person and what hangs off them: the Urgent TN items they created go with them, and the ones assigned to them
    are just unassigned (V27 migration). Shared by Settings -> Users and the Staff & Org Chart tab."""
    await db.execute("DELETE FROM users WHERE LOWER(email) = %s", (email.lower(),))
    await tasklist_user_deleted(email)
    await db.execute("DELETE FROM urgent_tn_items WHERE LOWER(created_by) = %s", (email.lower(),))
    await db.execute(
        "UPDATE urgent_tn_items SET assignee_email = NULL, assignee_seen_at = NULL WHERE LOWER(assignee_email) = %s",
        (email.lower(),),
    )


def _person(email: str, role: str, name: str | None) -> dict:
    return {"email": email, "position": role, "label": POSITIONS.get(role, (role,))[0], "name": name or email}


@router.get("/api/org-chart")
async def org_chart(user: CurrentUser = Depends(get_current_user)):
    """HQ staff, then each region's manager, each zone's Region Head / RFS and each station's Station Head / Fleet Assistants --
    by where they are POSTED (not by what they can see), so someone covering another station for a week still shows at home.
    Stations with nobody in a role show up as vacant."""
    if not _can_view(user):
        raise HTTPException(status_code=403, detail="HQ staff access required")
    rows = await db.fetch_all(
        "SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name FROM users ORDER BY display_name, email"
    )
    hq, by_region, by_zone, by_station = [], {}, {}, {}
    for r in rows:
        if tier_of(r[1]) == "admin":
            continue
        person = _person(r[0], r[1], r[6])
        scope_type, values = _home_of(r)
        if scope_type in ("all", "hq"):
            hq.append(person)
        elif scope_type == "region":
            for v in values:
                by_region.setdefault(v, []).append(person)
        elif scope_type == "zone":
            for v in values:
                by_zone.setdefault(v, []).append(person)
        elif scope_type == "station":
            for v in values:
                by_station.setdefault(v, []).append(person)
    regions = []
    for region in REGIONS:
        zones = []
        for zone in ZONES_BY_REGION.get(region, []):
            stations = []
            for name, _full, z, rg in sorted(HUBS.values(), key=lambda h: h[0]):
                if z != zone or rg != region:
                    continue
                people = by_station.get(name, [])
                stations.append({
                    "name": name,
                    "heads": [p for p in people if p["position"] == "station_head"],
                    "assistants": [p for p in people if p["position"] != "station_head"],  # Fleet Assistants, and the old unspecific 'station' title
                })
            zones.append({"name": zone, "leads": by_zone.get(zone, []), "stations": stations})
        regions.append({"name": region, "managers": by_region.get(region, []), "zones": zones})
    return {"hq": hq, "regions": regions, "can_edit": _can_edit(user)}
