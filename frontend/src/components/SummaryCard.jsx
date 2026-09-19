// White card, coloured top border, label, mini-stat grid -- every tab's
// region/zone summary card. `stats` is an array of already-formatted
// {key, label, value} triples so this component stays decoupled from any
// tab's own metric set or number formatting.
export default function SummaryCard({ label, stats, active, clickable, onClick, emphasis }) {
  const Wrapper = clickable ? "button" : "div";
  return (
    <Wrapper
      onClick={clickable ? onClick : undefined}
      className={`rounded-lg bg-white p-3 text-left ring-1 ring-slate-200 ${
        emphasis ? "border-t-[6px] border-t-brand" : `border-t-4 ${active ? "border-t-status-good bg-status-good/10" : "border-t-brand"}`
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`font-display text-xs text-ink ${emphasis ? "font-extrabold" : "font-semibold"}`}>{label}</span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
        {stats.map((s) => (
          <div key={s.key} className="rounded bg-slate-50 px-1 py-1 text-center">
            <div className="font-display text-[11px] uppercase text-slate-400">{s.label}</div>
            <div className={`text-xs tabular-nums text-ink ${emphasis ? "font-extrabold" : "font-bold"}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </Wrapper>
  );
}
