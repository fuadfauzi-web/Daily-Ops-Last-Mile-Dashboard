// Horizontal bars for a breakdown (reasons, shippers, drivers...). Click a bar to filter by it; the picked one is highlighted.
//   rows [{ key, label, value, sub? }]  (already sorted)   format: how the value is shown
export default function HBars({ rows, picked, onPick, format = (v) => Math.round(v).toLocaleString(), max = 12, empty = "Nothing to show." }) {
  const shown = rows.slice(0, max);
  const top = Math.max(1, ...shown.map((r) => r.value));
  if (!shown.length) return <div className="p-4 text-center text-sm text-slate-400">{empty}</div>;
  return (
    <div className="space-y-1">
      {shown.map((r) => {
        const active = picked === r.key;
        const Tag = onPick ? "button" : "div";
        return (
          <Tag
            key={r.key}
            type={onPick ? "button" : undefined}
            onClick={onPick ? () => onPick(active ? null : r.key) : undefined}
            className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left ${onPick ? "hover:bg-slate-50" : ""} ${active ? "bg-brand/10" : ""}`}
            title={r.label}
          >
            <span className="w-52 shrink-0 truncate text-xs text-slate-700">{r.label}</span>
            <span className="relative h-4 flex-1 rounded bg-slate-100">
              <span className={`absolute inset-y-0 left-0 rounded ${active ? "bg-brand" : "bg-brand/60"}`} style={{ width: `${(r.value / top) * 100}%` }} />
            </span>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-700">
              {format(r.value)}
              {r.sub && <span className="ml-1 text-[10px] text-slate-400">{r.sub}</span>}
            </span>
          </Tag>
        );
      })}
      {rows.length > max && <div className="px-1 pt-1 text-[11px] text-slate-400">+ {rows.length - max} more</div>}
    </div>
  );
}
