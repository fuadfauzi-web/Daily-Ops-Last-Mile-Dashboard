import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import DataTable from "./components/DataTable";
import TabBar from "./components/TabBar";
import Skeleton from "./components/Skeleton";

// Management View (2026-10-01): a higher-level page for managers/admins/HOD/COO -- overall
// health, capacity and backlog, nationwide, instead of the ground-staff detail the rest of
// the app is built for. v1 reuses numbers the app already captures (Station Health / Route
// Monitoring via /api/dashboard, Shipment Details via /api/shipment-details, DoD history via
// /api/dod) and rolls them up here -- only Capacity's Hub Size/Staff (uploaded workbook) and
// Backlog radar's mitigation/rescue-plan notes (typed in by a manager) are new data.
// Known gaps, not yet built: OPS attendance isn't split out from the HD/HR/ID/IR headcount
// anywhere in the app yet. Control Tower Hypercare shipper (2026-10-01, confirmed by the Fleet
// Manager) = the Shipper Radar SLA shippers Watson, Orca, Zalora NXD and Cold Chain, from
// /api/shipper-watch -- no separate Hypercare list exists, this IS the Hypercare view. PTWH
// headcount (2026-10-01, confirmed): no running-count source exists -- some stations have a
// fixed daily PTWH, others only bring PTWH in for offdays/backlog, so it's manager-set per
// station by design, not a gap (editable in Backlog radar).

const int = (v) => Math.round(v || 0).toLocaleString();
const dec1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (num, den) => (den ? (num / den) * 100 : 0);
const sum = (rows, key) => rows.reduce((a, r) => a + (r[key] || 0), 0);

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border-l-4 border-brand bg-white px-3 py-2 ring-1 ring-slate-200">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-0.5 font-display text-lg font-black text-ink">{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between">
        <div className="font-display text-sm font-bold text-ink">{title}</div>
        {note && <div className="text-[10px] text-slate-400">{note}</div>}
      </div>
      {children}
    </div>
  );
}

