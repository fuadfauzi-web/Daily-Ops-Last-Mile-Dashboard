import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import MultiSelect from "../components/MultiSelect";
import SegmentedControl from "../components/SegmentedControl";
import Skeleton from "../components/Skeleton";
import TrendChart, { TONE_ORDER } from "../components/TrendChart";
import { int, pct1, selectClass } from "./fmt";

// Shared pieces of the RCA pages (Invalid POD, COD RTS): a table that sorts by the right thing, a data hook, cards, and the date-trend panel.

// "12 (3.4%)" -- a count with its share. The column holding it should sort by the SHARE (see SortTable's sortValue), not by the count.
export const withPct = (count, pct) => `${int(count)} (${pct1(pct)})`;

const compare = (a, b) => {
  if (a == null || b == null) return a == null && b == null ? 0 : a == null ? 1 : -1;
  return typeof a === "string" || typeof b === "string" ? String(a).localeCompare(String(b)) : a - b;
};

// A DataTable that owns its sort. A column may give `sortValue: (row) => number | string` -- what its header sorts by. A column that shows a count
// AND a % ("12 (3.4%)") gives the % there, so clicking its header ranks by the % (Fleet Manager, 2026-09-26). `text: true` = first click sorts A-Z.
// Long tables draw `pageSize` rows at a time (Show more), which keeps big pages quick to open.
export function SortTable({ columns, rows, defaultSort, pageSize = 100, ...rest }) {
  const [sort, setSort] = useState(defaultSort || { key: columns[0].key, dir: "desc" });
  const col = columns.find((c) => c.key === sort.key);
  const value = col?.sortValue || ((r) => r[sort.key]);
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (sort.dir === "asc" ? 1 : -1) * compare(value(a), value(b))), // eslint-disable-line react-hooks/exhaustive-deps
    [rows, sort, col] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <DataTable
      {...rest}
      columns={columns}
      rows={sorted}
      pageSize={pageSize}
      sortKey={sort.key}
      sortDir={sort.dir}
      onSort={(key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: columns.find((c) => c.key === key)?.text ? "asc" : "desc" }))}
    />
  );
}

