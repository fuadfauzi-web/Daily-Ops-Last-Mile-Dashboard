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

// The same tracking number on several rows (one row per PIC): each such group gets its own tint so the rows read as
// one group. The "x2" chip beside the number means colour is never the only signal.
const DUP_STYLES = [
  { row: "bg-amber-50", chip: "bg-amber-200 text-amber-900" },
  { row: "bg-sky-50", chip: "bg-sky-200 text-sky-900" },
  { row: "bg-violet-50", chip: "bg-violet-200 text-violet-900" },
  { row: "bg-emerald-50", chip: "bg-emerald-200 text-emerald-900" },
  { row: "bg-rose-50", chip: "bg-rose-200 text-rose-900" },
];

// Tells the app shell (the Urgent TN tab's bell, the Admin badge) to re-fetch its
// counts now instead of waiting for its next poll.
function notifyChanged() {
  window.dispatchEvent(new Event("notifications-changed"));
}

// 2026-09-25: the tracked list is stored on the server (not in this browser) so a
// tracking number can be assigned to a PIC -- another user, by email, who must
// already be in the user list. Two roles on each item:
//   * the PIC (assignee) picks a status -- "In progress" (acknowledges it: the tab's bell
//     goes quiet for an hour and comes back -- 8am to 8pm only -- if it still isn't closed) or "Closed" (bell
//     gone; the item stays in the PIC's list, marked closed) -- and can type a reply the
//     owner sees;
//   * the owner (whoever added it) can edit the PIC / note, reopen an item the PIC
//     closed, and Close or Remove it -- both delete it, so it leaves the PIC's list too.
export default function UrgentTnTab({ me, refreshTick }) {
  const legacyKey = `urgent-tn-list-${me.email}`;
  const [items, setItems] = useState(null);
  const [asOf, setAsOf] = useState(null);
  // Owner reminder (10am / 2pm / 5pm): how many of my tracking numbers are still open while it is ringing.
  const [ownerReminder, setOwnerReminder] = useState(0);
  const [view, setView] = useState("open");
  // Tick several of your own rows and remove them in one go (2026-09-25 feedback).
  const [selected, setSelected] = useState(() => new Set());
  // 2026-09-25 feedback: every header sorts. The default (sortKey null) keeps rows of the same tracking number
  // together, newest tracking number first; clicking a header sorts by that column instead.
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "created_at" || key === "age" ? "desc" : "asc");
    }
  };
  const [input, setInput] = useState("");
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  // "Assign to another PIC": adds one more PIC for a tracking number without touching the PICs who
  // already have it (the owner can add several, and a PIC can pass it on while keeping their copy).
  const [delegating, setDelegating] = useState(null);
  const [delegateAssignee, setDelegateAssignee] = useState("");
  const [delegateNote, setDelegateNote] = useState("");
  const [replying, setReplying] = useState(null); // PIC: item being replied to
  const [replyText, setReplyText] = useState("");
  const [noting, setNoting] = useState(null); // owner: the row whose note is being edited / re-sent
  const [noteText, setNoteText] = useState("");
  // Items that were NEW / UPDATED when this tab was opened stay highlighted for the visit,
  // even though opening the tab marks them as seen.
  const [newIds, setNewIds] = useState(() => new Set());
  const migrated = useRef(false);

  const load = async () => {
    try {
      const res = await api.urgentTn.items();
      setItems(res.items);
      setAsOf(res.captured_at);
      setOwnerReminder(res.owner_reminder_count || 0);
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
  const ackOwnerReminder = () => run(() => api.urgentTn.reminderAck());
  // No "are you sure?" pop-up (2026-09-25 feedback): Close / remove deletes it straight away.
  const closeOrRemove = (item) => run(() => api.urgentTn.remove(item.id), `Removed ${item.tracking_number}`);
  const removeSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await run(() => api.urgentTn.removeMany(ids));
    if (ok) setSelected(new Set());
  };
  // An owner's row with nobody on it yet (or only themselves): "Assign PIC" EDITS that row. Every other case -- adding one
  // more PIC, or a PIC passing it on -- is a NEW row, because that PIC has to close the loop with their own owner.
  const assignEdit = !!delegating && delegating.created_by_me && (!delegating.assignee_email || delegating.assigned_to_me);
  const startDelegate = (item) => {
    setNoting(null);
    setReplying(null);
    setDelegating(item);
    setDelegateAssignee("");
    setDelegateNote(item.note || "");
  };
  const saveDelegate = async () => {
    const ok = await run(
      () =>
        assignEdit
          ? api.urgentTn.update(delegating.id, { assignee_email: delegateAssignee.trim(), note: delegateNote.trim() || null })
          : api.urgentTn.create({
              tracking_numbers: [delegating.tracking_number],
              assignee_email: delegateAssignee.trim(),
              note: delegateNote.trim() || null,
            }),
      assignEdit ? "PIC assigned" : undefined
    );
    if (ok) setDelegating(null);
  };
  // A PIC replies to the owner (pic_reply); the owner replies back to the PIC (owner_reply).
  const startReply = (item) => {
    setNoting(null); // one small form open at a time
    setDelegating(null);
    setReplying(item);
    setReplyText((item.created_by_me ? item.owner_reply : item.pic_reply) || "");
  };
  const saveReply = async () => {
    const field = replying.created_by_me ? "owner_reply" : "pic_reply";
    // (an owner's reply says what happened itself: sent / no change)
    const ok = await run(() => api.urgentTn.update(replying.id, { [field]: replyText }), replying.created_by_me ? undefined : "Reply sent");
    if (ok) setReplying(null);
  };
  // Owner: a forgotten / corrected / updated note. Sending it again brings the row back to the PIC's attention.
  const startNote = (item) => {
    setReplying(null);
    setDelegating(null);
    setNoting(item);
    setNoteText(item.note || "");
  };
  const saveNote = async () => {
    const ok = await run(() => api.urgentTn.update(noting.id, { note: noteText }));
    if (ok) setNoting(null);
  };

  const isPic = (r) => r.assigned_to_me && !r.created_by_me;

  // Drop ticks for rows that are gone (removed, or expired) so "Remove selected (N)" never lies.
  useEffect(() => {
    if (!items) return;
    setSelected((prev) => {
      const alive = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

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
    const base =
      view === "closed"
        ? list.filter((i) => i.status === "closed")
        : view === "mine"
          ? list.filter((i) => i.assigned_to_me && !i.created_by_me)
          : list.filter((i) => i.status === "in_progress");
    if (sortKey == null) {
      // Default order: one tracking number's rows sit together (the original assignment first, then the extra PICs).
      const newest = new Map();
      base.forEach((r) => {
        const t = r.created_at || "";
        if (!newest.has(r.tracking_number) || t > newest.get(r.tracking_number)) newest.set(r.tracking_number, t);
      });
      return [...base].sort((a, b) => {
        if (a.tracking_number !== b.tracking_number) {
          return newest.get(b.tracking_number).localeCompare(newest.get(a.tracking_number)) || a.tracking_number.localeCompare(b.tracking_number);
        }
        return (a.created_at || "").localeCompare(b.created_at || "");
      });
    }
    // The value each column sorts by (what the cell shows, not the raw field where they differ).
    const valueOf = (r) => {
      switch (sortKey) {
        case "pic":
          return r.assignee_email ? (r.assigned_to_me ? "you" : (r.assignee_name || r.assignee_email).toLowerCase()) : "";
        case "status":
          return r.assignee_email ? r.status : "";
        case "tn_status":
          return r.found ? r.tn_status || "" : "Not found";
        case "created_by":
          return r.created_by_me ? "you" : r.created_by.toLowerCase();
        case "note":
        case "pic_reply":
        case "owner_reply":
        case "dest_hub":
        case "last_sweep_hub":
        case "cod":
        case "tracking_number":
          return (r[sortKey] || "").toString().toLowerCase();
        default:
          return r[sortKey]; // created_at (ISO text sorts correctly), age, attempts
      }
    };
    // Empty values always sort last, whichever direction.
    return [...base].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      const aEmpty = av == null || av === "";
      const bEmpty = bv == null || bv === "";
      if (aEmpty || bEmpty) return aEmpty && bEmpty ? 0 : aEmpty ? 1 : -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, view, sortKey, sortDir]);

  // Tracking numbers that appear on more than one row of this list: how many rows, and which tint (by order of appearance,
  // so neighbouring groups never share one).
  const dupOf = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => counts.set(r.tracking_number, (counts.get(r.tracking_number) || 0) + 1));
    const styleFor = new Map();
    rows.forEach((r) => {
      if (counts.get(r.tracking_number) > 1 && !styleFor.has(r.tracking_number)) styleFor.set(r.tracking_number, styleFor.size % DUP_STYLES.length);
    });
    return { counts, styleFor };
  }, [rows]);

  // Only rows you added can be removed, so only those get a tick box.
  const selectableIds = rows.filter((r) => r.created_by_me).map((r) => r.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableIds));

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
          {dupOf.styleFor.has(r.tracking_number) && (
            <span
              title="This tracking number is on more than one row (one per PIC)"
              className={`ml-2 rounded px-1.5 py-0.5 font-display text-[10px] font-semibold ${DUP_STYLES[dupOf.styleFor.get(r.tracking_number)].chip}`}
            >
              ×{dupOf.counts.get(r.tracking_number)}
            </span>
          )}
          {newIds.has(r.id) && (
            <span className="ml-2 rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">
              {r.created_by_me || r.note_sent_at || r.owner_replied_at ? "UPDATED" : "NEW"}
            </span>
          )}
        </>
      ),
    },
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          disabled={selectableIds.length === 0}
          title="Select all of yours in this list"
          aria-label="Select all"
        />
      ),
      sortable: false,
      render: (r) =>
        r.created_by_me ? (
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.tracking_number}`} />
        ) : null,
    },
    { key: "created_at", label: "Entry Time", render: (r) => formatTime(r.created_at), className: () => "whitespace-nowrap text-xs text-slate-600" },
    { key: "pic", label: "PIC", render: picLabel, className: (r) => (r.assigned_to_me ? "font-semibold text-brand" : "text-slate-700") },
    {
      key: "note",
      label: "Note",
      align: "left",
      // The cell itself is no-wrap, so a long note ran on into the next column (the "double text"
      // bug): give the text its own fixed-width block that wraps.
      render: (r) =>
        r.note ? (
          <div className="w-[220px] whitespace-normal break-words text-left">
            {r.note}
            {r.assignee_email && r.note_sent_at && <div className="text-[10px] text-slate-400">sent {formatTime(r.note_sent_at)}</div>}
          </div>
        ) : (
          "—"
        ),
      className: () => "text-xs text-slate-600",
    },
    {
      key: "status",
      label: "PIC Status",
      render: (r) => {
        if (!r.assignee_email) return "—";
        if (r.status === "closed") return `Closed${r.closed_by && r.closed_by.toLowerCase() !== me.email.toLowerCase() ? ` by ${r.closed_by.split("@")[0]}` : ""}`;
        return (
          <>
            In progress
            {r.next_reminder ? <div className="text-[10px] font-normal text-slate-400">reminder {r.next_reminder}</div> : null}
          </>
        );
      },
      className: (r) => (r.status === "closed" ? "text-slate-400" : r.assignee_email ? "font-medium text-status-warning" : "text-slate-400"),
    },
    {
      key: "pic_reply",
      label: "PIC Reply",
      align: "left",
      render: (r) =>
        r.pic_reply ? (
          <div className="w-[240px] whitespace-normal break-words text-left">
            {r.pic_reply}
            {r.pic_replied_at && <div className="text-[10px] text-slate-400">{formatTime(r.pic_replied_at)}</div>}
          </div>
        ) : (
          "—"
        ),
      className: () => "text-xs text-slate-600",
    },
    {
      key: "owner_reply",
      label: "Owner Reply",
      align: "left",
      render: (r) =>
        r.owner_reply ? (
          <div className="w-[240px] whitespace-normal break-words text-left">
            {r.owner_reply}
            {r.owner_replied_at && <div className="text-[10px] text-slate-400">{formatTime(r.owner_replied_at)}</div>}
          </div>
        ) : (
          "—"
        ),
      className: () => "text-xs text-slate-600",
    },
    {
      key: "tn_status",
      label: "Parcel Status",
      render: (r) =>
        r.found ? (
          r.tn_status ?? "—"
        ) : (
          <>
            Not found
            {r.no_status_hours_left != null && (
              <div className="text-[10px] font-normal text-slate-400">
                removed automatically in {r.no_status_hours_left}h
              </div>
            )}
          </>
        ),
      className: (r) => (r.found ? "text-slate-700" : "font-medium text-status-critical"),
    },
    { key: "dest_hub", label: "Dest Hub", render: (r) => r.dest_hub ?? "—" },
    { key: "last_sweep_hub", label: "Last Sweep Hub", render: (r) => r.last_sweep_hub ?? "—" },
    { key: "age", label: "Age", render: (r) => (r.age != null ? r.age.toFixed(1) : "—") },
    { key: "attempts", label: "Attempt", render: (r) => r.attempts ?? "—" },
    { key: "cod", label: "COD", render: (r) => r.cod ?? "—" },
    {
      key: "created_by",
      label: "Added by",
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
                  title="Acknowledge: silences the bell for 1 hour, then it reminds you again (8am to 8pm) if it isn't closed"
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
              <button
                onClick={() => startDelegate(r)}
                disabled={!r.found}
                title={r.found ? "Also assign it to someone else -- you keep it on your list" : "No status, so it can't be assigned"}
                className="text-xs font-medium text-slate-500 hover:text-brand disabled:opacity-40"
              >
                Assign to another PIC
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
              {r.assignee_email && !r.assigned_to_me && (
                <>
                  <button
                    onClick={() => startNote(r)}
                    title="Fix, add or update the note and send it to the PIC again"
                    className="text-xs font-medium text-slate-500 hover:text-brand"
                  >
                    {r.note ? "Edit note" : "Add note"}
                  </button>
                  {(r.pic_reply || r.owner_reply) && (
                    <button onClick={() => startReply(r)} title="Reply to what the PIC wrote" className="text-xs font-medium text-slate-500 hover:text-brand">
                      Reply to PIC
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => startDelegate(r)}
                disabled={!r.found}
                title={
                  !r.found
                    ? "No status, so it can't be assigned"
                    : r.assignee_email && !r.assigned_to_me
                      ? "Also assign it to another PIC -- the current PIC keeps it (a new row)"
                      : "Put a PIC on this row"
                }
                className="text-xs font-medium text-slate-500 hover:text-brand disabled:opacity-40"
              >
                {r.assignee_email && !r.assigned_to_me ? "Assign another PIC" : "Assign PIC"}
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
          {sortKey != null && (
            <button
              onClick={() => {
                setSortKey(null);
                setSortDir("desc");
              }}
              title="Same tracking numbers together, newest first"
              className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600"
            >
              Default order
            </button>
          )}
          {selected.size > 0 && (
            <button
              onClick={removeSelected}
              disabled={busy}
              className="min-h-[44px] rounded-lg bg-status-critical px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40"
            >
              Remove selected ({selected.size})
            </button>
          )}
          {rows.length > 0 && (
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-urgent-tn-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Tracking Number", "Entry Time", "PIC", "Note", "PIC Status", "PIC Reply", "Owner Reply", "Parcel Status", "Dest Hub", "Last Sweep Hub", "Age", "Attempt", "COD", "Added by"],
                  rows.map((r) => [
                    r.tracking_number, r.created_at ? formatTime(r.created_at) : "", r.assignee_email ?? "", r.note ?? "", r.assignee_email ? (r.status === "closed" ? "Closed" : "In progress") : "",
                    r.pic_reply ?? "", r.owner_reply ?? "", r.found ? r.tn_status ?? "" : "Not found", r.dest_hub ?? "", r.last_sweep_hub ?? "", r.age ?? "",
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

      {ownerReminder > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-sm text-slate-700 ring-1 ring-amber-300">
          <span>
            Reminder: {ownerReminder} tracking number{ownerReminder === 1 ? "" : "s"} you added {ownerReminder === 1 ? "is" : "are"} still open (not closed
            yet). It comes back at 10am, 2pm and 5pm until you press Got it.
          </span>
          <button
            onClick={ackOwnerReminder}
            disabled={busy}
            className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40"
          >
            Got it
          </button>
        </div>
      )}

      {delegating && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-brand/40">
          <div className="font-display text-xs font-semibold text-slate-700">
            {assignEdit ? "Assign a PIC" : "Assign to another PIC"} — <span className="font-mono">{delegating.tracking_number}</span>
          </div>
          <div className="text-xs text-slate-500">
            {assignEdit
              ? "This puts the PIC on this row -- no new row."
              : delegating.created_by_me
                ? "The current PIC keeps this tracking number; this adds one more person (a new row)."
                : "You keep this tracking number on your list; this also gives it to someone else, who reports back to you (a new row, so they close it with you)."}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <PicInput placeholder="PIC name or email" value={delegateAssignee} onChange={setDelegateAssignee} />
            <input
              type="text"
              maxLength={500}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Note for this PIC"
              value={delegateNote}
              onChange={(e) => setDelegateNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveDelegate}
              disabled={busy || !delegateAssignee.trim()}
              className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40"
            >
              Assign
            </button>
            <button onClick={() => setDelegating(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {noting && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-brand/40">
          <div className="font-display text-xs font-semibold text-slate-700">
            Note for {noting.assignee_name || noting.assignee_email} — <span className="font-mono">{noting.tracking_number}</span>
          </div>
          <div className="text-xs text-slate-500">
            Sending a changed note puts this tracking number back in front of the PIC (bell and an UPDATED tag). If nothing changed, nothing is sent.
          </div>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            rows={3}
            maxLength={500}
            placeholder="Type the note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={saveNote} disabled={busy || noteText.trim() === (noting.note || "")} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
              Send note
            </button>
            <button onClick={() => setNoting(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {replying && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-brand/40">
          <div className="font-display text-xs font-semibold text-slate-700">
            Reply to {replying.created_by_me ? replying.assignee_name || replying.assignee_email : replying.created_by} — <span className="font-mono">{replying.tracking_number}</span>
          </div>
          {replying.created_by_me
            ? replying.pic_reply && <div className="text-xs text-slate-500">Their reply: {replying.pic_reply}</div>
            : replying.note && <div className="text-xs text-slate-500">Their note: {replying.note}</div>}
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
            <button onClick={saveReply} disabled={busy || (replying.created_by_me && replyText.trim() === (replying.owner_reply || ""))} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
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
          rowClassName={(r) => (dupOf.styleFor.has(r.tracking_number) ? DUP_STYLES[dupOf.styleFor.get(r.tracking_number)].row : "")}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
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
              to you. A tracking number on several rows (one per PIC) is kept together and shares a colour. A PIC picks In progress (quiets the tab's bell for an hour; it rings hourly from 8am to 8pm) or Closed (bell off; it stays on their list
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
