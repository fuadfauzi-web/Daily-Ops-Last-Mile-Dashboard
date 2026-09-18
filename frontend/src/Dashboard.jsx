import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

// Metrics with an actual tracking-number list behind them server-side (mirrors
// backend/aggregate.py's DRILLDOWN_METRICS) -- everything else is a route-level
// total or a percentage, with nothing to list.
const DRILLDOWN_METRICS = new Set([
  "total_in_hub", "zero_attempt", "zero_attempt_gt_d0", "on_hold", "pending_ats",
  "missing_open", "missing_hub", "missing_ship_in",
  "age_gt3", "age_gt6_ats", "reschedule", "still_ovfd", "prior_d0", "prior_gt_d0",
]);

// Volume/context metrics: shown plainly, no severity coloring (more isn't "bad").
const VOLUME_METRICS = new Set([
  "total_fresh", "total_in_hub", "still_ovfd", "total_routed", "attendance",
  "cod_pct_hub", "cod_pct_routed",
]);

const PERCENT_METRICS = new Set(["cod_pct_hub", "cod_pct_routed"]);

const CORE_COLUMNS = [
  { key: "total_fresh", label: "Total Fresh" },
  { key: "total_in_hub", label: "In Hub" },
  { key: "zero_attempt", label: "0 Attempt" },
  { key: "on_hold", label: "On Hold" },
  { key: "missing_hub", label: "Missing (Hub)" },
  { key: "missing_ship_in", label: "Missing (Ship-in)" },
];

const EXTRA_COLUMNS = [
  { key: "zero_attempt_gt_d0", label: "0 Attempt >D0" },
  { key: "pending_ats", label: "Pending ATS" },
  { key: "missing_open", label: "Missing (Total)" },
  { key: "age_gt3", label: "Age >3" },
  { key: "age_gt6_ats", label: "Age >6 ATS" },
  { key: "reschedule", label: "Reschedule" },
  { key: "still_ovfd", label: "Still OVFD" },
  { key: "prior_d0", label: "Prior D0" },
  { key: "prior_gt_d0", label: "Prior >D0" },
  { key: "cod_pct_hub", label: "COD % (Hub)" },
  { key: "total_routed", label: "Total Routed" },
  { key: "attendance", label: "Attendance" },
  { key: "cod_pct_routed", label: "COD % (Routed)" },
];

const ALL_COLUMNS = [...CORE_COLUMNS, ...EXTRA_COLUMNS];
const METRIC_KEYS = ALL_COLUMNS.map((c) => c.key);
// Numerator/denominator pairs behind each percentage, for correctly weighted rollups.
const PERCENT_SOURCE = { cod_pct_hub: "total_in_hub", cod_pct_routed: "total_routed" };

