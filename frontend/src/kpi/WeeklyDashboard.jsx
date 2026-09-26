import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import DataTable from "../components/DataTable";
import Skeleton from "../components/Skeleton";
import TrendChart from "../components/TrendChart";
import { exportCsv } from "../lib/csv";
import { formatTime } from "../lib/format";
import KpiUploadPanel from "./KpiUploadPanel";
import { int, selectClass, sortBy } from "./fmt";

// Weekly Dashboard (staging): the team's WoW dashboard -- one scope (a region, zone or station) over the past 4 weeks, every
// KPI against its target, and the stations under it for the chosen week. It reads the "Station KPI W0W" sheet of the Dashboard WoW
// file (uploaded on this page). The OPEX team's own results will be merged in later (see OPEX Result).

const fmtPct = (k, v) => (v == null ? "—" : `${(v * 100).toFixed(k === "complaint" || k === "lost" ? 3 : 1)}%`);
const targetText = (k) => (k.target == null ? "—" : `${k.direction === "lower" ? "<" : "≥"} ${(k.target * 100).toFixed(k.key === "complaint" || k.key === "lost" ? 3 : 0)}%`);
// good | bad | null (no target / no value)
const rag = (k, v) => (v == null || k.target == null ? null : k.direction === "lower" ? (v <= k.target ? "good" : "bad") : v >= k.target ? "good" : "bad");
const RAG_CLASS = { good: "font-medium text-status-good", bad: "font-semibold text-status-critical", null: "text-slate-700" };
const RAG_MARK = { good: "", bad: "▲ ", null: "" };