function CardRow({ children }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

// Backlog severity (2026-10-01): a blend of three things already tracked per station --
// Age >3 as a % of In Hub, On Hold count, and 0 Attempt as a % of In Hub -- each scored
// 0-3 against the same thresholds used elsewhere (Admin -> SLA Targets isn't read here yet,
// so this uses fixed bands for v1), summed into one 0-9 severity score. Worst first.
function severityOf(r) {
  const agePct = pct(r.age_gt3, r.total_in_hub);
  const zeroPct = pct(r.zero_attempt_total, r.total_in_hub);
  const band = (v, warn, crit) => (v >= crit ? 3 : v >= warn ? 2 : v > 0 ? 1 : 0);
  return band(agePct, 10, 25) + band(r.on_hold, 20, 60) + band(zeroPct, 10, 25);
}

export default function ManagementViewTab({ me }) {
  const [sub, setSub] = useState("overall");
  const [dashboard, setDashboard] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [dod, setDod] = useState(null);
  const [shipper, setShipper] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState(null);
  const [editingStation, setEditingStation] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      api.dashboard(), api.shipmentDetails(), api.dod(), api.shipperWatch(), api.managementCapacity(), api.managementNotes(),
    ])
      .then(([d, s, dd, sh, c, n]) => {
        setDashboard(d);
        setShipment(s);
        setDod(dd);
        setShipper(sh);
        setCapacity(c);
        setNotes(n);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const stations = dashboard?.stations || [];
  const shipStations = shipment?.stations || [];
  const shipperStations = shipper?.stations || [];
  const notesByStation = useMemo(() => Object.fromEntries((notes || []).map((n) => [n.station_code, n])), [notes]);

  const subTabs = [
    { key: "overall", label: "Overall Health" },
    { key: "capacity", label: "Capacity" },
    { key: "backlog", label: "Backlog Radar" },
  ];

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!dashboard || !shipment || !dod || !shipper || !capacity || !notes) return <Skeleton rows={6} />;

  // ---------------------------------------------------------------- Overall Health
  const OverallHealth = () => {
    const totalRouted = sum(stations, "total_routed");
    const totalSuccess = sum(stations, "current_success");
    const totalOvfd = sum(stations, "current_ovfd");
    const successRate = pct(totalSuccess, totalRouted);
    const completionRate = totalRouted ? ((totalRouted - totalOvfd) / totalRouted) * 100 : 0;

    const attHd = sum(stations, "attendance_hd"), attHr = sum(stations, "attendance_hr");
    const attId = sum(stations, "attendance_id"), attIr = sum(stations, "attendance_ir");
    const attRescue = sum(stations, "attendance_rescue");
    const attTotal = sum(stations, "attendance");
    const attHybrid = attHd + attHr, attInd = attId + attIr;

    const totalInHub = sum(stations, "total_in_hub");
    const ageGt3 = sum(stations, "age_gt3");
    const zeroAttempt = sum(stations, "zero_attempt_total");

    // Control Tower Hypercare shippers (2026-10-01, confirmed by the Fleet Manager): Watson,
    // Orca, Zalora NXD and Cold Chain from Shipper Radar's SLA view -- their 0-Attempt +
    // Aging/OVFD/Other columns summed as one "stuck with a hypercare shipper" backlog number.
    const watsonBacklog = sum(shipperStations, "watson_zero_attempt") + sum(shipperStations, "watson_aging");
    const orcaBacklog = sum(shipperStations, "orca_ovfd") + sum(shipperStations, "orca_other");
    const zaloraBacklog =
      sum(shipperStations, "zalora_zero_attempt") + sum(shipperStations, "zalora_ovfd") + sum(shipperStations, "zalora_other");
    const coldChainBacklog = sum(shipperStations, "cold_chain_zero_attempt") + sum(shipperStations, "cold_chain_aging");
    const hypercareBacklog = watsonBacklog + orcaBacklog + zaloraBacklog + coldChainBacklog;

    const totalFresh = sum(shipStations, "total_fresh");
    const latlong = sum(shipStations, "latlong");
    const BANDS = [
      { key: "green", label: "Before 10am", test: (h) => h < 10 },
      { key: "blue", label: "10-11am", test: (h) => h >= 10 && h < 11 },
      { key: "amber", label: "11am-12pm", test: (h) => h >= 11 && h < 12 },
      { key: "red", label: "After 12pm", test: (h) => h >= 12 },
    ];
    const lhCounts = { green: 0, blue: 0, amber: 0, red: 0, none: 0 };
    shipStations.forEach((s) => {
      const trips = s.lh_trips || [];
      const latest = trips[trips.length - 1];
      if (!latest) {
        lhCounts.none += 1;
        return;
      }
      const hour = new Date(latest.time.replace(" ", "T")).getHours();
      const band = BANDS.find((b) => b.test(hour));
      if (band) lhCounts[band.key] += 1;
    });
    const lhOnTime = lhCounts.green + lhCounts.blue;
    const lhStationsWithData = shipStations.length - lhCounts.none;

    // Driver/rider attendance, weekday vs weekend, from DoD's captured history (last ~2 weeks).
    const dodRows = dod.rows || [];
    const byDay = new Map();
    dodRows.forEach((r) => {
      if (!byDay.has(r.day)) byDay.set(r.day, 0);
      byDay.set(r.day, byDay.get(r.day) + (r.metrics.attendance || 0));
    });
    const weekday = [], weekend = [];
    byDay.forEach((total, day) => {
      const dow = new Date(day + "T00:00:00").getDay(); // 0 Sun, 6 Sat
      (dow === 0 || dow === 6 ? weekend : weekday).push(total);
    });
    const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

    return (
      <div className="space-y-4">
        <Section title="Routing health" note="Success % and Completion % are national, this refresh">
          <CardRow>
            <StatCard label="Total Routed" value={int(totalRouted)} />
            <StatCard label="Success Rate" value={`${dec1(successRate)}%`} />
            <StatCard label="Completion Rate" value={`${dec1(completionRate)}%`} sub="(Routed − Still OVFD) ÷ Routed" />
          </CardRow>
        </Section>
        <Section title="Attendance Rate" note="HD/HR/ID/IR headcount; OPS isn't split out yet">
          <CardRow>
            <StatCard label="Overall" value={int(attTotal)} />
            <StatCard label="Hybrid (HD+HR)" value={int(attHybrid)} sub={`${dec1(pct(attHybrid, attTotal))}% of attendance`} />
            <StatCard label="Independent (ID+IR)" value={int(attInd)} sub={`${dec1(pct(attInd, attTotal))}% of attendance`} />
            <StatCard label="Rescue" value={int(attRescue)} sub={`${dec1(pct(attRescue, attTotal))}% of attendance`} />
          </CardRow>
        </Section>
        <Section title="Aging health" note="Hypercare = Watson, Orca, Zalora NXD, Cold Chain (Shipper Radar SLA)">
          <CardRow>
            <StatCard label="In Hub" value={int(totalInHub)} />
            <StatCard label="Age >3" value={int(ageGt3)} sub={`${dec1(pct(ageGt3, totalInHub))}% of In Hub`} />
            <StatCard label="0 Attempt" value={int(zeroAttempt)} sub={`${dec1(pct(zeroAttempt, totalInHub))}% of In Hub`} />
            <StatCard label="Hypercare Backlog" value={int(hypercareBacklog)} sub={`${dec1(pct(hypercareBacklog, totalInHub))}% of In Hub`} />
          </CardRow>
          <CardRow>
            <StatCard label="Watson" value={int(watsonBacklog)} sub="0 Attempt + Aging >D0" />
            <StatCard label="Orca" value={int(orcaBacklog)} sub="OVFD + Other Status" />
            <StatCard label="Zalora NXD" value={int(zaloraBacklog)} sub="0 Attempt + OVFD + Other" />
            <StatCard label="Cold Chain" value={int(coldChainBacklog)} sub="0 Attempt + Aging >D0" />
          </CardRow>
        </Section>
        <Section title="Shipment Compliance">
          <CardRow>
            <StatCard label="Total Fresh" value={int(totalFresh)} />
            <StatCard label="Latlong" value={int(latlong)} sub={`${dec1(pct(latlong, totalFresh))}% of Total Fresh`} />
            <StatCard label="LH Timing on time" value={`${dec1(pct(lhOnTime, lhStationsWithData))}%`} sub="latest trip before 11am, stations with a trip today" />
          </CardRow>
        </Section>
        <Section title="Driver/rider attendance -- weekday vs weekend" note={`From DoD's captured history (${dodRows.length ? [...byDay.keys()].sort()[0] : "–"} to ${dod.today})`}>
          <CardRow>
            <StatCard label="Weekday avg" value={int(avg(weekday))} sub={`${weekday.length} day(s)`} />
            <StatCard label="Weekend avg" value={int(avg(weekend))} sub={`${weekend.length} day(s)`} />
          </CardRow>
        </Section>
      </div>
    );
  };

  // ---------------------------------------------------------------- Capacity
  const Capacity = () => {
    const rows = capacity.rows || [];
    const totalSqft = sum(rows, "sqft");
    const totalStaff = sum(rows, "staff_count");
    const totalPtwh = sum(rows, "ptwh_count");
    const haveSqft = rows.some((r) => r.sqft != null);
    const haveStaff = rows.some((r) => r.staff_count != null);
    const [uploading, setUploading] = useState(null);
    const canUpload = me.role === "admin";
    const doUpload = async (dataset, file) => {
      if (!file) return;
      setUploading(dataset);
      try {
        await api.kpiUpload(dataset, file);
        load();
      } catch (e) {
        setError(e.message);
      } finally {
        setUploading(null);
      }
    };
    return (
      <div className="space-y-4">
        <Section
          title="Capacity by hub"
          note={
            capacity.sources.hub_size || capacity.sources.staff
              ? `Hub size: ${capacity.sources.hub_size || "not uploaded"} · Staff: ${capacity.sources.staff || "not uploaded"}`
              : "Not uploaded yet"
          }
        >
          <CardRow>
            <StatCard label="Hub Size (sqft)" value={haveSqft ? int(totalSqft) : "—"} sub="sum across hubs with data" />
            <StatCard label="Staff" value={haveStaff ? int(totalStaff) : "—"} />
            <StatCard label="PTWH" value={totalPtwh ? int(totalPtwh) : "—"} sub="manager-entered, see Backlog radar" />
          </CardRow>
          {canUpload && (
            <div className="mt-2 flex flex-wrap gap-4 border-t border-slate-100 pt-2 text-xs text-slate-600">
              <label className="flex items-center gap-2">
                Upload Hub Size (the "control" sheet)
                <input type="file" accept=".xlsx,.xls,.csv" disabled={uploading} onChange={(e) => doUpload("capacity_hub_size", e.target.files[0])} />
                {uploading === "capacity_hub_size" && <span>Uploading…</span>}
              </label>
              <label className="flex items-center gap-2">
                Upload Staff headcount (the "SH &amp; FA Manpower" sheet)
                <input type="file" accept=".xlsx,.xls,.csv" disabled={uploading} onChange={(e) => doUpload("capacity_staff", e.target.files[0])} />
                {uploading === "capacity_staff" && <span>Uploading…</span>}
              </label>
            </div>
          )}
        </Section>
        <DataTable
          title="Hub Size &amp; Staff by station"
          maxHeight="480px"
          columns={[
            { key: "station_name", label: "Station", sticky: true, align: "left" },
            { key: "region", label: "Region", className: () => "text-slate-600" },
            { key: "sqft", label: "SQFT", render: (r) => (r.sqft == null ? "—" : int(r.sqft)) },
            { key: "staff_count", label: "Staff", render: (r) => (r.staff_count == null ? "—" : int(r.staff_count)) },
            { key: "ptwh_count", label: "PTWH", render: (r) => (r.ptwh_count == null ? "—" : int(r.ptwh_count)) },
          ]}
          rows={rows}
          rowKey={(r) => r.station_code}
          emptyMessage="No stations."
        />
      </div>
    );
  };

  // ---------------------------------------------------------------- Backlog Radar
  const BacklogRadar = () => {
    const ranked = useMemo(
      () =>
        stations
          .map((r) => ({ ...r, severity: severityOf(r) }))
          .sort((a, b) => b.severity - a.severity)
          .slice(0, 20),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [stations]
    );
    const sevLabel = (s) => (s >= 7 ? "Critical" : s >= 4 ? "Warning" : s > 0 ? "Watch" : "OK");
    const sevClass = (s) => (s >= 7 ? "text-status-critical font-black" : s >= 4 ? "text-status-warning font-bold" : "text-slate-600");

    const openEdit = (r) => {
      const n = notesByStation[r.station_code] || {};
      setEditingStation(r);
      setEditDraft({
        mitigation_plan: n.mitigation_plan || "", rescue_plan: n.rescue_plan || "",
        rescue_deployment_cost: n.rescue_deployment_cost || "", ptwh_count: n.ptwh_count ?? "",
      });
    };
    const save = async () => {
      setSaving(true);
      try {
        await api.managementNoteSave(editingStation.station_code, {
          mitigation_plan: editDraft.mitigation_plan || null, rescue_plan: editDraft.rescue_plan || null,
          rescue_deployment_cost: editDraft.rescue_deployment_cost || null,
          ptwh_count: editDraft.ptwh_count === "" ? null : Number(editDraft.ptwh_count),
        });
        setEditingStation(null);
        load();
      } catch (e) {
        setError(e.message);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        <DataTable
          title="Top hub and severity"
          titleExtra={<span className="text-[10px] text-slate-400">severity blends Age &gt;3 %, On Hold count and 0 Attempt % · click a row for its plan</span>}
          maxHeight="520px"
          columns={[
            { key: "station_name", label: "Station", sticky: true, align: "left" },
            { key: "region", label: "Region", className: () => "text-slate-600" },
            { key: "age_gt3", label: "Age >3", render: (r) => `${int(r.age_gt3)} (${dec1(pct(r.age_gt3, r.total_in_hub))}%)` },
            { key: "on_hold", label: "On Hold", render: (r) => int(r.on_hold) },
            { key: "zero_attempt_total", label: "0 Attempt", render: (r) => `${int(r.zero_attempt_total)} (${dec1(pct(r.zero_attempt_total, r.total_in_hub))}%)` },
            { key: "severity", label: "Severity", render: (r) => <span className={sevClass(r.severity)}>{sevLabel(r.severity)}</span> },
            {
              key: "plan", label: "Plan", sortable: false,
              render: (r) => (notesByStation[r.station_code]?.mitigation_plan || notesByStation[r.station_code]?.rescue_plan ? "Has a plan" : "—"),
            },
          ]}
          rows={ranked}
          rowKey={(r) => r.station_code}
          onRowClick={openEdit}
          emptyMessage="No stations."
          footer="Top 20 by severity, worst first."
        />
        {editingStation && (
          <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-brand/40">
            <div className="flex items-center justify-between">
              <div className="font-display text-sm font-bold text-ink">{editingStation.station_name} — mitigation &amp; rescue plan</div>
              <button onClick={() => setEditingStation(null)} className="text-xs text-slate-500 hover:underline">Close</button>
            </div>
            <label className="block text-xs text-slate-500">
              Backlog mitigation plan
              <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={editDraft.mitigation_plan} onChange={(e) => setEditDraft({ ...editDraft, mitigation_plan: e.target.value })} />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs text-slate-500">
                Rescue plan
                <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={editDraft.rescue_plan} onChange={(e) => setEditDraft({ ...editDraft, rescue_plan: e.target.value })} />
              </label>
              <div className="space-y-2">
                <label className="block text-xs text-slate-500">
                  Rescue deployment cost
                  <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. RM 1,200 / day" value={editDraft.rescue_deployment_cost} onChange={(e) => setEditDraft({ ...editDraft, rescue_deployment_cost: e.target.value })} />
                </label>
                <label className="block text-xs text-slate-500">
                  PTWH count
                  <input type="number" min="0" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={editDraft.ptwh_count} onChange={(e) => setEditDraft({ ...editDraft, ptwh_count: e.target.value })} />
                </label>
              </div>
            </div>
            <button onClick={save} disabled={saving} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <TabBar tabs={subTabs} activeKey={sub} onSelect={setSub} />
      {sub === "overall" && <OverallHealth />}
      {sub === "capacity" && <Capacity />}
      {sub === "backlog" && <BacklogRadar />}
    </div>
  );
}
