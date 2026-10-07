"""Identity + role lookup.

Google SSO (enabled in the Substrait portal's Access tab, restricted to the
ninjavan.co domain) makes the platform's auth proxy inject the signed-in user's email
into every request as X-Forwarded-Email. This module reads that header and looks up
what the person is allowed to see in our own `users` table — SSO answers *who*, this
answers *what they can see*.
"""
import json
from dataclasses import dataclass

from fastapi import Header, HTTPException, Request

from db import fetch_one


@dataclass
class CurrentUser:
    email: str
    role: str  # the ACCESS TIER, see POSITIONS: 'admin' | 'manager' | 'hq_staff' | 'region' | 'station'
    scope_type: str  # 'all' | 'region' | 'zone' | 'station' ('hq' is stored for HQ staff but read as 'all', see effective_scope)
    # 2026-09-21: a region/zone/station-scoped user can be granted more than one
    # region/zone/station (see V23 migration) -- always [] when scope_type='all'.
    scope_values: list[str]
    display_name: str | None
    # 2026-09-24: "View As" -- an admin previewing a different role/scope's view
    # without changing their own account (see get_current_user). role/scope_type/
    # scope_values above are already the VIEWED-AS ones once this is true; real_role
    # is what the signed-in person's account actually is, for the frontend's banner.
    is_impersonating: bool = False
    real_role: str = ""
    # 2026-10-02: the job title the account is stored with (users.role), e.g. 'rfs' or 'opex'. `role` above is the access tier
    # that title belongs to -- every permission check keeps reading `role`, so a new position never needs touching them.
    position: str = ""
    # 2026-10-02: where the person is POSTED (users.home_scope_*, kept by the Fleet Admin team in Staff & Org Chart) -- e.g. a Manager's dedicated region. For a Manager the scope above is
    # widened to everything (they see all of the data), but who they may manage on the Users page stays within this.
    home_scope_type: str = ""
    home_scope_values: list[str] | None = None


