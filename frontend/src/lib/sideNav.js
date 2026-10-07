// Grouped sidebar navigation (staging trial, FEATURES.sidebarNav -- design review D3). The sidebar is only another way to reach the pages that already
// exist: `dash: true` items are the Dashboard's own sub-tabs (same keys as Dashboard.jsx's TABS), the others are App.jsx's level-1 pages. Nothing here
// decides who may see what -- App passes in only the pages this person's role can open.
// People = the workforce pages (Attendance now; Overtime for hybrid and staff is planned after it; Staff & Org Chart lives here too).
export const SIDE_GROUPS = ["Act", "Last Mile Ops", "Recovery", "Dashboard", "People", "System"];

// What a group is called on screen when that differs from its key (the key is what pages and colours are filed under).
export const SIDE_GROUP_LABELS = { Dashboard: "Dashboard (Last Mile)" };
export const sideGroupLabel = (g) => SIDE_GROUP_LABELS[g] || g;

// One colour per group, so the collapsed sidebar (two-letter codes) can still be read by colour. chip = the code badge, dot = the group label's marker.
// Deliberately not brand red / status red-amber-green -- those mean "chrome" and "data" elsewhere.
export const SIDE_GROUP_COLORS = {
  Act: { chip: "bg-[#E5E7EB] text-[#231F20]", dot: "bg-[#231F20]" },
  "Last Mile Ops": { chip: "bg-[#DBEAFE] text-[#1E40AF]", dot: "bg-[#2563EB]" },
  Recovery: { chip: "bg-[#CCFBF1] text-[#115E59]", dot: "bg-[#0D9488]" },
  Dashboard: { chip: "bg-[#EDE9FE] text-[#5B21B6]", dot: "bg-[#7C3AED]" },
  People: { chip: "bg-[#FAE8FF] text-[#86198F]", dot: "bg-[#C026D3]" },
  System: { chip: "bg-[#F3F4F6] text-[#4B5563]", dot: "bg-[#9CA3AF]" },
};

export const SIDE_ITEMS = [
  { id: "action", dash: true, group: "Act", label: "Action Board", code: "AB" },
  { id: "urgent", dash: true, group: "Act", label: "Urgent TN", taskListLabel: "Task List", code: "TL" },
  { id: "health", dash: true, group: "Last Mile Ops", label: "Station Health", code: "SH" },
  { id: "dailyKpi", dash: true, group: "Last Mile Ops", label: "Daily KPI", beta: true, code: "DK" },
  { id: "shipment", dash: true, group: "Last Mile Ops", label: "Shipment Details", code: "SD" },
  { id: "routed", dash: true, group: "Last Mile Ops", label: "Route Monitoring", code: "RM" },
  { id: "aging", dash: true, group: "Last Mile Ops", label: "Aging Details", code: "AD" },
  { id: "rpu", dash: true, group: "Last Mile Ops", label: "Return Pick Up (RPU)", code: "RP" },
  { id: "shipper", dash: true, group: "Last Mile Ops", label: "Shipper Radar", code: "SR" },
  { id: "rec:activemissing", dash: true, dashKey: "recovery", recGroup: "activemissing", group: "Recovery", label: "Active Missing", code: "AM" },
  { id: "rec:lostdeclared", dash: true, dashKey: "recovery", recGroup: "lostdeclared", group: "Recovery", label: "Lost Declared", code: "LD" },
  { id: "rec:pdcnr", dash: true, dashKey: "recovery", recGroup: "pdcnr", group: "Recovery", label: "PDCNR", beta: true, recLists: true, code: "PD" },
  { id: "rec:damage", dash: true, dashKey: "recovery", recGroup: "damage", group: "Recovery", label: "Damage", beta: true, recLists: true, code: "DM" },
  { id: "rec:nolabel", dash: true, dashKey: "recovery", recGroup: "nolabel", group: "Recovery", label: "No Label from Hub", beta: true, recLists: true, code: "NL" },
  { id: "management", group: "Dashboard", label: "Management View", beta: true, code: "MV" },
  { id: "dod", dash: true, group: "Dashboard", label: "DoD", beta: true, code: "DD" },
  { id: "kpi", group: "Dashboard", label: "KPI", beta: true, code: "KP" },
  { id: "processingTime", dash: true, group: "Dashboard", label: "Processing Time", beta: true, code: "PT" },
  { id: "fleetadmin", group: "People", label: "Fleet Admin", beta: true, code: "FA" },
  { id: "staff", group: "People", label: "Staff & Org Chart", code: "SO" },
  { id: "attendance", group: "People", label: "Attendance", beta: true, code: "AT" },
  { id: "users", group: "System", label: "Users", code: "US" },
  { id: "settings", group: "System", label: "Settings", code: "ST" },
  { id: "help", group: "System", label: "Help", code: "HP" }, // Feedback, Guide, What's new (three tabs)
  { id: "admin", group: "System", label: "Superadmin", code: "SA" },
];

// The Task List tab's bell numbers (the same sums the Dashboard's tab strip shows), kept in one place so the strip and the sidebar agree.
export function taskListBadges(n, taskListOn) {
  const c = n || {};
  return {
    dot: taskListOn ? (c.followups_due_soon || 0) + (c.todos_due_soon || 0) + (c.tasks_due_soon || 0) : 0,
    badge:
      (c.urgent_notify || 0) +
      (c.urgent_owner_updates || 0) +
      (c.urgent_owner_reminder || 0) +
      (taskListOn ? (c.followups_notify || 0) + (c.todos_notify || 0) + (c.tasks_notify || 0) : 0),
  };
}
