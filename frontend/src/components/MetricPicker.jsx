import { useEffect, useMemo, useRef, useState } from "react";
import { BOARD_GROUPS } from "../lib/actionMetrics";

// Action Board metric picker (staging trial, FEATURES.boardViews -- design review D9): a popover with a search box and the scored metrics grouped
// (0 Attempt / In Hub / Missing / ...), each row a checkbox + name + a hint line + its target on the right. `options` is [{ key, label }],
// `hint(key)` a one-line "what it covers" (or ""), `target(key)` the short target text (or ""). Picking appends to the selection, so the chip
// order on the board (= column order = sort priority) stays whatever the person arranged.
export default function MetricPicker({ options, value, onChange, hint, target }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byKey = new Map(options.map((o) => [o.key, o]));
    const used = new Set();
    const out = BOARD_GROUPS.map((g) => ({
      label: g.label,
      items: g.keys.map((k) => byKey.get(k)).filter(Boolean),
    }));
    out.forEach((g) => g.items.forEach((o) => used.add(o.key)));
    const rest = options.filter((o) => !used.has(o.key));
    if (rest.length) out.push({ label: "Other", items: rest });
    return out
      .map((g) => ({
        ...g,
        items: q ? g.items.filter((o) => `${o.label} ${g.label}`.toLowerCase().includes(q)) : g.items,
      }))
      .filter((g) => g.items.length);
  }, [options, search]);

  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="min-h-[44px] rounded-lg border border-dashed border-slate-400 bg-white px-3 font-display text-xs font-semibold text-ink hover:bg-slate-50"
      >
        + Add metric
      </button>
      {open && (
        <div role="dialog" className="absolute left-0 z-40 mt-1 w-[380px] max-w-[92vw] rounded-lg bg-white shadow-lg ring-1 ring-slate-200">
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${options.length} metrics…`}
            className="w-full rounded-t-lg border-b border-slate-100 px-3 py-2.5 text-sm outline-none"
          />
          <div className="max-h-[460px] overflow-y-auto pb-1">
            {groups.length === 0 && <div className="px-3 py-3 text-xs text-slate-400">No metric matches.</div>}
            {groups.map((g) => (
              <div key={g.label}>
                <div className="px-3 pb-1 pt-2.5 font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">{g.label}</div>
                {g.items.map((o) => (
                  <label key={o.key} className="flex min-h-[44px] cursor-pointer items-center gap-2.5 px-3 hover:bg-slate-50">
                    <input type="checkbox" checked={value.includes(o.key)} onChange={() => toggle(o.key)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{o.label}</span>
                      {hint(o.key) && <span className="block truncate text-[11px] text-slate-400">{hint(o.key)}</span>}
                    </span>
                    {target(o.key) && <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{target(o.key)}</span>}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <button type="button" onClick={() => onChange([])} disabled={!value.length} className="text-xs text-slate-500 hover:text-ink disabled:opacity-40">
              Clear all
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-[36px] rounded-lg bg-ink px-4 font-display text-xs font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
