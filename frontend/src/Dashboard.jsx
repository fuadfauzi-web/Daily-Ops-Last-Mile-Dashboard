import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useThresholds, resolveThreshold, classify, SEVERITY_MARK, SEVERITY_CLASS } from "./lib/thresholds";
import { ALL_COLUMNS, HEALTH_GROUPS } from "./lib/metrics";
import { METRIC_NOTES } from "./lib/metricNotes";
import { exportCsv } from "./lib/csv";
import SummaryCard from "./components/SummaryCard";
import { FEATURES } from "./lib/features";
import { taskListBadges } from "./lib/sideNav";
import DataTable from "./components/DataTable";
import FilterBar from "./components/FilterBar";
import TnModal from "./components/TnModal";
import DetailPanel from "./components/DetailPanel";
import HeaderNote from "./components/HeaderNote";
import TabBar from "./components/TabBar";
import Skeleton from "./components/Skeleton";
import ActionBoard from "./ActionBoard";
import ShipmentDetailsTab from "./ShipmentDetailsTab";
import RoutedViewTab from "./RoutedViewTab";
import ShipperWatchTab from "./ShipperWatchTab";
import AgingDetailsTab from "./AgingDetailsTab";
import RpuTab from "./RpuTab";
import RecoveryTab from "./RecoveryTab";
import UrgentTnTab from "./UrgentTnTab";
import TaskListTab from "./TaskListTab";
import DodTab from "./DodTab";
import DailyKpiTab from "./DailyKpiTab";
import ProcessingTimeTab from "./ProcessingTimeTab";

// Metrics with an actual tracking-number list behind them server-side (mirrors
// backend/aggregate.py's DRILLDOWN_METRICS) -- everything else is a route-level
// total or a percentage, with nothing to list.
const DRILLDOWN_METRICS = new Set([
  "total_in_hub", "zero_attempt_total", "zero_attempt", "zero_attempt_gt_d0", "on_hold",
  "pending_ats_zero_attempt", "pending_ats_attempted",
  "missing_open", "missing_hub", "missing_driver_rider", "missing_ship_in",
  "age_gt3", "reschedule", "still_ovfd", "prior_d0", "prior_gt_d0",
  "unsweep_document", "unsweep_parcel",
]);

const PERCENT_METRICS = new Set(["cod_pct_hub", "routed_pct"]);

const METRIC_KEYS = ALL_COLUMNS.map((c) => c.key);
// Numerator/denominator pairs behind each percentage, for correctly weighted
// rollups. routed_pct isn't listed here -- unlike cod_pct_hub (whose numerator,
// COD-in-hub, has no raw field of its own), routed_pct's two inputs
// (total_routed, total_in_hub) are both already plain summed fields, so it's
// recomputed directly from them in sumMetrics() below instead.
const PERCENT_SOURCE = { cod_pct_hub: "total_in_hub" };

// The summary cards' fixed 5-stat set, per spec.
const CARD_STATS = [
  { key: "total_fresh", label: "Fresh" },
  { key: "total_routed", label: "Routed" },
  { key: "zero_attempt_total", label: "0 Att" },
  { key: "total_in_hub", label: "In Hub" },
  { key: "age_gt3", label: "Age>3" },
];

// 2026-09-21 feedback: silently refresh in the background while a session stays
// open, instead of making the user hit reload to see the latest capture -- well
// under the backend's own 15-minute refresh cycle so a new capture shows up
// within about a minute of landing. Every tab's own fetch (all keyed off this
// same tick, see the sub-tab renders below) just re-runs in place: tab, filters,
// sort and scroll position are separate state untouched by a fresh setData.
const AUTO_REFRESH_INTERVAL_MS = 60 * 1000;

const TABS = [
  { key: "action", label: "Action Board" },
  { key: "shipment", label: "Shipment Details" },
  ...(FEATURES.processingTime
    ? [
        {
          key: "processingTime",
          label: (
            <span className="inline-flex items-center gap-1.5">
              Processing Time
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-amber-800">Beta</span>
            </span>
          ),
        },
      ]
    : []),
  { key: "health", label: "Station Health" },
  ...(FEATURES.dailyKpi
    ? [
        {
          key: "dailyKpi",
          label: (
            <span className="inline-flex items-center gap-1.5">
              Daily KPI
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-amber-800">Beta</span>
            </span>
          ),
        },
      ]
    : []),
  { key: "routed", label: "Route Monitoring" },
  { key: "aging", label: "Aging Details" },
  { key: "rpu", label: "RPU" },
  { key: "recovery", label: "Recovery" },
  { key: "shipper", label: "Shipper Radar" },
  ...(FEATURES.dod
    ? [
        {
          key: "dod",
          // Beta (2026-09-26): still being built -- managers and admins see it, and are told so.
          label: (
            <span className="inline-flex items-center gap-1.5">
              DoD
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-amber-800">Beta</span>
            </span>
          ),
        },
      ]
    : []), // every role, limited to its own scope (the backend filters)
  { key: "urgent", label: "Urgent TN" },
];
// The tab keys, for the staging sidebar (App.jsx) -- which of them a person may open is decided by what Dashboard itself renders.
export const DASHBOARD_TAB_KEYS = TABS.map((t) => t.key);

// Attendance shows "12 (2 Rescue)" when some of the drivers are rescue, same as Route Monitoring (2026-09-26 feedback).
function attendanceText(row) {
  const n = (row.attendance || 0).toLocaleString();
  return row.attendance_rescue > 0 ? `${n} (${row.attendance_rescue} Rescue)` : n;
}

