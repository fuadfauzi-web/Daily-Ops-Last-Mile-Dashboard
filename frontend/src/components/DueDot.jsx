// A small amber dot: something in here is due soon (within 2 days) or already overdue. Sits beside the
// Task List tab and its sub-tabs (2026-09-25 feedback). `count` only feeds the tooltip.
export default function DueDot({ count, title }) {
  if (!count || count < 1) return null;
  return (
    <span
      className="ml-1.5 inline-block h-2 w-2 rounded-full bg-status-warning align-middle"
      title={title || `${count} due soon or overdue`}
      aria-label={`${count} due soon or overdue`}
    />
  );
}
