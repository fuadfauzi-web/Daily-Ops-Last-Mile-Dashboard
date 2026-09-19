import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import OldRouteTab from "./OldRouteTab";

const LEVELS = [
  { key: "region", label: "Region" },
  { key: "zone", label: "Zone" },
  { key: "station", label: "Station" },
  { key: "driver", label: "Driver" },
  { key: "oldroute", label: "Old Route" },
];

// Station/Zone/Region-level columns that come AFTER Attendance and Total Routed
// (Attendance sits right after the name column; Hybrid/Independent sit at the
// very end, after Completion Rate).
const STATION_COLUMNS = [
  { key: "zero_attempt", label: "Total 0 Attempt" },
  { key: "current_ovfd", label: "Current OVFD" },
  { key: "current_success", label: "Current Success" },
  { key: "cod_pct", label: "COD %", percent: true },
  { key: "success_rate", label: "Success Rate", percent: true, rate: "success" },
  { key: "completion_rate", label: "Completion Rate", percent: true, rate: "completion" },
  { key: "hybrid_total", label: "Hybrid", render: "hybrid" },
  { key: "independent_total", label: "Independent", render: "independent" },
];

const DRIVER_COLUMNS = [
  { key: "total_routed", label: "Total Routed" },
  { key: "current_success", label: "Current Success" },
  { key: "current_ovfd", label: "Current OVFD" },
  { key: "cod_pct", label: "COD %", percent: true },
  { key: "success_rate", label: "Success Rate", percent: true, rate: "success" },
  { key: "completion_rate", label: "Completion Rate", percent: true, rate: "completion" },
  { key: "tenure", label: "Tenure", render: "tenure" },
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

// Renders the special composite-format columns: Attendance shows "N (R Rescue)",
// Hybrid/Independent show their HD/HR or ID/IR sub-counts as "1HD/9HR".
function renderCell(col, r) {
  if (col.render === "attendance") {
    return r.attendance_rescue > 0 ? `${r.attendance} (${r.attendance_rescue} Rescue)` : `${r.attendance}`;
  }
  if (col.render === "hybrid") return `${r.attendance_hd}HD/${r.attendance_hr}HR`;
  if (col.render === "independent") return `${r.attendance_id}ID/${r.attendance_ir}IR`;
  if (col.render === "tenure") return "— (pending Metabase link)";
  const value = r[col.key];
  return col.percent ? `${value.toFixed(1)}%` : value.toLocaleString();
}

export default function RoutedViewTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [level, setLevel] = useState("station");
  const [sortKey, setSortKey] = useState("total_routed");
  const [sortDir, setSortDir] = useState("desc");
  // The master "Search station..." box (shared with every other tab) filters the
  // Driver table by current station instead of by name -- driver names don't
  // contain station names, so reusing it as a name filter always came back
  // empty. Driver name gets its own local search box below.
  const [driverSearch, setDriverSearch] = useState("");

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    api
      .routedView()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    if (!data || level === "oldroute") return [];
    let base;
    if (level === "region") base = data.regions.map((g) => ({ ...g, name: g.key }));
    else if (level === "zone") base = data.zones.map((g) => ({ ...g, name: g.key }));
    else if (level === "station") base = data.stations.map((s) => ({ ...s, name: s.station_name }));
    else base = data.drivers.map((d) => ({ ...d, name: d.driver_name }));

    if (level !== "driver") {
      base = base.map((r) => ({
        ...r,
        hybrid_total: (r.attendance_hd || 0) + (r.attendance_hr || 0),
        independent_total: (r.attendance_id || 0) + (r.attendance_ir || 0),
      }));
    }

    if (excludeEastMalaysia && level !== "region") base = base.filter((r) => r.region !== "East Malaysia");
    if (excludeEastMalaysia && level === "region") base = base.filter((r) => r.key !== "East Malaysia");

    if (level === "zone" || level === "station" || level === "driver") {
      if (regionFilter !== "all") base = base.filter((r) => r.region === regionFilter);
    }
    if (level === "station" || level === "driver") {
      if (zoneFilter !== "all") base = base.filter((r) => r.zone === zoneFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = level === "driver"
        ? base.filter((r) => r.station_name?.toLowerCase().includes(q))
        : base.filter((r) => r.name?.toLowerCase().includes(q));
    }
    if (level === "driver" && driverSearch.trim()) {
      const q = driverSearch.trim().toLowerCase();
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
  }, [data, level, regionFilter, zoneFilter, search, driverSearch, sortKey, sortDir, excludeEastMalaysia]);

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
  const isGroupLevel = level === "region" || level === "zone";
  const columns = isDriverLevel ? DRIVER_COLUMNS : STATION_COLUMNS;
  const showRegionCol = (level === "zone" || level === "station") && !hideRegionCol;
  const showZoneCol = level === "station" && !hideZoneCol;
  const showDriverStationCol = isDriverLevel && me.scope_type !== "station";
  const leadingCols =
    (showRegionCol ? 1 : 0) + (showZoneCol ? 1 : 0) + 1 + (isGroupLevel ? 1 : 0) + (showDriverStationCol ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>
        <div className="flex items-center gap-2">
          {isDriverLevel && (
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              placeholder="Search driver…"
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
            />
          )}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                onClick={() => {
                  setLevel(l.key);
                  setSortKey("total_routed");
                  setSortDir("desc");
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
      </div>

      {level === "oldroute" ? (
        <OldRouteTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia}
        />
      ) : (
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-900 text-left text-white">
              <tr>
                {showRegionCol && (
                  <th className="whitespace-nowrap px-4 py-2 text-center font-medium">Region</th>
                )}
                {showZoneCol && <th className="whitespace-nowrap px-4 py-2 text-center font-medium">Zone</th>}
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-slate-900 px-4 py-2 font-medium"
                  onClick={() => toggleSort("name")}
                >
                  {level === "driver" ? "Driver" : LEVELS.find((l) => l.key === level).label}{" "}
                  {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                {isGroupLevel && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleSort("station_count")}
                  >
                    Stations {sortKey === "station_count" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                {showDriverStationCol && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleSort("station_name")}
                  >
                    Station {sortKey === "station_name" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                {!isDriverLevel && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleSort("attendance")}
                  >
                    Attendance {sortKey === "attendance" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                  onClick={() => toggleSort("total_routed")}
                >
                  Total Routed {sortKey === "total_routed" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.station_code || r.driver_name || r.name || i} className="border-t border-slate-100 hover:bg-slate-50/60">
                  {showRegionCol && (
                    <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.region}</td>
                  )}
                  {showZoneCol && <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.zone}</td>}
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.name}
                  </td>
                  {isGroupLevel && (
                    <td className="px-4 py-2 text-center tabular-nums text-slate-500">{r.station_count}</td>
                  )}
                  {showDriverStationCol && (
                    <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.station_name}</td>
                  )}
                  {!isDriverLevel && (
                    <td className="px-4 py-2 text-center tabular-nums text-slate-700">
                      {renderCell({ render: "attendance" }, r)}
                    </td>
                  )}
                  <td className="px-4 py-2 text-center tabular-nums text-slate-700">{r.total_routed.toLocaleString()}</td>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-2 text-center tabular-nums ${c.rate ? rateClass(c, r[c.key]) : "text-slate-700"}`}>
                      {renderCell(c, r)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={leadingCols + (isDriverLevel ? 0 : 1) + 1 + columns.length}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    No rows match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {rows.length} rows · Completion Rate = (Total Routed − Current OVFD) / Total Routed — 100% means nothing
          is left on the vehicle. Attendance shows rescue drivers in parentheses when present; Hybrid/Independent
          break down by HD/HR/ID/IR. Driver "Station" is where they're currently routing today (may differ from
          home station for a rescue driver). Driver tenure needs the Metabase driver-tenure connection to be set up.
        </div>
      </div>
      )}
    </div>
  );
}
