import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import BarChart from "./components/BarChart";
import DataTable from "./components/DataTable";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";
import TrendChart from "./components/TrendChart";
import { exportCsv } from "./lib/csv";
import { formatTime } from "./lib/format";
import KpiUploadPanel from "./kpi/KpiUploadPanel";
import MetabaseCheck from "./kpi/MetabaseCheck";
import WeeklyDashboard from "./kpi/WeeklyDashboard";
import OpexResult from "./kpi/OpexResult";
import InvalidPodRca from "./kpi/InvalidPodRca";
import CodRtsRca from "./kpi/CodRtsRca";

// KPI Dashboard (2026-09-26, staging). The KPI page is the RCA side of the KPIs: the OPEX team's dashboard shows the RESULT (a %), this
// shows WHY -- with the numbers and the tracking numbers behind them. Three parts:
//   Results       Weekly Dashboard (the team's WoW dashboard) and OPEX Result (the OPEX team's results, merged in later)
//   RCA details   one page per KPI: Hybrid Productivity, Invalid POD, COD RTS (others listed as "soon")
// Data: uploaded files (admins, "Data upload") or Metabase where a question exists -- see backend/kpi.py, kpi_rca.py.

const MODULES = [
  { key: "weekly", label: "Weekly Dashboard", group: "Results", live: true },
  { key: "opex", label: "OPEX Result", group: "Results", live: true },
  { key: "hybrid", label: "Hybrid Productivity", group: "RCA details", live: true },
  { key: "invalidPod", label: "Invalid POD", group: "RCA details", live: true },
  { key: "codRts", label: "COD RTS", group: "RCA details", live: true },
  { key: "prior", label: "Prior KPI", group: "RCA details" },
  { key: "fifod0", label: "FIFO D0 KPI", group: "RCA details" },
  { key: "terminalT7", label: "Terminal T7", group: "RCA details" },
  { key: "compD0", label: "Completion D0", group: "RCA details" },
  { key: "compD3", label: "Completion D3", group: "RCA details" },
];

