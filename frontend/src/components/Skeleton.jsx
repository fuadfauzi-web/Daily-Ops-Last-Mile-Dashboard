// Replaces a plain "Loading…" string with a shape roughly matching the table
// that's about to render, so the layout doesn't jump/flash once data arrives.
export default function Skeleton({ rows = 6 }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-3 w-28 shrink-0 animate-pulse rounded bg-slate-200" />
            <div className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
