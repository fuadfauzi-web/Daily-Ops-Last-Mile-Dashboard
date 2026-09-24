import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import DataTable from "./components/DataTable";
import MultiSelect from "./components/MultiSelect";
import Skeleton from "./components/Skeleton";

// Restock bundles, one row per bundle_tracking_number (query 1585 grouped by
// backend/aggregate.py's build_restock_bundles). Used two ways (2026-09-25):
//   view="all"        -- the bundle-level tracking-number list under Restock NXD;
//   view="attention"  -- the On Hold sub-tab: bundles that are on hold and/or
//                        missing pieces, with a by-station summary above.
// MPS incomplete = fewer pieces present than the bundle's piece_count (a piece
// hasn't arrived). Complete but on hold = every piece present yet at least one is
// On Hold, so the hold can be released. Provisional: "present" means "still in the
// active-orders query", so confirm against a real MPS example.
const CLASS_LABEL = {
  mps_incomplete: "MPS incomplete",
  complete_on_hold: "Complete, still on hold",
  single_on_hold: "On hold (single piece)",
  ok: "OK",
};
const CLASS_STYLE = {
  mps_incomplete: "bg-status-critical/10 text-status-critical",
  complete_on_hold: "bg-status-warning/10 text-status-warning",
  single_on_hold: "bg-slate-100 text-slate-600",
  ok: "bg-status-good/10 text-status-good",
};

const STATION_COUNT_COLUMNS = [
  { key: "bundles", label: "Bundles" },
  { key: "on_hold_bundles", label: "On Hold Bundles" },
  { key: "mps_incomplete", label: "MPS Incomplete" },
  { key: "complete_on_hold", label: "Complete but On Hold" },
  { key: "missing_pieces_total", label: "Missing Pieces" },
];

