"""Attendance -> Emails (2026-10-10): one list of the emails of everyone who needs the Ninjavan Shift app -- PTWH and Hybrid drivers -- so the Superadmin / HOD / a Manager can copy them
straight into the Substrait access whitelist (the company only allows whitelisted emails on the dev environment until the app is public).
Stations key each person's email in (PTWH: Attendance -> PTWH -> Workers; Hybrid: Attendance -> Hybrid -> Drivers). This page only READS them. People with no email yet are listed
so the stations can be chased."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException

import attendance
import db
from attendance import _zone_region
from auth import CurrentUser, get_current_user
import hybrid_attendance

router = APIRouter()


@router.get("/api/attendance/emails")
async def list_emails(user: CurrentUser = Depends(get_current_user)):
    if user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only the Superadmin, HOD and Managers see the email list")
    today = attendance._now().date()
    rows = []
    for w in await db.fetch_all(f"SELECT {attendance._WORKER_COLS} FROM ptwh_workers ORDER BY station, full_name"):
        if not attendance.is_working(w, today):
            continue
        zone, region = _zone_region(w[4])
        rows.append({"group": "PTWH", "name": w[1], "email": w[14], "station": w[4], "zone": zone, "region": region})
    for d in await db.fetch_all(f"SELECT {hybrid_attendance._COLS} FROM hybrid_drivers ORDER BY station, name"):
        end = d[8] if (d[8] is None or isinstance(d[8], date)) else date.fromisoformat(str(d[8])[:10])
        if not d[9] or (end is not None and end < today):
            continue
        zone, region = _zone_region(d[1])
        rows.append({"group": "Hybrid", "name": d[2], "email": d[13], "station": d[1], "zone": zone, "region": region})
    return {"rows": rows, "with_email": sum(1 for r in rows if r["email"]), "without_email": sum(1 for r in rows if not r["email"])}
