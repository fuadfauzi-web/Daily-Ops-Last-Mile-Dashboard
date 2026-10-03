import { useMemo, useState } from "react";
import { AREA_DOT, GUIDE_AREA, GUIDE_BLURB, HELP_AREAS, changelogArea } from "../../lib/guideMeta";
import { entryId } from "../../lib/whatsNew";

// Card layouts for the Help pages (Help -> Guide and Help -> What's new): a category row, then cards you open -- instead of one long list.

function CategoryChips({ areas, counts, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {["All", ...areas].map((a) => {
        const active = value === a;
        const n = a === "All" ? Object.values(counts).reduce((x, y) => x + y, 0) : counts[a] || 0;
        return (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            aria-pressed={active}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 font-display text-xs font-semibold ${
              active ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-ink-2 hover:bg-canvas"
            }`}
          >
            {a !== "All" && <span className={`h-2 w-2 rounded-full ${AREA_DOT[a]}`} />}
            {a}
            <span className={active ? "text-white/60" : "text-subtle"}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

const GRID = "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3";

// ---------------------------------------------------------------- Guide
export function GuideCards({ sections, ctx }) {
  const [area, setArea] = useState("All");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const q = query.trim().toLowerCase();

  const withArea = useMemo(() => sections.map((s) => ({ ...s, area: GUIDE_AREA[s.id] || "Monitor", blurb: GUIDE_BLURB[s.id] || "" })), [sections]);
  const counts = useMemo(() => {
    const c = {};
    withArea.forEach((s) => (c[s.area] = (c[s.area] || 0) + 1));
    return c;
  }, [withArea]);
  const areas = HELP_AREAS.filter((a) => counts[a]);
  const shown = withArea.filter((s) => (area === "All" || s.area === area) && (!q || `${s.title} ${s.blurb}`.toLowerCase().includes(q)));

  const open = withArea.find((s) => s.id === openId);
  if (open) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 font-display text-xs font-semibold text-ink-2 hover:bg-canvas"
        >
          ← All guide topics
        </button>
        <div className="rounded-[10px] bg-white p-5 shadow-card">
          <div className="flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-wider text-subtle">
            <span className={`h-2 w-2 rounded-full ${AREA_DOT[open.area]}`} />
            {open.area}
          </div>
          <h2 className="mt-1 font-display text-lg font-bold text-ink">{open.title}</h2>
          <div className="mt-3 border-t border-line pt-3">{open.body(ctx)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] bg-white px-4 py-3 shadow-card">
        <div className="font-display text-sm font-semibold text-ink">How to use this dashboard</div>
        <p className="mt-1 text-sm text-muted">A quick reference for each page, showing what applies to your role and scope. Pick a category, or search.</p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the guide…"
          className="mt-3 min-h-[44px] w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 text-sm"
        />
      </div>
      <CategoryChips areas={areas} counts={counts} value={area} onChange={setArea} />
      {shown.length === 0 ? (
        <div className="rounded-[10px] bg-white p-6 text-center text-sm text-slate-400 shadow-card">Nothing matches.</div>
      ) : (
        <div className={GRID}>
          {shown.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpenId(s.id)}
              className="flex min-h-[110px] flex-col items-start rounded-[10px] bg-white p-3.5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-subtle">
                <span className={`h-2 w-2 rounded-full ${AREA_DOT[s.area]}`} />
                {s.area}
              </span>
              <span className="mt-1.5 font-display text-[14px] font-semibold text-ink">{s.title}</span>
              {s.blurb && <span className="mt-1 text-xs leading-relaxed text-muted">{s.blurb}</span>}
              <span className="mt-auto pt-2 text-xs font-semibold text-brand-dark">Open →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- What's new
function UpdateCard({ entry, isNew }) {
  const [open, setOpen] = useState(false);
  const area = changelogArea(entry);
  const [first, ...rest] = entry.points;
  return (
    <div className="flex flex-col rounded-[10px] bg-white p-3.5 shadow-card">
      <div className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-subtle">
        <span className={`h-2 w-2 rounded-full ${AREA_DOT[area]}`} />
        {area}
        <span className="font-normal normal-case tracking-normal">· {entry.date.slice(8)}/{entry.date.slice(5, 7)}</span>
        {isNew && <span className="ml-auto rounded bg-ink px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>}
      </div>
      <div className="mt-1.5 font-display text-[14px] font-semibold leading-snug text-ink">{entry.title}</div>
      {first && <p className={`mt-1 text-xs leading-relaxed text-muted ${open ? "" : "line-clamp-3"}`}>{first}</p>}
      {open && rest.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted">
          {rest.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {(rest.length > 0 || (first && first.length > 150)) && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-auto self-start pt-2 text-xs font-semibold text-brand-dark">
          {open ? "Show less" : "Details"}
        </button>
      )}
    </div>
  );
}

export function WhatsNewCards({ weeks, newIds }) {
  const [area, setArea] = useState("All");
  const [showOlder, setShowOlder] = useState(false);
  const all = useMemo(() => weeks.flatMap((w) => w.items), [weeks]);
  const counts = useMemo(() => {
    const c = {};
    all.forEach((e) => {
      const a = changelogArea(e);
      c[a] = (c[a] || 0) + 1;
    });
    return c;
  }, [all]);
  const areas = HELP_AREAS.filter((a) => counts[a]);
  const [latest, ...older] = weeks;
  const pick = (items) => items.filter((e) => area === "All" || changelogArea(e) === area);

  const Week = ({ w }) => {
    const items = pick(w.items);
    return (
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-sm font-semibold text-ink">{w.label}</h3>
          <span className="text-xs text-subtle">{w.range}</span>
        </div>
        {items.length === 0 ? (
          <div className="rounded-[10px] bg-white px-4 py-4 text-sm text-slate-400 shadow-card">
            {w.items.length === 0 ? "Nothing new yet this week." : "Nothing in this category this week."}
          </div>
        ) : (
          <div className={GRID}>
            {items.map((e) => (
              <UpdateCard key={entryId(e)} entry={e} isNew={newIds.has(entryId(e))} />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] bg-white px-4 py-3 shadow-card">
        <div className="font-display text-sm font-semibold text-ink">What's new</div>
        <p className="mt-1 text-sm text-muted">
          A weekly summary of what changed, newest week first. It lists only what applies to your role and scope. Pick a category to narrow it.
        </p>
      </div>
      <CategoryChips areas={areas} counts={counts} value={area} onChange={setArea} />
      <Week w={latest} />
      {older.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowOlder((v) => !v)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 font-display text-xs font-medium text-ink-2 hover:bg-canvas"
          >
            {showOlder ? "Hide earlier weeks" : `Show earlier weeks (${older.length})`}
          </button>
          {showOlder && older.map((w) => <Week key={w.key} w={w} />)}
        </>
      )}
    </div>
  );
}
