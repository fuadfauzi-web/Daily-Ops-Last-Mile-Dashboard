import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import ShipmentDetailsTab from "./ShipmentDetailsTab";
import RoutedViewTab from "./RoutedViewTab";
import ShipperWatchTab from "./ShipperWatchTab";
import AgingDetailsTab from "./AgingDetailsTab";
import OldRouteTab from "./OldRouteTab";

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

// Volume/context metrics: shown plainly, no severity coloring (more isn't "bad").
const VOLUME_METRICS = new Set(["total_fresh", "total_routed", "attendance", "total_in_hub", "still_ovfd", "cod_pct_hub"]);

const PERCENT_METRICS = new Set(["cod_pct_hub"]);

// Requested column order for the Station Health table (Region/Zone/Station are
// separate fixed columns rendered before these).
const ALL_COLUMNS = [
  { key: "total_fresh", label: "Total Fresh" },
  { key: "total_routed", label: "Total Routed" },
  { key: "attendance", label: "Attendance" },
  { key: "zero_attempt", label: "0 Attempt" },
  { key: "zero_attempt_gt_d0", label: "0 Attempt >D0" },
  { key: "total_in_hub", label: "In Hub" },
  { key: "age_gt3", label: "Age >3" },
  { key: "on_hold", label: "On Hold" },
  { key: "reschedule", label: "Reschedule" },
  { key: "still_ovfd", label: "Still OVFD" },
  { key: "cod_pct_hub", label: "COD % (Hub)" },
  { key: "prior_d0", label: "Prior D0" },
  { key: "prior_gt_d0", label: "Prior >D0" },
  { key: "unsweep_document", label: "Unsweep Document" },
  { key: "unsweep_parcel", label: "Unsweep Parcel" },
  { key: "missing_hub", label: "Missing (Hub)" },
  { key: "missing_ship_in", label: "Missing (Ship-in)" },
  { key: "pending_ats_zero_attempt", label: "Pending ATS (0 Attempt)" },
  { key: "pending_ats_attempted", label: "Pending ATS (Attempted)" },
];

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
  { key: "oldroute", label: "Old Route", enabled: true },
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

function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

// Rank-based severity: top ~15% of a column (among currently visible rows) is
// flagged red, next ~35% amber. Relative, not an SLA target — there's no fixed
// threshold from the business yet, so this highlights outliers within what's on
// screen rather than inventing an absolute number.
function useSeverityRanks(rows) {
  return useMemo(() => {
    const ranks = {};
    METRIC_KEYS.forEach((key) => {
      if (VOLUME_METRICS.has(key)) return;
      const sorted = [...rows].map((r) => r[key]).sort((a, b) => a - b);
      const n = sorted.length;
      ranks[key] = (value) => {
        if (n === 0) return "plain";
        let idx = sorted.findIndex((v) => v >= value);
        if (idx === -1) idx = n - 1;
        const pct = idx / n;
        if (pct >= 0.85) return "critical";
        if (pct >= 0.5) return "warning";
        return "plain";
      };
    });
    return ranks;
  }, [rows]);
}

const SEVERITY_CLASS = {
  critical: "font-semibold text-status-critical",
  warning: "font-medium text-amber-600",
  plain: "text-slate-700",
};

function MetricCell({ metricKey, value, severityClass, clickable, onClick }) {
  const content = fmt(metricKey, value);
  if (!clickable) return <td className={`px-4 py-2 text-center tabular-nums ${severityClass}`}>{content}</td>;
  return (
    <td className={`px-4 py-2 text-center tabular-nums ${severityClass}`}>
      <button onClick={onClick} className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
        {content}
      </button>
    </td>
  );
}

