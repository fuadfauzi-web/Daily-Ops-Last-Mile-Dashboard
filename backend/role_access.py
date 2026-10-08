"""Role Access (2026-10-08): the Superadmin narrows what each ROLE (position) may do in each MODULE (a menu page), on Superadmin -> Role Access.

  level   none   the page is hidden in the menu and every API request of that module is refused (403)
          view   read only: the page opens, every change (POST / PUT / PATCH / DELETE) is refused
          edit   what the module allows today (its own role checks still apply) -- stored as NO row
  scope   optional: region / zone / station values -- the data the role sees in that module is cut down to places inside them

Only deliberate overrides are stored (table role_access, V80); no row = behaviour as before. This tab narrows access, it does not widen it: a role still needs the module's own permission
(for example only a Manager sees Management View) -- 'edit' does not grant a page the role never had. The Superadmin is never restricted, and neither is the Superadmin using View As without
a role. Enforcement is central: auth.get_current_user calls apply() for every request, looks the path up in PATHS and either refuses it or narrows the user's data scope, so every module
(also the ones other sessions add later -- put their path prefix in PATHS) follows the same rules. /api/me carries the person's overrides so the menu can hide pages.
"""
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import db
from auth import POSITIONS, CurrentUser, get_current_user
from stations import HUBS

router = APIRouter()

# (id, label, group) -- the menu pages (lib/sideNav.js SIDE_ITEMS), the Superadmin page itself excluded (Superadmin only, always)
MODULES: list[tuple[str, str, str]] = [
    ("action", "Action Board", "Act"),
    ("urgent", "Urgent TN / Task List", "Act"),
    ("health", "Station Health", "Last Mile Ops"),
    ("dailyKpi", "Daily KPI", "Last Mile Ops"),
    ("shipment", "Shipment Details", "Last Mile Ops"),
    ("routed", "Route Monitoring", "Last Mile Ops"),
    ("aging", "Aging Details", "Last Mile Ops"),
    ("rpu", "Return Pick Up (RPU)", "Last Mile Ops"),
    ("shipper", "Shipper Radar", "Last Mile Ops"),
    ("rec:activemissing", "Recovery -- Active Missing", "Recovery"),
    ("rec:lostdeclared", "Recovery -- Lost Declared", "Recovery"),
    ("rec:pdcnr", "Recovery -- PDCNR", "Recovery"),
    ("rec:damage", "Recovery -- Damage", "Recovery"),
    ("rec:nolabel", "Recovery -- No Label from Hub", "Recovery"),
    ("restock:nxd", "Restock NXD", "Restock"),
    ("restock:onhold", "Restock On Hold", "Restock"),
    ("restock:compliance", "Document Compliance", "Restock"),
    ("management", "Management View", "Dashboard"),
    ("managerDash", "Manager Dashboard", "Dashboard"),
    ("dod", "DoD", "Dashboard"),
    ("kpi", "KPI", "Dashboard"),
    ("processingTime", "Processing Time", "Dashboard"),
    ("fleetadmin", "Fleet Admin", "People"),
    ("staff", "Staff & Org Chart", "People"),
    ("attendance", "Attendance", "People"),
    ("users", "Users", "System"),
    ("settings", "Settings", "System"),
    ("help", "Help", "System"),
]
MODULE_IDS = {m[0] for m in MODULES}

# The roles the Superadmin sets access for (the Superadmin is never restricted; the old unspecific 'region' / 'station' titles are not listed)
ROLES = [p for p in POSITIONS if p not in ("admin", "region", "station")]

