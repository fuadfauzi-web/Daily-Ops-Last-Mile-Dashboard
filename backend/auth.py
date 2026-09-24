"""Identity + role lookup.

Google SSO (enabled in the Substrait portal's Access tab, restricted to the
ninjavan.co domain) makes the platform's auth proxy inject the signed-in user's email
into every request as X-Forwarded-Email. This module reads that header and looks up
what the person is allowed to see in our own `users` table — SSO answers *who*, this
answers *what they can see*.
"""
import json
from dataclasses import dataclass

from fastapi import Header, HTTPException

from db import fetch_one


@dataclass
class CurrentUser:
    email: str
    role: str  # 'admin' | 'manager' | 'region' | 'station'
    scope_type: str  # 'all' | 'region' | 'zone' | 'station'
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


def parse_scope_values(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    return json.loads(raw)  # asyncmy returns JSON columns as a raw string


_VIEW_AS_ROLES = ("admin", "manager", "region", "station")


async def get_current_user(
    x_forwarded_email: str | None = Header(default=None, alias="X-Forwarded-Email"),
    x_view_as_role: str | None = Header(default=None, alias="X-View-As-Role"),
    x_view_as_scope_type: str | None = Header(default=None, alias="X-View-As-Scope-Type"),
    x_view_as_scope_values: str | None = Header(default=None, alias="X-View-As-Scope-Values"),
    x_view_as_email: str | None = Header(default=None, alias="X-View-As-Email"),
) -> CurrentUser:
    if not x_forwarded_email:
        raise HTTPException(status_code=401, detail="Not signed in")
    row = await fetch_one(
        "SELECT email, role, scope_type, scope_values, display_name FROM users WHERE email = %s",
        (x_forwarded_email,),
    )
    if row is None:
        raise HTTPException(
            status_code=403,
            detail="Your account isn't set up yet. Ask your admin to add you.",
        )
    real_role = row[1]
    # "View As": an admin can preview a different role/scope's view (Settings ->
    # Role Tester) without changing their own account -- gated on real_role read
    # from the DB via the unspoofable SSO email above, never on the override
    # headers themselves, so only a real admin can ever trigger this.
    # "View As a specific user" (2026-09-25): act as that user's account -- their
    # email, role and scope -- so per-user features (Urgent TN, notifications,
    # feedback) can be tested end to end. Same gate: only a real admin.
    if real_role == "admin" and x_view_as_email:
        target = await fetch_one(
            "SELECT email, role, scope_type, scope_values, display_name FROM users WHERE LOWER(email) = %s",
            (x_view_as_email.strip().lower(),),
        )
        if target is None:
            raise HTTPException(status_code=422, detail="That user isn't in the user list")
        return CurrentUser(
            email=target[0], role=target[1], scope_type=target[2], scope_values=parse_scope_values(target[3]),
            display_name=target[4], is_impersonating=True, real_role=real_role,
        )
    if real_role == "admin" and x_view_as_role:
        if x_view_as_role not in _VIEW_AS_ROLES:
            raise HTTPException(status_code=422, detail=f"view-as role must be one of {_VIEW_AS_ROLES}")
        return CurrentUser(
            email=row[0],
            role=x_view_as_role,
            scope_type=x_view_as_scope_type or "all",
            scope_values=[v for v in (x_view_as_scope_values or "").split(",") if v],
            display_name=row[4],
            is_impersonating=True,
            real_role=real_role,
        )
    return CurrentUser(
        email=row[0], role=real_role, scope_type=row[2], scope_values=parse_scope_values(row[3]),
        display_name=row[4], real_role=real_role,
    )


async def require_admin(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
