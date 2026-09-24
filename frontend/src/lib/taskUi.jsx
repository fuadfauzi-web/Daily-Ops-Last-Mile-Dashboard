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

export function dueLabel(row) {
  if (!row.due_date) return "—";
  return (
    <>
      {formatDay(row.due_date)}
      {row.overdue && <div className="text-[10px] font-semibold">overdue</div>}
      {row.due_today && <div className="text-[10px] font-semibold">due today</div>}
    </>
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
