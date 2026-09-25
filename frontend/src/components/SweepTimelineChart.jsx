import { useEffect, useMemo, useState } from "react";
import MultiSelect from "./MultiSelect";

// Hour-of-day trend of three events on one chart: when parcels were first
// scanned in at the station (1st_sweep_at_WM_station_datetime, column H), when
// they got their first delivery attempt, and when they succeeded.
//
// Filters (2026-09-25 feedback): the chart has its own Region / Zone / Station
// filters. Left untouched it follows the table's master filters (the stations the
// table above is showing); the moment any chart filter is picked it takes over
// and ignores the master filters until reset. `allStations` is every station the
// user may see, `timelines` the per-station 24-hour counts, `masterCodes` the
// station codes the master filters currently leave in the table.
const SERIES = [
  { key: "sweep", label: "Scan-in", text: "text-brand", stroke: "stroke-brand", fill: "fill-brand", dot: "bg-brand" },
  { key: "attempt", label: "1st attempt", text: "text-status-warning", stroke: "stroke-status-warning", fill: "fill-status-warning", dot: "bg-status-warning" },
  { key: "success", label: "Success", text: "text-status-good", stroke: "stroke-status-good", fill: "fill-status-good", dot: "bg-status-good" },
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

function compact(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;
}

// Smooth line through the points (Catmull-Rom -> cubic Bezier), with the control
// points kept inside the plot so a low value next to a peak can't dip below the
// baseline.
function smoothPath(pts, yMin, yMax) {
  if (pts.length < 2) return "";
  const clampY = (y) => Math.min(yMax, Math.max(yMin, y));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const selectClass =
  "h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 focus:border-brand focus:outline-none";

export default function SweepTimelineChart({ allStations, timelines, masterCodes, excludeEastMalaysia }) {
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [stationCodes, setStationCodes] = useState([]);
  const [hidden, setHidden] = useState({});
  const [hover, setHover] = useState(null);
  // "count": parcels per hour. "pct": each hour as a % of that line's own total, so lines (and stations) of very different
  // size can be compared by shape (2026-09-25 feedback: show % values).
  const [mode, setMode] = useState("count");
  // The SVG is drawn at its real pixel width (measured), not scaled from a fixed viewBox --
  // scaling made the axis text bigger than every other label on the page (2026-09-25 feedback).
  const [wrapEl, setWrapEl] = useState(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    if (!wrapEl) return undefined;
    const measure = () => setWidth(Math.max(320, Math.round(wrapEl.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapEl);
    return () => ro.disconnect();
  }, [wrapEl]);

  const overriding = region !== "all" || zone !== "all" || stationCodes.length > 0;

  const regionOptions = useMemo(
    () => Array.from(new Set(allStations.map((s) => s.region))).filter((r) => !(excludeEastMalaysia && r === "East Malaysia")).sort(),
    [allStations, excludeEastMalaysia]
  );
  const zoneOptions = useMemo(
    () =>
      Array.from(new Set(allStations.filter((s) => region === "all" || s.region === region).map((s) => s.zone)))
        .filter(Boolean)
        .sort(),
    [allStations, region]
  );
  const stationOptions = useMemo(
    () =>
      allStations
        .filter((s) => (region === "all" || s.region === region) && (zone === "all" || s.zone === zone))
        .filter((s) => !(excludeEastMalaysia && region === "all" && s.region === "East Malaysia"))
        .sort((a, b) => a.station_name.localeCompare(b.station_name))
        .map((s) => ({ value: s.station_code, label: s.station_name })),
    [allStations, region, zone, excludeEastMalaysia]
  );

  const selectedCodes = useMemo(() => {
    if (!overriding) return masterCodes;
    if (stationCodes.length) return new Set(stationCodes);
    return new Set(stationOptions.map((o) => o.value));
  }, [overriding, masterCodes, stationCodes, stationOptions]);

  const totals = useMemo(() => {
    const out = { sweep: Array(24).fill(0), attempt: Array(24).fill(0), success: Array(24).fill(0) };
    for (const t of timelines) {
      if (!selectedCodes.has(t.station_code)) continue;
      for (const s of SERIES) for (let h = 0; h < 24; h++) out[s.key][h] += t[s.key][h] || 0;
    }
    return out;
  }, [timelines, selectedCodes]);

  const sums = useMemo(() => Object.fromEntries(SERIES.map((s) => [s.key, totals[s.key].reduce((a, b) => a + b, 0)])), [totals]);
  const share = (key, v) => (sums[key] ? (v / sums[key]) * 100 : 0); // this hour's % of the line's total
  const fmtPct = (p) => `${p.toFixed(1)}%`;
  const plotted = (key, h) => (mode === "pct" ? share(key, totals[key][h]) : totals[key][h]);

  const reset = () => {
    setRegion("all");
    setZone("all");
    setStationCodes([]);
  };

  const stats = (key) => {
    const arr = totals[key];
    const total = arr.reduce((a, b) => a + b, 0);
    if (total === 0) return { total, peak: null, peakCount: 0 };
    const max = Math.max(...arr);
    return { total, peak: arr.indexOf(max), peakCount: max };
  };

  const scopeLabel = overriding
    ? `Chart filter · ${selectedCodes.size} station${selectedCodes.size === 1 ? "" : "s"}`
    : `Following table filters · ${selectedCodes.size} station${selectedCodes.size === 1 ? "" : "s"}`;

  const grand = SERIES.reduce((a, s) => a + totals[s.key].reduce((x, y) => x + y, 0), 0);
  const visible = SERIES.filter((s) => !hidden[s.key]);

  const height = 108;
  const padLeft = 36;
  const padRight = 10;
  const padBottom = 22;
  const padTop = 10;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const baseline = padTop + plotH;
  const dataMax = Math.max(1, ...visible.flatMap((s) => totals[s.key].map((_, h) => plotted(s.key, h))));
  const yMax = niceMax(dataMax);
  const x = (h) => padLeft + ((h + 0.5) / 24) * plotW;
  const y = (v) => padTop + plotH - (v / yMax) * plotH;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const h = Math.min(23, Math.max(0, Math.floor(((px - padLeft) / plotW) * 24)));
    setHover(h);
  };

  return (
    <div>
      {/* Filters + scope */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={region}
          onChange={(e) => {
            setRegion(e.target.value);
            setZone("all");
            setStationCodes([]);
          }}
          aria-label="Chart region"
        >
          <option value="all">All regions</option>
          {regionOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={zone}
          onChange={(e) => {
            setZone(e.target.value);
            setStationCodes([]);
          }}
          aria-label="Chart zone"
        >
          <option value="all">All zones</option>
          {zoneOptions.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <div className="w-48">
          <MultiSelect options={stationOptions} value={stationCodes} onChange={setStationCodes} placeholder="All stations" />
        </div>
        <span
          className={`rounded-full px-2 py-0.5 font-display text-[10px] font-semibold ${
            overriding ? "bg-brand/10 text-brand" : "bg-slate-100 text-slate-500"
          }`}
        >
          {scopeLabel}
        </span>
        {overriding && (
          <button onClick={reset} className="text-xs font-medium text-slate-500 underline hover:text-brand">
            Use table filters
          </button>
        )}
        <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-300 text-xs font-medium" role="group" aria-label="Chart values">
          {[
            ["count", "Count", "Parcels per hour"],
            ["pct", "% share", "Each hour as a % of that line's total"],
          ].map(([k, label, tip]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              aria-pressed={mode === k}
              title={tip}
              className={`h-8 px-2.5 ${mode === k ? "bg-brand text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend doubles as the show/hide toggles */}
      <div className="mb-1 flex flex-wrap gap-2">
        {SERIES.map((s) => {
          const st = stats(s.key);
          const off = hidden[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))}
              title="Click to show / hide this line"
              className={`flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs transition ${
                off ? "opacity-40" : "bg-white shadow-sm"
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
              <span className="font-semibold text-slate-700">{s.label}</span>
              <span className="tabular-nums text-slate-500">{st.total.toLocaleString()}</span>
              {st.peak !== null && (
                <span className="text-slate-400">
                  · peak {formatHour(st.peak)} ({fmtPct(share(s.key, st.peakCount))})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {grand === 0 ? (
        <div className="p-6 text-center text-sm text-slate-400">No timing data for this selection.</div>
      ) : (
        <div className="relative" ref={setWrapEl}>
          <svg
            width={width}
            height={height}
            className="block"
            role="img"
            aria-label="Scan-in, first attempt and success by hour of day"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`sweep-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1" className={s.text}>
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y(yMax * f)}
                  y2={y(yMax * f)}
                  className="stroke-slate-200"
                  strokeWidth="1"
                  strokeDasharray={f === 0 ? undefined : "3 3"}
                />
                <text x={padLeft - 5} y={y(yMax * f) + 3} textAnchor="end" className="fill-slate-500 text-xs">
                  {mode === "pct" ? `${Math.round(yMax * f)}%` : compact(Math.round(yMax * f))}
                </text>
              </g>
            ))}
            {Array.from({ length: 24 }, (_, h) =>
              h % 3 === 0 ? (
                <text key={h} x={x(h)} y={height - 5} textAnchor="middle" className="fill-slate-500 text-xs">
                  {formatHour(h)}
                </text>
              ) : null
            )}

            {visible.map((s) => {
              const pts = totals[s.key].map((_, h) => [x(h), y(plotted(s.key, h))]);
              const line = smoothPath(pts, padTop, baseline);
              const st = stats(s.key);
              return (
                <g key={s.key}>
                  <path d={`${line} L${x(23)},${baseline} L${x(0)},${baseline} Z`} fill={`url(#sweep-grad-${s.key})`} />
                  <path
                    d={line}
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    // Success tracks 1st attempt almost exactly, so it's dashed to stay visible on top of it.
                    strokeDasharray={s.key === "success" ? "5 3" : undefined}
                    className={s.stroke}
                  />
                  {st.peak !== null && (
                    <circle cx={x(st.peak)} cy={y(plotted(s.key, st.peak))} r="3.5" className={`${s.fill} stroke-white`} strokeWidth="1.5" />
                  )}
                </g>
              );
            })}

            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={padTop} y2={baseline} className="stroke-slate-400" strokeWidth="1" strokeDasharray="2 3" />
                {visible.map((s) => (
                  <circle key={s.key} cx={x(hover)} cy={y(plotted(s.key, hover))} r="3" className={`${s.fill} stroke-white`} strokeWidth="1.5" />
                ))}
              </g>
            )}
          </svg>

          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 rounded-lg bg-ink/95 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg"
              style={{
                left: `${(x(hover) / width) * 100}%`,
                transform: `translateX(${hover > 16 ? "calc(-100% - 8px)" : "8px"})`,
              }}
            >
              <div className="font-display font-semibold">{formatHour(hover)}</div>
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  <span className="text-slate-300">{s.label}</span>
                  <span className="ml-auto pl-3 font-semibold tabular-nums">
                    {totals[s.key][hover].toLocaleString()}
                    <span className="font-normal text-slate-300"> · {fmtPct(share(s.key, totals[s.key][hover]))}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
