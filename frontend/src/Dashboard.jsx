import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const COLUMNS = [
  { key: "total_in_hub", label: "In Hub" },
  { key: "zero_attempt", label: "0 Attempt" },
  { key: "on_hold", label: "On Hold" },
  { key: "missing_open", label: "Missing" },
];

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

export default function Dashboard({ me }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [subRegionFilter, setSubRegionFilter] = useState("all");
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

  const subRegions = useMemo(
    () => (data ? [...new Set(data.stations.map((s) => s.sub_region))].sort() : []),
    [data]
  );

  const filteredStations = useMemo(() => {
    if (!data) return [];
    let rows = data.stations;
    if (subRegionFilter !== "all") rows = rows.filter((r) => r.sub_region === subRegionFilter);
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
  }, [data, subRegionFilter, search, sortKey, sortDir]);

  const totals = useMemo(() => {
    return filteredStations.reduce(
      (acc, r) => ({
        total_in_hub: acc.total_in_hub + r.total_in_hub,
        zero_attempt: acc.zero_attempt + r.zero_attempt,
        on_hold: acc.on_hold + r.on_hold,
        missing_open: acc.missing_open + r.missing_open,
      }),
      { total_in_hub: 0, zero_attempt: 0, on_hold: 0, missing_open: 0 }
    );
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
            value={subRegionFilter}
            onChange={(e) => setSubRegionFilter(e.target.value)}
          >
            <option value="all">All sub-regions</option>
            {subRegions.map((sr) => (
              <option key={sr} value={sr}>
                {sr}
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="In Hub" value={totals.total_in_hub} />
        <StatCard label="0 Attempt" value={totals.zero_attempt} />
        <StatCard label="On Hold" value={totals.on_hold} />
        <StatCard label="Missing (open)" value={totals.missing_open} />
      </div>

      {data.sub_regions.length > 1 && (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Sub-region</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-4 py-2 text-right font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium">Stations</th>
              </tr>
            </thead>
            <tbody>
              {data.sub_regions.map((g) => (
                <tr key={g.key} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{g.key}</td>
                  {COLUMNS.map((c) => (
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
      )}

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium"
                onClick={() => toggleSort("station_name")}
              >
                Station {sortKey === "station_name" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-2 text-left font-medium">Sub-region</th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="cursor-pointer select-none px-4 py-2 text-right font-medium"
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
                  <td className="px-4 py-2 font-medium text-slate-800">{r.station_name}</td>
                  <td className="px-4 py-2 text-slate-500">{r.sub_region}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.total_in_hub.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.zero_attempt.toLocaleString()}</td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${
                      flagged ? "font-semibold text-status-critical" : ""
                    }`}
                  >
                    {r.on_hold.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.missing_open.toLocaleString()}</td>
                </tr>
              );
            })}
            {filteredStations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No stations match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        On Hold shown in red when it's over 15% of a station's hub + on-hold volume — a relative flag, not an
        SLA breach.
      </p>
    </div>
  );
}
