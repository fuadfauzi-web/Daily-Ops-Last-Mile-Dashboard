import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

// Volume metrics: shown plainly, no severity coloring (more isn't "bad").
const VOLUME_METRICS = new Set(["total_in_hub", "total_fresh", "still_ovfd"]);

const CORE_COLUMNS = [
  { key: "total_fresh", label: "Total Fresh" },
  { key: "total_in_hub", label: "In Hub" },
  { key: "zero_attempt", label: "0 Attempt" },
  { key: "on_hold", label: "On Hold" },
  { key: "missing_open", label: "Missing" },
];

const EXTRA_COLUMNS = [
  { key: "age_gt3", label: "Age >3" },
  { key: "reschedule", label: "Reschedule" },
  { key: "still_ovfd", label: "Still OVFD" },
  { key: "prior_d0", label: "Prior D0" },
  { key: "prior_gt_d0", label: "Prior >D0" },
];

const ALL_COLUMNS = [...CORE_COLUMNS, ...EXTRA_COLUMNS];
const METRIC_KEYS = ALL_COLUMNS.map((c) => c.key);

const TABS = [
  { key: "health", label: "Station Health", enabled: true },
  { key: "routed", label: "Routed View", enabled: false },
  { key: "shipper", label: "Shipper Watch", enabled: false },
  { key: "aging", label: "Aging Details", enabled: false },
];

function sumMetrics(rows) {
  const zero = Object.fromEntries(METRIC_KEYS.map((k) => [k, 0]));
  return rows.reduce((acc, r) => {
    const next = { ...acc };
    METRIC_KEYS.forEach((k) => (next[k] = acc[k] + (r[k] || 0)));
    return next;
  }, zero);
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

function KpiCard({ label, value, delta, deltaGood }) {
  const showDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const deltaUp = delta > 0;
  const deltaColor = !showDelta || delta === 0 ? "text-slate-400" : deltaGood === deltaUp ? "text-status-good" : "text-status-critical";
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value.toLocaleString()}</div>
      {showDelta && (
        <div className={`mt-1 text-xs font-medium tabular-nums ${deltaColor}`}>
          {deltaUp ? "▲" : delta < 0 ? "▼" : "–"} {Math.abs(delta).toLocaleString()} vs last refresh
        </div>
      )}
    </div>
  );
}

function GroupTable({ title, groupLabel, rows }) {
  if (rows.length <= 1) return null;
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
            {rows.map((g) => (
              <tr key={g.key} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-800">{g.key}</td>
                {ALL_COLUMNS.map((c) => (
                  <td key={c.key} className="px-4 py-2 text-right tabular-nums text-slate-700">
                    {g[c.key].toLocaleString()}
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

  const filteredStations = useMemo(() => {
    if (!data) return [];
    const rows = applyFilters(data.stations);
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, regionFilter, zoneFilter, search, sortKey, sortDir]);

  const totals = useMemo(() => sumMetrics(filteredStations), [filteredStations]);

  const previousTotals = useMemo(() => {
    if (!data || !data.previous_stations?.length) return null;
    return sumMetrics(applyFilters(data.previous_stations));
  }, [data, regionFilter, zoneFilter, search]);

  const severityRank = useSeverityRanks(filteredStations);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
          {filteredStations.length} stations in scope
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {CORE_COLUMNS.map((c) => (
          <KpiCard
            key={c.key}
            label={c.label}
            value={totals[c.key]}
            delta={previousTotals ? totals[c.key] - previousTotals[c.key] : null}
            deltaGood={VOLUME_METRICS.has(c.key)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Region</span>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => {
              setRegionFilter("all");
              setZoneFilter("all");
            }}
            className={`rounded-md px-3 py-1 text-sm ${
              regionFilter === "all" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            All regions
          </button>
          {regions.map((r) => (
            <button
              key={r.region}
              onClick={() => {
                setRegionFilter(r.region);
                setZoneFilter("all");
              }}
              className={`rounded-md px-3 py-1 text-sm ${
                regionFilter === r.region ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {r.region}
            </button>
          ))}
        </div>
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
        <input
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          placeholder="Search station…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-5 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            disabled={!t.enabled}
            onClick={() => t.enabled && setTab(t.key)}
            title={t.enabled ? undefined : "Coming soon"}
            className={`-mb-px border-b-2 px-1 pb-2 text-sm ${
              tab === t.key
                ? "border-brand font-medium text-slate-900"
                : t.enabled
                  ? "border-transparent text-slate-500 hover:text-slate-700"
                  : "cursor-not-allowed border-transparent text-slate-300"
            }`}
          >
            {t.label}
            {!t.enabled && <span className="ml-1.5 text-[10px] uppercase tracking-wide">soon</span>}
          </button>
        ))}
      </div>

      <GroupTable title="By region" groupLabel="Region" rows={data.regions} />
      <GroupTable title="By zone" groupLabel="Zone" rows={data.zones} />

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="text-sm font-medium text-slate-700">Station Health</div>
          <button
            onClick={() => exportCsv(filteredStations)}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th
                  className="sticky left-0 z-10 cursor-pointer select-none whitespace-nowrap bg-slate-50 px-4 py-2 font-medium"
                  onClick={() => toggleSort("station_name")}
                >
                  Station {sortKey === "station_name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium">Region</th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium">Zone</th>
                {ALL_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-right font-medium"
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
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
                      <td key={c.key} className={`px-4 py-2 text-right tabular-nums ${cls}`}>
                        {r[c.key].toLocaleString()}
                      </td>
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
          {filteredStations.length} rows · first column pinned, scroll horizontally for all metrics
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Red/amber highlights are relative to what's currently on screen (top ~15% / ~50% of that column) — there's
        no fixed SLA target wired in yet.
      </p>
    </div>
  );
}
