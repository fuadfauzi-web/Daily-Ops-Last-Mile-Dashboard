import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import { useThresholds, resolveThreshold, classify, SEVERITY_MARK, SEVERITY_CLASS } from "./lib/thresholds";
import DataTable from "./components/DataTable";
import DetailPanel from "./components/DetailPanel";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";
import OldRouteTab from "./OldRouteTab";
import PendingYesterdayRouteTab from "./PendingYesterdayRouteTab";

const LEVELS = [
  { key: "region", label: "Region" },
  { key: "zone", label: "Zone" },
  { key: "station", label: "Station" },
  { key: "driver", label: "Driver" },
  { key: "oldroute", label: "Old Route" },
  { key: "pendingyesterday", label: "Pending in Yesterday Route" },
];

// Neither of these sub-tabs is affected by the driver-type filter (Old Route/
// Pending Yesterday Route have no driver concept at all).
const NO_DRIVER_TYPE_LEVELS = new Set(["oldroute", "pendingyesterday"]);

// Only applies to region/zone/station/driver -- Old Route has no driver concept.
const DRIVER_TYPES = [
  { key: "", label: "All" },
  { key: "hybrid", label: "Hybrid" },
  { key: "independent", label: "Independent" },
  { key: "other", label: "Other" },
];

// Station/Zone/Region-level columns that come AFTER Attendance and Total Routed
// (Attendance sits right after the name column; Hybrid/Independent sit at the
// very end, after Completion Rate).
const STATION_COLUMNS = [
  { key: "zero_attempt", label: "Total 0 Attempt" },
  { key: "current_ovfd", label: "Current OVFD" },
  { key: "current_success", label: "Current Success" },
  { key: "cod_pct", label: "COD %", percent: true },
  { key: "success_rate", label: "Success Rate", percent: true, rate: "success" },
  // Productivity = Total Success / Total Routed, same underlying number as
  // Success Rate but shown as a plain 2-decimal number, not a percentage --
  // kept as its own column (rather than just relabelling Success Rate) since
  // Admin -> SLA Targets scores "Productivity" separately, per driver type, at
  // the driver view (see the driver-level column below).
  { key: "productivity_pct", label: "Productivity", rate: "success", source: "success_rate" },
  { key: "completion_rate", label: "Completion Rate", percent: true, rate: "completion" },
  { key: "hybrid_total", label: "Hybrid", render: "hybrid" },
  { key: "independent_total", label: "Independent", render: "independent" },
];

const DRIVER_COLUMNS = [
  { key: "total_routed", label: "Total Routed" },
  { key: "current_success", label: "Current Success" },
  { key: "current_ovfd", label: "Current OVFD" },
  { key: "cod_pct", label: "COD %", percent: true },
  { key: "success_rate", label: "Success Rate", percent: true, rate: "success" },
  { key: "productivity_pct", label: "Productivity", rate: "productivity", source: "success_rate" },
  { key: "completion_rate", label: "Completion Rate", percent: true, rate: "completion" },
  { key: "tenure", label: "Tenure", render: "tenure" },
];

function successRateClass(rate) {
  if (rate < 70) return "text-status-critical font-semibold";
  if (rate < 85) return "text-status-warning font-medium";
  return "text-status-good font-semibold";
}

function completionRateClass(rate) {
  if (rate >= 100) return "text-status-good font-semibold";
  if (rate >= 80) return "text-status-good font-medium";
  if (rate >= 60) return "text-status-warning font-medium";
  if (rate >= 40) return "text-status-warning font-semibold";
  return "text-status-critical font-semibold";
}

function rateClass(col, value) {
  if (col.rate === "success") return successRateClass(value);
  if (col.rate === "completion") return completionRateClass(value);
  return "text-slate-700";
}

// Renders the special composite-format columns: Attendance shows "N (R Rescue)",
// Hybrid/Independent show their HD/HR or ID/IR sub-counts as "1HD/9HR".
function renderCell(col, r) {
  if (col.render === "attendance") {
    return r.attendance_rescue > 0 ? `${r.attendance} (${r.attendance_rescue} Rescue)` : `${r.attendance}`;
  }
  if (col.render === "hybrid") return `${r.attendance_hd}HD/${r.attendance_hr}HR`;
  if (col.render === "independent") return `${r.attendance_id}ID/${r.attendance_ir}IR`;
  if (col.render === "tenure") return r.tenure || "—";
  const value = r[col.source || col.key];
  if (col.key === "productivity_pct") return value.toFixed(2);
  return col.percent ? `${value.toFixed(1)}%` : value.toLocaleString();
}

