import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import GroupTable from "./components/GroupTable";
import DetailPanel from "./components/DetailPanel";
import MultiSelect from "./components/MultiSelect";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";

// Station x age-bucket pivot, grouped by last_scan_hub_name like the rest of the app
// -- but unlike the main Age>3 metric, this INCLUDES On Hold / On Vehicle for Delivery
// statuses, so it's the full picture of everything sitting in a hub by age. Five
// sub-views share this same shape (see backend/aggregate.py's AGING_TYPES):
//   Overall / 0 Attempt / Delivery / ATS / COD
const AGING_TYPES = [
  { key: "overall", label: "Aging Overall" },
  { key: "zero_attempt", label: "Aging 0 Attempt" },
  { key: "delivery", label: "Aging Delivery" },
  { key: "ats", label: "Aging ATS" },
  { key: "cod", label: "Aging COD" },
];

const AGE_BUCKETS = [
  { key: "age_0", label: "Age 0" },
  { key: "age_1", label: "Age 1" },
  { key: "age_2", label: "Age 2" },
  { key: "age_3", label: "Age 3" },
  { key: "age_4_6", label: "Age 4-6" },
  { key: "age_7_plus", label: "Age 7+" },
];

// Mirrors backend/main.py's AGING_TN_ROWS_CAP -- for the truncation notice only.
const AGING_TN_ROWS_CAP = 2000;

const TN_COLUMNS = [
  { key: "tracking_number", label: "Tracking Number" },
  { key: "status", label: "Status" },
  { key: "attempts", label: "Attempt" },
  { key: "age", label: "Age" },
  { key: "tag", label: "Tag" },
  { key: "cod", label: "COD" },
  { key: "dest_hub", label: "Dest Hub" },
];

const AGE_BUCKET_COLUMNS = AGE_BUCKETS.map((b) => ({ key: b.key, label: b.label, render: (r) => r[b.key].toLocaleString() }));

function localRollup(rows, groupKey) {
  const groups = {};
  rows.forEach((r) => {
    const key = r[groupKey];
    if (!groups[key]) {
      groups[key] = { key, region: r.region, station_count: 0, total: 0 };
      AGE_BUCKETS.forEach((b) => (groups[key][b.key] = 0));
    }
    groups[key].station_count += 1;
    groups[key].total += r.total;
    AGE_BUCKETS.forEach((b) => (groups[key][b.key] += r[b.key]));
  });
  return Object.values(groups);
}

