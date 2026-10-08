import { useEffect, useRef, useState } from "react";
import { SIDE_GROUPS, SIDE_GROUP_COLORS, sideGroupLabel } from "../lib/sideNav";

// Grouped left sidebar (staging trial, FEATURES.sidebarNav). `items` is already filtered to what this person may open:
// [{ id, label, group, beta, code, active, badge, dot }]. 224px wide, or 72px with two-letter codes when collapsed.
export default function SideNav({ items, onSelect, collapsed, onToggle, top, autoHide = true }) {
  const [query, setQuery] = useState("");
  // Auto-hide (2026-10-08): once a page is chosen the sidebar folds to the narrow rail, and moving the mouse onto the rail floats the full sidebar back over the page (it does not push the page
  // around). The « / » button keeps it open until the next choice. Turned off in the user menu, the sidebar then stays as it was.
  const [rested, setRested] = useState(false);
  const [hover, setHover] = useState(false);
  const justPicked = useRef(false); // after a pick the mouse is still on the rail: the sidebar stays folded until the mouse has left it once
  const rail = collapsed || (autoHide && rested); // the narrow rail is what takes room
  const peek = rail && hover; // ...with the full sidebar floating over the page while the mouse (or keyboard focus) is on it
  const showCollapsed = rail && !peek;
  const pick = (id) => {
    onSelect(id);
    if (autoHide) {
      setRested(true);
      setHover(false);
      justPicked.current = true;
    }
  };
  const keepOpen = () => {
    setRested(false);
    setHover(false);
    if (collapsed) onToggle();
    else if (!rail) onToggle(); // « : fold it for good (until » is pressed)
  };
  const searchRef = useRef(null);
  // Categories fold like the top tabs do: one open at a time, click an open one to close it, and the one holding the current page opens by itself
  // whenever the page changes. Searching shows every match regardless, and the narrow (collapsed) sidebar keeps every page code visible.
  const activeGroup = items.find((i) => i.active)?.group ?? null;
  const [open, setOpen] = useState(activeGroup);
  useEffect(() => setOpen(activeGroup), [activeGroup]);
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(q)) : items;
  const searchIcon = (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M13 13l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
  return (
    <div
      style={{ top, height: `calc(100vh - ${top}px)` }}
      className={`sticky shrink-0 self-start ${rail ? "w-[72px]" : "w-56"}`}
      onMouseMove={() => {
        if (!justPicked.current) setHover(true);
      }}
      onMouseLeave={() => {
        justPicked.current = false;
        setHover(false);
      }}
      onFocus={() => setHover(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHover(false);
      }}
    >
    <aside
      aria-label="Main navigation"
      className={`absolute inset-y-0 left-0 z-30 overflow-y-auto border-r border-line bg-white pb-3 ${showCollapsed ? "w-[72px]" : "w-56"} ${peek ? "shadow-xl" : ""}`}
    >
      {/* The collapse + search row stays put while the pages scroll underneath it. */}
      <div className={`sticky top-0 z-10 mb-1 flex items-center gap-1.5 border-b border-line/60 bg-white px-2 pb-2 pt-3 ${showCollapsed ? "flex-col" : ""}`}>
        <button
          type="button"
          onClick={keepOpen}
          aria-label={rail ? "Expand the sidebar" : "Collapse the sidebar"}
          title={rail ? "Expand the sidebar" : "Collapse the sidebar"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold text-muted hover:bg-canvas"
        >
          {rail ? "»" : "«"}
        </button>
        {showCollapsed ? (
          <button
            type="button"
            onClick={() => {
              keepOpen();
              setTimeout(() => searchRef.current?.focus(), 50);
            }}
            aria-label="Search the menu"
            title="Search the menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-canvas"
          >
            {searchIcon}
          </button>
        ) : (
          <label className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 text-muted focus-within:border-ink focus-within:bg-white">
            {searchIcon}
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
                if (e.key === "Enter" && shown[0]) {
                  pick(shown[0].id);
                  setQuery("");
                }
              }}
              placeholder="Search menu…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-subtle"
            />
          </label>
        )}
      </div>
      <nav className="flex flex-col gap-3 px-2 pt-2">
        {q && shown.length === 0 && <div className="px-2.5 text-xs text-subtle">Nothing matches.</div>}
        {SIDE_GROUPS.map((g) => {
          const inGroup = shown.filter((i) => i.group === g);
          if (!inGroup.length) return null;
          return (
            <div key={g}>
              {!showCollapsed &&
                (q ? (
                  <div className="flex items-center gap-1.5 px-2.5 pb-1 font-display text-[10px] font-bold uppercase tracking-wider text-subtle">
                    <span className={`h-1.5 w-1.5 rounded-full ${SIDE_GROUP_COLORS[g].dot}`} />
                    {sideGroupLabel(g)}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpen(open === g ? null : g)}
                    aria-expanded={open === g}
                    className="flex min-h-[36px] w-full items-center gap-1.5 rounded-lg px-2.5 font-display text-[11px] font-bold uppercase tracking-wider text-subtle hover:bg-canvas"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${SIDE_GROUP_COLORS[g].dot}`} />
                    <span className="flex-1 text-left">{sideGroupLabel(g)}</span>
                    {open !== g && g === activeGroup && <span className="h-1.5 w-1.5 rounded-full bg-brand" title="Current page is in here" />}
                    {open !== g && inGroup.reduce((n, i) => n + (i.badge || 0), 0) > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold leading-none text-white">
                        {inGroup.reduce((n, i) => n + (i.badge || 0), 0)}
                      </span>
                    )}
                    <span className="text-[10px]">{open === g ? "▾" : "▸"}</span>
                  </button>
                ))}
              {showCollapsed && <div className="mx-2 mb-1 border-t border-line first:hidden" />}
              {(showCollapsed || q || open === g) && inGroup.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => pick(i.id)}
                  title={showCollapsed ? i.label + (i.beta ? " (Beta)" : "") : undefined}
                  aria-current={i.active ? "page" : undefined}
                  className={`relative flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2.5 text-left font-display text-[13px] ${
                    showCollapsed
                      ? "justify-center hover:bg-canvas"
                      : i.active
                        ? "bg-brand-tint font-bold text-brand-dark"
                        : "font-semibold text-ink-2 hover:bg-canvas"
                  }`}
                >
                  {showCollapsed ? (
                    <span className={`flex h-8 w-9 items-center justify-center rounded-md text-xs ${SIDE_GROUP_COLORS[i.group].chip} ${i.active ? "ring-2 ring-brand" : ""}`}>{i.code}</span>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">{i.label}</span>
                      {i.beta && <span className="text-[9px] font-bold uppercase tracking-wide text-[#92400E]">Beta</span>}
                    </>
                  )}
                  {i.badge > 0 && (
                    <span
                      className={`flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold leading-none text-white ${
                        showCollapsed ? "absolute right-1 top-1" : ""
                      }`}
                    >
                      {i.badge}
                    </span>
                  )}
                  {!i.badge && i.dot > 0 && <span className={`h-2 w-2 rounded-full bg-ink ${showCollapsed ? "absolute right-2 top-2" : ""}`} aria-label="Due soon" />}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
    </div>
  );
}
