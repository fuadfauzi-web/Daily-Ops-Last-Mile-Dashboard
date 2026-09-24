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

// One column per flag (2026-09-25): each opens the bundle list filtered to that station + flag.
const STATION_COUNT_COLUMNS = [
  { key: "bundles", label: "Bundles" },
  { key: "on_hold_bundles", label: "On Hold Bundles", flag: "on_hold" },
  { key: "mps_incomplete", label: "MPS Incomplete", flag: "mps_incomplete" },
  { key: "complete_on_hold", label: "Complete but On Hold", flag: "complete_on_hold" },
  { key: "single_on_hold", label: "On Hold (single piece)", flag: "single_on_hold" },
  { key: "missing_pieces_total", label: "Missing Pieces" },
];

// `preset` lets a parent (the Restock NXD station table) narrow this list: { station, classes, nonce }.
// Sort helper for every column: empty values always sort last, whichever direction.
function compareValues(av, bv, dir) {
  const aEmpty = av == null || av === "";
  const bEmpty = bv == null || bv === "";
  if (aEmpty || bEmpty) return aEmpty && bEmpty ? 0 : aEmpty ? 1 : -1;
  const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
  return dir === "asc" ? cmp : -cmp;
}

// Long text kept to one short line (full text on hover) so the table stays compact.
function Clip({ text, width }) {
  if (!text) return <span className="text-slate-300">—</span>;
  return (
    <div className={`${width} truncate`} title={text}>
      {text}
    </div>
  );
}

export default function RestockBundlesView({ view, regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick, preset }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("on_hold_bundles");
  const [sortDir, setSortDir] = useState("desc");
  const [tnSortKey, setTnSortKey] = useState("aging_days");
  const [tnSortDir, setTnSortDir] = useState("desc");
  const [stationFilter, setStationFilter] = useState([]);
  const [classFilter, setClassFilter] = useState([]);

  useEffect(() => {
    if (!preset) return;
    setStationFilter(preset.station ? [preset.station] : []);
    setClassFilter(preset.classes || []);
  }, [preset?.nonce]);

  const attention = view === "attention";
  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  // Blink fix (2026-09-25): only a real change of what's being shown (a filter / sub-view)
  // resets to the loading skeleton. The 60-second auto-refresh tick just re-fetches in
  // place -- resetting on every tick collapsed the page for a moment and snapped the
  // scroll position back to the top.
  useEffect(() => {
    setData(null);
  }, [view]);
  useEffect(() => {
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
  // "on_hold" is a synthetic flag: any bundle with at least one piece on hold, whatever its other flag.
  const classOptions = useMemo(
    () => [
      { value: "on_hold", label: "Any piece on hold" },
      ...Array.from(new Set(baseRows.map((r) => r.bundle_class))).map((v) => ({ value: v, label: CLASS_LABEL[v] || v })),
    ],
    [baseRows]
  );
  const rows = useMemo(() => {
    let out = baseRows;
    if (stationFilter.length) out = out.filter((r) => stationFilter.includes(r.station_name));
    if (classFilter.length) out = out.filter((r) => classFilter.includes(r.bundle_class) || (classFilter.includes("on_hold") && r.on_hold_pieces > 0));
    return [...out].sort((a, b) => compareValues(a[tnSortKey], b[tnSortKey], tnSortDir));
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
      // Click a count to narrow the bundle list below to that station (and flag).
      onClick: (r) => {
        setStationFilter([r.station_name]);
        setClassFilter(c.flag ? [c.flag] : []);
      },
    })),
  ];

  const bundleColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    { key: "bundle_tracking_number", label: "Bundle", className: () => "font-mono text-xs", render: (r) => r.bundle_tracking_number },
    { key: "shipper_name", label: "Shipper", align: "left", className: () => "text-xs", render: (r) => <Clip text={r.shipper_name} width="max-w-[150px]" /> },
    {
      key: "pieces_seen",
      label: "Pieces (here / total)",
      render: (r) => `${r.pieces_seen} / ${r.piece_count}`,
      className: (r) => (r.missing_count > 0 ? "font-semibold text-status-critical" : "text-slate-700"),
    },
    {
      key: "missing_count",
      label: "Missing",
      render: (r) => (r.missing_count > 0 ? <Clip text={`${r.missing_count}${r.missing_pieces ? ` (${r.missing_pieces})` : ""}`} width="max-w-[90px]" /> : "—"),
      className: (r) => (r.missing_count > 0 ? "text-xs text-status-critical" : "text-slate-400"),
    },
    { key: "on_hold_pieces", label: "On Hold", render: (r) => r.on_hold_pieces || "—", className: (r) => (r.on_hold_pieces > 0 ? "font-semibold text-status-warning" : "text-slate-400") },
    { key: "attempts", label: "Attempt", render: (r) => r.attempts ?? "—" },
    { key: "statuses", label: "Piece statuses", align: "left", className: () => "text-xs text-slate-600", render: (r) => <Clip text={r.statuses} width="max-w-[130px]" /> },
    { key: "aging_days", label: "Aging (days)", render: (r) => r.aging_days },
    { key: "days_group", label: "Days group", align: "left", className: () => "text-xs text-slate-500", render: (r) => <Clip text={r.days_group} width="max-w-[110px]" /> },
    {
      key: "bundle_class",
      label: "Flag",
      render: (r) => (
        <span className={`rounded px-1.5 py-0.5 font-display text-[10px] font-semibold ${CLASS_STYLE[r.bundle_class]}`}>
          {CLASS_LABEL[r.bundle_class]}
        </span>
      ),
    },
    { key: "hold_details", label: "Hold details", align: "left", className: () => "text-xs text-slate-500", render: (r) => <Clip text={r.hold_details} width="max-w-[140px]" /> },
  ];

  const csvHeaders = [
    "Station", "Bundle", "Shipper", "Pieces here", "Pieces total", "Missing", "Missing pieces", "On hold pieces", "Attempt",
    "Piece statuses", "Aging (days)", "Days group", "Flag", "Hold details", "Piece tracking numbers",
  ];
  const csvRow = (r) => [
    r.station_name, r.bundle_tracking_number, r.shipper_name ?? "", r.pieces_seen, r.piece_count, r.missing_count,
    r.missing_pieces ?? "", r.on_hold_pieces, r.attempts ?? "", r.statuses, r.aging_days, r.days_group ?? "", CLASS_LABEL[r.bundle_class],
    r.hold_details ?? "", r.tracking_numbers.join(" "),
  ];

  return (
    <div className="space-y-3">
      {attention && (
        <DataTable
          title="Restock On Hold Details — by station"
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
        title={attention ? "Restock On Hold Details — bundles" : "Restock bundles — tracking numbers"}
        titleExtra={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48">
              <MultiSelect options={stationOptions} value={stationFilter} onChange={setStationFilter} placeholder="Search station (this table only)…" />
            </div>
            <div className="w-48">
              <MultiSelect options={classOptions} value={classFilter} onChange={setClassFilter} placeholder="All flags" />
            </div>
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
