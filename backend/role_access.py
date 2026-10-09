"""Access Setting (Superadmin): who may open and do what, per ROLE and per MODULE -- plus custom roles and Beta availability.   (2026-10-08 Role Access; 2026-10-10 Access Setting)

  level   none   the module is hidden in the menu and every API request of it is refused (403)
          view   OPEN and read only: the page opens, every change (POST / PUT / PATCH / DELETE) is refused
          edit   open AND act -- what the module allows the role to do today (its own role checks still apply)
  "*"     the role's DEFAULT for every module that has no setting of its own: edit (as today -- stored as no row), view, or none.
          "none" turns a role into an allow-list: only the modules ticked for it are reachable (a Restock role that gets the Restock modules and nothing else).
  scope   optional per module: region / zone / station values -- the data the role sees in that module is cut down to places inside them.
  Beta    a module marked beta in MODULES (a menu page still being built) can be switched ON / OFF for everyone but the Superadmin (table module_beta); OFF hides it and refuses its API.
          A Beta module is usable only when the code ships it (lib/features.js, per environment) AND Beta is ON AND the role's access allows it -- three independent gates.
  roles   built-in positions (auth.POSITIONS) plus custom roles (table access_roles): a custom role has a base TIER (hq_staff / region / station) that decides what its pages let it do and what
          data scope it takes, a department, and its own access settings. Loaded into auth.CUSTOM_POSITIONS.

Tables: role_access (V80/V87), access_roles + module_beta (V99). Only deliberate settings are stored; no row = behaviour as before. Access Setting narrows (or, with "*", allow-lists) what a role can reach
inside what its tier already allows -- a module that checks "only Managers" for itself still does. The Superadmin is never restricted, and neither is the Superadmin using View As without a role.
Enforcement is central: auth.get_current_user calls apply() for every request, looks the path up in PATHS and either refuses it or narrows the user's data scope, independently of what the menu shows.

PATHS lists, for every API path, the modules that USE it. A request passes when ANY of them allows it -- so a module that reads another module's endpoint (the Action Board reads Route Monitoring and
Shipment Details data; Restock opens tracking-number lists from the shipper drill-down) keeps working without that other module being granted. Put the prefix of any new endpoint here.
"""
import json
import logging
import re
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import auth
import db
from auth import POSITIONS, CurrentUser, get_current_user
from stations import HUBS

log = logging.getLogger("role_access")
router = APIRouter()

# (id, label, group, beta, parent) -- the menu pages (lib/sideNav.js SIDE_ITEMS); the Superadmin page itself is excluded (Superadmin only, always). `beta`: still being built, switchable on Access Setting -> Beta.
# `parent`: a sub-module of a menu category's page (Recovery, Restock) -- shown under its parent.
MODULES: list[tuple[str, str, str, bool, str | None]] = [
    ("action", "Action Board", "Act", False, None),
    ("urgent", "Urgent TN / Task List", "Act", False, None),
    ("health", "Station Health", "Last Mile Ops", False, None),
    ("dailyKpi", "Daily KPI", "Last Mile Ops", True, None),
    ("shipment", "Shipment Details", "Last Mile Ops", False, None),
    ("routed", "Route Monitoring", "Last Mile Ops", False, None),
    ("aging", "Aging Details", "Last Mile Ops", False, None),
    ("rpu", "Return Pick Up (RPU)", "Last Mile Ops", False, None),
    ("shipper", "Shipper Radar", "Last Mile Ops", False, None),
    ("rec:activemissing", "Recovery -- Active Missing", "Recovery", False, "Recovery"),
    ("rec:lostdeclared", "Recovery -- Lost Declared", "Recovery", False, "Recovery"),
    ("rec:pdcnr", "Recovery -- PDCNR", "Recovery", True, "Recovery"),
    ("rec:damage", "Recovery -- Damage", "Recovery", True, "Recovery"),
    ("rec:nolabel", "Recovery -- No Label from Hub", "Recovery", True, "Recovery"),
    ("restock:nxd", "Restock NXD", "Restock", False, "Restock"),
    ("restock:onhold", "Restock On Hold", "Restock", False, "Restock"),
    ("restock:compliance", "Document Compliance", "Restock", False, "Restock"),
    ("management", "Management View", "Dashboard", True, None),
    ("managerDash", "Manager Dashboard", "Dashboard", True, None),
    ("dod", "DoD", "Dashboard", True, None),
    ("kpi", "KPI", "Dashboard", True, None),
    ("processingTime", "Processing Time", "Dashboard", True, None),
    ("fleetadmin", "Fleet Admin", "People", True, None),
    ("staff", "Staff & Org Chart", "People", False, None),
    ("attendance", "Attendance", "People", True, None),
    ("users", "Users", "System", False, None),
    ("settings", "Settings", "System", False, None),
    ("help", "Help", "System", False, None),
]
MODULE_IDS = {m[0] for m in MODULES}
BETA_MODULES = {m[0] for m in MODULES if m[3]}
_LABEL = {m[0]: m[1] for m in MODULES}

