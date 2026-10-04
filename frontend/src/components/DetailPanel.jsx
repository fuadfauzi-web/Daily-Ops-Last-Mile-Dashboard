import { useEffect } from "react";

// Row-click detail slide-over: the clicked row's full metric set, one line
// per column, reusing whatever render/className that table's own columns
// already use so the numbers and colours match the table exactly. Full-width
// on mobile (a sheet, not a sliver), a fixed right-hand panel from `sm` up.
// Staging trial (FEATURES.detailPanel -- design review D6): when `groups` ([{ label, rows }]) is passed, the metrics are listed under group headings
// (same 9 groups as the Station Health table), flagged values get a tint, Esc closes, and an optional `footer` (copy / CSV buttons) sticks to the bottom.
export default function DetailPanel({ open, onClose, title, subtitle, rows, groups, footer }) {
  useEffect(() => {
    if (!open || !groups) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, groups, onClose]);
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
          {groups &&
            groups.map((g) => (
              <div key={g.label} className="mb-2">
                <div className="pb-1 pt-3 font-display text-[10px] font-bold uppercase tracking-wider text-subtle">{g.label}</div>
                {g.rows.map((r) => (
                  <div key={r.label} className="flex min-h-[34px] items-center justify-between gap-3 border-b border-line/60 py-1">
                    <span className="text-[13px] text-ink-2">{r.label}</span>
                    <span className="flex items-center gap-2">
                      {r.target && <span className="text-[11px] text-subtle">{r.target}</span>}
                      <span className={`min-w-[44px] rounded px-2 py-0.5 text-right text-[13px] tabular-nums ${r.className || "text-ink"} ${r.tint || ""}`}>{r.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          {!groups && rows.map((r) => (
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
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </>
  );
}
