import { SIDE_GROUPS, SIDE_GROUP_COLORS } from "../lib/sideNav";

// Grouped left sidebar (staging trial, FEATURES.sidebarNav). `items` is already filtered to what this person may open:
// [{ id, label, group, beta, code, active, badge, dot }]. 224px wide, or 72px with two-letter codes when collapsed.
export default function SideNav({ items, onSelect, collapsed, onToggle, top }) {
  return (
    <aside
      aria-label="Main navigation"
      style={{ top, height: `calc(100vh - ${top}px)` }}
      className={`sticky shrink-0 self-start overflow-y-auto border-r border-line bg-white py-3 ${collapsed ? "w-[72px]" : "w-56"}`}
    >
      <nav className="flex flex-col gap-3 px-2">
        {SIDE_GROUPS.map((g) => {
          const inGroup = items.filter((i) => i.group === g);
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
      <div className="mt-3 border-t border-line px-2 pt-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg font-display text-xs font-semibold text-muted hover:bg-canvas"
        >
          {collapsed ? "»" : "« Collapse"}
        </button>
      </div>
    </aside>
  );
}
