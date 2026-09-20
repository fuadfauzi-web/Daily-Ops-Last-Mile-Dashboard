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
import GuideTab from "./GuideTab";

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
  { key: "zero_attempt", label: "0 Att" },
  { key: "total_in_hub", label: "In Hub" },
  { key: "age_gt3", label: "Age>3" },
];

const TABS = [
  { key: "action", label: "Action Board" },
  { key: "shipment", label: "Shipment Details" },
  { key: "health", label: "Station Health" },
  { key: "routed", label: "Routed View" },
  { key: "aging", label: "Aging Details" },
  { key: "rpu", label: "RPU" },
  { key: "recovery", label: "Recovery" },
  { key: "shipper", label: "Shipper Watch" },
  { key: "restock", label: "Restock" },
  { key: "urgent", label: "Urgent TN" },
  // Staging-only for now (2026-09-20) -- not part of the production tab order yet.
  { key: "guide", label: "Guide" },
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

  useEffect(load, []);
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
        return b.zero_attempt - a.zero_attempt;
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
      const isReference = !resolveThreshold(thresholdRows, c.key, null).scored;
      return {
        key: c.key,
        label: c.label,
        render: (g) => fmt(c.key, g[c.key]),
        className: isReference ? (g) => colorScaleClass(g[c.key], rangeByMetric[c.key]) : undefined,
      };
    });
  const regionGroupColumns = buildGroupColumns(regionRangeByMetric);
  const zoneGroupColumns = buildGroupColumns(zoneRangeByMetric);

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
            SLA, never scored. Targets are set in Admin → SLA Targets. Reference metrics (e.g. Total Fresh) instead
            shade darkest-to-lightest by relative rank — By region/By zone rank against every region/zone shown; this
            table ranks each station only against other stations in its own zone. That shading is a ranking, not a
            pass/fail judgement.
            {compareYesterday && " Small numbers next to each value are the change vs. ~24h ago."} Total Fresh,
            Total Routed, Attendance and COD % (Hub) aren't clickable — their source queries don't return individual
            tracking numbers.
          </p>
        </>
      )}

      {tab === "shipment" && (
        <ShipmentDetailsTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
        />
      )}

      {tab === "routed" && (
        <RoutedViewTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
        />
      )}

      {tab === "shipper" && (
        <ShipperWatchTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
        />
      )}

      {tab === "restock" && (
        <RestockTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
        />
      )}

      {tab === "recovery" && (
        <RecoveryTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
        />
      )}

      {tab === "aging" && (
        <AgingDetailsTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
        />
      )}

      {tab === "rpu" && (
        <RpuTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
        />
      )}

      {tab === "urgent" && <UrgentTnTab me={me} />}

      {tab === "guide" && <GuideTab />}
    </div>
  );
}
