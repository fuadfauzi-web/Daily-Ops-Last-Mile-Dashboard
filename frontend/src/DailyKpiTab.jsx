import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { kpiTarget, useKpiTargets } from "./lib/kpiTargets";
import DataTable from "./components/DataTable";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";

// Daily KPI (2026-10-02 feedback): today's FIFO D0 / Completion D0 / Prior, how many
// parcels a station still needs to attempt or deliver to hit its target. Built from
// backend/aggregate.py's build_daily_kpi() -- raw counts only; "Current %" / target /
// "Left to go" are all computed here so an admin's edited target (Superadmin -> KPI Targets)
// takes effect immediately, same pattern as KpiDashboard's Hybrid page.
// FIFO D0: met once the parcel got ANY delivery attempt (success or fail) the same day.
// Completion D0: met only on a SUCCESSFUL delivery the same day, out of all fresh parcels.
// Prior: met only on a SUCCESSFUL delivery the same day, out of PRIOR-tagged parcels only.
// Latlong parcels are already excluded server-side (same rule as Shipment Details' Latlong).

// Column order: FIFO D0, Prior, Completion D0 (2026-10-02 feedback).
const KPI_BLOCKS = [
  { key: "fifo", totalKey: "fifo_total", metKey: "fifo_met", aashKey: "fifo_aash", ovfdKey: "fifo_ovfd", label: "FIFO D0", leftWord: "attempt" },
  { key: "prior", totalKey: "prior_total", metKey: "prior_met", aashKey: "prior_aash", ovfdKey: "prior_ovfd", label: "Prior", leftWord: "deliver" },
  { key: "d0", totalKey: "completion_total", metKey: "completion_met", aashKey: "completion_aash", ovfdKey: "completion_ovfd", label: "Completion D0", leftWord: "deliver" },
];

const VIEWS = [
  { key: "station", label: "Station" },
  { key: "zone", label: "Zone" },
  { key: "region", label: "Region" },
];

function withKpiFields(row) {
  const out = { ...row };
  KPI_BLOCKS.forEach((b) => {
    const total = row[b.totalKey] || 0;
    const met = row[b.metKey] || 0;
    const target = kpiTarget(b.key, row.region);
    const pct = total ? (met / total) * 100 : null;
    const targetCount = target != null ? Math.ceil((target / 100) * total) : null;
    const left = targetCount != null ? Math.max(0, targetCount - met) : null;
    out[`${b.key}_pct`] = pct;
    out[`${b.key}_target`] = target;
    out[`${b.key}_left`] = left;
  });
  return out;
}

function pctClass(pct, target) {
  if (pct == null || target == null) return "text-slate-400";
  return pct + 1e-9 >= target ? "font-semibold text-status-good" : "font-bold text-status-critical";
}

function Pct({ value, target }) {
  if (value == null) return <span className="text-slate-300">—</span>;
  return (
    <span className={pctClass(value, target)}>
      {value.toFixed(1)}%{target != null && <span className="ml-1 text-[10px] font-normal text-slate-400">/{target}%</span>}
    </span>
  );
}

function notYetText(row, b) {
  const aash = row[b.aashKey] || 0;
  const ovfd = row[b.ovfdKey] || 0;
  if (!aash && !ovfd) return <span className="text-slate-300">—</span>;
  return (
    <span className="text-slate-600">
      {aash > 0 && `${aash} AASH`}
      {aash > 0 && ovfd > 0 && " · "}
      {ovfd > 0 && `${ovfd} OVFD`}
    </span>
  );
}

