import { useEffect, useRef, useState } from "react";
import { SIDE_GROUPS, SIDE_GROUP_COLORS } from "../lib/sideNav";

// Categorised top navigation (staging trial, FEATURES.sidebarNav -- the "Top tabs" choice): the same groups as the sidebar (Act / Monitor / Recovery /
// Dashboard / People / System) as buttons that sit in the header beside the user menu. Each opens a vertical dropdown of its pages; only one is open at a
// time (opening another closes the first), and it closes on choosing a page, clicking elsewhere or Esc. The category holding the current page is tinted.
// `items` = [{ id, label, group, beta, active, badge, dot }], already limited to what this person may open.
export default function CategoryNav({ items, onSelect }) {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeGroup = items.find((i) => i.active)?.group ?? null;
  const groups = SIDE_GROUPS.map((g) => ({ name: g, items: items.filter((i) => i.group === g) })).filter((g) => g.items.length);
  const bellOf = (list) => list.reduce((n, i) => n + (i.badge || 0), 0);

  return (
    <nav ref={ref} aria-label="Categories" className="flex shrink-0 items-center gap-0.5">
      {groups.map((g, gi) => {
        const isOpen = open === g.name;
        const bell = bellOf(g.items);
        const alignRight = gi >= groups.length - 2; // keeps the last dropdowns inside the window
        return (
          <div key={g.name} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : g.name)}
              className={`flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 font-display text-[13px] ${
                g.name === activeGroup ? "bg-brand-tint font-bold text-brand-dark" : isOpen ? "bg-canvas font-bold text-ink" : "font-semibold text-ink-2 hover:bg-canvas"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${SIDE_GROUP_COLORS[g.name].dot}`} />
              {g.name}
              {!isOpen && bell > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold leading-none text-white">{bell}</span>
              )}
              <span className="text-[9px] text-subtle">{isOpen ? "▴" : "▾"}</span>
            </button>
            {isOpen && (
              <div
                role="menu"
                className={`absolute top-full z-50 mt-1 w-60 rounded-[10px] bg-white py-1.5 shadow-lg ring-1 ring-line ${alignRight ? "right-0" : "left-0"}`}
              >
                {g.items.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(null);
                      onSelect(i.id);
                    }}
                    aria-current={i.active ? "page" : undefined}
                    className={`flex min-h-[44px] w-full items-center gap-2 px-3.5 text-left font-display text-[13px] ${
                      i.active ? "bg-brand-tint font-bold text-brand-dark" : "font-semibold text-ink-2 hover:bg-canvas"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{i.label}</span>
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
        );
      })}
    </nav>
  );
}