export default function RoutedViewTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const { rows: thresholdRows } = useThresholds();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [level, setLevel] = useState("station");
  const [driverType, setDriverType] = useState("");
  const [sortKey, setSortKey] = useState("total_routed");
  const [sortDir, setSortDir] = useState("desc");
  // The master "Search station..." box (shared with every other tab) filters the
  // Driver table by current station instead of by name -- driver names don't
  // contain station names, so reusing it as a name filter always came back
  // empty. Driver name gets its own local search box below.
  const [driverSearch, setDriverSearch] = useState("");
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    api
      .routedView(driverType || undefined)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [driverType, refreshTick]);

  const rows = useMemo(() => {
    if (!data || NO_DRIVER_TYPE_LEVELS.has(level)) return [];
    let base;
    if (level === "region") base = data.regions.map((g) => ({ ...g, name: g.key }));
    else if (level === "zone") base = data.zones.map((g) => ({ ...g, name: g.key }));
    else if (level === "station") base = data.stations.map((s) => ({ ...s, name: s.station_name }));
    else base = data.drivers.map((d) => ({ ...d, name: d.driver_name }));

    if (level !== "driver") {
      base = base.map((r) => ({
        ...r,
        hybrid_total: (r.attendance_hd || 0) + (r.attendance_hr || 0),
        independent_total: (r.attendance_id || 0) + (r.attendance_ir || 0),
      }));
    }

    if (excludeEastMalaysia && level !== "region") base = base.filter((r) => r.region !== "East Malaysia");
    if (excludeEastMalaysia && level === "region") base = base.filter((r) => r.key !== "East Malaysia");

    if (level === "zone" || level === "station" || level === "driver") {
      if (regionFilter !== "all") base = base.filter((r) => r.region === regionFilter);
    }
    if (level === "station" || level === "driver") {
      if (zoneFilter !== "all") base = base.filter((r) => r.zone === zoneFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = level === "driver"
        ? base.filter((r) => r.station_name?.toLowerCase().includes(q))
        : base.filter((r) => r.name?.toLowerCase().includes(q));
    }
    if (level === "driver" && driverSearch.trim()) {
      const q = driverSearch.trim().toLowerCase();
      base = base.filter((r) => r.name?.toLowerCase().includes(q));
    }

    return [...base].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // == null (not undefined) matters since Tenure comes back null for any
      // driver not in the uploaded driver-details CSV -- comparing against
      // that with .localeCompare would crash the whole tab.
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === "boolean") return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, level, regionFilter, zoneFilter, search, driverSearch, sortKey, sortDir, excludeEastMalaysia]);

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

  const isDriverLevel = level === "driver";
  const isGroupLevel = level === "region" || level === "zone";
  const levelColumns = isDriverLevel ? DRIVER_COLUMNS : STATION_COLUMNS;
  const showRegionCol = (level === "zone" || level === "station") && !hideRegionCol;
  const showZoneCol = level === "station" && !hideZoneCol;
  const showDriverStationCol = isDriverLevel && me.scope_type !== "station";
  const identityLabel = level === "driver" ? "Driver" : LEVELS.find((l) => l.key === level).label;

  const columns = [
    ...(showRegionCol ? [{ key: "region", label: "Region", sortable: false, className: () => "text-slate-500" }] : []),
    ...(showZoneCol ? [{ key: "zone", label: "Zone", sortable: false, className: () => "text-slate-500" }] : []),
    { key: "name", label: identityLabel, sticky: true, align: "left" },
    ...(isGroupLevel ? [{ key: "station_count", label: "Stations", className: () => "text-slate-500" }] : []),
    ...(showDriverStationCol ? [{ key: "station_name", label: "Station", sortable: false, className: () => "text-slate-500" }] : []),
    ...(!isDriverLevel
      ? [{ key: "routed_pct", label: "Routed %", render: (r) => `${(r.routed_pct ?? 0).toFixed(2)}%`, className: () => "text-slate-700" }]
      : []),
    ...(!isDriverLevel ? [{ key: "attendance", label: "Attendance", render: (r) => renderCell({ render: "attendance" }, r) }] : []),
    { key: "total_routed", label: "Total Routed", render: (r) => r.total_routed.toLocaleString() },
    ...levelColumns.map((c) => {
      // Driver-level Productivity is admin-scored per driver type (HR/HD/ID/IR --
      // see Admin -> SLA Targets), unlike every other rate column here which is
      // just a fixed colour band -- so it needs the SLA threshold system instead
      // of rateClass().
      if (c.key === "productivity_pct" && isDriverLevel) {
        return {
          key: c.key,
          label: c.label,
          render: (r) => {
            const t = resolveThreshold(thresholdRows, "productivity_pct", r.driver_type || null);
            const sev = classify(t, r.success_rate);
            return `${SEVERITY_MARK[sev]}${r.success_rate.toFixed(2)}`;
          },
          className: (r) => {
            const t = resolveThreshold(thresholdRows, "productivity_pct", r.driver_type || null);
            return SEVERITY_CLASS[classify(t, r.success_rate)];
          },
        };
      }
      return {
        key: c.key,
        label: c.label,
        render: (r) => renderCell(c, r),
        className: (r) => (c.rate ? rateClass(c, r[c.source || c.key]) : "text-slate-700"),
      };
    }),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          options={LEVELS}
          value={level}
          onChange={(key) => {
            setLevel(key);
            setSortKey("total_routed");
            setSortDir("desc");
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          {isDriverLevel && (
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              placeholder="Search driver…"
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
            />
          )}
          {!NO_DRIVER_TYPE_LEVELS.has(level) && (
            // Deliberately a plain select, not a SegmentedControl like the Level
            // switcher next to it -- a filter that silently narrows every number
            // on the page shouldn't look like just another view-level tab a user
            // might click into by accident.
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              value={driverType}
              onChange={(e) => setDriverType(e.target.value)}
            >
              {DRIVER_TYPES.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.key ? `Driver type: ${d.label}` : "All driver types"}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {driverType && !NO_DRIVER_TYPE_LEVELS.has(level) && (
        <p className="text-xs text-slate-400">
          Showing {DRIVER_TYPES.find((d) => d.key === driverType)?.label.toLowerCase()} drivers only -- Old Route and
          Pending Yesterday Route are unaffected by this filter.
        </p>
      )}

      {level === "pendingyesterday" ? (
        <PendingYesterdayRouteTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        />
      ) : level === "oldroute" ? (
        <OldRouteTab
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        />
      ) : (
        <>
          <DetailPanel
            open={!!detailRow}
            onClose={() => setDetailRow(null)}
            title={detailRow?.name}
            subtitle={detailRow?.station_name ? `Station: ${detailRow.station_name}` : null}
            rows={detailRow ? columnsToDetailRows(columns, detailRow) : []}
          />
          <DataTable
            title={`Route Monitoring — by ${identityLabel.toLowerCase()}`}
            titleExtra={
              <button
                onClick={() =>
                  exportCsv(
                    `daily-ops-routed-view-${level}-${new Date().toISOString().slice(0, 10)}.csv`,
                    columns.map((c) => c.label),
                    rows.map((r) => columns.map((c) => (c.render ? c.render(r) : r[c.key])))
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Export CSV
              </button>
            }
            maxHeight="70vh"
            columns={columns}
            rows={rows}
            rowKey={(r, i) => r.station_code || r.driver_name || r.name || i}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(r) => setDetailRow(r)}
            emptyMessage="No rows match."
            footer={
              <>
                {rows.length} rows · Completion Rate = (Total Routed − Current OVFD) / Total Routed — 100% means nothing
                is left on the vehicle. Attendance shows rescue drivers in parentheses when present; Hybrid/Independent
                break down by HD/HR/ID/IR. Driver "Station" is where they're currently routing today (may differ from
                home station for a rescue driver). Driver tenure comes from the driver/rider details file uploaded in
                Settings → Documents — "—" means that driver isn't in the uploaded file.
              </>
            }
          />
        </>
      )}
    </div>
  );
}
