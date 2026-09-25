import { useEffect, useMemo, useState } from "react";

// A small line chart with values on the points -- the DoD Dashboard's week-over-week lines and the KPI Dashboard's trends.
// Drawn at its real pixel width (measured), like the timing chart, so the text stays the same size as the rest of the page.
//
//   labels   x-axis labels, one per point
//   series   [{ key, name, tone, values: (number | null)[], dashed?, faded?, group?, format?, zeroBased? }] -- null = no data (a gap)
//              tone: "brand" | "slate" | "good" | "sky" | "violet" | "amber" | "teal" | "indigo"
//   format   how a value is shown (per series `format` wins)
//   zeroBased  true (counts): the axis starts at 0. false (rates): the axis hugs the data so small moves show.
//
// Several measures with different units (a count next to a %): give each measure its own `group`. Every group is then scaled on
// its own (the y axis is left unlabelled), lines of one group share a scale -- so last week vs this week of the SAME measure are
// compared honestly -- and the real values show in the labels / the hover box.
const TONES = {
  brand: { stroke: "stroke-brand", fill: "fill-brand", text: "fill-brand", dot: "bg-brand" },
  slate: { stroke: "stroke-slate-400", fill: "fill-slate-400", text: "fill-slate-500", dot: "bg-slate-400" },
  good: { stroke: "stroke-status-good", fill: "fill-status-good", text: "fill-status-good", dot: "bg-status-good" },
  sky: { stroke: "stroke-sky-500", fill: "fill-sky-500", text: "fill-sky-600", dot: "bg-sky-500" },
  violet: { stroke: "stroke-violet-500", fill: "fill-violet-500", text: "fill-violet-600", dot: "bg-violet-500" },
  amber: { stroke: "stroke-amber-500", fill: "fill-amber-500", text: "fill-amber-600", dot: "bg-amber-500" },
  teal: { stroke: "stroke-teal-500", fill: "fill-teal-500", text: "fill-teal-600", dot: "bg-teal-500" },
  indigo: { stroke: "stroke-indigo-500", fill: "fill-indigo-500", text: "fill-indigo-600", dot: "bg-indigo-500" },
};
export const TONE_ORDER = ["brand", "sky", "amber", "violet", "teal", "good", "indigo", "slate"];

// How many points to step over between labels so neighbours never touch: a label needs about `chars` x `px` pixels plus a gap, a point
// gets plotW / (count - 1). Labels are counted from the LAST point back, so the latest value is always the one that is shown.
const labelStride = (count, plotW, chars, px = 6.6, gap = 10) => {
  if (count <= 1) return 1;
  return Math.max(1, Math.ceil((chars * px + gap) / ((plotW - 28) / (count - 1))));
};

