// "What's new" (Guide -> What's new). Every build that changes something a user can see gets
// an entry HERE, at the top, in the same change (2026-09-25 feedback: keep this current).
//
//  * The page is a WEEKLY summary: entries are grouped into Monday-Sunday weeks by `date`
//    (yyyy-mm-dd); the current week is shown first and older weeks stay collapsed behind
//    "Show earlier weeks". Nothing needs deleting -- a new entry just lands in the current week.
//  * `feature` (optional): a key in lib/features.js -- the entry only shows in a build that
//    ships that feature, so production never advertises something it doesn't have yet.
//  * `minRank` (optional): 0 station, 1 region, 2 manager, 3 admin -- only shown to that role
//    and above (a station user isn't told about admin-only tools).
//  * `audience` (optional): a list of positions (e.g. ["hod", "manager"]) -- only those positions (and the Superadmin) see it; for things only some
//    people of a tier can use. `area` (optional): which category card it sits in (Act / Monitor / Recovery / Dashboard / People / System); guessed from the title if left out.
//  * `type` (optional): "new" | "improved" | "fixed" -- the tag on its What's new card; guessed from the title if left out (a title starting with "New" is New, one saying fix / no longer / always adds up is Fixed, the rest Improved).
//  * `wide` (optional): only shown to someone whose scope covers more than one station (a
//    station-scoped user is never told about region / zone level features they can't use).
//  So "What's new" only ever lists what applies to the viewer's role AND scope.
//  * Write for the people using the dashboard: what changed and where to find it.
//  * IMPORTANT CHANGES ONLY (2026-09-25 feedback): new features, changed behaviour, things that
//    affect what someone sees or can do. Do NOT log cosmetic tweaks -- a moved box, spacing, text
//    size, wording, a small fix nobody would notice.
export const CHANGELOG = [
  {
    date: "2026-10-08",
    title: "New: Manager Dashboard (HOD and Fleet Manager)",
    feature: "managerDashboard",
    minRank: 2,
    type: "new",
    area: "Dashboard",
    points: [
      "A new Manager Dashboard page in the Dashboard (Last Mile) group, built from the South Management sheet. Only HOD and Fleet Manager see it; a Fleet Manager sees their own region, an HOD every region.",
      "Station Capacity: plan headcount and plan volume per station (typed in the page, no more sheet), staff posted, average fresh / routed per day, success rate, productivity and today's attendance.",
      "Driver Strength: drivers and riders required (typed in), drivers by type HD / HR / ID / IR, fill and how many to hire, active in the last 2 / 4 weeks, resignations, attendance against strength.",
      "My Workspace: your own links with due dates and a notes page -- private to you.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Superadmin -> Role Access: control what each role can open and change",
    type: "new",
    area: "System",
    minRank: 3,
    points: [
      "A new Role Access tab: every module against every role, each set to Edit, View (read only) or None (hidden and refused). An optional scope limits the data a role sees in a module to a region, zones or stations.",
      "It is enforced for every page at once, so the Superadmin's choices apply to all of them; a role with View only sees a \"View only\" note on the page and gets a clear message if it tries to change something.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Action Board: every metric by default, copy as an image, new metrics",
    feature: "boardViews",
    type: "improved",
    points: [
      "The Action Board now opens with every metric instead of three. Remove the ones you don't need, or pick them again with + Add metric.",
      "Copy image (next to Export CSV) puts the table on the clipboard as a picture, exactly as you arranged it, to paste straight into a chat. The table is now only as wide as its columns.",
      "My views can be renamed (✎) and put in your own order (‹ › or drag).",
      "Shipper SLA Warning and Breach now also count Soda Express and Zalora NXD parcels, and are split by status: OVFD (On Vehicle for Delivery) and AASH (Arrived at Sorting Hub).",
      "New metrics: Aging Delivery >3 days, Aging ATS >7 days, RPU Aging >5 days, Active Missing to Answer and Lost Declared to Answer (cases the station has not answered yet).",
      "Age >3 is now a warning at 5% of In Hub with at least 15 parcels, and critical at 5% with at least 30 parcels. Settings -> Station Metric Targets has two new columns for the minimum number of parcels.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Task List: CC on assigned tasks, Clear all not found, 3-hour auto-clear",
    feature: "taskList",
    type: "improved",
    points: [
      "Task Assigned has a CC box like an email: the people you CC see the task under CC'd to me (view only). You can change the CC list when you edit the task.",
      "Urgent TN has a Clear all not found button that removes every Not found tracking number of yours in one click.",
      "A Not found tracking number is now removed automatically after 3 hours (it used to be 1 day).",
    ],
  },
  {
    date: "2026-10-08",
    title: "Metabase files are pulled automatically",
    type: "new",
    area: "System",
    minRank: 3,
    points: [
      "The KPI and Recovery files that used to be downloaded from Metabase and uploaded by hand (Prior, Completion, Terminal, FIFO, COD RTS, POD validation, Hybrid, Lost Declared, line-haul trips) are now pulled by the app through the Metabase API. The upload boxes on the KPI pages are gone -- each page has a Data source panel showing when its files were last pulled.",
      "Superadmin -> Documents: every file has a schedule (every day at a time, every few hours, weekly or monthly -- Malaysia time), a Pull now button and a status. The default is every day at 06:00 (Metabase refreshes then); Lost Declared Tuesday to Sunday. The questions must sit in the Metabase Last Mile collection.",
      "A failed or overdue pull puts a bell on Documents; the old data stays in use until the next successful pull.",
    ],
  },
  {
    date: "2026-10-08",
    title: "DoD: LH Timing sorts, category bands, Copy image",
    feature: "dod",
    type: "improved",
    area: "Dashboard",
    points: [
      "In the DoD Daily View, click the LH Timing header to sort by the latest line-haul arrival of the day (stations with no trip stay at the bottom).",
      "The columns now sit under category bands -- Location, Shipment Details, Station Health, Route Monitoring -- like the Station Health tab.",
      "New Copy image button: puts the table as you see it (sort, rows, change vs the day before) on your clipboard as a picture, to paste straight into a chat.",
      "The Dashboard group in the side menu is now called Dashboard (Last Mile).",
    ],
  },
  {
    date: "2026-10-08",
    title: "Lost Declared: liable party shows Recovered once the parcel is back",
    points: [
      "In Recovery -> Lost Declared (This Week and Summary), a tracking number whose current status is anything other than Cancelled (Completed, Returned to Sender ...) now shows Recovered as its liable party, set by the app. It cannot be changed by hand; if the status is Cancelled, or there is no status on file yet, the liable party stays what the region picked. A Recovered tracking number counts as Recovered -- neither answered nor waiting for an answer: there is a Recovered card on top and a Recovered column in the by-station table, and 'to answer only' leaves them out.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Users: Department, and a region / zone filter",
    type: "new",
    area: "System",
    minRank: 1,
    points: [
      "Every person now has a Department (Last Mile, Restock, Recovery). Pick the department when you add someone and the role list shows only that department's roles. People already set up were placed in their department.",
      "The user list has Department, Region and Zone filters: pick East Coast and you see everyone whose access covers a station of East Coast (its region users, zone users and station users). Tick \"Include HQ / nationwide\" to add the people who see everything.",
      "The Superadmin keeps the department list (and each department's roles) under Superadmin -> Departments.",
    ],
  },
  {
    date: "2026-10-09",
    title: "Attendance (Beta, staging only): staff clock-in flags, break times, Hybrid clean-up, frozen table headers",
    feature: "attendance",
    points: [
      "Staff flags: a Station Head or Fleet Assistant scheduled for an AM / Middle / PM shift who hasn't clocked in 30 minutes after the station's shift start, or hasn't clocked out an hour after the shift ended, is flagged. Region Heads, RFS and Managers get an alert on the Attendance tab and mark each flag handled with a note (Staff -> Flags). Late clock-ins and staff days under 8 hours show too.",
      "Staff Today and Month sheet now have Region / Zone / Station filters for Region Heads and Managers (a station only sees its own hub), and the table headers stay put while you scroll. The Hybrid tables got the same.",
      "Schedule: the order is now Staff, Hybrid, PTWH. Each shift can have its own break time (Shift times box). A Hybrid driver has no shift -- mark the day Working (with the time they clock in), Off or Leave.",
      "Hybrid: the driver list now comes from the Metabase question Active Driver Details every morning, so stations no longer add drivers by hand. A driver past their end date (update it in Ninja Van Operator -> Driver Strength) is switched off the next morning, kept for a month, then removed for good with their attendance.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Attendance (Beta, staging only): test-run entries are cleared at launch",
    feature: "attendance",
    points: [
      "What a station keys in during the test run (attendance, corrections, photos) is cleared once, when the station reaches its launch date, so it starts clean. The PTWH, drivers, schedule and shift hours stay.",
    ],
  },
  {
    date: "2026-10-08",
    title: "New Station profile in Staff & Org Chart, and the Staff list is now for the Fleet Admin team, HOD and Managers (staging only)",
    points: [
      "Station profile (inside Staff & Org Chart): pick a station and see its zone, Station ID, Warehouse ID, how long it has been open, Google Chat space, address, its Fleet Manager, Region Head and Region Supervisor (with the station they are based at), its team, workmail groups, managers on duty, business hours, how many Last Mile stations each region has, and the postcodes it covers. Every role can open it.",
      "The Staff list and Headcount tabs inside Staff & Org Chart are for the Fleet Admin team, the HOD, the Managers and the Superadmin (Headcount: HOD, Manager and Fleet Admin). The Org chart and its Details list stay open to every role.",
      "Only the Fleet Admin Team Lead (and the Superadmin) edits the staff list, the people on the chart who have no dashboard access, the Warehouse ID, the Station Profile boxes and the postcodes. Operation Support (LM) and Admin (LM) can read.",
    ],
  },
  {
    date: "2026-10-04",
    title: "Staff & Org Chart: the org chart now looks like the org picture, with details on click (staging only)",
    points: [
      "Org chart is now drawn like the Fleet Management org pictures: HQ on top (HOO, HOD, Fleet Strategist, Last Mile Operation with the four Fleet Managers, LM Administrator & Support), then one block per region with its Fleet Manager, and each zone's Region Head, Region Supervisor and stations (3-letter code boxes, down to station level). Vacant seats show as *Vacant.",
      "Click any person (or a station box) to see their details -- position, where they are posted and based, email, mobile and employee ID. Everyone can click; nobody edits from the chart any more.",
      "View settings: Everything, Region only or Station only (your own region / station comes first and is remembered), and a search for a station, zone, region or person.",
      "Details list is now a table like the sheet: Station ID, Zone, Station, Designation, Name, Email, Mobile, Employee ID, plus the station a Region Head / Supervisor is based at. Search and filter by region or vacant seats.",
      "The Manager position is now called Fleet Manager. The Fleet Admin team can also keep a title shown on the chart and a based station per person, and add people who are on the chart but have no dashboard access (HOO, HOD, Fleet Strategist, interns) under the chart.",
    ],
  },
  {
    date: "2026-10-05",
    title: "Attendance (Beta, staging only): Launch Timeline, Hybrid attendance keyed in by station staff, half day by shift",
    type: "new",
    feature: "attendance",
    points: [
      "Attendance now opens on the Staff tab. It goes live in batches: a Superadmin, HOD or Manager sets a launch date per region, zone or station in Settings -> Launch Timeline. A station with no date can't see Attendance; from the day before its date it can see it and test-run it.",
      "Attendance -> Hybrid: station staff key in the Hybrid drivers' details (name, driver ID, phone, vehicle, joined / end date) and each day's attendance (Present / Absent / Leave, optional times) by hand for now. The Schedule's Hybrid list comes from these drivers.",
      "A PTWH half day is now picked as Half day AM, Middle or PM, and starts when that shift starts at the station.",
    ],
  },
  {
    date: "2026-10-04",
    title: "Schedule (Beta, staging only): Middle shift, and each station sets its own shift hours",
    feature: "attendance",
    points: [
      "The Schedule now has a Middle shift next to AM and PM (PTWH and Staff).",
      "Each station writes down its own AM / Middle / PM hours in the new Shift times box above the grid (Station Heads, Region Heads and Managers can set them). Those hours show next to the shift in the PTWH app's My schedule and on the Staff clock.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Recovery: PDCNR, Damage and No Label from Hub (Beta, staging only)",
    type: "new",
    points: [
      "Three of the recovery team's Google Sheets are now lists in Recovery. Recovery adds the rows (paste many tracking numbers at once, optionally with the station); the station fills in the rest of its columns; the row closes when the last step is done. PDCNR: station / Region Head give the outcome, proof of delivery link, driver and action, then Recovery validates. Damage: Recovery gives an instruction, the station answers with the action it took. No Label from Hub: the hub adds the entry (what the Google Form did) and Recovery sets the outcome. Each list shows only your own stations, with Open / Closed / All and a CSV export. Beta: still being agreed with the Recovery team, so only the Superadmin, Manager / HOD and Recovery can see the three lists for now (the rest of the roles get them once the Recovery team signs off). Inside, only Recovery and the Superadmin have full access; managers fill the station columns only. Photos are real uploads that anyone with access can download (or paste a Google Drive link instead), and Recovery can bring in the old sheets with Import from old sheet.",
    ],
  },
  {
    date: "2026-10-04",
    title: "Attendance (Beta, staging only): Station Heads and Fleet Assistants clock in and out",
    type: "new",
    feature: "attendance",
    points: [
      "Attendance -> Staff: Station Heads and Fleet Assistants clock in and out with My clock, signed in with their Ninja Van Google account (no extra login or selfie). They must be within 100 m of their station (the Fleet Admin Premises location); use the dashboard on a phone.",
      "Today shows everyone in your scope with their scheduled shift, clock in / out and how far from the station; Month sheet is a grid of hours per day, days worked and days still open. A Region Head, RFS or Manager can fix a forgotten or wrong time with a reason -- the original is kept.",
    ],
  },
  {
    date: "2026-10-04",
    title: "Attendance (Beta, staging only): QR on request, end dates, controlled corrections, HR export",
    minRank: 1,
    feature: "attendance",
    points: [
      "The station QR is now made on request for ONE chosen PTWH: it lasts 10 minutes, works once (clocking out needs a new one), and asking for another replaces the last. No QR is shown until a station asks for it.",
      "PTWH have an End date instead of the Active tick. An ended PTWH can't log in; a PTWH with no clock in or out for 1 month goes inactive, and an inactive PTWH is cleaned up after 2 months (IC, phone, selfies and login removed; name and pay history kept). Bringing someone back (even at another station) needs the Region Head then Manager approval again, and the same IC can't be added twice.",
      "Clock records can no longer be edited or deleted directly. Use Correct on a day: a change within 30 minutes applies at once and is logged; anything bigger, a missing day or a void waits in the new Corrections view for a Region Head, RFS or Manager (never the person who asked), and that day's pay is on hold until then. A shift can be 12 hours at most.",
      "Month sheet: Region / Zone / Station filters, and Export CSV (or Copy) in the HR sheet's layout for what is filtered. Category: the shift suggestions are gone. Audit: a day can be reviewed only after the PTWH has clocked in and out.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Attendance (Beta, staging only): Schedule, PTWH hiring approval, pay on hold for QR clocks, review alerts",
    type: "new",
    minRank: 1,
    feature: "attendance",
    points: [
      "New Schedule tab: Station Heads, Region Heads and Managers key in who works which shift each week for PTWH, Staff and Hybrid drivers (Copy last week included). Everyone else reads it, and each PTWH sees their own next two weeks in the PTWH app.",
      "A new PTWH hire now needs the Region Head's approval and then a Manager's before they can work, be scheduled or get an app login. Approvers get a banner and a count on the Attendance tab. A Manager loads the existing PTWH list once (Import existing PTWH).",
      "The pay for a QR (emergency) clock, or one an auditor flagged, is on hold until an auditor marks it Checked OK. Station Heads, Region Heads and Managers see a banner and a count on the Attendance tab while any are waiting.",
      "QR clock evidence is kept 5 weeks and cleared once a month, in week 2 (the 8th-14th). The PTWH app link now sits at the top of the PTWH tab with a Copy button.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Attendance (Beta, staging only): PTWH clock in by location only, QR is an emergency, stations use their Premises location",
    feature: "attendance",
    points: [
      "PTWH clock in and out by location: within 100 m of the station's latitude / longitude from Fleet Admin -> Premises. The 100 m is the same for every station and station users can't change it; the Station QR page now just shows the location (read-only).",
      "The hourly station QR is an emergency fallback only: in the PTWH app a PTWH can scan it in the app (or type the code) when their phone location doesn't work, but must give a reason, and every QR clock goes to Audit as \"Needs review\" with that reason until someone marks it Checked OK or flags it.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Data upload: fewer files, fewer clicks",
    feature: "kpiDashboard",
    minRank: 3,
    points: [
      "Hybrid Productivity now needs 3 files instead of 7: the weekly, monthly and daily Metabase questions each carry everything (volume, sizing, the fixed Attendance and each driver's start date), so the separate driver-list and sizing files are gone.",
      "Every Data upload box has a drop zone: select or drag all your downloaded CSVs at once and each is matched to its KPI file by its columns (Prior and FIFO D0 by the file name). A file it can't place is listed with the reason and the rest still load.",
      "One Metabase page now holds every feeder question -- the Data upload box links to it, so you open one link instead of one per file.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Attendance (Beta, staging only): PTWH app logins, hourly station QR, 100 m location check and selfie audit",
    type: "new",
    feature: "attendance",
    points: [
      "Workers -> Create login gives a PTWH a username and a temporary password (plus a recovery code) for the new PTWH app, where they clock themselves in and out. They can change their password themselves; forgot it -> recovery code, or Reset password here.",
      "Station QR: a code that changes every hour for the station screen, and the station's location -- a PTWH within 100 m can clock in or out by location instead. Either way they take a selfie with the station behind them.",
      "Audit: every clock made in the PTWH app with how it was verified (QR / location and metres from the station) and the selfie, for station, RH, RFS, managers, HOD and Fleet Admin within their scope. An auditor can flag a clock-in as suspicious (with a note) or mark it checked OK. Selfies are deleted after 14 days, flagged ones are kept until cleared.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Recovery is now two groups: Active Missing and Lost Declared",
    points: [
      "Recovery has two buttons at the top. Active Missing holds Missing Details, Active Missing and B2B Document Active Missing; Lost Declared holds Lost Declared This Week and Lost Declared Summary. Nothing inside the pages changed -- they are just grouped.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Attendance (Beta, staging only): import the PTWH list from the sheet, and PTWH categories C1-C4",
    minRank: 1,
    feature: "attendance",
    points: [
      "Workers -> Import from sheet reads the PTWH DETAILS tab (downloaded as CSV): it shows what will be added first, only adds people who are not in the list yet, and never overwrites -- stations can edit anyone afterwards.",
      "Every PTWH day now has a category instead of a free-text reason: C1 Core Shift, C2 Vacancy Cover, C3 Leave & Rotation Cover, C4 Volume Surge / PM Support. Each worker has a default that pre-fills it; the Month sheet shows cost by category and flags anyone over a category's max days.",
    ],
  },
  {
    date: "2026-10-02",
    title: "New: Attendance tab (Beta, staging only) -- PTWH clock in / clock out, month sheet and payable",
    feature: "attendance",
    points: [
      "PTWH attendance moves from the Google Sheet into the dashboard: clock a PTWH in when they arrive and out when they leave, and the day's pay is worked out from the hours (6h or more = full day, less = half day).",
      "Today, Month sheet (the old grid, with workdays, payable and CSV export) and Workers (the PTWH roster and daily rate). You only see and record for the stations in your scope. Staff and Hybrid attendance will join the same tab later.",
    ],
  },
  {
    date: "2026-10-02",
    title: "New: Processing Time tab (Beta, staging only) -- when work lands at the station, hour by hour, for the past 7 days",
    feature: "processingTime",
    points: [
      "A new tab next to Shipment Details showing the hour-of-day pattern of shipment arrival, scan-in, 1st attempt, success and line-haul arrival, per station, for the past 7 days (pick a day or add all 7 up), with the same Region / Zone / Station filters and Count / % share switch as the Shipment Details chart. History starts building from the first refresh after it went live. Driver Inbound and the Hybrid / Independent driver split are not in it yet.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Superadmin, Managers see everything, and the PIC list now follows the Staff & Org Chart (staging only)",
    minRank: 2,
    points: [
      "The Admin role is now called Superadmin, so it is not mixed up with the Fleet Admin position. Nothing about what it can do changed.",
      "A Manager can have a dedicated region -- it places them in the org chart and the PIC list -- but, like HOD, a Manager sees every region's data and can manage everyone except the HOD and the Superadmin -- Region staff, Station staff and other HQ staff -- in every region (a manager often covers another manager's work). The HOD can manage everyone except the Superadmin.",
      "The Admin page tab is now called Superadmin as well.",
      "Management View -> Capacity staff headcount now comes from the Staff & Org Chart (people posted at the station + vacant seats; a vacant seat counts as headcount) instead of an uploaded sheet.",
      "New Headcount view in Staff & Org Chart: only a Manager, the HOD or the Superadmin adds or removes headcount: the HOD adds a vacant seat directly, a Manager's request waits for the HOD's approval, and a seat is removed with no approval. The Fleet Admin team fills a vacant seat with a person's details and edits current staff, but cannot add or remove headcount. Tables keep their header in view, and the headcount table sorts by clicking a header.",
      "The PIC search reads the Staff & Org Chart that the Fleet Admin team keeps, not the Fleet Management sheet: when someone joins, moves or leaves there, the PIC box follows straight away.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Org chart as a picture; Staff list and org chart open to every role (staging only)",
    type: "new",
    points: [
      "The Org chart is now a picture: HQ on top, the regions under it with their managers, click a region to open its zones (Region Head / RFS) and a zone to see its stations with their Station Head and Fleet Assistants. Vacant seats show as dashed boxes, a station with no Station Head in red. A Details list view is still there.",
      "Every role can read the Staff list and the org chart (who is posted where, a mobile number, vacant seats); employee ID and what each person can access stay with HQ roles, and only the Fleet Admin role edits. Staging test accounts no longer show in either.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Headcount is only for the Manager, the HOD and the Fleet Admin role -- and follows scope (staging only)",
    audience: ["hod", "manager", "fleet_admin"],
    points: [
      "Only the Manager, the HOD and the Fleet Admin role (and the Superadmin) see the Headcount tables. OPEX, Recovery, Restock and any other HQ role added later do not (the Staff list and org chart, with their vacant seats, stay open to every role). The Fleet Admin role views headcount only; the HOD and Manager add and remove seats.",
      "The HOD and the Fleet Admin role see every station, zone and the HQ table; a Manager posted to a region, zone or station sees only that part (tables, seats and totals) and can add or remove seats only there.",
    ],
  },
  {
    date: "2026-10-04",
    title: "Fleet Admin: Fire extinguisher and Weighing scale categories in Assets, and the tab is marked Beta (staging only)",
    points: [
      "Assets has two more categories next to Station inventory. Fire extinguisher: each station's extinguishers with quantity, serial numbers, vendor, PIC and the expiry date. Weighing scale: manufacturer, last calibrated and expiry date, reference and serial numbers, calibrated by, certificate. Chips for Expired / Due within 90 days / No date; the Fleet Admin team adds, edits, removes or pastes rows from the sheets.",
      "The Fleet Admin tab now carries a Beta tag (and a note that it is not live yet), so station and region staff know it is still being set up.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Fleet Admin: Vehicles and Assets (station inventory) tabs (staging only)",
    type: "new",
    minRank: 2,
    points: [
      "Vehicles: the Master Vehicle Inventory in the app, one record per plate with its station, type, owner, driver, GDL and licence expiry (days left, with chips for expired / within 90 days) and the fuel and Touch 'n Go card numbers (last 4 digits shown until you tick Show card numbers). The Fleet Admin team adds, edits and removes vehicles or pastes rows from the sheet.",
      "Assets: one tab for all asset lists, by category. Station inventory is first: each station's items with good and damaged counts (41 stations loaded from the zone workbooks; the rest start from the standard list), by station or added up by item.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Headcount seats can cover two zones, and one form for every role (staging only)",
    audience: ["hod", "manager", "fleet_admin"],
    points: [
      "Add headcount now has one Role list (Station Head, Fleet Assistant, Region Head, RFS, Fleet Admin) and a Location picker: station(s), zone(s) or HQ. An RFS who looks after South 1 and South 2 is one seat that shows in both zone rows, while the cards count it once.",
      "Adding the person uses the seat up (one person for both zones uses the one seat); when they leave, one seat covering both zones comes back.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Headcount for Region Heads, RFS and the Fleet Admin team (staging only)",
    type: "new",
    minRank: 1,
    points: [
      "The Headcount view now has three tables: Stations (Station Head, Fleet Assistant), Zones (Region Head, Regional Fleet Supervisor) and HQ (Fleet Admin). Each shows the people posted there, the vacant seats and the headcount; the three RFS seats marked TBA in the sheet (South 1, South 2, Zone B) and the Fleet Admin team's intern seats are in as vacant seats.",
      "The same rules as for stations: a Manager or the HOD adds or removes seats (a Manager's wait for the HOD), the Fleet Admin team fills a vacant seat by adding the person, and a leaver's seat stays as a vacant seat. The Org chart and the Staff list show the vacant zone and HQ seats too.",
    ],
  },
  {
    date: "2026-10-02",
    title: "New: Fleet Admin tab with Premises (staging only) -- licence and tenancy dates per station, edited in the app",
    minRank: 2,
    points: [
      "One record per station: address, size, launch date, business licence and tenancy dates (with the days left worked out), rent, deposit and links to the documents. Loaded from the Fleet Management sheet's Address tab; from now on the Fleet Admin team edits it here instead of the sheet.",
      "Chips for Licence expired, Licence within 90 days, Tenancy ended, Tenancy within 90 days and Dates missing, plus Region / Zone filters and search. HQ staff and above can read it; only the Fleet Admin role edits. You can also paste rows from the sheet.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Staff & Org Chart: mobile, employee ID and paste-from-sheet (staging only)",
    minRank: 2,
    points: [
      "Each person now has a mobile number and an employee ID in the staff list (filled in for the Station Heads and Fleet Assistants from the sheet). Only HQ staff, Managers and the Superadmin see them.",
      "Paste from sheet: copy rows from the Fleet Management sheet, check the preview (New / Update / Skipped with the reason) and import many people at once, including their mobile and employee ID.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Staff & Org Chart: edit HQ staff too, and posting is now separate from access (staging only)",
    minRank: 2,
    points: [
      "The Fleet Admin team can now add, move and remove HQ staff (HOD, Manager, OPEX, Recovery, Restock, other Fleet Admins) as well as Region and Station staff. Posting is where a person works; their access (what they can see) starts the same.",
      "Access is changed only in Settings -> Users, by a Manager / HOD, Region Head / RFS or the Superadmin -- for example to give someone sent to rescue another station or region that place's data. The staff list shows Custom for those people and keeps their access when the Fleet Admin team moves their posting. The org chart and PIC search follow the posting, so a person covering another station still shows at their own.",
    ],
  },
  {
    date: "2026-10-02",
    title: "New: Staff & Org Chart tab for the Fleet Admin team (staging only), and every Station Head / Fleet Assistant now has access",
    points: [
      "The Fleet Admin team keeps the staff list in one place: add a joiner, move someone to another station, change a position, remove a leaver. The same list gives people dashboard access and feeds the PIC box, so the PIC search stays right when staff change.",
      "An Org chart view shows HQ, each region's manager, each zone's Region Head / RFS and each station's Station Head and Fleet Assistants, with vacant Station Head seats flagged. Managers and admins can open it too.",
      "All Station Heads and Fleet Assistants from the Fleet Management sheet (about 400 people, every station) were added with access to their own station, so you can try the PIC search by typing any station name.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Roles now follow the job position (staging only)",
    type: "new",
    minRank: 2,
    points: [
      "Settings -> Users now uses the real positions, in three groups: HQ staff (HOD, Manager, Fleet Admin, OPEX, Recovery, Restock), Region staff (Region Head, Regional Fleet Supervisor) and Station staff (Station Head, Fleet Assistant). Your position shows under your name in the header.",
      "HQ staff have no region, zone or station of their own, so they get a new access level, HQ. They see every region for now; HOD and Manager can still manage Region and Station staff, while Fleet Admin, OPEX, Recovery and Restock will each get their own tabs for their own work.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Find the PIC for a station: type the station in any PIC box",
    type: "new",
    points: [
      "Type a station's name (or its 3-letter code, e.g. LKN) in a PIC box and the people looking after it come up -- the station's own staff, then the Region Head and RFS of its zone, then the manager of its region -- with their role and zone beside the name.",
      "Region Heads, RFS and Managers now have dashboard access, and Region staff and Managers only see, add, edit or remove people inside their own zone / region (Settings -> Users). A person added without a name gets one built from their email, role and place.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Shipper Radar -> Restock -> B2B Document Compliance now covers every document type, with a real breach classification",
    points: [
      "Switched from the old RDO-only Redash query to a newer one that unions every document type Redash tracks (MYRDO / DO / GRN / PSO so far -- the Document type filter now shows whatever is actually there, instead of only RDO being selectable). Also adds Normal / Potential Breach / Breach columns, Redash's own classification of how long a document has been outstanding since its bundle was delivered -- the \"MPS completed but document still pending\" rule the Fleet Manager's sheet used to compute by hand is now read straight from the source. The tracking-number list and its CSV export show Document Type, Aging and Aging Group per row.",
    ],
  },
  {
    date: "2026-10-02",
    title: "New: Daily KPI tab (Beta) -- today's FIFO D0 / Prior / Completion D0, and how much is left to attempt or deliver",
    feature: "dailyKpi",
    points: [
      "A new tab next to Station Health showing, for today only, each station's FIFO D0, Prior and Completion D0 against its own region target -- the count still needed to hit it, and how many of the remaining parcels are sitting Arrived at Sorting Hub vs On Vehicle for Delivery. Latlong parcels are excluded. Switch between Station / Zone / Region view; Export CSV downloads what's shown. The tab says so in-app, but to be clear: the numbers are a working estimate, not 100% accurate yet -- the start-clock logic and targets are still being validated against the official KPI result.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Shipment Details: Total Fresh now always adds up",
    points: [
      "Total Fresh is now Fresh Unscan + the four Within 1h/1-2h/2-3h/3h+ buckets, added together -- they used to come from a separate query that could disagree with the breakdown. A parcel with a missing or inconsistent processing timestamp now falls into 3h+ instead of being silently left out of both.",
    ],
  },
  {
    date: "2026-10-01",
    title: "New: Management View (Beta, staging only) -- operation health, capacity and backlog for managers and admins",
    feature: "managementView",
    minRank: 2,
    points: [
      "Operation Health: pick a date (default yesterday, last two weeks) and Daily / Weekly. Routed, Delivered, Success rate, Routed % and attendance (Total / Hybrid / Independent / Rescue), Routed % buckets vs 0 Attempt, attendance vs volume at a parcels-per-driver target, rescue routes.",
      "Aging health (Delivery >3 days, ATS >1 day, 0 Attempt, Hypercare shippers) with top stations, and Shipment compliance: LH timing buckets with the top 10 line-haul drivers (from an uploaded Metabase file) and the top 10 Latlong hubs.",
      "Capacity: Staff and Hub Size from an uploaded workbook, manager-keyed PTWH, parcel capacity and how full each hub is, and weekday vs weekend driver attendance by region / zone / station.",
      "Backlog Radar: top hubs by 0 Attempt or Age >3 (number or %), with a mitigation plan (status, owner, date) and rescue plan with deployment cost.",
    ],
  },
  {
    date: "2026-10-01",
    title: "KPI: Hybrid Productivity gets sizing % and two more productivity figures",
    feature: "kpiDashboard",
    points: [
      "The driver tables now show Sizing (S/M/L) -- the share of delivered parcels in each size -- and two more productivity figures: Productivity (Delivered) and Productivity (D+P+RSVN), alongside the usual one.",
      "Also fixed: Attendance now counts distinct days worked, not routes run -- a driver with two routes the same day no longer counts as two attendance days.",
    ],
  },
  {
    date: "2026-10-01",
    title: "Station Health: sort Age >3 by count or by %",
    points: [
      "A column scored as \"% of\" another field (Age >3, by default) now shows a # / % toggle in its header -- pick whether sorting ranks stations by the raw count or by that percentage.",
    ],
  },
  {
    date: "2026-10-01",
    title: "Shipment Details: LH Timing added to the Timing Trend chart",
    points: [
      "The Timing Trend chart (hour of day) now has a 4th line, LH Timing, alongside Scan-in, 1st attempt and Success -- same filters, same Count / % share toggle.",
    ],
  },
  {
    date: "2026-10-01",
    title: "Task List: Email / Gchat now shows Entry Time",
    points: [
      "The Email / Gchat table now has an Entry Time column, same as Urgent TN -- when the follow-up was keyed in.",
    ],
  },
  {
    date: "2026-09-28",
    title: "Aging Details: filter tracking numbers by Age",
    points: [
      "The tracking-number table under Aging Details (and Cold Chain, which shares it) now has an Age filter next to Station and Status -- a dropdown where you can tick more than one bucket (0, 1, 2, 3, 4-6, 7+), same buckets as the pivot table above it.",
    ],
  },
  {
    date: "2026-09-28",
    title: "DoD: LH Timing, and Shipment Details sorts by it",
    feature: "dod",
    points: [
      "The DoD Daily View now shows LH Timing next to Fresh Unscan and Latlong: the day's captured line-haul trip(s), coloured the same as Shipment Details. At region / zone level each trip slot shows the latest (worst) arrival among the stations in view, with parcels summed across them.",
      "On Shipment Details, the LH Timing column can now be sorted by clicking its header -- by the latest trip (the 2nd when a station has one, otherwise the 1st).",
    ],
  },
  {
    date: "2026-09-26",
    title: "Terminal T7 by its N7 cut-off date",
    type: "new",
    points: [
      "Terminal T7 now takes its day from the N7 cut-off date, so a T7 week is the week of the cut-off date and is final once it is over: the page opens on week 38 with week 39 building up, instead of running a week behind.",
    ],
  },
  {
    date: "2026-09-26",
    title: "KPI: weekly, monthly or daily",
    points: [
      "Prior KPI, FIFO D0, Completion D0, Completion D3, Terminal T7, COD RTS and Invalid POD now have a View (Weekly / Monthly / Daily) and a Period, like Hybrid Productivity, instead of the last 7 days. A week is Monday to Sunday and numbered like the team's sheets (last week is week 38); the page opens on the last complete week, Monthly on the last complete month and Daily on the current month. Any earlier week or month is one pick away, and the week or month in progress is there too, marked so far.",
      "A new Day by day tab on Prior KPI, FIFO D0, Completion D0 / D3 and Terminal T7 shows every station's % met on every day of the period (green on target, red under it) with the period's total, so the past days of a week or month are always there. The trend is drawn per day, week or month -- the View sets which -- with week labels like W38.",
      "The KPI feeders now hold the last 26 weeks, so the earlier weeks and months can be picked. FIFO D0 is now a station-by-day file too (Metabase question 127205) and has the same views, the grid and the trend. Invalid POD and COD RTS offer the weeks and months inside the uploaded file. Lost and Complaint are not built yet.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Recovery: filter Missing Details by Type",
    points: [
      "The tracking-number table on Recovery → Missing Details has a Type filter: pick one or more of Hub, Driver/Rider, Ship In, Ship Out and Other. Everything except Other is picked to begin with; clear the box to see every type.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Recovery: Active Missing, Lost Declared This Week and Lost Declared Summary",
    points: [
      "Four new sub-tabs on Recovery, replacing the Active Missing Google Sheet. B2B Document Active Missing is the same list and the same answers for the B2B documents (MYRDO / MYPSO / -DO) that Active Missing leaves out. Active Missing lists the open missing tracking numbers in your access (Ship Out and the B2B documents left out) and you answer for your own -- ticket updated to In Progress?, parcel found?, customer contacted / received?, liable party, remarks, check by; it saves as you go. A tracking number that is settled drops off by itself, answers included, even if nobody answered it.",
      "Lost Declared This Week shows the tickets declared lost this week (updated once a day): region staff answer customer received?, liable party, remarks, driver name and check by; everyone else monitors what is in their access. Every Monday at 10pm it all moves to Lost Declared Summary, weekly and for good, and leaves This Week.",
      "A Current status column on both Lost Declared tabs shows where each lost tracking number stands now (Cancelled, Completed, Returned to Sender ...).",
    ],
  },
  {
    date: "2026-09-26",
    title: "Admin: uploading the lost-declared files",
    minRank: 3,
    points: [
      "On Recovery → Lost Declared This Week / Summary the upload card is hidden until you press Data upload (and Hide data upload puts it away again), like on the KPI pages. Only admins can upload -- managers no longer can -- and nobody else sees the upload cards or the Metabase links, on Recovery or on the KPI pages.",
      "Two files: the daily This Week Lost Declared - All Regions (Metabase question 127203) and, whenever the status should be refreshed, Lost Declared Current Status (127204). Both are in Admin → Documents too.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Admin: the station list follows the Region List sheet",
    minRank: 3,
    points: [
      "A new Station List tab on the Admin page. The stations (hub code, station, zone, region) now come from the team's Region List sheet instead of being fixed in the app: paste the sheet's published CSV link (File → Share → Publish to web → the Region tab → CSV) and the app re-reads it every hour, or upload the sheet as a file. Only Active / Virtual stations in the five regions count; Closed, SAMEDAY and NO HUB rows are left out.",
      "The list built into the app now matches the sheet too: 8 Sarawak stations were added to East Malaysia (Kuching, Batu Kawa, Petra Jaya, Samarahan, Sibu, Saratok, Bintulu, Miri) -- 151 stations in all. East Malaysia stays out of the KPI pages unless it is switched on in KPI Settings.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Admin: KPI Settings -- targets and East Malaysia",
    minRank: 3,
    points: [
      "A new KPI Settings tab on the Admin page. Targets: the target of every KPI (Hybrid Productivity, Prior, FIFO D0, D0, D3, D7, COD RTS, Lost, Invalid POD, Complaint) for each region. Change a number and press Save -- the KPI pages, Trend, Invalid POD, COD RTS and Hybrid use it straight away; Back to default puts the built-in number back. Hybrid Productivity starts empty (drivers under 80 stay the low performers until a region has a target).",
      "Scope: a tick for including East Malaysia in the KPI pages -- off by default, because East Malaysia is Retail and the KPI pages are for Last Mile stations -- and a second tick for Sarawak (East Malaysia 3 and 4), off for now even when East Malaysia is on.",
    ],
  },
  {
    date: "2026-09-26",
    title: "KPI page: new menu, East Malaysia left out",
    feature: "kpiDashboard",
    points: [
      "Results is now Dashboard: OPEX first, then Trend (the weekly dashboard) with Daily, Weekly and Monthly -- only Weekly for now. RCA details is now RCA analysis, in the order Hybrid, Prior, FIFO D0, Completion D0, Completion D3, Terminal T7, COD RTS, Lost, Invalid POD, Complaint. Lost and Complaint are marked soon: they will share their logic.",
      "East Malaysia is Retail, not Last Mile, so the KPI pages leave it out of every number, table and filter (only Last Mile stations on the station list are counted). An admin can include it again under Admin → KPI Settings.",
      "Complaint has a target too (0.04% until changed) and the Weekly trend judges it per region like the other KPIs. Sarawak (East Malaysia 3 and 4) stays out of the KPI pages for now, even if East Malaysia is switched on.",
    ],
  },
  {
    date: "2026-09-26",
    title: "KPI page (Beta): Prior, Completion D0 / D3, Terminal T7, FIFO D0 -- and targets per region",
    feature: "kpiDashboard",
    points: [
      "Prior KPI, Completion D0, Completion D3, Terminal T7 and FIFO D0 are now open on the KPI page (still Beta, a preview). Overview: the % met against the target for the last 7 / 14 / 28 days or the whole file, the change on the period before, and the regions, zones and stations -- worst first, with an Under target only tick; click a station to filter the page to it. Date trend: the % met per day or week (by start-clock date) with the target line. Prior measures each tracking number against its working start-clock date, but the result and the trend are by start-clock date. The official OPEX number sits beside each; the OPEX result stays the one to quote.",
      "Admins load each KPI from a small Metabase file (Data upload has the link). Exclusions in these files are provisional until confirmed with OPEX, so a rate can differ a little from the official one.",
      "Targets are now per region: FIFO D0 96 / 96 / 96 / 97 / 94%, D0 88 / 88 / 88 / 90 / 90%, D3 96 / 96 / 96 / 96 / 93%, D7 100%, Prior 92% for Klang Valley / Northern / Southern / East Coast / East Malaysia (Lost 0.005%, COD RTS 9 / 9 / 9 / 7 / 12%, Invalid POD 25%). Every station, zone and region is judged against its own region's target -- on these pages and on the Weekly Dashboard; a total that spans regions uses the blend of their targets and says so.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Urgent TN: re-send a note, reply to your PIC",
    points: [
      "Forgot a note when you assigned a tracking number, or something changed? Double-click the Note on the row, edit it and press Send note -- the PIC's bell rings again and the row is tagged UPDATED (only when the text actually changed).",
      "Double-click a PIC Reply to answer it; your answer shows in the new Owner Reply column.",
      "Assign PIC on a tracking number with nobody on it yet fills in that same row. When a PIC passes it on to someone else it is still a new row, so that PIC closes it with the person who passed it on.",
      "The same tracking number on several rows now sits together by default and is colour-coded.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Urgent TN reminders",
    points: [
      "PIC: after you pick In progress the bell stays quiet for an hour, then rings again until you close it -- now only between 8am and 8pm, so nothing rings overnight. Each row shows when the next reminder is.",
      "Whoever added the tracking number now gets a reminder bell at 10am, 2pm and 5pm while any of them is still open (not closed by the PIC, not removed by you). Press Got it on the banner in the Urgent TN tab to quiet it until the next one.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Action Board: arrange the columns",
    points: [
      "With more than one metric picked, drag the metric chips next to the picker (or use their ‹ › arrows) to put the heatmap's columns in the order you want. The order is remembered. Shipper SLA now also counts parcels that are still en-route to the station.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Action Board: notes on every metric",
    points: [
      "Each heatmap column now has a small i: click it for what the metric counts, which parcels it covers, the direction and target, and what to do. Metrics that only cover some parcels -- like Shipper SLA (Amway, Watson, Orca and Cold Chain only) -- say so under the column name.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Shipper Radar: Cold Chain in Shipper SLA",
    points: [
      "Shipper SLA has a new Cold Chain shipper with 0 Attempt and Aging >D0, the same rule as Amway and Watson. Click a number for its tracking numbers.",
    ],
  },
  {
    date: "2026-09-26",
    title: "KPI page (Beta): weekly results and RCA for each KPI",
    feature: "kpiDashboard",
    points: [
      "The KPI page is marked Beta and is a preview only: please do not use it yet -- its data is not up to date and it shows how the page will look. Wait for the green light.",
      "Invalid POD has sub-tabs: Overview, Drivers & reasons (each driver's top invalid reason and their day-by-day trend), Date trend (invalid % / count per day for a region, zone, station or driver) and Reasons; managers and admins also get LM performance (the weekly LM POD Performance view after the audit). COD RTS has sub-tabs too: Overview, Reasons, Shippers (cumulative share, parent shippers), Drivers, Timing & attempts, Parcels, Date trend and Tracking numbers.",
      "Hybrid Productivity: every table shows productivity against the last week / month (▲ up, ▼ down) and two ticks keep only the increasing or only the dropping rows. The old Regional Breakdown is now Zone Breakdown, and a new Regional Breakdown shows the regions -- station staff see up to stations, region staff up to zones, managers and admins up to regions. View and Period stay clickable on every tab, and a picked row no longer overlaps the pinned first column when a table is scrolled sideways.",
      "A table column that shows a count with a % now sorts by the %. Opening the KPI pages is much quicker: pages you have opened stay ready, big tables draw 100 rows at a time, and the data is prepared once per upload.",
      "A new KPI page next to Dashboard, built as the RCA side of the KPIs: Weekly Dashboard (every KPI against its target for the past 4 weeks, by region / zone / station), OPEX Result (the OPEX team's result file, to be merged in), and RCA pages for Hybrid Productivity, Invalid POD and COD RTS with the numbers and tracking numbers behind them. The other KPIs are listed as soon.",
      "Admins load the data with Data upload (CSV or Excel -- the right sheet is picked automatically). An uploaded Hybrid file is used instead of Metabase until it is removed.",
      "Trend and bar charts with many points (39 weeks, a month of days) now thin their axis labels and turn crowded bar numbers upright, so nothing overlaps. The Hybrid daily export from Metabase (Route Date: Day) is accepted by Data upload.",
      "Hybrid Productivity: Daily Data (Current Month) always shows the current month whatever View / Period say, Service Duration is filled from the driver list's start date, and every Data upload slot has an Open in Metabase link to download the newest file.",
      "OPEX Result now reads the OPEX dashboard's own Download CSV: every hub / area / region with each KPI's rate against its target (green met, red missed) and how many KPIs it missed. Every Data upload slot for the RCA pages links to its Metabase question too (Invalid POD; COD RTS and RTS overall use all-regions copies of the Southern questions, previous week by default); the OPEX slot links to the OPEX dashboard.",
      "Access: OPEX Result is open to every user in full; the Weekly Dashboard and the RCA pages follow each user's region / zone / station.",
    ],
  },
  {
    date: "2026-09-26",
    title: "DoD (Beta): the dashboard, day by day",
    feature: "dod",
    points: [
      "A new DoD tab, marked Beta because it is still being built (after Shipper Radar; everyone can open it, limited to their own region / zone / station), keeps one snapshot per station per day -- the last refresh before midnight -- for this week and last week, so you can look back at yesterday and compare it with the day before.",
      "Daily View: pick a day and see every region / zone / station with Total Fresh, Fresh Unscan, Latlong, Total 0 Attempt, In Hub, Age >3, Attendance, Total Routed, Success Rate and Pending in Apps, with the change from the day before. Weekly Overview: pick one or more measures and see them across Mon-Sun for this week, last week or both, with one details table that you switch between the measures you picked.",
      "History starts from the first refresh after it went live.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Action Board: Shipper SLA",
    type: "new",
    points: [
      "Two new Action Board metrics, Shipper SLA Warning and Shipper SLA Breach, for Amway, Watson, Orca and Cold Chain parcels at the station or still on their way to it: older than 0 days is a warning, older than 1 day is a breach. Copy TNs works on them like the other metrics, and the targets can be changed in SLA Targets.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Station Health: rescue attendance",
    type: "new",
    points: [
      "Attendance now shows how many of the drivers are rescue, like Route Monitoring -- for example \"12 (2 Rescue)\". Region and zone rows add their stations up, and Export CSV has a Rescue Attendance column.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Timing chart: % share",
    feature: "timingChart",
    points: [
      "Hover an hour on the Shipment Details timing chart to see its % share as well as the count, and switch Count / % share above the chart to plot each line as a % of its own total.",
    ],
  },
  {
    date: "2026-09-25",
    title: "A bell for What's new",
    points: [
      "A red bell shows on Settings (and on Guide → What's new) when there are updates you haven't read. It clears as soon as you open What's new, and updates you haven't seen yet are tagged NEW.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Station Health follows your scope",
    feature: "stationHealthCombined",
    points: [
      "The table starts at your own level: a station-scoped user sees just their stations, a zone-scoped user their zones and stations, a region-scoped user their regions, zones and stations.",
      "Everyone who sees region / zone rows -- nationwide, region and zone-scoped users -- can switch them on or off with \"Show region rows\" / \"Show zone rows\" beside Export CSV (remembered for next time; both off gives a flat list of stations).",
    ],
  },
  {
    date: "2026-09-25",
    title: "Task List: Email / Gchat, To Do List and Task Assigned",
    type: "new",
    feature: "taskList",
    points: [
      "The Urgent TN tab is now the Task List, with four sub-tabs: Urgent TN, Email / Gchat, To Do List and Task Assigned. Each has its own bell.",
      "Email / Gchat: list the emails and chats you want to follow up, with a due date, and assign a PIC (another user, picked from suggestions as you type) to help reply or remind you.",
      "Task Assigned: give a task to one or more other users; each updates their own status and replies.",
      "Due dates can have an optional time, and an EOD button sets \"before 7pm today\".",
      "Reminders: an open item due within 2 days (or overdue) rings the bell at 10am, 2pm and 5pm every day; later ones ring once a day at 2pm. Press \"got it\" to quiet one until the next time.",
      "To Do List: your own tracker with due dates, progress and optional reminders.",
      "A small amber dot on the tab and sub-tab shows when something of yours -- including tasks you assigned to others -- is due within 2 days or overdue.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Summary cards removed",
    feature: "hideSummaryCards",
    points: [
      "The Region / Zone and TOTAL LAST MILE summary cards above the filters are gone -- the filters and the tables below work as before.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Urgent TN: assign a PIC",
    type: "new",
    points: [
      "Start typing a teammate's name or email when you track a tracking number and pick them from the suggestions (they must already be a dashboard user), with an optional note.",
      "They see a red bell on the Urgent TN tab. They pick In progress (the bell goes quiet for an hour, then rings again if it isn't closed -- 8am to 8pm only) or Closed (the bell stays off and it stays on their list marked closed), and can type a reply that you see.",
      "You can assign the same tracking number to several PICs (\"Assign another PIC\") without touching the ones who already have it, and a PIC can pass it on to someone else while keeping their own copy.",
      "When you close or remove it, it disappears from their list too, whatever its status. You can tick several tracking numbers and remove them all at once.",
      "A tracking number with no status (not found) is never assigned to a PIC -- there's nothing to chase. It stays on your own list and is removed automatically after 1 day if it still has no status.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Feedback: replies, attachments, delete",
    points: [
      "Attach a screenshot or PDF (up to 20 MB) to your feedback.",
      "Admins reply and close it; you see the reply under Settings → Feedback, with a red bell on Settings.",
      "You can delete your own feedback whenever you like (it disappears for the admins too). Closed feedback is deleted automatically a week after it's closed.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Settings and Admin reorganised",
    points: [
      "Feedback and Guide now live under Settings, so every role can reach them.",
      "The Admin page is for admins only and holds Documents and Data Refresh -- the settings only an admin can change.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Guide: search, common questions and this page",
    points: [
      "Search the guide, read the common questions, or ask the admins a question that's answered under Settings → Feedback.",
      "The guide now only shows what applies to your role and scope.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Users list: find, filter and sort",
    minRank: 1,
    points: [
      "Find a person with the search box, filter by role, by scope type (Everything / Region / Zone / Station) and a searchable scope, or tick \"Never opened\" to see who has never used the dashboard.",
      "Click any column header to sort -- for example Last opened.",
      "Edit now jumps straight to the form, and the header stays in view as you scroll.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Filter lists follow your scope",
    wide: true,
    points: [
      "The Region, Zone and Station filters now only list places inside your scope -- a station user no longer sees the rest of the network in the dropdowns.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Role Tester: view as one specific user",
    minRank: 3,
    feature: "roleTesterUser",
    points: ["Besides previewing a role and scope, you can now act as a single user to test things tied to a person (their Urgent TN list, bell and feedback)."],
  },
  {
    date: "2026-09-25",
    title: "Cold Chain",
    feature: "coldChain",
    points: [
      "New Cold Chain view (a sub-tab of Shipper Radar): the cold-chain tracking numbers by station and age, with the full TN list. Stations with nothing in them are hidden.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Restock: bundle list, On Hold Details and B2B Document Compliance",
    feature: "restockBundles",
    points: [
      "Restock NXD now has Restock On Hold and Restock Incomplete columns and a bundle-level tracking-number list (filter by flag, with an Attempt column).",
      "Restock On Hold Details lists bundles that are on hold or missing pieces, with a column for every flag.",
      "B2B Document Compliance (RDO) has Pickup Fail and Age, and every count opens its tracking numbers with a CSV. Only the 143 stations are counted.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Timing chart: its own filters",
    feature: "timingChart",
    wide: true,
    points: ["The Shipment Details timing chart has its own Region / Zone / Station filters and now draws scan-in, first attempt and success in one chart."],
  },
  {
    date: "2026-09-24",
    title: "Shipment Details: scan-in duration",
    points: [
      "Within 1h / 1-2h / 2-3h / 3h+ measure the time from the shipment arriving (column G) to the first scan-in (column H). Process Time was removed.",
    ],
  },
  {
    date: "2026-09-24",
    title: "Shipment Details: % of Total Fresh and tracking numbers",
    feature: "bucketDetails",
    points: ["Each duration bucket also shows its % of Total Fresh (the column sorts by that %) and opens its tracking numbers with a CSV when you click it."],
  },
  {
    date: "2026-09-24",
    title: "Column notes",
    points: [
      "Station Health, Route Monitoring and Shipment Details headers have a small i -- click it for how the number is worked out and what to do about it.",
    ],
  },
  {
    date: "2026-09-24",
    title: "Role Tester",
    minRank: 3,
    feature: "roleTester",
    points: ["Admins can preview the app as any role and scope from the header, without changing their own account."],
  },
  {
    date: "2026-09-24",
    title: "Station Health: one combined table",
    feature: "stationHealthCombined",
    wide: true,
    points: ["Region → Zone → Station in one expandable table, without the colour scale, with CSV export and click-for-tracking-numbers."],
  },
  {
    date: "2026-09-24",
    title: "Completion Summary",
    feature: "completionSummary",
    points: ["Route Monitoring has a Completion Summary: drivers who still haven't cleared their route, worst first, with a Copy for WhatsApp button."],
  },
  {
    date: "2026-09-24",
    title: "Shipper Radar",
    feature: "shipperRadar",
    points: ["Shipper Watch is now Shipper Radar, with Restock as a sub-tab."],
  },
  {
    date: "2026-09-23",
    title: "Route Monitoring: driver types",
    points: [
      "Tick more than one driver type: Hybrid, Independent, OPS, Other or Rescue. A driver routing away from their home station counts as Rescue.",
    ],
  },
  {
    date: "2026-09-23",
    title: "Action Board",
    points: [
      "Sortable heatmap, a Fresh Unscan metric, a metric picker where you can tick several, and a Breaches-only default. Region and Zone rows name the stations that are breaching.",
    ],
  },
  {
    date: "2026-09-23",
    title: "Filters on every tracking-number table",
    type: "new",
    points: [
      "Every tracking-number table has station and status multi-select filters. RPU can be filtered by several shippers, statuses and failure reasons.",
    ],
  },
  {
    date: "2026-09-23",
    title: "Refresh every 15 minutes, and Data Refresh detail",
    points: ["The dashboard refreshes every 15 minutes again and is more stable; the app no longer runs out of memory during a refresh."],
  },
  {
    date: "2026-09-23",
    title: "Data Refresh: each query's own time",
    minRank: 3,
    points: ["Admin → Data Refresh shows when each Redash query was last pulled."],
  },
  {
    date: "2026-09-21",
    title: "Users can have several regions, zones or stations",
    minRank: 1,
    points: ["Settings → Users can give one person more than one region, zone or station."],
  },
  {
    date: "2026-09-20",
    title: "Redesigned dashboard",
    type: "new",
    points: [
      "New Ninja Van look, the Action Board as the landing tab, sticky table headers, CSV export on every table and a slide-over with every column when you click a row.",
      "Warning / Critical targets (SLA Targets) now drive the colours on Station Health and the Action Board.",
    ],
  },
  {
    date: "2026-09-20",
    title: "New tabs: Recovery, Urgent TN, Pending in Yesterday Route, Restock",
    points: [
      "Recovery lists open missing-parcel tickets with high-value highlighting; Urgent TN tracks tracking numbers you care about; Pending in Yesterday Route is a snapshot taken at ~12:30am; Restock NXD watches restock bundles.",
    ],
  },
  {
    date: "2026-09-20",
    title: "Guide, Feedback and driver tenure",
    points: [
      "An in-app Guide and a Feedback form for everyone.",
      "Route Monitoring can show driver tenure once an admin uploads the driver details file.",
      "Every tracking-number table has its own station search box.",
    ],
  },
  {
    date: "2026-09-19",
    title: "Nationwide, with more views",
    points: [
      "The dashboard covers all 143 stations (East Malaysia can be toggled out) with Shipment Details, Route Monitoring, Shipper Watch, Aging Details, RPU and Old Route views.",
      "Managers and Region staff can add teammates, singly or in bulk from a CSV file.",
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // back to Monday
  return x;
}

const fmt = (d) => d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });

// Weeks (Monday-Sunday), newest first, each with the entries this build ships and this role
// may see. The current week is always first, even when nothing has changed in it yet.
export function weeklyChanges({ features, rank, wide = true, position = "", now = new Date() }) {
  const byWeek = new Map();
  const thisMonday = mondayOf(now);
  byWeek.set(thisMonday.getTime(), []);
  for (const e of CHANGELOG) {
    if (e.feature && !features[e.feature]) continue;
    if ((e.minRank || 0) > rank) continue;
    if (e.wide && !wide) continue;
    if (e.audience && rank < 3 && !e.audience.includes(position)) continue;
    const [y, m, d] = e.date.split("-").map(Number);
    const key = mondayOf(new Date(y, m - 1, d)).getTime();
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key).push(e);
  }
  return [...byWeek.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([key, items]) => {
      const start = new Date(key);
      const end = new Date(key + 6 * DAY_MS);
      const weeksAgo = Math.round((thisMonday.getTime() - key) / (7 * DAY_MS));
      return {
        key,
        items,
        range: `${fmt(start)} – ${fmt(end)}`,
        label: weeksAgo === 0 ? "This week" : weeksAgo === 1 ? "Last week" : `Week of ${fmt(start)}`,
      };
    });
}