const int = (v) => Math.round(v).toLocaleString();
const dec1 = (v) => (Math.round(v * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const avg = (list, k) => (list.length ? list.reduce((s, r) => s + r[k], 0) / list.length : 0);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const niceDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

// "1 Yrs 2 Mos 3 Days" from an employment start date -- same wording as the sheet.
function tenureText(start) {
  if (!start) return "-";
  const s = new Date(`${start}T00:00:00`);
  if (Number.isNaN(s.getTime())) return "-";
  const now = new Date();
  if (s > now) return "0d";
  let years = now.getFullYear() - s.getFullYear();
  let months = now.getMonth() - s.getMonth();
  let days = now.getDate() - s.getDate();
  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const parts = [];
  if (years > 0) parts.push(`${years} Yrs`);
  if (months > 0) parts.push(`${months} Mos`);
  if (days > 0 || !parts.length) parts.push(`${days} Days`);
  return parts.join(" ");
}
const tenureDays = (start) => {
  if (!start) return 0;
  const s = new Date(`${start}T00:00:00`);
  const ms = Date.now() - s.getTime();
  return Number.isNaN(ms) || ms < 0 ? 0 : Math.floor(ms / 86400000);
};

function useSort(defKey, defDir = "desc") {
  const [key, setKey] = useState(defKey);
  const [dir, setDir] = useState(defDir);
  const toggle = (k) => {
    if (k === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setKey(k);
      setDir(["name", "station", "zone"].includes(k) ? "asc" : "desc");
    }
  };
  return { key, dir, toggle };
}
const sortBy = (rows, key, dir) =>
  [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const c = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return dir === "asc" ? c : -c;
  });

const selectClass = "h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 focus:border-brand focus:outline-none";

function Card({ title, right, children }) {
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

function ComingSoon({ label }) {
  return (
    <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
      <div className="font-display text-base font-semibold text-ink">{label}</div>
      <p className="mt-2">
        Not built yet. This KPI will be added once its Metabase question and logic are set up -- the layout (controls, cards, tables and charts) is the same as
        Hybrid Productivity.
      </p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Hybrid Productivity
function HybridProductivity({ me }) {
  const [view, setView] = useState("weekly");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("latest");
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [station, setStation] = useState("all");
  const [search, setSearch] = useState("");
  const [sub, setSub] = useState("driver");
  const [pickedDriver, setPickedDriver] = useState(null);
  const [pickedStation, setPickedStation] = useState(null);
  const [pickedZone, setPickedZone] = useState("all");
  const [pickedDaily, setPickedDaily] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const canRefresh = me.role === "admin" || me.role === "manager";
  const canUpload = me.role === "admin";
  const load = (refresh = false) => {
    setLoading(true);
    setError(null);
    api
      .kpiHybrid(view, refresh)
      .then((d) => {
        setData(d);
        setPeriod("latest");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const prefix = view === "monthly" ? "M" : "W";
  const target = view === "monthly" ? 26 : 6; // attendance days that count as full attendance
  const drivers = data?.drivers || [];

  const recs = useMemo(
    () =>
      (data?.rows || []).map(([p, di, delivered, onRoute, att, prod, succ]) => {
        const d = drivers[di];
        return { period: p, name: d.name, station: d.station, zone: d.zone, region: d.region, position: d.position, start: d.start, delivered, onRoute, att, prod, succ };
      }),
    [data] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dailyRecs = useMemo(
    () =>
      (data?.daily || []).map(([day, di, delivered, onRoute, succ]) => ({ day, name: drivers[di].name, station: drivers[di].station, zone: drivers[di].zone, region: drivers[di].region, delivered, onRoute, succ })),
    [data] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const regionOptions = useMemo(() => [...new Set(drivers.map((d) => d.region))].filter((r) => r !== "Unknown").sort(), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const zoneOptions = useMemo(
    () => [...new Set(drivers.filter((d) => region === "all" || d.region === region).map((d) => d.zone))].filter((z) => z !== "Unknown").sort(),
    [data, region] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const stationOptions = useMemo(
    () =>
      [...new Set(drivers.filter((d) => (region === "all" || d.region === region) && (zone === "all" || d.zone === zone)).map((d) => d.station))].sort(),
    [data, region, zone] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const s = search.trim().toLowerCase();
  const match = (r) =>
    (region === "all" || r.region === region) && (zone === "all" || r.zone === zone) && (station === "all" || r.station === station) && (!s || r.name.toLowerCase().includes(s));
  const filtered = useMemo(() => recs.filter(match), [recs, region, zone, station, s]); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredDaily = useMemo(() => dailyRecs.filter(match), [dailyRecs, region, zone, station, s]); // eslint-disable-line react-hooks/exhaustive-deps

  const periods = useMemo(() => [...new Set(recs.map((r) => r.period))].sort((a, b) => b - a), [recs]);
  const targetPeriod = period === "latest" ? periods[0] : Number(period);
  const current = useMemo(() => {
    const seen = new Set();
    return filtered.filter((r) => r.period === targetPeriod && !seen.has(r.name) && seen.add(r.name));
  }, [filtered, targetPeriod]);
  const latestPeriod = periods[0];
  const latestRows = useMemo(() => {
    const seen = new Set();
    return filtered.filter((r) => r.period === latestPeriod && !seen.has(r.name) && seen.add(r.name));
  }, [filtered, latestPeriod]);

  const withTenure = (rows) => rows.map((r) => ({ ...r, tenure: tenureText(r.start), tenureDays: tenureDays(r.start) }));
  const attClass = (v) => (Math.round(v) < target ? "font-bold text-status-critical" : "text-slate-700");

  const groupBy = (rows, keyFn) => {
    const m = new Map();
    rows.forEach((r) => {
      const k = keyFn(r);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    });
    return m;
  };
  const summarize = (rows) => ({
    drivers: rows.length,
    hd: rows.filter((r) => r.position === "HD").length,
    hr: rows.filter((r) => r.position === "HR").length,
    delivered: rows.reduce((a, r) => a + r.delivered, 0),
    succ: avg(rows, "succ"),
    att: avg(rows, "att"),
    prod: avg(rows, "prod"),
  });
  // Average productivity per period for any slice of the history (the trend lines).
  const trendOf = (rows) => {
    const by = groupBy(rows, (r) => r.period);
    const ps = [...by.keys()].sort((a, b) => a - b);
    return { labels: ps.map((p) => `${prefix}${p}`), values: ps.map((p) => Math.round(avg(by.get(p), "prod") * 100) / 100) };
  };

  // ---- KPI cards
  const cards = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {[
        ["Active Drivers", <>{int(current.length)} <span className="text-[11px] font-normal text-slate-500">({current.filter((r) => r.position === "HD").length} HD / {current.filter((r) => r.position === "HR").length} HR)</span></>],
        ["Parcels On Route", int(current.reduce((a, r) => a + r.onRoute, 0))],
        ["Delivered + PU", int(current.reduce((a, r) => a + r.delivered, 0))],
        ["Avg Success %", `${dec1(avg(current, "succ"))}%`],
        ["Avg Attendance", `${Math.round(avg(current, "att"))}d`],
        ["Avg Productivity", dec1(avg(current, "prod"))],
      ].map(([t, v]) => (
        <div key={t} className="rounded-lg border-l-4 border-brand bg-white px-3 py-2 ring-1 ring-slate-200">
          <div className="text-[10px] font-bold uppercase text-slate-500">{t}</div>
          <div className="mt-0.5 font-display text-lg font-black text-ink">{v}</div>
        </div>
      ))}
    </div>
  );

  // ---- shared driver table columns
  const driverColumns = (opts = {}) => [
    ...(opts.rank ? [{ key: "rank", label: "Rank" }] : []),
    { key: "name", label: "Name", sticky: true, align: "left", render: (r) => <b>{r.name}</b> },
    { key: "tenureDays", label: opts.tenureLabel || "Tenure", render: (r) => r.tenure },
    ...(opts.noStation ? [] : [{ key: "station", label: "Station", className: () => "text-slate-600" }]),
    { key: "onRoute", label: "On Route", render: (r) => int(r.onRoute) },
    { key: "delivered", label: "Del + PU", render: (r) => int(r.delivered) },
    { key: "succ", label: "Success %", render: (r) => `${dec1(r.succ)}%` },
    { key: "att", label: "Attendance", render: (r) => `${Math.round(r.att)}d`, className: (r) => attClass(r.att) },
    { key: "prod", label: "Productivity", render: (r) => dec1(r.prod), className: () => "font-black text-ink" },
  ];

  // -------------------------------------------------------------------------------- Driver Performance
  const driverSort = useSort("prod");
  const DriverPerformance = () => {
    const ranked = sortBy(withTenure(current), "prod", "desc").map((r, i) => ({ ...r, rank: i + 1 }));
    const rows = driverSort.key === "rank" ? sortBy(ranked, "prod", driverSort.dir) : sortBy(ranked, driverSort.key, driverSort.dir);
    const chosen = ranked.find((r) => r.name === pickedDriver) || ranked[0];
    const history = chosen ? filtered.filter((r) => r.name === chosen.name).sort((a, b) => a.period - b.period) : [];
    const days = chosen ? filteredDaily.filter((r) => r.name === chosen.name).sort((a, b) => a.day.localeCompare(b.day)).slice(-14) : [];
    return (
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <DataTable
          title="Driver Leaderboard"
          titleExtra={<span className="text-[10px] text-slate-400">click headers to sort · row for trends</span>}
          maxHeight="480px"
          columns={driverColumns({ rank: true })}
          rows={rows}
          rowKey={(r) => r.name}
          rowClassName={(r) => (chosen && r.name === chosen.name ? "bg-brand/10" : "")}
          onRowClick={(r) => setPickedDriver(r.name)}
          sortKey={driverSort.key}
          sortDir={driverSort.dir}
          onSort={driverSort.toggle}
          emptyMessage="No drivers match."
          footer={`${rows.length} drivers · ${prefix}${targetPeriod ?? "-"} · attendance below ${target}d is red`}
        />
        <div className="space-y-3">
          <Card title={`${chosen ? chosen.name : "Driver"} — productivity trend`}>
            <TrendChart labels={history.map((r) => `${prefix}${r.period}`)} series={[{ key: "p", name: "Productivity", tone: "brand", values: history.map((r) => Math.round(r.prod * 100) / 100) }]} format={dec1} zeroBased={false} />
          </Card>
          <Card title={`${chosen ? chosen.name : "Driver"} — 2-week daily trend`}>
            <BarChart
              labels={days.map((r) => r.day.slice(5).replace("-", "/"))}
              series={[
                { key: "on", name: "On Route", tone: "slate", values: days.map((r) => r.onRoute) },
                { key: "del", name: "Delivered + PU", tone: "brand", values: days.map((r) => r.delivered) },
              ]}
            />
          </Card>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------------- Station Performance
  const stationSort = useSort("prod");
  const StationPerformance = () => {
    const by = groupBy(current, (r) => r.station);
    const list = [...by.entries()].map(([name, rows]) => ({ name, zone: rows[0].zone, ...summarize(rows) }));
    const rows = sortBy(list, stationSort.key, stationSort.dir);
    const chosen = list.find((r) => r.name === pickedStation) || rows[0];
    const stationDrivers = chosen ? sortBy(withTenure(by.get(chosen.name) || []), "prod", "desc") : [];
    const trend = chosen ? trendOf(filtered.filter((r) => r.station === chosen.name)) : { labels: [], values: [] };
    const columns = [
      { key: "name", label: "Station", sticky: true, align: "left", render: (r) => <b>{r.name}</b> },
      { key: "zone", label: "Zone", className: () => "text-slate-600" },
      { key: "drivers", label: "Drivers (HD / HR)", render: (r) => `${r.drivers} (${r.hd} HD / ${r.hr} HR)` },
      { key: "delivered", label: "Delivered", render: (r) => int(r.delivered) },
      { key: "succ", label: "Success %", render: (r) => `${dec1(r.succ)}%` },
      { key: "att", label: "Avg Attendance", render: (r) => `${Math.round(r.att)}d`, className: (r) => attClass(r.att) },
      { key: "prod", label: "Avg Prod", render: (r) => dec1(r.prod), className: () => "font-black text-ink" },
    ];
    return (
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <DataTable
            title="Station Overview"
            titleExtra={<span className="text-[10px] text-slate-400">click headers to sort · click a station</span>}
            maxHeight="300px"
            columns={columns}
            rows={rows}
            rowKey={(r) => r.name}
            rowClassName={(r) => (chosen && r.name === chosen.name ? "bg-brand/10" : "")}
            onRowClick={(r) => setPickedStation(r.name)}
            sortKey={stationSort.key}
            sortDir={stationSort.dir}
            onSort={stationSort.toggle}
            emptyMessage="No stations match."
          />
          <Card title={`${chosen ? chosen.name : "Station"} — productivity trend`}>
            <TrendChart labels={trend.labels} series={[{ key: "p", name: "Avg Productivity", tone: "brand", values: trend.values }]} format={dec1} zeroBased={false} height={230} />
          </Card>
        </div>
        <DataTable
          title={`${chosen ? chosen.name : "Station"} — drivers leaderboard`}
          maxHeight="260px"
          columns={driverColumns({ noStation: true, tenureLabel: "Service Duration" }).filter((c) => c.key !== "rank")}
          rows={stationDrivers}
          rowKey={(r) => r.name}
          emptyMessage="No drivers for this station."
        />
      </div>
    );
  };

  // -------------------------------------------------------------------------------- Regional Breakdown
  const RegionalBreakdown = () => {
    const byZone = groupBy(current, (r) => r.zone);
    const zoneRows = [...byZone.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, rows]) => ({ name, stations: new Set(rows.map((r) => r.station)).size, ...summarize(rows) }));
    const total = { name: "All in view", stations: new Set(current.map((r) => r.station)).size, ...summarize(current), isTotal: true };
    const zoneTable = current.length ? [total, ...zoneRows] : [];
    const scopeRows = pickedZone === "all" ? current : current.filter((r) => r.zone === pickedZone);
    const stationRows = [...groupBy(scopeRows, (r) => r.station).entries()].map(([name, rows]) => ({ name, ...summarize(rows) })).sort((a, b) => a.prod - b.prod);
    const low = withTenure(scopeRows).filter((r) => r.prod < 80).sort((a, b) => a.prod - b.prod).slice(0, 10);
    const trend = trendOf(pickedZone === "all" ? filtered : filtered.filter((r) => r.zone === pickedZone));
    const title = pickedZone === "all" ? "All in view" : pickedZone;
    const zoneColumns = [
      { key: "name", label: "Zone", sticky: true, align: "left", render: (r) => <b>{r.name}</b> },
      { key: "stations", label: "Stations" },
      { key: "drivers", label: "Drivers (HD / HR)", render: (r) => `${r.drivers} (${r.hd} HD / ${r.hr} HR)` },
      { key: "delivered", label: "Delivered", render: (r) => int(r.delivered) },
      { key: "succ", label: "Success %", render: (r) => `${dec1(r.succ)}%` },
      { key: "att", label: "Avg Attendance", render: (r) => `${Math.round(r.att)}d`, className: (r) => attClass(r.att) },
      { key: "prod", label: "Avg Prod", render: (r) => dec1(r.prod), className: () => "font-black text-ink" },
    ];
    const stationColumns = zoneColumns.filter((c) => c.key !== "stations").map((c) => (c.key === "name" ? { ...c, label: "Station" } : c));
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <DataTable
            title="Zone Summary"
            titleExtra={<span className="text-[10px] text-slate-400">click a zone to filter</span>}
            maxHeight="260px"
            columns={zoneColumns}
            rows={zoneTable}
            rowKey={(r) => r.name}
            rowClassName={(r) => (r.isTotal ? (pickedZone === "all" ? "bg-brand/10" : "bg-slate-100") : r.name === pickedZone ? "bg-brand/10" : "")}
            onRowClick={(r) => setPickedZone(r.isTotal ? "all" : r.name)}
            emptyMessage="No data."
          />
          <DataTable title={`${title} — station leaderboard`} maxHeight="260px" columns={stationColumns} rows={stationRows} rowKey={(r) => r.name} emptyMessage="No data found." />
        </div>
        <div className="space-y-3">
          <Card title={`${title} — productivity trend`}>
            <TrendChart labels={trend.labels} series={[{ key: "p", name: "Avg Productivity", tone: "brand", values: trend.values }]} format={dec1} zeroBased={false} height={210} />
          </Card>
          <DataTable
            title={`${title} — top 10 low performers (prod < 80)`}
            maxHeight="260px"
            columns={[
              { key: "name", label: "Name", sticky: true, align: "left", render: (r) => <b>{r.name}</b> },
              { key: "station", label: "Station" },
              { key: "delivered", label: "Delivered", render: (r) => int(r.delivered) },
              { key: "succ", label: "Success %", render: (r) => `${dec1(r.succ)}%` },
              { key: "prod", label: "Productivity", render: (r) => dec1(r.prod), className: () => "font-black text-ink" },
            ]}
            rows={low}
            rowKey={(r) => r.name}
            emptyMessage="No drivers with productivity below 80."
          />
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------------- Daily Data (latest period)
  const dailySort = useSort("prod");
  const DailyData = () => {
    const ranked = sortBy(withTenure(latestRows), "prod", "desc").map((r, i) => ({ ...r, rank: i + 1 }));
    const rows = dailySort.key === "rank" ? sortBy(ranked, "prod", dailySort.dir) : sortBy(ranked, dailySort.key, dailySort.dir);
    const chosen = ranked.find((r) => r.name === pickedDaily) || ranked[0];
    const logs = chosen ? filteredDaily.filter((r) => r.name === chosen.name).sort((a, b) => b.day.localeCompare(a.day)) : [];
    const chrono = [...logs].reverse();
    return (
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <DataTable
          title={`Current ${view === "monthly" ? "month" : "week"} driver leaderboard (${prefix}${latestPeriod ?? "-"})`}
          titleExtra={<span className="text-[10px] text-slate-400">always the latest period · click headers to sort</span>}
          maxHeight="520px"
          columns={driverColumns({ rank: true, tenureLabel: "Service Duration" })}
          rows={rows}
          rowKey={(r) => r.name}
          rowClassName={(r) => (chosen && r.name === chosen.name ? "bg-brand/10" : "")}
          onRowClick={(r) => setPickedDaily(r.name)}
          sortKey={dailySort.key}
          sortDir={dailySort.dir}
          onSort={dailySort.toggle}
          emptyMessage="No drivers match."
        />
        <div className="space-y-3">
          <DataTable
            title={`${chosen ? chosen.name : "Driver"} — daily log breakdown`}
            maxHeight="230px"
            columns={[
              { key: "day", label: "Date", sortable: false, render: (r) => niceDate(r.day) },
              { key: "onRoute", label: "On Route", sortable: false, render: (r) => int(r.onRoute) },
              { key: "delivered", label: "Del + PU", sortable: false, render: (r) => int(r.delivered) },
              { key: "succ", label: "Success %", sortable: false, render: (r) => `${dec1(r.succ)}%` },
            ]}
            rows={logs}
            rowKey={(r) => r.day}
            emptyMessage="No daily logs found."
          />
          <Card title={`${chosen ? chosen.name : "Driver"} — daily delivery volume trend`}>
            <TrendChart
              labels={chrono.map((r) => r.day.slice(5).replace("-", "/"))}
              series={[
                { key: "on", name: "On Route", tone: "slate", values: chrono.map((r) => r.onRoute) },
                { key: "del", name: "Delivered + PU", tone: "brand", values: chrono.map((r) => r.delivered) },
              ]}
              format={int}
              height={220}
            />
          </Card>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------------- shell
  const controls = (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
        View
        <select className={selectClass} value={view} onChange={(e) => setView(e.target.value)}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
        Period
        <select className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="latest">Latest</option>
          {periods.map((p) => (
            <option key={p} value={p}>
              {view === "monthly" ? "Month" : "Week"} {p}
            </option>
          ))}
        </select>
      </label>
      <select className={selectClass} value={region} onChange={(e) => { setRegion(e.target.value); setZone("all"); setStation("all"); }} aria-label="Region">
        <option value="all">All regions</option>
        {regionOptions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select className={selectClass} value={zone} onChange={(e) => { setZone(e.target.value); setStation("all"); }} aria-label="Zone">
        <option value="all">All zones</option>
        {zoneOptions.map((z) => (
          <option key={z} value={z}>{z}</option>
        ))}
      </select>
      <select className={selectClass} value={station} onChange={(e) => setStation(e.target.value)} aria-label="Station">
        <option value="all">All stations</option>
        {stationOptions.map((st) => (
          <option key={st} value={st}>{st}</option>
        ))}
      </select>
      <input className={`${selectClass} w-44 font-normal`} placeholder="Search driver…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <button
        onClick={() => load(canRefresh)}
        disabled={loading}
        title={canRefresh ? "Re-run the Metabase questions" : "Reload"}
        className="h-9 rounded-lg bg-brand px-3 font-display text-xs font-semibold uppercase text-white disabled:opacity-50"
      >
        {loading ? "Loading…" : "Refresh data"}
      </button>
      {data?.sources && Object.keys(data.sources).length > 0 && (
        <span className="text-xs text-slate-400" title={Object.entries(data.sources).map(([k, v]) => `${k}: ${v}`).join("\n")}>
          Source: {[...new Set(Object.values(data.sources).map((s) => (s.startsWith("uploaded") ? "uploaded file" : s)))].join(" + ")}
          {data.fetched_at ? ` · ${formatTime(data.fetched_at)}` : ""}
        </span>
      )}
      {canUpload && (
        <button onClick={() => setShowUpload((v) => !v)} className="h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
          {showUpload ? "Hide data upload" : "Data upload"}
        </button>
      )}
      <button
        onClick={() =>
          exportCsv(
            `daily-ops-kpi-hybrid-${view}-${prefix}${targetPeriod ?? ""}.csv`,
            ["Driver", "Station", "Zone", "Region", "Start date", "On Route", "Delivered + PU", "Success %", "Attendance (days)", "Productivity"],
            current.map((r) => [r.name, r.station, r.zone, r.region, r.start || "", r.onRoute, r.delivered, r.succ.toFixed(2), r.att, r.prod.toFixed(2)])
          )
        }
        disabled={!current.length}
        className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        Export CSV
      </button>
    </div>
  );

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.has_data) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">No Hybrid Productivity data yet</div>
          <p className="mt-2">
            The data comes from the Metabase questions "Hybrid Weekly / Monthly / Daily Apps - All Regions" (127194, 127195, 127196) and "Hybrid Data Current Year - All Regions" (127193). While the app's own Metabase link is being
            sorted out, an admin can <strong>upload the downloaded files</strong> below -- that works today and is used instead of Metabase until removed.
          </p>
          {data.error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-status-critical">Metabase said: {data.error}</p>}
        </div>
        <KpiUploadPanel kpi="hybrid" me={me} onChanged={() => load(false)} />
        {me.role === "admin" && (
          <div className="space-y-2 rounded-xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            <div className="font-display text-sm font-semibold text-ink">Connect Metabase (admins)</div>
            <p>
              The app calls Metabase with the <code className="rounded bg-slate-100 px-1">METABASE_API_KEY</code> secret. HTTP 401 means Metabase did not recognise the key -- press the button
              for a plain-English reason.
            </p>
            <p className="text-xs text-slate-500">
              Note: the app reads the four <strong>All Regions</strong> copies of the team's saved questions (the Southern filter removed, everything else the same). They sit in a personal Metabase collection,
              so the API key's user needs access to it -- or move the four questions to a shared collection the key's group can see.
            </p>
            <MetabaseCheck />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {controls}
      {showUpload && <KpiUploadPanel kpi="hybrid" me={me} onChanged={() => load(false)} />}
      {data.error && <div className="rounded-xl bg-white p-3 text-sm text-status-critical ring-1 ring-slate-200">{data.error}</div>}
      {!recs.length && !data.error ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">No hybrid data for your scope yet.</div>
      ) : (
        <>
          {cards}
          <SegmentedControl
            options={[
              { key: "driver", label: "Driver Performance" },
              { key: "station", label: "Station Performance" },
              { key: "regional", label: "Regional Breakdown" },
              { key: "daily", label: "Daily Data (Current Month)" },
            ]}
            value={sub}
            onChange={setSub}
          />
          {sub === "driver" && <DriverPerformance />}
          {sub === "station" && <StationPerformance />}
          {sub === "regional" && <RegionalBreakdown />}
          {sub === "daily" && <DailyData />}
        </>
      )}
    </div>
  );
}

export default function KpiDashboard({ me }) {
  const [module, setModule] = useState("weekly");
  const active = MODULES.find((m) => m.key === module);
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <aside className="shrink-0 md:w-56">
        <div className="overflow-hidden rounded-xl border-r-4 border-brand bg-ink text-white">
          <div className="border-b border-white/10 px-4 py-3 text-center font-display text-xs font-black uppercase tracking-wider text-brand">KPI Dashboard</div>
          <nav className="flex overflow-x-auto md:block">
            {MODULES.map((m, i) => (
              <div key={m.key} className="contents">
                {(i === 0 || MODULES[i - 1].group !== m.group) && (
                  <div className="hidden px-4 pb-1 pt-3 text-[9px] font-bold uppercase tracking-widest text-slate-500 md:block">{m.group}</div>
                )}
              <button
                onClick={() => setModule(m.key)}
                className={`flex min-h-[44px] w-full shrink-0 items-center justify-between gap-2 whitespace-nowrap border-l-4 px-4 py-2 text-left font-display text-[11px] font-bold uppercase ${
                  module === m.key ? "border-brand bg-white/10 text-white" : "border-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                {m.label}
                {!m.live && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold normal-case text-slate-300">soon</span>}
              </button>
              </div>
            ))}
          </nav>
        </div>
      </aside>
      <section className="min-w-0 flex-1 space-y-3">
        <h2 className="font-display text-lg font-black uppercase tracking-wide text-brand">{active.label}</h2>
        {module === "weekly" ? (
          <WeeklyDashboard me={me} />
        ) : module === "opex" ? (
          <OpexResult me={me} />
        ) : module === "hybrid" ? (
          <HybridProductivity me={me} />
        ) : module === "invalidPod" ? (
          <InvalidPodRca me={me} />
        ) : module === "codRts" ? (
          <CodRtsRca me={me} />
        ) : (
          <ComingSoon label={active.label} />
        )}
      </section>
    </div>
  );
}
