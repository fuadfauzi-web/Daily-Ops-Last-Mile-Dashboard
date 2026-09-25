// Small number / text helpers shared by the KPI Dashboard modules.
export const int = (v) => Math.round(v || 0).toLocaleString();
export const dec1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const pctOf = (part, whole) => (whole ? (part / whole) * 100 : 0);
export const pct1 = (v) => `${dec1(v)}%`;

// Group rows by a key function -> Map(key -> rows)
export function groupBy(rows, keyFn) {
  const m = new Map();
  rows.forEach((r) => {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return m;
}

export const sortBy = (rows, key, dir) =>
  [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null || bv == null) return av == null && bv == null ? 0 : av == null ? 1 : -1;
    const c = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return dir === "asc" ? c : -c;
  });

export const selectClass = "h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 focus:border-brand focus:outline-none";
