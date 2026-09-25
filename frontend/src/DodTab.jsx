import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import DataTable from "./components/DataTable";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";
import TrendChart from "./components/TrendChart";
import { exportCsv } from "./lib/csv";
import { ALL_COLUMNS } from "./lib/metrics";

// DoD Dashboard (2026-09-26, staging): past Station Health for management / regions / stations -- one snapshot per station
// per day (the last refresh of the day), kept for the current week + last week. Two ways to read it:
//   * Daily View      the "LM Backlogged Performance" Daily View sheet: pick a day, see every station / zone / region for
//                     that day, with the change from the day before.
//   * Weekly Overview one measure across the two weeks (Mon-Sun, last week beside this week) for every row, with a
//                     week-over-week line for the row you pick.
// Everything is scoped to what the viewer may see, and follows the filters above the tabs.
//
// How the numbers map (from the sheet): Current Backlogged = In Hub at the day's last refresh; Total Success = Current
// Success from Route Monitoring; Success Rate = Total Success / Total Routed; Productivity = Total Routed / Attendance.

const dec1 = (v) => (Math.round(v * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const int = (v) => Math.round(v).toLocaleString();
const pct1 = (v) => `${dec1(v)}%`;

// good: which direction is an improvement ("higher" | "lower" | null = just a volume).
const KPIS = [
  { key: "backlog", label: "Current Backlogged", fmt: int, good: "lower", decimals: 0 },
  { key: "fresh", label: "Total Fresh", fmt: int, good: null, decimals: 0 },
  { key: "attendance", label: "Attendance", fmt: int, good: null, decimals: 0 },
  { key: "routed", label: "Total Routed", fmt: int, good: null, decimals: 0 },
  { key: "successRate", label: "Success Rate", fmt: pct1, good: "higher", decimals: 1, rate: true },
  { key: "productivity", label: "Productivity", fmt: dec1, good: "higher", decimals: 1, rate: true },
  { key: "success", label: "Total Success", fmt: int, good: "higher", decimals: 0 },
];
// Extra measures for the Weekly Overview only.
const COVERED = new Set(["total_fresh", "total_routed", "attendance", "total_in_hub", "routed_pct", "cod_pct_hub"]);
const EXTRA_KPIS = [
  { key: "completion", label: "Completion Rate", fmt: pct1, good: "higher", decimals: 1, rate: true },
  ...ALL_COLUMNS.filter((c) => !COVERED.has(c.key)).map((c) => ({ key: `m:${c.key}`, label: c.label, fmt: int, good: "lower", decimals: 0 })),
];
const ALL_KPIS = [...KPIS, ...EXTRA_KPIS];

const sum = (rows, k) => rows.reduce((s, r) => s + (r.metrics[k] || 0), 0);
function summarize(rows) {
  const routed = sum(rows, "total_routed");
  const attendance = sum(rows, "attendance");
  const success = sum(rows, "current_success");
  const ovfd = sum(rows, "current_ovfd");
  const raw = {};
  rows.forEach((r) => Object.keys(r.metrics).forEach((k) => (raw[k] = (raw[k] || 0) + r.metrics[k])));
  return {
    backlog: sum(rows, "total_in_hub"),
    fresh: sum(rows, "total_fresh"),
    attendance,
    rescue: sum(rows, "attendance_rescue"),
    routed,
    success,
    successRate: routed ? (success / routed) * 100 : 0,
    productivity: attendance ? routed / attendance : 0,
    completion: routed ? ((routed - ovfd) / routed) * 100 : 0,
    raw,
    stations: rows.length,
  };
}
const valueOf = (kpi, s) => (kpi.key.startsWith("m:") ? s.raw[kpi.key.slice(2)] || 0 : s[kpi.key]);

// ---- dates (yyyy-mm-dd strings; only ever used for labels / week arithmetic) ----
const parseDay = (s) => new Date(`${s}T00:00:00`);
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s, n) => {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const weekday = (s) => parseDay(s).toLocaleDateString("en-GB", { weekday: "short" });
const dayLabel = (s) => parseDay(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const shortLabel = (s) => `${weekday(s)} ${parseDay(s).getDate()}/${parseDay(s).getMonth() + 1}`;

const LEVELS = [
  { key: "region", label: "Region" },
  { key: "zone", label: "Zone" },
  { key: "station", label: "Station" },
];
const groupOf = (level, r) => (level === "region" ? { key: r.region, name: r.region } : level === "zone" ? { key: r.zone, name: r.zone, region: r.region } : { key: r.station_code, name: r.station_name, region: r.region, zone: r.zone });

// "▲ 2.1" / "▼ 40" next to a value: change from the day before, coloured by whether that is an improvement.
function Delta({ kpi, cur, prev }) {
  if (prev == null) return null;
  const d = cur - prev;
  const eps = kpi.decimals === 0 ? 0.5 : 0.05;
  if (Math.abs(d) < eps) return <div className="text-[10px] font-normal text-slate-400">±0</div>;
  const up = d > 0;
  const good = kpi.good === "higher" ? up : kpi.good === "lower" ? !up : null;
  const tone = good == null ? "text-slate-400" : good ? "text-status-good" : "text-status-critical";
  const text = kpi.decimals === 0 ? Math.round(Math.abs(d)).toLocaleString() : Math.abs(d).toFixed(kpi.decimals);
  return (
    <div className={`text-[10px] font-medium ${tone}`}>
      {up ? "▲" : "▼"} {text}
    </div>
  );
}

export default function DodTab({ stationCodes }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("daily");
  const [level, setLevel] = useState("station");
  const [day, setDay] = useState(null);
  const [kpiKey, setKpiKey] = useState("successRate");
  const [picked, setPicked] = useState("__total");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    let cancelled = false;
    api
      .dod()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => (data ? data.rows.filter((r) => !stationCodes || stationCodes.has(r.station_code)) : []), [data, stationCodes]);
  const days = data?.days || [];
  const activeDay = day && days.includes(day) ? day : days[days.length - 1] || null;
  const prevDay = activeDay ? [...days].reverse().find((d) => d < activeDay) || null : null;

  const byDay = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      if (!m.has(r.day)) m.set(r.day, []);
      m.get(r.day).push(r);
    });
    return m;
  }, [rows]);

  // group key -> { name, region, zone, days: Map(day -> summary) }
  const groups = useMemo(() => {
    const g = new Map();
    rows.forEach((r) => {
      const info = groupOf(level, r);
      if (!g.has(info.key)) g.set(info.key, { ...info, rows: new Map() });
      const e = g.get(info.key);
      if (!e.rows.has(r.day)) e.rows.set(r.day, []);
      e.rows.get(r.day).push(r);
    });
    return Array.from(g.values()).map((e) => ({ ...e, days: new Map(Array.from(e.rows, ([d, rs]) => [d, summarize(rs)])) }));
  }, [rows, level]);
  const totalDays = useMemo(() => new Map(Array.from(byDay, ([d, rs]) => [d, summarize(rs)])), [byDay]);

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!days.length) {
    return (
      <div className="rounded-xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">
        No history yet. The DoD Dashboard keeps one snapshot per station per day (the last refresh of the day) for this week and last week, starting
        from the first refresh after it went live.
      </div>
    );
  }

  const thisWeek = Array.from({ length: 7 }, (_, i) => addDays(data.week_start, i));
  const lastWeek = Array.from({ length: 7 }, (_, i) => addDays(data.week_start, i - 7));
  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const chips = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {[
        ["Last week", lastWeek],
        ["This week", thisWeek],
      ].map(([label, list]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">{label}</span>
          {list.map((d) => {
            const has = days.includes(d);
            const active = d === activeDay;
            return (
              <button
                key={d}
                type="button"
                disabled={!has}
                onClick={() => setDay(d)}
                title={has ? dayLabel(d) : `${dayLabel(d)} -- no data`}
                className={`min-h-[36px] rounded-lg border px-2 py-1 font-display text-xs font-medium ${
                  active ? "border-brand bg-brand text-white" : has ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "border-slate-200 bg-slate-50 text-slate-300"
                }`}
              >
                {weekday(d)} {parseDay(d).getDate()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  // -------------------------------------------------------------------------- Daily View
  const dailyView = () => {
    const list = groups
      .map((g) => ({ key: g.key, name: g.name, region: g.region, zone: g.zone, cur: g.days.get(activeDay) || null, prev: prevDay ? g.days.get(prevDay) || null : null }))
      .filter((g) => g.cur);
    const total = { key: "__total", name: "Total in view", cur: totalDays.get(activeDay), prev: prevDay ? totalDays.get(prevDay) : null, isTotal: true };
    const sk = sortKey && ["name", ...KPIS.map((k) => k.key)].includes(sortKey) ? sortKey : "backlog";
    const sorted = [...list].sort((a, b) => {
      const av = sk === "name" ? a.name : valueOf(KPIS.find((k) => k.key === sk), a.cur);
      const bv = sk === "name" ? b.name : valueOf(KPIS.find((k) => k.key === sk), b.cur);
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortKey ? (sortDir === "asc" ? cmp : -cmp) : -cmp; // default: worst backlog first
    });
    const tableRows = total.cur ? [total, ...sorted] : sorted;
    const columns = [
      { key: "name", label: LEVELS.find((l) => l.key === level).label, sticky: true, align: "left", render: (r) => (r.isTotal ? <span className="font-display font-bold uppercase tracking-wide text-ink">{r.name}</span> : r.name) },
      ...(level !== "region" ? [{ key: "region", label: "Region", sortable: false, className: () => "text-slate-500", render: (r) => r.region || "" }] : []),
      ...(level === "station" ? [{ key: "zone", label: "Zone", sortable: false, className: () => "text-slate-500", render: (r) => r.zone || "" }] : []),
      ...KPIS.map((k) => ({
        key: k.key,
        label: k.label,
        render: (r) => (
          <>
            <div>
              {k.key === "attendance" && r.cur.rescue > 0 ? `${int(r.cur.attendance)} (${int(r.cur.rescue)} Rescue)` : k.fmt(valueOf(k, r.cur))}
            </div>
            <Delta kpi={k} cur={valueOf(k, r.cur)} prev={r.prev ? valueOf(k, r.prev) : null} />
          </>
        ),
        className: () => "text-slate-700",
      })),
    ];
    const exportRows = () => {
      const stationRows = (byDay.get(activeDay) || []).slice().sort((a, b) => (b.metrics.total_in_hub || 0) - (a.metrics.total_in_hub || 0));
      exportCsv(
        `daily-ops-dod-${activeDay}.csv`,
        ["Day", "Date", "Region", "Zone", "Station Name", "Current Backlogged", "Total Fresh", "Attendance", "Rescue Attendance", "Total Routed", "Success Rate", "Productivity", "Total Success"],
        stationRows.map((r) => {
          const s = summarize([r]);
          return [weekday(activeDay), activeDay, r.region, r.zone, r.station_name, s.backlog, s.fresh, s.attendance, s.rescue, s.routed, s.successRate.toFixed(2), s.productivity.toFixed(1), s.success];
        })
      );
    };
    return (
      <div className="space-y-3">
        {chips}
        <DataTable
          key={`daily-${level}`}
          title={`${dayLabel(activeDay)} — by ${LEVELS.find((l) => l.key === level).label.toLowerCase()}${prevDay ? `, change vs ${dayLabel(prevDay)}` : ""}`}
          titleExtra={
            <button
              onClick={exportRows}
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          }
          maxHeight="70vh"
          columns={columns}
          rows={tableRows}
          rowKey={(r) => r.key}
          rowClassName={(r) => (r.isTotal ? "bg-slate-100" : "")}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          emptyMessage="No rows match."
          footer={
            <>
              {list.length} row{list.length === 1 ? "" : "s"} · the day's number is the last refresh of that day. Current Backlogged = In Hub; Success Rate = Total
              Success ÷ Total Routed; Productivity = Total Routed ÷ Attendance. ▲/▼ is the change from the day before
              {prevDay ? ` (${dayLabel(prevDay)})` : " (none yet)"}, green when it is an improvement.
            </>
          }
        />
      </div>
    );
  };

  // -------------------------------------------------------------------------- Weekly Overview
  const kpi = ALL_KPIS.find((k) => k.key === kpiKey) || KPIS[4];
  const weeklyView = () => {
    const valueFor = (dayMap, d) => (dayMap.has(d) ? valueOf(kpi, dayMap.get(d)) : null);
    const avg = (dayMap, list) => {
      const vals = list.map((d) => valueFor(dayMap, d)).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const entries = [{ key: "__total", name: "Total in view", dayMap: totalDays, isTotal: true }, ...groups.map((g) => ({ key: g.key, name: g.name, region: g.region, zone: g.zone, dayMap: g.days }))].map((e) => ({
      ...e,
      lw: avg(e.dayMap, lastWeek),
      tw: avg(e.dayMap, thisWeek),
    }));
    const chosen = entries.find((e) => e.key === picked) || entries[0];
    const sk = sortKey && ["name", "lw", "tw", "delta"].includes(sortKey) ? sortKey : null;
    const body = entries.filter((e) => !e.isTotal);
    if (sk) {
      const get = (e) => (sk === "name" ? e.name : sk === "delta" ? (e.lw != null && e.tw != null ? e.tw - e.lw : null) : e[sk]);
      body.sort((a, b) => {
        const av = get(a);
        const bv = get(b);
        if (av == null || bv == null) return av == null && bv == null ? 0 : av == null ? 1 : -1;
        const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else {
      body.sort((a, b) => (b.tw ?? -Infinity) - (a.tw ?? -Infinity));
    }
    const tableRows = [entries[0], ...body];
    const dayCols = [...lastWeek, ...thisWeek].map((d) => ({
      key: `d:${d}`,
      label: shortLabel(d),
      sortable: false,
      render: (e) => {
        const v = valueFor(e.dayMap, d);
        return v == null ? <span className="text-slate-300">—</span> : kpi.fmt(v);
      },
      className: (e) => (thisWeek.includes(d) ? "text-slate-800" : "text-slate-500"),
    }));
    const columns = [
      { key: "name", label: LEVELS.find((l) => l.key === level).label, sticky: true, align: "left", render: (e) => (e.isTotal ? <span className="font-display font-bold uppercase tracking-wide text-ink">{e.name}</span> : e.name) },
      ...dayCols,
      { key: "lw", label: "Last wk avg", render: (e) => (e.lw == null ? "—" : kpi.fmt(e.lw)), className: () => "text-slate-500" },
      { key: "tw", label: "This wk avg", render: (e) => (e.tw == null ? "—" : kpi.fmt(e.tw)), className: () => "font-medium text-slate-800" },
      {
        key: "delta",
        label: "Change",
        render: (e) => (e.lw != null && e.tw != null ? <Delta kpi={kpi} cur={e.tw} prev={e.lw} /> : "—"),
        className: () => "text-slate-700",
      },
    ];
    const mondayFirst = (list) => list.map((d) => weekday(d));
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Measure
            <select
              value={kpiKey}
              onChange={(e) => setKpiKey(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 focus:border-brand focus:outline-none"
            >
              <optgroup label="Daily performance">
                {KPIS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
                <option value="completion">Completion Rate</option>
              </optgroup>
              <optgroup label="Station Health">
                {EXTRA_KPIS.filter((k) => k.key.startsWith("m:")).map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="mb-1 font-display text-sm font-medium text-slate-700">
            {kpi.label} — {chosen.name}, this week vs last week
          </div>
          <TrendChart
            labels={mondayFirst(thisWeek)}
            zeroBased={!kpi.rate}
            format={(v) => kpi.fmt(v)}
            series={[
              { key: "lw", name: "Last week", tone: "slate", values: lastWeek.map((d) => valueFor(chosen.dayMap, d)) },
              { key: "tw", name: "This week", tone: "brand", values: thisWeek.map((d) => valueFor(chosen.dayMap, d)) },
            ]}
          />
        </div>
        <DataTable
          key={`weekly-${level}-${kpi.key}`}
          title={`${kpi.label} by day — ${LEVELS.find((l) => l.key === level).label.toLowerCase()}s (click a row to draw it above)`}
          titleExtra={
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-dod-${kpi.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
                  [LEVELS.find((l) => l.key === level).label, ...[...lastWeek, ...thisWeek].map((d) => `${weekday(d)} ${d}`), "Last wk avg", "This wk avg"],
                  tableRows.map((e) => [
                    e.name,
                    ...[...lastWeek, ...thisWeek].map((d) => {
                      const v = valueFor(e.dayMap, d);
                      return v == null ? "" : Math.round(v * 100) / 100;
                    }),
                    e.lw == null ? "" : Math.round(e.lw * 100) / 100,
                    e.tw == null ? "" : Math.round(e.tw * 100) / 100,
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
          rows={tableRows}
          rowKey={(e) => e.key}
          rowClassName={(e) => (e.key === chosen.key ? "bg-brand/10" : e.isTotal ? "bg-slate-100" : "")}
          onRowClick={(e) => setPicked(e.key)}
          sortKey={sk}
          sortDir={sortDir}
          onSort={toggleSort}
          emptyMessage="No rows match."
          footer={
            <>
              Last week's Mon–Sun sits beside this week's. A blank day (—) has no snapshot: history starts from the first refresh after the DoD Dashboard went
              live, and only this week and last week are kept. The averages are over the days that have data.
            </>
          }
        />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          options={[
            { key: "daily", label: "Daily View" },
            { key: "weekly", label: "Weekly Overview" },
          ]}
          value={view}
          onChange={(k) => {
            setView(k);
            setSortKey(null);
          }}
        />
        <SegmentedControl
          options={LEVELS}
          value={level}
          onChange={(k) => {
            setLevel(k);
            setSortKey(null);
            setPicked("__total");
          }}
        />
      </div>
      {view === "daily" ? dailyView() : weeklyView()}
    </div>
  );
}