# Custom roles may be given these base tiers (what their pages let them do, and the data scope they take). The Superadmin and Manager / HOD tiers are not handed out through a custom role.
CUSTOM_TIERS = ("hq_staff", "region", "station")
_TIER_GROUP = {"admin": "hq", "manager": "hq", "hq_staff": "hq", "region": "region", "station": "station"}


def role_keys() -> list[str]:
    """The roles the Superadmin sets access for (the Superadmin is never restricted; the old unspecific 'region' / 'station' titles are not listed)."""
    return [p for p in auth.all_positions() if p not in ("admin", "region", "station")]


# API path prefix -> the module(s) that USE it. A request is allowed when ANY of its modules allows it. Longest prefix wins.
# writes_only: only changes are checked (the endpoint's reads are shared with other pages -- the targets, the thresholds -- so a role without Settings still sees them).
# A path in none of these (me, notifications, stations, regions, thresholds reads, the tracking-number lookup, the PTWH app ...) is never restricted.
PATHS: list[tuple[str, tuple[str, ...], bool]] = [
    # the station metrics (Station Health table, Action Board, DoD's station list, Management View). The Dashboard shell no longer fetches this for the other pages.
    ("/api/dashboard", ("action", "health", "dod", "management"), False),
    ("/api/drilldown", ("action", "health"), False),
    ("/api/urgent-tn", ("urgent",), False),
    ("/api/tasks", ("urgent",), False),
    ("/api/followups", ("urgent",), False),
    ("/api/todos", ("urgent",), False),
    ("/api/reminders", ("urgent",), False),
    ("/api/daily-kpi", ("dailyKpi",), False),
    # the Action Board's columns are built from these pages' own data, so it counts as a user of them
    ("/api/shipment-details", ("shipment", "action"), False),
    ("/api/shipment-drilldown", ("shipment", "action"), False),
    ("/api/routed-view", ("routed", "action"), False),
    ("/api/old-route", ("aging", "action"), False),
    ("/api/aging-details", ("aging", "shipper", "management"), False),
    ("/api/cold-chain", ("aging", "shipper"), False),
    ("/api/hypercare", ("shipper", "aging"), False),
    ("/api/pending-yesterday-route", ("aging",), False),
    ("/api/rpu", ("rpu",), False),  # also /api/rpu-aging
    ("/api/shipper-watch", ("shipper", "action", "management"), False),
    # tracking-number lists opened from a number on these pages
    ("/api/shipper-drilldown", ("shipper", "action", "restock:nxd", "restock:onhold", "restock:compliance"), False),
    ("/api/recovery/settings", ("settings",), True),
    ("/api/recovery/active-missing", ("rec:activemissing",), False),
    ("/api/recovery/missing-details", ("rec:activemissing",), False),
    ("/api/recovery/lost-declared", ("rec:lostdeclared",), False),
    ("/api/restock-bundles", ("restock:nxd", "restock:onhold"), False),
    ("/api/b2b-compliance", ("restock:compliance",), False),
    ("/api/management-view", ("management",), False),
    ("/api/manager-dashboard", ("managerDash",), False),
    ("/api/headcount", ("management", "staff"), False),
    ("/api/dod", ("dod", "management"), False),
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


# ------------------------------------------------------------------------------------------------ the settings (cached 30 s, dropped when saved)

_cache: dict = {"at": 0.0, "rules": {}, "beta_off": set()}  # rules: position -> {module or "*" -> {"level", "scope_type", "scope_values"}}
_roles_at = 0.0
_TTL = 30.0


def invalidate() -> None:
    global _roles_at
    _cache["at"] = 0.0
    _roles_at = 0.0


async def ensure_roles(force: bool = False) -> None:
    """Load the custom roles into auth.CUSTOM_POSITIONS (cheap: at most every 30 seconds). A database hiccup / the table not being there yet leaves the last list in place."""
    global _roles_at
    if not force and time.time() - _roles_at < _TTL:
        return
    try:
        rows = await db.fetch_all("SELECT role_key, label, tier FROM access_roles")
    except Exception:  # noqa: BLE001
        _roles_at = time.time()
        return
    fresh = {k: (label, _TIER_GROUP.get(tier, "station"), tier) for k, label, tier in rows}
    auth.CUSTOM_POSITIONS.clear()
    auth.CUSTOM_POSITIONS.update(fresh)
    _roles_at = time.time()


async def _load() -> dict:
    if time.time() - _cache["at"] > _TTL:
        rows = await db.fetch_all("SELECT position, module, level, scope_type, scope_values FROM role_access")
        out: dict[str, dict[str, dict]] = {}
        for pos, module, level, stype, svals in rows:
            try:
                values = json.loads(svals) if svals else []
            except ValueError:
                values = []
            out.setdefault(pos, {})[module] = {"level": level, "scope_type": stype, "scope_values": values}
        try:
            off = {m for (m, enabled) in await db.fetch_all("SELECT module, enabled FROM module_beta") if not enabled}
        except Exception:  # noqa: BLE001 -- before the migration has run
            off = set()
        _cache.update(at=time.time(), rules=out, beta_off=off & BETA_MODULES)
    return _cache


def _rule(rules: dict, module: str) -> dict | None:
    """The setting of one module for a role, or the role's default ("*"), or None = full access as before."""
    return rules.get(module) or rules.get("*")


async def access_for(position: str | None) -> dict[str, dict]:
    """What /api/me tells the menu: for every module the role does NOT have full access to, {level, scope_type, scope_values, beta?} -- beta=True when the reason is Beta being switched off.
    The Superadmin has none. Empty = nothing restricted."""
    if not position or position == "admin":
        return {}
    try:
        c = await _load()
    except Exception:  # noqa: BLE001 -- before the migration has run, or a database hiccup: nothing is restricted
        return {}
    rules = c["rules"].get(position, {})
    out: dict[str, dict] = {}
    for m in MODULE_IDS:
        if m in c["beta_off"]:
            out[m] = {"level": "none", "scope_type": None, "scope_values": [], "beta": True}
            continue
        r = _rule(rules, m)
        if r and (r["level"] != "edit" or (r.get("scope_type") and r.get("scope_values"))):
            out[m] = {"level": r["level"], "scope_type": r.get("scope_type"), "scope_values": r.get("scope_values") or []}
    return out


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
    """Cut the user's data scope down to what is inside both their own scope and the setting's."""
    mine = _stations(user.scope_type, user.scope_values)
    theirs = _stations(scope_type, values) or set()
    allowed = theirs if mine is None else (mine & theirs)
    user.scope_type = "station"
    user.scope_values = sorted(allowed) or ["(no station)"]


async def apply(request: Request, user: CurrentUser) -> None:
    """Called for every authenticated request: refuse what the Superadmin switched off (or made read-only) for this person's role, narrow their data scope where one is set."""
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
        c = await _load()
    except Exception:  # noqa: BLE001 -- table not there yet / database hiccup: nothing is restricted
        return
    rules = c["rules"].get(user.position, {})
    beta_off = c["beta_off"]
    if not rules and not beta_off.intersection(mods):
        return
    allowed: list[str] = []
    beta_blocked = not_open = False
    for m in mods:
        if m in beta_off:
            beta_blocked = True
            continue
        r = _rule(rules, m)
        level = r["level"] if r else "edit"
        if level == "none":
            not_open = True
            continue
        if level == "view" and is_write:
            continue
        allowed.append(m)
    if not allowed:
        label = _LABEL.get(mods[0], mods[0])
        if beta_blocked and not not_open and not any((_rule(rules, m) or {}).get("level") == "view" for m in mods if m not in beta_off):
            detail = f"{label} is a Beta feature and Beta is switched off for now -- the Superadmin turns it on under Superadmin -> Access Setting -> Beta."
        elif not_open or beta_blocked:
            detail = f"Your role has no access to {label} -- the Superadmin sets this under Superadmin -> Access Setting."
        else:
            detail = f"Your role can open {label} but not change it -- the Superadmin sets this under Superadmin -> Access Setting."
        raise HTTPException(status_code=403, detail=detail)
    for m in allowed:  # a scope on the first permitting module narrows the data
        r = _rule(rules, m)
        if r and r.get("scope_type") and r.get("scope_values"):
            _narrow(user, r["scope_type"], r["scope_values"])
            break


# ------------------------------------------------------------------------------------------------ roles, for everyone (the menus that list roles)

class RoleOut(BaseModel):
    key: str
    label: str
    tier: str
    group: str
    department: str | None = None
    builtin: bool
    users: int = 0


async def _department_of() -> dict[str, str]:
    out: dict[str, str] = {}
    for name, roles in await db.fetch_all("SELECT name, roles FROM departments ORDER BY sort_order, name"):
        try:
            for r in json.loads(roles or "[]"):
                out.setdefault(r, name)
        except ValueError:
            continue
    return out


async def _roles_list(with_counts: bool = False) -> list[dict]:
    await ensure_roles()
    dept = await _department_of()
    counts = {r[0]: r[1] for r in await db.fetch_all("SELECT role, COUNT(*) FROM users GROUP BY role")} if with_counts else {}
    out = []
    for key, (label, group, tier) in auth.all_positions().items():
        if key in ("admin", "region", "station"):
            continue
        out.append({"key": key, "label": label, "tier": tier, "group": group, "department": dept.get(key), "builtin": key in POSITIONS, "users": int(counts.get(key, 0))})
    return out


@router.get("/api/roles", response_model=list[RoleOut])
async def list_roles(user: CurrentUser = Depends(get_current_user)):
    """Every role (built-in and custom) -- the Users page, the Role Tester and the pickers use this instead of a fixed list."""
    return await _roles_list()


# ------------------------------------------------------------------------------------------------ the Superadmin's API

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
    beta: bool = False
    parent: str | None = None
    beta_on: bool = True


class RoleAccessOut(BaseModel):
    modules: list[ModuleOut]
    roles: list[RoleOut]
    rules: list[RuleOut]


class RuleIn(BaseModel):
    position: str
    module: str  # a module id, or "*" = the role's default for every module without its own setting
    level: str  # none | view | edit (edit = no restriction)
    scope_type: str | None = None  # region | zone | station (optional, not for "*")
    scope_values: list[str] = []


class OkOut(BaseModel):
    ok: bool = True
    detail: str | None = None
    key: str | None = None


@router.get("/api/admin/role-access", response_model=RoleAccessOut)
async def get_role_access(user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    invalidate()
    c = await _load()
    await ensure_roles(force=True)
    return {
        "modules": [{"id": i, "label": label, "group": g, "beta": beta, "parent": parent, "beta_on": i not in c["beta_off"]} for i, label, g, beta, parent in MODULES],
        "roles": await _roles_list(with_counts=True),
        "rules": [{"position": p, "module": m, **r} for p, mods in c["rules"].items() for m, r in mods.items()],
    }


@router.put("/api/admin/role-access", response_model=OkOut)
async def save_role_access(payload: RuleIn, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    await ensure_roles()
    if payload.position not in role_keys():
        raise HTTPException(status_code=422, detail="Unknown role")
    if payload.module != "*" and payload.module not in MODULE_IDS:
        raise HTTPException(status_code=422, detail="Unknown module")
    if payload.level not in ("none", "view", "edit"):
        raise HTTPException(status_code=422, detail="Level must be none, view or edit")
    stype = payload.scope_type or None
    values = [v for v in payload.scope_values if v]
    if stype is not None:
        if payload.module == "*":
            raise HTTPException(status_code=422, detail="A scope is set per module, not on the default")
        if stype not in ("region", "zone", "station"):
            raise HTTPException(status_code=422, detail="Scope must be region, zone or station")
        known = {"region": {h[3] for h in HUBS.values()}, "zone": {h[2] for h in HUBS.values()}, "station": {h[0] for h in HUBS.values()}}[stype]
        bad = [v for v in values if v not in known]
        if bad or not values:
            raise HTTPException(status_code=422, detail="Pick at least one valid " + stype + (f" (not recognised: {', '.join(bad)})" if bad else ""))
    await db.execute("DELETE FROM role_access WHERE position = %s AND module = %s", (payload.position, payload.module))
    # "edit" is stored as no row -- unless the role's default ("*") is not edit: then a module that is meant to stay fully open needs its own explicit row
    star = await db.fetch_one("SELECT level FROM role_access WHERE position = %s AND module = '*'", (payload.position,))
    needs_row = payload.level != "edit" or stype is not None or (payload.module != "*" and star is not None and star[0] != "edit")
    if needs_row:
        await db.execute(
            "INSERT INTO role_access (position, module, level, scope_type, scope_values, updated_by, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (payload.position, payload.module, payload.level, stype, json.dumps(values) if stype else None, user.email, datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)),
        )
    invalidate()
    return {"ok": True}


class BetaIn(BaseModel):
    module: str
    enabled: bool


@router.put("/api/admin/module-beta", response_model=OkOut)
async def save_module_beta(payload: BetaIn, user: CurrentUser = Depends(get_current_user)):
    """Switch Beta availability of ONE module / sub-module on or off (nothing else changes; the feature's data and settings are untouched)."""
    _admin(user)
    if payload.module not in BETA_MODULES:
        raise HTTPException(status_code=422, detail="That module is not a Beta module")
    await db.execute("DELETE FROM module_beta WHERE module = %s", (payload.module,))
    await db.execute(
        "INSERT INTO module_beta (module, enabled, updated_by, updated_at) VALUES (%s, %s, %s, %s)",
        (payload.module, 1 if payload.enabled else 0, user.email, datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)),
    )
    invalidate()
    return {"ok": True}


# ---- custom roles (department-specific roles)

class RoleIn(BaseModel):
    label: str
    tier: str = "station"  # hq_staff | region | station: what its pages let it do and the data scope it takes
    department: str | None = None


def _slug(label: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")[:13] or "role"
    return "c_" + base


async def _set_department(role_key: str, department: str | None) -> None:
    """A role belongs to at most one department: it is listed in that department's roles and removed from the others."""
    for name, roles in await db.fetch_all("SELECT name, roles FROM departments"):
        try:
            lst = json.loads(roles or "[]")
        except ValueError:
            lst = []
        want = name == department
        has = role_key in lst
        if want and not has:
            lst.append(role_key)
        elif has and not want:
            lst.remove(role_key)
        else:
            continue
        await db.execute("UPDATE departments SET roles = %s WHERE name = %s", (json.dumps(lst), name))


def _clean_role(payload: RoleIn) -> tuple[str, str]:
    label = " ".join(payload.label.split())
    if not label or len(label) > 60:
        raise HTTPException(status_code=422, detail="Give the role a name (up to 60 characters)")
    if payload.tier not in CUSTOM_TIERS:
        raise HTTPException(status_code=422, detail="A custom role's base level must be HQ staff, Region staff or Station staff")
    return label, payload.tier


@router.post("/api/admin/roles", response_model=OkOut)
async def add_role(payload: RoleIn, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    label, tier = _clean_role(payload)
    await ensure_roles(force=True)
    if any(v[0].lower() == label.lower() for v in auth.all_positions().values()):
        raise HTTPException(status_code=409, detail="A role with that name already exists")
    if payload.department and not await db.fetch_one("SELECT name FROM departments WHERE name = %s", (payload.department,)):
        raise HTTPException(status_code=422, detail="Unknown department")
    key, n = _slug(label), 1
    while auth.is_position(key) or await db.fetch_one("SELECT role_key FROM access_roles WHERE role_key = %s", (key,)):
        n += 1
        key = f"{_slug(label)[:17]}_{n}"[:20]
    await db.execute(
        "INSERT INTO access_roles (role_key, label, tier, department, created_by, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
        (key, label, tier, payload.department, user.email, datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)),
    )
    if payload.department:
        await _set_department(key, payload.department)
    await ensure_roles(force=True)
    invalidate()
    return {"ok": True, "key": key}


@router.put("/api/admin/roles/{key}", response_model=OkOut)
async def edit_role(key: str, payload: RoleIn, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    label, tier = _clean_role(payload)
    row = await db.fetch_one("SELECT tier FROM access_roles WHERE role_key = %s", (key,))
    if row is None:
        raise HTTPException(status_code=404, detail="Custom role not found (the built-in roles cannot be edited)")
    if tier != row[0]:
        used = await db.fetch_one("SELECT COUNT(*) FROM users WHERE role = %s", (key,))
        if used and used[0]:
            raise HTTPException(status_code=409, detail=f"{used[0]} user(s) have this role -- move them to another role before changing its base level")
    if payload.department and not await db.fetch_one("SELECT name FROM departments WHERE name = %s", (payload.department,)):
        raise HTTPException(status_code=422, detail="Unknown department")
    await ensure_roles(force=True)
    if any(k != key and v[0].lower() == label.lower() for k, v in auth.all_positions().items()):
        raise HTTPException(status_code=409, detail="A role with that name already exists")
    await db.execute("UPDATE access_roles SET label = %s, tier = %s, department = %s WHERE role_key = %s", (label, tier, payload.department, key))
    await _set_department(key, payload.department)
    await ensure_roles(force=True)
    invalidate()
    return {"ok": True, "key": key}


@router.delete("/api/admin/roles/{key}", response_model=OkOut)
async def delete_role(key: str, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    if not await db.fetch_one("SELECT role_key FROM access_roles WHERE role_key = %s", (key,)):
        raise HTTPException(status_code=404, detail="Custom role not found (the built-in roles cannot be deleted)")
    used = await db.fetch_one("SELECT COUNT(*) FROM users WHERE role = %s", (key,))
    if used and used[0]:
        raise HTTPException(status_code=409, detail=f"{used[0]} user(s) have this role -- move them to another role first")
    await db.execute("DELETE FROM access_roles WHERE role_key = %s", (key,))
    await db.execute("DELETE FROM role_access WHERE position = %s", (key,))
    await _set_department(key, None)
    await ensure_roles(force=True)
    invalidate()
    return {"ok": True}
