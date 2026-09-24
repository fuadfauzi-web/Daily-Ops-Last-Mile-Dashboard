import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import DetailPanel from "./components/DetailPanel";
import MultiSelect from "./components/MultiSelect";
import SegmentedControl from "./components/SegmentedControl";
import TnModal from "./components/TnModal";
import RdoTnModal, { bundleStatusText } from "./components/RdoTnModal";
import { formatLocalDateTime } from "./lib/format";
import RestockBundlesView from "./RestockBundlesView";
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
  { key: "onhold", label: "Restock On Hold Details" },
  { key: "compliance", label: "B2B Document Compliance" },
];

function RestockNxdView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("restock_bundles");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [bundleStats, setBundleStats] = useState(null); // {station_code: {on_hold_bundles, mps_incomplete}}
  const [preset, setPreset] = useState(null); // narrows the bundle list underneath

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  useEffect(() => {
    api
      .shipperWatch()
      .then(setData)
      .catch((e) => setError(e.message));
    // On Hold / Incomplete counts come from the same bundle data as the list underneath.
    api
      .restockBundles("all")
      .then((res) => setBundleStats(Object.fromEntries(res.stations.map((s) => [s.station_code, s]))))
      .catch(() => setBundleStats({}));
  }, [refreshTick]);

  const filteredStations = useMemo(() => {
    if (!data) return [];
    let rows = data.stations.map((s) => ({
      ...s,
      restock_on_hold: bundleStats?.[s.station_code]?.on_hold_bundles ?? 0,
      restock_incomplete: bundleStats?.[s.station_code]?.mps_incomplete ?? 0,
    }));
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
  }, [data, bundleStats, regionFilter, zoneFilter, search, sortKey, sortDir, excludeEastMalaysia]);

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
    // On Hold / Incomplete come from the bundle list: click to filter it to that station + flag.
    ...[
      { key: "restock_on_hold", label: "Restock On Hold", classes: ["on_hold"] },
      { key: "restock_incomplete", label: "Restock Incomplete", classes: ["mps_incomplete"] },
    ].map((c) => ({
      key: c.key,
      label: c.label,
      render: (r) => r[c.key].toLocaleString(),
      className: (r) => (r[c.key] > 0 ? "font-semibold text-status-warning" : "text-slate-700"),
      onClick: (r) => setPreset({ station: r.station_name, classes: c.classes, nonce: Date.now() }),
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
                ["Region", "Zone", "Station", ...RESTOCK_COLUMNS.map((c) => c.label), "Restock On Hold", "Restock Incomplete"],
                filteredStations.map((r) => [
                  r.region, r.zone, r.station_name, ...RESTOCK_COLUMNS.map((c) => r[c.key]), r.restock_on_hold, r.restock_incomplete,
                ])
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
        footer="Restock is counted by bundle, not by individual parcel -- Pieces is the actual parcel count. On Hold = bundles with a piece on hold; Incomplete = MPS bundles missing pieces (click either to filter the bundle list below)."
      />
      <RestockBundlesView
        view="all"
        preset={preset}
        regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
        excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
      />
    </div>
  );
}

// Document type is a real multi-select filter already (2026-09-24 feedback),
// even though RDO is the only type with data behind it so far -- GRN/PSO/
// Reattempt just aren't selectable options yet, not disabled ones, so there's
// nothing to explain about them in the UI.
const DOCUMENT_TYPES = [{ value: "rdo", label: "RDO" }];

const RDO_TN_COLUMNS = [
  { key: "tracking_number", label: "RDO Tracking Number", text: (r) => r.tracking_number ?? "—" },
  { key: "rdo_status", label: "RDO Status", text: (r) => r.rdo_status ?? "—" },
  { key: "age", label: "Age (days)", text: (r) => (r.age ?? "—") },
  { key: "bundle_tracking_number", label: "Bundle Tracking Number", text: (r) => r.bundle_tracking_number ?? "—" },
  { key: "bundle_delivered_at", label: "Bundle Status", text: bundleStatusText },
  { key: "bundle_last_sweep_at", label: "Bundle Last Sweep", text: (r) => formatLocalDateTime(r.bundle_last_sweep_at) },
];

// Station-table breakdown of Total TN by RDO status (backend/aggregate.py's
// RDO_STATUS_COLUMNS). Any other status only counts in Total TN.
const RDO_STATUS_COLUMNS = [
  { key: "pending_pickup", label: "Pending Pickup" },
  { key: "van_enroute", label: "Van En-route to Pickup" },
  { key: "enroute_sorting", label: "En-route to Sorting Hub" },
  { key: "pickup_fail", label: "Pickup Fail" },
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
  const [tnBundleFilter, setTnBundleFilter] = useState([]);
  const [detailRow, setDetailRow] = useState(null);
  const [tnModal, setTnModal] = useState(null); // { stationCode, stationName, status, label }

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  // Blink fix (2026-09-25): only a real change of what's being shown (a filter / sub-view)
  // resets to the loading skeleton. The 60-second auto-refresh tick just re-fetches in
  // place -- resetting on every tick collapsed the page for a moment and snapped the
  // scroll position back to the top.
  useEffect(() => {
    setData(null);
  }, [documentTypes]);
  useEffect(() => {
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
  const tnBundleOptions = useMemo(
    () => Array.from(new Set(baseTnRows.map((r) => r.bundle_status).filter(Boolean))).sort().map((v) => ({ value: v, label: v })),
    [baseTnRows]
  );
  const filteredTnRows = useMemo(() => {
    let rows = baseTnRows;
    if (tnStationFilter.length) rows = rows.filter((r) => tnStationFilter.includes(r.station_name));
    if (tnStatusFilter.length) rows = rows.filter((r) => r.rdo_status && tnStatusFilter.includes(r.rdo_status));
    if (tnBundleFilter.length) rows = rows.filter((r) => r.bundle_status && tnBundleFilter.includes(r.bundle_status));
    // Empty values always sort last, whichever direction.
    return [...rows].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      const aEmpty = av == null || av === "";
      const bEmpty = bv == null || bv === "";
      if (aEmpty || bEmpty) return aEmpty && bEmpty ? 0 : aEmpty ? 1 : -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return tnSortDir === "asc" ? cmp : -cmp;
    });
  }, [baseTnRows, tnSortKey, tnSortDir, tnStationFilter, tnStatusFilter, tnBundleFilter]);

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
    {
      key: "total_tn",
      label: "Total TN",
      className: () => "font-semibold text-status-critical",
      render: (r) => r.total_tn.toLocaleString(),
      onClick: (r) => setTnModal({ stationCode: r.station_code, stationName: r.station_name, status: "all", label: "Total TN" }),
    },
    ...RDO_STATUS_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      className: (r) => (r[c.key] > 0 ? "text-slate-800" : "text-slate-400"),
      render: (r) => r[c.key].toLocaleString(),
      onClick: (r) => setTnModal({ stationCode: r.station_code, stationName: r.station_name, status: c.key, label: c.label }),
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

      <RdoTnModal state={tnModal} onClose={() => setTnModal(null)} />
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
                  <MultiSelect options={tnStatusOptions} value={tnStatusFilter} onChange={setTnStatusFilter} placeholder="All RDO statuses" />
                </div>
                <div className="w-48">
                  <MultiSelect options={tnBundleOptions} value={tnBundleFilter} onChange={setTnBundleFilter} placeholder="All bundle statuses" />
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
                the bundle physically sits; bundles whose last sweep hub isn't one of the 143 stations are left out) · every bundle status is included, completed or not · Age = days since the RDO was created · click a count in the station table for its tracking numbers + CSV · Bundle Status shows the date the bundle completed · RDO Status is raw from Redash -- the "MPS
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
      ) : subTab === "onhold" ? (
        <RestockBundlesView
          view="attention"
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
