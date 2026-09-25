import { useEffect, useMemo, useState } from "react";

// Grouped bars with a value on top of each -- the KPI Dashboard's "2-week daily trend" (On Route vs Delivered + PU).
//   labels  x-axis labels     series  [{ key, name, tone: "brand" | "slate", values: number[] }]
const FILL = { brand: "fill-brand", slate: "fill-slate-400" };
const DOT = { brand: "bg-brand", slate: "bg-slate-400" };

export default function BarChart({ labels, series, height = 190 }) {
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

  const padLeft = 40;
  const padRight = 10;
  const padTop = 20;
  const padBottom = 24;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const max = useMemo(() => {
    const m = Math.max(1, ...series.flatMap((s) => s.values));
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    const n = m / pow;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  }, [series]);

  if (!labels.length) return <div className="p-6 text-center text-sm text-slate-400">No daily data yet.</div>;

  const groupW = plotW / labels.length;
  const barW = Math.min(22, (groupW * 0.8) / series.length);
  const y = (v) => padTop + plotH - (v / max) * plotH;

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-3 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-sm ${DOT[s.tone] || DOT.brand}`} />
            {s.name}
          </span>
        ))}
      </div>
      <div ref={setWrapEl}>
        <svg width={width} height={height} className="block" role="img" aria-label="Bar chart">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={padLeft} x2={width - padRight} y1={y(max * f)} y2={y(max * f)} className="stroke-slate-200" strokeWidth="1" strokeDasharray={f === 0 ? undefined : "3 3"} />
              <text x={padLeft - 5} y={y(max * f) + 3} textAnchor="end" className="fill-slate-500 text-xs">
                {Math.round(max * f).toLocaleString()}
              </text>
            </g>
          ))}
          {labels.map((l, i) => {
            const cx = padLeft + groupW * i + groupW / 2;
            return (
              <g key={`${l}-${i}`}>
                {series.map((s, si) => {
                  const v = s.values[i] || 0;
                  const bx = cx - (barW * series.length) / 2 + barW * si;
                  return (
                    <g key={s.key}>
                      <rect x={bx} y={y(v)} width={barW - 1} height={Math.max(0, padTop + plotH - y(v))} rx="2" className={FILL[s.tone] || FILL.brand} />
                      {v > 0 && labels.length <= 16 && (
                        <text x={bx + (barW - 1) / 2} y={y(v) - 4} textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">
                          {Math.round(v).toLocaleString()}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={cx} y={height - 6} textAnchor="middle" className="fill-slate-500 text-xs">
                  {l}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
