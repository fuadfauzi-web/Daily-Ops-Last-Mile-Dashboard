import { useEffect, useMemo, useState } from "react";

// A small line chart with a value on every point -- the DoD Dashboard's week-over-week lines and the KPI
// Dashboard's productivity trends. Drawn at its real pixel width (measured), like the timing chart, so the text stays
// the same size as the rest of the page.
//
//   labels   x-axis labels, one per point
//   series   [{ key, name, tone: "brand" | "slate" | "good", values: (number | null)[], dashed? }] -- null = no data (a gap)
//   format   how a value is shown on a point / the axis
//   zeroBased  true (counts): the axis starts at 0. false (rates): the axis hugs the data so small moves show.
const TONES = {
  brand: { stroke: "stroke-brand", fill: "fill-brand", text: "fill-brand", dot: "bg-brand" },
  slate: { stroke: "stroke-slate-400", fill: "fill-slate-400", text: "fill-slate-500", dot: "bg-slate-400" },
  good: { stroke: "stroke-status-good", fill: "fill-status-good", text: "fill-status-good", dot: "bg-status-good" },
};

function niceStep(range, ticks) {
  const raw = range / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export default function TrendChart({ labels, series, format = (v) => String(Math.round(v * 10) / 10), zeroBased = true, height = 190 }) {
  const [wrapEl, setWrapEl] = useState(null);
  const [width, setWidth] = useState(640);
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

  const scale = useMemo(() => {
    const vals = series.flatMap((s) => s.values).filter((v) => v != null && Number.isFinite(v));
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
  }, [series, zeroBased]);

  if (!scale) return <div className="p-6 text-center text-sm text-slate-400">No data for this selection yet.</div>;

  const n = labels.length;
  const x = (i) => padLeft + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => padTop + plotH - ((v - scale.lo) / (scale.hi - scale.lo)) * plotH;

  const pathFor = (values) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i)},${y(v)} `;
      pen = true;
    });
    return d.trim();
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-3 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${(TONES[s.tone] || TONES.brand).dot}`} />
            {s.name}
          </span>
        ))}
      </div>
      <div ref={setWrapEl}>
        <svg width={width} height={height} className="block" role="img" aria-label="Trend chart">
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={padLeft} x2={width - padRight} y1={y(t)} y2={y(t)} className="stroke-slate-200" strokeWidth="1" strokeDasharray={t === scale.lo ? undefined : "3 3"} />
              <text x={padLeft - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-500 text-xs">
                {format(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) => (
            <text key={`${l}-${i}`} x={x(i)} y={height - 6} textAnchor="middle" className="fill-slate-500 text-xs">
              {l}
            </text>
          ))}
          {series.map((s, si) => {
            const tone = TONES[s.tone] || TONES.brand;
            // With two lines the first one labels below its points, so the two sets of numbers don't sit on top of each other.
            const below = series.length > 1 && si === 0;
            return (
              <g key={s.key}>
                <path d={pathFor(s.values)} fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? "5 3" : undefined} className={tone.stroke} />
                {s.values.map((v, i) =>
                  v == null || !Number.isFinite(v) ? null : (
                    <g key={i}>
                      <circle cx={x(i)} cy={y(v)} r="3.5" className={`${tone.fill} stroke-white`} strokeWidth="1.5" />
                      <text x={x(i)} y={below ? y(v) + 16 : y(v) - 8} textAnchor="middle" className={`${tone.text} text-xs font-semibold`}>
                        {format(v)}
                      </text>
                    </g>
                  )
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
