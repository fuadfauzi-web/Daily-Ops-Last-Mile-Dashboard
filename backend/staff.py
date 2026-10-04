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
import headcount
import release
from auth import POSITIONS, CurrentUser, get_current_user, parse_scope_values, tier_of
from stations import HUBS, REGIONS, ZONES, ZONES_BY_REGION
from tasklist import on_user_deleted as tasklist_user_deleted

router = APIRouter()

_OWNER_EMAIL = "fuad.mawardi@ninjavan.co"
_SHORT = {"region_head": "RH", "rfs": "RFS", "station_head": "SH", "fleet_assistant": "FA"}  # the sheet's own abbreviations
_HOME_TYPES = {"hq", "region", "zone", "station"}


def _can_view(user: CurrentUser) -> bool:
    """The Staff list and the org chart are for everyone who is signed in (2026-10-03, the Fleet Manager) -- they say who looks after what, which is what
    anyone needs to find the right PIC. Editing stays with the Fleet Admin role. Held back on production until released (release.py)."""
    return release.STAFF_DIRECTORY


def _hq_view(user: CurrentUser) -> bool:
    """HQ tiers also see the employee ID, what each person can access and when they last signed in."""
    return user.role in ("admin", "manager", "hq_staff")


def _is_test_account(email: str) -> bool:
    """Staging test accounts (V29's tester@dashboard.invalid ...) are not people: they stay out of the staff list and the org chart."""
    return email.lower().endswith(".invalid")


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
    # Contact details (V55). None = leave what is on file; "" = clear it.
    phone: str | None = None
    employee_id: str | None = None
    # The title on the org chart ("Team Lead (Admin & Ops Support- LM)") and, for a Region Head / RFS, the station they sit at (V73). Same None / "" rule.
    job_title: str | None = None
    based_station: str | None = None


_BLANKS = {"", "tba", "n/a", "na", "-", "none", "nil"}


def _contact(value: str | None, label: str) -> str | None | bool:
    """False = not given (keep what is on file); None = clear; else the cleaned value. A sheet's "TBA" counts as empty."""
    if value is None:
        return False
    v = " ".join(value.split())
    if v.lower() in _BLANKS:
        return None
    if len(v) > 30:
        raise HTTPException(status_code=422, detail=f"{label} is too long (30 characters at most)")
    return v


def _text(value: str | None, label: str, limit: int) -> str | None | bool:
    """False = not given (keep); None = clear; else the cleaned text."""
    if value is None:
        return False
    v = " ".join(value.split())
    if not v:
        return None
    if len(v) > limit:
        raise HTTPException(status_code=422, detail=f"{label} is too long ({limit} characters at most)")
    return v


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
    rows = await db.fetch_all(
        "SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name, last_seen_at, phone, employee_id, job_title, based_station FROM users ORDER BY display_name, email"
    )
    hq = _hq_view(user)
    out = []
    for r in rows:
        if tier_of(r[1]) == "admin" or _is_test_account(r[0]):
            continue
        home_st, home_sv = _home_of(r)
        access = (r[2], parse_scope_values(r[3]))
        out.append({
            "email": r[0], "name": plain_name(r[6]) or r[0], "position": r[1],
            "home": {"scope_type": home_st, "scope_values": home_sv},
            # what a person can access and their last sign-in are for HQ tiers; everyone else sees who is posted where, a phone number and the employee ID
            "access": {"scope_type": access[0], "scope_values": access[1]} if hq else {"scope_type": home_st, "scope_values": home_sv},
            "custom_access": hq and _norm(*access) != _norm(home_st, home_sv),
            "last_seen_at": (str(r[7]) if r[7] else None) if hq else None,
            "phone": r[8] or "", "employee_id": r[9] or "", "job_title": r[10] or "", "based_station": r[11] or "",
        })
    return {"people": out, "vacant": await headcount.vacant_seats(), "can_edit": _can_edit(user), "hq_view": hq}