export default function RestockBundlesView({ view, regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("on_hold_bundles");
  const [sortDir, setSortDir] = useState("desc");
  const [tnSortKey, setTnSortKey] = useState("aging_days");
  const [tnSortDir, setTnSortDir] = useState("desc");
  const [stationFilter, setStationFilter] = useState([]);
  const [classFilter, setClassFilter] = useState([]);

  const attention = view === "attention";
  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  useEffect(() => {
    setData(null);
    api
      .restockBundles(view)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [view, refreshTick]);

  const inScope = (r) => {
    if (excludeEastMalaysia && r.region === "East Malaysia") return false;
    if (regionFilter !== "all" && r.region !== regionFilter) return false;
    if (zoneFilter !== "all" && r.zone !== zoneFilter) return false;
    if (search.trim() && !r.station_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  };

  const filteredStations = useMemo(() => {
    if (!data) return [];
    return data.stations.filter(inScope).sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, regionFilter, zoneFilter, search, sortKey, sortDir, excludeEastMalaysia]);

  const baseRows = useMemo(() => (data ? data.bundles.filter(inScope) : []), [data, regionFilter, zoneFilter, search, excludeEastMalaysia]);
  const stationOptions = useMemo(
    () => Array.from(new Set(baseRows.map((r) => r.station_name))).sort().map((v) => ({ value: v, label: v })),
    [baseRows]
  );
  const classOptions = useMemo(
    () => Array.from(new Set(baseRows.map((r) => r.bundle_class))).map((v) => ({ value: v, label: CLASS_LABEL[v] || v })),
    [baseRows]
  );
  const rows = useMemo(() => {
    let out = baseRows;
    if (stationFilter.length) out = out.filter((r) => stationFilter.includes(r.station_name));
    if (classFilter.length) out = out.filter((r) => classFilter.includes(r.bundle_class));
    return [...out].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return tnSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return tnSortDir === "asc" ? av - bv : bv - av;
    });
  }, [baseRows, stationFilter, classFilter, tnSortKey, tnSortDir]);

  const toggle = (key, curKey, curDir, setKey, setDir) => {
    if (key === curKey) setDir(curDir === "asc" ? "desc" : "asc");
    else {
      setKey(key);
      setDir("desc");
    }
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const stationColumns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...STATION_COUNT_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      render: (r) => r[c.key].toLocaleString(),
      className: (r) => (r[c.key] > 0 && c.key !== "bundles" ? "font-semibold text-status-critical" : "text-slate-700"),
      // Click a count to narrow the bundle list below to that station.
      onClick: (r) => setStationFilter([r.station_name]),
    })),
  ];

  const bundleColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    { key: "bundle_tracking_number", label: "Bundle", className: () => "font-mono text-xs", render: (r) => r.bundle_tracking_number },
    { key: "shipper_name", label: "Shipper", align: "left", className: () => "max-w-[220px] truncate text-xs", render: (r) => r.shipper_name || "—" },
    {
      key: "pieces_seen",
      label: "Pieces (here / total)",
      render: (r) => `${r.pieces_seen} / ${r.piece_count}`,
      className: (r) => (r.missing_count > 0 ? "font-semibold text-status-critical" : "text-slate-700"),
    },
    {
      key: "missing_count",
      label: "Missing",
      render: (r) => (r.missing_count > 0 ? `${r.missing_count}${r.missing_pieces ? ` (${r.missing_pieces})` : ""}` : "—"),
      className: (r) => (r.missing_count > 0 ? "text-status-critical" : "text-slate-400"),
    },
    { key: "on_hold_pieces", label: "On Hold", render: (r) => r.on_hold_pieces || "—", className: (r) => (r.on_hold_pieces > 0 ? "font-semibold text-status-warning" : "text-slate-400") },
    { key: "statuses", label: "Piece statuses", align: "left", sortable: false, className: () => "text-xs text-slate-600", render: (r) => r.statuses },
    { key: "aging_days", label: "Aging (days)", render: (r) => r.aging_days },
    { key: "days_group", label: "Days group", align: "left", className: () => "text-xs text-slate-500", render: (r) => r.days_group || "—" },
    {
      key: "bundle_class",
      label: "Flag",
      render: (r) => (
        <span className={`rounded px-1.5 py-0.5 font-display text-[10px] font-semibold ${CLASS_STYLE[r.bundle_class]}`}>
          {CLASS_LABEL[r.bundle_class]}
        </span>
      ),
    },
    { key: "hold_details", label: "Hold details", align: "left", sortable: false, className: () => "max-w-[240px] whitespace-normal text-xs text-slate-500", render: (r) => r.hold_details || "—" },
  ];

  const csvHeaders = [
    "Station", "Bundle", "Shipper", "Pieces here", "Pieces total", "Missing", "Missing pieces", "On hold pieces",
    "Piece statuses", "Aging (days)", "Days group", "Flag", "Hold details", "Piece tracking numbers",
  ];
  const csvRow = (r) => [
    r.station_name, r.bundle_tracking_number, r.shipper_name ?? "", r.pieces_seen, r.piece_count, r.missing_count,
    r.missing_pieces ?? "", r.on_hold_pieces, r.statuses, r.aging_days, r.days_group ?? "", CLASS_LABEL[r.bundle_class],
    r.hold_details ?? "", r.tracking_numbers.join(" "),
  ];

  return (
    <div className="space-y-3">
      {attention && (
        <DataTable
          title="On Hold / MPS Incomplete — by station"
          titleExtra={
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-restock-on-hold-stations-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Region", "Zone", "Station", ...STATION_COUNT_COLUMNS.map((c) => c.label)],
                  filteredStations.map((r) => [r.region, r.zone, r.station_name, ...STATION_COUNT_COLUMNS.map((c) => r[c.key])])
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
          onSort={(k) => toggle(k, sortKey, sortDir, setSortKey, setSortDir)}
          emptyMessage="Nothing on hold or incomplete — all clear."
          footer="MPS Incomplete: fewer pieces present than the bundle's piece_count. Complete but On Hold: every piece is here yet at least one is On Hold, so the hold can be released. Click a count to filter the list below to that station."
        />
      )}

      <DataTable
        title={attention ? "Bundles needing attention" : "Restock bundles — tracking numbers"}
        titleExtra={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48">
              <MultiSelect options={stationOptions} value={stationFilter} onChange={setStationFilter} placeholder="Search station (this table only)…" />
            </div>
            {attention && (
              <div className="w-48">
                <MultiSelect options={classOptions} value={classFilter} onChange={setClassFilter} placeholder="All flags" />
              </div>
            )}
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-restock-${attention ? "on-hold" : "bundles"}-${new Date().toISOString().slice(0, 10)}.csv`,
                  csvHeaders,
                  rows.map(csvRow)
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        }
        maxHeight="60vh"
        columns={bundleColumns}
        rows={rows}
        rowKey={(r) => r.bundle_tracking_number}
        sortKey={tnSortKey}
        sortDir={tnSortDir}
        onSort={(k) => toggle(k, tnSortKey, tnSortDir, setTnSortKey, setTnSortDir)}
        emptyMessage="No bundles match."
        footer={
          <>
            {rows.length.toLocaleString()} bundle{rows.length === 1 ? "" : "s"} · grouped by the hub most of the bundle's
            pieces last scanned at · the CSV lists each bundle's piece tracking numbers
            {data.bundles_truncated && (
              <span className="ml-1 font-medium text-status-critical">
                · showing the first {data.bundles.length.toLocaleString()} of {data.bundles_total.toLocaleString()}
              </span>
            )}
          </>
        }
      />
    </div>
  );
}
