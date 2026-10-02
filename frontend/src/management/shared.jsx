// Shared bits for the Management View tabs (2026-10-02): number formats, stat tiles, and the day/week rollup that
// Operation Health and Capacity both read from /api/dod (one snapshot per station per Malaysia day, current + last week).

export const int = (v) => Math.round(v || 0).toLocaleString();
export const dec1 = (v) =>
  (Math.round((v || 0) * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const pct = (num, den) => (den ? (num / den) * 100 : 0);
export const sum = (rows, key) => rows.reduce((a, r) => a + (r[key] || 0), 0);

export function StatCard({ label, value, sub, tone }) {
  const border = tone === "bad" ? "border-status-critical" : tone === "warn" ? "border-status-warning" : "border-brand";
  return (
    <div className={`rounded-lg border-l-4 ${border} bg-white px-3 py-2 ring-1 ring-slate-200`}>
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-0.5 font-display text-lg font-black text-ink">{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function Section({ title, note, children, right }) {
  return (
    <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-sm font-bold text-ink">{title}</div>
        <div className="flex items-center gap-3">
          {note && <div className="text-[10px] text-slate-400">{note}</div>}
          {right}
        </div>
      </div>
      {children}
    </div>
  );
}

export function CardRow({ children }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function SubHead({ children }) {
  return <div className="pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</div>;
}

// A row of horizontal bars: [{label, value, sub}] -- bar length is value / max(value).
export function BarList({ items, color = "bg-brand" }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-1">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-xs">
          <div className="w-28 shrink-0 text-slate-600">{i.label}</div>
          <div className="h-3 flex-1 rounded bg-slate-100">
            <div className={`h-3 rounded ${color}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
          <div className="w-44 shrink-0 text-right tabular-nums text-slate-700">{i.text}</div>
        </div>
      ))}
    </div>
  );
}

// ---- dates (yyyy-mm-dd strings) ------------------------------------------------------------
const parseDay = (s) => new Date(`${s}T00:00:00`);
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (s, n) => {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
export const weekStartOf = (s) => {
  const dow = (parseDay(s).getDay() + 6) % 7; // Monday = 0
  return addDays(s, -dow);
};
export const isWeekend = (s) => [0, 6].includes(parseDay(s).getDay());
export const dayLabel = (s) => parseDay(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const weekLabel = (ws) => `Wk ${dayLabelShort(ws)} – ${dayLabelShort(addDays(ws, 6))}`;
const dayLabelShort = (s) => parseDay(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// Yesterday (Malaysia date, `today` from /api/dod) when it has data, otherwise the newest day before today, otherwise the newest day.
export function defaultDay(days, today) {
  const yesterday = addDays(today, -1);
  if (days.includes(yesterday)) return yesterday;
  const earlier = days.filter((d) => d < today);
  return earlier.length ? earlier[earlier.length - 1] : days[days.length - 1] || today;
}

// ---- station-level rollup of dod rows over a set of days -----------------------------------
// Flows (routed, delivered, attendance...) are summed; stock numbers (in hub, 0 attempt, age >3) are the average per day, so a
// week reads on the same scale as a day. Routed % = routed / (routed + in hub), as Station Health defines it.
const FLOW = ["total_routed", "current_success", "current_ovfd", "attendance", "attendance_rescue", "attendance_hd", "attendance_hr", "attendance_id", "attendance_ir", "latlong", "total_fresh"];
const STOCK = ["total_in_hub", "zero_attempt_total", "age_gt3", "on_hold"];

export function stationRollup(rows) {
  const by = new Map();
  rows.forEach((r) => {
    let s = by.get(r.station_code);
    if (!s) {
      s = { station_code: r.station_code, station_name: r.station_name, zone: r.zone, region: r.region, n: 0, lh_trips: [], _inHubSum: 0 };
      FLOW.concat(STOCK).forEach((k) => (s[k] = 0));
      by.set(r.station_code, s);
    }
    s.n += 1;
    FLOW.forEach((k) => (s[k] += r.metrics[k] || 0));
    STOCK.forEach((k) => (s[k] += r.metrics[k] || 0));
    s._inHubSum += r.metrics.total_in_hub || 0;
    if (r.lh_trips?.length) s.lh_trips = s.lh_trips.concat(r.lh_trips);
  });
  return [...by.values()].map((s) => {
    const routedDenom = s.total_routed + s._inHubSum;
    STOCK.forEach((k) => (s[k] = s[k] / s.n));
    s.routed_pct = pct(s.total_routed, routedDenom);
    return s;
  });
}

// The whole-network numbers for a station rollup.
export function networkTotals(stations) {
  const routed = sum(stations, "total_routed");
  const inHub = sum(stations, "total_in_hub");
  const success = sum(stations, "current_success");
  const att = sum(stations, "attendance");
  const hd = sum(stations, "attendance_hd"), hr = sum(stations, "attendance_hr");
  const id = sum(stations, "attendance_id"), ir = sum(stations, "attendance_ir");
  return {
    routed, inHub, success,
    successRate: pct(success, routed),
    routedPct: pct(routed, routed + inHub),
    att, hybrid: hd + hr, independent: id + ir, rescue: sum(stations, "attendance_rescue"),
    splitKnown: hd + hr + id + ir > 0,
    zeroAttempt: sum(stations, "zero_attempt_total"),
    ageGt3: sum(stations, "age_gt3"),
    latlong: sum(stations, "latlong"),
    fresh: sum(stations, "total_fresh"),
  };
}

export const SEVERITY = (s) => (s >= 7 ? "Critical" : s >= 4 ? "Warning" : s > 0 ? "Watch" : "OK");
