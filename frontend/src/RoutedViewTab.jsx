import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const LEVELS = [
  { key: "region", label: "Region" },
  { key: "zone", label: "Zone" },
  { key: "station", label: "Station" },
  { key: "driver", label: "Driver" },
];

const STATION_COLUMNS = [
  { key: "total_routed", label: "Total Routed" },
  { key: "attendance", label: "Attendance" },
  { key: "attendance_staff", label: "Staff" },
  { key: "attendance_independent", label: "Independent" },
  { key: "attendance_rescue", label: "Rescue" },
  { key: "current_ovfd", label: "Current OVFD" },
  { key: "current_success", label: "Current Success" },
  { key: "cod_pct", label: "COD %", percent: true },
  { key: "success_rate", label: "Success Rate", percent: true, rate: "success" },
  { key: "completion_rate", label: "Completion Rate", percent: true, rate: "completion" },
];

const DRIVER_COLUMNS = [
  { key: "total_routed", label: "Total Routed" },
  { key: "current_success", label: "Current Success" },
  { key: "current_ovfd", label: "Current OVFD" },
  { key: "cod_pct", label: "COD %", percent: true },
  { key: "success_rate", label: "Success Rate", percent: true, rate: "success" },
  { key: "completion_rate", label: "Completion Rate", percent: true, rate: "completion" },
];

function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

function successRateClass(rate) {
  if (rate < 70) return "text-status-critical font-semibold";
  if (rate < 85) return "text-amber-600 font-medium";
  return "text-status-good font-semibold";
}

function completionRateClass(rate) {
  if (rate >= 100) return "text-status-good font-semibold";
  if (rate >= 80) return "text-lime-600 font-medium";
  if (rate >= 60) return "text-amber-600 font-medium";
  if (rate >= 40) return "text-orange-600 font-medium";
  return "text-status-critical font-semibold";
}

function rateClass(col, value) {
  if (col.rate === "success") return successRateClass(value);
  if (col.rate === "completion") return completionRateClass(value);
  return "text-slate-700";
}

export default function RoutedViewTab({ regionFilter, zoneFilter, search }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [level, setLevel] = useState("station");
  const [sortKey, setSortKey] = useState("total_routed");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    api
      .routedView()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    let base;
    if (level === "region") base = data.regions.map((g) => ({ ...g, name: g.key }));
    else if (level === "zone") base = data.zones.map((g) => ({ ...g, name: g.key }));
    else if (level === "station") base = data.stations.map((s) => ({ ...s, name: s.station_name }));
    else base = data.drivers.map((d) => ({ ...d, name: d.driver_name }));

    if (level === "zone" || level === "station" || level === "driver") {
      if (regionFilter !== "all") base = base.filter((r) => r.region === regionFilter);
    }
    if (level === "station" || level === "driver") {
      if (zoneFilter !== "all") base = base.filter((r) => r.zone === zoneFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((r) => r.name?.toLowerCase().includes(q));
    }

    return [...base].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === undefined || bv === undefined) return 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === "boolean") return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, level, regionFilter, zoneFilter, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading…</div>;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const isDriverLevel = level === "driver";
  const columns = isDriverLevel ? DRIVER_COLUMNS : STATION_COLUMNS;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              onClick={() => {
                setLevel(l.key);
                setSortKey(l.key === "driver" ? "total_routed" : "total_routed");
              }}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                level === l.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-900 text-left text-white">
              <tr>
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-slate-900 px-4 py-2 font-medium"
                  onClick={() => toggleSort("name")}
                >
                  {level === "driver" ? "Driver" : LEVELS.find((l) => l.key === level).label}{" "}
                  {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                {isDriverLevel && (
                  <>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium">Type</th>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium">Home Station</th>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium">Current Station</th>
                    <th
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-left font-medium hover:bg-brand"
                      onClick={() => toggleSort("is_rescue")}
                    >
                      Rescue? {sortKey === "is_rescue" && (sortDir === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium">Tenure</th>
                  </>
                )}
                {!isDriverLevel && level !== "region" && (
                  <th className="whitespace-nowrap px-4 py-2 text-left font-medium">
                    {level === "zone" ? "Region" : "Zone"}
                  </th>
                )}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-right font-medium hover:bg-brand"
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
                {!isDriverLevel && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-right font-medium hover:bg-brand"
                    onClick={() => toggleSort("station_count")}
                  >
                    Stations {sortKey === "station_count" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.station_code || r.driver_name || r.name || i} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.name}
                  </td>
                  {isDriverLevel && (
                    <>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.driver_type}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.home_station || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.current_station || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {r.is_rescue ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                            Rescue
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-400">— (pending Metabase link)</td>
                    </>
                  )}
                  {!isDriverLevel && level !== "region" && (
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                      {level === "zone" ? r.region : r.zone}
                    </td>
                  )}
                  {columns.map((c) => {
                    const value = r[c.key];
                    const content = c.percent ? `${value.toFixed(1)}%` : value.toLocaleString();
                    return (
                      <td key={c.key} className={`px-4 py-2 text-right tabular-nums ${c.rate ? rateClass(c, value) : "text-slate-700"}`}>
                        {content}
                      </td>
                    );
                  })}
                  {!isDriverLevel && (
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{r.station_count}</td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                    No rows match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {rows.length} rows · Completion Rate = (Total Routed − Current OVFD) / Total Routed — 100% means nothing
          is left on the vehicle. Driver tenure needs the Metabase driver-tenure connection to be set up.
        </div>
      </div>
    </div>
  );
}
