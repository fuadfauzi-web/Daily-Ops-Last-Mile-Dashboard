// Headline cards (staging trial, FEATURES.headlineCards -- design review D7): label, a big number, and the change since yesterday. No sparkline yet --
// that needs a short history series the app doesn't keep. `cards` = [{ key, label, value, sub?, delta (number | null), goodWhen: "down" | "neutral" }].
// Arrows are the plain up/down kind (the triangle mark is reserved for critical); colour follows meaning: for a "bad when it grows" number a rise is
// amber and a fall green, for a volume it is neutral grey.
export default function HeadlineStrip({ cards }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      {cards.map((c) => {
        const d = c.delta;
        const tone =
          d == null || d === 0 || c.goodWhen === "neutral"
            ? "text-status-neutral"
            : d > 0
              ? "text-status-warning"
              : "text-status-good";
        return (
          <div key={c.key} className="rounded-[10px] bg-white px-3.5 py-3 shadow-card">
            <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-muted">{c.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[26px] font-semibold leading-8 tabular-nums text-ink">{c.value.toLocaleString()}</span>
              {c.sub && <span className="text-xs tabular-nums text-subtle">{c.sub}</span>}
            </div>
            <div className={`mt-0.5 min-h-[18px] text-xs tabular-nums ${tone}`}>
              {d == null ? <span className="text-subtle">no yesterday data</span> : d === 0 ? "no change vs yesterday" : `${d > 0 ? "↑" : "↓"} ${Math.abs(d).toLocaleString()} vs yesterday`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