# API path prefix -> the module(s) it belongs to. A request is allowed when ANY of its modules allows it (several menu pages read the same endpoint). Longest prefix wins.
# writes_only: only changes are checked (the endpoint's reads are shared with other pages -- the targets, the thresholds -- so a role without Settings still sees them).
# A path in none of these (me, notifications, stations, regions, thresholds reads, the PTWH app ...) is never restricted.
PATHS: list[tuple[str, tuple[str, ...], bool]] = [
    ("/api/dashboard", ("action", "health"), False),
    ("/api/drilldown", ("action", "health"), False),
    ("/api/urgent-tn", ("urgent",), False),
    ("/api/tasks", ("urgent",), False),
    ("/api/followups", ("urgent",), False),
    ("/api/todos", ("urgent",), False),
    ("/api/reminders", ("urgent",), False),
    ("/api/daily-kpi", ("dailyKpi",), False),
    ("/api/shipment-details", ("shipment",), False),
    ("/api/shipment-drilldown", ("shipment",), False),
    ("/api/routed-view", ("routed",), False),
    ("/api/aging-details", ("aging",), False),
    ("/api/old-route", ("aging",), False),
    ("/api/pending-yesterday-route", ("aging",), False),
    ("/api/rpu", ("rpu",), False),  # also /api/rpu-aging
    ("/api/shipper-watch", ("shipper",), False),
    ("/api/shipper-drilldown", ("shipper",), False),
    ("/api/recovery/settings", ("settings",), True),
    ("/api/recovery/active-missing", ("rec:activemissing",), False),
    ("/api/recovery/missing-details", ("rec:activemissing",), False),
    ("/api/recovery/lost-declared", ("rec:lostdeclared",), False),
    ("/api/restock-bundles", ("restock:nxd", "restock:onhold"), False),
    ("/api/b2b-compliance", ("restock:compliance",), False),
    ("/api/cold-chain", ("restock:nxd", "restock:onhold"), False),
    ("/api/management-view", ("management",), False),
    ("/api/manager-dashboard", ("managerDash",), False),
    ("/api/headcount", ("management", "staff"), False),
    ("/api/dod", ("dod",), False),
    ("/api/kpi/targets", ("settings",), True),
    ("/api/kpi/settings", ("settings",), True),
    ("/api/kpi", ("kpi",), False),
    ("/api/processing-time", ("processingTime",), False),
    ("/api/assets", ("fleetadmin",), False),
    ("/api/vehicles", ("fleetadmin",), False),
    ("/api/premises", ("fleetadmin", "staff"), False),
    ("/api/staff", ("staff",), False),
    ("/api/org-chart", ("staff",), False),
    ("/api/org-people", ("staff",), False),
    ("/api/station-profile", ("staff",), False),
    ("/api/station-postcodes", ("staff",), False),
    ("/api/attendance/launch", ("settings",), True),
    ("/api/attendance", ("attendance",), False),
    ("/api/admin/users", ("users",), False),
    ("/api/thresholds", ("settings",), True),
    ("/api/feedback", ("help",), False),
]
_PATHS_SORTED = sorted(PATHS, key=lambda p: -len(p[0]))
# bell / acknowledgement posts are housekeeping, not changes to the page's data
_HOUSEKEEPING = ("mark-seen", "/ack", "reminder-ack")
_WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


# shared by several pages (Documents, Management View, Recovery ...) and Superadmin / Manager only anyway: never restricted by module
_UNGATED = ("/api/kpi/uploads", "/api/kpi/upload-many", "/api/kpi/metabase-check")


def modules_for(path: str, method: str) -> tuple[tuple[str, ...], bool] | None:
    """(modules, writes_only) the request belongs to, or None when no module owns it."""
    if path.startswith(_UNGATED):
        return None
    if path.startswith("/api/recovery-cases/"):
        parts = path.split("/")
        case = parts[3] if len(parts) > 3 else ""
        return ((f"rec:{case}",), False) if f"rec:{case}" in MODULE_IDS else None
    for prefix, mods, writes_only in _PATHS_SORTED:
        if path == prefix or path.startswith(prefix + "/") or (prefix == "/api/rpu" and path.startswith("/api/rpu-")):
            return mods, writes_only
    return None


# ------------------------------------------------------------------------------------------------ the rules (cached)

_cache: dict = {"at": 0.0, "rules": {}}  # position -> {module -> {"level", "scope_type", "scope_values"}}
_TTL = 30.0


def invalidate() -> None:
    _cache["at"] = 0.0


async def _rules() -> dict[str, dict[str, dict]]:
    if time.time() - _cache["at"] > _TTL:
        rows = await db.fetch_all("SELECT position, module, level, scope_type, scope_values FROM role_access")
        out: dict[str, dict[str, dict]] = {}
        for pos, module, level, stype, svals in rows:
            try:
                values = json.loads(svals) if svals else []
            except ValueError:
                values = []
            out.setdefault(pos, {})[module] = {"level": level, "scope_type": stype, "scope_values": values}
        _cache.update(at=time.time(), rules=out)
    return _cache["rules"]


async def access_for(position: str | None) -> dict[str, dict]:
    """The overrides of one position, for /api/me (the Superadmin has none)."""
    if not position or position == "admin":
        return {}
    try:
        return dict((await _rules()).get(position, {}))
    except Exception:  # noqa: BLE001 -- before the migration has run, or a database hiccup: nothing is restricted
        return {}


def _stations(scope_type: str | None, values: list[str]) -> set[str] | None:
    """Station names a (scope_type, values) covers; None = everything."""
    if scope_type in (None, "", "all", "hq"):
        return None
    out = set()
    for name, _full, zone, region in HUBS.values():
        if (scope_type == "station" and name in values) or (scope_type == "zone" and zone in values) or (scope_type == "region" and region in values):
            out.add(name)
    return out