// Loads something and keeps the last answer on screen while the next one loads (no flicker when a filter changes).
export function useApi(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let dead = false;
    setState((s) => ({ ...s, loading: true }));
    loader()
      .then((data) => !dead && setState({ data, error: null, loading: false }))
      .catch((e) => !dead && setState({ data: null, error: e.message, loading: false }));
    return () => {
      dead = true;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

export function Cards({ items, cols = "sm:grid-cols-4" }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${cols}`}>
      {items.map(([t, v, note]) => (
        <div key={t} className="rounded-lg border-l-4 border-brand bg-white px-3 py-2 ring-1 ring-slate-200">
          <div className="text-[10px] font-bold uppercase text-slate-500">{t}</div>
          <div className="mt-0.5 font-display text-base font-black text-ink">{v}</div>
          {note && <div className="text-[10px] text-slate-400">{note}</div>}
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, right, children }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="mb-2 flex items-baseline justify-between gap-2 border-b-2 border-brand pb-1">
        <div className="font-display text-xs font-bold uppercase tracking-wide text-ink">{title}</div>
        {right && <div className="text-[10px] text-slate-400">{right}</div>}
      </div>
      {children}
    </div>
  );
}

export function TabsBar({ tabs, value, onChange }) {
  return (
    <div className="min-w-0 max-w-full">
      <SegmentedControl options={tabs} value={value} onChange={onChange} />
    </div>
  );
}

export function Loading({ error, children }) {
  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  return children || <Skeleton />;
}

const dayLabel = (d) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;

// The date trend: per-day lines for a few regions / zones / stations / drivers (or reasons) picked from a list -- by default the top ones.
//   levels   [{ key, label }]              load(level, keys) -> { has_data, days, all, series: [{ key, label, ...arrays }], options: [{ key, label, ... }] }
//   metrics  [{ key, label, value: (series, i) => number | null, fmt, zeroBased }]   what one line shows per day
export function TrendPanel({ levels, load, metrics, filterKey, note, targetLine }) {
  const [level, setLevel] = useState(levels[0].key);
  const [keys, setKeys] = useState([]);
  const [metricKey, setMetricKey] = useState(metrics[0].key);
  useEffect(() => setKeys([]), [level, filterKey]);
  const { data, error, loading } = useApi(() => load(level, keys), [level, keys.join("|"), filterKey]);
  const metric = metrics.find((m) => m.key === metricKey) || metrics[0];

  if (error) return <Loading error={error} />;
  if (!data) return <Skeleton />;
  if (data.has_dates === false) {
    return <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">No dates in the uploaded file(s), so there is no trend to draw yet.</div>;
  }
  if (!data.has_data && data.has_data !== undefined) return <div className="rounded-xl bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200">No data.</div>;

  const drawn = [data.all, ...data.series];
  const days = data.days;
  const labels = data.labels || days.map(dayLabel); // weeks / months come with their own labels (W38, Aug); days are d/m
  const names = data.names || days;
  const grainName = { week: "week", month: "month" }[data.grain] || "day";
  const lines = drawn.map((s, si) => ({
    key: s.key,
    name: s.label,
    tone: si === 0 ? "slate" : TONE_ORDER[(si - 1) % TONE_ORDER.length],
    dashed: si === 0,
    zeroBased: metric.zeroBased,
    values: days.map((_d, i) => metric.value(s, i)),
    format: metric.fmt,
  }));
  // dashed "Target" line(s) across the days, when the page has one: a number, or several when the targets differ by region (one line per distinct target)
  const tl = targetLine ? targetLine(data, metric) : null;
  const targets = (Array.isArray(tl) ? tl : [tl]).filter((v) => v != null);
  targets.forEach((v) =>
    lines.push({ key: `__target__${v}`, name: targets.length > 1 ? `Target ${metric.fmt(v)}` : "Target", tone: "good", dashed: true, zeroBased: metric.zeroBased, values: days.map(() => v), format: metric.fmt })
  );
  const options = (data.options || []).map((o) => ({
    value: o.key,
    label: `${o.label}${o.invalid != null ? ` · ${int(o.invalid)}` : o.count != null ? ` · ${int(o.count)}` : o.rate != null ? ` · ${o.rate}%` : ""}`,
  }));
  const picked = keys.length ? keys : data.series.map((s) => s.key);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <TabsBar tabs={levels} value={level} onChange={setLevel} />
        <div className="w-72">
          <MultiSelect options={options} value={picked} onChange={(next) => setKeys(next.slice(0, 8))} placeholder={`Pick ${level}s (top ${data.series.length} shown)`} />
        </div>
        {keys.length > 0 && (
          <button onClick={() => setKeys([])} className="text-xs font-medium text-slate-500 underline hover:text-brand">
            Back to the top ones
          </button>
        )}
        {metrics.length > 1 && <TabsBar tabs={metrics.map((m) => ({ key: m.key, label: m.label }))} value={metric.key} onChange={setMetricKey} />}
        {loading && <span className="text-xs text-slate-400">Loading…</span>}
      </div>
      <Panel title={`${metric.label} per ${grainName} — ${levels.find((l) => l.key === level)?.label.toLowerCase()} view`} right={typeof note === "function" ? note(data) : note}>
        {days.length ? <TrendChart labels={labels} series={lines} zeroBased={metric.zeroBased} format={metric.fmt} height={260} /> : <div className="p-6 text-center text-sm text-slate-400">No {grainName}s to draw.</div>}
        <div className="mt-1 text-[11px] text-slate-400">Dashed grey = everything in view. Pick up to 8 from the list; hover a {grainName} for the numbers.</div>
      </Panel>
      <DataTable
        title={`${metric.label} by ${grainName}`}
        maxHeight="420px"
        columns={[
          { key: "day", label: { week: "Week", month: "Month" }[data.grain] || "Date", sticky: true, align: "left", sortable: false, render: (r) => r.day },
          ...drawn.map((s, si) => ({ key: s.key, label: s.label, sortable: false, render: (r) => (r.vals[si] == null ? "—" : metric.fmt(r.vals[si])) })),
        ]}
        rows={days.map((d, i) => ({ day: names[i], vals: drawn.map((s) => metric.value(s, i)) }))}
        rowKey={(r) => r.day}
        pageSize={60}
        emptyMessage={`No ${grainName}s.`}
      />
    </div>
  );
}


// View (Weekly / Monthly / Daily) + Period, the way Hybrid Productivity has them (Fleet Manager, 2026-09-26). `periods` = { weekly: [...], monthly: [...], daily: [...] } as
// the backend lists them (kpi_periods.py: weeks are Monday-Sunday, numbered like Excel's WEEKNUM(d, 2); the option marked default is the newest complete one, the current
// month for Daily); `period` = the key of the one shown.
export const VIEWS = [["weekly", "Weekly"], ["monthly", "Monthly"], ["daily", "Daily"]];
export function PeriodControls({ periods, view, period, onView, onPeriod, disabled }) {
  const list = periods?.[view] || [];
  return (
    <>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
        View
        <select className={selectClass} value={view} onChange={(e) => onView(e.target.value)}>
          {VIEWS.map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
        Period
        <select className={selectClass} value={period || ""} onChange={(e) => onPeriod(e.target.value)} disabled={disabled}>
          {list.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </label>
    </>
  );
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekday = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();

// A row-by-day grid (stations, drivers ...) with a total row on top: one column per day of the period, Sundays shaded. Sortable by the name, any day or an extra column.
//   days       ["2026-09-01", ...]
//   rows       [{ key, name, zone, ... }]                  allRow  the same shape, drawn first ("All stations")
//   cell       (row, i) => { text, className?, title? }    what day i shows for a row
//   valueOf    (row, i) => number | null                   what a day column sorts by
//   extraCols  [{ key, label, render(row), sortValue(row) }]   columns after the days (period total ...)
export function DailyGrid({ title, titleExtra, days, rows, allRow, cell, valueOf, extraCols = [], firstLabel = "Station", showZone = true, footer, maxHeight = "600px", rowClassName, onRowClick }) {
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const sortValue = (r) => {
    if (sort.key === "name") return r.name;
    if (sort.key === "zone") return r.zone;
    if (sort.key.startsWith("day:")) return valueOf(r, Number(sort.key.slice(4)));
    return extraCols.find((c) => c.key === sort.key)?.sortValue?.(r);
  };
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (sort.dir === "asc" ? 1 : -1) * compare(sortValue(a), sortValue(b))), // eslint-disable-line react-hooks/exhaustive-deps
    [rows, sort]
  );
  const click = (key, text) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: text ? "asc" : "desc" }));
  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : "");
  const th = "cursor-pointer select-none whitespace-nowrap px-2 py-2 font-display font-medium hover:bg-brand";
  const renderRow = (r, strong) => (
    <tr
      key={strong ? "__all__" : r.key}
      onClick={!strong && onRowClick ? () => onRowClick(r) : undefined}
      className={`border-t border-slate-100 ${strong ? "bg-slate-100 font-semibold" : rowClassName ? rowClassName(r) : ""} ${!strong && onRowClick ? "cursor-pointer hover:bg-slate-50/60" : ""}`}
    >
      <td className={`sticky left-0 z-10 whitespace-nowrap px-3 py-1.5 font-medium text-slate-800 ${strong ? "bg-slate-100" : "bg-white"}`}>{r.name}</td>
      {showZone && <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{strong ? "" : r.zone}</td>}
      {days.map((d, i) => {
        const c = cell(r, i) || {};
        return (
          <td key={d} title={c.title} className={`whitespace-nowrap px-2 py-1.5 text-center tabular-nums ${weekday(d) === 0 ? "bg-slate-50" : ""} ${c.className || "text-slate-700"}`}>
            {c.text ?? "—"}
          </td>
        );
      })}
      {extraCols.map((c) => (
        <td key={c.key} className="whitespace-nowrap border-l border-slate-100 px-2 py-1.5 text-center tabular-nums text-slate-700">{c.render(r)}</td>
      ))}
    </tr>
  );
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      {(title || titleExtra) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="min-w-0 pr-3 font-display text-sm font-medium text-slate-700">{title}</div>
          {titleExtra}
        </div>
      )}
      <div className="overflow-auto overscroll-x-contain" style={{ maxHeight }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-20 bg-ink text-left text-white">
            <tr>
              <th className={`${th} sticky left-0 z-30 bg-ink px-3`} onClick={() => click("name", true)}>{firstLabel}{arrow("name")}</th>
              {showZone && <th className={th} onClick={() => click("zone", true)}>Zone{arrow("zone")}</th>}
              {days.map((d, i) => (
                <th key={d} title={d} className={`${th} text-center leading-tight ${weekday(d) === 0 ? "bg-slate-700" : ""}`} onClick={() => click(`day:${i}`, false)}>
                  {Number(d.slice(8))}
                  <div className="text-[9px] font-normal text-slate-300">{WEEKDAY[weekday(d)]}{arrow(`day:${i}`)}</div>
                </th>
              ))}
              {extraCols.map((c) => (
                <th key={c.key} className={`${th} border-l border-slate-600 text-center`} onClick={() => click(c.key, false)}>{c.label}{arrow(c.key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRow && renderRow(allRow, true)}
            {sorted.map((r) => renderRow(r, false))}
            {!rows.length && (
              <tr>
                <td colSpan={days.length + extraCols.length + (showZone ? 2 : 1)} className="px-4 py-6 text-center text-slate-400">Nothing in this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">{footer}</div>}
    </div>
  );
}
