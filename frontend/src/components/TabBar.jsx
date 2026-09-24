import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Level-2 navigation: an underlined tab bar (Ninja Black text, brand-red
// underline on the active tab -- not filled pills, which are Level 1's look
// in the header). Horizontally scrollable, and collapses whatever doesn't
// fit into a right-aligned "More ▾" menu -- built to scale as more
// top-level views get added, rather than a left sidebar (these tables run
// to 19 columns wide and need every pixel).
// A tab can carry a `badge` (a count): shown as a small bell with the number, e.g. the
// Urgent TN tab when a colleague has assigned you something that needs an answer.
function Bell({ count }) {
  return (
    <span
      className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-status-critical px-1.5 py-0.5 align-middle text-[10px] font-semibold leading-none text-white"
      title={`${count} need${count === 1 ? "s" : ""} your attention`}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function TabButton({ label, active, onClick, className = "", badge = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 font-display text-sm font-semibold ${
        active ? "border-brand text-ink" : "border-transparent text-slate-500 hover:text-ink"
      } ${className}`}
    >
      {label}
      {badge > 0 && <Bell count={badge} />}
    </button>
  );
}

export default function TabBar({ tabs, activeKey, onSelect }) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const moreRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(tabs.length);
  const [moreOpen, setMoreOpen] = useState(false);

  useLayoutEffect(() => {
    const recompute = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;
      const available = container.clientWidth;
      const moreWidth = moreRef.current ? moreRef.current.offsetWidth + 8 : 0;
      const children = Array.from(measure.children);
      let used = 0;
      let count = 0;
      for (let i = 0; i < children.length; i++) {
        const w = children[i].offsetWidth;
        const needsReserve = i < children.length - 1;
        if (used + w + (needsReserve ? moreWidth : 0) > available) break;
        used += w;
        count++;
      }
      setVisibleCount(Math.max(count, 1));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [tabs]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDocClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [moreOpen]);

  // The active tab must always be visible in the main bar, even if the
  // width-based cut would otherwise push it into the overflow menu.
  let visible = tabs.slice(0, visibleCount);
  if (activeKey && !visible.some((t) => t.key === activeKey)) {
    const activeTab = tabs.find((t) => t.key === activeKey);
    if (activeTab) visible = [...visible.slice(0, -1), activeTab];
  }
  const visibleKeys = new Set(visible.map((t) => t.key));
  const overflow = tabs.filter((t) => !visibleKeys.has(t.key));

  return (
    <div ref={containerRef} className="relative flex items-center border-b border-slate-200">
      {/* Off-screen measuring row: same buttons, same styling, used only to
          read natural widths so we know how many fit before rendering. */}
      <div ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 flex" aria-hidden="true">
        {tabs.map((t) => (
          <TabButton key={t.key} label={t.label} active={t.key === activeKey} badge={t.badge} />
        ))}
      </div>

      <div className="flex flex-1 overflow-x-auto">
        {visible.map((t) => (
          <TabButton key={t.key} label={t.label} active={t.key === activeKey} onClick={() => onSelect(t.key)} badge={t.badge} />
        ))}
      </div>

      {overflow.length > 0 && (
        <div className="relative shrink-0" ref={moreRef}>
          <TabButton label="More ▾" active={false} onClick={() => setMoreOpen((v) => !v)} />
          {moreOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200">
              {overflow.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    onSelect(t.key);
                    setMoreOpen(false);
                  }}
                  className={`block min-h-[44px] w-full px-4 py-2 text-left font-display text-sm ${
                    t.key === activeKey ? "font-semibold text-brand" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                  {t.badge > 0 && <Bell count={t.badge} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
