import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import DetailPanel from "./components/DetailPanel";
import MultiSelect from "./components/MultiSelect";
import SegmentedControl from "./components/SegmentedControl";
import TnModal from "./components/TnModal";
import Skeleton from "./components/Skeleton";

// Restock NXD reuses Shipper Watch's own data (query 1585, see
// backend/aggregate.py's build_shipper_watch) -- pulled out into its own tab so
// it isn't buried alongside Amway/Watson/Zalora/Orca/Sodaxpress.
const RESTOCK_COLUMNS = [
  { key: "restock_bundles", label: "Restock Bundles", clickable: true },
  { key: "restock_pieces", label: "Restock Pieces", clickable: true },
  { key: "restock_potential_breach", label: "Restock Potential Breach", clickable: true },
  { key: "restock_breach", label: "Restock Breach", clickable: true },
];

const SUB_TABS = [
  { key: "nxd", label: "Restock NXD" },
  { key: "compliance", label: "B2B Document Compliance" },
];

function RestockNxdView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
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

// Document type is a real multi-select filter already (2026-09-24 feedback),
// even though RDO is the only type with data behind it so far -- GRN/PSO/
// Reattempt just aren't selectable options yet, not disabled ones, so there's
// nothing to explain about them in the UI.
const DOCUMENT_TYPES = [{ value: "rdo", label: "RDO" }];

