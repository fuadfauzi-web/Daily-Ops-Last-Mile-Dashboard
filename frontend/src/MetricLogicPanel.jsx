import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Skeleton from "./components/Skeleton";

// Superadmin -> Metric Logic Summary (2026-10-08 feedback): for every Station Health column, where the number comes from and
// the exact rule the backend applies, so the numbers can be double-checked. The text comes from the backend
// (backend/metric_logic.py, admin only) so it is not part of the public bundle.
export default function MetricLogicPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .metricLogic()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    if (!s) return data.metrics;
    return data.metrics.filter((m) => [m.label, m.key, m.group, m.source, ...m.logic, ...m.notes].join(" ").toLowerCase().includes(s));
  }, [data, q]);

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-ink">How Station Health is built</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.how.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a metric, query or rule…"
          className="h-9 w-72 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand focus:outline-none"
        />
        <span className="text-xs text-slate-400">
          {shown.length} of {data.metrics.length} metrics · same order as the Station Health columns
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((m) => (
          <div key={m.key} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-sm font-bold text-ink">{m.label}</span>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{m.key}</code>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{m.group}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.tn_list ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {m.tn_list ? "click shows tracking numbers" : "no tracking-number list"}
              </span>
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Source</div>
            <div className="text-xs text-slate-600">{m.source}</div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rule</div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {m.logic.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Zone / region rows</div>
            <div className="text-xs text-slate-600">{m.rollup}</div>
            {m.notes.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 rounded-lg bg-amber-50 p-2 pl-6 text-xs text-amber-900">
                {m.notes.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
