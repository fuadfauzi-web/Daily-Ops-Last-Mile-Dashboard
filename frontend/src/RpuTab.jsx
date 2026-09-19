import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import DataTable from "./components/DataTable";
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">
          {data.captured_at ? `RPU data as of ${formatTime(data.captured_at)}` : "No data yet."}
        </div>
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
      </div>

      {data.captured_at && (
        <>
          <DataTable
            maxHeight="40vh"
            columns={columns}
            rows={filteredStations}
            rowKey={(r) => r.station_code}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">
          {data.captured_at ? `${data.type_label} data as of ${formatTime(data.captured_at)}` : "No data yet."}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {AGING_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setAgingType(t.key)}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  agingType === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <ShipperSelect shipper={shipper} setShipper={setShipper} shippers={data.shippers} />
        </div>
      </div>

      {data.captured_at && (
        <>
          <DataTable
            maxHeight="45vh"
            columns={columns}
            rows={filteredStations}
            rowKey={(r) => r.station_code}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            emptyMessage="No stations match."
          />

          <TnTable tnRows={filteredTnRows} tnRowsTotal={data.tn_rows_total} tnRowsTruncated={data.tn_rows_truncated} />
        </>
      )}
    </div>
  );
}

export default function RpuTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [view, setView] = useState("status");

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setView("status")}
          className={`rounded-md px-3 py-1 text-sm font-medium ${
            view === "status" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          RPU Status
        </button>
        <button
          onClick={() => setView("aging")}
          className={`rounded-md px-3 py-1 text-sm font-medium ${
            view === "aging" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          RPU Aging
        </button>
      </div>

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