def parse_scope_values(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    return json.loads(raw)  # asyncmy returns JSON columns as a raw string


# 2026-10-02: roles follow the job position. users.role stores the POSITION; each position belongs to one access TIER and every
# permission check in the code reads the tier (CurrentUser.role), so adding a position is one line here.
#   HQ staff      HOD, Manager, Fleet Admin, OPEX, Recovery, Restock -- no dedicated region / zone / station (scope 'hq')
#   Region staff  Region Head (RH), Regional Fleet Supervisor (RFS)
#   Station staff Station Head (SH), Fleet Assistant (FA)
# Tiers: admin (everything) > manager (HOD / Manager: manage region + station staff, SLA + recovery settings) >
#        hq_staff (Fleet Admin / OPEX / Recovery / Restock: see every region, no settings; their own tabs come later) >
#        region (zone / region staff: manage station staff) > station.
# 'region' and 'station' are the old, unspecific titles -- still valid for people not yet given a position.
POSITIONS: dict[str, tuple[str, str, str]] = {  # position -> (label, group, tier)
    "admin": ("Superadmin", "hq", "admin"),  # stored as 'admin'; shown as Superadmin so it is not mixed up with the Fleet Admin position
    "hod": ("HOD", "hq", "manager"),
    "manager": ("Fleet Manager", "hq", "manager"),
    "fleet_admin": ("Fleet Admin", "hq", "hq_staff"),
    "opex": ("OPEX", "hq", "hq_staff"),
    "recovery": ("Recovery", "hq", "hq_staff"),
    "restock": ("Restock", "hq", "hq_staff"),
    "region_head": ("Region Head (RH)", "region", "region"),
    "rfs": ("Regional Fleet Supervisor (RFS)", "region", "region"),
    "station_head": ("Station Head (SH)", "station", "station"),
    "fleet_assistant": ("Fleet Assistant (FA)", "station", "station"),
    "region": ("Region staff", "region", "region"),
    "station": ("Station staff", "station", "station"),
}


def tier_of(position: str) -> str:
    """Access tier of a stored position. An unknown value gets the lowest tier -- never more access than it was meant to have."""
    return POSITIONS.get(position, ("", "", "station"))[2]


def effective_scope(scope_type: str) -> str:
    """'hq' (HQ staff: no dedicated region / zone / station) filters the data like 'all' -- they see every region for now."""
    return "all" if scope_type == "hq" else scope_type


def data_scope(tier: str, scope_type: str, scope_values: list[str]) -> tuple[str, list[str]]:
    """The scope the DATA is filtered by. A Manager / HOD may have a dedicated region (it places them in the org chart and the PIC
    list) but still sees everything, so for the manager tier the stored scope is widened to 'all'."""
    if tier == "manager":
        return "all", []
    return effective_scope(scope_type), scope_values


def _scope_fields(tier: str, scope_type: str, scope_values: list[str]) -> dict:
    st, sv = data_scope(tier, scope_type, scope_values)
    return {"scope_type": st, "scope_values": sv}


_VIEW_AS_ROLES = tuple(POSITIONS)


async def _get_current_user_raw(
    x_forwarded_email: str | None = Header(default=None, alias="X-Forwarded-Email"),
    x_view_as_role: str | None = Header(default=None, alias="X-View-As-Role"),
    x_view_as_scope_type: str | None = Header(default=None, alias="X-View-As-Scope-Type"),
    x_view_as_scope_values: str | None = Header(default=None, alias="X-View-As-Scope-Values"),
    x_view_as_email: str | None = Header(default=None, alias="X-View-As-Email"),
) -> CurrentUser:
    if not x_forwarded_email:
        raise HTTPException(status_code=401, detail="Not signed in")
    row = await fetch_one(
        "SELECT email, role, scope_type, scope_values, display_name, home_scope_type, home_scope_values FROM users WHERE email = %s",
        (x_forwarded_email,),
    )
    if row is None:
        raise HTTPException(
            status_code=403,
            detail="Your account isn't set up yet. Ask your admin to add you.",
        )
    real_role = tier_of(row[1])
    # "View As": an admin can preview a different role/scope's view (Settings ->
    # Role Tester) without changing their own account -- gated on real_role read
    # from the DB via the unspoofable SSO email above, never on the override
    # headers themselves, so only a real admin can ever trigger this.
    # "View As a specific user" (2026-09-25): act as that user's account -- their
    # email, role and scope -- so per-user features (Urgent TN, notifications,
    # feedback) can be tested end to end. Same gate: only a real admin.
    if real_role == "admin" and x_view_as_email:
        target = await fetch_one(
            "SELECT email, role, scope_type, scope_values, display_name, home_scope_type, home_scope_values FROM users WHERE LOWER(email) = %s",
            (x_view_as_email.strip().lower(),),
        )
        if target is None:
            raise HTTPException(status_code=422, detail="That user isn't in the user list")
        return CurrentUser(
            email=target[0], role=tier_of(target[1]), display_name=target[4], is_impersonating=True, real_role=real_role, position=target[1],
            home_scope_type=target[5] or target[2], home_scope_values=parse_scope_values(target[6] if target[5] else target[3]),
            **_scope_fields(tier_of(target[1]), target[2], parse_scope_values(target[3])),
        )
    if real_role == "admin" and x_view_as_role:
        if x_view_as_role not in _VIEW_AS_ROLES:
            raise HTTPException(status_code=422, detail=f"view-as role must be one of {_VIEW_AS_ROLES}")
        return CurrentUser(
            email=row[0],
            role=tier_of(x_view_as_role),
            home_scope_type=x_view_as_scope_type or "all",
            home_scope_values=[v for v in (x_view_as_scope_values or "").split(",") if v],
            **_scope_fields(tier_of(x_view_as_role), x_view_as_scope_type or "all", [v for v in (x_view_as_scope_values or "").split(",") if v]),
            display_name=row[4],
            is_impersonating=True,
            real_role=real_role,
            position=x_view_as_role,
        )
    return CurrentUser(
        email=row[0], role=real_role, display_name=row[4], real_role=real_role, position=row[1],
        home_scope_type=row[5] or row[2], home_scope_values=parse_scope_values(row[6] if row[5] else row[3]),
        **_scope_fields(real_role, row[2], parse_scope_values(row[3])),
    )


async def get_current_user(
    request: Request,
    x_forwarded_email: str | None = Header(default=None, alias="X-Forwarded-Email"),
    x_view_as_role: str | None = Header(default=None, alias="X-View-As-Role"),
    x_view_as_scope_type: str | None = Header(default=None, alias="X-View-As-Scope-Type"),
    x_view_as_scope_values: str | None = Header(default=None, alias="X-View-As-Scope-Values"),
    x_view_as_email: str | None = Header(default=None, alias="X-View-As-Email"),
) -> CurrentUser:
    """Who is asking, narrowed by Superadmin -> Role Access (role_access.py): a request for a module the person's role has no access to is refused here, once, for every endpoint."""
    user = await _get_current_user_raw(x_forwarded_email, x_view_as_role, x_view_as_scope_type, x_view_as_scope_values, x_view_as_email)
    import role_access  # imported here: role_access itself imports this module

    await role_access.apply(request, user)
    return user


async def require_admin(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