export default function WeeklyDashboard({ me }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [scopeKey, setScopeKey] = useState(null);
  const [weekSel, setWeekSel] = useState(null);
  const [trendKpi, setTrendKpi] = useState("success_rate");
  const [sortKey, setSortKey] = useState("success_rate");
  const [sortDir, setSortDir] = useState("asc");
  const [showUpload, setShowUpload] = useState(false);
  const canUpload = me.role === "admin";

  const load = () =>
    api
      .kpiWeekly()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const index = useMemo(() => {
    const m = new Map();
    (data?.rows || []).forEach((r) => m.set(`${r.level}|${r.name}|${r.week}`, r));
    return m;
  }, [data]);

  const scopes = useMemo(() => {
    const seen = new Map();
    (data?.rows || []).forEach((r) => {
      const k = `${r.level}|${r.name}`;
      if (!seen.has(k)) seen.set(k, { key: k, level: r.level, name: r.name, zone: r.zone, region: r.region });
    });
    const order = { region: 0, zone: 1, station: 2 };
    return [...seen.values()].sort((a, b) => order[a.level] - order[b.level] || a.name.localeCompare(b.name));
  }, [data]);

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.has_data || !scopes.length) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">{data.has_data ? "No rows for your scope in the uploaded file" : "No weekly results uploaded yet"}</div>
          <p className="mt-2">
            Upload the <strong>Station KPI W0W</strong> sheet of the Dashboard WoW file (the whole workbook is fine) and this page shows the KPI results week over week, with each
            KPI against its target.
          </p>
        </div>
        <KpiUploadPanel kpi="weekly" me={me} onChanged={load} />
      </div>
    );
  }

  const scope = scopes.find((s) => s.key === scopeKey) || scopes[0];
  // targets are per region (East Coast / East Malaysia differ for some KPIs): judge the scope against its own region's
  const regionTargets = data.region_targets?.[scope.region] || {};
  const kpis = data.kpis.map((k) => (regionTargets[k.key] != null ? { ...k, target: regionTargets[k.key] } : k));
  const weeksDesc = [...data.weeks].sort((a, b) => b - a);
  const week = weekSel && data.weeks.includes(weekSel) ? weekSel : weeksDesc[0];
  const past = data.weeks.filter((w) => w <= week).slice(-4);
  const at = (s, w) => index.get(`${s.level}|${s.name}|${w}`);

  // ---- past-4-weeks table: a row per KPI (and the volumes), a column per week
  const measureRows = [
    ...data.counts.map((c) => ({ key: c.key, label: c.label, count: true })),
    ...kpis.map((k) => ({ ...k, kpi: true })),
  ];
  const valueOf = (row, w, s = scope) => {
    const r = at(s, w);
    return r ? (row.count ? r.counts[row.key] : r.values[row.key]) : null;
  };
  const pastColumns = [
    { key: "label", label: "KPI", sticky: true, align: "left", sortable: false, render: (m) => m.label },
    { key: "target", label: "Target", sortable: false, className: () => "text-slate-400", render: (m) => (m.kpi ? targetText(m) : "") },
    ...past.map((w) => ({
      key: `w${w}`,
      label: `W${w}`,
      sortable: false,
      render: (m) => {
        const v = valueOf(m, w);
        if (v == null) return <span className="text-slate-300">—</span>;
        if (m.count) return int(v);
        const g = rag(m, v);
        return `${RAG_MARK[g]}${fmtPct(m.key, v)}`;
      },
      className: (m) => (m.kpi ? RAG_CLASS[rag(m, valueOf(m, w))] : "text-slate-700"),
    })),
    {
      key: "trend",
      label: "vs previous",
      sortable: false,
      render: (m) => {
        if (past.length < 2) return "";
        const a = valueOf(m, past[past.length - 2]);
        const b = valueOf(m, past[past.length - 1]);
        if (a == null || b == null) return "";
        const d = b - a;
        if (Math.abs(d) < (m.count ? 0.5 : 0.00005)) return <span className="text-slate-400">±0</span>;
        const better = m.kpi && m.target != null ? (m.direction === "lower" ? d < 0 : d > 0) : null;
        const text = m.count ? int(Math.abs(d)) : `${(Math.abs(d) * 100).toFixed(m.key === "complaint" || m.key === "lost" ? 3 : 1)} pts`;
        return <span className={better == null ? "text-slate-500" : better ? "text-status-good" : "text-status-critical"}>{d > 0 ? "▲" : "▼"} {text}</span>;
      },
    },
  ];

  // ---- stations under the chosen scope, for the chosen week
  const under = scopes.filter((s) => s.level === "station" && (scope.level === "station" ? s.key === scope.key : scope.level === "zone" ? s.zone === scope.name : scope.level === "region" ? s.region === scope.name : true));
  const heat = under.map((s) => {
    const r = at(s, week);
    return r ? { key: s.key, name: s.name, zone: s.zone, routed: r.counts.total_routed, ...r.values } : null;
  }).filter(Boolean);
  const heatSorted = sortBy(heat, sortKey, sortDir);
  const toggleSort = (k) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "name" || k === "zone" ? "asc" : kpis.find((x) => x.key === k)?.direction === "lower" ? "desc" : "asc"); // worst first
    }
  };
  const heatColumns = [
    { key: "name", label: "Station", sticky: true, align: "left", render: (r) => r.name },
    ...(scope.level !== "station" ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "routed", label: "Total Routed", render: (r) => int(r.routed || 0), className: () => "text-slate-700" },
    ...kpis.map((k) => ({
      key: k.key,
      label: (
        <span>
          {k.label}
          <span className="block text-[9px] font-normal normal-case opacity-60">{targetText(k)}</span>
        </span>
      ),
      render: (r) => (r[k.key] == null ? <span className="text-slate-300">—</span> : `${RAG_MARK[rag(k, r[k.key])]}${fmtPct(k.key, r[k.key])}`),
      className: (r) => RAG_CLASS[rag(k, r[k.key])],
    })),
  ];

  // ---- one KPI over all weeks, against its target
  const tk = kpis.find((k) => k.key === trendKpi) || kpis[0];
  const trendWeeks = data.weeks;
  const trendVals = trendWeeks.map((w) => {
    const v = valueOf(tk, w);
    return v == null ? null : v * 100;
  });
  const decimals = tk.key === "complaint" || tk.key === "lost" ? 3 : 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
          Scope
          <select className={selectClass} value={scope.key} onChange={(e) => setScopeKey(e.target.value)}>
            {["region", "zone", "station"].map((lvl) => (
              <optgroup key={lvl} label={lvl === "region" ? "Region" : lvl === "zone" ? "Zone" : "Station"}>
                {scopes.filter((s) => s.level === lvl).map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
          Week
          <select className={selectClass} value={week} onChange={(e) => setWeekSel(Number(e.target.value))}>
            {weeksDesc.map((w) => (
              <option key={w} value={w}>
                Week {w}
                {w === weeksDesc[0] ? " (latest)" : ""}
              </option>
            ))}
          </select>
        </label>
        {data.meta && <span className="text-xs text-slate-400">From {data.meta.filename} · {formatTime(data.meta.uploaded_at)}</span>}
        {canUpload && (
          <button onClick={() => setShowUpload((v) => !v)} className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
            {showUpload ? "Hide data upload" : "Data upload"}
          </button>
        )}
      </div>
      {showUpload && <KpiUploadPanel kpi="weekly" me={me} onChanged={load} />}

      <DataTable
        key={`past-${scope.key}-${week}`}
        title={`${scope.name} — past ${past.length} weeks (to week ${week})`}
        titleExtra={
          <button
            onClick={() =>
              exportCsv(
                `daily-ops-weekly-kpi-${scope.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-w${week}.csv`,
                ["KPI", "Target", ...past.map((w) => `W${w}`)],
                measureRows.map((m) => [m.label, m.kpi ? targetText(m) : "", ...past.map((w) => { const v = valueOf(m, w); return v == null ? "" : m.count ? v : Math.round(v * 100000) / 100000; })])
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV
          </button>
        }
        columns={pastColumns}
        rows={measureRows}
        rowKey={(m) => m.key}
        footer="Green = on target, red ▲ = missing the target. Each scope is judged against its region's targets (East Coast and East Malaysia differ for some KPIs); rates are shown as the sheet has them."
      />

      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <div className="font-display text-sm font-medium text-slate-700">{scope.name} — trend</div>
          <select className={selectClass} value={tk.key} onChange={(e) => setTrendKpi(e.target.value)} aria-label="KPI">
            {kpis.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <TrendChart
          labels={trendWeeks.map((w) => `W${w}`)}
          zeroBased={false}
          format={(v) => `${v.toFixed(decimals)}%`}
          series={[
            { key: "v", name: tk.label, tone: "brand", values: trendVals },
            ...(tk.target != null ? [{ key: "t", name: `Target ${targetText(tk)}`, tone: "slate", dashed: true, values: trendWeeks.map(() => tk.target * 100) }] : []),
          ]}
          height={220}
        />
      </div>

      {scope.level !== "station" && (
        <DataTable
          key={`heat-${scope.key}-${week}`}
          title={`Stations in ${scope.name} — week ${week} (click a header to sort; worst first)`}
          titleExtra={
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-weekly-kpi-stations-w${week}.csv`,
                  ["Station", "Zone", "Total Routed", ...kpis.map((k) => k.label)],
                  heatSorted.map((r) => [r.name, r.zone, r.routed ?? "", ...kpis.map((k) => (r[k.key] == null ? "" : Math.round(r[k.key] * 100000) / 100000))])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          }
          maxHeight="65vh"
          columns={heatColumns}
          rows={heatSorted}
          rowKey={(r) => r.key}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onRowClick={(r) => setScopeKey(r.key)}
          emptyMessage="No stations for this week."
          footer={`${heatSorted.length} stations · click a station to open its own past-4-weeks view.`}
        />
      )}
    </div>
  );
}
