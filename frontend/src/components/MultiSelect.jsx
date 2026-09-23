import { useEffect, useMemo, useRef, useState } from "react";

// A searchable "dropdown with checkboxes" for picking more than one value --
// e.g. Settings -> Users' region/zone/station scope_values, where a plain
// <select multiple> is both hard to search (143 stations) and needs a
// ctrl/cmd-click most people don't know about. The trigger itself just shows
// a count ("3 selected") plus an always-visible × to clear -- it used to also
// render a row of removable chips below the trigger, but that pushed
// everything below it down and made every filter bar taller (2026-09-24
// feedback); a caller that wants the actual picked labels visible (e.g.
// Action Board's metric picker) renders its own chips next to this component
// instead. No native "required" validation here -- an empty pick is caught by
// the backend's own scope_values check, surfaced in the form's error banner,
// same as any other server-side validation on this form.
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
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-left text-sm"
      >
        {/* A long placeholder (e.g. "Search station (this table only)…") must
            never wrap -- that grows the trigger to two lines, taller than
            every other filter box next to it (2026-09-24 feedback). */}
        <span className={`truncate ${value.length ? "text-slate-800" : "text-slate-400"}`}>
          {value.length ? `${value.length} selected` : placeholder}
        </span>
        {value.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                onChange([]);
              }
            }}
            className="shrink-0 rounded text-slate-400 hover:text-slate-600"
            aria-label="Clear selection"
          >
            ×
          </span>
        )}
        <span className="shrink-0 text-slate-400">▾</span>
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
    </div>
  );
}
