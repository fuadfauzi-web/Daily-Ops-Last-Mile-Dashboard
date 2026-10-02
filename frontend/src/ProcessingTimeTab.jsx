import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import DataTable from "./components/DataTable";
import Skeleton from "./components/Skeleton";
import SweepTimelineChart, { DEFAULT_SERIES } from "./components/SweepTimelineChart";

// Processing Time (2026-10-02 feedback): the hour-of-day pattern of each stage a parcel goes through at the
// station, for the past 7 days -- when shipments arrive, when they are scanned in, first attempted, delivered, and
// when line-haul trips land. Built from the same Shipment Tracker / LH Timing feeds as Shipment Details' chart
// (which only shows today); the backend keeps one snapshot per station per day (backend/main.py's
// _capture_processing_time). Weekly trend + 1 month history are for the Management View later.

const SERIES = [
  { key: "arrival", label: "Shipment Arrival", text: "text-purple-600", stroke: "stroke-purple-500", fill: "fill-purple-500", dot: "bg-purple-500" },
  ...DEFAULT_SERIES,
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(iso, today) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${wd} ${d} ${MONTHS[m - 1]}${iso === today ? " (today)" : ""}`;
}

function formatHour(h) {
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 === 0 ? 12 : h % 12}${ampm}`;
}

function peakOf(arr) {
  const max = Math.max(...arr);
  return max > 0 ? arr.indexOf(max) : null;
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

export default function ProcessingTimeTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("all"); // "all" = the whole 7 days added up, or one day's ISO date
  const [sortKey, setSortKey] = useState("arrival_total");
  const [sortDir, setSortDir] = useState("desc");

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  useEffect(() => {
    api
      .processingTime()
      .then(setData)
      .catch((e) => setError(e.message));
  }, [refreshTick]);

  // One entry per station for the chosen period: the chosen day's timelines, or every day's added up.
  const stationRows = useMemo(() => {
    if (!data) return [];
    const by = new Map();
    for (const r of data.rows) {
      if (period !== "all" && r.day !== period) continue;
      let g = by.get(r.station_code);
      if (!g) {
        g = { station_code: r.station_code, station_name: r.station_name, zone: r.zone, region: r.region };
        for (const s of SERIES) g[s.key] = Array(24).fill(0);
        by.set(r.station_code, g);
      }
      for (const s of SERIES) for (let h = 0; h < 24; h++) g[s.key][h] += r[s.key][h] || 0;
    }
    return [...by.values()];
  }, [data, period]);

  const filtered = useMemo(() => {
    let rows = stationRows;
    if (excludeEastMalaysia) rows = rows.filter((r) => r.region !== "East Malaysia");
    if (regionFilter !== "all") rows = rows.filter((r) => r.region === regionFilter);
    if (zoneFilter !== "all") rows = rows.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.station_name.toLowerCase().includes(q));
    }
    return rows;
  }, [stationRows, regionFilter, zoneFilter, search, excludeEastMalaysia]);

  const tableRows = useMemo(() => {
    const rows = filtered.map((r) => ({
      ...r,
      arrival_total: sum(r.arrival),
      sweep_total: sum(r.sweep),
      attempt_total: sum(r.attempt),
      success_total: sum(r.success),
      arrival_peak: peakOf(r.arrival),
      sweep_peak: peakOf(r.sweep),
      attempt_peak: peakOf(r.attempt),
      success_peak: peakOf(r.success),
    }));
    return rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir]);

  const masterCodes = useMemo(() => new Set(filtered.map((r) => r.station_code)), [filtered]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(["station_name", "region", "zone"].includes(key) ? "asc" : "desc");
    }
  };

  const columns = useMemo(() => {
    const cols = [];
    if (!hideRegionCol) cols.push({ key: "region", label: "Region", className: () => "text-slate-600" });
    if (!hideZoneCol) cols.push({ key: "zone", label: "Zone", className: () => "text-slate-600" });
    cols.push({ key: "station_name", label: "Station", sticky: true, align: "left", render: (r) => <b>{r.station_name}</b> });
    for (const [key, label] of [["arrival", "Arrival"], ["sweep", "Scan-in"], ["attempt", "1st attempt"], ["success", "Success"]]) {
      cols.push({ key: `${key}_total`, label, render: (r) => r[`${key}_total`].toLocaleString() });
      cols.push({
        key: `${key}_peak`,
        label: `${label} peak`,
        render: (r) => (r[`${key}_peak`] == null ? "—" : formatHour(r[`${key}_peak`])),
        className: (r) => (r[`${key}_peak`] == null ? "text-slate-300" : "text-slate-700"),
      });
    }
    return cols;
  }, [hideRegionCol, hideZoneCol]);

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.days.length) {
    return (
      <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
        No Processing Time history yet. It starts building from the first refresh after this tab went live -- one snapshot per day, so
        the past 7 days fill in over the coming week.
      </div>
    );
  }

  const periods = [{ key: "all", label: `Last ${data.days.length} day${data.days.length === 1 ? "" : "s"}` }, ...[...data.days].reverse().map((d) => ({ key: d, label: dayLabel(d, data.today) }))];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-lg border border-slate-300 bg-white">
          {periods.map((p, i) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`min-h-[44px] whitespace-nowrap px-3 py-1.5 font-display text-sm font-medium ${i > 0 ? "border-l border-slate-300" : ""} ${
                period === p.key ? "bg-slate-200 text-ink" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            exportCsv(
              `processing-time-${period === "all" ? "7-days" : period}.csv`,
              ["Region", "Zone", "Station", "Hour", ...SERIES.map((s) => s.label)],
              filtered.flatMap((r) => Array.from({ length: 24 }, (_, h) => [r.region, r.zone, r.station_name, formatHour(h), ...SERIES.map((s) => r[s.key][h])]))
            )
          }
          disabled={!filtered.length}
          className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="mb-2 font-display text-sm font-medium text-slate-700">
          Processing Time — hour of day{" "}
          <span className="font-normal text-slate-400">
            · {period === "all" ? `the past ${data.days.length} day${data.days.length === 1 ? "" : "s"} added up` : dayLabel(period, data.today)}
            {period === data.today ? " -- still moving until the last refresh of the day" : ""}
          </span>
        </div>
        <SweepTimelineChart
          allStations={stationRows}
          timelines={stationRows}
          masterCodes={masterCodes}
          excludeEastMalaysia={excludeEastMalaysia}
          series={SERIES}
        />
      </div>

      <DataTable
        title={
          <>
            By station <span className="font-normal text-slate-400">— totals and the busiest hour of each stage, click a header to sort</span>
          </>
        }
        maxHeight="60vh"
        columns={columns}
        rows={tableRows}
        rowKey={(r) => r.station_code}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        emptyMessage="No stations match."
        footer={`${tableRows.length} stations shown`}
      />
      <p className="text-xs text-slate-400">
        <b>Arrival</b>: shipment completed at the station. <b>Scan-in</b>: 1st sweep at the station. <b>1st attempt</b> / <b>Success</b>: first delivery
        attempt / successful delivery. LH arrival is on the chart's legend too. Same feeds as Shipment Details, snapshotted once a day (the last refresh of
        the day is the day's number). Latlong parcels are not left out here.
      </p>
    </div>
  );
}
