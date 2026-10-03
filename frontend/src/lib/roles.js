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
