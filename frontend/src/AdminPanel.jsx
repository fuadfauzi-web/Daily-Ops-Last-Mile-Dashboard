import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import TabBar from "./components/TabBar";
import GuideTab from "./GuideTab";

function formatTime(iso) {
  if (!iso) return "Never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

// Admin -> Feedback (2026-09-25): anyone can send a complaint/suggestion about the
// app, optionally with one image/PDF (max 2 MB). A sender sees only their own
// feedback plus the admin's reply; a full admin sees everyone's, replies, and
// closes it. Closed feedback is deleted 7 days after it was closed.
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

function FeedbackItem({ r, isFullAdmin, onChanged, setError }) {
  const [reply, setReply] = useState(r.reply || "");
  const [busy, setBusy] = useState(false);

  const act = async (payload) => {
    setBusy(true);
    setError(null);
    try {
      await api.feedback.update(r.id, payload);
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`px-4 py-3 ${r.status === "closed" ? "bg-slate-50/60" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-slate-800">
          {isFullAdmin ? r.email : "You"}
          <span
            className={`ml-2 rounded px-1.5 py-0.5 font-display text-[10px] font-semibold ${
              r.status === "closed" ? "bg-slate-200 text-slate-500" : "bg-status-warning/10 text-status-warning"
            }`}
          >
            {r.status === "closed" ? "CLOSED" : "OPEN"}
          </span>
          {r.reply_unread && (
            <span className="ml-2 rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">NEW REPLY</span>
          )}
        </span>
        <span className="text-xs text-slate-400">
          {formatTime(r.created_at)}
          {isFullAdmin && ` · ${r.role}${r.scope_value ? ` · ${r.scope_value}` : ""}`}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{r.message}</p>

      {r.has_attachment && (
        <div className="mt-2">
          {r.attachment_type?.startsWith("image/") ? (
            <a href={api.feedback.attachmentUrl(r.id)} target="_blank" rel="noreferrer" title={r.attachment_name}>
              <img
                src={api.feedback.attachmentUrl(r.id)}
                alt={r.attachment_name || "attachment"}
                className="max-h-40 rounded-lg border border-slate-200"
              />
            </a>
          ) : (
            <a
              href={api.feedback.attachmentUrl(r.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Attachment: {r.attachment_name || "file"}
            </a>
          )}
        </div>
      )}

      {r.reply && (
        <div className="mt-2 rounded-lg bg-brand/5 px-3 py-2 ring-1 ring-brand/15">
          <div className="text-xs font-semibold text-brand">
            Admin reply{r.replied_by ? ` · ${r.replied_by}` : ""}
            {r.replied_at && <span className="ml-1 font-normal text-slate-400">{formatTime(r.replied_at)}</span>}
          </div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{r.reply}</p>
        </div>
      )}

      {r.status === "closed" && r.delete_after && (
        <p className="mt-2 text-xs text-slate-400">Closed — this will be deleted automatically on {formatTime(r.delete_after)}.</p>
      )}

      {isFullAdmin && (
        <div className="mt-2 space-y-2">
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            rows={2}
            placeholder={r.reply ? "Edit your reply…" : "Write a reply…"}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => act({ reply })}
              disabled={busy || !reply.trim() || reply.trim() === (r.reply || "")}
              className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              {r.reply ? "Update reply" : "Send reply"}
            </button>
            {r.status === "open" ? (
              <button
                onClick={() => act({ status: "closed" })}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-40"
              >
                Close (deleted after 7 days)
              </button>
            ) : (
              <button
                onClick={() => act({ status: "open" })}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-40"
              >
                Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackPanel({ me }) {
  const isFullAdmin = me.role === "admin";
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const fileInput = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState(null);
  const [showClosed, setShowClosed] = useState(false);

  const loadList = () =>
    api.feedback
      .list()
      .then((r) => {
        setRows(r);
        // Opening the list clears "new reply" for the sender -- refresh the bell.
        window.dispatchEvent(new Event("notifications-changed"));
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    loadList();
  }, []);

  const pickFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > MAX_ATTACHMENT_BYTES) {
      setError("That file is over 2 MB -- pick a smaller image or PDF.");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(f);
  };

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.feedback.submit(message.trim(), file);
      setMessage("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      loadList();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openRows = (rows || []).filter((r) => r.status === "open");
  const closedRows = (rows || []).filter((r) => r.status === "closed");
  const shown = showClosed ? rows || [] : openRows;

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
          Got a complaint, a bug, or an idea for the dashboard? It goes straight to whoever manages this app, and only
          you and the admins can see it. Their reply shows up here.
        </p>
        <textarea
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          rows={4}
          placeholder="What's on your mind?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs text-slate-500">
            Attach a screenshot or PDF (optional, max 2 MB){" "}
            <input
              ref={fileInput}
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,image/*,application/pdf"
              onChange={pickFile}
              className="block text-xs"
            />
          </label>
          <div className="flex items-center gap-3">
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
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
          <div className="font-display text-sm font-medium text-slate-700">
            {isFullAdmin ? "Submitted feedback" : "Your feedback"} ({openRows.length} open)
          </div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Show closed ({closedRows.length})
          </label>
        </div>
        {!rows ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">
            {rows.length === 0 ? "Nothing submitted yet." : "Nothing open."}
          </div>
        ) : (
          <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {shown.map((r) => (
              <FeedbackItem key={r.id} r={r} isFullAdmin={isFullAdmin} onChanged={loadList} setError={setError} />
            ))}
          </div>
        )}
      </div>
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

export default function AdminPanel({ me, jump }) {
  const [adminTab, setAdminTab] = useState(ADMIN_TABS[0].key);
  // The header bell can send the user straight to a sub-tab (e.g. Feedback).
  useEffect(() => {
    if (jump?.sub && ADMIN_TABS.some((t) => t.key === jump.sub)) setAdminTab(jump.sub);
  }, [jump?.nonce]);

  return (
    <div className="space-y-6">
      <TabBar tabs={ADMIN_TABS} activeKey={adminTab} onSelect={setAdminTab} />
      {adminTab === "feedback" && <FeedbackPanel me={me} />}
      {adminTab === "guide" && <GuideTab />}
    </div>
  );
}
