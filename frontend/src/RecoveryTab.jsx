import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import GroupTable from "./components/GroupTable";
import DetailPanel from "./components/DetailPanel";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";

const SUB_TABS = [{ key: "missing", label: "Missing Details" }];

const OVERVIEW_COLUMNS = [
  { key: "hub_count", label: "Hub", render: (r) => r.hub_count.toLocaleString() },
  { key: "ship_in_count", label: "Ship In", render: (r) => r.ship_in_count.toLocaleString() },
  { key: "other_count", label: "Other", render: (r) => r.other_count.toLocaleString() },
  { key: "total_count", label: "Total", className: () => "font-semibold text-status-critical", render: (r) => r.total_count.toLocaleString() },
];

const TN_COLUMNS = [
  { key: "tracking_number", label: "Tracking Number" },
  { key: "hub_code", label: "Hub Code" },
  { key: "type", label: "Type" },
  { key: "age", label: "Age" },
  { key: "cod_value", label: "COD Value" },
  { key: "item_description", label: "Item" },
];

// Re-aggregates from whatever's currently filtered (region/zone/search/East
// Malaysia), rather than just filtering the server's role-scoped-only rollup --
// same pattern as Dashboard.jsx/AgingDetailsTab.jsx's own localRollup.
function localRollup(rows, groupKey) {
  const groups = {};
  rows.forEach((r) => {
    const key = r[groupKey];
    if (!groups[key]) {
      groups[key] = { key, region: r.region, station_count: 0, hub_count: 0, ship_in_count: 0, other_count: 0, total_count: 0 };
    }
    const g = groups[key];
    g.station_count += 1;
    g.hub_count += r.hub_count;
    g.ship_in_count += r.ship_in_count;
    g.other_count += r.other_count;
    g.total_count += r.total_count;
  });
  return Object.values(groups);
}

function MissingDetailsView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("total_count");
  const [sortDir, setSortDir] = useState("desc");
  const [tnSortKey, setTnSortKey] = useState("age");
  const [tnSortDir, setTnSortDir] = useState("desc");
  const [tnStationSearch, setTnStationSearch] = useState("");
  const [highValueOnly, setHighValueOnly] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    api
      .missingDetails()
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
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, regionFilter, zoneFilter, search, sortKey, sortDir, excludeEastMalaysia]);

  const visibleStationCodes = useMemo(() => new Set(filteredStations.map((r) => r.station_code)), [filteredStations]);

  const filteredTnRows = useMemo(() => {
    if (!data) return [];
    let rows = data.tn_rows.filter((r) => visibleStationCodes.has(r.station_code));
    if (highValueOnly) rows = rows.filter((r) => r.is_high_value);
    // A second, table-local station filter -- independent of the shared search
    // box above -- so a Manager/Region user can narrow just this TN list to one
    // station without touching the overview tables' own filtering.
    if (tnStationSearch.trim()) {
      const q = tnStationSearch.trim().toLowerCase();
      rows = rows.filter((r) => r.station_name.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return tnSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return tnSortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, visibleStationCodes, tnSortKey, tnSortDir, highValueOnly, tnStationSearch]);

  const zoneGroups = useMemo(() => localRollup(filteredStations, "zone"), [filteredStations]);
  const regionGroups = useMemo(() => localRollup(filteredStations, "region"), [filteredStations]);

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

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const overviewColumns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...OVERVIEW_COLUMNS,
  ];

  const groupColumns = OVERVIEW_COLUMNS.map((c) => ({ ...c }));

  const tnColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...TN_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      className: (r) => {
        if (!r.is_high_value) return "font-mono text-xs";
        return c.key === "cod_value" || c.key === "item_description"
          ? "font-mono text-xs font-semibold text-status-critical"
          : "font-mono text-xs";
      },
      render: (r) => {
        if (c.key === "cod_value") return r.cod_value != null ? r.cod_value.toLocaleString() : "—";
        return r[c.key] ?? "—";
      },
    })),
  ];

  return (
    <div className="space-y-3">
      <DetailPanel
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={detailRow?.station_name}
        subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
        rows={detailRow ? columnsToDetailRows(overviewColumns, detailRow) : []}
      />

      <GroupTable title="By region" groupLabel="Region" rows={regionGroups} columns={groupColumns} />
      <GroupTable title="By zone" groupLabel="Zone" rows={zoneGroups} columns={groupColumns} />

      <DataTable
        title="Missing Details — by station"
        titleExtra={
          <button
            onClick={() =>
              exportCsv(
                `daily-ops-missing-details-stations-${new Date().toISOString().slice(0, 10)}.csv`,
                ["Region", "Zone", "Station", ...OVERVIEW_COLUMNS.map((c) => c.label)],
                filteredStations.map((r) => [r.region, r.zone, r.station_name, ...OVERVIEW_COLUMNS.map((c) => r[c.key])])
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV
          </button>
        }
        maxHeight="40vh"
        columns={overviewColumns}
        rows={filteredStations}
        rowKey={(r) => r.station_code}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        onRowClick={(r) => setDetailRow(r)}
        emptyMessage="No stations match."
      />

      <DataTable
        title="Tracking numbers"
        titleExtra={
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              placeholder="Search station (this table only)…"
              value={tnStationSearch}
              onChange={(e) => setTnStationSearch(e.target.value)}
            />
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={highValueOnly} onChange={(e) => setHighValueOnly(e.target.checked)} />
              High value only
            </label>
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-missing-details-tns-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Station", ...TN_COLUMNS.map((c) => c.label)],
                  filteredTnRows.map((r) => [r.station_name, ...TN_COLUMNS.map((c) => r[c.key] ?? "")])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
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
            {filteredTnRows.length.toLocaleString()} tracking numbers · rows in{" "}
            <span className="font-semibold text-status-critical">red</span> have a COD value ≥{" "}
            {data.high_cod_value_threshold.toLocaleString()} or an item description matching a high-value keyword
            (editable in Admin → Recovery Settings).
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

export default function RecoveryTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [subTab, setSubTab] = useState("missing");

  return (
    <div className="space-y-3">
      <SegmentedControl options={SUB_TABS} value={subTab} onChange={setSubTab} />
      <MissingDetailsView
        regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
        excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
      />
    </div>
  );
}
