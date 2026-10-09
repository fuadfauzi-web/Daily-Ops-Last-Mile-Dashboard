// Roles follow the job position (2026-10-02). Mirrors backend/auth.py's POSITIONS exactly: users.role stores the position, and
// each position belongs to one access TIER that every permission check reads (me.role is the tier, me.position the title).
//   tiers: admin > manager (HOD / Manager) > hq_staff (Fleet Admin / OPEX / Recovery / Restock) > region > station
// 'region' / 'station' are the old, unspecific titles -- still valid, no longer offered when adding someone.
export const POSITIONS = {
  admin: { label: "Superadmin", group: "hq", tier: "admin" },
  hod: { label: "HOD", group: "hq", tier: "manager" },
  manager: { label: "Fleet Manager", group: "hq", tier: "manager" },
  fleet_admin: { label: "Fleet Admin", group: "hq", tier: "hq_staff" },
  opex: { label: "OPEX", group: "hq", tier: "hq_staff" },
  recovery: { label: "Recovery", group: "hq", tier: "hq_staff" },
  restock: { label: "Restock", group: "hq", tier: "hq_staff" },
  region_head: { label: "Region Head (RH)", group: "region", tier: "region" },
  rfs: { label: "Regional Fleet Supervisor (RFS)", group: "region", tier: "region" },
  station_head: { label: "Station Head (SH)", group: "station", tier: "station" },
  fleet_assistant: { label: "Fleet Assistant (FA)", group: "station", tier: "station" },
  region: { label: "Region staff", group: "region", tier: "region" },
  station: { label: "Station staff", group: "station", tier: "station" },
};

export const GROUPS = [
  { key: "hq", label: "HQ staff", positions: ["hod", "manager", "fleet_admin", "opex", "recovery", "restock", "admin"] },
  { key: "region", label: "Region staff", positions: ["region_head", "rfs"] },
  { key: "station", label: "Station staff", positions: ["station_head", "fleet_assistant"] },
];

// Custom roles (Superadmin -> Access Setting, 2026-10-10) are loaded from /api/roles after sign-in and added to the tables above in place, so every list that reads POSITIONS / GROUPS
// shows them. `rolesVersion()` changes whenever the list changed -- put it in a useMemo dependency list where a list is derived from the roles.
let _rolesVersion = 0;
export const rolesVersion = () => _rolesVersion;
const GROUP_OF_TIER = { admin: "hq", manager: "hq", hq_staff: "hq", region: "region", station: "station" };
export function registerRoles(list) {
  const custom = new Set((list || []).filter((r) => !r.builtin).map((r) => r.key));
  for (const k of Object.keys(POSITIONS)) if (POSITIONS[k].custom && !custom.has(k)) delete POSITIONS[k];
  for (const g of GROUPS) g.positions = g.positions.filter((p) => !POSITIONS[p]?.custom || custom.has(p));
  for (const r of list || []) {
    if (r.builtin) continue;
    const group = GROUP_OF_TIER[r.tier] || "station";
    POSITIONS[r.key] = { label: r.label, group, tier: r.tier, custom: true, department: r.department };
    const g = GROUPS.find((x) => x.key === group);
    if (g && !g.positions.includes(r.key)) g.positions.push(r.key);
  }
  _rolesVersion += 1;
}

// Station staff see up to stations, region staff up to zones, managers / HQ staff / admins up to regions.
export const TIER_RANK = { station: 0, region: 1, hq_staff: 2, manager: 2, admin: 3 };

export const positionLabel = (position) => POSITIONS[position]?.label || position || "";
export const tierOf = (position) => POSITIONS[position]?.tier || "station";
export const rankOf = (me) => TIER_RANK[me?.role] ?? 0;
// HQ staff have no dedicated region / zone / station -- scope 'hq' (the data they see is everything, for now).
export const isHqTier = (position) => ["admin", "manager", "hq_staff"].includes(tierOf(position));

// Who may add / edit / remove whom on the Users page -- mirrors backend/main.py's _may_manage_position. Superadmin: everyone; HOD: everyone
// but the Superadmin; Manager: everyone but the HOD and the Superadmin; Region staff: Station staff only.
export function canManagePosition(me, targetPosition) {
  if (me.role === "admin") return true;
  const tier = tierOf(targetPosition);
  if (me.role === "manager") return tier !== "admin" && (targetPosition !== "hod" || me.position === "hod");
  if (me.role === "region") return tier === "station";
  return false;
}
