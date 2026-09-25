import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import DataTable from "./components/DataTable";
import MultiSelect from "./components/MultiSelect";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";
import TrendChart, { TONE_ORDER } from "./components/TrendChart";
import { exportCsv } from "./lib/csv";
import { ALL_COLUMNS } from "./lib/metrics";

// DoD Dashboard (staging; managers and admins only for now): past numbers for management -- one snapshot per station per day (the
// last refresh of the day, i.e. the run before midnight, after 11:30pm), kept for this week and last week. Two ways to read it:
//   * Daily View      pick a day, see every region / zone / station with the numbers below, and the change from the day before.
//   * Weekly Overview pick one or more measures and see them across Mon-Sun -- this week, last week, or both.
// Everything follows the filters above the tabs.
//
// Where each Daily View number comes from (2026-09-26 feedback):
//   Shipment Details   Total Fresh, Fresh Unscan, Latlong
//   Station Health     Total 0 Attempt, In Hub, Age >3
//   Route Monitoring   Attendance, Total Routed, Success Rate, Pending in Apps (= Current OVFD, the parcels still on a vehicle)

const dec1 = (v) => (Math.round(v * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const int = (v) => Math.round(v).toLocaleString();
const pct1 = (v) => `${dec1(v)}%`;

// good: which direction is an improvement ("higher" | "lower" | null = just a volume). rate: plotted with a hugging axis.
const DAILY_COLS = [
  { key: "fresh", label: "Total Fresh", src: "Shipment Details", fmt: int, good: null, decimals: 0 },
  { key: "freshUnscan", label: "Fresh Unscan", src: "Shipment Details", fmt: int, good: "lower", decimals: 0 },
  { key: "latlong", label: "Latlong", src: "Shipment Details", fmt: int, good: "lower", decimals: 0 },
  { key: "zeroAttempt", label: "Total 0 Attempt", src: "Station Health", fmt: int, good: "lower", decimals: 0 },
  { key: "inHub", label: "In Hub", src: "Station Health", fmt: int, good: "lower", decimals: 0 },
  { key: "ageGt3", label: "Age >3", src: "Station Health", fmt: int, good: "lower", decimals: 0 },
  { key: "attendance", label: "Attendance", src: "Route Monitoring", fmt: int, good: null, decimals: 0 },
  { key: "routed", label: "Total Routed", src: "Route Monitoring", fmt: int, good: null, decimals: 0 },
  { key: "successRate", label: "Success Rate", src: "Route Monitoring", fmt: pct1, good: "higher", decimals: 1, rate: true },
  { key: "pending", label: "Pending in Apps", src: "Route Monitoring", fmt: int, good: "lower", decimals: 0, note: "Current OVFD -- parcels still on a vehicle" },
];
// More measures for the Weekly Overview only.
const COVERED = new Set(["total_fresh", "total_routed", "attendance", "total_in_hub", "zero_attempt_total", "age_gt3", "routed_pct", "cod_pct_hub", "still_ovfd"]);
const EXTRA_MEASURES = [
  { key: "productivity", label: "Productivity", src: "Route Monitoring", fmt: dec1, good: "higher", decimals: 1, rate: true },
  { key: "success", label: "Total Success", src: "Route Monitoring", fmt: int, good: "higher", decimals: 0 },
  { key: "completion", label: "Completion Rate", src: "Route Monitoring", fmt: pct1, good: "higher", decimals: 1, rate: true },
  ...ALL_COLUMNS.filter((c) => !COVERED.has(c.key)).map((c) => ({ key: `m:${c.key}`, label: c.label, src: "Station Health", fmt: int, good: "lower", decimals: 0 })),
];
const MEASURES = [...DAILY_COLS, ...EXTRA_MEASURES];
const MEASURE_OPTIONS = MEASURES.map((m) => ({ value: m.key, label: `${m.label} · ${m.src}` }));

const sum = (rows, k) => rows.reduce((s, r) => s + (r.metrics[k] || 0), 0);
function summarize(rows) {
  const routed = sum(rows, "total_routed");
  const attendance = sum(rows, "attendance");
  const success = sum(rows, "current_success");
  const ovfd = sum(rows, "current_ovfd");
  const raw = {};
  rows.forEach((r) => Object.keys(r.metrics).forEach((k) => (raw[k] = (raw[k] || 0) + r.metrics[k])));
  return {
    fresh: sum(rows, "total_fresh"),
    freshUnscan: sum(rows, "fresh_unscan"),
    latlong: sum(rows, "latlong"),
    zeroAttempt: sum(rows, "zero_attempt_total"),
    inHub: sum(rows, "total_in_hub"),
    ageGt3: sum(rows, "age_gt3"),
    attendance,
    rescue: sum(rows, "attendance_rescue"),
    routed,
    successRate: routed ? (success / routed) * 100 : 0,
    pending: ovfd,
    success,
    productivity: attendance ? routed / attendance : 0,
    completion: routed ? ((routed - ovfd) / routed) * 100 : 0,
    raw,
  };
}
const valueOf = (m, s) => (m.key.startsWith("m:") ? s.raw[m.key.slice(2)] || 0 : s[m.key]);

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
const groupOf = (level, r) =>
  level === "region" ? { key: r.region, name: r.region } : level === "zone" ? { key: r.zone, name: r.zone, region: r.region } : { key: r.station_code, name: r.station_name, region: r.region, zone: r.zone };

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
  const [measureKeys, setMeasureKeys] = useState(["successRate"]);
  const [weeks, setWeeks] = useState("both"); // "both" | "this" | "last"
  const [tableKeys, setTableKeys] = useState(null); // measures whose detail tables are shown; null = all picked
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
        No history yet. The DoD Dashboard keeps one snapshot per station per day (the last refresh of the day) for this week and last week, starting from the
        first refresh after it went live.
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
  const levelLabel = LEVELS.find((l) => l.key === level).label;

  // -------------------------------------------------------------------------- Daily View
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
            const live = d === data.today;
            return (
              <button
                key={d}
                type="button"
                disabled={!has}
                onClick={() => setDay(d)}
                title={has ? `${dayLabel(d)}${live ? " -- today so far: updates with every refresh, final after 11:30pm" : ""}` : `${dayLabel(d)} -- no data`}
                className={`min-h-[36px] rounded-lg border px-2 py-1 font-display text-xs font-medium ${
                  active ? "border-brand bg-brand text-white" : has ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "border-slate-200 bg-slate-50 text-slate-300"
                }`}
              >
                {weekday(d)} {parseDay(d).getDate()}
                {live && has && <span className="ml-1 text-[9px] font-normal opacity-80">live</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  const dailyView = () => {
    const list = groups
      .map((g) => ({ key: g.key, name: g.name, region: g.region, zone: g.zone, cur: g.days.get(activeDay) || null, prev: prevDay ? g.days.get(prevDay) || null : null }))
      .filter((g) => g.cur);
    const total = { key: "__total", name: "Total in view", cur: totalDays.get(activeDay), prev: prevDay ? totalDays.get(prevDay) : null, isTotal: true };
    const validKeys = ["name", ...DAILY_COLS.map((k) => k.key)];
    const sk = sortKey && validKeys.includes(sortKey) ? sortKey : "inHub";
    const sorted = [...list].sort((a, b) => {
      const col = DAILY_COLS.find((k) => k.key === sk);
      const av = sk === "name" ? a.name : valueOf(col, a.cur);
      const bv = sk === "name" ? b.name : valueOf(col, b.cur);
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortKey ? (sortDir === "asc" ? cmp : -cmp) : -cmp; // default: most in hub first
    });
    const tableRows = total.cur ? [total, ...sorted] : sorted;
    const columns = [
      { key: "name", label: levelLabel, sticky: true, align: "left", render: (r) => (r.isTotal ? <span className="font-display font-bold uppercase tracking-wide text-ink">{r.name}</span> : r.name) },
      ...(level !== "region" ? [{ key: "region", label: "Region", sortable: false, className: () => "text-slate-500", render: (r) => r.region || "" }] : []),
      ...(level === "station" ? [{ key: "zone", label: "Zone", sortable: false, className: () => "text-slate-500", render: (r) => r.zone || "" }] : []),
      ...DAILY_COLS.map((k) => ({
        key: k.key,
        label: (
          <span title={k.note || k.src}>
            <span className="block text-[9px] font-normal normal-case leading-tight opacity-60">{k.src}</span>
            {k.label}
          </span>
        ),
        render: (r) => (
          <>
            <div>{k.key === "attendance" && r.cur.rescue > 0 ? `${int(r.cur.attendance)} (${int(r.cur.rescue)} Rescue)` : k.fmt(valueOf(k, r.cur))}</div>
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
        ["Day", "Date", "Region", "Zone", "Station", ...DAILY_COLS.map((k) => `${k.label} (${k.src})`), "Rescue Attendance"],
        stationRows.map((r) => {
          const s = summarize([r]);
          return [weekday(activeDay), activeDay, r.region, r.zone, r.station_name, ...DAILY_COLS.map((k) => (k.rate ? Math.round(valueOf(k, s) * 100) / 100 : valueOf(k, s))), s.rescue];
        })
      );
    };
    return (
      <div className="space-y-3">
        {chips}
        <DataTable
          key={`daily-${level}`}
          title={`${dayLabel(activeDay)}${activeDay === data.today ? " (today so far)" : ""} — by ${levelLabel.toLowerCase()}${prevDay ? `, change vs ${dayLabel(prevDay)}` : ""}`}
          titleExtra={
            <button onClick={exportRows} className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
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
              {list.length} row{list.length === 1 ? "" : "s"} · each day is the last refresh of that day (after 11:30pm); today's numbers are still moving. Pending in Apps = Current OVFD
              (parcels still on a vehicle). Success Rate = Total Success ÷ Total Routed. ▲/▼ is the change from the day before
              {prevDay ? ` (${dayLabel(prevDay)})` : " (none yet)"}, green when it is an improvement.
            </>
          }
        />
      </div>
    );
  };

  // -------------------------------------------------------------------------- Weekly Overview
  const picks = measureKeys.map((k) => MEASURES.find((m) => m.key === k)).filter(Boolean);
  const shownWeeks = weeks === "both" ? [["last", lastWeek], ["this", thisWeek]] : weeks === "this" ? [["this", thisWeek]] : [["last", lastWeek]];
  const shownDays = shownWeeks.flatMap(([, list]) => list);
  const weeklyView = () => {
    const valueFor = (m, dayMap, d) => (dayMap.has(d) ? valueOf(m, dayMap.get(d)) : null);
    const avgOf = (m, dayMap, list) => {
      const vals = list.map((d) => valueFor(m, dayMap, d)).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const entries = [{ key: "__total", name: "Total in view", dayMap: totalDays, isTotal: true }, ...groups.map((g) => ({ key: g.key, name: g.name, region: g.region, zone: g.zone, dayMap: g.days }))];
    const chosen = entries.find((e) => e.key === picked) || entries[0];

    // Chart: one line per measure per week; each measure on its own scale (its real values are in the labels / hover box).
    const series = picks.flatMap((m, mi) =>
      shownWeeks.map(([w, list]) => ({
        key: `${m.key}:${w}`,
        group: picks.length > 1 ? m.key : undefined, // one measure keeps a real, labelled axis; several are each scaled on their own
        name: `${m.label}${shownWeeks.length > 1 ? (w === "this" ? " · this week" : " · last week") : ""}`,
        tone: TONE_ORDER[mi % TONE_ORDER.length],
        dashed: shownWeeks.length > 1 && w === "last",
        faded: shownWeeks.length > 1 && w === "last",
        zeroBased: !m.rate,
        format: m.fmt,
        values: list.map((d) => valueFor(m, chosen.dayMap, d)),
      }))
    );

    const tableMeasures = picks.filter((m) => (tableKeys ? tableKeys.includes(m.key) : true));
    const sk = sortKey && ["name", "avg"].includes(sortKey) ? sortKey : null;
    const measureTable = (m) => {
      const withAvg = entries.map((e) => ({ ...e, avg: avgOf(m, e.dayMap, shownDays) }));
      const body = withAvg.filter((e) => !e.isTotal);
      if (sk) {
        body.sort((a, b) => {
          const av = sk === "name" ? a.name : a.avg;
          const bv = sk === "name" ? b.name : b.avg;
          if (av == null || bv == null) return av == null && bv == null ? 0 : av == null ? 1 : -1;
          const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
          return sortDir === "asc" ? cmp : -cmp;
        });
      } else {
        body.sort((a, b) => (b.avg ?? -Infinity) - (a.avg ?? -Infinity));
      }
      const tableRows = [withAvg[0], ...body];
      const thisAvg = (e) => avgOf(m, e.dayMap, thisWeek);
      const lastAvg = (e) => avgOf(m, e.dayMap, lastWeek);
      const columns = [
        { key: "name", label: levelLabel, sticky: true, align: "left", render: (e) => (e.isTotal ? <span className="font-display font-bold uppercase tracking-wide text-ink">{e.name}</span> : e.name) },
        ...shownDays.map((d) => ({
          key: `d:${d}`,
          label: shortLabel(d),
          sortable: false,
          render: (e) => {
            const v = valueFor(m, e.dayMap, d);
            return v == null ? <span className="text-slate-300">—</span> : m.fmt(v);
          },
          className: () => (thisWeek.includes(d) ? "text-slate-800" : "text-slate-500"),
        })),
        { key: "avg", label: "Avg / day", render: (e) => (e.avg == null ? "—" : m.fmt(e.avg)), className: () => "font-medium text-slate-800" },
        ...(weeks === "both"
          ? [
              {
                key: "delta",
                label: "This vs last wk",
                sortable: false,
                render: (e) => (thisAvg(e) != null && lastAvg(e) != null ? <Delta kpi={m} cur={thisAvg(e)} prev={lastAvg(e)} /> : "—"),
              },
            ]
          : []),
      ];
      return (
        <DataTable
          key={`weekly-${level}-${m.key}-${weeks}`}
          title={`${m.label} by day — ${levelLabel.toLowerCase()}s (click a row to draw it above)`}
          titleExtra={
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-dod-${m.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
                  [levelLabel, ...shownDays.map((d) => `${weekday(d)} ${d}`), "Avg / day"],
                  tableRows.map((e) => [
                    e.name,
                    ...shownDays.map((d) => {
                      const v = valueFor(m, e.dayMap, d);
                      return v == null ? "" : Math.round(v * 100) / 100;
                    }),
                    e.avg == null ? "" : Math.round(e.avg * 100) / 100,
                  ])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          }
          maxHeight="60vh"
          columns={columns}
          rows={tableRows}
          rowKey={(e) => e.key}
          rowClassName={(e) => (e.key === chosen.key ? "bg-brand/10" : e.isTotal ? "bg-slate-100" : "")}
          onRowClick={(e) => setPicked(e.key)}
          sortKey={sk}
          sortDir={sortDir}
          onSort={toggleSort}
          emptyMessage="No rows match."
          footer={`${m.src}${m.note ? ` · ${m.note}` : ""}. A blank day (—) has no snapshot yet; the average is over the days that have data.`}
        />
      );
    };

    return (
      <div className="space-y-3">
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xs font-semibold text-slate-700">Measures:</span>
            <div className="w-64">
              <MultiSelect
                options={MEASURE_OPTIONS}
                value={measureKeys}
                onChange={(next) => {
                  setMeasureKeys(next);
                  setTableKeys(null);
                }}
                placeholder="Pick measures"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {picks.map((m, i) => (
                <span key={m.key} className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 font-display text-[11px] font-semibold text-white">
                  <span className={`inline-block h-2 w-2 rounded-full ${["bg-brand", "bg-sky-500", "bg-amber-500", "bg-violet-500", "bg-teal-500", "bg-status-good", "bg-indigo-500", "bg-slate-400"][i % 8]}`} />
                  {m.label}
                  <button
                    type="button"
                    onClick={() => {
                      setMeasureKeys(measureKeys.filter((k) => k !== m.key));
                      setTableKeys(null);
                    }}
                    className="text-white/70 hover:text-white"
                    aria-label={`Remove ${m.label}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              options={[
                { key: "both", label: "Last week + this week" },
                { key: "this", label: "This week" },
                { key: "last", label: "Last week" },
              ]}
              value={weeks}
              onChange={setWeeks}
            />
            {picks.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-display font-semibold text-slate-700">Show tables for:</span>
                {picks.map((m) => {
                  const on = tableKeys ? tableKeys.includes(m.key) : true;
                  return (
                    <label key={m.key} className="flex min-h-[36px] items-center gap-1">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const cur = tableKeys || picks.map((p) => p.key);
                          setTableKeys(on ? cur.filter((k) => k !== m.key) : [...cur, m.key]);
                        }}
                      />
                      {m.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {picks.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">Pick at least one measure above.</div>
        ) : (
          <>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <div className="mb-1 font-display text-sm font-medium text-slate-700">
                {chosen.name} — {picks.map((m) => m.label).join(", ")} · {weeks === "both" ? "last week vs this week" : weeks === "this" ? "this week" : "last week"}
              </div>
              {picks.length > 1 && <div className="mb-1 text-[11px] text-slate-400">Each measure is scaled on its own so counts and % can share the chart; hover a day for the real numbers.</div>}
              <TrendChart
                labels={shownWeeks[0][1].map((d) => weekday(d))}
                series={series}
                zeroBased={picks.length === 1 && !picks[0].rate}
                format={picks.length === 1 ? picks[0].fmt : undefined}
                height={picks.length > 1 ? 240 : 200}
              />
            </div>
            {tableMeasures.map(measureTable)}
          </>
        )}
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
