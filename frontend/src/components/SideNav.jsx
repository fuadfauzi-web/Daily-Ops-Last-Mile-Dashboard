import { useRef, useState } from "react";
import { SIDE_GROUPS, SIDE_GROUP_COLORS } from "../lib/sideNav";

// Grouped left sidebar (staging trial, FEATURES.sidebarNav). `items` is already filtered to what this person may open:
// [{ id, label, group, beta, code, active, badge, dot }]. 224px wide, or 72px with two-letter codes when collapsed.
export default function SideNav({ items, onSelect, collapsed, onToggle, top }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(q)) : items;
  const searchIcon = (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M13 13l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
  return (
    <aside
      aria-label="Main navigation"
      style={{ top, height: `calc(100vh - ${top}px)` }}
      className={`sticky shrink-0 self-start overflow-y-auto border-r border-line bg-white pb-3 ${collapsed ? "w-[72px]" : "w-56"}`}
    >
      {/* The collapse + search row stays put while the pages scroll underneath it. */}
      <div className={`sticky top-0 z-10 mb-1 flex items-center gap-1.5 border-b border-line/60 bg-white px-2 pb-2 pt-3 ${collapsed ? "flex-col" : ""}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
          title={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold text-muted hover:bg-canvas"
        >
          {collapsed ? "»" : "«"}
        </button>
        {collapsed ? (
          <button
            type="button"
            onClick={() => {
              onToggle();
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
                  onSelect(shown[0].id);
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
              {!collapsed && (
                <div className="flex items-center gap-1.5 px-2.5 pb-1 font-display text-[10px] font-bold uppercase tracking-wider text-subtle">
                  <span className={`h-1.5 w-1.5 rounded-full ${SIDE_GROUP_COLORS[g].dot}`} />
                  {g}
                </div>
              )}
              {collapsed && <div className="mx-2 mb-1 border-t border-line first:hidden" />}
              {inGroup.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onSelect(i.id)}
                  title={collapsed ? i.label + (i.beta ? " (Beta)" : "") : undefined}
                  aria-current={i.active ? "page" : undefined}
                  className={`relative flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2.5 text-left font-display text-[13px] ${
                    collapsed
                      ? "justify-center hover:bg-canvas"
                      : i.active
                        ? "bg-brand-tint font-bold text-brand-dark"
                        : "font-semibold text-ink-2 hover:bg-canvas"
                  }`}
                >
                  {collapsed ? (
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
                        collapsed ? "absolute right-1 top-1" : ""
                      }`}
                    >
                      {i.badge}
                    </span>
                  )}
                  {!i.badge && i.dot > 0 && <span className={`h-2 w-2 rounded-full bg-ink ${collapsed ? "absolute right-2 top-2" : ""}`} aria-label="Due soon" />}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
