// Relative colour-scale heatmap for reference metrics (no SLA) -- e.g. Total
// Fresh. Not a pass/fail signal like the SLA severity colours, so it uses a
// single-hue intensity scale rather than red/green: darkest = highest value in
// whatever comparison group it's shown against, lightest = lowest.
const BUCKETS = [
  "bg-white text-slate-500",
  "bg-slate-100 text-slate-600",
  "bg-slate-200 text-ink",
  "bg-slate-300 text-ink font-medium",
  "bg-slate-400 text-white font-semibold",
];

export function minMax(values) {
  const nums = values.filter((v) => v != null && !Number.isNaN(v));
  if (!nums.length) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

// range: { min, max } from minMax() above, computed over whatever comparison
// group this value belongs to (e.g. all regions, all zones, or just the
// stations in this station's own zone).
export function colorScaleClass(value, range) {
  if (!range || range.min == null || range.max == null || value == null) return "text-slate-700";
  if (range.max === range.min) return "text-slate-700";
  const pct = (value - range.min) / (range.max - range.min);
  const idx = Math.min(BUCKETS.length - 1, Math.max(0, Math.floor(pct * BUCKETS.length)));
  return BUCKETS[idx];
}
