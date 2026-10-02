"""Regenerate openapi.json (the app's published API description) from the FastAPI app itself.

Run from the repo root before every deploy that touches backend/:

    python scripts/gen_openapi.py

Why: the platform shows the API tab / API Library from openapi.json at the repo root, and the deploy warns when it is older than backend/. FastAPI already
knows every route, parameter and typed response, so the file is built from the running app -- nothing is invented; a route that is removed drops out.
What FastAPI can't know is a sentence saying what an endpoint is FOR, so SUMMARIES below holds those (a route without one falls back to the first
sentence of its docstring, then to the previous file's summary, then to its function name). Untyped handlers (they return plain dicts) keep a generic
200 response -- their shape is documented by the summary/description rather than guessed.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))
os.environ.pop("DATABASE_URL", None)  # importing the app must not open a database connection

import main  # noqa: E402

TAGS = [  # first matching prefix wins
    ("/api/kpi/targets", "KPI targets"), ("/api/kpi", "KPI page"), ("/api/dod", "DoD"), ("/api/thresholds", "SLA targets"),
    ("/api/followups", "Task List"), ("/api/todos", "Task List"), ("/api/tasks", "Task List"), ("/api/reminders", "Task List"),
    ("/api/urgent-tn", "Urgent TN"), ("/api/feedback", "Feedback"), ("/api/notifications", "Feedback"),
    ("/api/admin", "Admin"), ("/api/recovery", "Recovery"), ("/api/shipper", "Shipper Radar"), ("/api/cold-chain", "Shipper Radar"),
    ("/api/restock", "Shipper Radar"), ("/api/b2b", "Shipper Radar"), ("/api/attendance", "Attendance"),
]

SUMMARIES = {
    ("get", "/api/attendance/ptwh/workers"): "Attendance -> PTWH (staging): the PTWH roster for the stations in the caller's scope (IC masked except for managers / admins), the stations they may use, and whether they may edit.",
    ("post", "/api/attendance/ptwh/workers"): "Add a PTWH (name, station, IC, phone, daily rate, joined date) to a station in the caller's scope; station / region staff, managers and admins only.",
    ("patch", "/api/attendance/ptwh/workers/{worker_id}"): "Edit a PTWH or deactivate them (active=false); their history is kept. A masked IC in the body means 'unchanged'.",
    ("get", "/api/attendance/ptwh/day"): "Every active PTWH in scope with that day's clock in / out, hours, reason and source (today by default), plus the reasons list and the half-day pay rule.",
    ("post", "/api/attendance/ptwh/clock-in"): "Clock a PTWH in now (Malaysia time) with a reason; once a day per worker. This is the call the future PTWH app makes for the worker it belongs to.",
    ("post", "/api/attendance/ptwh/clock-out"): "Clock a PTWH out now; needs a clock-in today and no clock-out yet.",
    ("put", "/api/attendance/ptwh/record"): "Add or correct one day's clock in / out (HH:MM) for a PTWH -- a forgotten clock-in or missed clock-out. Stamped with who edited it; not for future days.",
    ("delete", "/api/attendance/ptwh/record/{record_id}"): "Delete one day's attendance record for a PTWH in the caller's scope.",
    ("get", "/api/attendance/ptwh/month"): "The month sheet: a row per PTWH with hours per day, workdays (1 / 0.5), open days (no clock-out) and payable, for the stations in scope.",
    ("get", "/api/processing-time"): "Processing Time (staging): the last 7 days of hour-of-day timelines (shipment arrival, scan-in, 1st attempt, success, LH arrival) per station, limited to the caller's scope.",
    ("get", "/api/daily-kpi"): "Daily KPI (staging only): today's FIFO D0, Completion D0 and Prior raw counts per station, zone and region, limited to the caller's scope. Latlong parcels excluded; resets at midnight.",
    ("get", "/api/kpi/targets"): "KPI targets for every region (the defaults plus what an admin changed), and whether the caller may edit them.",
    ("put", "/api/kpi/targets"): "Admin only: set (or put back to the default) the KPI targets per region; only differences from the defaults are stored.",
    ("get", "/api/admin/region-list"): "Admin only: where the station list comes from (published sheet link, uploaded file or the built-in snapshot), how many stations, and what differs from the built-in list.",
    ("put", "/api/admin/region-list/url"): "Admin only: set (or clear) the published-to-the-web CSV link of the Region List sheet and read it now.",
    ("post", "/api/admin/region-list/sync"): "Admin only: read the Region List sheet link (or the uploaded file) again now.",
    ("get", "/api/recovery/active-missing"): "Recovery -> Active Missing (kind=parcel) or B2B Document Active Missing (kind=b2b): the open missing tickets in the caller's access (Ship Out left out; B2B documents on their own list) with what stations answered about each.",
    ("put", "/api/recovery/active-missing/{tracking_number}"): "Anyone in access: answer for one active missing tracking number (ticket updated?, parcel found?, customer contacted / received?, liable party, remarks, check by).",
    ("get", "/api/recovery/lost-declared"): "Lost Declared This Week (view=week) or the Summary (view=summary, optionally one week), limited to the caller's access.",
    ("put", "/api/recovery/lost-declared/{tracking_number}"): "Region staff (and managers / admins): answer for one lost declared tracking number in their access.",
    ("post", "/api/recovery/lost-declared/move"): "Admin only: move everything on Lost Declared This Week to the Summary now (it also happens every Monday at 22:00).",
    ("put", "/api/kpi/settings"): "Admin only: switch a KPI setting -- for now whether the KPI pages count East Malaysia (default off; Retail, not Last Mile).",
    ("get", "/api/kpi/cisp/{kpi}/view"): "Prior / Completion D0 / D3 / Terminal T7 / FIFO D0 from the uploaded Metabase feeder file: Overview (window, regions, zones, stations against their region's target) or Date trend, limited to the caller's scope.",
    ("get", "/api/kpi/cod-rts/view"): "COD RTS RCA view (Overview, Reasons, Shippers, Drivers, Timing, Parcels, Date trend) from the uploaded RTS Analysis file, limited to the caller's scope.",
    ("get", "/api/kpi/cod-rts/tns"): "The tracking numbers behind a COD RTS selection (station, reason, shipper, driver ...), capped, limited to the caller's scope.",
    ("get", "/api/kpi/invalid-pod"): "Invalid POD RCA data -- stations, reasons and couriers by week -- from the uploaded POD validation file, limited to the caller's scope.",
    ("get", "/api/kpi/invalid-pod/tns"): "The tracking numbers behind an Invalid POD selection (station, reason, courier), limited to the caller's scope.",
    ("get", "/api/kpi/pod-performance"): "The weekly LM POD Performance view (zones, stations, drivers, OPS routes on the final result after the audit); managers and admins only.",
    ("get", "/api/kpi/weekly"): "Weekly KPI results by region / zone / station from the uploaded Dashboard WoW sheet, with every KPI's target (per-region targets included), limited to the caller's scope.",
    ("get", "/api/kpi/hybrid"): "Hybrid Productivity for the KPI page (weekly, monthly or daily) from Metabase or an uploaded file, limited to the caller's scope.",
    ("get", "/api/org-chart"): "Staff & Org Chart -- HQ staff, each region's manager, each zone's Region Head / RFS and each station's Station Head and Fleet Assistants (vacant seats show as empty), plus whether the caller can edit. HQ staff and above.",
    ("get", "/api/staff"): "Staff list for Staff & Org Chart -- every person (not the Superadmin) with position, where they are posted, what they can see (access) and whether that access was set by hand. HQ staff and above.",
    ("post", "/api/staff"): "Add a person to the staff list (posting = access to start with). Fleet Admin team and Superadmin only.",
    ("patch", "/api/staff/{email}"): "Change a person's name, position or posting. Their access moves with it unless it was set by hand. Fleet Admin team and Superadmin only.",
    ("delete", "/api/staff/{email}"): "Remove a person from the staff list and the dashboard. Fleet Admin team and Superadmin only.",
    ("get", "/api/headcount"): "Headcount per station (people posted there + TBA seats), the seats, and what the caller may do (add / remove / approve). HQ staff and above.",
    ("post", "/api/headcount/seats"): "Add a TBA headcount seat to a station. The HOD / Superadmin add it straight away; a Manager's seat is pending until the HOD approves it.",
    ("post", "/api/headcount/seats/{seat_id}/approve"): "Approve a Manager's pending headcount seat. HOD / Superadmin only.",
    ("post", "/api/headcount/seats/{seat_id}/reject"): "Reject (delete) a Manager's pending headcount seat. HOD / Superadmin only.",
    ("delete", "/api/headcount/seats/{seat_id}"): "Remove a headcount seat -- no approval needed. Manager / HOD / Superadmin.",
    ("get", "/api/management-view/capacity"): "Management View -- Hub Size, Staff headcount, PTWH and parcel capacity per station plus the parcels-per-sqft setting. Managers and admins only.",
    ("put", "/api/management-view/capacity"): "Management View -- bulk save of manager-keyed PTWH headcount and parcel capacity per station, and the parcels-per-sqft setting. Managers and admins only.",
    ("get", "/api/management-view/lh-trips"): "Management View -- line-haul trips (driver, station, arrival time, parcels) from the admin-uploaded Metabase 127512 file. Managers and admins only.",
    ("get", "/api/management-view/notes"): "Management View -- every station's backlog mitigation plan, rescue plan, deployment cost, status, owner and target date. Managers and admins only.",
    ("put", "/api/management-view/notes/{station_code}"): "Management View -- save one station's backlog mitigation plan, rescue plan, deployment cost, status, owner and target date. Managers and admins only.",
    ("get", "/api/kpi/uploads"): "The data-upload slots: what is uploaded in each, the Metabase link to download it from and whether the caller may upload it.",
    ("post", "/api/kpi/uploads/{dataset}"): "Admin only (the Recovery lost-declared files: admins and managers): upload a CSV or Excel file into a data slot (replaces the current file).",
    ("delete", "/api/kpi/uploads/{dataset}"): "Admin only (the Recovery lost-declared files: admins and managers): remove the file in a data slot.",
    ("get", "/api/kpi/metabase-check"): "Admin only: plain-English diagnosis of the app's Metabase connection (never returns the key).",
    ("get", "/api/dod"): "DoD dashboard: one Station Health snapshot per station per day for this week and last week, limited to the caller's scope.",
    ("get", "/api/cold-chain"): "Cold Chain shipper: tracking numbers in aging buckets per station / zone / region, limited to the caller's scope.",
    ("get", "/api/restock-bundles"): "Restock NXD bundles (all, or only those needing attention) per station, limited to the caller's scope.",
    ("get", "/api/b2b-compliance"): "B2B document compliance (RDO so far) counts per station and status, limited to the caller's scope.",
    ("get", "/api/b2b-compliance/tns"): "Every RDO tracking number behind one station row's count, with bundle details, uncapped, for the click-a-number modal and CSV export.",
    ("get", "/api/feedback/{feedback_id}/attachment"): "Download a feedback item's attachment (its author or an admin).",
    ("patch", "/api/feedback/{feedback_id}"): "Admin only: reply to a feedback item and / or change its status.",
    ("delete", "/api/feedback/{feedback_id}"): "Delete a feedback item.",
    ("get", "/api/urgent-tn/items"): "The Urgent TN rows the caller added or was assigned, with each tracking number's health details.",
    ("post", "/api/urgent-tn/items"): "Add an Urgent TN row and assign a PIC (rings the PIC's bell).",
    ("post", "/api/urgent-tn/reminder-ack"): "\"Got it\" on the owner reminder banner: quiet it until the next 10am / 2pm / 5pm slot.",
    ("get", "/api/urgent-tn/pic-suggestions"): "Dashboard users matching what is typed in the Urgent TN PIC box (2+ characters, 8 results, never the caller).",
    ("patch", "/api/urgent-tn/items/{item_id}"): "Update an Urgent TN row: status, note, PIC reply or acknowledgement.",
    ("delete", "/api/urgent-tn/items/{item_id}"): "Remove an Urgent TN row (also for its PIC).",
    ("post", "/api/urgent-tn/items/bulk-remove"): "Remove several of the caller's own Urgent TN rows at once.",
    ("post", "/api/urgent-tn/mark-seen"): "Opening the Urgent TN tab: drops the NEW marker for the PIC and clears the owner's \"PIC updated\" flag.",
    ("get", "/api/notifications"): "Counts behind the Urgent TN bell, the owner reminder and the Feedback badge.",
    ("get", "/api/admin/driver-details/status"): "Admin only: who uploaded the driver / rider details CSV last, when, and how many rows.",
    ("post", "/api/admin/driver-details/upload"): "Admin only: upload the driver / rider details CSV that gives Route Monitoring its Tenure column.",
    ("post", "/api/reminders/ack"): "\"Got it\": quiet a follow-up / to-do / task reminder for the caller until the next slot.",
    ("get", "/api/followups"): "The caller's Email / Gchat follow-ups (ones they created or were asked to help with).",
    ("post", "/api/followups"): "Create a follow-up (channel, subject, contact, due date, optional helper).",
    ("patch", "/api/followups/{fid}"): "Update a follow-up: its fields, status, or the helper's reply / acknowledgement.",
    ("delete", "/api/followups/{fid}"): "Delete a follow-up.",
    ("post", "/api/followups/mark-seen"): "Mark the caller's follow-up replies as seen (clears the owner's unseen flag).",
    ("get", "/api/todos"): "The caller's To Do List items.",
    ("post", "/api/todos"): "Add a to-do (title, details, due date, optional reminder).",
    ("patch", "/api/todos/{tid}"): "Update a to-do: title, details, due date, progress or reminder.",
    ("delete", "/api/todos/{tid}"): "Delete a to-do.",
    ("get", "/api/tasks"): "Tasks the caller assigned to others or was assigned (Task Assigned).",
    ("post", "/api/tasks"): "Assign a task to one or more people -- one independent row per assignee.",
    ("patch", "/api/tasks/{tid}"): "Update a task: its fields, status, or the assignee's reply / acknowledgement.",
    ("delete", "/api/tasks/{tid}"): "Delete a task.",
    ("post", "/api/tasks/mark-seen"): "Mark the caller's task updates as seen (clears the owner's unseen flag).",
}


_IDENTITY_HEADERS = {"x-forwarded-email", "x-forwarded-user", "x-view-as-role", "x-view-as-scope-type", "x-view-as-scope-values", "x-view-as-email"}


def _description() -> str:
    text = open(os.path.join(ROOT, "substrait.yaml"), encoding="utf-8").read()
    m = re.search(r"^description:\s*>?\s*\n((?:[ \t]+.*\n?)+)", text, re.M)
    text = " ".join(m.group(1).split()) if m else "Daily Ops Last Mile Dashboard"
    return text + " Every /api route answers for the signed-in user (Google SSO: the platform adds X-Forwarded-Email) and is limited to that user's role and region / zone / station scope."


def _first_sentence(doc: str) -> str:
    doc = " ".join((doc or "").split())
    doc = re.sub(r"\s*\(\d{4}-\d{2}-\d{2}[^)]*\)", "", doc)  # dated "(2026-09-25 feedback)" notes
    return re.split(r"(?<=[.!?])\s", doc, maxsplit=1)[0] if doc else ""


def build() -> dict:
    spec = main.app.openapi()
    try:
        old = json.load(open(os.path.join(ROOT, "openapi.json"), encoding="utf-8"))["paths"]
    except (OSError, ValueError, KeyError):
        old = {}
    spec["info"] = {"title": "Daily Ops Last Mile Dashboard", "version": spec.get("info", {}).get("version", "2.0.0"), "description": _description()}
    for path, ops in spec["paths"].items():
        for method, op in ops.items():
            summary = SUMMARIES.get((method, path)) or (old.get(path, {}).get(method, {}) or {}).get("summary") or _first_sentence(op.get("description", ""))
            op["summary"] = summary or op.get("summary") or f"{method.upper()} {path}"
            tag = next((t for prefix, t in TAGS if path.startswith(prefix)), "Dashboard")
            op["tags"] = [tag]
            # the identity headers are filled in by the platform's SSO gate (and the admin's Role Tester), not something a caller sends
            params = [q for q in op.get("parameters", []) if not (q.get("in") == "header" and q.get("name", "").lower() in _IDENTITY_HEADERS)]
            if params:
                op["parameters"] = params
            else:
                op.pop("parameters", None)
    return spec


if __name__ == "__main__":
    spec = build()
    missing = [f"{m.upper()} {p}" for p, ops in spec["paths"].items() for m, op in ops.items() if re.fullmatch(r"[A-Z][a-z]+( [A-Z][A-Za-z0-9]*)*", op["summary"])]
    with open(os.path.join(ROOT, "openapi.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(spec, f, indent=2, ensure_ascii=False)
        f.write("\n")
    n = sum(len(v) for v in spec["paths"].values())
    print(f"openapi.json: {len(spec['paths'])} paths, {n} operations")
    if missing:
        print("These routes have no written summary yet (function-name fallback) -- add them to SUMMARIES:")
        print("\n".join("  " + m for m in missing))
