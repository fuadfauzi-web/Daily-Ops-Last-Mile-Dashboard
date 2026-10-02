// Grouped sidebar navigation (staging trial, FEATURES.sidebarNav -- design review D3). The sidebar is only another way to reach the pages that already
// exist: `dash: true` items are the Dashboard's own sub-tabs (same keys as Dashboard.jsx's TABS), the others are App.jsx's level-1 pages. Nothing here
// decides who may see what -- App passes in only the pages this person's role can open.
export const SIDE_GROUPS = ["Act", "Monitor", "Recovery", "Analyse", "System"];

// One colour per group, so the collapsed sidebar (two-letter codes) can still be read by colour. chip = the code badge, dot = the group label's marker.
// Deliberately not brand red / status red-amber-green -- those mean "chrome" and "data" elsewhere.
export const SIDE_GROUP_COLORS = {
  Act: { chip: "bg-[#E5E7EB] text-[#231F20]", dot: "bg-[#231F20]" },
  Monitor: { chip: "bg-[#DBEAFE] text-[#1E40AF]", dot: "bg-[#2563EB]" },
  Recovery: { chip: "bg-[#CCFBF1] text-[#115E59]", dot: "bg-[#0D9488]" },
  Analyse: { chip: "bg-[#EDE9FE] text-[#5B21B6]", dot: "bg-[#7C3AED]" },
  System: { chip: "bg-[#F3F4F6] text-[#4B5563]", dot: "bg-[#9CA3AF]" },
};

export const SIDE_ITEMS = [
  { id: "action", dash: true, group: "Act", label: "Action Board", code: "AB" },
  { id: "urgent", dash: true, group: "Act", label: "Urgent TN", taskListLabel: "Task List", code: "TL" },
  { id: "health", dash: true, group: "Monitor", label: "Station Health", code: "SH" },
  { id: "shipment", dash: true, group: "Monitor", label: "Shipment Details", code: "SD" },
  { id: "routed", dash: true, group: "Monitor", label: "Route Monitoring", code: "RM" },
  { id: "aging", dash: true, group: "Monitor", label: "Aging Details", code: "AD" },
  { id: "rpu", dash: true, group: "Monitor", label: "RPU", code: "RP" },
  { id: "shipper", dash: true, group: "Monitor", label: "Shipper Radar", code: "SR" },
  { id: "processingTime", dash: true, group: "Monitor", label: "Processing Time", beta: true, code: "PT" },
  { id: "recovery", dash: true, group: "Recovery", label: "Recovery", code: "RC" },
  { id: "dailyKpi", dash: true, group: "Analyse", label: "Daily KPI", beta: true, code: "DK" },
  { id: "dod", dash: true, group: "Analyse", label: "DoD", beta: true, code: "DD" },
  { id: "kpi", group: "Analyse", label: "KPI", beta: true, code: "KP" },
  { id: "management", group: "Analyse", label: "Management View", beta: true, code: "MV" },
  { id: "attendance", group: "Act", label: "Attendance", beta: true, code: "AT" },
  { id: "staff", group: "System", label: "Staff & Org Chart", code: "SO" },
  { id: "settings", group: "System", label: "Settings", code: "ST" },
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
