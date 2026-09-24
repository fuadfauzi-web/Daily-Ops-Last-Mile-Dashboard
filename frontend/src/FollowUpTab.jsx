import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { exportCsv } from "./lib/csv";
import { dueClass, dueLabel, formatDay, notifyChanged, sortRows, useAction, useSort } from "./lib/taskUi";
import DataTable from "./components/DataTable";
import PicInput from "./components/PicInput";
import SegmentedControl from "./components/SegmentedControl";

const CHANNEL_LABEL = { email: "Email", gchat: "Gchat" };

// Task List -> Email / Gchat (2026-09-25): the messages you want to follow up again. Give each a due
// date and, if you like, ask another dashboard user to help reply or to remind you. That person sees
// it under "Helping me", can acknowledge it and type back what they did; you mark it done.
export default function FollowUpTab({ me, refreshTick }) {
  const [items, setItems] = useState(null);
  const [view, setView] = useState("open");
  const [form, setForm] = useState({ channel: "email", subject: "", contact: "", link: "", due_date: "", note: "", helper: "" });
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({});
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [newIds, setNewIds] = useState(() => new Set());
  const { sortKey, sortDir, toggle } = useSort("due_date", "asc");
  const loaded = useRef(false);

  const load = async () => {
    try {
      const list = await api.followups.list();
      setItems(list);
      const fresh = list.filter((i) => i.owner_unseen || (i.is_helper && !i.helper_acknowledged && i.status !== "done")).map((i) => i.id);
      if (fresh.length) setNewIds((prev) => new Set([...prev, ...fresh]));
      if (list.some((i) => i.owner_unseen)) {
        await api.followups.markSeen();
        notifyChanged();
      }
    } catch (e) {
      setError(e.message);
    }
  };
  const { busy, error, info, run, setError } = useAction(load);

  useEffect(() => {
    load();
    loaded.current = true;
  }, [refreshTick]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const add = async () => {
    const ok = await run(() =>
      api.followups.create({
        channel: form.channel,
        subject: form.subject,
        contact: form.contact,
        link: form.link,
        note: form.note,
        due_date: form.due_date || null,
        helper_email: form.helper.trim() || null,
      })
    );
    if (ok) setForm({ channel: form.channel, subject: "", contact: "", link: "", due_date: "", note: "", helper: "" });
  };

  const startEdit = (r) => {
    setEditing(r);
    setEdit({ subject: r.subject, contact: r.contact || "", link: r.link || "", due_date: r.due_date || "", note: r.note || "", helper: r.helper_email || "" });
  };
  const saveEdit = async () => {
    const payload = { subject: edit.subject, contact: edit.contact, link: edit.link, note: edit.note };
    if (edit.due_date) payload.due_date = edit.due_date;
    else payload.clear_due = true;
    if (edit.helper.trim()) {
      if (edit.helper.trim().toLowerCase() !== (editing.helper_email || "").toLowerCase()) payload.helper_email = edit.helper.trim();
    } else if (editing.helper_email) payload.clear_helper = true;
    const ok = await run(() => api.followups.update(editing.id, payload));
    if (ok) setEditing(null);
  };
  const sendReply = async () => {
    const ok = await run(() => api.followups.update(replying.id, { helper_reply: replyText }), "Reply sent");
    if (ok) setReplying(null);
  };

  const counts = useMemo(() => {
    const l = items || [];
    return {
      open: l.filter((i) => i.created_by_me && i.status !== "done").length,
      helping: l.filter((i) => i.is_helper && i.status !== "done").length,
      done: l.filter((i) => i.status === "done").length,
    };
  }, [items]);

  const valueOf = (r, key) => {
    switch (key) {
      case "helper":
        return r.helper_name || r.helper_email || "";
      case "status":
        return r.status;
      default:
        return typeof r[key] === "string" ? r[key].toLowerCase() : r[key];
    }
  };
  const rows = useMemo(() => {
    const l = items || [];
    const base =
      view === "done" ? l.filter((i) => i.status === "done") : view === "helping" ? l.filter((i) => i.is_helper && i.status !== "done") : l.filter((i) => i.created_by_me && i.status !== "done");
    return sortRows(base, sortKey, sortDir, valueOf);
  }, [items, view, sortKey, sortDir]);

  const columns = [
    {
      key: "subject",
      label: "Subject",
      sticky: true,
      align: "left",
      render: (r) => (
        <div className="max-w-[260px] whitespace-normal break-words text-left">
          <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-display text-[10px] font-semibold text-slate-600">{CHANNEL_LABEL[r.channel] || r.channel}</span>
          {r.subject}
          {newIds.has(r.id) && <span className="ml-2 rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">{r.created_by_me ? "UPDATED" : "NEW"}</span>}
          {r.link && (
            <a href={/^https?:\/\//i.test(r.link) ? r.link : `https://${r.link}`} target="_blank" rel="noreferrer" className="ml-2 text-xs font-normal text-brand underline" onClick={(e) => e.stopPropagation()}>
              open
            </a>
          )}
        </div>
      ),
    },
    { key: "contact", label: "Contact", render: (r) => r.contact || "—", className: () => "text-slate-700" },
    { key: "due_date", label: "Due", render: dueLabel, className: dueClass },
    {
      key: "helper",
      label: "PIC",
      render: (r) =>
        r.helper_email ? (
          <>
            {r.is_helper ? "You" : r.helper_name || r.helper_email}
            <div className={`text-[10px] font-normal ${r.helper_acknowledged ? "text-status-good" : "text-status-warning"}`}>
              {r.helper_acknowledged ? "acknowledged" : "waiting"}
            </div>
          </>
        ) : (
          "—"
        ),
      className: () => "text-slate-700",
    },
    {
      key: "helper_reply",
      label: "PIC Reply",
      align: "left",
      render: (r) =>
        r.helper_reply ? (
          <div className="w-[220px] whitespace-normal break-words text-left">
            {r.helper_reply}
            {r.helper_replied_at && <div className="text-[10px] text-slate-400">{formatTime(r.helper_replied_at)}</div>}
          </div>
        ) : (
          "—"
        ),
      className: () => "text-xs text-slate-600",
    },
    { key: "note", label: "Note", align: "left", render: (r) => (r.note ? <div className="w-[200px] whitespace-normal break-words text-left">{r.note}</div> : "—"), className: () => "text-xs text-slate-600" },
    { key: "created_by", label: "From", render: (r) => (r.created_by_me ? "You" : r.created_by), className: () => "text-xs text-slate-500" },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
          {r.is_helper && (
            <>
              {!r.helper_acknowledged && r.status !== "done" && (
                <button onClick={() => run(() => api.followups.update(r.id, { ack: true }))} disabled={busy} className="text-xs font-semibold text-status-good hover:underline">
                  Acknowledge
                </button>
              )}
              <button onClick={() => { setReplying(r); setReplyText(r.helper_reply || ""); }} className="text-xs font-medium text-slate-500 hover:text-brand">
                Reply
              </button>
            </>
          )}
          {r.created_by_me && (
            <>
              {r.status === "done" ? (
                <button onClick={() => run(() => api.followups.update(r.id, { status: "open" }))} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-brand">
                  Reopen
                </button>
              ) : (
                <button onClick={() => run(() => api.followups.update(r.id, { status: "done" }))} disabled={busy} className="text-xs font-semibold text-status-good hover:underline">
                  Done
                </button>
              )}
              <button onClick={() => startEdit(r)} className="text-xs font-medium text-slate-500 hover:text-brand">
                Edit
              </button>
              <button onClick={() => run(() => api.followups.remove(r.id), "Removed")} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-status-critical">
                Remove
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="font-display text-xs font-semibold text-slate-700">Add an email or Gchat you want to follow up again</div>
        <div className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr]">
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={form.channel} onChange={(e) => set("channel")(e.target.value)} aria-label="Channel">
            <option value="email">Email</option>
            <option value="gchat">Gchat</option>
          </select>
          <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Subject / what it's about" value={form.subject} onChange={(e) => set("subject")(e.target.value)} maxLength={255} />
          <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Contact — who is it with? (the sender or recipient)" value={form.contact} onChange={(e) => set("contact")(e.target.value)} maxLength={255} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block text-xs text-slate-500">
            Due date
            <input type="date" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={form.due_date} onChange={(e) => set("due_date")(e.target.value)} />
          </label>
          <label className="block text-xs text-slate-500">
            Link to the email / chat (optional)
            <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="https://…" value={form.link} onChange={(e) => set("link")(e.target.value)} maxLength={500} />
          </label>
          <label className="block text-xs text-slate-500">
            Assign a PIC (optional) — they help reply or remind you
            <PicInput className="mt-1" placeholder="Start typing a name or email…" value={form.helper} onChange={set("helper")} />
          </label>
        </div>
        <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Note (optional)" value={form.note} onChange={(e) => set("note")(e.target.value)} maxLength={1000} />
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={add} disabled={busy || !form.subject.trim()} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
            Add follow-up
          </button>
          {rows.length > 0 && (
            <button
              onClick={() =>
                exportCsv(`daily-ops-followups-${new Date().toISOString().slice(0, 10)}.csv`, ["Channel", "Subject", "Contact", "Due", "Status", "PIC", "PIC reply", "Note"],
                  rows.map((r) => [CHANNEL_LABEL[r.channel] || r.channel, r.subject, r.contact ?? "", r.due_date ?? "", r.status, r.helper_email ?? "", r.helper_reply ?? "", r.note ?? ""]))
              }
              className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>}
      {info && !error && <div className="rounded-xl bg-white p-3 text-sm text-slate-600 ring-1 ring-slate-200">{info}</div>}

      {editing && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-brand/40">
          <div className="font-display text-xs font-semibold text-slate-700">Edit — {editing.subject}</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} placeholder="Subject" />
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} placeholder="Contact (sender / recipient)" />
            <input type="date" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.due_date} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} />
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} placeholder="Link" />
            <PicInput placeholder="PIC (blank for none)" value={edit.helper} onChange={(v) => setEdit({ ...edit, helper: v })} />
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Note" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={busy || !edit.subject.trim()} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">Save</button>
            <button onClick={() => setEditing(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {replying && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-brand/40">
          <div className="font-display text-xs font-semibold text-slate-700">Reply to {replying.created_by} — {replying.subject}</div>
          <textarea className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" rows={3} maxLength={1000} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="What did you do / what should they know?" autoFocus />
          <div className="flex gap-2">
            <button onClick={sendReply} disabled={busy || !replyText.trim()} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">Send reply</button>
            <button onClick={() => setReplying(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      <SegmentedControl
        options={[
          { key: "open", label: `My follow-ups (${counts.open})` },
          { key: "helping", label: `Assigned to me (${counts.helping})` },
          { key: "done", label: `Done (${counts.done})` },
        ]}
        value={view}
        onChange={setView}
      />

      {items === null ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-400 ring-1 ring-slate-200">Loading…</div>
      ) : (
        <DataTable
          title="Email / Gchat follow-ups"
          maxHeight="60vh"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggle}
          emptyMessage={view === "helping" ? "No follow-up has been assigned to you." : view === "done" ? "Nothing done yet." : "Nothing to follow up -- add an email or Gchat above."}
          footer={
            <>
              {rows.length} follow-up{rows.length === 1 ? "" : "s"} · the Task List bell rings for follow-ups due today or overdue, for a reply from
              your PIC, and (for a PIC) until you acknowledge one; an amber dot means something is due within 2 days. Only you and your PIC can see a follow-up.
            </>
          }
        />
      )}
    </div>
  );
}
