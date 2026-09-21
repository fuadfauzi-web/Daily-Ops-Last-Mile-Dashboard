import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { useThresholds, resolveThreshold, classify, SEVERITY_MARK, SEVERITY_CLASS } from "./lib/thresholds";
import { minMax, colorScaleClass } from "./lib/colorScale";
import { ALL_COLUMNS } from "./lib/metrics";
import { exportCsv } from "./lib/csv";
import SummaryCard from "./components/SummaryCard";
import DataTable from "./components/DataTable";
import GroupTable from "./components/GroupTable";
import SegmentedControl from "./components/SegmentedControl";
import FilterBar from "./components/FilterBar";
import TnModal from "./components/TnModal";
import DetailPanel from "./components/DetailPanel";
import TabBar from "./components/TabBar";
import Skeleton from "./components/Skeleton";
import ActionBoard from "./ActionBoard";
import ShipmentDetailsTab from "./ShipmentDetailsTab";
import RoutedViewTab from "./RoutedViewTab";
import ShipperWatchTab from "./ShipperWatchTab";
import AgingDetailsTab from "./AgingDetailsTab";
import RpuTab from "./RpuTab";
import RestockTab from "./RestockTab";
import RecoveryTab from "./RecoveryTab";
import UrgentTnTab from "./UrgentTnTab";