def _narrow(user: CurrentUser, scope_type: str, values: list[str]) -> None:
    """Cut the user's data scope down to what is inside both their own scope and the override's."""
    mine = _stations(user.scope_type, user.scope_values)
    theirs = _stations(scope_type, values) or set()
    allowed = theirs if mine is None else (mine & theirs)
    user.scope_type = "station"
    user.scope_values = sorted(allowed) or ["(no station)"]


async def apply(request: Request, user: CurrentUser) -> None:
    """Called for every authenticated request: refuse what the Superadmin switched off for this person's role, narrow their data scope where one is set."""
    if user.position in ("", "admin") or user.role == "admin":
        return
    hit = modules_for(request.url.path, request.method)
    if hit is None:
        return
    mods, writes_only = hit
    is_write = request.method in _WRITE_METHODS and not any(h in request.url.path for h in _HOUSEKEEPING)
    if writes_only and not is_write:
        return
    try:
        rules = (await _rules()).get(user.position, {})
    except Exception:  # noqa: BLE001 -- table not there yet / database hiccup: nothing is restricted
        return
    if not rules:
        return
    allowed: list[str] = []
    refused_none = True
    for m in mods:
        r = rules.get(m)
        level = r["level"] if r else "edit"
        if level == "none":
            continue
        refused_none = False
        if level == "view" and is_write:
            continue
        allowed.append(m)
    if not allowed:
        label = next((lbl for mid, lbl, _g in MODULES if mid == mods[0]), mods[0])
        raise HTTPException(
            status_code=403,
            detail=(f"Your role has no access to {label}" if refused_none else f"Your role can only view {label}, not change it") + " -- the Superadmin sets this under Superadmin -> Role Access.",
        )
    for m in allowed:  # a scope on the first permitting module narrows the data
        r = rules.get(m)
        if r and r.get("scope_type") and r.get("scope_values"):
            _narrow(user, r["scope_type"], r["scope_values"])
            break


# ------------------------------------------------------------------------------------------------ the Superadmin tab's API

def _admin(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Superadmin access required")


class RuleOut(BaseModel):
    position: str
    module: str
    level: str
    scope_type: str | None = None
    scope_values: list[str] = []


class ModuleOut(BaseModel):
    id: str
    label: str
    group: str


class RoleOut(BaseModel):
    key: str
    label: str
    tier: str


class RoleAccessOut(BaseModel):
    modules: list[ModuleOut]
    roles: list[RoleOut]
    rules: list[RuleOut]


class RuleIn(BaseModel):
    position: str
    module: str
    level: str  # none | view | edit (edit = no restriction)
    scope_type: str | None = None  # region | zone | station (optional)
    scope_values: list[str] = []


class OkOut(BaseModel):
    ok: bool = True


@router.get("/api/admin/role-access", response_model=RoleAccessOut)
async def get_role_access(user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    _cache["at"] = 0.0
    rules = await _rules()
    return {
        "modules": [{"id": i, "label": label, "group": g} for i, label, g in MODULES],
        "roles": [{"key": p, "label": POSITIONS[p][0], "tier": POSITIONS[p][2]} for p in ROLES],
        "rules": [{"position": p, "module": m, **r} for p, mods in rules.items() for m, r in mods.items()],
    }


@router.put("/api/admin/role-access", response_model=OkOut)
async def save_role_access(payload: RuleIn, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    if payload.position not in ROLES:
        raise HTTPException(status_code=422, detail="Unknown role")
    if payload.module not in MODULE_IDS:
        raise HTTPException(status_code=422, detail="Unknown module")
    if payload.level not in ("none", "view", "edit"):
        raise HTTPException(status_code=422, detail="Level must be none, view or edit")
    stype = payload.scope_type or None
    values = [v for v in payload.scope_values if v]
    if stype is not None:
        if stype not in ("region", "zone", "station"):
            raise HTTPException(status_code=422, detail="Scope must be region, zone or station")
        known = {"region": {h[3] for h in HUBS.values()}, "zone": {h[2] for h in HUBS.values()}, "station": {h[0] for h in HUBS.values()}}[stype]
        bad = [v for v in values if v not in known]
        if bad or not values:
            raise HTTPException(status_code=422, detail="Pick at least one valid " + stype + (f" (not recognised: {', '.join(bad)})" if bad else ""))
    if payload.level == "edit" and stype is None:
        await db.execute("DELETE FROM role_access WHERE position = %s AND module = %s", (payload.position, payload.module))
    else:
        from datetime import datetime, timezone

        await db.execute("DELETE FROM role_access WHERE position = %s AND module = %s", (payload.position, payload.module))
        await db.execute(
            "INSERT INTO role_access (position, module, level, scope_type, scope_values, updated_by, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (payload.position, payload.module, payload.level, stype, json.dumps(values) if stype else None, user.email, datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)),
        )
    invalidate()
    return {"ok": True}
