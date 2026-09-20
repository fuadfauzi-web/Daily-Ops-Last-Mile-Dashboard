import { useEffect, useState } from "react";
import { api } from "./api";
import TabBar from "./components/TabBar";
import GuideTab from "./GuideTab";

function formatTime(iso) {
  if (!iso) return "Never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

// Admin -> Feedback: anyone can send a complaint/suggestion about the app;
// only a full admin can read the submitted list back.
function FeedbackPanel({ me }) {
  const isFullAdmin = me.role === "admin";
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState(null);

  const loadList = () => {
    if (!isFullAdmin) return;
    api.feedback
      .list()
      .then(setRows)
      .catch((e) => setError(e.message));
  };
  useEffect(loadList, [isFullAdmin]);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.feedback.submit(message.trim());
      setMessage("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      loadList();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">
          {error}
        </div>
      )}
      <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-slate-700">Send feedback to the admin team</div>
        <p className="text-xs text-slate-400">
          Got a complaint, a bug, or an idea for the dashboard? It goes straight to whoever manages this app.
        </p>
        <textarea
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          rows={4}
          placeholder="What's on your mind?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{submitted && "Thanks — your feedback was sent."}</span>
          <button
            onClick={submit}
            disabled={submitting || !message.trim()}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </div>

      {isFullAdmin && (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-2 font-display text-sm font-medium text-slate-700">
            Submitted feedback
          </div>
          {!rows ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">Nothing submitted yet.</div>
          ) : (
            <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {rows.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-800">{r.email}</span>
                    <span className="text-xs text-slate-400">
                      {formatTime(r.created_at)} · {r.role}
                      {r.scope_value && ` · ${r.scope_value}`}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{r.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The Admin page: day-to-day tools for using the app, as opposed to Settings
// (nationwide configuration -- Users/SLA Targets/Recovery Settings/Data
// Refresh, see SettingsPanel.jsx). Feedback + Guide for now (2026-09-20);
// Attendance and more are planned here later, not built yet.
const ADMIN_TABS = [
  { key: "feedback", label: "Feedback", visible: () => true },
  { key: "guide", label: "Guide", visible: () => true },
];

export default function AdminPanel({ me }) {
  const [adminTab, setAdminTab] = useState(ADMIN_TABS[0].key);

  return (
    <div className="space-y-6">
      <TabBar tabs={ADMIN_TABS} activeKey={adminTab} onSelect={setAdminTab} />
      {adminTab === "feedback" && <FeedbackPanel me={me} />}
      {adminTab === "guide" && <GuideTab />}
    </div>
  );
}
