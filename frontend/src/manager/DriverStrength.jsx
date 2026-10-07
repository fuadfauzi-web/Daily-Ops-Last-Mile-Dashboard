import DataTable from "../components/DataTable";
import { exportCsv } from "../lib/csv";
import { PlanInput, int, pct, pct1, sumOrNull, useSortedRows } from "./shared";

// Driver Strength (the South Management sheet's tab of the same name): how many drivers / riders each station needs (typed in), how many it has by type (HD / HR hybrid, ID / IR independent),
// how many were really active in the last 2 / 4 weeks, and who resigned. Counts come from Metabase (drivers_enriched; a route with parcels delivered = active) and are pulled by the app.

const total = (r) => (r.hd == null ? null : r.hd + r.hr + r.id + r.ir);

function withDerived(r) {
  const t = total(r);
  const required = r.plan.drivers == null && r.plan.riders == null ? null : (r.plan.drivers || 0) + (r.plan.riders || 0);
  return {
    ...r,
    total: t,
    required,
    bike: r.hd == null ? null : r.hr + r.ir,
    car: r.hd == null ? null : r.hd + r.id,
    fill: required && t != null ? pct(t, required) : null,
    gap: required != null && t != null ? required - t : null, // positive = still to hire
    attendancePct: t && r.attendance_today != null ? pct(r.attendance_today, t) : null,
  };
}

function totalRow(rows) {
  const s = (f) => sumOrNull(rows, f);
  const drivers = s((r) => r.plan.drivers);
  const riders = s((r) => r.plan.riders);
  const required = drivers == null && riders == null ? null : (drivers || 0) + (riders || 0);
  const t = s((r) => r.total);
  const attToday = s((r) => r.attendance_today);
  return {
    isTotal: true, station_code: "__total", station_name: "Total in view", zone: "", region: "", plan: { drivers, riders },
    required, hd: s((r) => r.hd), hr: s((r) => r.hr), id: s((r) => r.id), ir: s((r) => r.ir), bike: s((r) => r.bike), car: s((r) => r.car), total: t,
    fill: required && t != null ? pct(t, required) : null, gap: required != null && t != null ? required - t : null,
    active_2w: s((r) => r.active_2w), active_4w: s((r) => r.active_4w), resigned_w1: s((r) => r.resigned_w1), resigned_w2: s((r) => r.resigned_w2), resigned_w4: s((r) => r.resigned_w4),
    attendance_today: attToday, attendancePct: t && attToday != null ? pct(attToday, t) : null,
  };
}

