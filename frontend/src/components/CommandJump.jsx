import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

// Jump search (staging trial, FEATURES.jumpSearch -- design review D4): Ctrl/Cmd+K (or the header button) opens a small search over the pages this
// person can open and the stations in their scope. Enter / click goes there; Esc closes; up/down move. `pages` = [{ id, label, group }].
export default function CommandJump({ open, onClose, pages, onPage, onStation }) {
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState(null); // null = not fetched yet
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (stations === null) {
      api
        .stations()
        .then((rows) => setStations(Array.isArray(rows) ? rows : []))
        .catch(() => setStations([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pageHits = pages
      .filter((p) => !q || `${p.label} ${p.group}`.toLowerCase().includes(q))
      .map((p) => ({ kind: "page", key: `p:${p.id}`, title: p.label, hint: p.group, go: () => onPage(p.id) }));
    const stationHits = q
      ? (stations || [])
          .filter((s) => `${s.station_name} ${s.station_code} ${s.zone} ${s.region}`.toLowerCase().includes(q))
          .slice(0, 8)
          .map((s) => ({
            kind: "station",
            key: `s:${s.station_code}`,
            title: s.station_name,
            hint: `${s.region} · ${s.zone} · ${s.station_code}`,
            go: () => onStation(s),
          }))
      : [];
    return [...pageHits, ...stationHits];
  }, [query, pages, stations, onPage, onStation]);

  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  const choose = (r) => {
    onClose();
    r.go();
  };
  const onKey = (e) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      choose(results[cursor]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/30 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Jump to a page or station"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-line"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Jump to a page or a station…"
          className="w-full border-b border-line px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 && <div className="px-4 py-4 text-sm text-slate-400">{stations === null ? "Loading…" : "Nothing matches."}</div>}
          {results.map((r, i) => (
            <button
              key={r.key}
              type="button"
              onMouseEnter={() => setCursor(i)}
              onClick={() => choose(r)}
              className={`flex min-h-[44px] w-full items-center gap-3 px-4 text-left ${i === cursor ? "bg-canvas" : ""}`}
            >
              <span className="w-14 shrink-0 font-display text-[10px] font-bold uppercase tracking-wider text-subtle">{r.kind}</span>
              <span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold text-ink">{r.title}</span>
              <span className="shrink-0 truncate text-[11px] text-subtle">{r.hint}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-line px-4 py-2 text-[11px] text-subtle">↑ ↓ to move · Enter to open · Esc to close</div>
      </div>
    </div>
  );
}
