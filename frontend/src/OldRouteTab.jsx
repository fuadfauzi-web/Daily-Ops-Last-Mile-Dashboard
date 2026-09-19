import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const LEVELS = [
  { key: "region", label: "Region" },
  { key: "zone", label: "Zone" },
  { key: "station", label: "Station" },
  { key: "driver", label: "Driver" },
];

const TN_COLUMNS = [
  { key: "tracking_number", label: "Tracking Number" },
  { key: "route_id", label: "Route ID" },
  { key: "route_date", label: "Route Date" },
  { key: "age", label: "Age" },
  { key: "driver_name", label: "Driver" },
  { key: "shipper_name", label: "Shipper" },
];

function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

export default function OldRouteTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [level, setLevel] = useState("station");
  const [sortKey, setSortKey] = useState("total_tn");
  const [sortDir, setSortDir] = useState("desc");
  const [driverSearch, setDriverSearch] = useState("");
  const [tnSortKey, setTnSortKey] = useState("age");
  const [tnSortDir, setTnSortDir] = useState("desc");
  const [copied, setCopied] = useState(false);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    api
      .oldRoute()
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
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, level, regionFilter, zoneFilter, search, driverSearch, sortKey, sortDir, excludeEastMalaysia]);

  const visibleStationCodes = useMemo(() => {
    if (!data) return new Set();
    let stations = data.stations;
    if (excludeEastMalaysia) stations = stations.filter((r) => r.region !== "East Malaysia");
    if (regionFilter !== "all") stations = stations.filter((r) => r.region === regionFilter);
    if (zoneFilter !== "all") stations = stations.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      stations = stations.filter((r) => r.station_name.toLowerCase().includes(q));
    }
    return new Set(stations.map((r) => r.station_code));
  }, [data, regionFilter, zoneFilter, search, excludeEastMalaysia]);

  const filteredTnRows = useMemo(() => {
    if (!data) return [];
    const tn = data.tn_rows.filter((r) => visibleStationCodes.has(r.station_code));
    return [...tn].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return tnSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return tnSortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, visibleStationCodes, tnSortKey, tnSortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleTnSort = (key) => {
    if (key === tnSortKey) setTnSortDir(tnSortDir === "asc" ? "desc" : "asc");
    else {
      setTnSortKey(key);
      setTnSortDir("desc");
    }
  };

  const copyTns = () => {
    const list = filteredTnRows.map((r) => r.tracking_number).filter(Boolean);
    if (!list.length) return;
    navigator.clipboard.writeText(list.join("\n")).then(() => setCopied(true));
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading…</div>;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const isDriverLevel = level === "driver";
  const isGroupLevel = level === "region" || level === "zone";
  const showRegionCol = (level === "zone" || level === "station") && !hideRegionCol;
  const showZoneCol = level === "station" && !hideZoneCol;
  const showDriverStationCol = isDriverLevel && me.scope_type !== "station";
  const leadingCols =
    (showRegionCol ? 1 : 0) + (showZoneCol ? 1 : 0) + 1 + (isGroupLevel ? 1 : 0) + (showDriverStationCol ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">Old Route data as of {formatTime(data.captured_at)}</div>
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
                  setSortKey("total_tn");
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

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[50vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-900 text-left text-white">
              <tr>
                {showRegionCol && <th className="whitespace-nowrap px-4 py-2 text-center font-medium">Region</th>}
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
                  <th className="whitespace-nowrap px-4 py-2 text-center font-medium">Station</th>
                )}
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                  onClick={() => toggleSort("total_tn")}
                >
                  Total TN {sortKey === "total_tn" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.station_code || r.driver_name || r.name || i} className="border-t border-slate-100 hover:bg-slate-50/60">
                  {showRegionCol && <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.region}</td>}
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
                  <td className="px-4 py-2 text-center tabular-nums font-semibold text-status-critical">
                    {r.total_tn.toLocaleString()}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={leadingCols + 1} className="px-4 py-6 text-center text-slate-400">
                    No rows match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="text-sm font-medium text-slate-700">Tracking numbers</div>
          <button
            onClick={copyTns}
            disabled={!filteredTnRows.length}
            className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            {copied ? "Copied!" : "Copy list"}
          </button>
        </div>
        <div className="max-h-[55vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-900 text-left text-white">
              <tr>
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-slate-900 px-4 py-2 font-medium"
                  onClick={() => toggleTnSort("station_name")}
                >
                  Station {tnSortKey === "station_name" && (tnSortDir === "asc" ? "↑" : "↓")}
                </th>
                {TN_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleTnSort(c.key)}
                  >
                    {c.label} {tnSortKey === c.key && (tnSortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTnRows.map((r, i) => (
                <tr key={`${r.tracking_number}-${i}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.station_name}
                  </td>
                  {TN_COLUMNS.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-4 py-2 text-center font-mono text-xs text-slate-700">
                      {r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredTnRows.length === 0 && (
                <tr>
                  <td colSpan={1 + TN_COLUMNS.length} className="px-4 py-6 text-center text-slate-400">
                    No tracking numbers match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {filteredTnRows.length.toLocaleString()} tracking numbers
          {data.tn_rows_truncated && (
            <span className="ml-1 font-medium text-status-critical">
              · showing the oldest {filteredTnRows.length.toLocaleString()} of {data.tn_rows_total.toLocaleString()}{" "}
              nationwide — filter by region/zone/station to see the rest
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