const TABS = [
  { key: "health", label: "Station Health", enabled: true },
  { key: "routed", label: "Routed View", enabled: false },
  { key: "shipper", label: "Shipper Watch", enabled: false },
  { key: "aging", label: "Aging Details", enabled: false },
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
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.entries(groups).map(([key, groupRows]) => ({
    key,
    station_count: groupRows.length,
    ...sumMetrics(groupRows),
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
  if (!clickable) return <td className={`px-4 py-2 text-right tabular-nums ${severityClass}`}>{content}</td>;
  return (
    <td className={`px-4 py-2 text-right tabular-nums ${severityClass}`}>
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

function KpiBar({ totals }) {
  return (
    <div className="flex flex-wrap items-center justify-around gap-3 rounded-xl bg-slate-900 px-4 py-3">
      {CORE_COLUMNS.map((c) => (
        <div key={c.key} className="text-center">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{c.label}</div>
          <div className="text-lg font-semibold tabular-nums text-white">{fmt(c.key, totals[c.key])}</div>
        </div>
      ))}
    </div>
  );
}

function RegionCard({ region, active, totals, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-t-4 bg-white p-3 text-left ring-1 ring-slate-200 ${
        active ? "border-t-status-good bg-green-50/40" : "border-t-brand"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-800">{region}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[
          { label: "Fresh", value: totals.total_fresh },
          { label: "In Hub", value: totals.total_in_hub },
          { label: "0 Att", value: totals.zero_attempt },
        ].map((s) => (
          <div key={s.label} className="rounded bg-slate-50 px-1 py-1 text-center">
            <div className="text-[8px] uppercase text-slate-400">{s.label}</div>
            <div className="text-xs font-bold text-slate-800">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </button>
  );
}

function GroupTable({ title, groupLabel, rows }) {
  if (rows.length <= 1) return null;
  const sorted = [...rows].sort((a, b) => a.key.localeCompare(b.key));
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-2 font-medium">{groupLabel}</th>
              {ALL_COLUMNS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-2 text-right font-medium">
                  {c.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-2 text-right font-medium">Stations</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.key} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-800">{g.key}</td>
                {ALL_COLUMNS.map((c) => (
                  <td key={c.key} className="px-4 py-2 text-right tabular-nums text-slate-700">
                    {fmt(c.key, g[c.key])}
                  </td>
                ))}
                <td className="px-4 py-2 text-right tabular-nums text-slate-500">{g.station_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exportCsv(rows) {
  const header = ["Station", "Region", "Zone", ...ALL_COLUMNS.map((c) => c.label)];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    lines.push(
      [r.station_name, r.region, r.zone, ...ALL_COLUMNS.map((c) => r[c.key])]
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
    if (!data) return [];
    const zonesInRegion =
      regionFilter === "all" ? data.stations : data.stations.filter((s) => s.region === regionFilter);
    return [...new Set(zonesInRegion.map((s) => s.zone))].sort();
  }, [data, regionFilter]);

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
    if (!data) return [];
    const rows = applyFilters(data.stations);
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
  }, [data, regionFilter, zoneFilter, search, sortKey, sortDir]);

  const totals = useMemo(() => sumMetrics(filteredStations), [filteredStations]);

  const filteredRegionGroups = useMemo(() => localRollup(filteredStations, "region"), [filteredStations]);
  const filteredZoneGroups = useMemo(() => localRollup(filteredStations, "zone"), [filteredStations]);

  const regionTotals = useMemo(() => {
    if (!data) return {};
    const out = {};
    regions.forEach((r) => {
      out[r.region] = sumMetrics(data.stations.filter((s) => s.region === r.region));
    });
    return out;
  }, [data, regions]);

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

      <KpiBar totals={totals} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {regions.map((r) => (
          <RegionCard
            key={r.region}
            region={r.region}
            active={regionFilter === r.region}
            totals={regionTotals[r.region] || sumMetrics([])}
            onClick={() => {
              setRegionFilter(regionFilter === r.region ? "all" : r.region);
              setZoneFilter("all");
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <span className="text-xs font-semibold text-slate-700">Filter:</span>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={regionFilter}
          onChange={(e) => {
            setRegionFilter(e.target.value);
            setZoneFilter("all");
          }}
        >
          <option value="all">All regions</option>
          {regions.map((r) => (
            <option key={r.region} value={r.region}>
              {r.region}
            </option>
          ))}
        </select>
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
        <button
          onClick={() => {
            setRegionFilter("all");
            setZoneFilter("all");
          }}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          Clear
        </button>
        <input
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          placeholder="Search station…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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

      <GroupTable title="By region (follows filters below)" groupLabel="Region" rows={filteredRegionGroups} />
      <GroupTable title="By zone (follows filters below)" groupLabel="Zone" rows={filteredZoneGroups} />

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="text-sm font-medium text-slate-700">
            Station Health <span className="font-normal text-slate-400">— click a number to see tracking IDs</span>
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
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-slate-900 px-4 py-2 font-medium"
                  onClick={() => toggleSort("station_name")}
                >
                  Station {sortKey === "station_name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-left font-medium hover:bg-brand"
                  onClick={() => toggleSort("region")}
                >
                  Region {sortKey === "region" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-left font-medium hover:bg-brand"
                  onClick={() => toggleSort("zone")}
                >
                  Zone {sortKey === "zone" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                {ALL_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-right font-medium hover:bg-brand"
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
              {isGroupSort && (
                <tr className="bg-slate-800 text-[10px] font-normal normal-case text-slate-300">
                  <th className="sticky left-0 z-30 bg-slate-800 px-4 py-1" colSpan={3 + ALL_COLUMNS.length}>
                    Sorted by {sortKey}, then 0-Attempt (highest first) within each {sortKey}
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredStations.map((r) => (
                <tr key={r.station_code} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.station_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.region}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.zone}</td>
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
                  <td colSpan={3 + ALL_COLUMNS.length} className="px-4 py-6 text-center text-slate-400">
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
        Red/amber highlights are relative to what's currently on screen (top ~15% / ~50% of that column) — there's
        no fixed SLA target wired in yet. Total Fresh, Total Routed, Attendance and the COD% columns aren't
        clickable — their source queries don't return individual tracking numbers.
      </p>
    </div>
  );
}
