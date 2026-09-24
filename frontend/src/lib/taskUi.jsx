import { useState } from "react";

// Small helpers shared by the Task List sub-tabs (Email / Gchat, To Do List, Task Assigned).

// "2026-09-30" -> "30 Sep 2026". Due dates are plain calendar dates, so format the text itself
// (going through Date would shift them by the browser's time zone).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (!m) return "—";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

// Colour for a due date: overdue red, due today amber, otherwise plain.
export function dueClass(row) {
  if (row.overdue) return "font-semibold text-status-critical";
  if (row.due_today) return "font-semibold text-status-warning";
  return "text-slate-700";
}

// "19:00" -> "7:00 pm" (19:00 is the EOD time, so it reads "EOD").
export function formatClock(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(value || "");
  if (!m) return "";
  const h = Number(m[1]);
  if (value.startsWith("19:00")) return "EOD (7:00 pm)";
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? "pm" : "am"}`;
}

export function dueLabel(row) {
  if (!row.due_date) return "—";
  return (
    <>
      {formatDay(row.due_date)}
      {row.due_time && <div className="text-[11px] font-normal">{formatClock(row.due_time)}</div>}
      {row.overdue && <div className="text-[10px] font-semibold">overdue</div>}
      {row.due_today && <div className="text-[10px] font-semibold">due today</div>}
    </>
  );
}

// The Due cell: the date (and time), plus the scheduled reminder chip with a "Got it" button while
// this item's reminder is ringing. onAck(row) dismisses it until the next reminder slot.
export function dueCell(row, onAck, busy) {
  return (
    <>
      {dueLabel(row)}
      {row.reminder_active && (
        <div className="mt-0.5 whitespace-nowrap">
          <span className="rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">REMINDER</span>{" "}
          <button onClick={() => onAck(row)} disabled={busy} className="text-[11px] font-medium text-slate-500 underline hover:text-brand">
            got it
          </button>
        </div>
      )}
    </>
  );
}

// Today's date as the browser sees it, "yyyy-mm-dd" (what <input type="date"> uses).
export function todayLocalIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Due date + optional time of day + an EOD shortcut (before 7pm today). onChange(date, time).
export function DueInput({ label = "Due", date, time, onChange }) {
  return (
    <div className="text-xs text-slate-500">
      {label}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          type="date"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={date}
          onChange={(e) => onChange(e.target.value, e.target.value ? time : "")}
        />
        <input
          type="time"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
          value={time}
          disabled={!date}
          onChange={(e) => onChange(date, e.target.value)}
          title="Optional -- a time of day to go with the date"
          aria-label="Due time (optional)"
        />
        <button
          type="button"
          onClick={() => onChange(todayLocalIso(), "19:00")}
          title="End of day: before 7pm today"
          className="rounded-lg border border-brand px-3 py-2 font-display text-xs font-semibold text-brand hover:bg-brand/5"
        >
          EOD
        </button>
        {(date || time) && (
          <button type="button" onClick={() => onChange("", "")} className="text-xs font-medium text-slate-400 underline hover:text-brand">
            clear
          </button>
        )}
      </div>
    </div>
  );
}

// <input type="datetime-local"> works in the browser's local time; the API wants an ISO string and
// stores UTC.
export function localInputToIso(value) {
  return value ? new Date(value).toISOString() : null;
}
export function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Sorting for the tables: one hook for the state, one comparator (empty values always last).
export function useSort(defaultKey, defaultDir = "asc", descFirst = []) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);
  const toggle = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(descFirst.includes(key) ? "desc" : "asc");
    }
  };
  return { sortKey, sortDir, toggle };
}

export function sortRows(rows, sortKey, sortDir, valueOf) {
  return [...rows].sort((a, b) => {
    const av = valueOf(a, sortKey);
    const bv = valueOf(b, sortKey);
    const aEmpty = av == null || av === "";
    const bEmpty = bv == null || bv === "";
    if (aEmpty || bEmpty) return aEmpty && bEmpty ? 0 : aEmpty ? 1 : -1;
    const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return sortDir === "asc" ? cmp : -cmp;
  });
}

// Tells the app shell (tab bells, Settings badge) to re-fetch its counts now.
export function notifyChanged() {
  window.dispatchEvent(new Event("notifications-changed"));
}

// A tiny "run an API call, then reload" helper used by every sub-tab.
export function useAction(reload) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const run = async (fn, okMessage) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fn();
      if (okMessage || res?.detail) setInfo(okMessage || res.detail);
      await reload();
      notifyChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, info, run, setError };
}
