import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { useThresholds, resolveThreshold, classify, SEVERITY_MARK, SEVERITY_CLASS } from "./lib/thresholds";
import { ALL_COLUMNS } from "./lib/metrics";
import SummaryCard from "./components/SummaryCard";
import DataTable from "./components/DataTable";
import GroupTable from "./components/GroupTable";
import FilterBar from "./components/FilterBar";
import TnModal from "./components/TnModal";
import Skeleton from "./components/Skeleton";
import ShipmentDetailsTab from "./ShipmentDetailsTab";
import RoutedViewTab from "./RoutedViewTab";
import ShipperWatchTab from "./ShipperWatchTab";
import AgingDetailsTab from "./AgingDetailsTab";
import RpuTab from "./RpuTab";

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

const PERCENT_METRICS = new Set(["cod_pct_hub"]);

const METRIC_KEYS = ALL_COLUMNS.map((c) => c.key);
// Numerator/denominator pairs behind each percentage, for correctly weighted rollups.
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
  { key: "shipment", label: "Shipment Details", enabled: true },
  { key: "health", label: "Station Health", enabled: true },
  { key: "routed", label: "Routed View", enabled: true },
  { key: "shipper", label: "Shipper Watch", enabled: true },
  { key: "aging", label: "Aging Details", enabled: true },
  { key: "rpu", label: "RPU", enabled: true },
];

function fmt(key, value) {
  if (PERCENT_METRICS.has(key)) return `${value.toFixed(1)}%`;
  return value.toLocaleString();
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

function exportCsv(rows) {
  const header = ["Region", "Zone", "Station", ...ALL_COLUMNS.map((c) => c.label)];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    lines.push(
      [r.region, r.zone, r.station_name, ...ALL_COLUMNS.map((c) => r[c.key])]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-ops-station-health-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard({ me }) {
  const { rows: thresholdRows } = useThresholds();
  const [data, setData] = useState(null);
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState(null);
  const [regionFilter, setRegionFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("on_hold");
  const [sortDir, setSortDir] = useState("desc");
  const [tab, setTab] = useState("health");
  const [modal, setModal] = useState(null);
  // East Malaysia is Retail, not Last Mile -- admins/full-access viewers can
  // toggle it out of every view. Defaults to included (today's behavior).
  const [includeEastMalaysia, setIncludeEastMalaysia] = useState(true);

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

  const groupColumns = ALL_COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
    render: (g) => fmt(c.key, g[c.key]),
  }));

  const stationColumns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", render: (r) => r.region, className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", render: (r) => r.zone, className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left", render: (r) => r.station_name },
    ...ALL_COLUMNS.map((c) => {
      // Header greying reflects the nationwide row -- whether a metric has an
      // SLA at all isn't something that should flip on/off per region.
      const isReference = !resolveThreshold(thresholdRows, c.key, null).scored;
      return {
        key: c.key,
        label: c.label,
        reference: isReference,
        render: (r) => {
          if (isReference) return fmt(c.key, r[c.key]);
          const sev = classify(resolveThreshold(thresholdRows, c.key, r.region), r[c.key]);
          return `${SEVERITY_MARK[sev]}${fmt(c.key, r[c.key])}`;
        },
        className: (r) => {
          if (isReference) return SEVERITY_CLASS.reference;
          const sev = classify(resolveThreshold(thresholdRows, c.key, r.region), r[c.key]);
          return SEVERITY_CLASS[sev];
        },
        onClick: DRILLDOWN_METRICS.has(c.key) ? (r) => openDrilldown(r, c) : undefined,
      };
    }),
  ];

  return (
    <div className="space-y-4">
      <TnModal state={modal} onClose={() => setModal(null)} fetcher={api.drilldown} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
          {filteredStations.length} stations in scope
        </div>
      </div>

      {showTotalCard && (
        <SummaryCard label="TOTAL LAST MILE" active={false} clickable={false} emphasis stats={cardStats(sumMetrics(scopedStations))} />
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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

      <div className="flex gap-1 rounded-t-lg bg-slate-200 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            disabled={!t.enabled}
            onClick={() => t.enabled && setTab(t.key)}
            title={t.enabled ? undefined : "Coming soon"}
            className={`rounded px-3 py-1.5 font-display text-sm font-semibold ${
              tab === t.key
                ? "bg-brand text-white"
                : t.enabled
                  ? "text-slate-600 hover:bg-white"
                  : "cursor-not-allowed text-slate-400"
            }`}
          >
            {t.label}
            {!t.enabled && <span className="ml-1.5 text-[11px] uppercase tracking-wide">soon</span>}
          </button>
        ))}
      </div>

      {tab === "health" && (
        <>
          <GroupTable title="By region (follows filters below)" groupLabel="Region" rows={filteredRegionGroups} columns={groupColumns} />
          <GroupTable title="By zone (follows filters below)" groupLabel="Zone" rows={filteredZoneGroups} columns={groupColumns} />

          <DataTable
            title={
              <>
                Station Health <span className="font-normal text-slate-400">— click a number to see tracking IDs</span>
              </>
            }
            titleExtra={
              <button
                onClick={() => exportCsv(filteredStations)}
                className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Export CSV
              </button>
            }
            maxHeight="70vh"
            columns={stationColumns}
            rows={filteredStations}
            rowKey={(r) => r.station_code}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            emptyMessage="No stations match."
            subHeader={isGroupSort ? `Sorted by ${sortKey}, then 0-Attempt (highest first) within each ${sortKey}` : null}
            footer={`${filteredStations.length} rows · first column pinned, header freezes while scrolling`}
          />
          <p className="text-xs text-slate-400">
            ▲ critical · ■ warning — colour is never the only signal. Greyed column headers are reference data: no
            SLA, never scored. Targets are set in Admin → SLA Targets. Total Fresh, Total Routed, Attendance and
            COD % (Hub) aren't clickable — their source queries don't return individual tracking numbers.
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
    </div>
  );
}