function niceStep(range, ticks) {
  const raw = range / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function scaleFor(values, zeroBased) {
  const vals = values.filter((v) => v != null && Number.isFinite(v));
  if (!vals.length) return null;
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (zeroBased) lo = Math.min(0, lo);
  else {
    const pad = Math.max((hi - lo) * 0.2, Math.abs(hi) * 0.02, 0.5);
    lo -= pad;
    hi += pad;
  }
  if (hi === lo) hi = lo + 1;
  const step = niceStep(hi - lo, 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t);
  return { lo, hi, ticks };
}

export default function TrendChart({ labels, series, format = (v) => String(Math.round(v * 10) / 10), zeroBased = true, height = 190 }) {
  const [wrapEl, setWrapEl] = useState(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    if (!wrapEl) return undefined;
    const measure = () => setWidth(Math.max(280, Math.round(wrapEl.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapEl);
    return () => ro.disconnect();
  }, [wrapEl]);

  const padLeft = 46;
  const padRight = 18;
  const padTop = 22;
  const padBottom = 24;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const independent = series.some((s) => s.group != null);

  const scales = useMemo(() => {
    const out = new Map();
    if (!independent) {
      out.set(null, scaleFor(series.flatMap((s) => s.values), zeroBased));
      return out;
    }
    [...new Set(series.map((s) => s.group))].forEach((g) => {
      const members = series.filter((s) => s.group === g);
      out.set(g, scaleFor(members.flatMap((s) => s.values), members[0].zeroBased ?? zeroBased));
    });
    return out;
  }, [series, zeroBased, independent]);

  if (![...scales.values()].some(Boolean)) return <div className="p-6 text-center text-sm text-slate-400">No data for this selection yet.</div>;

  const n = labels.length;
  const inset = n <= 1 ? 0 : 14; // keeps the first / last point (and its label) off the axis and the edge
  const x = (i) => padLeft + (n <= 1 ? plotW / 2 : inset + (i / (n - 1)) * (plotW - 2 * inset));
  const scaleOf = (s) => scales.get(independent ? s.group : null);
  const y = (s, v) => {
    const sc = scaleOf(s);
    return padTop + plotH - ((v - sc.lo) / (sc.hi - sc.lo)) * plotH;
  };
  const fmt = (s, v) => (s.format || format)(v);
  const shared = scales.get(null);

  const pathFor = (s) => {
    let d = "";
    let pen = false;
    s.values.forEach((v, i) => {
      if (v == null || !Number.isFinite(v) || !scaleOf(s)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i)},${y(s, v)} `;
      pen = true;
    });
    return d.trim();
  };
  const showLabels = series.length <= 3;
  const xStride = labelStride(n, plotW, Math.max(1, ...labels.map((l) => String(l).length)));
  const valueChars = Math.max(1, ...series.flatMap((s) => s.values.map((v) => (v == null || !Number.isFinite(v) ? 0 : fmt(s, v).length))));
  const vStride = labelStride(n, plotW, valueChars, 7, 6);
  const shownAt = (i, stride) => (n - 1 - i) % stride === 0;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    setHover(Math.min(n - 1, Math.max(0, Math.round(((px - padLeft - inset) / (plotW - 2 * inset)) * (n - 1)))));
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.key} className={`flex items-center gap-1.5 ${s.faded ? "opacity-60" : ""}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${(TONES[s.tone] || TONES.brand).dot}`} />
            {s.name}
          </span>
        ))}
      </div>
      <div ref={setWrapEl} className="relative">
        <svg width={width} height={height} className="block" role="img" aria-label="Trend chart" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {independent
            ? [0, 0.5, 1].map((f) => (
                <line key={f} x1={padLeft} x2={width - padRight} y1={padTop + plotH * f} y2={padTop + plotH * f} className="stroke-slate-200" strokeWidth="1" strokeDasharray={f === 1 ? undefined : "3 3"} />
              ))
            : shared.ticks.map((t) => {
                const yy = padTop + plotH - ((t - shared.lo) / (shared.hi - shared.lo)) * plotH;
                return (
                  <g key={t}>
                    <line x1={padLeft} x2={width - padRight} y1={yy} y2={yy} className="stroke-slate-200" strokeWidth="1" strokeDasharray={t === shared.lo ? undefined : "3 3"} />
                    <text x={padLeft - 6} y={yy + 3} textAnchor="end" className="fill-slate-500 text-xs">
                      {format(t)}
                    </text>
                  </g>
                );
              })}
          {labels.map((l, i) =>
            shownAt(i, xStride) ? (
              <text key={`${l}-${i}`} x={x(i)} y={height - 6} textAnchor="middle" className="fill-slate-500 text-xs">
                {l}
              </text>
            ) : null
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padTop} y2={padTop + plotH} className="stroke-slate-300" strokeWidth="1" strokeDasharray="2 3" />}
          {series.map((s, si) => {
            const tone = TONES[s.tone] || TONES.brand;
            // With two lines and no groups, the first one labels below its points so the numbers don't sit on top of each other.
            const below = !independent && series.length > 1 && si === 0;
            return (
              <g key={s.key} className={s.faded ? "opacity-60" : ""}>
                <path d={pathFor(s)} fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? "5 3" : undefined} className={tone.stroke} />
                {s.values.map((v, i) =>
                  v == null || !Number.isFinite(v) || !scaleOf(s) ? null : (
                    <g key={i}>
                      <circle cx={x(i)} cy={y(s, v)} r={hover === i ? 4.5 : 3.5} className={`${tone.fill} stroke-white`} strokeWidth="1.5" />
                      {showLabels && shownAt(i, vStride) && (
                        <text x={x(i)} y={below ? y(s, v) + 16 : y(s, v) - 8} textAnchor="middle" className={`${tone.text} text-xs font-semibold`}>
                          {fmt(s, v)}
                        </text>
                      )}
                    </g>
                  )
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg bg-ink/95 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg"
            style={{ left: `${(x(hover) / width) * 100}%`, transform: `translateX(${hover > (n - 1) / 2 ? "calc(-100% - 8px)" : "8px"})` }}
          >
            <div className="font-display font-semibold">{labels[hover]}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${(TONES[s.tone] || TONES.brand).dot}`} />
                <span className="text-slate-300">{s.name}</span>
                <span className="ml-auto pl-3 font-semibold tabular-nums">{s.values[hover] == null ? "—" : fmt(s, s.values[hover])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
