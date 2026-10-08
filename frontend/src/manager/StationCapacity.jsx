import DataTable from "../components/DataTable";
import { exportCsv } from "../lib/csv";
import { PlanInput, dec1, int, pct, pct1, sumOf, sumOrNull, useSortedRows } from "./shared";

// Station Capacity (the South Management sheet's tab of the same name): per station of the manager's region -- the plan the manager typed (headcount, volume), the people
// posted there, what the station really handled over the last 7 finished days, and today's attendance. Yellow cells are typed in and saved as you leave them.

const strengthTotal = (r) => (r.hd == null ? null : r.hd + r.hr + r.id + r.ir);

function withDerived(r) {
  const total = strengthTotal(r);
  return {
    ...r,
    staff: r.staff_filled == null ? null : r.staff_filled + (r.staff_tba || 0),
    util: r.plan.volume && r.avg_fresh != null ? pct(r.avg_fresh, r.plan.volume) : null,
    attendancePct: total && r.attendance_today != null ? pct(r.attendance_today, total) : null,
  };
}

function totalRow(rows) {
  const planVol = sumOrNull(rows, (r) => r.plan.volume);
  const avgFresh = sumOrNull(rows, (r) => r.avg_fresh);
  const routed = sumOf(rows, (r) => r.avg_routed);
  const attendance = sumOf(rows, (r) => r.avg_attendance);
  const strength = sumOrNull(rows, strengthTotal);
  const attToday = sumOrNull(rows, (r) => r.attendance_today);
  // success % over the group = Σ success / Σ routed, which needs each station's own figures: weight by routed
  const successWeighted = sumOf(rows, (r) => (r.success_pct != null ? (r.success_pct * (r.avg_routed || 0)) / 100 : 0));
  return {
    isTotal: true, station_code: "__total", station_name: "Total in view", zone: "", region: "", plan: { headcount: sumOrNull(rows, (r) => r.plan.headcount), volume: planVol },
    staff: sumOrNull(rows, (r) => (r.staff_filled == null ? null : r.staff_filled + (r.staff_tba || 0))),
    avg_fresh: avgFresh, avg_routed: sumOrNull(rows, (r) => r.avg_routed), attendance_today: attToday,
    util: planVol && avgFresh != null ? pct(avgFresh, planVol) : null,
    attendancePct: strength && attToday != null ? pct(attToday, strength) : null,
    success_pct: routed ? (successWeighted / routed) * 100 : null,
    productivity: attendance ? routed / attendance : null,
  };
}

export default function StationCapacity({ data, rows, savePlan, canEdit }) {
  const list = rows.map(withDerived);
  const nameCell = (r) => (r.isTotal ? <span className="font-display font-bold uppercase tracking-wide text-ink">{r.station_name}</span> : r.station_name);
  const edit = (field, label) => (r) =>
    r.isTotal ? int(r.plan[field]) : canEdit ? <PlanInput value={r.plan[field]} label={`${label} ${r.station_name}`} onSave={(v) => savePlan(r.station_code, { [field]: v })} /> : int(r.plan[field]);
  const utilTone = (u) => (u == null ? "" : u > 100 ? "text-status-critical font-semibold" : u > 85 ? "text-status-warning font-semibold" : "text-slate-700");

  const columns = [
    { key: "station_name", label: "Station", sticky: true, align: "left", val: (r) => r.station_name, render: nameCell },
    { key: "zone", label: "Zone", sortable: false, className: () => "text-slate-500", render: (r) => r.zone },
    { key: "planHeadcount", label: "Plan headcount", groupStart: true, val: (r) => r.plan.headcount, render: edit("headcount", "Plan headcount") },
    { key: "staff", label: "Staff posted", val: (r) => r.staff, render: (r) => (r.staff == null ? "—" : r.isTotal ? int(r.staff) : `${int(r.staff_filled)}${r.staff_tba ? ` + ${r.staff_tba} TBA` : ""}`) },
    { key: "planVol", label: "Plan vol / day", groupStart: true, val: (r) => r.plan.volume, render: edit("volume", "Plan volume") },
    { key: "avgFresh", label: "Avg fresh / day", val: (r) => r.avg_fresh, render: (r) => dec1(r.avg_fresh) },
    { key: "util", label: "vs plan", val: (r) => r.util, render: (r) => <span className={utilTone(r.util)}>{pct1(r.util)}</span> },
    { key: "avgRouted", label: "Avg routed / day", val: (r) => r.avg_routed, render: (r) => dec1(r.avg_routed) },
    { key: "success", label: "Success rate", val: (r) => r.success_pct, render: (r) => pct1(r.success_pct) },
    { key: "productivity", label: "Productivity", val: (r) => r.productivity, render: (r) => dec1(r.productivity) },
    { key: "attToday", label: "Attendance today", groupStart: true, val: (r) => r.attendance_today, render: (r) => int(r.attendance_today) },
    { key: "attPct", label: "% of strength", val: (r) => r.attendancePct, render: (r) => pct1(r.attendancePct) },
  ].map((c) => ({ align: c.key === "station_name" ? "left" : "center", className: () => "text-slate-700", ...c }));

  const body = (r) => !r.isTotal;
  const { sorted, sortKey, sortDir, onSort } = useSortedRows(list, columns);
  const tableRows = list.length ? [totalRow(list), ...sorted] : [];
  const groupHeaders = [
    { key: "loc", label: "Location", span: 1 },
    { key: "plan", label: "Headcount", span: 2 },
    { key: "vol", label: "Volume — last 7 finished days", span: 6 },
    { key: "today", label: "Today", span: 2 },
  ];

  const exportIt = () =>
    exportCsv(
      `manager-dashboard-station-capacity-${data.today}.csv`,
      ["Region", "Zone", "Station", "Plan headcount", "Staff posted", "Staff TBA", "Plan vol / day", "Avg fresh / day", "vs plan %", "Avg routed / day", "Success rate %", "Productivity", "Attendance today", "% of strength"],
      list.map((r) => [r.region, r.zone, r.station_name, r.plan.headcount, r.staff_filled, r.staff_tba, r.plan.volume, r.avg_fresh, r.util == null ? "" : dec1(r.util), r.avg_routed, r.success_pct, r.productivity, r.attendance_today, r.attendancePct == null ? "" : dec1(r.attendancePct)])
    );

  return (
    <DataTable
      title="Station Capacity"
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
      rowClassName={(r) => (body(r) ? "" : "bg-slate-100")}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      emptyMessage="No stations in your region."
      footer={
        <>
          Yellow cells are typed in by you and saved when you leave the cell. Avg fresh / routed per day, Success rate and Productivity (routed ÷ attendance) are over the last 7 finished days of the daily Station
          Health snapshot; vs plan = Avg fresh ÷ Plan vol (amber above 85%, red above 100%). Attendance today is what is clocked so far; % of strength = Attendance today ÷ drivers on the books (Driver Strength tab).
          Staff posted comes from Staff &amp; Org Chart (people posted + approved TBA seats).
        </>
      }
    />
  );
}