// Metrics with an actual tracking-number list behind them server-side (mirrors
// backend/aggregate.py's DRILLDOWN_METRICS) -- everything else is a route-level
// total or a percentage, with nothing to list.
const DRILLDOWN_METRICS = new Set([
  "total_in_hub", "zero_attempt", "zero_attempt_gt_d0", "on_hold",
  "pending_ats_zero_attempt", "pending_ats_attempted",
  "missing_open", "missing_hub", "missing_ship_in",
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
  { key: "health", label: "Station Health" },
  { key: "routed", label: "Route Monitoring" },
  { key: "aging", label: "Aging Details" },
  { key: "rpu", label: "RPU" },
  { key: "recovery", label: "Recovery" },
  { key: "shipper", label: "Shipper Watch" },
  { key: "restock", label: "Restock" },
  { key: "urgent", label: "Urgent TN" },
];

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
function sortSiblings(rows, sortKey, sortDir, nameField) {
  if (!sortKey) return rows;
  const key = sortKey === "name" ? nameField : sortKey;
  return [...rows].sort((a, b) => {
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
function buildCombinedRows(stations, expandedRegions, expandedZones, sortKey, sortDir) {
  const rows = [];
  sortSiblings(localRollup(stations, "region"), sortKey, sortDir, "key").forEach((r) => {
    rows.push({ ...r, type: "region", id: `region:${r.key}`, displayName: r.key });
    if (!expandedRegions.has(r.key)) return;
    const stationsInRegion = stations.filter((s) => s.region === r.key);
    sortSiblings(localRollup(stationsInRegion, "zone"), sortKey, sortDir, "key").forEach((z) => {
      rows.push({ ...z, type: "zone", id: `zone:${z.key}`, displayName: z.key });
      if (!expandedZones.has(z.key)) return;
      sortSiblings(stationsInRegion.filter((s) => s.zone === z.key), sortKey, sortDir, "station_name").forEach((s) =>
        rows.push({ ...s, type: "station", id: `station:${s.station_code}`, displayName: s.station_name })
      );
    });
  });
  return rows;
}

function exportStationHealthCsv(rows) {
  const headers = ["Region", "Zone", "Station", ...ALL_COLUMNS.map((c) => c.label)];
  const values = rows.map((r) => [r.region, r.zone, r.station_name, ...ALL_COLUMNS.map((c) => r[c.key])]);
  exportCsv(`daily-ops-station-health-${new Date().toISOString().slice(0, 10)}.csv`, headers, values);
}

// "Compare vs. yesterday": diff against the same station's snapshot from
// ~24h ago. Reference metrics always render a neutral grey delta (more/less
// isn't good/bad for those); scored metrics colour it by whether the change
// moved the wrong way for that metric's own direction.
function deltaFor(key, current, previous, direction, isReference) {
  if (previous == null) return null;
  const diff = current - previous;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const magnitude = PERCENT_METRICS.has(key) ? `${Math.abs(diff).toFixed(1)}%` : Math.abs(diff).toLocaleString();
  const text = diff === 0 ? "0" : `${sign}${magnitude}`;
  if (isReference || diff === 0) return { text, className: "text-slate-400" };
  const worse = direction === "lower-is-worse" ? diff < 0 : diff > 0;
  return { text, className: worse ? "text-status-critical" : "text-status-good" };
}

export default function Dashboard({ me, onCapturedAt }) {
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
  const tabStorageKey = `dashboard-tab-${me.email}`;
  const [tab, setTabState] = useState(() => {
    try {
      const saved = localStorage.getItem(tabStorageKey);
      if (saved && TABS.some((t) => t.key === saved)) return saved;
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
  const [modal, setModal] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  // East Malaysia is Retail, not Last Mile -- admins/full-access viewers can
  // toggle it back in. Defaults to excluded per 2026-09-20 feedback.
  const [includeEastMalaysia, setIncludeEastMalaysia] = useState(false);
  const [compareYesterday, setCompareYesterday] = useState(() => {
    try {
      return localStorage.getItem("dashboard-compare-yesterday") === "1";
    } catch {
      return false;
    }
  });
  const toggleCompareYesterday = () => {
    setCompareYesterday((v) => {
      const next = !v;
      try {
        localStorage.setItem("dashboard-compare-yesterday", next ? "1" : "0");
      } catch {
        /* private browsing / storage blocked -- choice just won't persist */
      }
      return next;
    });
  };

  // Experimental (2026-09-20, staging only): Station Health as one combined
  // region -> zone -> station table instead of three separate ones. Not
  // persisted -- this is here to try, not to commit to yet.
  const [stationHealthView, setStationHealthView] = useState("separate");
  const [expandedRegions, setExpandedRegions] = useState(() => new Set());
  const [expandedZones, setExpandedZones] = useState(() => new Set());
  const [combinedSortKey, setCombinedSortKey] = useState(null);
  const [combinedSortDir, setCombinedSortDir] = useState("asc");
  const toggleCombinedSort = (key) => {
    if (key === combinedSortKey) setCombinedSortDir(combinedSortDir === "asc" ? "desc" : "asc");
    else {
      setCombinedSortKey(key);
      setCombinedSortDir("asc");
    }
  };
  const toggleInSet = (setter, key) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const canPickRegion = me.scope_type === "all";
  const canPickZone = me.scope_type === "all" || me.scope_type === "region";
  const showFilterBar = me.scope_type !== "station";
  const canToggleEastMalaysia = me.scope_type === "all";

  const scopedStations = useMemo(() => {
    if (!data) return [];
    return canToggleEastMalaysia && !includeEastMalaysia
      ? data.stations.filter((s) => s.region !== "East Malaysia")
      : data.stations;
  }, [data, includeEastMalaysia, canToggleEastMalaysia]);

  const visibleRegions = useMemo(() => {
    if (canToggleEastMalaysia && !includeEastMalaysia) return regions.filter((r) => r.region !== "East Malaysia");
    return regions;
  }, [regions, includeEastMalaysia, canToggleEastMalaysia]);

  // Region/Zone columns are redundant once they can only ever hold one value --
  // either an admin has filtered down to one, or the viewer's own access is
  // already confined to one. Hide them in that case instead of showing a
  // constant column.
  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

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
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [scopedStations, regionFilter, zoneFilter, search, sortKey, sortDir]);

  const filteredRegionGroups = useMemo(() => localRollup(filteredStations, "region"), [filteredStations]);
  const filteredZoneGroups = useMemo(() => localRollup(filteredStations, "zone"), [filteredStations]);

  // Reference metrics (no SLA) get a relative colour scale instead of a flat
  // grey -- region/zone tables scale each metric against every region/zone
  // shown; the station table is fixed to scale each station only against the
  // other stations in its own zone (per 2026-09-20 feedback).
  const regionRangeByMetric = useMemo(() => {
    const map = {};
    ALL_COLUMNS.forEach((c) => {
      map[c.key] = minMax(filteredRegionGroups.map((g) => g[c.key]));
    });
    return map;
  }, [filteredRegionGroups]);
  const zoneRangeByMetric = useMemo(() => {
    const map = {};
    ALL_COLUMNS.forEach((c) => {
      map[c.key] = minMax(filteredZoneGroups.map((g) => g[c.key]));
    });
    return map;
  }, [filteredZoneGroups]);
  const stationRangeByMetricAndZone = useMemo(() => {
    const byZone = {};
    filteredStations.forEach((s) => {
      if (!byZone[s.zone]) byZone[s.zone] = [];
      byZone[s.zone].push(s);
    });
    const map = {};
    ALL_COLUMNS.forEach((c) => {
      map[c.key] = {};
      Object.entries(byZone).forEach(([zone, rows]) => {
        map[c.key][zone] = minMax(rows.map((r) => r[c.key]));
      });
    });
    return map;
  }, [filteredStations]);

  const yesterdayByCode = useMemo(() => {
    const m = new Map();
    (data?.yesterday_stations || []).forEach((r) => m.set(r.station_code, r));
    return m;
  }, [data]);

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
  const effectiveRegion = regionFilter !== "all" ? regionFilter : me.scope_type === "region" ? me.scope_value : null;

  const cardMode = me.scope_type === "station" ? "none" : me.scope_type === "zone" ? "single-zone" : effectiveRegion ? "zones" : "regions";

  // Nationwide total, only meaningful (and only shown) when nothing is filtered down.
  const showTotalCard = cardMode === "regions" && zoneFilter === "all";

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
    if (cardMode === "single-zone") {
      return [
        {
          key: me.scope_value,
          label: me.scope_value,
          active: false,
          clickable: false,
          totals: sumMetrics(scopedStations.filter((s) => s.zone === me.scope_value)),
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
  }, [data, visibleRegions, scopedStations, cardMode, effectiveRegion, zoneFilter, me.scope_value]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "region" || key === "zone" ? "asc" : "desc");
    }
  };

  const openDrilldown = (row, col) => {
    setModal({ stationCode: row.station_code, stationName: row.station_name, metricKey: col.key, metricLabel: col.label });
  };

  if (error)
    return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.captured_at)
    return (
      <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">
        No data yet — the first refresh hasn't run. {me.role === "admin" && "Use Admin → Refresh now."}
      </div>
    );

  // Region/zone tables each get their own column set since the colour scale for
  // a reference metric depends on which row set it's being ranked against.
  const buildGroupColumns = (rangeByMetric) =>
    ALL_COLUMNS.map((c) => {
      const natThreshold = resolveThreshold(thresholdRows, c.key, null);
      const isReference = !natThreshold.scored;
      if (isReference) {
        return {
          key: c.key,
          label: c.label,
          render: (g) => fmt(c.key, g[c.key]),
          className: (g) => colorScaleClass(g[c.key], rangeByMetric[c.key]),
        };
      }
      // Scored metrics: a region/zone row sums every one of its stations' raw
      // counts, so a raw-count target has to scale the same way (SLA of 100 per
      // station * 5 stations in South 1 = 500 for South 1) -- per 2026-09-20
      // feedback. A percentage target (or a metric already scored as "% of"
      // another field) never scales -- both its numerator and denominator
      // already sum proportionally, so the same threshold applies as-is.
      const isPercentBased = PERCENT_METRICS.has(c.key) || !!natThreshold.percent_of;
      const scaledThreshold = (g) => {
        const t = resolveThreshold(thresholdRows, c.key, g.region);
        if (isPercentBased) return t;
        return { ...t, warning_at: t.warning_at * g.station_count, critical_at: t.critical_at * g.station_count };
      };
      return {
        key: c.key,
        label: c.label,
        render: (g) => {
          const t = scaledThreshold(g);
          const sev = classify(t, g[c.key], g);
          return `${SEVERITY_MARK[sev]}${fmtWithPercentOf(c.key, g[c.key], g, t)}`;
        },
        className: (g) => {
          const t = scaledThreshold(g);
          const sev = classify(t, g[c.key], g);
          return SEVERITY_CLASS[sev];
        },
      };
    });
  const regionGroupColumns = buildGroupColumns(regionRangeByMetric);
  const zoneGroupColumns = buildGroupColumns(zoneRangeByMetric);

  // Experimental combined table: one column set that works for a region row,
  // a zone row, or a station row alike -- reference metrics pick the range
  // matching that row's own level; scored metrics scale their target by
  // station_count the same way buildGroupColumns does (station rows use
  // station_count 1, i.e. unscaled).
  const referenceRangeFor = (row, key) => {
    if (row.type === "region") return regionRangeByMetric[key];
    if (row.type === "zone") return zoneRangeByMetric[key];
    return stationRangeByMetricAndZone[key]?.[row.zone];
  };
  // Distinct banding per level (region darkest, zone lighter, station plain
  // white) so the three row types are unmistakable at a glance, not just from
  // the name column's own indentation/weight -- per 2026-09-20 feedback.
  const combinedRowClassName = (row) => {
    if (row.type === "region") return "bg-slate-100";
    if (row.type === "zone") return "bg-slate-50";
    return "";
  };
  const combinedColumns = [
    {
      key: "name",
      label: "Region / Zone / Station",
      sticky: true,
      align: "left",
      render: (row) => {
        const caret = row.type !== "station" ? (
          <span className="text-slate-400">
            {(row.type === "region" ? expandedRegions : expandedZones).has(row.key) ? "▾" : "▸"}
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
      if (isReference) {
        return {
          key: c.key,
          label: c.label,
          render: (row) => fmt(c.key, row[c.key]),
          className: (row) => colorScaleClass(row[c.key], referenceRangeFor(row, c.key)),
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
        label: c.label,
        render: (row) => {
          const t = scaledThreshold(row);
          const sev = classify(t, row[c.key], row);
          return `${SEVERITY_MARK[sev]}${fmtWithPercentOf(c.key, row[c.key], row, t)}`;
        },
        className: (row) => {
          const t = scaledThreshold(row);
          const sev = classify(t, row[c.key], row);
          return SEVERITY_CLASS[sev];
        },
      };
    }),
  ];
  const combinedRows =
    stationHealthView === "separate"
      ? []
      : buildCombinedRows(filteredStations, expandedRegions, expandedZones, combinedSortKey, combinedSortDir);
  const handleCombinedRowClick = (row) => {
    if (row.type === "station") {
      setDetailRow(row);
    } else {
      toggleInSet(row.type === "region" ? setExpandedRegions : setExpandedZones, row.key);
    }
  };

  const stationColumns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", render: (r) => r.region, className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", render: (r) => r.zone, className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left", render: (r) => r.station_name },
    ...ALL_COLUMNS.map((c) => {
      // Header greying reflects the nationwide row -- whether a metric has an
      // SLA at all isn't something that should flip on/off per region.
      const natThreshold = resolveThreshold(thresholdRows, c.key, null);
      const isReference = !natThreshold.scored;
      // Metrics scored as "% of X" (Admin -> SLA Targets) get a small note under
      // the header naming X, so it's clear what the shown percentage is relative
      // to -- e.g. Age >3 is % of Total In Hub, not % of nationwide volume.
      const percentOfCol = natThreshold.percent_of ? ALL_COLUMNS.find((col) => col.key === natThreshold.percent_of) : null;
      return {
        key: c.key,
        label: percentOfCol ? (
          <>
            {c.label}
            <div className="text-[10px] font-normal normal-case text-slate-300">% of {percentOfCol.label}</div>
          </>
        ) : (
          c.label
        ),
        reference: isReference,
        render: (r) => {
          const t = resolveThreshold(thresholdRows, c.key, r.region);
          const sev = isReference ? "reference" : classify(t, r[c.key], r);
          const base = `${SEVERITY_MARK[sev]}${fmtWithPercentOf(c.key, r[c.key], r, t)}`;
          if (!compareYesterday) return base;
          const yRow = yesterdayByCode.get(r.station_code);
          if (!yRow) return base;
          const d = deltaFor(c.key, r[c.key], yRow[c.key], t.direction, isReference);
          if (!d) return base;
          return (
            <>
              {base} <span className={`text-[11px] ${d.className}`}>{d.text}</span>
            </>
          );
        },
        className: (r) => {
          if (isReference) return colorScaleClass(r[c.key], stationRangeByMetricAndZone[c.key]?.[r.zone]);
          const sev = classify(resolveThreshold(thresholdRows, c.key, r.region), r[c.key], r);
          return SEVERITY_CLASS[sev];
        },
        onClick: DRILLDOWN_METRICS.has(c.key) ? (r) => openDrilldown(r, c) : undefined,
      };
    }),
  ];

  const detailRows = detailRow
    ? ALL_COLUMNS.map((c) => {
        const isReference = !resolveThreshold(thresholdRows, c.key, null).scored;
        const t = resolveThreshold(thresholdRows, c.key, detailRow.region);
        const sev = isReference ? "reference" : classify(t, detailRow[c.key], detailRow);
        const yRow = yesterdayByCode.get(detailRow.station_code);
        const d = compareYesterday && yRow ? deltaFor(c.key, detailRow[c.key], yRow[c.key], t.direction, isReference) : null;
        const hasTarget = !isReference && !(t.warning_at === 0 && t.critical_at === 0);
        const percentOfLabel = t.percent_of ? ALL_COLUMNS.find((col) => col.key === t.percent_of)?.label : null;
        return {
          label: c.label,
          value: `${SEVERITY_MARK[sev]}${fmtWithPercentOf(c.key, detailRow[c.key], detailRow, t)}`,
          className: SEVERITY_CLASS[sev],
          target: hasTarget
            ? `target ${t.direction === "lower-is-worse" ? "≥" : "≤"} ${t.warning_at}${
                percentOfLabel ? `% of ${percentOfLabel}` : ""
              }`
            : null,
          delta: d ? d.text : null,
          deltaClassName: d ? d.className : null,
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
        subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
        rows={detailRows}
      />

      <div className="text-sm text-slate-500">{filteredStations.length} stations in scope</div>

      {showTotalCard && (
        <SummaryCard label="TOTAL LAST MILE" active={false} clickable={false} emphasis stats={cardStats(sumMetrics(scopedStations))} />
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
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

      <TabBar tabs={TABS} activeKey={tab} onSelect={setTab} />

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
          {/* Experimental (2026-09-20, staging only) -- not applicable to a
              station-scoped user, who only ever has one station to show anyway. */}
          {me.scope_type !== "station" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xs font-semibold text-slate-700">Table style (trying out):</span>
              <SegmentedControl
                options={[
                  { key: "separate", label: "Separate tables" },
                  { key: "combined", label: "Combined — click to expand" },
                ]}
                value={stationHealthView}
                onChange={setStationHealthView}
              />
            </div>
          )}

          {stationHealthView !== "separate" && me.scope_type !== "station" ? (
            <>
              <DataTable
                title={
                  <>
                    Station Health — combined{" "}
                    <span className="font-normal text-slate-400">
                      — click a region/zone row to expand it, click a station row for detail, click a column header to
                      sort (sorts what's currently shown within its own region/zone, doesn't change what's expanded)
                    </span>
                  </>
                }
                titleExtra={
                  <button
                    onClick={() =>
                      exportStationHealthCsv(combinedRows.filter((r) => r.type === "station"))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                }
                maxHeight="75vh"
                columns={combinedColumns}
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
              <p className="text-xs text-slate-400">
                Experimental view -- doesn't yet support Compare vs. yesterday or click-a-number-for-tracking-IDs; use
                Separate tables for those. ▲ critical · ■ warning; grey/shaded = reference metric (no SLA), shaded
                darkest-to-lightest by relative rank within that row's own level (region row vs. all regions, zone row
                vs. all zones, station row vs. other stations in its own zone).
              </p>
            </>
          ) : (
            <>
          <GroupTable title="By region (follows filters below)" groupLabel="Region" rows={filteredRegionGroups} columns={regionGroupColumns} />
          <GroupTable title="By zone (follows filters below)" groupLabel="Zone" rows={filteredZoneGroups} columns={zoneGroupColumns} />

          <DataTable
            title={
              <>
                Station Health{" "}
                <span className="font-normal text-slate-400">— click a number for tracking IDs, click a row for detail</span>
              </>
            }
            titleExtra={
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleCompareYesterday}
                  title={data.yesterday_captured_at ? `vs. ${formatTime(data.yesterday_captured_at)}` : "No snapshot from ~24h ago yet"}
                  className={`rounded-lg border px-3 py-1 font-display text-xs font-semibold ${
                    compareYesterday ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  Δ vs. yesterday
                </button>
                <button
                  onClick={() => exportStationHealthCsv(filteredStations)}
                  className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Export CSV
                </button>
              </div>
            }
            maxHeight="70vh"
            columns={stationColumns}
            rows={filteredStations}
            rowKey={(r) => r.station_code}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(r) => setDetailRow(r)}
            emptyMessage="No stations match."
            subHeader={isGroupSort ? `Sorted by ${sortKey}, then 0-Attempt (highest first) within each ${sortKey}` : null}
            footer={`${filteredStations.length} rows · first column pinned, header freezes while scrolling`}
          />
          <p className="text-xs text-slate-400">
            ▲ critical · ■ warning — colour is never the only signal. Greyed column headers are reference data: no
            SLA, never scored. Targets are set in Admin → SLA Targets. By region/By zone, a raw-count target scales
            up by how many stations are in that region/zone (e.g. a target of 100 becomes 500 for a 5-station
            region) — a percentage target (or a metric scored as "% of" another field) never scales, the same number
            applies at every level. Reference metrics (e.g. Total Fresh) instead shade darkest-to-lightest by
            relative rank — By region/By zone rank against every region/zone shown; this table ranks each station
            only against other stations in its own zone. That shading is a ranking, not a pass/fail judgement.
            {compareYesterday && " Small numbers next to each value are the change vs. ~24h ago."} Total Fresh,
            Total Routed, Attendance and COD % (Hub) aren't clickable — their source queries don't return individual
            tracking numbers.
          </p>
            </>
          )}
        </>
      )}

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

      {tab === "restock" && (
        <RestockTab
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

      {tab === "urgent" && <UrgentTnTab me={me} refreshTick={refreshTick} />}
    </div>
  );
}
