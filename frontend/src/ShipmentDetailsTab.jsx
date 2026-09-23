import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import TnModal from "./components/TnModal";
import DetailPanel from "./components/DetailPanel";
import HeaderNote from "./components/HeaderNote";
import { SHIPMENT_NOTES } from "./lib/shipmentNotes";
import Skeleton from "./components/Skeleton";
import SweepTimelineChart from "./components/SweepTimelineChart";

function withNote(label, key) {
  return SHIPMENT_NOTES[key] ? (
    <>
      {label}
      <HeaderNote>{SHIPMENT_NOTES[key]}</HeaderNote>
    </>
  ) : (
    label
  );
}

const COLUMNS = [
  { key: "total_fresh", label: "Total Fresh" },
  { key: "total_shipment", label: "Total Shipment" },
  { key: "fresh_unscan", label: "Fresh Unscan", clickable: true },
  { key: "latlong", label: "Latlong", clickable: true },
  { key: "fresh_attempt_pct", label: "Fresh Attempt %", percent: true },
];

// Process duration: shipment_completion_datetime (column G) -> 1st_dest_hub_
// sweep_after_shipment_completion_datetime (column I). Within 1st hour, 2nd
// hour, 3rd hour, or over 3 hours (2026-09-24 feedback).
const PROCESS_BUCKET_COLUMNS = [
  { key: "process_within_1h", label: "Within 1h" },
  { key: "process_within_2h", label: "1-2h" },
  { key: "process_within_3h", label: "2-3h" },
  { key: "process_over_3h", label: "3h+" },
];

// "after 10am pre-warning, after 11am warning, after 12pm red flag"
function tripBadgeClass(isoTime) {
  const hour = new Date(isoTime.includes("T") ? isoTime : isoTime.replace(" ", "T")).getHours();
  if (hour >= 12) return "bg-status-critical/10 text-status-critical";
  if (hour >= 11) return "bg-status-warning/10 text-status-warning";
  if (hour >= 10) return "bg-status-neutral/10 text-status-neutral";
  return "bg-status-good/10 text-status-good";
}

function tripLabel(isoTime) {
  const d = new Date(isoTime.includes("T") ? isoTime : isoTime.replace(" ", "T"));
  return d.toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", hour12: true });
}

// process_time_minutes is the average minute-of-day (0-1439) the day's sweeps
// finished, today only -- render it the same way a clock would.
function formatProcessTime(minutes) {
  if (minutes == null) return <span className="text-slate-300">—</span>;
  const total = Math.round(minutes);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ampm = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function TripBadge({ trip }) {
  if (!trip) return <span className="text-slate-300">—</span>;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${tripBadgeClass(trip.time)}`}>
      {tripLabel(trip.time)} · {trip.parcels.toLocaleString()}
    </span>
  );
}

export default function ShipmentDetailsTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("fresh_unscan");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  useEffect(() => {
    api
      .shipmentDetails()
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
    ...COLUMNS.map((c) => {
      const format = (r) => {
        const value = r[c.key];
        return c.percent ? `${value.toFixed(1)}%` : value.toLocaleString();
      };
      if (!c.clickable) {
        return {
          key: c.key,
          label: withNote(c.label, c.key),
          className: (r) =>
            c.key === "fresh_attempt_pct" ? (r[c.key] >= 96 ? "text-status-good font-semibold" : "text-status-critical font-semibold") : "",
          render: (r) => (
            <>
              {format(r)}
              {c.key === "fresh_attempt_pct" && <span className="ml-1 text-[11px] text-slate-400">/96%</span>}
            </>
          ),
        };
      }
      return {
        key: c.key,
        label: withNote(c.label, c.key),
        className: (r) => (r[c.key] > 0 ? "font-semibold text-status-critical" : "text-slate-700"),
        render: format,
        onClick: (r) => setModal({ stationCode: r.station_code, stationName: r.station_name, metricKey: c.key, metricLabel: c.label }),
      };
    }),
    {
      key: "lh_timing",
      label: (
        <>
          LH Timing (1st / 2nd trip)
          <div className="text-[10px] font-normal normal-case text-slate-300">arrival time · parcels on that trip</div>
        </>
      ),
      sortable: false,
      align: "left",
      render: (r) => (
        <div className="flex gap-1.5">
          <TripBadge trip={r.lh_trips[0]} />
          <TripBadge trip={r.lh_trips[1]} />
        </div>
      ),
    },
    {
      key: "process_time_minutes",
      label: (
        <>
          Process Time
          <HeaderNote>{SHIPMENT_NOTES.process_time_minutes}</HeaderNote>
          <div className="text-[10px] font-normal normal-case text-slate-300">beta — not yet confirmed accurate</div>
        </>
      ),
      className: () => "text-slate-700",
      render: (r) => formatProcessTime(r.process_time_minutes),
    },
    ...PROCESS_BUCKET_COLUMNS.map((c) => ({
      key: c.key,
      label: withNote(c.label, c.key),
      render: (r) => r[c.key].toLocaleString(),
      className: () => "text-slate-700",
    })),
  ];

  return (
    <div className="space-y-3">
      <TnModal state={modal} onClose={() => setModal(null)} fetcher={api.shipmentDrilldown} />
      <DetailPanel
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={detailRow?.station_name}
        subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
        rows={detailRow ? columnsToDetailRows(columns, detailRow) : []}
      />
      <DataTable
        title="Shipment Details"
        titleExtra={
          <button
            onClick={() =>
              exportCsv(
                `daily-ops-shipment-details-${new Date().toISOString().slice(0, 10)}.csv`,
                [
                  "Region", "Zone", "Station", ...COLUMNS.map((c) => c.label), "Process Time (min of day)",
                  ...PROCESS_BUCKET_COLUMNS.map((c) => c.label),
                ],
                filteredStations.map((r) => [
                  r.region, r.zone, r.station_name, ...COLUMNS.map((c) => r[c.key]), r.process_time_minutes,
                  ...PROCESS_BUCKET_COLUMNS.map((c) => r[c.key]),
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
        footer={
          <>
            {filteredStations.length} rows · LH Timing shows each trip's arrival time followed by the parcel count on
            that trip (e.g. "10:32am · 45" = 45 parcels on that trip); colour bands green &lt;10am, blue 10–11am,
            amber 11am–12pm, red after 12pm.{" "}
            <span className="font-medium text-status-warning">
              Process Time is a beta figure, not yet confirmed accurate
            </span>{" "}
            — it's the average time-of-day all of today's fresh parcels were first scanned/swept in, not a per-parcel
            measurement. Within 1h/1-2h/2-3h/3h+ bucket how long each parcel took from arriving at the station to
            being scanned in.
          </>
        }
      />

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="mb-1 font-display text-sm font-medium text-slate-700">Sweep timing — nationwide</div>
        <div className="mb-3 text-xs text-slate-400">
          When parcels were actually scanned in today, by hour of day (not filtered by region/zone/station above).
        </div>
        <SweepTimelineChart timeline={data.sweep_timeline} />
      </div>
    </div>
  );
}