export default function DriverStrength({ data, rows, savePlan, canEdit }) {
  const list = rows.map(withDerived);
  const nameCell = (r) => (r.isTotal ? <span className="font-display font-bold uppercase tracking-wide text-ink">{r.station_name}</span> : r.station_name);
  const edit = (field, label) => (r) =>
    r.isTotal ? int(r.plan[field]) : canEdit ? <PlanInput value={r.plan[field]} label={`${label} ${r.station_name}`} onSave={(v) => savePlan(r.station_code, { [field]: v })} /> : int(r.plan[field]);
  const gapTone = (g) => (g == null ? "" : g > 0 ? "text-status-critical font-semibold" : "text-status-good font-semibold");
  const fillTone = (f) => (f == null ? "" : f < 80 ? "text-status-critical font-semibold" : f < 100 ? "text-status-warning font-semibold" : "text-status-good font-semibold");

  const columns = [
    { key: "station_name", label: "Station", sticky: true, val: (r) => r.station_name, render: nameCell },
    { key: "zone", label: "Zone", sortable: false, className: () => "text-slate-500", render: (r) => r.zone },
    { key: "reqDrivers", label: "Drivers", groupStart: true, val: (r) => r.plan.drivers, render: edit("drivers", "Drivers required") },
    { key: "reqRiders", label: "Riders", val: (r) => r.plan.riders, render: edit("riders", "Riders required") },
    { key: "required", label: "Total", val: (r) => r.required, render: (r) => int(r.required) },
    { key: "hd", label: "HD", groupStart: true, val: (r) => r.hd, render: (r) => int(r.hd) },
    { key: "hr", label: "HR", val: (r) => r.hr, render: (r) => int(r.hr) },
    { key: "id", label: "ID", val: (r) => r.id, render: (r) => int(r.id) },
    { key: "ir", label: "IR", val: (r) => r.ir, render: (r) => int(r.ir) },
    { key: "bike", label: "Bike", val: (r) => r.bike, render: (r) => int(r.bike) },
    { key: "car", label: "Car / van", val: (r) => r.car, render: (r) => int(r.car) },
    { key: "total", label: "Total", val: (r) => r.total, render: (r) => <span className="font-semibold">{int(r.total)}</span> },
    { key: "fill", label: "Fill", val: (r) => r.fill, render: (r) => <span className={fillTone(r.fill)}>{pct1(r.fill)}</span> },
    { key: "gap", label: "To hire", val: (r) => r.gap, render: (r) => <span className={gapTone(r.gap)}>{r.gap == null ? "—" : r.gap > 0 ? int(r.gap) : r.gap === 0 ? "0" : `+${int(-r.gap)}`}</span> },
    { key: "active2", label: "2 weeks", groupStart: true, val: (r) => r.active_2w, render: (r) => int(r.active_2w) },
    { key: "active4", label: "4 weeks", val: (r) => r.active_4w, render: (r) => int(r.active_4w) },
    { key: "res1", label: "Last week", groupStart: true, val: (r) => r.resigned_w1, render: (r) => int(r.resigned_w1) },
    { key: "res2", label: "Last 2 weeks", val: (r) => r.resigned_w2, render: (r) => int(r.resigned_w2) },
    { key: "res4", label: "Last month", val: (r) => r.resigned_w4, render: (r) => int(r.resigned_w4) },
    { key: "attToday", label: "Today", groupStart: true, val: (r) => r.attendance_today, render: (r) => int(r.attendance_today) },
    { key: "attPct", label: "% of strength", val: (r) => r.attendancePct, render: (r) => pct1(r.attendancePct) },
  ].map((c) => ({ align: c.key === "station_name" ? "left" : "center", className: () => "text-slate-700", ...c }));

  const { sorted, sortKey, sortDir, onSort } = useSortedRows(list, columns);
  const tableRows = list.length ? [totalRow(list), ...sorted] : [];
  const groupHeaders = [
    { key: "loc", label: "Location", span: 1 },
    { key: "req", label: "Required", span: 3 },
    { key: "have", label: "Strength now", span: 9 },
    { key: "act", label: "Active (route with parcels delivered)", span: 2 },
    { key: "res", label: "Resigned", span: 3 },
    { key: "att", label: "Attendance", span: 2 },
  ];

  const exportIt = () =>
    exportCsv(
      `manager-dashboard-driver-strength-${data.today}.csv`,
      ["Region", "Zone", "Station", "Drivers required", "Riders required", "Total required", "HD", "HR", "ID", "IR", "Bike", "Car / van", "Total", "Fill %", "To hire", "Active 2 weeks", "Active 4 weeks", "Resigned last week", "Resigned last 2 weeks", "Resigned last month", "Attendance today", "% of strength"],
      list.map((r) => [r.region, r.zone, r.station_name, r.plan.drivers, r.plan.riders, r.required, r.hd, r.hr, r.id, r.ir, r.bike, r.car, r.total, r.fill == null ? "" : Math.round(r.fill * 10) / 10, r.gap, r.active_2w, r.active_4w, r.resigned_w1, r.resigned_w2, r.resigned_w4, r.attendance_today, r.attendancePct == null ? "" : Math.round(r.attendancePct * 10) / 10])
    );

  return (
    <DataTable
      title="Driver Strength"
      titleExtra={
        <button onClick={exportIt} className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
          Export CSV
        </button>
      }
      maxHeight="70vh"
      columns={columns}
      groupHeaders={groupHeaders}
      rows={tableRows}
      rowKey={(r) => r.station_code}
      rowClassName={(r) => (r.isTotal ? "bg-slate-100" : "")}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      emptyMessage="No stations in your region."
      footer={
        <>
          Drivers / Riders required are typed in by you (yellow). Strength now = drivers still employed: HD / HR = hybrid van / bike, ID / IR = independent car-van-truck / bike (part-time included);
          Bike = HR + IR, Car / van = HD + ID. Fill = Total ÷ Total required; To hire = required − have (green + means over). Active = drivers with at least one route with parcels delivered in the last
          14 / 28 days. Resigned counts end dates in the last 7 / 14 / 30 days. % of strength = Attendance today ÷ Total. A dash means the Metabase file is not loaded yet.
        </>
      }
    />
  );
}
