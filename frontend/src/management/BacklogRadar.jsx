import { useMemo, useState } from "react";
import { api } from "../api";
import DataTable from "../components/DataTable";
import SegmentedControl from "../components/SegmentedControl";
import { CardRow, SEVERITY, Section, StatCard, dec1, int, pct } from "./shared";

// Backlog radar (2026-10-02): the worst backlog hubs by 0 Attempt and Age >3 (count and %), each with a mitigation plan, a rescue plan
// and its deployment cost that a manager types in. Live numbers from /api/dashboard (latest refresh).

const STATUS_LABEL = { planned: "Planned", in_progress: "In progress", done: "Done" };
const STATUS_CLASS = { planned: "bg-slate-100 text-slate-700", in_progress: "bg-amber-100 text-amber-800", done: "bg-emerald-100 text-emerald-800" };

// Severity blends Age >3 % of In Hub, On Hold count and 0 Attempt % of In Hub -- each banded 0-3, summed to 0-9, fixed bands for now.
function severityOf(r) {
  const band = (v, warn, crit) => (v >= crit ? 3 : v >= warn ? 2 : v > 0 ? 1 : 0);
  return band(pct(r.age_gt3, r.total_in_hub), 10, 25) + band(r.on_hold, 20, 60) + band(pct(r.zero_attempt_total, r.total_in_hub), 10, 25);
}
const sevClass = (s) => (s >= 7 ? "text-status-critical font-black" : s >= 4 ? "text-status-warning font-bold" : "text-slate-600");

