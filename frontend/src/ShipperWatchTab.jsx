import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import TnModal from "./components/TnModal";
import DetailPanel from "./components/DetailPanel";
import Skeleton from "./components/Skeleton";

// Amway/Watson SLA: attempt on day 0, succeed delivery before day 3 -- so 0-Attempt
// and Aging(>Day0) are what matters. Orca: OVFD vs everything else (no confirmed TN
// pattern for Orca -- see backend/aggregate.py). Zalora: 0-Attempt + OVFD/Other split,
// only for parcels sitting at their correct hub. Restock: bundle/piece counts plus its
// two breach buckets. None of this has been cross-checked against live data yet --
// numbers are provisional until confirmed.
const COLUMNS = [
  { key: "zalora_zero_attempt", label: "Zalora NXD 0 Attempt", clickable: true },
  { key: "zalora_ovfd", label: "Zalora NXD OVFD", clickable: true },
  { key: "zalora_other", label: "Zalora NXD Other Status", clickable: true },
  { key: "amway_zero_attempt", label: "Amway 0 Attempt", clickable: true },
  { key: "amway_aging", label: "Amway Aging >D0", clickable: true },
  { key: "watson_zero_attempt", label: "Watson 0 Attempt", clickable: true },
  { key: "watson_aging", label: "Watson Aging >D0", clickable: true },
  { key: "restock_bundles", label: "Restock Bundles", clickable: true },
  { key: "restock_pieces", label: "Restock Pieces", clickable: true },
  { key: "restock_potential_breach", label: "Restock Potential Breach", clickable: true },
  { key: "restock_breach", label: "Restock Breach", clickable: true },
  { key: "orca_ovfd", label: "Orca OVFD", clickable: true },
  { key: "orca_other", label: "Orca Other Status", clickable: true },
  { key: "sodaxpress_ovfd", label: "Sodaxpress OVFD", clickable: true },
  { key: "sodaxpress_other", label: "Sodaxpress Other Status", clickable: true },
];

export default function ShipperWatchTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("zalora_zero_attempt");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    api
      .shipperWatch()
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
    ...COLUMNS.map((c) => ({
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
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
        Data as of {formatTime(data.captured_at)}
      </div>
      <DataTable
        title="Shipper Watch"
        titleExtra={
          <button
            onClick={() =>
              exportCsv(
                `daily-ops-shipper-watch-${new Date().toISOString().slice(0, 10)}.csv`,
                ["Region", "Zone", "Station", ...COLUMNS.map((c) => c.label)],
                filteredStations.map((r) => [r.region, r.zone, r.station_name, ...COLUMNS.map((c) => r[c.key])])
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
        footer={
          <>
            {filteredStations.length} rows · Amway/Watson SLA: attempt day 0, succeed before day 3. Zalora only
            counts parcels at their correct hub (dest hub = last sweep hub). Restock is counted by bundle, not by
            individual parcel — "Pieces" is the actual parcel count. These formulas haven't been checked against
            live data yet — flag anything that looks off.
          </>
        }
      />
    </div>
  );
}
