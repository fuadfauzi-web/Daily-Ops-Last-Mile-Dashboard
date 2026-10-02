import { useEffect, useState } from "react";
import { SIDE_GROUPS, SIDE_GROUP_COLORS } from "../lib/sideNav";

// Categorised top navigation (staging trial, FEATURES.sidebarNav -- the "Top tabs" choice): the same groups as the sidebar (Act / Monitor / Recovery /
// Analyse / System) as a row of category buttons. Clicking one opens its pages as a second row; only one category is open at a time, and clicking the
// open one closes it. The category holding the current page opens by itself whenever the page changes (a jump, a link, the sidebar -> top switch).
// `items` = [{ id, label, group, beta, active, badge, dot }], already limited to what this person may open.
export default function CategoryNav({ items, onSelect }) {
  const activeGroup = items.find((i) => i.active)?.group ?? null;
  const [open, setOpen] = useState(activeGroup);
  useEffect(() => setOpen(activeGroup), [activeGroup]);

  const groups = SIDE_GROUPS.map((g) => ({ name: g, items: items.filter((i) => i.group === g) })).filter((g) => g.items.length);
  const openItems = groups.find((g) => g.name === open)?.items || [];
  const bellOf = (list) => list.reduce((n, i) => n + (i.badge || 0), 0);

  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6">
        <div role="tablist" aria-label="Categories" className="flex flex-wrap items-center gap-1 py-1.5">
          {groups.map((g) => {
            const isOpen = open === g.name;
            const holdsActive = g.name === activeGroup;
            const bell = bellOf(g.items);
            return (
              <button
                key={g.name}
                type="button"
                role="tab"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : g.name)}
                className={`flex min-h-[44px] items-center gap-2 rounded-lg px-3 font-display text-[13px] ${
                  isOpen ? "bg-canvas font-bold text-ink" : "font-semibold text-ink-2 hover:bg-canvas"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${SIDE_GROUP_COLORS[g.name].dot}`} />
                {g.name}
                {holdsActive && !isOpen && <span className="h-1.5 w-1.5 rounded-full bg-brand" title="Current page is in here" />}
                {!isOpen && bell > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold leading-none text-white">{bell}</span>
                )}
                <span className="text-[10px] text-subtle">{isOpen ? "▾" : "▸"}</span>
              </button>
            );
          })}
        </div>
        {openItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-t border-line/70 py-1.5">
            {openItems.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => onSelect(i.id)}
                aria-current={i.active ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 font-display text-[13px] ${
                  i.active ? "bg-brand-tint font-bold text-brand-dark" : "font-semibold text-ink-2 hover:bg-canvas"
                }`}
              >
                {i.label}
                {i.beta && <span className="text-[9px] font-bold uppercase tracking-wide text-[#92400E]">Beta</span>}
                {i.badge > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold leading-none text-white">{i.badge}</span>
                )}
                {!i.badge && i.dot > 0 && <span className="h-2 w-2 rounded-full bg-ink" aria-label="Due soon" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
