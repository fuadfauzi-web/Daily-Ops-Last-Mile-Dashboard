import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { exportCsv } from "./lib/csv";
import { DueInput, dueCell, dueClass, notifyChanged, sortRows, useAction, useSort } from "./lib/taskUi";
import DataTable from "./components/DataTable";
import MultiPicInput from "./components/MultiPicInput";
import SegmentedControl from "./components/SegmentedControl";

const STATUS_LABEL = { open: "Open", in_progress: "In progress", done: "Done" };

// Task List -> Task Assigned (2026-09-25): give a task to another dashboard user. They set it to
// Open / In progress / Done and can reply; you can edit, reopen or remove it (removing deletes it for
// both of you). Tasks for yourself belong in the To Do List.
export default function TaskAssignedTab({ refreshTick }) {
  const [items, setItems] = useState(null);
  const [view, setView] = useState("mine");
  const [form, setForm] = useState({ assignees: [], title: "", details: "", due_date: "", due_time: "" });
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({});
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [newIds, setNewIds] = useState(() => new Set());
  const { sortKey, sortDir, toggle } = useSort("due_date", "asc");

  const load = async () => {
    try {
      const list = await api.tasks.list();
      setItems(list);
      const fresh = list.filter((i) => i.is_new || i.owner_unseen).map((i) => i.id);
      if (fresh.length) setNewIds((prev) => new Set([...prev, ...fresh]));
      if (list.some((i) => i.owner_unseen)) {
        await api.tasks.markSeen();
        notifyChanged();
      }
    } catch (e) {
      setError(e.message);
    }
  };
  const { busy, error, info, run, setError } = useAction(load);
  useEffect(() => {
    load();
  }, [refreshTick]);

  const add = async () => {
    const ok = await run(() =>
      api.tasks.create({ assignee_emails: form.assignees, title: form.title, details: form.details, due_date: form.due_date || null, due_time: form.due_time || null })
    );
    if (ok) setForm({ assignees: [], title: "", details: "", due_date: "", due_time: "" });
  };

  const saveEdit = async () => {
    const payload = { title: edit.title, details: edit.details };
    if (edit.due_date) {
      payload.due_date = edit.due_date;
      payload.due_time = edit.due_time || ""; // blank clears the time
    } else payload.clear_due = true;
    const ok = await run(() => api.tasks.update(editing.id, payload));
    if (ok) setEditing(null);
  };
  const sendReply = async () => {
    const ok = await run(() => api.tasks.update(replying.id, { reply: replyText }), "Reply sent");
    if (ok) setReplying(null);
  };

  const counts = useMemo(() => {
    const l = items || [];
    return {
      mine: l.filter((i) => i.assigned_to_me && i.status !== "done").length,
      byMe: l.filter((i) => i.created_by_me && i.status !== "done").length,
      done: l.filter((i) => i.status === "done").length,
    };
  }, [items]);

  const rows = useMemo(() => {
    const l = items || [];
    const base =
      view === "done" ? l.filter((i) => i.status === "done") : view === "byme" ? l.filter((i) => i.created_by_me && i.status !== "done") : l.filter((i) => i.assigned_to_me && i.status !== "done");
    return sortRows(base, sortKey, sortDir, (r, key) => {
      if (key === "assignee") return (r.assigned_to_me ? "you" : r.assignee_name || r.assignee_email).toLowerCase();
      if (key === "created_by") return (r.created_by_me ? "you" : r.created_by).toLowerCase();
      return typeof r[key] === "string" ? r[key].toLowerCase() : r[key];
    });
  }, [items, view, sortKey, sortDir]);

  const columns = [
    {
      key: "title",
      label: "Task",
      sticky: true,
      align: "left",
      render: (r) => (
        <div className="max-w-[300px] whitespace-normal break-words text-left">
          <span className={r.status === "done" ? "text-slate-400 line-through" : ""}>{r.title}</span>
          {newIds.has(r.id) && <span className="ml-2 rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">{r.created_by_me ? "UPDATED" : "NEW"}</span>}
          {r.details && <div className="text-xs font-normal text-slate-500">{r.details}</div>}
        </div>
      ),
    },
    { key: "assignee", label: "Assigned to", render: (r) => (r.assigned_to_me ? "You" : r.assignee_name || r.assignee_email), className: (r) => (r.assigned_to_me ? "font-semibold text-brand" : "text-slate-700") },
    { key: "created_by", label: "Assigned by", render: (r) => (r.created_by_me ? "You" : r.created_by), className: () => "text-xs text-slate-500" },
    { key: "due_date", label: "Due", render: (r) => dueCell(r, (row) => run(() => api.reminders.ack("task", row.id)), busy), className: dueClass },
    {
      key: "status",
      label: "Status",
      render: (r) => STATUS_LABEL[r.status] || r.status,
      className: (r) => (r.status === "done" ? "text-status-good" : r.status === "in_progress" ? "font-medium text-status-warning" : "text-slate-600"),
    },
    {
      key: "assignee_reply",
      label: "Reply",
      align: "left",
      render: (r) =>
        r.assignee_reply ? (
          <div className="w-[220px] whitespace-normal break-words text-left">
            {r.assignee_reply}
            {r.assignee_replied_at && <div className="text-[10px] text-slate-400">{formatTime(r.assignee_replied_at)}</div>}
          </div>
        ) : (
          "—"
        ),
      className: () => "text-xs text-slate-600",
    },
    { key: "created_at", label: "Assigned on", render: (r) => formatTime(r.created_at), className: () => "whitespace-nowrap text-xs text-slate-500" },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
          {r.assigned_to_me && (
            <>
              <div className="flex overflow-hidden rounded-md border border-slate-300 text-[11px] font-semibold">
                {["open", "in_progress", "done"].map((s, i) => (
                  <button
                    key={s}
                    onClick={() => run(() => api.tasks.update(r.id, { status: s }))}
                    disabled={busy}
                    className={`px-2 py-1 ${i > 0 ? "border-l border-slate-300" : ""} ${r.status === s ? (s === "done" ? "bg-status-good/15 text-status-good" : "bg-status-warning/15 text-status-warning") : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <button onClick={() => { setReplying(r); setReplyText(r.assignee_reply || ""); }} className="text-xs font-medium text-slate-500 hover:text-brand">
                Reply
              </button>
            </>
          )}
          {r.created_by_me && (
            <>
              {r.status === "done" && (
                <button onClick={() => run(() => api.tasks.update(r.id, { reopen: true }))} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-brand">
                  Reopen
                </button>
              )}
              <button onClick={() => { setEditing(r); setEdit({ title: r.title, details: r.details || "", due_date: r.due_date || "", due_time: r.due_time || "" }); }} className="text-xs font-medium text-slate-500 hover:text-brand">
                Edit
              </button>
              <button onClick={() => run(() => api.tasks.remove(r.id), "Removed")} disabled={busy} className="text-xs font-semibold text-status-good hover:underline" title="Deletes it for you and the assignee">
                Close / remove
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
        <div className="font-display text-xs font-semibold text-slate-700">Assign a task to someone</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="text-xs text-slate-500">
            Assign to — one or more dashboard users
            <div className="mt-1">
              <MultiPicInput value={form.assignees} onChange={(v) => setForm({ ...form, assignees: v })} placeholder="Start typing a name or email…" />
            </div>
          </div>
          <DueInput label="Due date (time is optional)" date={form.due_date} time={form.due_time} onChange={(d, t) => setForm({ ...form, due_date: d, due_time: t })} />
        </div>
        <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Task" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={255} />
        <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Details (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} maxLength={1000} />
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={add} disabled={busy || !form.title.trim() || form.assignees.length === 0} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
            Assign task{form.assignees.length > 1 ? ` to ${form.assignees.length} people` : ""}
          </button>
          {rows.length > 0 && (
            <button
              onClick={() => exportCsv(`daily-ops-tasks-${new Date().toISOString().slice(0, 10)}.csv`, ["Task", "Details", "Assigned to", "Assigned by", "Due", "Status", "Reply"], rows.map((r) => [r.title, r.details ?? "", r.assignee_email, r.created_by, r.due_date ?? "", STATUS_LABEL[r.status], r.assignee_reply ?? ""]))}
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
          <div className="font-display text-xs font-semibold text-slate-700">Edit — {editing.title}</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Task" />
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.details} onChange={(e) => setEdit({ ...edit, details: e.target.value })} placeholder="Details" />
            <DueInput label="Due date (time is optional)" date={edit.due_date} time={edit.due_time} onChange={(d, t) => setEdit({ ...edit, due_date: d, due_time: t })} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={busy || !edit.title.trim()} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">Save</button>
            <button onClick={() => setEditing(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {replying && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-brand/40">
          <div className="font-display text-xs font-semibold text-slate-700">Reply to {replying.created_by} — {replying.title}</div>
          <textarea className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" rows={3} maxLength={1000} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Update / question…" autoFocus />
          <div className="flex gap-2">
            <button onClick={sendReply} disabled={busy || !replyText.trim()} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">Send reply</button>
            <button onClick={() => setReplying(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      <SegmentedControl
        options={[
          { key: "mine", label: `Assigned to me (${counts.mine})` },
          { key: "byme", label: `Assigned by me (${counts.byMe})` },
          { key: "done", label: `Done (${counts.done})` },
        ]}
        value={view}
        onChange={setView}
      />

      {items === null ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-400 ring-1 ring-slate-200">Loading…</div>
      ) : (
        <DataTable
          title="Assigned tasks"
          maxHeight="60vh"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggle}
          emptyMessage={view === "mine" ? "Nothing is assigned to you." : view === "byme" ? "You haven't assigned anything." : "Nothing done yet."}
          footer={<>{rows.length} task{rows.length === 1 ? "" : "s"} · the Task List bell rings for a task assigned to you that you haven't picked a status for (and while it's due or overdue), and for a reply or status change on one you assigned; an amber dot means one of yours is due within 2 days.</>}
        />
      )}
    </div>
  );
}