async def _insert(payload: StaffIn, email: str, actor: CurrentUser) -> None:
    by = actor.email
    # The Fleet Admin team adds PEOPLE, not headcount: a Station Head / Fleet Assistant (at a station), Region Head / RFS (at a zone) or Fleet
    # Admin (at HQ) can only be added where a Manager / HOD has opened a vacant seat of that kind (2026-10-02). The Superadmin is not held to this.
    places = headcount.places_for(payload.role, payload.scope_type, payload.scope_values)
    if actor.role != "admin" and places:
        short = await headcount.missing_vacant_seat(places, payload.role)
        if short:
            raise HTTPException(
                status_code=422,
                detail=f"{short} has no vacant {headcount.DESIGNATIONS[headcount.designation_of(payload.role)]} seat. "
                       "Ask a Manager or the HOD to add the headcount first (Headcount view), then fill it here.",
            )
    values = _values_json(payload.scope_values)
    phone, emp = _contact(payload.phone, "Phone"), _contact(payload.employee_id, "Employee ID")
    title, based = _text(payload.job_title, "Title", 80), _text(payload.based_station, "Based station", 100)
    await db.execute(
        """INSERT INTO users (email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name, invited_by, phone, employee_id, job_title, based_station)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (email, payload.role, payload.scope_type, values, payload.scope_type, values,
         compose_display_name(payload.name, payload.role, payload.scope_type, payload.scope_values), by, phone or None, emp or None, title or None, based or None),
    )
    if places:
        await headcount.consume_seat(places, payload.role)  # a vacant seat is used up by the real person


async def _apply_update(row, payload: StaffIn) -> bool:
    """Change a person's posting / name / contact details. Returns True when their access was set by hand and so left alone."""
    # The owner stays the owner.
    if row[0].lower() == _OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="The app owner is managed by the Superadmin")
    old_home = _home_of(row)
    old_access = (row[2], parse_scope_values(row[3]))
    values = _values_json(payload.scope_values)
    custom = _norm(*old_access) != _norm(*old_home)
    name = compose_display_name(payload.name, payload.role, payload.scope_type, payload.scope_values)
    sets, args = ["role=%s", "home_scope_type=%s", "home_scope_values=%s", "display_name=%s"], [payload.role, payload.scope_type, values, name]
    if not custom:  # access still follows the posting; if it was set by hand (rescue cover ...) it is left alone
        sets += ["scope_type=%s", "scope_values=%s"]
        args += [payload.scope_type, values]
    for col, label, raw in (("phone", "Phone", payload.phone), ("employee_id", "Employee ID", payload.employee_id)):
        v = _contact(raw, label)
        if v is not False:
            sets.append(f"{col}=%s")
            args.append(v)
    for col, label, raw, limit in (("job_title", "Title", payload.job_title, 80), ("based_station", "Based station", payload.based_station, 100)):
        v = _text(raw, label, limit)
        if v is not False:
            sets.append(f"{col}=%s")
            args.append(v)
    await db.execute(f"UPDATE users SET {', '.join(sets)} WHERE LOWER(email) = %s", (*args, row[0].lower()))
    return custom


