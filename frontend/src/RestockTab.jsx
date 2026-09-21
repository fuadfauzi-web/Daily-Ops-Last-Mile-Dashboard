import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import DetailPanel from "./components/DetailPanel";
import SegmentedControl from "./components/SegmentedControl";
import TnModal from "./components/TnModal";
import Skeleton from "./components/Skeleton";

// Restock NXD reuses Shipper Watch's own data (query 1585, see
// backend/aggregate.py's build_shipper_watch) -- pulled out into its own tab so
// it isn't buried alongside Amway/Watson/Zalora/Orca/Sodaxpress. Document
// Compliance (RDO/GRN/PSO/Reattempt) is scaffolded as a sub-tab below but not
// wired to data yet -- the Redash query behind it isn't finished (2026-09-20).
const RESTOCK_COLUMNS = [
  { key: "restock_bundles", label: "Restock Bundles", clickable: true },
  { key: "restock_pieces", label: "Restock Pieces", clickable: true },
  { key: "restock_potential_breach", label: "Restock Potential Breach", clickable: true },
  { key: "restock_breach", label: "Restock Breach", clickable: true },
];

const SUB_TABS = [
  { key: "nxd", label: "Restock NXD" },
  { key: "compliance", label: "Document Compliance" },
];

function RestockNxdView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("restock_bundles");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  useEffect(() => {
    api
      .shipperWatch()
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

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const columns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...RESTOCK_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      render: (r) => r[c.key].toLocaleString(),
      className: (r) => (r[c.key] > 0 ? "font-semibold text-status-critical" : "text-slate-700"),
      onClick: (r) => setModal({ stationCode: r.station_code, stationName: r.station_name, metricKey: c.key, metricLabel: c.label }),
    })),
  ];

  return (
    <div className="space-y-3">
      <TnModal state={modal} onClose={() => setModal(null)} fetcher={api.shipperDrilldown} />
      <DetailPanel
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={detailRow?.station_name}
        subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
        rows={detailRow ? columnsToDetailRows(columns, detailRow) : []}
      />
      <DataTable
        title="Restock NXD"
        titleExtra={
          <button
            onClick={() =>
              exportCsv(
                `daily-ops-restock-nxd-${new Date().toISOString().slice(0, 10)}.csv`,
                ["Region", "Zone", "Station", ...RESTOCK_COLUMNS.map((c) => c.label)],
                filteredStations.map((r) => [r.region, r.zone, r.station_name, ...RESTOCK_COLUMNS.map((c) => r[c.key])])
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV
          </button>
        }
        maxHeight="70vh"
        columns={columns}
        rows={filteredStations}
        rowKey={(r) => r.station_code}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        onRowClick={(r) => setDetailRow(r)}
        emptyMessage="No stations match."
        footer="Restock is counted by bundle, not by individual parcel -- Pieces is the actual parcel count."
      />
    </div>
  );
}

export default function RestockTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [subTab, setSubTab] = useState("nxd");

  return (
    <div className="space-y-3">
      <SegmentedControl options={SUB_TABS} value={subTab} onChange={setSubTab} />

      {subTab === "nxd" ? (
        <RestockNxdView regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me} excludeEastMalaysia={excludeEastMalaysia} />
      ) : (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Document Compliance (RDO / GRN / PSO / Reattempt) is coming soon -- the Redash query behind it isn't ready
          yet.
        </div>
      )}
    </div>
  );
}
