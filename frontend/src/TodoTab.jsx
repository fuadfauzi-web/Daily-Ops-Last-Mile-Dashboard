import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { exportCsv } from "./lib/csv";
import { dueClass, dueLabel, isoToLocalInput, localInputToIso, sortRows, useAction, useSort } from "./lib/taskUi";
import DataTable from "./components/DataTable";
import SegmentedControl from "./components/SegmentedControl";

const PROGRESS_STEPS = [0, 25, 50, 75, 100];

function ProgressBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${value >= 100 ? "bg-status-good" : "bg-brand"}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-600">{value}%</span>
    </div>
  );
}

// Task List -> To Do List (2026-09-25): your own tracker -- what you need to get done, a due date,
// how far along it is, and an optional reminder time. Private to you.
export default function TodoTab({ refreshTick }) {
  const [items, setItems] = useState(null);
  const [view, setView] = useState("open");
  const [form, setForm] = useState({ title: "", details: "", due_date: "", progress: 0, remind_at: "" });
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({});
  const { sortKey, sortDir, toggle } = useSort("due_date", "asc");

  const load = async () => {
    try {
      setItems(await api.todos.list());
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
      api.todos.create({
        title: form.title,
        details: form.details,
        due_date: form.due_date || null,
        progress: Number(form.progress),
        remind_at: localInputToIso(form.remind_at),
      })
    );
    if (ok) setForm({ title: "", details: "", due_date: "", progress: 0, remind_at: "" });
  };

  const startEdit = (r) => {
    setEditing(r);
    setEdit({ title: r.title, details: r.details || "", due_date: r.due_date || "", remind_at: isoToLocalInput(r.remind_at) });
  };
  const saveEdit = async () => {
    const payload = { title: edit.title, details: edit.details };
    if (edit.due_date) payload.due_date = edit.due_date;
    else payload.clear_due = true;
    const newRemind = localInputToIso(edit.remind_at);
    if (edit.remind_at) {
      if (newRemind !== (editing.remind_at ? new Date(editing.remind_at.endsWith("Z") ? editing.remind_at : `${editing.remind_at}Z`).toISOString() : null)) payload.remind_at = newRemind;
    } else if (editing.remind_at) payload.clear_remind = true;
    const ok = await run(() => api.todos.update(editing.id, payload));
    if (ok) setEditing(null);
  };

  const counts = useMemo(() => {
    const l = items || [];
    return { open: l.filter((i) => !i.done).length, done: l.filter((i) => i.done).length };
  }, [items]);

  const rows = useMemo(() => {
    const base = (items || []).filter((i) => (view === "done" ? i.done : !i.done));
    return sortRows(base, sortKey, sortDir, (r, key) => (typeof r[key] === "string" ? r[key].toLowerCase() : r[key]));
  }, [items, view, sortKey, sortDir]);

  const columns = [
    {
      key: "title",
      label: "To do",
      sticky: true,
      align: "left",
      render: (r) => (
        <div className="max-w-[300px] whitespace-normal break-words text-left">
          <span className={r.done ? "text-slate-400 line-through" : ""}>{r.title}</span>
          {r.details && <div className="text-xs font-normal text-slate-500">{r.details}</div>}
        </div>
      ),
    },
    { key: "due_date", label: "Due", render: dueLabel, className: dueClass },
    {
      key: "progress",
      label: "Progress",
      render: (r) => (
        <div className="flex items-center justify-center gap-2">
          <ProgressBar value={r.progress} />
          <select
            value={PROGRESS_STEPS.includes(r.progress) ? r.progress : ""}
            onChange={(e) => run(() => api.todos.update(r.id, { progress: Number(e.target.value) }))}
            disabled={busy}
            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs"
            aria-label="Set progress"
          >
            {!PROGRESS_STEPS.includes(r.progress) && <option value="">{r.progress}%</option>}
            {PROGRESS_STEPS.map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      key: "remind_at",
      label: "Reminder",
      render: (r) =>
        r.remind_at ? (
          <>
            {formatTime(r.remind_at)}
            {r.reminder_due && (
              <div className="mt-0.5">
                <span className="rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">REMINDER</span>{" "}
                <button onClick={() => run(() => api.todos.update(r.id, { dismiss_reminder: true }))} disabled={busy} className="text-[11px] font-medium text-slate-500 underline hover:text-brand">
                  dismiss
                </button>
              </div>
            )}
          </>
        ) : (
          "—"
        ),
      className: () => "whitespace-nowrap text-xs text-slate-600",
    },
    { key: "created_at", label: "Added", render: (r) => formatTime(r.created_at), className: () => "whitespace-nowrap text-xs text-slate-500" },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
          {r.done ? (
            <button onClick={() => run(() => api.todos.update(r.id, { progress: 0 }))} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-brand">
              Reopen
            </button>
          ) : (
            <button onClick={() => run(() => api.todos.update(r.id, { progress: 100 }))} disabled={busy} className="text-xs font-semibold text-status-good hover:underline">
              Done
            </button>
          )}
          <button onClick={() => startEdit(r)} className="text-xs font-medium text-slate-500 hover:text-brand">
            Edit
          </button>
          <button onClick={() => run(() => api.todos.remove(r.id), "Removed")} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-status-critical">
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="font-display text-xs font-semibold text-slate-700">Add something you need to get done</div>
        <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="What do you need to do?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={255} />
        <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Details (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} maxLength={1000} />
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block text-xs text-slate-500">
            Due date
            <input type="date" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </label>
          <label className="block text-xs text-slate-500">
            Progress: {form.progress}%
            <input type="range" min="0" max="100" step="5" className="mt-3 w-full" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
          </label>
          <label className="block text-xs text-slate-500">
            Remind me at (optional)
            <input type="datetime-local" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={form.remind_at} onChange={(e) => setForm({ ...form, remind_at: e.target.value })} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={add} disabled={busy || !form.title.trim()} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
            Add to my list
          </button>
          {rows.length > 0 && (
            <button
              onClick={() => exportCsv(`daily-ops-todo-${new Date().toISOString().slice(0, 10)}.csv`, ["To do", "Details", "Due", "Progress %", "Reminder"], rows.map((r) => [r.title, r.details ?? "", r.due_date ?? "", r.progress, r.remind_at ? formatTime(r.remind_at) : ""]))}
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
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="To do" />
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.details} onChange={(e) => setEdit({ ...edit, details: e.target.value })} placeholder="Details" />
            <input type="date" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.due_date} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} />
            <input type="datetime-local" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={edit.remind_at} onChange={(e) => setEdit({ ...edit, remind_at: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={busy || !edit.title.trim()} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">Save</button>
            <button onClick={() => setEditing(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      <SegmentedControl options={[{ key: "open", label: `To do (${counts.open})` }, { key: "done", label: `Done (${counts.done})` }]} value={view} onChange={setView} />

      {items === null ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-400 ring-1 ring-slate-200">Loading…</div>
      ) : (
        <DataTable
          title="My to-do list"
          maxHeight="60vh"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggle}
          emptyMessage={view === "done" ? "Nothing finished yet." : "Nothing on your list -- add something above."}
          footer={<>{rows.length} item{rows.length === 1 ? "" : "s"} · private to you · a reminder rings the Task List bell once its time has come, until you dismiss it or finish the item; an amber dot means something is due within 2 days; 100% counts as done.</>}
        />
      )}
    </div>
  );
}