export default function BacklogRadar({ dashboard, notes, reload, setError }) {
  const stations = dashboard.stations || [];
  const notesByStation = useMemo(() => Object.fromEntries(notes.map((n) => [n.station_code, n])), [notes]);
  const [metric, setMetric] = useState("zero");
  const [basis, setBasis] = useState("count");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const score = (r) => {
    const raw = metric === "zero" ? r.zero_attempt_total : r.age_gt3;
    return basis === "count" ? raw : pct(raw, r.total_in_hub);
  };
  const ranked = useMemo(
    () => stations.map((r) => ({ ...r, severity: severityOf(r) })).sort((a, b) => score(b) - score(a) || b.severity - a.severity).slice(0, 20),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stations, metric, basis]
  );

  const withPlan = ranked.filter((r) => notesByStation[r.station_code]?.mitigation_plan || notesByStation[r.station_code]?.rescue_plan).length;
  const critical = stations.filter((r) => severityOf(r) >= 7).length;
  const registered = notes
    .filter((n) => n.rescue_plan || n.rescue_deployment_cost)
    .map((n) => ({ ...n, station_name: stations.find((s) => s.station_code === n.station_code)?.station_name || n.station_code }));

  const open = (r) => {
    const n = notesByStation[r.station_code] || {};
    setEditing({ station_code: r.station_code, station_name: r.station_name });
    setDraft({
      mitigation_plan: n.mitigation_plan || "", rescue_plan: n.rescue_plan || "", rescue_deployment_cost: n.rescue_deployment_cost || "",
      plan_status: n.plan_status || "", plan_owner: n.plan_owner || "", plan_target_date: n.plan_target_date || "",
    });
  };
  const save = async () => {
    setSaving(true);
    try {
      const orNull = (v) => (v === "" ? null : v);
      await api.managementNoteSave(editing.station_code, Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, orNull(v)])));
      setEditing(null);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const countPct = (n, r) => `${int(n)} (${dec1(pct(n, r.total_in_hub))}%)`;
  const statusBadge = (s) =>
    s ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_CLASS[s]}`}>{STATUS_LABEL[s]}</span> : "—";

  return (
    <div className="space-y-4">
      <Section title="Backlog radar" note="Live -- latest refresh">
        <CardRow>
          <StatCard label="Critical hubs" value={int(critical)} sub="severity 7+ of 9" tone={critical ? "bad" : undefined} />
          <StatCard label="Top 20 with a plan" value={`${withPlan} / ${ranked.length}`} sub="mitigation or rescue plan typed in" tone={withPlan < ranked.length ? "warn" : undefined} />
        </CardRow>
        <div className="flex flex-wrap gap-3">
          <SegmentedControl options={[{ key: "zero", label: "0 Attempt" }, { key: "age", label: "Age >3" }]} value={metric} onChange={setMetric} />
          <SegmentedControl options={[{ key: "count", label: "By number" }, { key: "pct", label: "By % of In Hub" }]} value={basis} onChange={setBasis} />
        </div>
        <DataTable
          title="Top hubs by backlog"
          titleExtra={<span className="text-[10px] text-slate-400">severity blends Age &gt;3 %, On Hold and 0 Attempt % · click a row to plan</span>}
          maxHeight="560px"
          columns={[
            { key: "station_name", label: "Station", sticky: true, align: "left" },
            { key: "region", label: "Region", className: () => "text-slate-600" },
            { key: "total_in_hub", label: "In Hub", render: (r) => int(r.total_in_hub) },
            { key: "zero_attempt_total", label: "0 Attempt", render: (r) => countPct(r.zero_attempt_total, r) },
            { key: "age_gt3", label: "Age >3", render: (r) => countPct(r.age_gt3, r) },
            { key: "on_hold", label: "On Hold", render: (r) => int(r.on_hold) },
            { key: "severity", label: "Severity", render: (r) => <span className={sevClass(r.severity)}>{SEVERITY(r.severity)}</span> },
            { key: "status", label: "Plan", render: (r) => statusBadge(notesByStation[r.station_code]?.plan_status) },
            { key: "owner", label: "Owner", render: (r) => notesByStation[r.station_code]?.plan_owner || "—" },
          ]}
          rows={ranked}
          rowKey={(r) => r.station_code}
          onRowClick={open}
          rowClassName={(r) => (editing?.station_code === r.station_code ? "bg-brand/10" : "")}
          emptyMessage="No stations."
          footer={`Top 20 by ${metric === "zero" ? "0 Attempt" : "Age >3"} ${basis === "count" ? "number" : "% of In Hub"}.`}
        />
      </Section>

      {editing && (
        <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-brand/40">
          <div className="flex items-center justify-between">
            <div className="font-display text-sm font-bold text-ink">{editing.station_name} — mitigation &amp; rescue plan</div>
            <button onClick={() => setEditing(null)} className="text-xs text-slate-500 hover:underline">Close</button>
          </div>
          <label className="block text-xs text-slate-500">
            Backlog mitigation plan
            <textarea className={field} rows={3} value={draft.mitigation_plan} onChange={(e) => setDraft({ ...draft, mitigation_plan: e.target.value })} />
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block text-xs text-slate-500">
              Status
              <select className={field} value={draft.plan_status} onChange={(e) => setDraft({ ...draft, plan_status: e.target.value })}>
                <option value="">—</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-500">
              Owner
              <input className={field} value={draft.plan_owner} onChange={(e) => setDraft({ ...draft, plan_owner: e.target.value })} />
            </label>
            <label className="block text-xs text-slate-500">
              Target date
              <input type="date" className={field} value={draft.plan_target_date} onChange={(e) => setDraft({ ...draft, plan_target_date: e.target.value })} />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-slate-500">
              Rescue plan
              <textarea className={field} rows={3} value={draft.rescue_plan} onChange={(e) => setDraft({ ...draft, rescue_plan: e.target.value })} />
            </label>
            <label className="block text-xs text-slate-500">
              Rescue deployment cost
              <input className={field} placeholder="e.g. RM 1,200 / day" value={draft.rescue_deployment_cost} onChange={(e) => setDraft({ ...draft, rescue_deployment_cost: e.target.value })} />
            </label>
          </div>
          <button onClick={save} disabled={saving} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      <DataTable
        title="Rescue plans and deployment cost"
        maxHeight="360px"
        columns={[
          { key: "station_name", label: "Station", sticky: true, align: "left" },
          { key: "rescue_plan", label: "Rescue plan", align: "left", render: (r) => r.rescue_plan || "—" },
          { key: "rescue_deployment_cost", label: "Deployment cost", render: (r) => r.rescue_deployment_cost || "—" },
          { key: "plan_status", label: "Status", render: (r) => statusBadge(r.plan_status) },
          { key: "plan_owner", label: "Owner", render: (r) => r.plan_owner || "—" },
          { key: "plan_target_date", label: "Target", render: (r) => r.plan_target_date || "—" },
        ]}
        rows={registered}
        rowKey={(r) => r.station_code}
        emptyMessage="No rescue plans yet -- click a hub above to add one."
      />
    </div>
  );
}
