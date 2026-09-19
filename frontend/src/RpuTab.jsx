import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import DetailPanel from "./components/DetailPanel";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";

// From the Fleet Manager's "LM - RPU Tracker" sheet (query 1397). Merged into one
// status-filterable view instead of 3 separate tabs:
//   Pending Pick Up        -- granular_status = Pending Pickup
//   En Route to Sorting Hub -- granular_status = Van en-route to pickup (the
//                              sheet's own name for this stage -- not delivery
//                              OVFD elsewhere in this app)
//   Pending Inbound        -- granular_status = En-route to Sorting Hub (picked
//                              up, not yet scanned in at the hub)
const STAGES = [
  { key: "all", label: "All" },
  { key: "pending_pickup", label: "Pending Pick Up" },
  { key: "ovfd", label: "En Route to Sorting Hub" },
  { key: "pending_inbound", label: "Pending Inbound" },
];

const AGING_TYPES = [
  { key: "overall", label: "RPU Aging Overall" },
  { key: "zero_attempt", label: "RPU Aging 0 Attempt" },
];

const AGE_BUCKETS = [
  { key: "age_0", label: "Age 0" },
  { key: "age_1", label: "Age 1" },
  { key: "age_2", label: "Age 2" },
  { key: "age_3", label: "Age 3" },
  { key: "age_4_6", label: "Age 4-6" },
  { key: "age_7_plus", label: "Age 7+" },
];

// The summary table always breaks out every stage as its own column -- the
// status filter (STAGES above) only narrows the tracking-number table below it.
const STAGE_TN_COLUMNS = [
  { key: "pending_pickup_tn", label: "Pending Pick Up" },
  { key: "ovfd_tn", label: "En Route to Sorting Hub" },
  { key: "pending_inbound_tn", label: "Pending Inbound" },
  { key: "total_tn", label: "Total TN" },
];

const TN_COLUMNS = [
  { key: "tracking_number", label: "Tracking Number" },
  { key: "status", label: "Status" },
  { key: "attempts", label: "Attempt" },
  { key: "age", label: "Age" },
  { key: "failure_reason", label: "Failure Reason" },
  { key: "driver_name", label: "Driver" },
  { key: "shipper_name", label: "Shipper" },
];

function ShipperSelect({ shipper, setShipper, shippers }) {
  return (
    <select
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
      value={shipper || ""}
      onChange={(e) => setShipper(e.target.value || null)}
    >
      <option value="">All shippers</option>
      {shippers.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

function TnTable({ tnRows, tnRowsTotal, tnRowsTruncated }) {
  const [tnSortKey, setTnSortKey] = useState("age");
  const [tnSortDir, setTnSortDir] = useState("desc");

  const sorted = useMemo(() => {
    return [...tnRows].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return tnSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return tnSortDir === "asc" ? av - bv : bv - av;
    });
  }, [tnRows, tnSortKey, tnSortDir]);

  const toggleTnSort = (key) => {
    if (key === tnSortKey) setTnSortDir(tnSortDir === "asc" ? "desc" : "asc");
    else {
      setTnSortKey(key);
      setTnSortDir("desc");
    }
  };

  const columns = [
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...TN_COLUMNS.map((c) => ({ key: c.key, label: c.label, className: () => "font-mono text-xs", render: (r) => r[c.key] ?? "—" })),
  ];

  return (
    <DataTable
      title="Tracking numbers"
      titleExtra={
        <button
          onClick={() =>
            exportCsv(
              `daily-ops-rpu-tns-${new Date().toISOString().slice(0, 10)}.csv`,
              ["Station", ...TN_COLUMNS.map((c) => c.label)],
              sorted.map((r) => [r.station_name, ...TN_COLUMNS.map((c) => r[c.key] ?? "")])
            )
          }
          className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Export CSV
        </button>
      }
      maxHeight="50vh"
      columns={columns}
      rows={sorted}
      rowKey={(r, i) => `${r.tracking_number}-${i}`}
      sortKey={tnSortKey}
      sortDir={tnSortDir}
      onSort={toggleTnSort}
      emptyMessage="No tracking numbers match."
      footer={
        <>
          {sorted.length.toLocaleString()} tracking numbers
          {tnRowsTruncated && (
            <span className="ml-1 font-medium text-status-critical">
              · showing the oldest {sorted.length.toLocaleString()} of {tnRowsTotal.toLocaleString()} — filter by
              region/zone/station to see the rest
            </span>
          )}
        </>
      }
    />
  );
}

function RpuStatusView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [stage, setStage] = useState("all");
  const [shipper, setShipper] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("total_tn");
  const [sortDir, setSortDir] = useState("desc");
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    setData(null);
    api
      .rpu(stage, shipper)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [stage, shipper]);

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
  const filteredTnRows = useMemo(
    () => (data ? data.tn_rows.filter((r) => visibleStationCodes.has(r.station_code)) : []),
    [data, visibleStationCodes]
  );

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;

  const columns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...STAGE_TN_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      render: (r) => r[c.key].toLocaleString(),
      className: c.key === "total_tn" ? () => "font-semibold text-status-critical" : () => "text-slate-700",
    })),
  ];

  return (
    <div className="space-y-3">
      {!data.captured_at && <div className="text-sm text-slate-500">No data yet.</div>}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <ShipperSelect shipper={shipper} setShipper={setShipper} shippers={data.shippers} />
      </div>

      {data.captured_at && (
        <>
          <DetailPanel
            open={!!detailRow}
            onClose={() => setDetailRow(null)}
            title={detailRow?.station_name}
            subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
            rows={detailRow ? columnsToDetailRows(columns, detailRow) : []}
          />
          <DataTable
            titleExtra={
              <button
                onClick={() =>
                  exportCsv(
                    `daily-ops-rpu-status-${new Date().toISOString().slice(0, 10)}.csv`,
                    ["Region", "Zone", "Station", ...STAGE_TN_COLUMNS.map((c) => c.label)],
                    filteredStations.map((r) => [r.region, r.zone, r.station_name, ...STAGE_TN_COLUMNS.map((c) => r[c.key])])
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Export CSV
              </button>
            }
            maxHeight="40vh"
            columns={columns}
            rows={filteredStations}
            rowKey={(r) => r.station_code}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(r) => setDetailRow(r)}
            emptyMessage="No stations match."
          />

          <TnTable tnRows={filteredTnRows} tnRowsTotal={data.tn_rows_total} tnRowsTruncated={data.tn_rows_truncated} />
        </>
      )}
    </div>
  );
}

