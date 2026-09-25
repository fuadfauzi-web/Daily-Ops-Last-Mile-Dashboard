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

  const max = useMemo(() => {
    const m = Math.max(1, ...series.flatMap((s) => s.values));
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    const n = m / pow;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  }, [series]);
  const padLeft = Math.max(40, Math.round(max).toLocaleString().length * 6.6 + 10); // wide enough for the largest axis number
  const padRight = 10;
  const padBottom = 24;
  const plotW = width - padLeft - padRight;
  // Value labels: written across the top of a bar when the number fits the bar's width; otherwise written upwards (vertical), which fits
  // any bar wider than ~11px and keeps every number readable; a bar narrower than that is left to its tooltip (hover a bar).
  const groupW = plotW / Math.max(1, labels.length);
  const barW = Math.min(22, (groupW * 0.8) / Math.max(1, series.length));
  const valueW = Math.max(1, ...series.flatMap((s) => s.values.map((v) => Math.round(v || 0).toLocaleString().length))) * 5.6 + 2;
  const across = barW >= valueW;
  const upright = !across && barW >= 11;
  const showValues = across || upright;
  const padTop = upright ? Math.ceil(valueW) + 8 : 20; // headroom for the tallest bar's vertical label
  const plotH = height - padTop - padBottom;

  if (!labels.length) return <div className="p-6 text-center text-sm text-slate-400">No daily data yet.</div>;

  const y = (v) => padTop + plotH - (v / max) * plotH;
  // x labels are thinned (counted from the last day back) so they never touch.
  const xStride = Math.max(1, Math.ceil((Math.max(1, ...labels.map((l) => String(l).length)) * 6.6 + 8) / groupW));

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
                      <rect x={bx} y={y(v)} width={barW - 1} height={Math.max(0, padTop + plotH - y(v))} rx="2" className={FILL[s.tone] || FILL.brand}>
                        <title>{`${l} · ${s.name}: ${Math.round(v).toLocaleString()}`}</title>
                      </rect>
                      {v > 0 && showValues && (
                        <text
                          x={bx + (barW - 1) / 2}
                          y={y(v) - 4}
                          textAnchor={upright ? "start" : "middle"}
                          transform={upright ? `rotate(-90 ${bx + (barW - 1) / 2 + 3.5} ${y(v) - 4})` : undefined}
                          dx={upright ? 3.5 : undefined}
                          className="fill-slate-700 text-[10px] font-semibold"
                        >
                          {Math.round(v).toLocaleString()}
                        </text>
                      )}
                    </g>
                  );
                })}
                {(labels.length - 1 - i) % xStride === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className="fill-slate-500 text-xs">
                    {l}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
