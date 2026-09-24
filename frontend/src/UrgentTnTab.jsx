import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { exportCsv } from "./lib/csv";
import DataTable from "./components/DataTable";
import SegmentedControl from "./components/SegmentedControl";
import PicInput from "./components/PicInput";

// Parses a paste of tracking numbers separated by newlines, commas, semicolons
// or whitespace -- however the user copies them out of a sheet or chat message.
function parseTns(text) {
  return Array.from(new Set(text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)));
}

// Tells the app shell (the Urgent TN tab's bell, the Admin badge) to re-fetch its
// counts now instead of waiting for its next poll.
function notifyChanged() {
  window.dispatchEvent(new Event("notifications-changed"));
}

// 2026-09-25: the tracked list is stored on the server (not in this browser) so a
// tracking number can be assigned to a PIC -- another user, by email, who must
// already be in the user list. Two roles on each item:
//   * the PIC (assignee) picks a status -- "In progress" (acknowledges it: the tab's bell
//     goes quiet and comes back after an hour if it still isn't closed) or "Closed" (bell
//     gone; the item stays in the PIC's list, marked closed) -- and can type a reply the
//     owner sees;
//   * the owner (whoever added it) can edit the PIC / note, reopen an item the PIC
//     closed, and Close or Remove it -- both delete it, so it leaves the PIC's list too.
export default function UrgentTnTab({ me, refreshTick }) {
  const legacyKey = `urgent-tn-list-${me.email}`;
  const [items, setItems] = useState(null);
  const [asOf, setAsOf] = useState(null);
  const [view, setView] = useState("open");
  const [input, setInput] = useState("");
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [editing, setEditing] = useState(null); // owner: item being re-assigned / re-noted
  const [editAssignee, setEditAssignee] = useState("");
  const [editNote, setEditNote] = useState("");
  const [replying, setReplying] = useState(null); // PIC: item being replied to
  const [replyText, setReplyText] = useState("");
  // Items that were NEW / UPDATED when this tab was opened stay highlighted for the visit,
  // even though opening the tab marks them as seen.
  const [newIds, setNewIds] = useState(() => new Set());
  const migrated = useRef(false);

  const load = async () => {
    try {
      const res = await api.urgentTn.items();
      setItems(res.items);
      setAsOf(res.captured_at);
      const fresh = res.items.filter((i) => i.is_new || i.owner_unseen).map((i) => i.id);
      if (fresh.length) {
        setNewIds((prev) => new Set([...prev, ...fresh]));
        await api.urgentTn.markSeen();
        notifyChanged();
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // First load: bring across whatever this browser was tracking before the list
  // moved to the server (unassigned), once, then forget the old copy.
  useEffect(() => {
    (async () => {
      if (!migrated.current) {
        migrated.current = true;
        try {
          const saved = JSON.parse(localStorage.getItem(legacyKey) || "null");
          if (Array.isArray(saved) && saved.length) {
            await api.urgentTn.create({ tracking_numbers: saved.slice(0, 200) });
            localStorage.removeItem(legacyKey);
          }
        } catch {
          /* storage blocked / bad JSON / server refused -- just skip the import */
        }
      }
      load();
    })();
  }, [refreshTick]);

  const run = async (fn, okMessage) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fn();
      if (okMessage || res?.detail) setInfo(okMessage || res.detail);
      await load();
      notifyChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addTns = async () => {
    const tns = parseTns(input);
    if (!tns.length) return;
    const ok = await run(() =>
      api.urgentTn.create({ tracking_numbers: tns, assignee_email: assignee.trim() || null, note: note.trim() || null })
    );
    if (ok) {
      setInput("");
      setNote("");
    }
  };

  const setStatus = (item, status) => run(() => api.urgentTn.update(item.id, { status }));
  // No "are you sure?" pop-up (2026-09-25 feedback): Close / remove deletes it straight away.
  const closeOrRemove = (item) => run(() => api.urgentTn.remove(item.id), `Removed ${item.tracking_number}`);
  const startEdit = (item) => {
    setEditing(item);
    setEditAssignee(item.assignee_email || "");
    setEditNote(item.note || "");
  };
  const saveEdit = async () => {
    const payload = { note: editNote };
    if (editAssignee.trim()) payload.assignee_email = editAssignee.trim();
    else payload.clear_assignee = true;
    const ok = await run(() => api.urgentTn.update(editing.id, payload));
    if (ok) setEditing(null);
  };
  const startReply = (item) => {
    setReplying(item);
    setReplyText(item.pic_reply || "");
  };
  const saveReply = async () => {
    const ok = await run(() => api.urgentTn.update(replying.id, { pic_reply: replyText }), "Reply sent");
    if (ok) setReplying(null);
  };

  const isPic = (r) => r.assigned_to_me && !r.created_by_me;

  const counts = useMemo(() => {
    const list = items || [];
    return {
      open: list.filter((i) => i.status === "in_progress").length,
      mine: list.filter((i) => i.assigned_to_me && !i.created_by_me).length,
      closed: list.filter((i) => i.status === "closed").length,
    };
  }, [items]);

  const rows = useMemo(() => {
    const list = items || [];
    if (view === "closed") return list.filter((i) => i.status === "closed");
    if (view === "mine") return list.filter((i) => i.assigned_to_me && !i.created_by_me);
    return list.filter((i) => i.status === "in_progress");
  }, [items, view]);

  const picLabel = (r) => {
    if (!r.assignee_email) return "—";
    if (r.assigned_to_me) return "You";
    return r.assignee_name || r.assignee_email;
  };

  const columns = [
    {
      key: "tracking_number",
      label: "Tracking Number",
      sticky: true,
      align: "left",
      className: () => "font-mono text-xs",
      render: (r) => (
        <>
          {r.tracking_number}
          {newIds.has(r.id) && (
            <span className="ml-2 rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">
              {r.created_by_me ? "UPDATED" : "NEW"}
            </span>
          )}
        </>
      ),
    },
    { key: "pic", label: "PIC", sortable: false, render: picLabel, className: (r) => (r.assigned_to_me ? "font-semibold text-brand" : "text-slate-700") },
    {
      key: "note",
      label: "Note",
      sortable: false,
      align: "left",
      render: (r) => r.note || "—",
      className: () => "max-w-[220px] whitespace-normal text-xs text-slate-600",
    },
    {
      key: "status",
      label: "PIC Status",
      sortable: false,
      render: (r) => {
        if (!r.assignee_email) return "—";
        if (r.status === "closed") return `Closed${r.closed_by && r.closed_by.toLowerCase() !== me.email.toLowerCase() ? ` by ${r.closed_by.split("@")[0]}` : ""}`;
        return (
          <>
            In progress
            {r.reminder_in_minutes ? <div className="text-[10px] font-normal text-slate-400">reminder in {r.reminder_in_minutes} min</div> : null}
          </>
        );
      },
      className: (r) => (r.status === "closed" ? "text-slate-400" : r.assignee_email ? "font-medium text-status-warning" : "text-slate-400"),
    },
    {
      key: "pic_reply",
      label: "PIC Reply",
      sortable: false,
      align: "left",
      render: (r) =>
        r.pic_reply ? (
          <>
            {r.pic_reply}
            {r.pic_replied_at && <div className="text-[10px] text-slate-400">{formatTime(r.pic_replied_at)}</div>}
          </>
        ) : (
          "—"
        ),
      className: () => "max-w-[240px] whitespace-normal text-xs text-slate-600",
    },
    {
      key: "tn_status",
      label: "Parcel Status",
      sortable: false,
      render: (r) =>
        r.found ? (
          r.tn_status ?? "—"
        ) : (
          <>
            Not found
            {r.no_status_days_left != null && (
              <div className="text-[10px] font-normal text-slate-400">
                removed automatically in {r.no_status_days_left} day{r.no_status_days_left === 1 ? "" : "s"}
              </div>
            )}
          </>
        ),
      className: (r) => (r.found ? "text-slate-700" : "font-medium text-status-critical"),
    },
    { key: "dest_hub", label: "Dest Hub", sortable: false, render: (r) => r.dest_hub ?? "—" },
    { key: "last_sweep_hub", label: "Last Sweep Hub", sortable: false, render: (r) => r.last_sweep_hub ?? "—" },
    { key: "age", label: "Age", sortable: false, render: (r) => (r.age != null ? r.age.toFixed(1) : "—") },
    { key: "attempts", label: "Attempt", sortable: false, render: (r) => r.attempts ?? "—" },
    { key: "cod", label: "COD", sortable: false, render: (r) => r.cod ?? "—" },
    {
      key: "created_by",
      label: "Added by",
      sortable: false,
      render: (r) => (r.created_by_me ? "You" : r.created_by),
      className: () => "text-xs text-slate-500",
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
          {isPic(r) && (
            <>
              <div className="flex overflow-hidden rounded-md border border-slate-300 text-[11px] font-semibold">
                <button
                  onClick={() => setStatus(r, "in_progress")}
                  disabled={busy}
                  title="Acknowledge: silences the bell for 1 hour, then it reminds you again if it isn't closed"
                  className={`px-2 py-1 ${r.status === "in_progress" ? "bg-status-warning/15 text-status-warning" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  In progress
                </button>
                <button
                  onClick={() => setStatus(r, "closed")}
                  disabled={busy}
                  title="Done: the bell stays off; it remains on your list marked closed until the owner removes it"
                  className={`border-l border-slate-300 px-2 py-1 ${r.status === "closed" ? "bg-status-good/15 text-status-good" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  Closed
                </button>
              </div>
              <button onClick={() => startReply(r)} className="text-xs font-medium text-slate-500 hover:text-brand">
                Reply
              </button>
            </>
          )}
          {r.created_by_me && (
            <>
              {r.status === "closed" && (
                <button onClick={() => setStatus(r, "in_progress")} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-brand">
                  Reopen
                </button>
              )}
              <button onClick={() => startEdit(r)} className="text-xs font-medium text-slate-500 hover:text-brand">
                Edit PIC
              </button>
              <button onClick={() => closeOrRemove(r)} disabled={busy} className="text-xs font-semibold text-status-good hover:underline" title="Deletes it from your list and the PIC's">
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
        <div className="font-display text-xs font-semibold text-slate-700">
          Track a tracking number — paste one or more (newline, comma or space separated)
        </div>
        <textarea
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
          rows={3}
          placeholder="NVMYNINJA050427359&#10;NVMYNINJA050427360"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-slate-500">
            PIC (optional) — pick a dashboard user, or type their email (only for tracking numbers that have a status)
            <PicInput className="mt-1" placeholder="Start typing a name or email…" value={assignee} onChange={setAssignee} />
          </label>
          <label className="block text-xs text-slate-500">
            Note for the PIC (optional)
            <input
              type="text"
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="e.g. call the consignee, escalate before 3pm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={addTns}
            disabled={!input.trim() || busy}
            className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40"
          >
            {assignee.trim() ? "Track & assign" : "Track"}
          </button>
          <button
            onClick={() => load()}
            disabled={busy}
            className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600 disabled:opacity-40"
          >
            Refresh
          </button>
          {rows.length > 0 && (
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-urgent-tn-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Tracking Number", "PIC", "Note", "PIC Status", "PIC Reply", "Parcel Status", "Dest Hub", "Last Sweep Hub", "Age", "Attempt", "COD", "Added by"],
                  rows.map((r) => [
                    r.tracking_number, r.assignee_email ?? "", r.note ?? "", r.assignee_email ? (r.status === "closed" ? "Closed" : "In progress") : "",
                    r.pic_reply ?? "", r.found ? r.tn_status ?? "" : "Not found", r.dest_hub ?? "", r.last_sweep_hub ?? "", r.age ?? "",
                    r.attempts ?? "", r.cod ?? "", r.created_by,
                  ])
                )
              }
              className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600"
            >
              Export CSV
            </button>
          )}
          {asOf && <span className="text-xs text-slate-400">Looked up against data as of {formatTime(asOf)}</span>}
        </div>
      </div>

      {error && <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>}
      {info && !error && <div className="rounded-xl bg-white p-3 text-sm text-slate-600 ring-1 ring-slate-200">{info}</div>}

      {editing && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-brand/40">
          <div className="font-display text-xs font-semibold text-slate-700">
            Edit PIC / note — <span className="font-mono">{editing.tracking_number}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <PicInput placeholder="PIC name or email (leave blank to unassign)" value={editAssignee} onChange={setEditAssignee} />
            <input
              type="text"
              maxLength={500}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Note"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={busy} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
              Save
            </button>
            <button onClick={() => setEditing(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {replying && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-brand/40">
          <div className="font-display text-xs font-semibold text-slate-700">
            Reply to {replying.created_by} — <span className="font-mono">{replying.tracking_number}</span>
          </div>
          {replying.note && <div className="text-xs text-slate-500">Their note: {replying.note}</div>}
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            rows={3}
            maxLength={1000}
            placeholder="Type your update / reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={saveReply} disabled={busy} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
              Send reply
            </button>
            <button onClick={() => setReplying(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      <SegmentedControl
        options={[
          { key: "open", label: `In progress (${counts.open})` },
          { key: "mine", label: `Assigned to me (${counts.mine})` },
          { key: "closed", label: `Closed (${counts.closed})` },
        ]}
        value={view}
        onChange={setView}
      />

      {items === null ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-400 ring-1 ring-slate-200">Loading…</div>
      ) : (
        <DataTable
          title="Urgent tracking numbers"
          maxHeight="60vh"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage={
            view === "closed"
              ? "Nothing closed."
              : view === "mine"
                ? "Nothing is assigned to you right now."
                : "Nothing tracked yet -- paste a tracking number above."
          }
          footer={
            <>
              {rows.length} tracking number{rows.length === 1 ? "" : "s"} · you see the ones you added and the ones assigned
              to you. A PIC picks In progress (quiets the tab's bell for an hour) or Closed (bell off; it stays on their list
              marked closed) and can reply. When the person who added it closes or removes it, it disappears for both of you.
              Parcel details come from the same query 78 data Station Health uses (refreshed every 15 minutes), not a live
              search; "Not found" means the parcel is already completed or added to a shipment.
            </>
          }
        />
      )}
    </div>
  );
}
