import { useEffect, useRef, useState } from "react";
import RoleTester from "./RoleTester";
import { formatTime } from "../lib/format";
import { positionLabel } from "../lib/roles";

// Header tidy-up (2026-10-02, staging only, FEATURES.headerTidy): the user block becomes one button that opens a
// small menu, so the header fits on one row at 1280px. The Role Tester lives in here instead of beside the nav,
// and below 1200px the freshness line and the density toggle move in here too.
export default function UserMenu({ me, initials, freshness, stationsInScope, showFreshness, density, setDensity, onRoleChanged, navMode, setNavMode, sideAutoHide, setSideAutoHide }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const roleLine = `${positionLabel(me.position || me.role)}${me.scope_type !== "all" ? ` · ${(me.scope_values || []).join(", ")}` : ""}`;

  return (
    <div className="relative border-l border-slate-200 pl-3" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-[44px] items-center gap-2 rounded-lg px-1.5 hover:bg-slate-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{initials}</span>
        <span className="text-left leading-tight">
          <span className="block max-w-[140px] truncate text-sm font-medium text-ink">{me.display_name || me.email}</span>
          <span className="block max-w-[140px] truncate text-xs uppercase tracking-wide text-slate-400">{roleLine}</span>
        </span>
        <span className="text-[10px] text-slate-400">▾</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-72 rounded-lg bg-white p-3 shadow-lg ring-1 ring-slate-200">
          <div className="mb-3 border-b border-slate-100 pb-2">
            <div className="truncate text-sm font-medium text-ink">{me.display_name || me.email}</div>
            <div className="truncate text-xs uppercase tracking-wide text-slate-400">{roleLine}</div>
          </div>

          {/* "Data as of" now always sits in the header; the density choice always lives here. */}
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Row density</div>
            <div className="mb-3 flex overflow-hidden rounded-lg border border-slate-200 font-display text-[11px] font-semibold">
              {["compact", "comfortable"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`min-h-[44px] flex-1 px-3 py-1 capitalize ${density === d ? "bg-ink text-white" : "text-slate-500"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {navMode && (
            <div className="mb-3 hidden lg:block">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Menu layout</div>
              <div className="flex overflow-hidden rounded-lg border border-slate-200 font-display text-[11px] font-semibold">
                {[
                  ["sidebar", "Sidebar"],
                  ["tabs", "Top tabs"],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setNavMode(k)}
                    className={`min-h-[44px] flex-1 px-3 py-1 ${navMode === k ? "bg-ink text-white" : "text-slate-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {navMode === "sidebar" && setSideAutoHide && (
                <label className="mt-2 flex min-h-[32px] cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                  <input type="checkbox" checked={!!sideAutoHide} onChange={(e) => setSideAutoHide(e.target.checked)} />
                  Auto-hide the sidebar after I pick a page
                </label>
              )}
            </div>
          )}

          {me.real_role === "admin" && (
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Preview as another role</div>
              <RoleTester
                me={me}
                onChanged={() => {
                  setOpen(false);
                  onRoleChanged();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
