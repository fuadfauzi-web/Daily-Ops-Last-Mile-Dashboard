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
    ("/api/restock", "Shipper Radar"), ("/api/b2b", "Shipper Radar"), ("/api/attendance", "Attendance"), ("/api/ptwh-app", "PTWH app"),
]

SUMMARIES = {
    ("get", "/api/recovery-cases/{case_type}"): "Recovery -> PDCNR / Damage / No Label from Hub (case_type pdcnr | damage | nolabel): the rows in the caller's access, the list's field layout, and whether the caller may add rows.",
    ("post", "/api/recovery-cases/{case_type}"): "Add rows to a Recovery list (Recovery staff for PDCNR / Damage, the hub for No Label from Hub): a batch of tracking numbers with a station each; ones already open are skipped.",
    ("put", "/api/recovery-cases/{case_type}/{case_id}"): "Fill or correct a Recovery list row: the fields the caller is allowed to edit (station fields for station / region staff in scope, everything for Recovery).",
    ("post", "/api/recovery-cases/{case_type}/import"): "Recovery / Superadmin: bring a pasted or uploaded CSV of the old Google Sheet into a Recovery list; rows already there (same tracking number and date) are skipped.",
    ("post", "/api/recovery-cases/{case_type}/{case_id}/file/{field}"): "Upload a photo or PDF (up to 10 MB) into a photo column of a Recovery list row, for a caller allowed to edit that column.",
    ("get", "/api/recovery-cases/{case_type}/{case_id}/file/{field}"): "Open or download (?download=1) the photo stored in a Recovery list row, for a caller who can see that row.",
    ("delete", "/api/recovery-cases/{case_type}/{case_id}"): "Recovery / Superadmin only: delete a Recovery list row (and its uploaded photos).",
    ("post", "/api/ptwh-app/login"): "PTWH app (no SSO; needs the shared X-PTWH-App-Key): log in with the username and password the station set. 5 wrong tries lock the login for 10 minutes.",
    ("get", "/api/ptwh-app/me"): "PTWH app: who is logged in, today's clock record, and whether the station's location is set (needs the PTWH's bearer token).",
    ("post", "/api/ptwh-app/clock"): "PTWH app: clock in or out. Needs a phone location within 100 m of the station's Premises latitude / longitude (or, as an emergency fallback, a station QR code made for THIS PTWH within the last 10 minutes and not used yet, PLUS a reason, which puts the clock in the audit queue as needs-review) AND a base64 JPEG selfie; the server takes the time.",
    ("get", "/api/ptwh-app/summary"): "PTWH app: the PTWH's own month -- days worked, hours, pay per day and the total before any back pay or deductions.",
    ("post", "/api/ptwh-app/change-password"): "PTWH app: change your own password (needs the current one); other sessions end and a new token is returned.",
    ("post", "/api/ptwh-app/recover"): "PTWH app: forgot password -- the recovery code given with the login sets a new password; a fresh recovery code replaces the used one.",
    ("get", "/api/attendance/ptwh/logins"): "Which PTWH in scope have a PTWH app login (username, on / off, last login) -- never the password.",
    ("post", "/api/attendance/ptwh/workers/{worker_id}/login"): "Create a PTWH's app login: a username, with a generated temporary password and recovery code returned once.",
    ("post", "/api/attendance/ptwh/workers/{worker_id}/login/reset"): "Reset a PTWH's password: a new temporary password and recovery code are returned once and old sessions end.",
    ("post", "/api/attendance/ptwh/workers/{worker_id}/login/disable"): "Switch a PTWH's app login off or on (also ends their sessions).",
    ("get", "/api/attendance/ptwh/station/{station}"): "The station screen: the station's read-only location from Fleet Admin Premises (radius fixed at 100 m), the PTWH who can work there, the QR life in minutes and the PTWH app link. No QR is shown until one is requested.",
    ("post", "/api/attendance/ptwh/station/{station}/qr"): "Make an emergency QR code for ONE chosen PTWH at the station: valid 10 minutes, works once, and replaces any code made before for that station. Returns the code, link and expiry.",
    ("post", "/api/attendance/ptwh/audit/{record_id}/flag"): "Auditor action on a PTWH app clock event: flag it as suspicious (note required), mark it checked OK, or clear the mark. A flagged event keeps its selfies past the 14-day retention.",
    ("get", "/api/attendance/ptwh/audit"): "Clock events made in the PTWH app with how each was verified, distance from the station and whether a selfie exists, for the caller's stations (up to 2 months).",
    ("get", "/api/attendance/ptwh/photo/{record_id}/{which}"): "The selfie (JPEG) taken at clock in or out, for audit; only for stations in the caller's scope.",
    ("get", "/api/attendance/ptwh/workers"): "Attendance -> PTWH (staging): the PTWH roster for the stations in the caller's scope (IC masked except for managers / admins), the stations they may use, and whether they may edit.",
    ("post", "/api/attendance/ptwh/workers"): "Add a PTWH (name, station, IC, phone, daily rate, joined date) to a station in the caller's scope; station / region staff, managers and admins only.",
    ("patch", "/api/attendance/ptwh/workers/{worker_id}"): "Edit a PTWH or deactivate them (active=false); their history is kept. A masked IC in the body means 'unchanged'.",
    ("post", "/api/attendance/ptwh/import"): "Import the PTWH DETAILS tab (CSV upload): adds only people not already in the list, for stations in the caller's scope, never overwrites. dry_run=true (default) only reports what would be added.",
    ("post", "/api/attendance/ptwh/workers/{worker_id}/decision"): "Approve or reject a NEW PTWH hire: the Region Head decides first, then a Manager / HOD (the Superadmin may do either). The final approval makes the worker active; a rejection needs a note.",
    ("post", "/api/attendance/ptwh/workers/{worker_id}/rehire"): "Bring back an ended or inactive PTWH (at the same or another station): needs the same Region Head then Manager approval as a new hire; clears the end date.",
    ("get", "/api/attendance/schedule"): "Attendance -> Schedule: one station's week -- every PTWH, Staff and Hybrid person with the shift on each of the 7 days, the shifts allowed per group and whether the caller may edit (Station / Region Heads and Managers only).",
    ("put", "/api/attendance/schedule/shift-times"): "Write down (or clear) a station's own hours for its AM, Middle or PM shift; Station Heads, Region Heads, Managers and the Superadmin for stations in scope.",
    ("put", "/api/attendance/schedule/cell"): "Set (or clear) one person's shift on one day for a station; Station Heads, Region Heads, Managers and the Superadmin only, within their scope.",
    ("post", "/api/attendance/schedule/copy-week"): "Copy one week's shifts onto another for a group at a station (replaces the target week); editors only.",
    ("get", "/api/attendance/staff/me"): "Attendance -> Staff: the signed-in Station Head / Fleet Assistant's own clock -- whether they can clock, their station(s), today's record and scheduled shift.",
    ("post", "/api/attendance/staff/clock"): "Clock the signed-in Station Head / Fleet Assistant in or out; needs the phone's location within 100 m of their station's Premises latitude / longitude; the server takes the time.",
    ("get", "/api/attendance/staff/day"): "Every Station Head / Fleet Assistant in the caller's scope with that day's scheduled shift and clock in / out (today by default).",
    ("get", "/api/attendance/staff/month"): "The staff month grid: a row per Station Head / Fleet Assistant in scope with hours per day, days worked and days still open.",
    ("post", "/api/attendance/staff/fix"): "Region Head / RFS / HOD / Manager sets a staff member's clock times for a day with a reason (max 12 h, originals kept, never your own).",
    ("get", "/api/attendance/launch"): "Settings -> Launch Timeline: every region, zone and station with its own Attendance launch date, the date it ends up with and its state today (off / test run / live); Superadmin, HOD and Managers only.",
    ("put", "/api/attendance/launch"): "Set (or clear) the Attendance launch date of one region, zone or station; the most specific rule wins and a station with no date cannot see Attendance; Superadmin, HOD and Managers only.",
    ("get", "/api/attendance/launch/me"): "Whether the caller can see Attendance at all, and which of their stations are in the test-run day before launch.",
    ("get", "/api/attendance/hybrid/drivers"): "Attendance -> Hybrid -> Drivers: the Hybrid drivers (details keyed in by station staff) at the caller's stations.",
    ("post", "/api/attendance/hybrid/drivers"): "Add a Hybrid driver (name, driver ID, phone, vehicle, joined / end date) to a station the caller may key for.",
    ("patch", "/api/attendance/hybrid/drivers/{driver_id}"): "Edit or switch off a Hybrid driver; a name change follows onto the Schedule and an end date in the past switches them off.",
    ("get", "/api/attendance/hybrid/day"): "Every Hybrid driver on the list that day at the caller's stations with the scheduled shift and what was keyed in (Present / Absent / Leave, optional clock in / out).",
    ("put", "/api/attendance/hybrid/record"): "Key in or change one Hybrid driver's day (present / absent / leave, optional times, note); up to 35 days back, never in the future; who keyed it is kept.",
    ("delete", "/api/attendance/hybrid/record"): "Take one Hybrid driver's day entry off (keyed on the wrong driver or day).",
    ("get", "/api/attendance/hybrid/month"): "The Hybrid month grid: a row per driver with Present / Absent / Leave per day and the totals.",
    ("get", "/api/ptwh-app/schedule"): "PTWH app: my schedule -- the next 14 days from the station's schedule, with the shift (code, label, hours) or null when nothing is scheduled.",
    ("get", "/api/attendance/ptwh/day"): "Every active PTWH in scope with that day's clock in / out, hours, category and source (today by default), plus the 4 categories and the half-day pay rule.",
    ("post", "/api/attendance/ptwh/clock-in"): "Clock a PTWH in now (Malaysia time) with a category (C1-C4, defaults to the worker's); once a day per worker. This is the call the future PTWH app makes for the worker it belongs to.",
    ("post", "/api/attendance/ptwh/clock-out"): "Clock a PTWH out now; needs a clock-in today and no clock-out yet.",
    ("get", "/api/attendance/ptwh/month"): "The month sheet: a row per PTWH with hours per day, workdays (1 / 0.5), open days (no clock-out), payable and pay on hold, with region / zone / station filters; voided records are left out.",
    ("get", "/api/attendance/ptwh/export"): "Month sheet in the HR sheet's layout (month id, station, name, IC, justification, RM per day 1..31) as CSV or tab-separated text, filtered by region / zone / station; Region staff and Managers only; held or open days left blank.",
    ("post", "/api/attendance/ptwh/corrections"): "Ask to correct a PTWH's clock record (edit the times, fill a missing day, or void it) with a reason; max 12 h per shift; a change within 30 minutes of the original applies at once and is logged, anything else waits for approval and holds that day's pay.",
    ("get", "/api/attendance/ptwh/corrections"): "Corrections for the caller's stations (this month and last), filtered by status, with whether the caller may decide each one.",
    ("post", "/api/attendance/ptwh/corrections/{correction_id}/decision"): "Approve or reject a waiting correction (Region Head, RFS, HOD or Manager; never the person who asked, except the Superadmin); an approval applies the change, a rejection needs a note.",
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
    ("get", "/api/station-profile"): "Station Profile picker: every Last Mile station (code, zone, region), the station to open first for the caller and whether they can edit. Every signed-in role.",
    ("get", "/api/station-profile/{station}"): "One station's profile like the Fleet Management sheet's Station tab: IDs, zone, opened-for, chat space, address, Region Head / Supervisor with their office, the station team, workmail groups, managers on duty, business hours, station totals per region and covered postcodes. Every signed-in role.",
    ("patch", "/api/station-profile/{station}"): "Set a station's Warehouse ID. Fleet Admin Team Lead and Superadmin only.",
    ("put", "/api/station-profile-info"): "Replace the workmail groups, managers on duty and business hours shown on every Station Profile. Fleet Admin Team Lead and Superadmin only.",
    ("post", "/api/station-postcodes/upload"): "Load the postcodes each station covers from a CSV / Excel file with Postcode and Station columns (stations in the file are replaced). Fleet Admin Team Lead and Superadmin only.",
    ("get", "/api/org-chart"): "The org chart as a picture -- HOO / HOD / Fleet Strategist, the Admin & Support team, each region's Fleet Manager, each zone's Region Head / Supervisor (with where they are based) and each station (code, ID, Station Head, Fleet Assistants, vacant seats), plus whether the caller can edit. Every signed-in role.",
    ("post", "/api/org-people"): "Add a person who is on the org chart but has no dashboard access (HOO, HOD, Fleet Strategist, a region's Fleet Manager, Admin & Support intern). Fleet Admin role only.",
    ("patch", "/api/org-people/{pid}"): "Change a chart-only person's name, title, contact details or place on the chart. Fleet Admin role only.",
    ("delete", "/api/org-people/{pid}"): "Take a chart-only person off the org chart. Fleet Admin role only.",
    ("get", "/api/staff"): "Staff list for Staff & Org Chart -- every person (not the Superadmin) with position, where they are posted, what they can see (access) and whether that access was set by hand. HQ staff and above.",
    ("post", "/api/staff"): "Add a person to the staff list (posting = access to start with). Fleet Admin Team Lead and Superadmin only.",
    ("post", "/api/staff/bulk"): "Paste-in of many people at once for Staff & Org Chart: each row is added, or updated if the email is already in the list; one bad row never stops the others. Returns added / updated / skipped / error per row. Fleet Admin team and Superadmin only.",
    ("get", "/api/vehicles"): "Fleet Admin -> Vehicles: every vehicle (plate, station, type, owner, driver, GDL and licence expiry with days left, fuel and TnG cards). HQ staff and above.",
    ("put", "/api/vehicles/{plate}"): "Create or change one vehicle; only the fields sent are changed and an empty value clears a field. Fleet Admin role only.",
    ("delete", "/api/vehicles/{plate}"): "Remove a vehicle from the list (it has left the fleet). Fleet Admin role only.",
    ("post", "/api/vehicles/bulk"): "Paste-in of many vehicles at once for Fleet Admin -> Vehicles: each row is saved (only the fields it has), one bad row never stops the others. Fleet Admin role only.",
    ("get", "/api/assets/inventory"): "Fleet Admin -> Assets -> Station inventory: every item of every station with good / damaged counts, per-station totals, the item groups and the standard item list. HQ staff and above.",
    ("put", "/api/assets/inventory/{station}"): "Add or change items of one station's inventory, or replace its whole list (replace=true). Fleet Admin role only.",
    ("delete", "/api/assets/inventory/{station}"): "Remove one item (query parameter item) from a station's inventory. Fleet Admin role only.",
    ("get", "/api/assets/{kind}"): "Fleet Admin -> Assets -> Fire extinguisher / Weighing scale register (kind = fire-extinguisher | weighing-scale): every record with the days left to its expiry, the station list and whether the caller can edit. HQ staff and above.",
    ("post", "/api/assets/{kind}"): "Add a fire extinguisher / weighing scale record (station by name or 3-letter code). Fleet Admin role only.",
    ("put", "/api/assets/{kind}/{record_id}"): "Change a fire extinguisher / weighing scale record; only the fields sent change and an empty value clears a field. Fleet Admin role only.",
    ("delete", "/api/assets/{kind}/{record_id}"): "Remove a fire extinguisher / weighing scale record. Fleet Admin role only.",
    ("post", "/api/assets/{kind}/bulk"): "Paste-in of many fire extinguisher / weighing scale records: a row whose station and serial number exist is updated, any other is added; one bad row never stops the others. Fleet Admin role only.",
    ("get", "/api/premises"): "Fleet Admin -> Premises: every station's address, size, launch date, business licence and tenancy dates (days left worked out), rent, deposit and document links; stations with no record yet come back blank. HQ staff and above.",
    ("put", "/api/premises/{station}"): "Create or change one station's premises record; only the fields sent are changed and an empty value clears a field. Fleet Admin role only.",
    ("post", "/api/premises/bulk"): "Paste-in of many stations at once for Fleet Admin -> Premises: each row is saved (only the fields it has), one bad row never stops the others; returns added / updated / error per row. Fleet Admin role only.",
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