// "2026-09-23 11:56:29.000000" -> "23 Sep, 11:56 am". Redash sends these as plain
// Malaysia local time with no timezone, so format the text itself rather than
// going through Date (which would shift it by the browser's offset).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatLocalDateTime(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value || "");
  if (!m) return value || "—";
  const hour = Number(m[4]);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}, ${h12}:${m[5]} ${hour >= 12 ? "pm" : "am"}`;
}

// 2026-09-24 feedback: Bundle Status shows the date the bundle completed (when it
// has), and a Bundle Last Sweep column gives the date/time of the bundle's last
// sweep at its hub.
function bundleStatusText(r) {
  if (r.bundle_status === "Completed" && r.bundle_delivered_at) {
    return `Completed · ${formatLocalDateTime(r.bundle_delivered_at)}`;
  }
  return r.bundle_status ?? "—";
}

const RDO_TN_COLUMNS = [
  { key: "tracking_number", label: "RDO Tracking Number", text: (r) => r.tracking_number ?? "—" },
  { key: "rdo_status", label: "RDO Status", text: (r) => r.rdo_status ?? "—" },
  { key: "bundle_tracking_number", label: "Bundle Tracking Number", text: (r) => r.bundle_tracking_number ?? "—" },
  { key: "bundle_delivered_at", label: "Bundle Status", text: bundleStatusText },
  { key: "bundle_last_sweep_at", label: "Bundle Last Sweep", text: (r) => formatLocalDateTime(r.bundle_last_sweep_at) },
];

// Station-table breakdown of Total TN by RDO status (backend/aggregate.py's
// RDO_STATUS_COLUMNS); other statuses such as "Pickup fail" only count in Total TN.
const RDO_STATUS_COLUMNS = [
  { key: "pending_pickup", label: "Pending Pickup" },
  { key: "van_enroute", label: "Van En-route to Pickup" },
  { key: "enroute_sorting", label: "En-route to Sorting Hub" },
];

function RdoComplianceView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [documentTypes, setDocumentTypes] = useState(["rdo"]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("total_tn");
  const [sortDir, setSortDir] = useState("desc");
  const [tnSortKey, setTnSortKey] = useState("rdo_created_at");
  const [tnSortDir, setTnSortDir] = useState("desc");
  const [tnStationFilter, setTnStationFilter] = useState([]);
  const [tnStatusFilter, setTnStatusFilter] = useState([]);
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  useEffect(() => {
    setData(null);
    api
      .b2bCompliance(documentTypes)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [documentTypes, refreshTick]);

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
  const baseTnRows = useMemo(
    () => (data ? data.tn_rows.filter((r) => visibleStationCodes.has(r.station_code)) : []),
    [data, visibleStationCodes]
  );
  const tnStationOptions = useMemo(
    () => Array.from(new Set(baseTnRows.map((r) => r.station_name).filter(Boolean))).sort().map((v) => ({ value: v, label: v })),
    [baseTnRows]
  );
  const tnStatusOptions = useMemo(
    () => Array.from(new Set(baseTnRows.map((r) => r.rdo_status).filter(Boolean))).sort().map((v) => ({ value: v, label: v })),
    [baseTnRows]
  );
  const filteredTnRows = useMemo(() => {
    let rows = baseTnRows;
    if (tnStationFilter.length) rows = rows.filter((r) => tnStationFilter.includes(r.station_name));
    if (tnStatusFilter.length) rows = rows.filter((r) => r.rdo_status && tnStatusFilter.includes(r.rdo_status));
    return [...rows].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return tnSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return tnSortDir === "asc" ? av - bv : bv - av;
    });
  }, [baseTnRows, tnSortKey, tnSortDir, tnStationFilter, tnStatusFilter]);

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

  const stationColumns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    { key: "total_tn", label: "Total TN", className: () => "font-semibold text-status-critical", render: (r) => r.total_tn.toLocaleString() },
    ...RDO_STATUS_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      className: (r) => (r[c.key] > 0 ? "text-slate-800" : "text-slate-400"),
      render: (r) => r[c.key].toLocaleString(),
    })),
  ];

  const tnColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...RDO_TN_COLUMNS.map((c) => ({ key: c.key, label: c.label, className: () => "font-mono text-xs", render: c.text })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-xs font-semibold text-slate-700">Document type:</span>
        <div className="w-48">
          <MultiSelect options={DOCUMENT_TYPES} value={documentTypes} onChange={setDocumentTypes} placeholder="Select document type(s)" />
        </div>
      </div>

      {!data.captured_at ? (
        <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">
          {documentTypes.length === 0 ? "Pick at least one document type above." : "No data yet."}
        </div>
      ) : (
        <>
          <DetailPanel
            open={!!detailRow}
            onClose={() => setDetailRow(null)}
            title={detailRow?.station_name}
            subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
            rows={detailRow ? columnsToDetailRows(stationColumns, detailRow) : []}
          />
          <DataTable
            title="B2B Document Compliance — by station"
            titleExtra={
              <button
                onClick={() =>
                  exportCsv(
                    `daily-ops-b2b-compliance-stations-${new Date().toISOString().slice(0, 10)}.csv`,
                    ["Region", "Zone", "Station", "Total TN", ...RDO_STATUS_COLUMNS.map((c) => c.label)],
                    filteredStations.map((r) => [
                      r.region, r.zone, r.station_name, r.total_tn, ...RDO_STATUS_COLUMNS.map((c) => r[c.key]),
                    ])
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
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(r) => setDetailRow(r)}
            emptyMessage="No stations match."
          />

          <DataTable
            title="Tracking numbers"
            titleExtra={
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-48">
                  <MultiSelect options={tnStationOptions} value={tnStationFilter} onChange={setTnStationFilter} placeholder="Search station (this table only)…" />
                </div>
                <div className="w-48">
                  <MultiSelect options={tnStatusOptions} value={tnStatusFilter} onChange={setTnStatusFilter} placeholder="All statuses" />
                </div>
                <button
                  onClick={() =>
                    exportCsv(
                      `daily-ops-b2b-compliance-tns-${new Date().toISOString().slice(0, 10)}.csv`,
                      ["Station", ...RDO_TN_COLUMNS.map((c) => c.label)],
                      filteredTnRows.map((r) => [r.station_name, ...RDO_TN_COLUMNS.map((c) => c.text(r))])
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
                {filteredTnRows.length.toLocaleString()} tracking numbers · grouped by bundle_last_sweep_hub (where
                the bundle physically sits) · Bundle Status shows the date the bundle completed · RDO Status is raw from Redash -- the "MPS
                completed but RDO still pending" style classification from the Fleet Manager's own sheet isn't
                reproduced here yet.
                {data.tn_rows_truncated && (
                  <span className="ml-1 font-medium text-status-critical">
                    · showing the newest {filteredTnRows.length.toLocaleString()} of {data.tn_rows_total.toLocaleString()}{" "}
                    nationwide — filter by region/zone/station to see the rest
                  </span>
                )}
              </>
            }
          />
        </>
      )}
    </div>
  );
}

export default function RestockTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [subTab, setSubTab] = useState("nxd");

  return (
    <div className="space-y-3">
      <SegmentedControl options={SUB_TABS} value={subTab} onChange={setSubTab} />

      {subTab === "nxd" ? (
        <RestockNxdView
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        />
      ) : (
        <RdoComplianceView
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        />
      )}
    </div>
  );
}