// source="coldchain" (2026-09-25) reuses this whole view for the Cold Chain tab: the same
// station x age-bucket pivot and TN table, but only for the tracking numbers in Redash
// query 1410 (joined to query 78 by the backend) -- so no sub-view picker.
export default function AgingDetailsTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick, source = "aging" }) {
  const isCold = source === "coldchain";
  const [agingType, setAgingType] = useState("overall");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("total");
  const [sortDir, setSortDir] = useState("desc");
  const [tnSortKey, setTnSortKey] = useState("age");
  const [tnSortDir, setTnSortDir] = useState("desc");
  const [tnStationFilter, setTnStationFilter] = useState([]);
  const [tnStatusFilter, setTnStatusFilter] = useState([]);
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  useEffect(() => {
    setData(null);
    (isCold ? api.coldChain() : api.agingDetails(agingType))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [agingType, refreshTick, isCold]);

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

  // Base set for this table's own filter dropdowns -- station/zone/region/search
  // scoped, but before this table's own station/status picks are applied, so the
  // options offered always reflect what's actually available to pick from.
  const baseTnRows = useMemo(
    () => (data ? data.tn_rows.filter((r) => visibleStationCodes.has(r.station_code)) : []),
    [data, visibleStationCodes]
  );
  const tnStationOptions = useMemo(
    () => Array.from(new Set(baseTnRows.map((r) => r.station_name).filter(Boolean))).sort().map((v) => ({ value: v, label: v })),
    [baseTnRows]
  );
  const tnStatusOptions = useMemo(
    () => Array.from(new Set(baseTnRows.map((r) => r.status).filter(Boolean))).sort().map((v) => ({ value: v, label: v })),
    [baseTnRows]
  );

  const filteredTnRows = useMemo(() => {
    let rows = baseTnRows;
    if (tnStationFilter.length) rows = rows.filter((r) => tnStationFilter.includes(r.station_name));
    if (tnStatusFilter.length) rows = rows.filter((r) => r.status && tnStatusFilter.includes(r.status));
    return [...rows].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return tnSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return tnSortDir === "asc" ? av - bv : bv - av;
    });
  }, [baseTnRows, tnSortKey, tnSortDir, tnStationFilter, tnStatusFilter]);

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

  const pivotColumns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    { key: "total", label: "Total", render: (r) => r.total.toLocaleString() },
    ...AGE_BUCKET_COLUMNS,
  ];

  const tnColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...TN_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      sortable: true,
      className: () => "font-mono text-xs",
      render: (r) => r[c.key] ?? "—",
    })),
  ];

  return (
    <div className="space-y-3">
      {!isCold && <SegmentedControl options={AGING_TYPES} value={agingType} onChange={setAgingType} />}

      {!data && <Skeleton />}

      {data && !data.captured_at && (
        <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>
      )}

      {data && data.captured_at && (
        <>
          <GroupTable
            title="By region (follows filters below)"
            groupLabel="Region"
            rows={regionGroups}
            columns={[{ key: "total", label: "Total", render: (r) => r.total.toLocaleString() }, ...AGE_BUCKET_COLUMNS]}
          />
          <GroupTable
            title="By zone (follows filters below)"
            groupLabel="Zone"
            rows={zoneGroups}
            columns={[{ key: "total", label: "Total", render: (r) => r.total.toLocaleString() }, ...AGE_BUCKET_COLUMNS]}
          />

          <DetailPanel
            open={!!detailRow}
            onClose={() => setDetailRow(null)}
            title={detailRow?.station_name}
            subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
            rows={detailRow ? columnsToDetailRows(pivotColumns, detailRow) : []}
          />

          <DataTable
            title={`${data.type_label} — pivot`}
            titleExtra={
              <button
                onClick={() =>
                  exportCsv(
                    `daily-ops-${isCold ? "cold-chain" : `aging-${agingType}`}-${new Date().toISOString().slice(0, 10)}.csv`,
                    ["Region", "Zone", "Station", "Total", ...AGE_BUCKETS.map((b) => b.label)],
                    filteredStations.map((r) => [r.region, r.zone, r.station_name, r.total, ...AGE_BUCKETS.map((b) => r[b.key])])
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Export CSV
              </button>
            }
            maxHeight="50vh"
            columns={pivotColumns}
            rows={filteredStations}
            rowKey={(r) => r.station_code}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(r) => setDetailRow(r)}
            emptyMessage="No stations match."
          />

          <DataTable
            title={`${data.type_label} — tracking numbers`}
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
                    `daily-ops-${isCold ? "cold-chain" : `aging-${agingType}`}-tns-${new Date().toISOString().slice(0, 10)}.csv`,
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
            maxHeight="60vh"
            columns={tnColumns}
            rows={filteredTnRows}
            rowKey={(r, i) => `${r.tracking_number}-${i}`}
            sortKey={tnSortKey}
            sortDir={tnSortDir}
            onSort={toggleTnSort}
            emptyMessage="No tracking numbers match."
            footer={
              <>
                {filteredTnRows.length.toLocaleString()} tracking numbers · grouped by last_scan_hub_name, not dest_hub
                {isCold && (
                  <>
                    {" "}· {data.matched_tn_count.toLocaleString()} of {data.source_tn_count.toLocaleString()} cold-chain
                    tracking numbers are in the active dataset (the rest are already completed or added to a shipment);
                    parcels sitting at a non-station hub such as CC-GLE appear as their own "Other hubs" rows
                  </>
                )}
                {data.tn_rows_truncated && (
                  <span className="ml-1 font-medium text-status-critical">
                    · showing the oldest {AGING_TN_ROWS_CAP.toLocaleString()} of {data.tn_rows_total.toLocaleString()}{" "}
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
