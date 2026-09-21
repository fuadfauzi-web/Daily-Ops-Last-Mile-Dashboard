import { useEffect, useMemo, useRef, useState } from "react";

// A searchable "dropdown with checkboxes" for picking more than one value --
// e.g. Settings -> Users' region/zone/station scope_values, where a plain
// <select multiple> is both hard to search (143 stations) and needs a
// ctrl/cmd-click most people don't know about. Selected values render as
// removable chips under the trigger so the current picks stay visible without
// reopening the panel. No native "required" validation here -- an empty pick
// is caught by the backend's own scope_values check, surfaced in the form's
// error banner, same as any other server-side validation on this form.
export default function MultiSelect({ options, value, onChange, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      // Let the panel mount before focusing.
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const byValue = useMemo(() => Object.fromEntries(options.map((o) => [o.value, o.label])), [options]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const toggle = (v) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-left text-sm"
      >
        <span className={value.length ? "text-slate-800" : "text-slate-400"}>
          {value.length ? `${value.length} selected` : placeholder}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full border-b border-slate-100 px-3 py-2 text-sm outline-none"
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No matches</div>}
            {filtered.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full border-t border-slate-100 px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
            >
              {byValue[v] || v}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="text-slate-400 hover:text-slate-600"
                aria-label={`Remove ${byValue[v] || v}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