function RpuAgingView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [agingType, setAgingType] = useState("overall");
  const [shipper, setShipper] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("total");
  const [sortDir, setSortDir] = useState("desc");
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    setData(null);
    api
      .rpuAging(agingType, shipper)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [agingType, shipper]);

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
  const filteredTnRows = useMemo(
    () => (data ? data.tn_rows.filter((r) => visibleStationCodes.has(r.station_code)) : []),
    [data, visibleStationCodes]
  );

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;

  const columns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    { key: "total", label: "Total", render: (r) => r.total.toLocaleString() },
    ...AGE_BUCKETS.map((b) => ({ key: b.key, label: b.label, render: (r) => r[b.key].toLocaleString() })),
  ];

  return (
    <div className="space-y-3">
      {!data.captured_at && <div className="text-sm text-slate-500">No data yet.</div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl options={AGING_TYPES} value={agingType} onChange={setAgingType} />
        <ShipperSelect shipper={shipper} setShipper={setShipper} shippers={data.shippers} />
      </div>

      {data.captured_at && (
        <>
          <DetailPanel
            open={!!detailRow}
            onClose={() => setDetailRow(null)}
            title={detailRow?.station_name}
            subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
            rows={detailRow ? columnsToDetailRows(columns, detailRow) : []}
          />
          <DataTable
            titleExtra={
              <button
                onClick={() =>
                  exportCsv(
                    `daily-ops-rpu-aging-${agingType}-${new Date().toISOString().slice(0, 10)}.csv`,
                    ["Region", "Zone", "Station", "Total", ...AGE_BUCKETS.map((b) => b.label)],
                    filteredStations.map((r) => [r.region, r.zone, r.station_name, r.total, ...AGE_BUCKETS.map((b) => r[b.key])])
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Export CSV
              </button>
            }
            maxHeight="45vh"
            columns={columns}
            rows={filteredStations}
            rowKey={(r) => r.station_code}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(r) => setDetailRow(r)}
            emptyMessage="No stations match."
          />

          <TnTable tnRows={filteredTnRows} tnRowsTotal={data.tn_rows_total} tnRowsTruncated={data.tn_rows_truncated} />
        </>
      )}
    </div>
  );
}

const RPU_VIEWS = [
  { key: "status", label: "RPU Status" },
  { key: "aging", label: "RPU Aging" },
];

export default function RpuTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [view, setView] = useState("status");

  return (
    <div className="space-y-3">
      <SegmentedControl options={RPU_VIEWS} value={view} onChange={setView} />

      {view === "status" ? (
        <RpuStatusView
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia}
        />
      ) : (
        <RpuAgingView
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia}
        />
      )}
    </div>
  );
}