@router.post("/api/staff")
async def add_staff(payload: StaffIn, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    _validate(payload)
    email = payload.email.strip()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Type a valid email")
    if await db.fetch_one("SELECT email FROM users WHERE LOWER(email) = %s", (email.lower(),)):
        raise HTTPException(status_code=409, detail="That email is already in the list")
    await _insert(payload, email, user)
    return {"ok": True}


@router.patch("/api/staff/{email}")
async def update_staff(email: str, payload: StaffIn, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    row = await _target(email)
    _validate(payload)
    return {"ok": True, "custom_access": await _apply_update(row, payload)}


class StaffBulkIn(BaseModel):
    rows: list[StaffIn]
    update_existing: bool = True


@router.post("/api/staff/bulk")
async def bulk_staff(payload: StaffBulkIn, user: CurrentUser = Depends(get_current_user)):
    """Paste-in of many people at once (the Staff & Org Chart tab parses the pasted sheet rows). One row failing never stops the
    others; each row comes back as added / updated / skipped / error with the reason."""
    _require_editor(user)
    if not payload.rows:
        raise HTTPException(status_code=422, detail="No rows given")
    if len(payload.rows) > 500:
        raise HTTPException(status_code=422, detail="500 rows at most in one go")
    results = []
    for r in payload.rows:
        email = r.email.strip()
        try:
            _validate(r)
            if "@" not in email:
                raise HTTPException(status_code=422, detail="Type a valid email")
            row = await db.fetch_one(
                "SELECT email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name FROM users WHERE LOWER(email) = %s",
                (email.lower(),),
            )
            if row is None:
                await _insert(r, email, user)
                results.append({"email": email, "status": "added"})
            elif not payload.update_existing:
                results.append({"email": email, "status": "skipped", "detail": "Already in the list"})
            elif tier_of(row[1]) == "admin":
                raise HTTPException(status_code=403, detail="Superadmin accounts are managed by the Superadmin")
            elif email.lower() == user.email.lower() and r.role != row[1]:
                raise HTTPException(status_code=403, detail="You can't change your own position")
            else:
                results.append({"email": email, "status": "updated", "custom_access": await _apply_update(row, r)})
        except HTTPException as exc:
            results.append({"email": email, "status": "error", "detail": exc.detail})
    count = lambda st: sum(1 for x in results if x["status"] == st)
    return {"results": results, "added": count("added"), "updated": count("updated"), "skipped": count("skipped"), "errors": count("error")}


@router.delete("/api/staff/{email}")
async def delete_staff(email: str, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    if email.strip().lower() == user.email.lower():
        raise HTTPException(status_code=400, detail="You can't remove your own access")
    row = await _target(email)
    if row[0].lower() == _OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="The app owner is managed by the Superadmin")
    # A leaver's seat stays: the Fleet Admin team does not remove headcount, so it becomes a vacant seat until a Manager / HOD removes it
    # or someone fills it.
    home_type, home_values = _home_of(row)
    await purge_user(row[0])
    leaving = headcount.places_for(row[1], home_type, home_values)
    if leaving:
        await headcount.vacate(leaving, row[1], plain_name(row[6]) or row[0], None, user.email)
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


def _station_code(station: str) -> str:
    """The 3-letter code of a station (BEN, GBG ...), the second part of its hub code."""
    for hub, (name, *_rest) in HUBS.items():
        if name == station:
            parts = hub.split("-")
            return parts[1] if len(parts) > 1 else ""
    return ""


def _person(row, org: bool = False) -> dict:
    """One person for the chart / popup. `row` is a users row (see _CHART_COLS) or, for org=True, an org_people row."""
    if org:
        pid, name, title, email, phone, emp, branch, region = row[:8]
        return {
            "email": email or "", "position": "org", "label": title or "", "title": title or "", "name": name, "phone": phone or "",
            "employee_id": emp or "", "based_station": "", "posted": region or "HQ", "source": "org", "org_id": pid, "branch": branch,
        }
    email, role, name, phone, emp, job_title, based, home_type, home_values = row
    label = POSITIONS.get(role, (role,))[0]
    where = "HQ" if home_type in ("all", "hq") else ", ".join(home_values)
    return {
        "email": email, "position": role, "label": label, "title": job_title or label, "name": plain_name(name) or email, "phone": phone or "",
        "employee_id": emp or "", "based_station": based or "", "posted": where, "source": "user", "covers": home_values if home_type == "zone" else [],
    }


_CHART_COLS = "email, role, scope_type, scope_values, home_scope_type, home_scope_values, display_name, phone, employee_id, job_title, based_station"


@router.get("/api/org-chart")
async def org_chart(user: CurrentUser = Depends(get_current_user)):
    """The organisation as a picture (2026-10-03): HQ (HOO, HOD), the Fleet Strategist, the Fleet Managers with their regions, the Admin & Support team; under each
    region its zones' Region Head / RFS, under each zone its stations with their Station Head / Fleet Assistants. People are placed by where they are POSTED, not by
    what they can see. Stations with nobody in a role show as vacant; vacant seats show for everyone."""
    rows = await db.fetch_all(f"SELECT {_CHART_COLS} FROM users ORDER BY display_name, email")
    org = await db.fetch_all("SELECT id, name, title, email, phone, employee_id, branch, region FROM org_people ORDER BY sort_no, id")
    codes = {r[0]: r[1] for r in await db.fetch_all("SELECT station, station_code FROM premises")}
    tba: dict[tuple[str, str], int] = {}  # approved vacant seats by (place, designation) -- see headcount.py
    for seat in await headcount._seats("WHERE status = 'approved'"):  # vacant seats show for everyone (2026-10-03)
        for place in seat["places"]:  # a seat that covers two zones shows in both
            tba[(place, seat["designation"])] = tba.get((place, seat["designation"]), 0) + 1
    hq, hod, support, by_region, by_zone, by_station = [], [], [], {}, {}, {}
    for r in rows:
        if tier_of(r[1]) == "admin" or _is_test_account(r[0]):
            continue
        person = _person((r[0], r[1], r[6], r[7], r[8], r[9], r[10], *_home_of(r)[:2]))
        scope_type, values = _home_of(r)
        if scope_type in ("all", "hq"):
            hq.append(person)
            if r[1] == "hod":
                hod.append(person)
            elif r[1] == "fleet_admin":
                support.append(person)
        elif scope_type == "region":
            for v in values:
                by_region.setdefault(v, []).append(person)
        elif scope_type == "zone":
            for v in values:
                by_zone.setdefault(v, []).append(person)
        elif scope_type == "station":
            for v in values:
                by_station.setdefault(v, []).append(person)
    top = {"hoo": [], "hod": hod, "strategist": [], "admin_support": support}
    for o in org:
        p = _person(o, org=True)
        if o[6] == "region_manager" and o[7]:
            by_region.setdefault(o[7], []).append(p)
        elif o[6] in top:
            top[o[6]].append(p)
    lead = next((p for p in support if (p["title"] or "").lower().startswith("team lead")), None)
    members = [p for p in top["admin_support"] if p is not lead]
    regions = []
    for region in REGIONS:
        zones = []
        stations_in_region = 0
        for zone in ZONES_BY_REGION.get(region, []):
            stations = []
            for name, _full, z, rg in sorted(HUBS.values(), key=lambda h: h[0]):
                if z != zone or rg != region:
                    continue
                people = by_station.get(name, [])
                stations.append({
                    "name": name, "code": _station_code(name), "station_id": codes.get(name) or "",
                    "heads": [p for p in people if p["position"] == "station_head"],
                    "assistants": [p for p in people if p["position"] != "station_head"],  # Fleet Assistants, and the old unspecific 'station' title
                    "tba_heads": tba.get((name, "station_head"), 0),
                    "tba_assistants": tba.get((name, "fleet_assistant"), 0),
                })
            stations_in_region += len(stations)
            zones.append({
                "name": zone, "leads": by_zone.get(zone, []), "stations": stations,
                "tba_region_heads": tba.get((zone, "region_head"), 0), "tba_rfs": tba.get((zone, "rfs"), 0),
            })
        regions.append({"name": region, "managers": by_region.get(region, []), "zones": zones, "station_count": stations_in_region})
    return {
        "hq": hq, "hq_vacant_fleet_admin": tba.get((headcount.HQ_PLACE, "fleet_admin"), 0), "regions": regions, "can_edit": _can_edit(user),
        "top": {"hoo": top["hoo"], "hod": top["hod"], "strategist": top["strategist"], "admin_lead": lead, "admin_members": members},
    }


class OrgPersonIn(BaseModel):
    name: str
    title: str | None = None
    email: str | None = None
    phone: str | None = None
    employee_id: str | None = None
    branch: str  # hoo | hod | strategist | region_manager | admin_support
    region: str | None = None


_BRANCHES = {"hoo", "hod", "strategist", "region_manager", "admin_support"}


def _org_clean(p: OrgPersonIn) -> tuple:
    name = " ".join(p.name.split())
    if not name or len(name) > 120:
        raise HTTPException(status_code=422, detail="Type the person's name (120 characters at most)")
    if p.branch not in _BRANCHES:
        raise HTTPException(status_code=422, detail=f"branch must be one of {sorted(_BRANCHES)}")
    if p.branch == "region_manager" and p.region not in REGIONS:
        raise HTTPException(status_code=422, detail="A region manager needs a region")
    def one(v, n, label):
        s = " ".join((v or "").split())
        if len(s) > n:
            raise HTTPException(status_code=422, detail=f"{label} is too long ({n} characters at most)")
        return s or None
    return (name, one(p.title, 120, "Title"), one(p.email, 255, "Email"), one(p.phone, 40, "Mobile"), one(p.employee_id, 30, "Employee ID"),
            p.branch, p.region if p.branch == "region_manager" else None)


@router.post("/api/org-people")
async def add_org_person(payload: OrgPersonIn, user: CurrentUser = Depends(get_current_user)):
    """People who are on the org chart but have no dashboard access (HOO, HOD, Fleet Strategist, the Fleet Manager of a region, Admin & Support interns)."""
    _require_editor(user)
    c = _org_clean(payload)
    await db.execute(
        "INSERT INTO org_people (name, title, email, phone, employee_id, branch, region, sort_no, updated_by, updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (*c, 999, user.email, headcount._now()),
    )
    return {"ok": True}


@router.patch("/api/org-people/{pid}")
async def update_org_person(pid: int, payload: OrgPersonIn, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    if not await db.fetch_one("SELECT id FROM org_people WHERE id = %s", (pid,)):
        raise HTTPException(status_code=404, detail="Not found")
    c = _org_clean(payload)
    await db.execute(
        "UPDATE org_people SET name=%s, title=%s, email=%s, phone=%s, employee_id=%s, branch=%s, region=%s, updated_by=%s, updated_at=%s WHERE id=%s",
        (*c, user.email, headcount._now(), pid),
    )
    return {"ok": True}


@router.delete("/api/org-people/{pid}")
async def delete_org_person(pid: int, user: CurrentUser = Depends(get_current_user)):
    _require_editor(user)
    if not await db.fetch_one("SELECT id FROM org_people WHERE id = %s", (pid,)):
        raise HTTPException(status_code=404, detail="Not found")
    await db.execute("DELETE FROM org_people WHERE id = %s", (pid,))
    return {"ok": True}
