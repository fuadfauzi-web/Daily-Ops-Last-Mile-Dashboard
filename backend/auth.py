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


def parse_scope_values(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    return json.loads(raw)  # asyncmy returns JSON columns as a raw string


async def get_current_user(
    x_forwarded_email: str | None = Header(default=None, alias="X-Forwarded-Email"),
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
    return CurrentUser(
        email=row[0], role=row[1], scope_type=row[2], scope_values=parse_scope_values(row[3]), display_name=row[4]
    )


async def require_admin(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
