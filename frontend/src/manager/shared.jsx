import { useEffect, useMemo, useState } from "react";

// Shared bits of the Manager Dashboard: number formats, the yellow "typed in by the manager" cell, region filter and the sort + total-row helper.
export const int = (v) => (v == null ? "—" : Math.round(v).toLocaleString());
export const dec1 = (v) => (v == null ? "—" : (Math.round(v * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
export const pct = (num, den) => (den ? (num / den) * 100 : null);
export const pct1 = (v) => (v == null ? "—" : `${dec1(v)}%`);
export const sumOf = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
// a figure that is missing on EVERY row stays missing in the total (so "no file yet" shows a dash, not a 0)
export const sumOrNull = (rows, f) => (rows.some((r) => f(r) != null) ? sumOf(rows, f) : null);

// The sheet's yellow cells: a number a manager types in. Saved when the cell loses focus (or Enter) and only if it changed.
export function PlanInput({ value, onSave, label }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  const commit = () => {
    const n = v === "" ? null : Math.max(0, Math.round(Number(v)));
    if (n !== (value ?? null) && !(n != null && Number.isNaN(n))) onSave(n);
    else setV(value ?? "");
  };
  return (
    <input
      type="number"
      min="0"
      inputMode="numeric"
      aria-label={label}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="w-20 rounded border border-amber-300 bg-amber-50 px-1.5 py-1 text-center text-sm tabular-nums text-ink focus:border-brand focus:outline-none"
    />
  );
}

// Region filter (only when the person can see more than one region) + the scope chip.
export function ScopeBar({ scope, locked, regions, region, setRegion, note, children }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600" title={locked ? "You are limited to your own region" : "Every region"}>
        {locked ? `Your region: ${scope}` : scope}
      </span>
      {regions.length > 1 && (
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2 text-sm text-ink"
          aria-label="Region"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      )}
      {children}
      {note && <span className="text-xs text-status-warning">{note}</span>}
    </div>
  );
}

// Sort rows by a column's `val`; no sort key = the order they came in (region, zone, station).
export function useSortedRows(rows, columns) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const onSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "station_name" ? "asc" : "desc");
    }
  };
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.val) return rows;
    return [...rows].sort((a, b) => {
      const av = col.val(a);
      const bv = col.val(b);
      if (av == null || bv == null) return av == null && bv == null ? 0 : av == null ? 1 : -1; // a missing figure always sits at the bottom
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sortKey, sortDir]);
  return { sorted, sortKey, sortDir, onSort };
}

export function SourcesNote({ sources, today }) {
  const item = (label, v) => (
    <span key={label}>
      {label}: <span className={v ? "text-slate-500" : "text-status-warning"}>{v || "not loaded yet"}</span>
    </span>
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
      {item("Drivers file", sources.drivers)}
      {item("Active 2 weeks", sources.active_2w)}
      {item("Active 4 weeks", sources.active_4w)}
      <span>Today&apos;s numbers: {sources.snapshot_day ? `from ${sources.snapshot_day}` : "none yet"}</span>
    </div>
  );
}
