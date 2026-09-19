// Level-3 navigation: the in-tab switchers (Routed View's Region/Zone/
// Station/Driver/Old Route, Aging's five sub-views, RPU's two). A bordered
// segmented control with a neutral grey fill on the active segment --
// deliberately muted, not brand red or Level 2's underline, so it reads as
// clearly subordinate to the tab it lives inside.
export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex flex-nowrap overflow-x-auto rounded-lg border border-slate-300 bg-white">
      {options.map((o, i) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`min-h-[44px] shrink-0 whitespace-nowrap px-3 py-1.5 font-display text-sm font-medium ${
            i > 0 ? "border-l border-slate-300" : ""
          } ${value === o.key ? "bg-slate-200 text-ink" : "text-slate-500 hover:bg-slate-50"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
