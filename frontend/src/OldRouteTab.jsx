import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import DetailPanel from "./components/DetailPanel";
import MultiSelect from "./components/MultiSelect";
import Skeleton from "./components/Skeleton";

const TN_COLUMNS = [
  { key: "tracking_number", label: "Tracking Number" },
  { key: "route_id", label: "Route ID" },
  { key: "route_date", label: "Route Date" },
  { key: "age", label: "Age" },
  { key: "driver_name", label: "Driver" },
  { key: "shipper_name", label: "Shipper" },
];

export default function OldRouteTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [stationSortKey, setStationSortKey] = useState("total_tn");
  const [stationSortDir, setStationSortDir] = useState("desc");
  const [driverSortKey, setDriverSortKey] = useState("total_tn");
  const [driverSortDir, setDriverSortDir] = useState("desc");
  const [driverSearch, setDriverSearch] = useState("");
  const [tnSortKey, setTnSortKey] = useState("age");
  const [tnSortDir, setTnSortDir] = useState("desc");
  const [tnStationFilter, setTnStationFilter] = useState([]);
  const [copied, setCopied] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);
  const showDriverStationCol = me.scope_type !== "station";

  useEffect(() => {
    api
      .oldRoute()
      .then(setData)
      .catch((e) => setError(e.message));
  }, [refreshTick]);

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

  const baseTnRows = useMemo(
    () => (data ? data.tn_rows.filter((r) => visibleStationCodes.has(r.station_code)) : []),
    [data, visibleStationCodes]
  );
  const tnStationOptions = useMemo(
    () => Array.from(new Set(baseTnRows.map((r) => r.station_name).filter(Boolean))).sort().map((v) => ({ value: v, label: v })),
    [baseTnRows]
  );

  const filteredTnRows = useMemo(() => {
    // Independent of the shared filter bar above -- lets a Manager/Region user
    // narrow just this table to one station without touching By station/By driver.
    let tn = baseTnRows;
    if (tnStationFilter.length) tn = tn.filter((r) => tnStationFilter.includes(r.station_name));
    return [...tn].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return tnSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return tnSortDir === "asc" ? av - bv : bv - av;
    });
  }, [baseTnRows, tnSortKey, tnSortDir, tnStationFilter]);

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
  if (!data) return <Skeleton />;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const stationColumns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    { key: "total_tn", label: "Total TN", className: () => "font-semibold text-status-critical", render: (r) => r.total_tn.toLocaleString() },
  ];

  const driverColumns = [
    { key: "driver_name", label: "Driver", sticky: true, align: "left" },
    ...(showDriverStationCol ? [{ key: "station_name", label: "Station", sortable: false, className: () => "text-slate-500" }] : []),
    { key: "total_tn", label: "Total TN", className: () => "font-semibold text-status-critical", render: (r) => r.total_tn.toLocaleString() },
  ];

  const tnColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...TN_COLUMNS.map((c) => ({ key: c.key, label: c.label, className: () => "font-mono text-xs", render: (r) => r[c.key] ?? "—" })),
  ];

  return (
    <div className="space-y-3">
      <DetailPanel
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={detailRow?.station_name || detailRow?.driver_name}
        subtitle={detailRow?.region ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
        rows={detailRow ? columnsToDetailRows(detailRow.driver_name ? driverColumns : stationColumns, detailRow) : []}
      />
      <DataTable
        title="By station"
        titleExtra={
          <button
            onClick={() =>
              exportCsv(
                `daily-ops-old-route-stations-${new Date().toISOString().slice(0, 10)}.csv`,
                ["Region", "Zone", "Station", "Total TN"],
                filteredStations.map((r) => [r.region, r.zone, r.station_name, r.total_tn])
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV
          </button>
        }
        maxHeight="40vh"
        columns={stationColumns}
        rows={filteredStations}
        rowKey={(r) => r.station_code}
        sortKey={stationSortKey}
        sortDir={stationSortDir}
        onSort={toggleStationSort}
        onRowClick={(r) => setDetailRow(r)}
        emptyMessage="No stations match."
      />

      <DataTable
        title="By driver"
        titleExtra={
          <div className="flex items-center gap-2">
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              placeholder="Search driver…"
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
            />
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-old-route-drivers-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Driver", "Station", "Total TN"],
                  filteredDrivers.map((r) => [r.driver_name, r.station_name, r.total_tn])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        }
        maxHeight="40vh"
        columns={driverColumns}
        rows={filteredDrivers}
        rowKey={(r, i) => r.driver_name || i}
        sortKey={driverSortKey}
        sortDir={driverSortDir}
        onSort={toggleDriverSort}
        onRowClick={(r) => setDetailRow(r)}
        emptyMessage="No drivers match."
      />

      <DataTable
        title="Tracking numbers"
        titleExtra={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48">
              <MultiSelect options={tnStationOptions} value={tnStationFilter} onChange={setTnStationFilter} placeholder="Search station (this table only)…" />
            </div>
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-old-route-tns-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Station", ...TN_COLUMNS.map((c) => c.label)],
                  filteredTnRows.map((r) => [r.station_name, ...TN_COLUMNS.map((c) => r[c.key] ?? "")])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
            <button
              onClick={copyTns}
              disabled={!filteredTnRows.length}
              className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              {copied ? "Copied!" : "Copy list"}
            </button>
          </div>
        }
        maxHeight="55vh"
        columns={tnColumns}
        rows={filteredTnRows}
        rowKey={(r, i) => `${r.tracking_number}-${i}`}
        sortKey={tnSortKey}
        sortDir={tnSortDir}
        onSort={toggleTnSort}
        emptyMessage="No tracking numbers match."
        footer={
          <>
            {filteredTnRows.length.toLocaleString()} tracking numbers
            {data.tn_rows_truncated && (
              <span className="ml-1 font-medium text-status-critical">
                · showing the oldest {filteredTnRows.length.toLocaleString()} of {data.tn_rows_total.toLocaleString()}{" "}
                nationwide — filter by region/zone/station to see the rest
              </span>
            )}
          </>
        }
      />
    </div>
  );
}
