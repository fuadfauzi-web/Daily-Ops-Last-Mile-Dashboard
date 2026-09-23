// Nationwide sweep-time-of-day bar chart -- when sweeping started, when it
// peaked, when it ended, from backend/aggregate.py's sweep_timeline (24
// hourly buckets, hour of 1st_sweep_at_WM_station_datetime, column H). Plain inline SVG, no charting library in this app (2026-09-24).
function formatHour(h) {
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ampm}`;
}

export default function SweepTimelineChart({ timeline }) {
  const total = timeline.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <div className="p-4 text-center text-sm text-slate-400">No sweep timing data yet.</div>;
  }
  const max = Math.max(...timeline);
  const activeHours = timeline.map((c, h) => (c > 0 ? h : null)).filter((h) => h !== null);
  const startHour = activeHours[0];
  const endHour = activeHours[activeHours.length - 1];
  const peakHour = timeline.indexOf(max);

  const width = 720;
  const height = 160;
  const padBottom = 24;
  const padTop = 8;
  const barW = width / 24;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <div>
          <span className="text-slate-400">Start:</span> <span className="font-semibold text-ink">{formatHour(startHour)}</span>
        </div>
        <div>
          <span className="text-slate-400">Peak:</span>{" "}
          <span className="font-semibold text-status-critical">
            {formatHour(peakHour)} ({max.toLocaleString()} parcels)
          </span>
        </div>
        <div>
          <span className="text-slate-400">End:</span> <span className="font-semibold text-ink">{formatHour(endHour)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Sweep timing by hour of day">
        {timeline.map((count, h) => {
          const barH = count > 0 ? Math.max(2, (count / max) * (height - padBottom - padTop)) : 0;
          const x = h * barW;
          const y = height - padBottom - barH;
          const isPeak = h === peakHour;
          return (
            <g key={h}>
              <rect
                x={x + barW * 0.15}
                y={y}
                width={barW * 0.7}
                height={barH}
                className={isPeak ? "fill-status-critical" : "fill-brand"}
                opacity={count > 0 ? 1 : 0.15}
              >
                <title>
                  {formatHour(h)} – {count.toLocaleString()} parcels
                </title>
              </rect>
              {h % 3 === 0 && (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[9px]">
                  {formatHour(h)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
