import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

// Shown as top stat cards + the primary sortable columns.
const CORE_COLUMNS = [
  { key: "total_in_hub", label: "In Hub" },
  { key: "zero_attempt", label: "0 Attempt" },
  { key: "on_hold", label: "On Hold" },
  { key: "missing_open", label: "Missing" },
  { key: "total_fresh", label: "Fresh" },
];

// Shown only as extra table columns (less glanceable, still sortable).
const EXTRA_COLUMNS = [
  { key: "age_gt3", label: "Age >3" },
  { key: "reschedule", label: "Reschedule" },
  { key: "still_ovfd", label: "OVFD" },
  { key: "prior_d0", label: "Prior D0" },
  { key: "prior_gt_d0", label: "Prior >D0" },
];

const ALL_COLUMNS = [...CORE_COLUMNS, ...EXTRA_COLUMNS];
const METRIC_KEYS = ALL_COLUMNS.map((c) => c.key);

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
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
              <th className="px-4 py-2 font-medium">{groupLabel}</th>
              {ALL_COLUMNS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-2 text-right font-medium">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-2 text-right font-medium">Stations</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.key} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{g.key}</td>
                {ALL_COLUMNS.map((c) => (
                  <td key={c.key} className="px-4 py-2 text-right tabular-nums">
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

export default function Dashboard({ me }) {
  const [data, setData] = useState(null);
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState(null);
  const [regionFilter, setRegionFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("on_hold");
  const [sortDir, setSortDir] = useState("desc");

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

  const filteredStations = useMemo(() => {
    if (!data) return [];
    let rows = data.stations;
    if (regionFilter !== "all") rows = rows.filter((r) => r.region === regionFilter);
    if (zoneFilter !== "all") rows = rows.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.station_name.toLowerCase().includes(q));
    }
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return sorted;
  }, [data, regionFilter, zoneFilter, search, sortKey, sortDir]);

  const totals = useMemo(() => {
    const zero = Object.fromEntries(METRIC_KEYS.map((k) => [k, 0]));
    return filteredStations.reduce((acc, r) => {
      const next = { ...acc };
      METRIC_KEYS.forEach((k) => (next[k] = acc[k] + r[k]));
      return next;
    }, zero);
  }, [filteredStations]);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>
        <div className="flex flex-wrap gap-2">
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
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            placeholder="Search station…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {CORE_COLUMNS.map((c) => (
          <StatCard key={c.key} label={c.label} value={totals[c.key]} />
        ))}
      </div>

      <GroupTable title="By region" groupLabel="Region" rows={data.regions} />
      <GroupTable title="By zone" groupLabel="Zone" rows={data.zones} />

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 font-medium"
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
              {filteredStations.map((r) => {
                const holdRate = r.total_in_hub > 0 ? r.on_hold / (r.total_in_hub + r.on_hold) : 0;
                const flagged = holdRate > 0.15;
                return (
                  <tr key={r.station_code} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-800">{r.station_name}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.region}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.zone}</td>
                    {ALL_COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-2 text-right tabular-nums ${
                          c.key === "on_hold" && flagged ? "font-semibold text-status-critical" : ""
                        }`}
                      >
                        {r[c.key].toLocaleString()}
                      </td>
                    ))}
                  </tr>
                );
              })}
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
      </div>
      <p className="text-xs text-slate-400">
        On Hold shown in red when it's over 15% of a station's hub + on-hold volume — a relative flag, not an
        SLA breach.
      </p>
    </div>
  );
}
