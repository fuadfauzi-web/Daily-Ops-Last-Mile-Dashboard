import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

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
  const [stationSortKey, setStationSortKey] = useState("total_tn");
  const [stationSortDir, setStationSortDir] = useState("desc");
  const [driverSortKey, setDriverSortKey] = useState("total_tn");
  const [driverSortDir, setDriverSortDir] = useState("desc");
  const [driverSearch, setDriverSearch] = useState("");
  const [tnSortKey, setTnSortKey] = useState("age");
  const [tnSortDir, setTnSortDir] = useState("desc");
  const [copied, setCopied] = useState(false);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";
  const showDriverStationCol = me.scope_type !== "station";

  useEffect(() => {
    api
      .oldRoute()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const filteredStations = useMemo(() => {
    if (!data) return [];
    let rows = data.stations;
    if (excludeEastMalaysia) rows = rows.filter((r) => r.region !== "East Malaysia");
    if (regionFilter !== "all") rows = rows.filter((r) => r.region === regionFilter);
    if (zoneFilter !== "all") rows = rows.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.station_name.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const av = a[stationSortKey];
      const bv = b[stationSortKey];
      if (typeof av === "string") return stationSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return stationSortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, regionFilter, zoneFilter, search, stationSortKey, stationSortDir, excludeEastMalaysia]);

  const visibleStationCodes = useMemo(() => new Set(filteredStations.map((r) => r.station_code)), [filteredStations]);

  const filteredDrivers = useMemo(() => {
    if (!data) return [];
    let rows = data.drivers;
    if (excludeEastMalaysia) rows = rows.filter((r) => r.region !== "East Malaysia");
    if (regionFilter !== "all") rows = rows.filter((r) => r.region === regionFilter);
    if (zoneFilter !== "all") rows = rows.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.station_name?.toLowerCase().includes(q));
    }
    if (driverSearch.trim()) {
      const q = driverSearch.trim().toLowerCase();
      rows = rows.filter((r) => r.driver_name?.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const av = a[driverSortKey];
      const bv = b[driverSortKey];
      if (av === undefined || bv === undefined) return 0;
      if (typeof av === "string") return driverSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return driverSortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, regionFilter, zoneFilter, search, driverSearch, driverSortKey, driverSortDir, excludeEastMalaysia]);

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

  const toggleStationSort = (key) => {
    if (key === stationSortKey) setStationSortDir(stationSortDir === "asc" ? "desc" : "asc");
    else {
      setStationSortKey(key);
      setStationSortDir("desc");
    }
  };

  const toggleDriverSort = (key) => {
    if (key === driverSortKey) setDriverSortDir(driverSortDir === "asc" ? "desc" : "asc");
    else {
      setDriverSortKey(key);
      setDriverSortDir("desc");
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

  const stationLeadingCols = 1 + (hideRegionCol ? 0 : 1) + (hideZoneCol ? 0 : 1);
  const driverLeadingCols = 1 + (showDriverStationCol ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-500">Old Route data as of {formatTime(data.captured_at)}</div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-4 py-2 font-display text-sm font-medium text-slate-700">By station</div>
        <div className="max-h-[40vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-ink text-left text-white">
              <tr>
                {!hideRegionCol && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
                    onClick={() => toggleStationSort("region")}
                  >
                    Region {stationSortKey === "region" && (stationSortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                {!hideZoneCol && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
                    onClick={() => toggleStationSort("zone")}
                  >
                    Zone {stationSortKey === "zone" && (stationSortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-ink px-4 py-2 font-display font-medium"
                  onClick={() => toggleStationSort("station_name")}
                >
                  Station {stationSortKey === "station_name" && (stationSortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
                  onClick={() => toggleStationSort("total_tn")}
                >
                  Total TN {stationSortKey === "total_tn" && (stationSortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((r) => (
                <tr key={r.station_code} className="border-t border-slate-100 hover:bg-slate-50/60">
                  {!hideRegionCol && <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.region}</td>}
                  {!hideZoneCol && <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.zone}</td>}
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.station_name}
                  </td>
                  <td className="px-4 py-2 text-center tabular-nums font-semibold text-status-critical">
                    {r.total_tn.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredStations.length === 0 && (
                <tr>
                  <td colSpan={stationLeadingCols + 1} className="px-4 py-6 text-center text-slate-400">
                    No stations match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="text-sm font-medium text-slate-700">By driver</div>
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            placeholder="Search driver…"
            value={driverSearch}
            onChange={(e) => setDriverSearch(e.target.value)}
          />
        </div>
        <div className="max-h-[40vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-ink text-left text-white">
              <tr>
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-ink px-4 py-2 font-display font-medium"
                  onClick={() => toggleDriverSort("driver_name")}
                >
                  Driver {driverSortKey === "driver_name" && (driverSortDir === "asc" ? "↑" : "↓")}
                </th>
                {showDriverStationCol && (
                  <th className="whitespace-nowrap px-4 py-2 text-center font-medium">Station</th>
                )}
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
                  onClick={() => toggleDriverSort("total_tn")}
                >
                  Total TN {driverSortKey === "total_tn" && (driverSortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((r, i) => (
                <tr key={r.driver_name || i} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.driver_name}
                  </td>
                  {showDriverStationCol && (
                    <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.station_name}</td>
                  )}
                  <td className="px-4 py-2 text-center tabular-nums font-semibold text-status-critical">
                    {r.total_tn.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={driverLeadingCols + 1} className="px-4 py-6 text-center text-slate-400">
                    No drivers match.
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
            <thead className="sticky top-0 z-20 bg-ink text-left text-white">
              <tr>
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-ink px-4 py-2 font-display font-medium"
                  onClick={() => toggleTnSort("station_name")}
                >
                  Station {tnSortKey === "station_name" && (tnSortDir === "asc" ? "↑" : "↓")}
                </th>
                {TN_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
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