function TnModal({ state, onClose }) {
  const [tns, setTns] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state) return;
    setTns(null);
    setError(null);
    setCopied(false);
    api
      .drilldown(state.stationCode, state.metricKey)
      .then((r) => setTns(r))
      .catch((e) => setError(e.message));
  }, [state]);

  if (!state) return null;

  const copy = () => {
    if (!tns?.tracking_numbers?.length) return;
    navigator.clipboard.writeText(tns.tracking_numbers.join("\n")).then(() => setCopied(true));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[8vh]" onClick={onClose}>
      <div
        className="max-h-[75vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">{state.stationName}</div>
            <div className="text-xs text-slate-500">{state.metricLabel}</div>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        <div className="px-4 py-3">
          {error && <div className="text-sm text-status-critical">{error}</div>}
          {!error && !tns && <div className="text-sm text-slate-400">Loading…</div>}
          {tns && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {tns.tracking_numbers.length.toLocaleString()} tracking number
                  {tns.tracking_numbers.length === 1 ? "" : "s"}
                  {tns.as_of && ` · as of ${formatTime(tns.as_of)}`}
                </div>
                <button
                  onClick={copy}
                  disabled={!tns.tracking_numbers.length}
                  className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {copied ? "Copied!" : "Copy list"}
                </button>
              </div>
              <div className="max-h-[45vh] overflow-y-auto rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">
                {tns.tracking_numbers.length === 0
                  ? "No tracking numbers."
                  : tns.tracking_numbers.map((tn) => <div key={tn}>{tn}</div>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, active, clickable, totals, onClick, emphasis }) {
  const Wrapper = clickable ? "button" : "div";
  return (
    <Wrapper
      onClick={clickable ? onClick : undefined}
      className={`rounded-lg border-t-4 p-3 text-left ring-1 ${
        emphasis
          ? "border-t-brand bg-black ring-black"
          : `bg-white ring-slate-200 ${active ? "border-t-status-good bg-green-50/40" : "border-t-brand"}`
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`text-xs font-bold ${emphasis ? "text-white" : "font-semibold text-slate-800"}`}>{label}</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {CARD_STATS.map((s) => (
          <div key={s.key} className={`rounded px-1 py-1 text-center ${emphasis ? "bg-brand" : "bg-slate-50"}`}>
            <div className={`text-[8px] uppercase ${emphasis ? "text-red-100" : "text-slate-400"}`}>{s.label}</div>
            <div className={`text-xs font-bold ${emphasis ? "text-white" : "text-slate-800"}`}>{fmt(s.key, totals[s.key])}</div>
          </div>
        ))}
      </div>
    </Wrapper>
  );
}

function GroupTable({ title, groupLabel, rows }) {
  const [sortKey, setSortKey] = useState("key");
  const [sortDir, setSortDir] = useState("asc");

  if (rows.length <= 1) return null;

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "key" ? "asc" : "desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th
                className="sticky left-0 z-10 cursor-pointer select-none whitespace-nowrap bg-slate-50 px-4 py-2 font-medium hover:bg-slate-200"
                onClick={() => toggleSort("key")}
              >
                {groupLabel} {sortKey === "key" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-slate-200"
                onClick={() => toggleSort("station_count")}
              >
                Stations {sortKey === "station_count" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              {ALL_COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-slate-200"
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.key} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                  {g.key}
                </td>
                <td className="px-4 py-2 text-center tabular-nums text-slate-500">{g.station_count}</td>
                {ALL_COLUMNS.map((c) => (
                  <td key={c.key} className="px-4 py-2 text-center tabular-nums text-slate-700">
                    {fmt(c.key, g[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
  const leadingCols = 1 + (hideRegionCol ? 0 : 1) + (hideZoneCol ? 0 : 1);

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

  const severityRank = useSeverityRanks(filteredStations);

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
  if (!data) return <div className="text-slate-500">Loading…</div>;
  if (!data.captured_at)
    return (
      <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">
        No data yet — the first refresh hasn't run. {me.role === "admin" && "Use Admin → Refresh now."}
      </div>
    );

  return (
    <div className="space-y-4">
      <TnModal state={modal} onClose={() => setModal(null)} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
          {filteredStations.length} stations in scope
        </div>
      </div>

      {showTotalCard && (
        <SummaryCard
          label="TOTAL MALAYSIA"
          active={false}
          clickable={false}
          emphasis
          totals={sumMetrics(scopedStations)}
        />
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {cards.map((c) => (
            <SummaryCard key={c.key} label={c.label} active={c.active} clickable={c.clickable} totals={c.totals} onClick={c.onClick} />
          ))}
        </div>
      )}

      {showFilterBar && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <span className="text-xs font-semibold text-slate-700">Filter:</span>
          {canPickRegion && (
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setZoneFilter("all");
              }}
            >
              <option value="all">All regions</option>
              {visibleRegions.map((r) => (
                <option key={r.region} value={r.region}>
                  {r.region}
                </option>
              ))}
            </select>
          )}
          {canToggleEastMalaysia && (
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={includeEastMalaysia}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIncludeEastMalaysia(checked);
                  if (!checked && regionFilter === "East Malaysia") setRegionFilter("all");
                }}
              />
              Include East Malaysia
            </label>
          )}
          {canPickZone && (
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
            >
              <option value="all">All zones</option>
              {zoneOptions.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          )}
          {(canPickRegion || canPickZone) && (
            <button
              onClick={() => {
                setRegionFilter("all");
                setZoneFilter("all");
              }}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              Clear
            </button>
          )}
          <input
            className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            placeholder="Search station…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="flex gap-1 rounded-t-lg bg-slate-200 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            disabled={!t.enabled}
            onClick={() => t.enabled && setTab(t.key)}
            title={t.enabled ? undefined : "Coming soon"}
            className={`rounded px-3 py-1.5 text-sm font-semibold ${
              tab === t.key
                ? "bg-brand text-white"
                : t.enabled
                  ? "text-slate-600 hover:bg-white"
                  : "cursor-not-allowed text-slate-400"
            }`}
          >
            {t.label}
            {!t.enabled && <span className="ml-1.5 text-[9px] uppercase tracking-wide">soon</span>}
          </button>
        ))}
      </div>

      {tab === "health" && (
        <>
          <GroupTable title="By region (follows filters below)" groupLabel="Region" rows={filteredRegionGroups} />
          <GroupTable title="By zone (follows filters below)" groupLabel="Zone" rows={filteredZoneGroups} />

          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <div className="text-sm font-medium text-slate-700">
                Station Health{" "}
                <span className="font-normal text-slate-400">— click a number to see tracking IDs</span>
              </div>
              <button
                onClick={() => exportCsv(filteredStations)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Export CSV
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-20 bg-slate-900 text-left text-white">
                  <tr>
                    {!hideRegionCol && (
                      <th
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                        onClick={() => toggleSort("region")}
                      >
                        Region {sortKey === "region" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                    )}
                    {!hideZoneCol && (
                      <th
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                        onClick={() => toggleSort("zone")}
                      >
                        Zone {sortKey === "zone" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                    )}
                    <th
                      className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-slate-900 px-4 py-2 font-medium"
                      onClick={() => toggleSort("station_name")}
                    >
                      Station {sortKey === "station_name" && (sortDir === "asc" ? "↑" : "↓")}
                    </th>
                    {ALL_COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                        onClick={() => toggleSort(c.key)}
                      >
                        {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                    ))}
                  </tr>
                  {isGroupSort && (
                    <tr className="bg-slate-800 text-[10px] font-normal normal-case text-slate-300">
                      <th className="bg-slate-800 px-4 py-1" colSpan={leadingCols + ALL_COLUMNS.length}>
                        Sorted by {sortKey}, then 0-Attempt (highest first) within each {sortKey}
                      </th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredStations.map((r) => (
                    <tr key={r.station_code} className="border-t border-slate-100 hover:bg-slate-50/60">
                      {!hideRegionCol && (
                        <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.region}</td>
                      )}
                      {!hideZoneCol && (
                        <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.zone}</td>
                      )}
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                        {r.station_name}
                      </td>
                      {ALL_COLUMNS.map((c) => {
                        const cls = VOLUME_METRICS.has(c.key)
                          ? "text-slate-700"
                          : SEVERITY_CLASS[severityRank[c.key]?.(r[c.key]) || "plain"];
                        return (
                          <MetricCell
                            key={c.key}
                            metricKey={c.key}
                            value={r[c.key]}
                            severityClass={cls}
                            clickable={DRILLDOWN_METRICS.has(c.key)}
                            onClick={() => openDrilldown(r, c)}
                          />
                        );
                      })}
                    </tr>
                  ))}
                  {filteredStations.length === 0 && (
                    <tr>
                      <td colSpan={leadingCols + ALL_COLUMNS.length} className="px-4 py-6 text-center text-slate-400">
                        No stations match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
              {filteredStations.length} rows · first column pinned, header freezes while scrolling
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Red/amber highlights are relative to what's currently on screen (top ~15% / ~50% of that column) —
            there's no fixed SLA target wired in yet. Total Fresh, Total Routed, Attendance and COD % (Hub) aren't
            clickable — their source queries don't return individual tracking numbers.
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

      {tab === "oldroute" && (
        <OldRouteTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={canToggleEastMalaysia && !includeEastMalaysia}
        />
      )}
    </div>
  );
}
