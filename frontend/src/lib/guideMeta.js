// Help pages -- the category every Guide section and What's new entry belongs to (the same six categories as the menu), plus a one-line blurb for each
// Guide card. A section with no entry here lands in "Monitor" without a blurb, so a new section never disappears from the Guide.
export const HELP_AREAS = ["Getting started", "Act", "Monitor", "Recovery", "Dashboard", "People", "System"];

// "Getting started" has no menu category; it borrows the Act colour (dark) in sideNav's palette -- see areaColor below.
export const GUIDE_AREA = {
  roles: "Getting started",
  header: "Getting started",
  action: "Act",
  urgent: "Act",
  tasklist: "Act",
  health: "Monitor",
  dailyKpi: "Monitor",
  shipment: "Monitor",
  routed: "Monitor",
  aging: "Monitor",
  rpu: "Monitor",
  shipper: "Monitor",
  coldchain: "Monitor",
  restock: "Monitor",
  recovery: "Recovery",
  management: "Dashboard",
  dod: "Dashboard",
  kpi: "Dashboard",
  processingTime: "Dashboard",
  attendance: "People",
  staff: "People",
  fleetadmin: "People",
  settings: "System",
  admin: "System",
};

export const GUIDE_BLURB = {
  roles: "Who sees what: your role, your scope and the stations you can open.",
  header: "The top bar and the controls that work on every page.",
  action: "The stations and metrics that need action first, with a one-click tracking-number list.",
  urgent: "Keep an eye on specific tracking numbers, assign a PIC and get reminders.",
  tasklist: "Everything you have to chase in one place: Urgent TN, Email / Gchat, Tasks and To Do.",
  health: "Every station's numbers against target, by region, zone and station.",
  dailyKpi: "Today's FIFO D0, Prior and Completion D0, and how much is left to deliver.",
  shipment: "Fresh parcels by status, scan-in timing and the tracking numbers behind each bucket.",
  routed: "Today's routes: completion, driver types and old routes.",
  aging: "Parcels by how long they have been in hub, grouped by where they are.",
  rpu: "Return pickups by status and by age, filterable by shipper.",
  shipper: "Hypercare for shippers with their own SLA: Zalora, Amway, Watson, Cold Chain and more.",
  coldchain: "Cold-chain parcels and how they are doing against their SLA.",
  restock: "Restock bundles, on-hold and incomplete lists, and B2B document compliance.",
  recovery: "Missing, lost, PDCNR, damaged and no-label parcels, and who is chasing them.",
  management: "Operation health, capacity and backlog for managers.",
  dod: "Station Health day by day: this week against last week.",
  kpi: "Weekly, monthly and daily KPI results with the reasons behind them.",
  processingTime: "When work lands at each station, hour by hour, over the past 7 days.",
  attendance: "Clock in and out, the schedule, the month sheet and approvals.",
  staff: "Who works where: the staff list and the org chart.",
  fleetadmin: "Premises, vehicles and assets for every station.",
  settings: "Users, targets and the other settings, and who can change what.",
  admin: "Documents, data refresh and the other Superadmin tools.",
};

// What's new: which category an entry belongs to. An entry can say `area` itself; otherwise it is guessed from its title.
const AREA_RULES = [
  [/Attendance|Schedule|PTWH|Staff|Org chart|Headcount|Fleet Admin|Premises|Vehicles/i, "People"],
  [/Recovery|PDCNR|Missing|Lost Declared|Damage/i, "Recovery"],
  [/Settings|Admin\b|Users|Feedback|Guide|bell for What|What's new|Role Tester|Roles|Superadmin|Data Refresh|Data upload|station list|Refresh every/i, "System"],
  [/Daily KPI|Station Health|Shipment|Route Monitoring|Aging|Cold Chain|Shipper|Restock|RPU|Timing|Completion Summary|Terminal|Filters|Column notes|Nationwide/i, "Monitor"],
  [/KPI|DoD|Management View|Processing Time/i, "Dashboard"],
  [/Action Board|Urgent TN|Task List|PIC|Summary cards/i, "Act"],
];
export function changelogArea(entry) {
  if (entry.area) return entry.area;
  for (const [re, area] of AREA_RULES) if (re.test(entry.title)) return area;
  return "Monitor";
}

// What's new: is the entry something New, an Improvement or a Fix? An entry can say `type` ("new" | "improved" | "fixed"); otherwise it is read from the title.
export const TYPE_LABEL = { new: "New", improved: "Improved", fixed: "Fixed" };
export const TYPE_CLASS = {
  new: "bg-[#DCFCE7] text-[#166534]",
  improved: "bg-[#DBEAFE] text-[#1E40AF]",
  fixed: "bg-[#FEF3C7] text-[#92400E]",
};
export function changelogType(entry) {
  if (entry.type) return entry.type;
  const t = entry.title;
  if (/\b(fix|fixed|bug|always adds up|no longer|stuck|corrected|wrong)\b/i.test(t)) return "fixed";
  if (/^New\b|\bnew tab\b|\bNew:|^A new\b|^Cold Chain$|^Shipper Radar$|^Action Board$|^Role Tester$|^Completion Summary$/i.test(t)) return "new";
  return "improved";
}

// Dot colours per category (the menu's palette; "Getting started" is the dark Act colour).
export const AREA_DOT = {
  "Getting started": "bg-[#231F20]",
  Act: "bg-[#231F20]",
  Monitor: "bg-[#2563EB]",
  Recovery: "bg-[#0D9488]",
  Dashboard: "bg-[#7C3AED]",
  People: "bg-[#C026D3]",
  System: "bg-[#9CA3AF]",
};
