import { useEffect, useRef, useState } from "react";
import { api } from "./api";

function formatTime(iso) {
  if (!iso) return "Never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

// Help -> Feedback (2026-10-09): a conversation, not a one-off message. The main page is a compact list of CASES; clicking one opens its conversation (every message with who sent it and
// when) in a side panel with a reply box while the case is OPEN. Only the Superadmin closes a case (a reply never does); a closed case can be read but not answered. Anyone sees only their
// own cases, the Superadmin sees all. One image / PDF (max 20 MB) can be attached to any message.
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function StatusChip({ status }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-display text-[10px] font-semibold ${
        status === "closed" ? "bg-slate-200 text-slate-500" : "bg-status-warning/10 text-status-warning"
      }`}
    >
      {status === "closed" ? "CLOSED" : "OPEN"}
    </span>
  );
}

function Attachment({ m }) {
  if (!m.has_attachment) return null;
  const url = api.feedback.messageAttachmentUrl(m.id);
  return (
    <div className="mt-2">
      {m.attachment_type?.startsWith("image/") ? (
        <a href={url} target="_blank" rel="noreferrer" title={m.attachment_name}>
          <img src={url} alt={m.attachment_name || "attachment"} className="max-h-40 rounded-lg border border-slate-200" />
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="inline-block rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
          Attachment: {m.attachment_name || "file"}
        </a>
      )}
    </div>
  );
}

function CaseDrawer({ id, isFullAdmin, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);
  const endRef = useRef(null);

  const load = () =>
    api.feedback
      .get(id)
      .then((d) => {
        setData(d);
        window.dispatchEvent(new Event("notifications-changed")); // opening a case marks it read
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    setData(null);
    setError(null);
    setText("");
    setFile(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages?.length]);

  const pickFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > MAX_ATTACHMENT_BYTES) {
      setError("That file is over 20 MB -- pick a smaller image or PDF.");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(f);
  };

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (e) {
      setError(e.message);
      load(); // the case may have been closed meanwhile
    } finally {
      setBusy(false);
    }
  };
  const send = () =>
    run(async () => {
      await api.feedback.reply(id, text.trim(), file);
      setText("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    });

  const closed = data?.status === "closed";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-[640px] flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {data && <StatusChip status={data.status} />}
              <span className="font-display text-sm font-semibold text-ink">{data ? data.title : "Loading…"}</span>
            </div>
            {data && (
              <div className="mt-0.5 text-xs text-slate-400">
                {isFullAdmin ? data.email : "You"} · {data.scope_value || data.role} · started {formatTime(data.created_at)}
              </div>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100" aria-label="Close">
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
          {!data && !error && <div className="text-center text-sm text-slate-400">Loading…</div>}
          {data?.messages.map((m) => {
            const admin = m.sender_role === "admin";
            return (
              <div key={m.id} className={`flex ${admin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 ring-1 ${admin ? "bg-brand/5 ring-brand/15" : "bg-white ring-slate-200"}`}>
                  <div className={`text-xs font-semibold ${admin ? "text-brand" : "text-slate-600"}`}>
                    {admin ? "Superadmin" : m.is_mine ? "You" : "User"}
                    <span className="ml-1 font-normal text-slate-400">
                      {isFullAdmin || admin ? `· ${m.sender_email} ` : ""}· {formatTime(m.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>
                  <Attachment m={m} />
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {error && <div className="border-t border-status-critical/20 bg-status-critical/5 px-4 py-2 text-sm text-status-critical">{error}</div>}

        <div className="space-y-2 border-t border-slate-200 px-4 py-3">
          {data && closed ? (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
              This case is <strong>CLOSED</strong>{data.closed_at ? ` (${formatTime(data.closed_at)})` : ""} -- it stays readable but takes no more messages
              {data.delete_after ? `, and it is deleted automatically on ${formatTime(data.delete_after)}` : ""}.
            </div>
          ) : (
            data && (
              <>
                <textarea
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  rows={3}
                  placeholder={isFullAdmin && !data.is_mine ? "Write a reply…" : "Write a message…"}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs text-slate-500">
                    Attach a screenshot or PDF (optional){" "}
                    <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,image/*,application/pdf" onChange={pickFile} className="block text-xs" />
                  </label>
                  <button onClick={send} disabled={busy || !text.trim()} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                    {busy ? "Sending…" : isFullAdmin && !data.is_mine ? "Send reply" : "Send message"}
                  </button>
                </div>
              </>
            )
          )}
          {data && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div>
                {data.is_mine && (
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete this feedback? It will be removed for the admins too.")) return;
                      setBusy(true);
                      try {
                        await api.feedback.remove(id);
                        onChanged();
                        onClose();
                      } catch (e) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={busy}
                    className="text-xs font-medium text-slate-400 hover:text-status-critical disabled:opacity-40"
                  >
                    Delete my feedback
                  </button>
                )}
              </div>
              {isFullAdmin &&
                (closed ? (
                  <button onClick={() => run(() => api.feedback.update(id, { status: "open" }))} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-40">
                    Reopen case
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (window.confirm("Close this case? It stays readable but nobody can reply any more, and it is deleted 7 days after it is closed.")) run(() => api.feedback.update(id, { status: "closed" }));
                    }}
                    disabled={busy}
                    className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-40"
                  >
                    Close case
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPanel({ me }) {
  const isFullAdmin = me.role === "admin";
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const fileInput = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("open"); // open | closed | all
  const [openId, setOpenId] = useState(null);

  const loadList = () =>
    api.feedback
      .list()
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    loadList();
  }, []);

  const pickFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > MAX_ATTACHMENT_BYTES) {
      setError("That file is over 20 MB -- pick a smaller image or PDF.");
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
      const res = await api.feedback.submit(message.trim(), file);
      setMessage("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      await loadList();
      if (res?.id) setOpenId(res.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openRows = (rows || []).filter((r) => r.status === "open");
  const closedRows = (rows || []).filter((r) => r.status === "closed");
  const shown = filter === "open" ? openRows : filter === "closed" ? closedRows : rows || [];

  return (
    <div className="space-y-3">
      {error && !openId && (
        <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{error}</div>
      )}
      <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-slate-700">Send feedback to the admin team</div>
        <p className="text-xs text-slate-400">
          Got a complaint, a bug, or an idea for the dashboard? It opens a case that goes straight to whoever manages this app, and only you and the admins can see it. They reply here and you can reply
          back -- the case stays open until the admin closes it.
        </p>
        <textarea className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" rows={3} placeholder="What's on your mind?" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs text-slate-500">
            Attach a screenshot or PDF (optional, max 20 MB){" "}
            <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,image/*,application/pdf" onChange={pickFile} className="block text-xs" />
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{submitted && "Thanks — your feedback was sent."}</span>
            <button onClick={submit} disabled={submitting || !message.trim()} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              {submitting ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
          <div className="font-display text-sm font-medium text-slate-700">
            {isFullAdmin ? "Feedback cases" : "Your feedback"} ({openRows.length} open)
          </div>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
            {[
              ["open", `Open (${openRows.length})`],
              ["closed", `Closed (${closedRows.length})`],
              ["all", "All"],
            ].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1 ${filter === k ? "bg-ink text-white" : "bg-white text-slate-500"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {!rows ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">{rows.length === 0 ? "Nothing submitted yet." : filter === "closed" ? "Nothing closed." : "Nothing open."}</div>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {shown.map((r) => (
              <li key={r.id}>
                <button onClick={() => setOpenId(r.id)} className={`flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 ${r.status === "closed" ? "bg-slate-50/60" : ""}`}>
                  <div className="w-16 shrink-0 pt-0.5">
                    <StatusChip status={r.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm ${r.unread ? "font-bold text-ink" : "font-medium text-slate-800"}`}>{r.title}</span>
                      {r.unread && <span className="shrink-0 rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">NEW</span>}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {isFullAdmin ? `${r.email} · ` : ""}
                      {r.scope_value || r.role} · {r.reply_count} {r.reply_count === 1 ? "reply" : "replies"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-400">{formatTime(r.last_message_at)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {openId && <CaseDrawer id={openId} isFullAdmin={isFullAdmin} onClose={() => { setOpenId(null); loadList(); }} onChanged={loadList} />}
    </div>
  );
}
