import { useEffect } from "react";

// Phone layout for the tracking-number lists (staging trial, FEATURES.phoneTnSheet -- design review D10): a full-screen sheet with a sticky top bar
// (back, title, count), 56px rows and a sticky bottom bar with Copy list / CSV, so it is usable one-handed. Shown below 768px only -- the modals
// keep their own desktop layout from `md` up. `rows` = [{ key, primary, secondary }].
export default function TnSheet({ title, subtitle, count, asOf, loading, error, rows, onClose, onCopy, onCsv, copied }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
      <div className="flex items-center gap-2 border-b border-line px-2">
        <button type="button" onClick={onClose} aria-label="Back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-ink hover:bg-canvas">
          ‹
        </button>
        <div className="min-w-0 flex-1 py-2">
          <div className="truncate font-display text-sm font-semibold text-ink">{title}</div>
          <div className="truncate text-[11px] text-subtle">{subtitle}</div>
        </div>
        {!loading && !error && (
          <span className="shrink-0 rounded-full bg-ink px-2.5 py-0.5 font-display text-xs font-bold text-white">{count.toLocaleString()}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && <div className="px-4 py-4 text-sm text-status-critical">{error}</div>}
        {!error && loading && <div className="px-4 py-4 text-sm text-slate-400">Loading…</div>}
        {!error && !loading && rows.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-400">No tracking numbers.</div>}
        {rows.map((r) => (
          <div key={r.key} className="flex min-h-[56px] flex-col justify-center border-b border-line/70 px-4 py-1.5">
            <span className="font-mono text-[14px] text-ink">{r.primary}</span>
            {r.secondary && <span className="text-[11px] text-subtle">{r.secondary}</span>}
          </div>
        ))}
        {!loading && !error && asOf && <div className="px-4 py-3 text-[11px] text-subtle">As of {asOf}</div>}
      </div>

      <div className="flex gap-2 border-t border-line bg-white px-3 py-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={loading || !count}
          className="min-h-[44px] flex-1 rounded-lg bg-ink font-display text-sm font-semibold text-white disabled:opacity-40"
        >
          {copied ? "Copied!" : "Copy list"}
        </button>
        <button
          type="button"
          onClick={onCsv}
          disabled={loading || !count}
          className="min-h-[44px] rounded-lg border border-slate-300 px-5 font-display text-sm font-medium text-ink-2 disabled:opacity-40"
        >
          CSV
        </button>
      </div>
    </div>
  );
}
