import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { exportCsv } from "./lib/csv";
import DataTable from "./components/DataTable";
import SegmentedControl from "./components/SegmentedControl";

// Parses a paste of tracking numbers separated by newlines, commas, semicolons
// or whitespace -- however the user copies them out of a sheet or chat message.
function parseTns(text) {
  return Array.from(new Set(text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)));
}

// Tells the header bell / banner in App.jsx to re-fetch its counts now instead
// of waiting for its next poll.
function notifyChanged() {
  window.dispatchEvent(new Event("notifications-changed"));
}

// 2026-09-25: the tracked list is stored on the server (not in this browser) so a
// tracking number can be assigned to a PIC -- another user, by email, who must
// already be in the user list. The PIC sees it here (marked NEW), in the header
// bell and in a banner on the dashboard, and either side can move it between
// In progress and Closed. Only whoever added it can change its PIC/note or
// delete it.
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
  const [editing, setEditing] = useState(null); // item being reassigned / re-noted
  const [editAssignee, setEditAssignee] = useState("");
  const [editNote, setEditNote] = useState("");
  // Items that were NEW when this tab was opened stay highlighted for the visit,
  // even though opening the tab marks them as seen for the bell.
  const [newIds, setNewIds] = useState(() => new Set());
  const migrated = useRef(false);

  const load = async () => {
    try {
      const res = await api.urgentTn.items();
      setItems(res.items);
      setAsOf(res.captured_at);
      const fresh = res.items.filter((i) => i.is_new).map((i) => i.id);
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
  const removeItem = (item) => {
    if (!window.confirm(`Remove ${item.tracking_number} from the list?`)) return;
    run(() => api.urgentTn.remove(item.id));
  };
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

  const counts = useMemo(() => {
    const list = items || [];
    return {
      open: list.filter((i) => i.status === "in_progress").length,
      mine: list.filter((i) => i.status === "in_progress" && i.assigned_to_me).length,
      closed: list.filter((i) => i.status === "closed").length,
    };
  }, [items]);

  const rows = useMemo(() => {
    const list = items || [];
    if (view === "closed") return list.filter((i) => i.status === "closed");
    if (view === "mine") return list.filter((i) => i.status === "in_progress" && i.assigned_to_me);
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
            <span className="ml-2 rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">NEW</span>
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
      className: () => "max-w-[260px] whitespace-normal text-xs text-slate-600",
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: (r) => (r.status === "closed" ? `Closed${r.closed_by ? ` by ${r.closed_by.split("@")[0]}` : ""}` : "In progress"),
      className: (r) => (r.status === "closed" ? "text-slate-400" : "font-medium text-status-warning"),
    },
    {
      key: "tn_status",
      label: "Parcel Status",
      sortable: false,
      render: (r) => (r.found ? r.tn_status ?? "—" : "Not found"),
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
          {r.status === "closed" ? (
            <button onClick={() => setStatus(r, "in_progress")} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-brand">
              Reopen
            </button>
          ) : (
            <button onClick={() => setStatus(r, "closed")} disabled={busy} className="text-xs font-semibold text-status-good hover:underline">
              Close
            </button>
          )}
          {r.created_by_me && (
            <>
              <button onClick={() => startEdit(r)} className="text-xs font-medium text-slate-500 hover:text-brand">
                Edit PIC
              </button>
              <button onClick={() => removeItem(r)} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-status-critical">
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
            PIC (optional) — email of someone already in the user list
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="name@ninjavan.co"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
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
                  ["Tracking Number", "PIC", "Note", "Status", "Parcel Status", "Dest Hub", "Last Sweep Hub", "Age", "Attempt", "COD", "Added by"],
                  rows.map((r) => [
                    r.tracking_number, r.assignee_email ?? "", r.note ?? "", r.status === "closed" ? "Closed" : "In progress",
                    r.found ? r.tn_status ?? "" : "Not found", r.dest_hub ?? "", r.last_sweep_hub ?? "", r.age ?? "",
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
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="PIC email (leave blank to unassign)"
              value={editAssignee}
              onChange={(e) => setEditAssignee(e.target.value)}
            />
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
              ? "Nothing closed yet."
              : view === "mine"
                ? "Nothing is assigned to you right now."
                : "Nothing tracked yet -- paste a tracking number above."
          }
          footer={
            <>
              {rows.length} tracking number{rows.length === 1 ? "" : "s"} · you see the ones you added and the ones assigned
              to you. Parcel details come from the same query 78 data Station Health uses (refreshed every 15 minutes),
              not a live search. "Not found" means the parcel is already completed or added to a shipment -- it's no
              longer in the active dataset. The PIC must already be in the user list.
            </>
          }
        />
      )}
    </div>
  );
}