function fmt(key, value) {
  if (key === "routed_pct") return `${value.toFixed(2)}%`;
  if (PERCENT_METRICS.has(key)) return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

// Appends the computed percentage alongside the raw count for a metric scored
// as "% of another field" (threshold.percent_of), e.g. "45 (23.5%)" for Age >3
// scored as % of Total In Hub -- otherwise identical to fmt().
function fmtWithPercentOf(key, value, row, threshold) {
  const base = fmt(key, value);
  if (!threshold.percent_of) return base;
  const denom = row[threshold.percent_of];
  const pct = denom ? (value / denom) * 100 : 0;
  return `${base} (${pct.toFixed(1)}%)`;
}

// Station Health trial (FEATURES.healthTable): the small target line under a column's header, read from the SLA Targets page (nationwide row; region
// overrides still apply to the cells). "" = no SLA. "warning / critical" (≤ when lower is worse); a % target / "% of" metric adds %.
function targetLine(key, t) {
  if (!t.scored || (t.warning_at === 0 && t.critical_at === 0)) return "";
  const unit = PERCENT_METRICS.has(key) || t.percent_of ? "%" : "";
  const op = t.direction === "lower-is-worse" ? "≤" : "";
  return t.warning_at === t.critical_at ? `${op}${t.critical_at}${unit}` : `${op}${t.warning_at}${unit} / ${t.critical_at}${unit}`;
}
const HEALTH_SHORT = Object.fromEntries(HEALTH_GROUPS.flatMap((g) => g.columns));
const TINT_CLASS = { critical: "bg-status-critical-fill", warning: "bg-status-warning-fill", good: "", reference: "" };

function sumMetrics(rows) {
  const zero = Object.fromEntries(METRIC_KEYS.map((k) => [k, 0]));
  const withPctNumerators = rows.reduce((acc, r) => {
    const next = { ...acc };
    METRIC_KEYS.forEach((k) => {
      if (PERCENT_METRICS.has(k)) return;
      next[k] = acc[k] + (r[k] || 0);
    });
    return next;
  }, zero);
  Object.entries(PERCENT_SOURCE).forEach(([pctKey, denomKey]) => {
    const numerator = rows.reduce((sum, r) => sum + ((r[pctKey] || 0) / 100) * (r[denomKey] || 0), 0);
    withPctNumerators[pctKey] = withPctNumerators[denomKey] ? Math.round((numerator / withPctNumerators[denomKey]) * 1000) / 10 : 0;
  });
  const routedDenom = withPctNumerators.total_routed + withPctNumerators.total_in_hub;
  withPctNumerators.routed_pct = routedDenom ? Math.round((withPctNumerators.total_routed / routedDenom) * 10000) / 100 : 0;
  withPctNumerators.attendance_rescue = rows.reduce((sum, r) => sum + (r.attendance_rescue || 0), 0);
  return withPctNumerators;
}

// Client-side equivalent of backend rollup(), used so "By region"/"By zone" reflect
// whatever the user currently has filtered/searched for, not the server's unfiltered
// totals.
function localRollup(rows, groupKey) {
  const groups = {};
  rows.forEach((r) => {
    const key = r[groupKey];
    if (!groups[key]) groups[key] = { region: r.region, rows: [] };
    groups[key].rows.push(r);
  });
  return Object.entries(groups).map(([key, g]) => ({
    key,
    region: g.region,
    station_count: g.rows.length,
    ...sumMetrics(g.rows),
  }));
}

// Sorts one level's siblings by sortKey without touching the tree structure --
// "name" isn't a real field on the raw region/zone/station rows (they have
// key/station_name respectively), so it's mapped to whichever field actually
// holds that level's display name.
// percentOfField (2026-10-01 feedback): when sorting by a metric that's scored as "% of"
// another field and the header's % toggle is active, rank by that computed percentage
// instead of the raw count -- region/zone rollup rows already sum both the numerator and
// denominator (see sumMetrics/localRollup), so the percentage is correct at every level.
function sortSiblings(rows, sortKey, sortDir, nameField, percentOfField) {
  if (!sortKey) return rows;
  const key = sortKey === "name" ? nameField : sortKey;
  return [...rows].sort((a, b) => {
    if (percentOfField) {
      const av = a[percentOfField] ? (a[key] / a[percentOfField]) * 100 : 0;
      const bv = b[percentOfField] ? (b[key] / b[percentOfField]) * 100 : 0;
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const av = a[key];
    const bv = b[key];
    if (av === undefined || bv === undefined) return 0;
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? av - bv : bv - av;
  });
}

// Experimental (2026-09-20, staging only): flattens region -> zone -> station
// into one row list for Station Health's "combined -- click to expand" style.
// A region/zone only expands once its key is in the matching Set. sortKey/
// sortDir (if given) sort each level's siblings independently -- clicking a
// column header re-sorts region rows against each other, zone rows within
// their own region against each other, and so on, without breaking the
// region -> zone -> station nesting itself.
//
// 2026-09-25: the table starts at the viewer's own scope level (a station-scoped user sees
// stations only, a zone-scoped user zone rows + stations, ...), and a region/zone-scoped
// user can hide the region/zone rows -- `levels` says which of the two grouping levels to
// draw (showRegion / showZone); with both off it is a flat list of stations. regionOpen /
// zoneOpen say whether a shown row is expanded.
function buildCombinedRows(stations, levels, regionOpen, zoneOpen, sortKey, sortDir, percentOfField) {
  const { showRegion, showZone } = levels;
  const rows = [];
  const pushStations = (list) =>
    sortSiblings(list, sortKey, sortDir, "station_name", percentOfField).forEach((s) =>
      rows.push({ ...s, type: "station", id: `station:${s.station_code}`, displayName: s.station_name })
    );
  const emitZones = (inScope) => {
    if (!showZone) {
      pushStations(inScope);
      return;
    }
    sortSiblings(localRollup(inScope, "zone"), sortKey, sortDir, "key", percentOfField).forEach((z) => {
      rows.push({ ...z, type: "zone", id: `zone:${z.key}`, displayName: z.key });
      if (!zoneOpen(z.key)) return;
      pushStations(inScope.filter((s) => s.zone === z.key));
    });
  };
  if (!showRegion) {
    emitZones(stations);
    return rows;
  }
  sortSiblings(localRollup(stations, "region"), sortKey, sortDir, "key", percentOfField).forEach((r) => {
    rows.push({ ...r, type: "region", id: `region:${r.key}`, displayName: r.key });
    if (!regionOpen(r.key)) return;
    emitZones(stations.filter((s) => s.region === r.key));
  });
  return rows;
}

function exportStationHealthCsv(rows) {
  const headers = [
    "Region", "Zone", "Station",
    ...ALL_COLUMNS.flatMap((c) => (c.key === "attendance" ? [c.label, "Rescue Attendance"] : [c.label])),
  ];
  const values = rows.map((r) => [
    r.region, r.zone, r.station_name,
    ...ALL_COLUMNS.flatMap((c) => (c.key === "attendance" ? [r.attendance, r.attendance_rescue || 0] : [r[c.key]])),
  ]);
  exportCsv(`daily-ops-station-health-${new Date().toISOString().slice(0, 10)}.csv`, headers, values);
}

// sidebar / requestedTab / onTabState: the staging sidebar (FEATURES.sidebarNav) drives and mirrors the tab from outside -- with `sidebar` on, the tab strip below is hidden.
export default function Dashboard({ me, onCapturedAt, onStationsInScope, notifCounts, sidebar = false, requestedTab = null, onTabState }) {
  const { rows: thresholdRows } = useThresholds();
  const [data, setData] = useState(null);
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState(null);
  const [regionFilter, setRegionFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("on_hold");
  const [sortDir, setSortDir] = useState("desc");
  // Remembers the last tab this user had open, per Phase 5 -- a first-ever
  // visit (nothing saved yet) lands on the Action Board, per Phase 6.
  const tabs = TABS;
  const tabStorageKey = `dashboard-tab-${me.email}`;
  const [tab, setTabState] = useState(() => {
    try {
      const saved = localStorage.getItem(tabStorageKey);
      if (saved && tabs.some((t) => t.key === saved)) return saved;
    } catch {
      /* private browsing / storage blocked -- just use the default */
    }
    return "action";
  });
  const setTab = (key) => {
    setTabState(key);
    try {
      localStorage.setItem(tabStorageKey, key);
    } catch {
      /* private browsing / storage blocked -- choice just won't persist */
    }
  };
  useEffect(() => {
    if (!requestedTab) return;
    if (tabs.some((t) => t.key === requestedTab.key)) setTab(requestedTab.key);
    // Jump search -> a station: show every region/zone and search for that station's name.
    if (requestedTab.station) {
      setRegionFilter("all");
      setZoneFilter("all");
      setSearch(requestedTab.station.station_name);
      if (requestedTab.station.region === "East Malaysia") setIncludeEastMalaysia(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTab?.n]);
  useEffect(() => {
    onTabState?.(tab);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const [modal, setModal] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [flaggedBusy, setFlaggedBusy] = useState(false);
  const [flaggedCopied, setFlaggedCopied] = useState(false);
  // East Malaysia is Retail, not Last Mile -- admins/full-access viewers can
  // toggle it back in. Defaults to excluded per 2026-09-20 feedback.
  const [includeEastMalaysia, setIncludeEastMalaysia] = useState(false);

  // Station Health: one combined region -> zone -> station table, each level
  // expandable (2026-09-24: replaced the old three-separate-tables layout).
  const [expandedRegions, setExpandedRegions] = useState(() => new Set());
  const [expandedZones, setExpandedZones] = useState(() => new Set());
  const [combinedSortKey, setCombinedSortKey] = useState(null);
  const [combinedSortDir, setCombinedSortDir] = useState("asc");
  // "value" | "percent" -- for a metric scored as "% of" another field (e.g. Age >3 as
  // % of Total In Hub), lets the header's # / % toggle pick which basis to sort by
  // (2026-10-01 feedback) instead of always ranking by the raw count.
  const [combinedSortBasis, setCombinedSortBasis] = useState("value");
  // Anyone who sees region / zone grouping rows can hide them (remembered per person).
  const levelsKey = `station-health-levels-${me.email}`;
  const [levelPrefs, setLevelPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(levelsKey) || "null");
      if (saved && typeof saved === "object") return { region: saved.region !== false, zone: saved.zone !== false };
    } catch {
      /* storage blocked / bad JSON -- default to showing both */
    }
    return { region: true, zone: true };
  });
  const setLevelPref = (level, value) =>
    setLevelPrefs((prev) => {
      const next = { ...prev, [level]: value };
      try {
        localStorage.setItem(levelsKey, JSON.stringify(next));
      } catch {
        /* private browsing / storage blocked -- the choice just won't persist */
      }
      return next;
    });
  // Station Health trial (FEATURES.healthTable): which column groups are hidden -- remembered per person, like the region/zone row switches.
  const groupsKey = `station-health-groups-${me.email}`;
  const [hiddenGroups, setHiddenGroups] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(groupsKey) || "null");
      if (Array.isArray(saved)) return new Set(saved);
    } catch {
      /* storage blocked / bad JSON -- show every group */
    }
    return new Set();
  });
  // ...and in what order: the pills above the table can be dragged (or nudged with the arrows) to arrange the column groups, per person.
  const orderKey = `station-health-group-order-${me.email}`;
  const [groupOrder, setGroupOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(orderKey) || "null");
      if (Array.isArray(saved)) return saved;
    } catch {
      /* storage blocked / bad JSON -- default order */
    }
    return [];
  });
  const [dragGroup, setDragGroup] = useState(null);
  // Saved order first (ignoring groups that no longer exist), then any group the person has not placed yet in its default position.
  const orderedGroups = useMemo(() => {
    const byKey = new Map(HEALTH_GROUPS.map((g) => [g.key, g]));
    const placed = groupOrder.filter((k) => byKey.has(k));
    return [...placed.map((k) => byKey.get(k)), ...HEALTH_GROUPS.filter((g) => !placed.includes(g.key))];
  }, [groupOrder]);
  const moveGroup = (from, to) => {
    if (from < 0 || to < 0 || from >= orderedGroups.length || to >= orderedGroups.length || from === to) return;
    const next = orderedGroups.map((g) => g.key);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setGroupOrder(next);
    try {
      localStorage.setItem(orderKey, JSON.stringify(next));
    } catch {
      /* private browsing / storage blocked -- the order just won't persist */
    }
  };
  const toggleGroup = (key) =>
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(groupsKey, JSON.stringify([...next]));
      } catch {
        /* private browsing / storage blocked -- the choice just won't persist */
      }
      return next;
    });
  const toggleCombinedSort = (key) => {
    if (key === combinedSortKey) setCombinedSortDir(combinedSortDir === "asc" ? "desc" : "asc");
    else {
      setCombinedSortKey(key);
      setCombinedSortDir("asc");
      setCombinedSortBasis("value");
    }
  };
  // The header's explicit # / % buttons (percent-scored columns only) -- always makes
  // this column the active sort on the chosen basis, only resetting direction when it
  // wasn't already the active column.
  const setCombinedSortBasisFor = (key, basis) => {
    if (key !== combinedSortKey) setCombinedSortDir("asc");
    setCombinedSortKey(key);
    setCombinedSortBasis(basis);
  };
  // Small # / % pill shown in a percent-scored column's header -- stopPropagation so
  // picking a basis doesn't also fire the <th>'s own onSort (which would re-toggle
  // direction instead of just switching basis).
  const sortBasisToggle = (key, percentOfLabel) => {
    const active = (basis) => combinedSortKey === key && combinedSortBasis === basis;
    const btnClass = (basis) =>
      `px-1 py-0.5 ${active(basis) ? "bg-white text-ink" : "text-white/60 hover:bg-white/20"}`;
    return (
      <span className="inline-flex overflow-hidden rounded border border-white/30 text-[9px] font-bold leading-none" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => setCombinedSortBasisFor(key, "value")} className={btnClass("value")} title="Sort by raw count">
          #
        </button>
        <button type="button" onClick={() => setCombinedSortBasisFor(key, "percent")} className={btnClass("percent")} title={`Sort by % of ${percentOfLabel}`}>
          %
        </button>
      </span>
    );
  };
  const toggleInSet = (setter, key) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A multi-value region/zone user (see me.scope_values) needs the same
  // narrow-down-to-one picker a nationwide viewer gets -- otherwise there's no
  // way to focus on just one of their regions/zones.
  const canPickRegion = me.scope_type === "all" || (me.scope_type === "region" && me.scope_values.length > 1);
  const canPickZone =
    me.scope_type === "all" || me.scope_type === "region" || (me.scope_type === "zone" && me.scope_values.length > 1);
  const showFilterBar = me.scope_type !== "station";
  const canToggleEastMalaysia = me.scope_type === "all";

  const scopedStations = useMemo(() => {
    if (!data) return [];
    return canToggleEastMalaysia && !includeEastMalaysia
      ? data.stations.filter((s) => s.region !== "East Malaysia")
      : data.stations;
  }, [data, includeEastMalaysia, canToggleEastMalaysia]);

  const visibleRegions = useMemo(() => {
    let out = regions;
    if (canToggleEastMalaysia && !includeEastMalaysia) out = out.filter((r) => r.region !== "East Malaysia");
    if (me.scope_type === "region") out = out.filter((r) => me.scope_values.includes(r.region));
    return out;
  }, [regions, includeEastMalaysia, canToggleEastMalaysia, me.scope_type, me.scope_values]);

  // Region/Zone columns are redundant once they can only ever hold one value --
  // either an admin has filtered down to one, or the viewer's own access is
  // already confined to one. Hide them in that case instead of showing a
  // constant column.
  // 2026-09-21 feedback: a region/zone/station-scoped user can now hold more
  // than one value (see me.scope_values) -- only collapse the column when
  // there's exactly one, since 2+ values can span more than one region/zone.
  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  const load = () => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  };

  // Ticks up on an interval, purely to retrigger every tab's own fetch below --
  // see AUTO_REFRESH_INTERVAL_MS above.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(load, [refreshTick]);
  useEffect(() => {
    api.regions().then(setRegions).catch(() => {});
  }, []);
  // Surfaces the same freshness timestamp in the persistent header (see App.jsx) --
  // every snapshot table is written from the same captured_at in one refresh, so
  // this value is accurate for the whole app, not just Station Health/Action Board.
  useEffect(() => {
    if (data?.captured_at) onCapturedAt?.(data.captured_at);
  }, [data?.captured_at]);

  const zoneOptions = useMemo(() => {
    const zonesInRegion =
      regionFilter === "all" ? scopedStations : scopedStations.filter((s) => s.region === regionFilter);
    return [...new Set(zonesInRegion.map((s) => s.zone))].sort();
  }, [scopedStations, regionFilter]);

  const applyFilters = (rows) => {
    let out = rows;
    if (regionFilter !== "all") out = out.filter((r) => r.region === regionFilter);
    if (zoneFilter !== "all") out = out.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) => r.station_name.toLowerCase().includes(q));
    }
    return out;
  };

  // Clicking the Region/Zone header sorts primarily by that column, tie-broken by
  // 0-Attempt descending, so the worst offender in each region/zone surfaces first.
  const isGroupSort = sortKey === "region" || sortKey === "zone";

  const filteredStations = useMemo(() => {
    const rows = applyFilters(scopedStations);
    return [...rows].sort((a, b) => {
      if (isGroupSort) {
        const cmp = sortDir === "asc" ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey].localeCompare(a[sortKey]);
        if (cmp !== 0) return cmp;
        return b.zero_attempt_total - a.zero_attempt_total;
      }
      // 2026-09-21 feedback: Age >3 is scored as a % of Total In Hub (see
      // thresholds.js's percentOf), so sorting its header should rank stations
      // by that percentage, not the raw count -- a small station running mostly
      // aged is just as much a problem as a big one with a bigger raw number.
      if (sortKey === "age_gt3") {
        const aPct = a.total_in_hub ? (a.age_gt3 / a.total_in_hub) * 100 : 0;
        const bPct = b.total_in_hub ? (b.age_gt3 / b.total_in_hub) * 100 : 0;
        return sortDir === "asc" ? aPct - bPct : bPct - aPct;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [scopedStations, regionFilter, zoneFilter, search, sortKey, sortDir]);
  // The stations the filters above leave in view -- the DoD tab follows them.
  const filteredStationCodes = useMemo(() => new Set(filteredStations.map((s) => s.station_code)), [filteredStations]);

  // The "N stations in scope" count now lives in the header, as a small footnote after "Data as of"
  // (2026-09-25 feedback) -- reported up here the same way the freshness timestamp is.
  useEffect(() => {
    if (data) onStationsInScope?.(filteredStations.length);
  }, [data, filteredStations.length]);

  // Restricted to exactly the same stations as filteredStations -- the
  // Action Board aggregates by region/zone, and an aggregate delta is only
  // meaningful if both days are summed over the same set of stations.
  const filteredYesterdayStations = useMemo(() => {
    const codes = new Set(filteredStations.map((s) => s.station_code));
    return (data?.yesterday_stations || []).filter((s) => codes.has(s.station_code));
  }, [filteredStations, data]);

  // Summary cards: one level below whatever's currently "effective" -- the filter
  // pick (for admins) or the user's own fixed scope. Region cards -> pick one ->
  // zone cards for it; a region-scoped user goes straight to their zone cards; a
  // zone-scoped user gets their one zone's card; a station-scoped user gets none.
  // 2026-09-21 feedback: a region/zone-scoped user can hold more than one value
  // (me.scope_values) -- a single value behaves exactly as before, 2+ values get
  // their own list of cards (one per assigned region/zone) instead of assuming one.
  const isMultiRegion = me.scope_type === "region" && me.scope_values.length > 1;
  const isMultiZone = me.scope_type === "zone" && me.scope_values.length > 1;

  const effectiveRegion =
    regionFilter !== "all" ? regionFilter : me.scope_type === "region" && !isMultiRegion ? me.scope_values[0] : null;

  const cardMode =
    me.scope_type === "station"
      ? "none"
      : me.scope_type === "zone"
        ? isMultiZone && zoneFilter === "all"
          ? "zone-list"
          : "single-zone"
        : effectiveRegion
          ? "zones"
          : "regions";

  // Nationwide total, only meaningful (and only shown) when nothing is filtered
  // down AND the viewer actually sees the whole network -- a multi-region user's
  // "regions" cardMode is just their own subset, not the nationwide total.
  const showTotalCard = cardMode === "regions" && zoneFilter === "all" && me.scope_type === "all";

  const cardStats = (totals) => CARD_STATS.map((s) => ({ key: s.key, label: s.label, value: fmt(s.key, totals[s.key]) }));

  const cards = useMemo(() => {
    if (!data || cardMode === "none") return [];
    if (cardMode === "regions") {
      return visibleRegions.map((r) => ({
        key: r.region,
        label: r.region,
        active: false,
        clickable: true,
        totals: sumMetrics(scopedStations.filter((s) => s.region === r.region)),
        onClick: () => {
          setRegionFilter(r.region);
          setZoneFilter("all");
        },
      }));
    }
    if (cardMode === "zone-list") {
      return me.scope_values.map((z) => ({
        key: z,
        label: z,
        active: false,
        clickable: true,
        totals: sumMetrics(scopedStations.filter((s) => s.zone === z)),
        onClick: () => setZoneFilter(z),
      }));
    }
    if (cardMode === "single-zone") {
      const z = zoneFilter !== "all" ? zoneFilter : me.scope_values[0];
      return [
        {
          key: z,
          label: z,
          active: false,
          clickable: false,
          totals: sumMetrics(scopedStations.filter((s) => s.zone === z)),
        },
      ];
    }
    // zones within effectiveRegion
    const zones = [...new Set(scopedStations.filter((s) => s.region === effectiveRegion).map((s) => s.zone))].sort();
    return zones.map((z) => ({
      key: z,
      label: z,
      active: zoneFilter === z,
      clickable: true,
      totals: sumMetrics(scopedStations.filter((s) => s.zone === z)),
      onClick: () => setZoneFilter(zoneFilter === z ? "all" : z),
    }));
  }, [data, visibleRegions, scopedStations, cardMode, effectiveRegion, zoneFilter, me.scope_values]);

  const openDrilldown = (row, col) => {
    setModal({ stationCode: row.station_code, stationName: row.station_name, metricKey: col.key, metricLabel: col.label });
  };

  if (error)
    return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.captured_at)
    return (
      <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">
        No data yet — the first refresh hasn't run. {me.role === "admin" && "Use Superadmin → Refresh now."}
      </div>
    );

  // Region/zone tables each get their own column set since the colour scale for
  // a reference metric depends on which row set it's being ranked against.
  // Distinct banding per level (region darkest, zone lighter, station plain
  // white) so the three row types are unmistakable at a glance, not just from
  // the name column's own indentation/weight -- per 2026-09-20 feedback.
  // Which grouping levels this viewer sees (2026-09-25 feedback): nationwide viewers get
  // region -> zone -> station; a region-scoped user starts at region; a zone-scoped user at
  // zone; a station-scoped user sees stations only. Everyone who sees region / zone rows can
  // also switch them off (2026-09-25: nationwide viewers too). Nationwide viewers keep the click-to-expand behaviour (rows
  // start collapsed); scoped viewers' rows start expanded (the Sets then hold the COLLAPSED
  // ones), since they only have a few of them.
  const scopeType = me.scope_type;
  const canHideRegionRows = scopeType === "all" || scopeType === "region";
  const canHideZoneRows = scopeType !== "station";
  const showRegionRows = canHideRegionRows && levelPrefs.region;
  const showZoneRows = canHideZoneRows && levelPrefs.zone;
  const startsExpanded = scopeType !== "all";
  const isRegionOpen = (key) => (startsExpanded ? !expandedRegions.has(key) : expandedRegions.has(key));
  const isZoneOpen = (key) => (startsExpanded ? !expandedZones.has(key) : expandedZones.has(key));

  const combinedRowClassName = (row) => {
    if (FEATURES.detailPanel && detailRow && row.id === detailRow.id) return "bg-row-selected";
    if (row.type === "region") return FEATURES.healthTable ? "bg-row-region" : "bg-slate-100";
    if (row.type === "zone") return FEATURES.healthTable ? "bg-row-zone" : "bg-slate-50";
    return "";
  };
  const combinedColumns = [
    {
      key: "name",
      label: [showRegionRows && "Region", showZoneRows && "Zone", "Station"].filter(Boolean).join(" / "),
      sticky: true,
      align: "left",
      render: (row) => {
        const caret = row.type !== "station" ? (
          <span className="text-slate-400">
            {(row.type === "region" ? isRegionOpen(row.key) : isZoneOpen(row.key)) ? "▾" : "▸"}
          </span>
        ) : null;
        if (row.type === "region") {
          return (
            <span className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-ink">
              {caret}
              {row.displayName} <span className="text-xs font-normal normal-case text-slate-400">({row.station_count})</span>
            </span>
          );
        }
        if (row.type === "zone") {
          return (
            <span className="flex items-center gap-1.5 pl-5 font-display font-semibold text-slate-700">
              {caret}
              {row.displayName} <span className="text-xs font-normal text-slate-400">({row.station_count})</span>
            </span>
          );
        }
        return <span className="pl-10 text-slate-700">{row.displayName}</span>;
      },
    },
    ...ALL_COLUMNS.map((c) => {
      const natThreshold = resolveThreshold(thresholdRows, c.key, null);
      const isReference = !natThreshold.scored;
      const label = (
        <span className="inline-flex items-center gap-1">
          {FEATURES.healthTable ? HEALTH_SHORT[c.key] || c.label : c.label}
          {METRIC_NOTES[c.key] && !FEATURES.healthTable && <HeaderNote>{METRIC_NOTES[c.key]}</HeaderNote>}
          {!isReference && natThreshold.percent_of &&
            sortBasisToggle(c.key, ALL_COLUMNS.find((col) => col.key === natThreshold.percent_of)?.label || natThreshold.percent_of)}
        </span>
      );
      const clickable = row => row.type === "station" && DRILLDOWN_METRICS.has(c.key);
      if (isReference) {
        return {
          key: c.key,
          label,
          render: (row) => (c.key === "attendance" ? attendanceText(row) : fmt(c.key, row[c.key])),
          className: () => (FEATURES.healthTable ? "text-slate-500" : "text-slate-700"),
          onClick: DRILLDOWN_METRICS.has(c.key) ? (row) => openDrilldown(row, c) : undefined,
          clickable,
        };
      }
      const isPercentBased = PERCENT_METRICS.has(c.key) || !!natThreshold.percent_of;
      const scaledThreshold = (row) => {
        const t = resolveThreshold(thresholdRows, c.key, row.region);
        if (isPercentBased || row.type === "station") return t;
        return { ...t, warning_at: t.warning_at * row.station_count, critical_at: t.critical_at * row.station_count };
      };
      return {
        key: c.key,
        label,
        render: (row) => {
          const t = scaledThreshold(row);
          const sev = classify(t, row[c.key], row);
          if (FEATURES.healthTable) return fmtWithPercentOf(c.key, row[c.key], row, t);
          return `${SEVERITY_MARK[sev]}${fmtWithPercentOf(c.key, row[c.key], row, t)}`;
        },
        className: (row) => {
          const t = scaledThreshold(row);
          const sev = classify(t, row[c.key], row);
          return FEATURES.healthTable ? `${SEVERITY_CLASS[sev]} ${TINT_CLASS[sev]}` : SEVERITY_CLASS[sev];
        },
        onClick: DRILLDOWN_METRICS.has(c.key) ? (row) => openDrilldown(row, c) : undefined,
        clickable,
      };
    }),
  ];
  // Station Health trial (FEATURES.healthTable): short sub-labels under 9 group headers, a target line per column, and the person's chosen column groups.
  let tableColumns = combinedColumns;
  let healthGroupHeaders;
  if (FEATURES.healthTable) {
    const byKey = Object.fromEntries(combinedColumns.map((c) => [c.key, c]));
    tableColumns = [{ ...combinedColumns[0], headerAlign: "center" }];
    healthGroupHeaders = [];
    orderedGroups.filter((g) => !hiddenGroups.has(g.key)).forEach((g) => {
      let span = 0;
      g.columns.forEach(([key]) => {
        const base = byKey[key];
        if (!base) return;
        const full = ALL_COLUMNS.find((col) => col.key === key)?.label || key;
        const t = resolveThreshold(thresholdRows, key, null);
        tableColumns.push({
          ...base,
          title: [full, METRIC_NOTES[key], t.scored && targetLine(key, t) ? `Target: warning from ${targetLine(key, t).split(" / ")[0]}, critical from ${targetLine(key, t).split(" / ").pop()}` : "No SLA target (reference only)"]
            .filter(Boolean)
            .join("\n\n"),
          align: "center",
          groupStart: span === 0,
          reference: !t.scored,
          // a 0 has no tracking numbers to open -- no underline on it
          clickable: base.onClick ? (row) => row.type === "station" && row[key] > 0 : undefined,
        });
        span += 1;
      });
      if (span) healthGroupHeaders.push({ key: g.key, label: g.label, span });
    });
  }
  const activeSortPercentOf =
    combinedSortBasis === "percent" ? resolveThreshold(thresholdRows, combinedSortKey, null).percent_of : null;
  const combinedRows = buildCombinedRows(
    filteredStations,
    { showRegion: showRegionRows, showZone: showZoneRows },
    isRegionOpen,
    isZoneOpen,
    combinedSortKey,
    combinedSortDir,
    activeSortPercentOf
  );
  const handleCombinedRowClick = (row) => {
    if (row.type === "station") {
      setDetailRow(row);
    } else {
      toggleInSet(row.type === "region" ? setExpandedRegions : setExpandedZones, row.key);
    }
  };

  // Detail panel trial (FEATURES.detailPanel): the same metrics, under the Station Health group headings, with the count of flagged ones.
  const flaggedMetrics = [];
  const detailGroups =
    FEATURES.detailPanel && detailRow
      ? HEALTH_GROUPS.map((g) => ({
          label: g.label,
          rows: g.columns.map(([key]) => {
            const c = ALL_COLUMNS.find((col) => col.key === key);
            const reference = !resolveThreshold(thresholdRows, key, null).scored;
            const t = resolveThreshold(thresholdRows, key, detailRow.region);
            const sev = reference ? "reference" : classify(t, detailRow[key], detailRow);
            if (sev === "critical" || sev === "warning") flaggedMetrics.push({ key, label: c.label, sev });
            const hasTarget = !reference && !(t.warning_at === 0 && t.critical_at === 0);
            const percentOfLabel = t.percent_of ? ALL_COLUMNS.find((col) => col.key === t.percent_of)?.label : null;
            return {
              label: c.label,
              value: key === "attendance" ? attendanceText(detailRow) : fmtWithPercentOf(key, detailRow[key], detailRow, t),
              className: SEVERITY_CLASS[sev],
              tint: TINT_CLASS[sev],
              target: hasTarget ? `${t.direction === "lower-is-worse" ? "≥" : "≤"} ${t.warning_at}${percentOfLabel ? `% of ${percentOfLabel}` : ""}` : null,
            };
          }),
        }))
      : null;
  const copyFlaggedTns = async (asCsv) => {
    const keys = flaggedMetrics.filter((m) => DRILLDOWN_METRICS.has(m.key));
    setFlaggedBusy(true);
    try {
      const results = await Promise.all(
        keys.map((m) =>
          api
            .drilldown(detailRow.station_code, m.key)
            .then((r) => ({ ...m, tns: r.tracking_numbers || [] }))
            .catch(() => ({ ...m, tns: [] }))
        )
      );
      if (asCsv) {
        const max = Math.max(0, ...results.map((r) => r.tns.length));
        exportCsv(
          `daily-ops-${detailRow.station_name.replace(/\s+/g, "-").toLowerCase()}-flagged-tns-${new Date().toISOString().slice(0, 10)}.csv`,
          results.map((r) => r.label),
          Array.from({ length: max }, (_, i) => results.map((r) => r.tns[i] || ""))
        );
      } else {
        await navigator.clipboard.writeText(results.map((r) => `${r.label} (${r.tns.length}):\n${r.tns.join("\n")}`).join("\n\n"));
        setFlaggedCopied(true);
        setTimeout(() => setFlaggedCopied(false), 2000);
      }
    } finally {
      setFlaggedBusy(false);
    }
  };

  const detailRows = detailRow
    ? ALL_COLUMNS.map((c) => {
        const isReference = !resolveThreshold(thresholdRows, c.key, null).scored;
        const t = resolveThreshold(thresholdRows, c.key, detailRow.region);
        const sev = isReference ? "reference" : classify(t, detailRow[c.key], detailRow);
        const hasTarget = !isReference && !(t.warning_at === 0 && t.critical_at === 0);
        const percentOfLabel = t.percent_of ? ALL_COLUMNS.find((col) => col.key === t.percent_of)?.label : null;
        return {
          label: c.label,
          value:
            c.key === "attendance"
              ? attendanceText(detailRow)
              : `${SEVERITY_MARK[sev]}${fmtWithPercentOf(c.key, detailRow[c.key], detailRow, t)}`,
          className: SEVERITY_CLASS[sev],
          target: hasTarget
            ? `target ${t.direction === "lower-is-worse" ? "≥" : "≤"} ${t.warning_at}${
                percentOfLabel ? `% of ${percentOfLabel}` : ""
              }`
            : null,
        };
      })
    : [];

  return (
    <div className="space-y-4">
      <TnModal state={modal} onClose={() => setModal(null)} fetcher={api.drilldown} />
      <DetailPanel
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={detailRow?.station_name}
        subtitle={
          detailRow
            ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}${detailGroups ? ` · ${flaggedMetrics.length} metric${flaggedMetrics.length === 1 ? "" : "s"} flagged` : ""}`
            : null
        }
        rows={detailRows}
        groups={detailGroups}
        footer={
          detailGroups && flaggedMetrics.some((m) => DRILLDOWN_METRICS.has(m.key)) ? (
            <>
              <button
                type="button"
                disabled={flaggedBusy}
                onClick={() => copyFlaggedTns(false)}
                className="min-h-[44px] flex-1 rounded-lg bg-ink px-3 font-display text-xs font-semibold text-white disabled:opacity-50"
              >
                {flaggedCopied ? "Copied!" : flaggedBusy ? "Loading…" : "Copy flagged tracking numbers"}
              </button>
              <button
                type="button"
                disabled={flaggedBusy}
                onClick={() => copyFlaggedTns(true)}
                className="min-h-[44px] rounded-lg border border-slate-300 px-4 font-display text-xs font-medium text-ink-2 disabled:opacity-50"
              >
                CSV
              </button>
            </>
          ) : null
        }
      />

      {!FEATURES.hideSummaryCards && showTotalCard && (
        <SummaryCard label="TOTAL LAST MILE" active={false} clickable={false} emphasis stats={cardStats(sumMetrics(scopedStations))} />
      )}

      {!FEATURES.hideSummaryCards && cards.length > 0 && (
        // One column per card (up to 5) so the row always spans the same full width as the TOTAL LAST
        // MILE card above it -- a fixed 5-column grid left a gap when there were only 4 regions.
        <div
          className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${
            { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[cards.length] || "lg:grid-cols-5"
          }`}
        >
          {cards.map((c) => (
            <SummaryCard
              key={c.key}
              label={c.label}
              active={c.active}
              clickable={c.clickable}
              onClick={c.onClick}
              stats={cardStats(c.totals)}
            />
          ))}
        </div>
      )}

      {showFilterBar && (
        <FilterBar
          canPickRegion={canPickRegion}
          canPickZone={canPickZone}
          canToggleEastMalaysia={canToggleEastMalaysia}
          regionFilter={regionFilter}
          onRegionFilterChange={(v) => {
            setRegionFilter(v);
            setZoneFilter("all");
          }}
          zoneFilter={zoneFilter}
          onZoneFilterChange={setZoneFilter}
          visibleRegions={visibleRegions}
          zoneOptions={zoneOptions}
          includeEastMalaysia={includeEastMalaysia}
          onIncludeEastMalaysiaChange={(checked) => {
            setIncludeEastMalaysia(checked);
            if (!checked && regionFilter === "East Malaysia") setRegionFilter("all");
          }}
          search={search}
          onSearchChange={setSearch}
          onClear={() => {
            setRegionFilter("all");
            setZoneFilter("all");
          }}
        />
      )}

      {!sidebar && (
        <TabBar
          tabs={tabs.map((t) =>
            t.key === "urgent"
              ? {
                  ...t,
                  // With the Task List flag on, this tab is the Task List and its bell adds up all four sub-tabs.
                  label: FEATURES.taskList ? "Task List" : t.label,
                  ...taskListBadges(notifCounts, FEATURES.taskList),
                }
              : t
          )}
          activeKey={tab}
          onSelect={setTab}
        />
      )}

      {tab === "action" && (
        <ActionBoard
          stations={filteredStations}
          yesterdayStations={filteredYesterdayStations}
          thresholdRows={thresholdRows}
          me={me}
          onFilterTo={(filterLevel, value, region) => {
            if (filterLevel === "region") {
              setRegionFilter(value);
              setZoneFilter("all");
            } else if (filterLevel === "zone") {
              if (region) setRegionFilter(region);
              setZoneFilter(value);
            }
            setTab("health");
          }}
        />
      )}

      {tab === "health" && (
        <>
          {FEATURES.healthTable && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-slate-500">Column groups</span>
              {orderedGroups.map((g, i) => {
                const shown = !hiddenGroups.has(g.key);
                const arrow = shown ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-ink";
                return (
                  <span
                    key={g.key}
                    draggable
                    onDragStart={(e) => {
                      setDragGroup(g.key);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", g.key);
                    }}
                    onDragOver={(e) => {
                      if (dragGroup) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragGroup) moveGroup(orderedGroups.findIndex((x) => x.key === dragGroup), i);
                      setDragGroup(null);
                    }}
                    onDragEnd={() => setDragGroup(null)}
                    className={`inline-flex min-h-[32px] cursor-grab items-center rounded-full border font-display text-xs font-semibold ${
                      shown ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-slate-500"
                    } ${dragGroup === g.key ? "opacity-40" : ""}`}
                  >
                    <button type="button" onClick={() => moveGroup(i, i - 1)} disabled={i === 0} aria-label={`Move ${g.label} left`} className={`pl-2.5 pr-0.5 disabled:opacity-25 ${arrow}`}>
                      ‹
                    </button>
                    <button type="button" aria-pressed={shown} onClick={() => toggleGroup(g.key)} title={shown ? "Click to hide this group" : "Click to show this group"} className="px-1.5">
                      {g.label} <span className={shown ? "text-white/60" : "text-slate-400"}>{g.columns.length}</span>
                    </button>
                    <button type="button" onClick={() => moveGroup(i, i + 1)} disabled={i === orderedGroups.length - 1} aria-label={`Move ${g.label} right`} className={`pl-0.5 pr-2.5 disabled:opacity-25 ${arrow}`}>
                      ›
                    </button>
                  </span>
                );
              })}
              <span className="text-[10px] text-slate-400">click to show / hide · drag a pill (or use ‹ ›) to reorder the columns · saved for you</span>
            </div>
          )}
          <DataTable
            title={
              <>
                Station Health{" "}
                <span className="font-normal text-slate-400">
                  — {showRegionRows || showZoneRows ? "click a region/zone row to expand or collapse it, " : ""}click a station
                  row for detail, click a number for tracking IDs, click a column header to sort
                  {showRegionRows || showZoneRows ? " (sorts within each group without changing what's expanded)" : ""}
                </span>
              </>
            }
            titleExtra={
              <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
                {canHideRegionRows && (
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <input type="checkbox" checked={levelPrefs.region} onChange={(e) => setLevelPref("region", e.target.checked)} />
                    Show region rows
                  </label>
                )}
                {canHideZoneRows && (
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <input type="checkbox" checked={levelPrefs.zone} onChange={(e) => setLevelPref("zone", e.target.checked)} />
                    Show zone rows
                  </label>
                )}
                <button
                  onClick={() => exportStationHealthCsv(combinedRows.filter((r) => r.type === "station"))}
                  className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Export CSV
                </button>
              </div>
            }
            maxHeight="75vh"
            columns={tableColumns}
            groupHeaders={healthGroupHeaders}
            dense={!!FEATURES.healthTable}
            rows={combinedRows}
            rowKey={(r) => r.id}
            rowClassName={combinedRowClassName}
            onRowClick={handleCombinedRowClick}
            sortKey={combinedSortKey}
            sortDir={combinedSortDir}
            onSort={toggleCombinedSort}
            emptyMessage="No stations match."
            footer={`${combinedRows.filter((r) => r.type === "station").length} of ${filteredStations.length} stations shown · first column pinned, header freezes while scrolling`}
          />
          {FEATURES.healthTable && (
            <p className="text-xs text-slate-500">
              Red tint = critical, amber tint = warning · greyed header = reference only (no SLA) · underlined number → tracking numbers · hover a column name
              for what it counts and its target from SLA Targets (warning / critical).
            </p>
          )}
          <p className="text-xs text-slate-400">
            ▲ critical · ■ warning — colour is never the only signal. Greyed column headers are reference data: no
            SLA, never scored, shown for context only. Targets are set in Superadmin → SLA Targets. A region/zone row's
            raw-count target scales up by how many stations it contains (e.g. a target of 100 becomes 500 for a
            5-station region) — a percentage target (or a metric scored as "% of" another field) never scales, the
            same number applies at every level. Total Fresh, Total Routed, Attendance and COD % (Hub) aren't
            clickable — their source queries don't return individual tracking numbers. Click the ⓘ next to a column
            name for what that metric counts and what to do about it. A column scored as "% of" another field (e.g.
            Age &gt;3) shows a # / % toggle in its header — pick whether sorting ranks stations by the raw count or
            by that percentage.
          </p>
        </>
      )}

      {FEATURES.processingTime && tab === "processingTime" && (
        <ProcessingTimeTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
          refreshTick={refreshTick}
        />
      )}

      {FEATURES.dailyKpi && tab === "dailyKpi" && (
        <DailyKpiTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
          refreshTick={refreshTick}
        />
      )}

      {FEATURES.dod && tab === "dod" && <DodTab stationCodes={filteredStationCodes} />}

      {tab === "shipment" && (
        <ShipmentDetailsTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
          refreshTick={refreshTick}
        />
      )}

      {tab === "routed" && (
        <RoutedViewTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
          refreshTick={refreshTick}
        />
      )}

      {tab === "shipper" && (
        <ShipperWatchTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
          refreshTick={refreshTick}
        />
      )}

      {tab === "recovery" && (
        <RecoveryTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
          refreshTick={refreshTick}
        />
      )}

      {tab === "aging" && (
        <AgingDetailsTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
          refreshTick={refreshTick}
        />
      )}

      {tab === "rpu" && (
        <RpuTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
          refreshTick={refreshTick}
        />
      )}

      {tab === "urgent" &&
        (FEATURES.taskList ? (
          <TaskListTab me={me} refreshTick={refreshTick} notifCounts={notifCounts} />
        ) : (
          <UrgentTnTab me={me} refreshTick={refreshTick} />
        ))}
    </div>
  );
}
