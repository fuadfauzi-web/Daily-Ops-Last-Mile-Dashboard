// Row-click detail slide-over: the clicked row's full metric set, one line
// per column, reusing whatever render/className that table's own columns
// already use so the numbers and colours match the table exactly. Full-width
// on mobile (a sheet, not a sliver), a fixed right-hand panel from `sm` up.
export default function DetailPanel({ open, onClose, title, subtitle, rows }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[400px] sm:shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="font-display text-base font-semibold text-ink">{title}</div>
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 border-b border-slate-50 py-2.5">
              <span className="text-sm text-slate-600">{r.label}</span>
              <span className="flex items-center gap-2">
                {r.target && <span className="text-xs text-slate-400">{r.target}</span>}
                <span className={`text-sm tabular-nums ${r.className || "text-ink"}`}>{r.value}</span>
                {r.delta != null && <span className={`text-xs tabular-nums ${r.deltaClassName || "text-slate-400"}`}>{r.delta}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