export default function DailyKpiTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const kpiTargetsData = useKpiTargets(); // re-render once per-region targets arrive
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("station");
  const [sortKey, setSortKey] = useState("fifo_left");
  const [sortDir, setSortDir] = useState("desc");

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  useEffect(() => {
    api
      .dailyKpi()
      .then(setData)
      .catch((e) => setError(e.message));
  }, [refreshTick]);

  const sourceRows = useMemo(() => {
    if (!data) return [];
    if (view === "station") return data.stations.map((r) => ({ ...r, name: r.station_name }));
    if (view === "zone") return data.zones.map((r) => ({ ...r, name: r.key, zone: r.key }));
    return data.regions.map((r) => ({ ...r, name: r.key, region: r.key }));
  }, [data, view]);

  // kpiTargetsData isn't read directly -- withKpiFields reads the shared kpiTarget()
  // singleton -- but it must be a dependency here, or targets that arrive AFTER the
  // first render (the common case: a separate fetch) never retrigger this memo, and
  // every % / Left column is stuck showing "--" forever.
  const enrichedRows = useMemo(() => sourceRows.map(withKpiFields), [sourceRows, kpiTargetsData]);

  const filteredRows = useMemo(() => {
    let rows = enrichedRows;
    if (excludeEastMalaysia) rows = rows.filter((r) => r.region !== "East Malaysia");
    if (view !== "region" && regionFilter !== "all") rows = rows.filter((r) => r.region === regionFilter);
    if (view === "station" && zoneFilter !== "all") rows = rows.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [enrichedRows, view, regionFilter, zoneFilter, search, sortKey, sortDir, excludeEastMalaysia]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(["station_name", "name", "region", "zone"].includes(key) ? "asc" : "desc");
    }
  };

  const columns = useMemo(() => {
    const cols = [];
    if (view === "station") {
      if (!hideRegionCol) cols.push({ key: "region", label: "Region", className: () => "text-slate-600" });
      if (!hideZoneCol) cols.push({ key: "zone", label: "Zone", className: () => "text-slate-600" });
      cols.push({ key: "name", label: "Station", sticky: true, align: "left", render: (r) => <b>{r.name}</b> });
    } else {
      if (view === "zone" && !hideRegionCol) cols.push({ key: "region", label: "Region", className: () => "text-slate-600" });
      cols.push({ key: "name", label: view === "zone" ? "Zone" : "Region", sticky: true, align: "left", render: (r) => <b>{r.name}</b> });
      cols.push({ key: "station_count", label: "Stations" });
    }
    cols.push({ key: "fifo_total", label: "Fresh" });
    KPI_BLOCKS.forEach((b) => {
      cols.push({ key: `${b.key}_pct`, label: `${b.label} %`, render: (r) => <Pct value={r[`${b.key}_pct`]} target={r[`${b.key}_target`]} /> });
      cols.push({
        key: `${b.key}_left`,
        label: `${b.label} Left to ${b.leftWord}`,
        render: (r) => (r[`${b.key}_left`] == null ? "—" : r[`${b.key}_left`].toLocaleString()),
        className: (r) => (r[`${b.key}_left`] > 0 ? "font-semibold text-ink" : "text-slate-400"),
      });
      cols.push({ key: `${b.key}_notyet`, label: "Not Yet", sortable: false, render: (r) => notYetText(r, b) });
    });
    return cols;
  }, [view, hideRegionCol, hideZoneCol]);

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;

  return (
    <div className="space-y-3">
      <div role="alert" className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <div className="font-display font-bold uppercase tracking-wide">Numbers here are not 100% accurate yet</div>
        <p className="mt-1">
          The start-clock logic and targets are still being validated against the official KPI result -- treat this as a working estimate to
          guide today's action, not the official number. It's here because an imperfect picture of today beats no picture at all and not
          knowing what to push on.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
        <button
          onClick={() =>
            exportCsv(
              `daily-kpi-${view}-${new Date().toISOString().slice(0, 10)}.csv`,
              [
                view === "station" ? "Station" : view === "zone" ? "Zone" : "Region",
                "Region",
                "Fresh",
                "FIFO D0 Total",
                "FIFO D0 Met",
                "FIFO D0 %",
                "FIFO D0 Left",
                "Prior Total",
                "Prior Met",
                "Prior %",
                "Prior Left",
                "Completion D0 Total",
                "Completion D0 Met",
                "Completion D0 %",
                "Completion D0 Left",
              ],
              filteredRows.map((r) => [
                r.name,
                r.region,
                r.fifo_total,
                r.fifo_total,
                r.fifo_met,
                r.fifo_pct == null ? "" : r.fifo_pct.toFixed(1),
                r.fifo_left ?? "",
                r.prior_total,
                r.prior_met,
                r.prior_pct == null ? "" : r.prior_pct.toFixed(1),
                r.prior_left ?? "",
                r.completion_total,
                r.completion_met,
                r.d0_pct == null ? "" : r.d0_pct.toFixed(1),
                r.d0_left ?? "",
              ])
            )
          }
          disabled={!filteredRows.length}
          className="h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <DataTable
        title={
          <>
            Daily KPI{" "}
            <span className="font-normal text-slate-400">— today only, click a column header to sort. "Left to go" uses each region's own target (Superadmin → KPI Targets).</span>
          </>
        }
        maxHeight="75vh"
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.station_code || r.name}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        emptyMessage="No stations match."
        footer={`${filteredRows.length} ${view === "station" ? "stations" : view === "zone" ? "zones" : "regions"} shown`}
      />
      <p className="text-xs text-slate-400">
        <b>FIFO D0</b>: met once the parcel got any delivery attempt (success or fail) the same day it arrived. <b>Prior</b>: met only on a
        successful delivery the same day, out of PRIOR-tagged parcels only. <b>Completion D0</b>: met only on a successful delivery the same
        day, out of every fresh parcel. "Not Yet" shows how many of the remaining parcels are still sitting Arrived at Sorting Hub (AASH) or On
        Vehicle for Delivery (OVFD). Latlong parcels are excluded, same rule as Shipment Details' own Latlong metric. Numbers reset at midnight.
      </p>
    </div>
  );
}
