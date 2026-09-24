export function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

// "2026-09-23 11:56:29.000000" -> "23 Sep, 11:56 am". Redash sends these as plain
// Malaysia local time with no timezone, so format the text itself rather than
// going through Date (which would shift it by the browser offset).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatLocalDateTime(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value || "");
  if (!m) return value || "—";
  const hour = Number(m[4]);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}, ${h12}:${m[5]} ${hour >= 12 ? "pm" : "am"}`;
}
