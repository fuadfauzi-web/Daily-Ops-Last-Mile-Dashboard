// A small red bell with a number: something needs your attention (an assigned Urgent TN, a
// reply to your feedback, updates you haven't read in What's new). Shared by the tab bars,
// the Settings nav item and the Guide's What's new switch.
export default function BellBadge({ count, title }) {
  if (!count || count < 1) return null;
  return (
    <span
      className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-status-critical px-1.5 py-0.5 align-middle text-[10px] font-semibold leading-none text-white"
      title={title || `${count} need${count === 1 ? "s" : ""} your attention`}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 99 ? "99+" : count}
    </span>
  );
}
