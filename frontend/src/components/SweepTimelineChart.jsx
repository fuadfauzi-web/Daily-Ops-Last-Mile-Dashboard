import { useMemo, useState } from "react";

// Hour-of-day trend of three events on one chart (2026-09-24 feedback): when
// parcels were first scanned in at the station (1st_sweep_at_WM_station_datetime,
// column H), when they got their first delivery attempt, and when they succeeded.
// `timelines` is one {sweep, attempt, success} row per station (each a 24-entry
// list, index = hour of day) -- the caller passes only the stations left after the
// region/zone/station filters, this sums them. Plain inline SVG, no charting
// library in this app.
const SERIES = [
  { key: "sweep", label: "Scan-in (sweep)", stroke: "stroke-brand", fill: "fill-brand", dot: "bg-brand" },
  { key: "attempt", label: "1st attempt", stroke: "stroke-status-warning", fill: "fill-status-warning", dot: "bg-status-warning" },
  { key: "success", label: "Success", stroke: "stroke-status-good", fill: "fill-status-good", dot: "bg-status-good" },
];

function formatHour(h) {
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ampm}`;
}

function niceMax(v) {
  if (v <= 10) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export default function SweepTimelineChart({ timelines }) {
  const [hidden, setHidden] = useState({});

  const totals = useMemo(() => {
    const out = { sweep: Array(24).fill(0), attempt: Array(24).fill(0), success: Array(24).fill(0) };
    for (const t of timelines) {
      for (const s of SERIES) {
        for (let h = 0; h < 24; h++) out[s.key][h] += t[s.key][h] || 0;
      }
    }
    return out;
  }, [timelines]);

  const grand = SERIES.reduce((a, s) => a + totals[s.key].reduce((x, y) => x + y, 0), 0);
  if (grand === 0) {
    return <div className="p-4 text-center text-sm text-slate-400">No timing data for the current filter.</div>;
  }

  const visible = SERIES.filter((s) => !hidden[s.key]);
  const width = 720;
  const height = 200;
  const padLeft = 40;
  const padRight = 8;
  const padBottom = 24;
  const padTop = 10;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const dataMax = Math.max(1, ...visible.flatMap((s) => totals[s.key]));
  const yMax = niceMax(dataMax);
  const x = (h) => padLeft + ((h + 0.5) / 24) * plotW;
  const y = (v) => padTop + plotH - (v / yMax) * plotH;

  const stats = (key) => {
    const arr = totals[key];
    const total = arr.reduce((a, b) => a + b, 0);
    if (total === 0) return { total, peak: null };
    const max = Math.max(...arr);
    return { total, peak: arr.indexOf(max), peakCount: max };
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {SERIES.map((s) => {
          const st = stats(s.key);
          const off = hidden[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))}
              className={`flex items-center gap-1.5 text-left ${off ? "opacity-40" : ""}`}
              title="Click to show / hide this line"
            >
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className="font-semibold text-slate-700">{s.label}</span>
              <span className="text-slate-500">
                {st.total.toLocaleString()}
                {st.peak !== null && ` · peak ${formatHour(st.peak)} (${st.peakCount.toLocaleString()})`}
              </span>
            </button>
          );
        })}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Scan-in, first attempt and success by hour of day">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padLeft} x2={width - padRight} y1={y(yMax * f)} y2={y(yMax * f)} className="stroke-slate-200" strokeWidth="1" />
            <text x={padLeft - 4} y={y(yMax * f) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
              {Math.round(yMax * f).toLocaleString()}
            </text>
          </g>
        ))}
        {Array.from({ length: 24 }, (_, h) =>
          h % 3 === 0 ? (
            <text key={h} x={x(h)} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[9px]">
              {formatHour(h)}
            </text>
          ) : null
        )}
        {visible.map((s) => (
          <g key={s.key}>
            <polyline
              fill="none"
              strokeWidth="2"
              strokeLinejoin="round"
              className={s.stroke}
              points={totals[s.key].map((v, h) => `${x(h)},${y(v)}`).join(" ")}
            />
            {totals[s.key].map((v, h) => (
              <circle key={h} cx={x(h)} cy={y(v)} r={v > 0 ? 2.5 : 0} className={s.fill} />
            ))}
          </g>
        ))}
        {/* One full-height hover strip per hour so the tooltip lists all three values. */}
        {Array.from({ length: 24 }, (_, h) => (
          <rect key={h} x={padLeft + (h / 24) * plotW} y={padTop} width={plotW / 24} height={plotH} fill="transparent">
            <title>
              {formatHour(h)}
              {SERIES.map((s) => `\n${s.label}: ${totals[s.key][h].toLocaleString()}`).join("")}
            </title>
          </rect>
        ))}
      </svg>
    </div>
  );
}
