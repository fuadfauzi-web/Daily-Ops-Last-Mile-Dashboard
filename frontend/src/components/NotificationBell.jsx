import { useEffect, useRef, useState } from "react";
import { api } from "../api";

// Header bell (2026-09-25): counts what needs the signed-in user's attention --
// Urgent TNs a teammate assigned to them that are still in progress, and admin
// replies to their feedback they haven't opened yet. Polls every minute, and
// re-fetches immediately when another part of the app fires the
// "notifications-changed" window event (closing an item, opening the feedback
// list...). `counts` is owned by App so its dashboard banner shares the same
// numbers; `onNavigate({tab, sub})` sends the user to the right place.
export default function NotificationBell({ counts, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const urgent = counts?.urgent_assigned_open || 0;
  const unseen = counts?.urgent_unseen || 0;
  const replies = counts?.feedback_replies_unread || 0;
  const total = urgent + replies;

  const go = (dest) => {
    setOpen(false);
    onNavigate(dest);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={total ? `${total} notifications` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-semibold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-2 font-display text-xs font-semibold text-slate-700">Notifications</div>
          {total === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-slate-400">Nothing needs your attention.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {urgent > 0 && (
                <button onClick={() => go({ tab: "dashboard", sub: "urgent" })} className="block w-full px-4 py-3 text-left hover:bg-slate-50">
                  <div className="text-sm font-medium text-slate-800">
                    {urgent} urgent tracking number{urgent === 1 ? "" : "s"} assigned to you
                  </div>
                  <div className="text-xs text-slate-500">
                    {unseen > 0 ? `${unseen} new · ` : ""}still in progress — open Urgent TN
                  </div>
                </button>
              )}
              {replies > 0 && (
                <button onClick={() => go({ tab: "admin", sub: "feedback" })} className="block w-full px-4 py-3 text-left hover:bg-slate-50">
                  <div className="text-sm font-medium text-slate-800">
                    {replies} new repl{replies === 1 ? "y" : "ies"} to your feedback
                  </div>
                  <div className="text-xs text-slate-500">Open Admin → Feedback</div>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
