"""Departments (2026-10-08): who belongs to which department, kept by the Superadmin (Superadmin -> Departments).

A department has a name and the roles (positions, auth.POSITIONS) that belong to it -- "Last Mile": HOD, Manager, Fleet Admin, Region Head, RFS, Station Head, Fleet
Assistant. On the Users page a person gets a department first; the role list then offers only that department's roles (an empty list = every role). users.department
holds the name. Everyone signed in may read the list (the Users page and the Staff pages show it); only the Superadmin changes it.
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import POSITIONS, CurrentUser, get_current_user

router = APIRouter()


class DepartmentOut(BaseModel):
    name: str
    roles: list[str]
    users: int = 0


class DepartmentIn(BaseModel):
    name: str
    roles: list[str] = []


class OkOut(BaseModel):
    ok: bool = True


def _roles(raw) -> list[str]:
    if not raw:
        return []
    try:
        out = json.loads(raw) if isinstance(raw, (str, bytes)) else list(raw)
    except ValueError:
        return []
    return [r for r in out if isinstance(r, str)]


async def list_all() -> list[dict]:
    rows = await db.fetch_all("SELECT name, roles FROM departments ORDER BY sort_order, name")
    counts = {r[0]: r[1] for r in await db.fetch_all("SELECT department, COUNT(*) FROM users WHERE department IS NOT NULL GROUP BY department")}
    return [{"name": r[0], "roles": _roles(r[1]), "users": int(counts.get(r[0], 0))} for r in rows]


async def check_user_department(department: str | None, position: str) -> str | None:
    """The department name to store for a person (None = no department), or a 422 when the department does not exist or does not include that role."""
    name = (department or "").strip()
    if not name:
        return None
    row = await db.fetch_one("SELECT roles FROM departments WHERE name = %s", (name,))
    if row is None:
        raise HTTPException(status_code=422, detail=f"Unknown department '{name}' -- the Superadmin adds departments under Superadmin -> Departments")
    roles = _roles(row[0])
    if roles and position not in roles:
        label = POSITIONS.get(position, (position,))[0]
        raise HTTPException(status_code=422, detail=f"{label} is not a role of the {name} department")
    return name


def _admin(user: CurrentUser) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Superadmin access required")


def _clean(payload: DepartmentIn) -> tuple[str, list[str]]:
    name = " ".join(payload.name.split())
    if not name or len(name) > 100:
        raise HTTPException(status_code=422, detail="Give the department a name (up to 100 characters)")
    bad = [r for r in payload.roles if r not in POSITIONS]
    if bad:
        raise HTTPException(status_code=422, detail=f"Unknown role(s): {', '.join(bad)}")
    seen: list[str] = []
    for r in payload.roles:
        if r not in seen:
            seen.append(r)
    return name, seen


@router.get("/api/departments", response_model=list[DepartmentOut])
async def get_departments(user: CurrentUser = Depends(get_current_user)):
    return await list_all()


@router.post("/api/admin/departments", response_model=OkOut)
async def add_department(payload: DepartmentIn, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    name, roles = _clean(payload)
    if await db.fetch_one("SELECT name FROM departments WHERE name = %s", (name,)):
        raise HTTPException(status_code=409, detail="That department already exists")
    nxt = await db.fetch_one("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM departments")
    await db.execute(
        "INSERT INTO departments (name, roles, sort_order, created_by) VALUES (%s, %s, %s, %s)",
        (name, json.dumps(roles), int(nxt[0]) if nxt else 1, user.email),
    )
    return {"ok": True}


@router.put("/api/admin/departments/{old_name}", response_model=OkOut)
async def edit_department(old_name: str, payload: DepartmentIn, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    name, roles = _clean(payload)
    if not await db.fetch_one("SELECT name FROM departments WHERE name = %s", (old_name,)):
        raise HTTPException(status_code=404, detail="Department not found")
    if name != old_name and await db.fetch_one("SELECT name FROM departments WHERE name = %s", (name,)):
        raise HTTPException(status_code=409, detail="A department with that name already exists")
    await db.execute("UPDATE departments SET name = %s, roles = %s WHERE name = %s", (name, json.dumps(roles), old_name))
    if name != old_name:
        await db.execute("UPDATE users SET department = %s WHERE department = %s", (name, old_name))
    return {"ok": True}


@router.delete("/api/admin/departments/{name}", response_model=OkOut)
async def delete_department(name: str, user: CurrentUser = Depends(get_current_user)):
    _admin(user)
    used = await db.fetch_one("SELECT COUNT(*) FROM users WHERE department = %s", (name,))
    if used and used[0]:
        raise HTTPException(status_code=409, detail=f"{used[0]} user(s) are in this department -- move them to another department first")
    await db.execute("DELETE FROM departments WHERE name = %s", (name,))
    return {"ok": True}
