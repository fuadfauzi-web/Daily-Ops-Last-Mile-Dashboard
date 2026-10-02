import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";

// Attendance -> PTWH (2026-10-02, staging). Three views over the same records:
//   Today   -- who is in, clock people in / out, fix a forgotten time (what the station staff typed into the Google Sheet by hand)
//   Month   -- the old sheet's grid: a row per PTWH, a column per day, workdays + payable
//   Workers -- the PTWH roster (the sheet's PTWH DETAILS tab)
// For now station staff clock people in / out for them; the PTWH's own app (their own login) will write the same clock times later.

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "month", label: "Month sheet" },
  { key: "workers", label: "Workers" },
];

const hhmm = (iso) => (iso ? iso.slice(11, 16) : "");
const rm = (n) => `RM${(n || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const thisMonth = () => new Date().toISOString().slice(0, 7);
const inputCls = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";
const btnCls = "min-h-[36px] rounded-md px-3 py-1.5 text-sm font-semibold";

function dayPay(rate, hours, rule) {
  if (hours == null || hours <= 0) return 0;
  return rate * (hours >= rule.half_day_hours ? 1 : rule.half_day_factor);
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-ink" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <div className="mt-1 text-sm font-normal text-ink">{children}</div>
    </label>
  );
}

export default function PtwhAttendance({ me }) {
  const [view, setView] = useState("today");
  const [error, setError] = useState(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
        <p className="text-xs text-slate-500">
          Beta · station staff clock PTWH in and out for now; PTWH clocking themselves in their own app comes next.
        </p>
      </div>
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}
      {view === "today" && <TodayView setError={setError} />}
      {view === "month" && <MonthView setError={setError} />}
      {view === "workers" && <WorkersView setError={setError} />}
    </div>
  );
}

// ---------------------------------------------------------------- Today

function TodayView({ setError }) {
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [station, setStation] = useState("");
  const [q, setQ] = useState("");
  const [reasons, setReasons] = useState({});
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api.ptwhDay(date).then(setData).catch((e) => setError(e.message));
  }, [date, setError]);
  useEffect(load, [load]);

  const stations = useMemo(() => [...new Set((data?.rows || []).map((r) => r.station))].sort(), [data]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.rows || []).filter((r) => (!station || r.station === station) && (!needle || r.name.toLowerCase().includes(needle)));
  }, [data, station, q]);

  if (!data) return <Skeleton rows={6} />;
  const isToday = data.date === data.today;
  const counts = { notIn: 0, working: 0, done: 0 };
  rows.forEach((r) => {
    if (!r.record) counts.notIn += 1;
    else if (!r.record.clock_out) counts.working += 1;
    else counts.done += 1;
  });

  const act = async (id, fn) => {
    setBusy(id);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date">
          <input type="date" className={inputCls} value={data.date} max={data.today} onChange={(e) => setDate(e.target.value === data.today ? "" : e.target.value)} />
        </Field>
        {stations.length > 1 && (
          <Field label="Station">
            <select className={inputCls} value={station} onChange={(e) => setStation(e.target.value)}>
              <option value="">All stations</option>
              {stations.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <Field label="Find a person">
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" />
        </Field>
        <div className="ml-auto flex gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">Not in {counts.notIn}</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">Working {counts.working}</span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-700">Done {counts.done}</span>
        </div>
      </div>

      {!isToday && <p className="text-xs text-amber-700">Looking at a past day -- clock buttons are for today only; use Edit to add or correct times.</p>}

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Station</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">In</th>
              <th className="px-3 py-2">Out</th>
              <th className="px-3 py-2 text-right">Hours</th>
              <th className="px-3 py-2 text-right">Pay</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No active PTWH here yet -- add them under Workers.</td></tr>
            )}
            {rows.map((r) => {
              const rec = r.record;
              const open = rec && !rec.clock_out;
              const reason = reasons[r.id] ?? r.last_reason ?? data.reasons[0];
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-ink">{r.name}</td>
                  <td className="px-3 py-2 text-slate-600">{r.station}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {!rec && isToday && data.can_edit ? (
                      <select className={`${inputCls} max-w-[220px] text-xs`} value={reason} onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}>
                        {data.reasons.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    ) : (rec?.reason || "—")}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{rec ? hhmm(rec.clock_in) : "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {rec?.clock_out ? hhmm(rec.clock_out) : open ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Working</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{rec?.hours != null ? rec.hours.toFixed(1) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rec?.hours != null ? rm(dayPay(r.daily_rate, rec.hours, data.rule)) : "—"}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {data.can_edit && (
                      <>
                        {isToday && !rec && (
                          <button disabled={busy === r.id} onClick={() => act(r.id, () => api.ptwhClockIn(r.id, reason))} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Clock in</button>
                        )}
                        {isToday && open && (
                          <button disabled={busy === r.id} onClick={() => act(r.id, () => api.ptwhClockOut(r.id))} className={`${btnCls} bg-ink text-white disabled:opacity-50`}>Clock out</button>
                        )}
                        <button onClick={() => setEditing({ worker: r, date: data.date, record: rec })} className="ml-2 text-xs text-slate-500 underline">Edit</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        A day with {data.rule.half_day_hours}+ hours is a full day at the worker's rate; shorter is a half day. Clocked in but not out yet pays nothing until it is closed.
      </p>
      {editing && <RecordModal {...editing} reasons={data.reasons} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} setError={setError} />}
    </div>
  );
}

// ---------------------------------------------------------------- Edit one day

function RecordModal({ worker, date, record, reasons, onClose, onSaved, setError }) {
  const [cin, setCin] = useState(hhmm(record?.clock_in) || "08:00");
  const [cout, setCout] = useState(hhmm(record?.clock_out) || "");
  const [reason, setReason] = useState(record?.reason || worker.last_reason || reasons[0]);
  const [note, setNote] = useState(record?.note || "");
  const [saving, setSaving] = useState(false);

  const run = async (fn) => {
    setSaving(true);
    try {
      await fn();
      onSaved();
    } catch (e) {
      setError(e.message);
      onClose();
    }
  };

  return (
    <Modal title={`${worker.name} · ${date}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Clock in"><input type="time" className={`${inputCls} w-full`} value={cin} onChange={(e) => setCin(e.target.value)} /></Field>
          <Field label="Clock out (blank = still working)"><input type="time" className={`${inputCls} w-full`} value={cout} onChange={(e) => setCout(e.target.value)} /></Field>
        </div>
        <Field label="Reason">
          <select className={`${inputCls} w-full`} value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Note (optional)"><input className={`${inputCls} w-full`} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. forgot to clock out" /></Field>
        <div className="flex items-center justify-between pt-1">
          {record ? (
            <button disabled={saving} onClick={() => window.confirm("Delete this day's record?") && run(() => api.ptwhRecordDelete(record.id))} className="text-xs text-red-600 underline">Delete record</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className={`${btnCls} text-slate-600`}>Cancel</button>
            <button disabled={saving || !cin} onClick={() => run(() => api.ptwhRecordSave({ worker_id: worker.id, work_date: date, clock_in: cin, clock_out: cout || null, reason, note }))} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Save</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Month sheet

function MonthView({ setError }) {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [station, setStation] = useState("");
  const [editing, setEditing] = useState(null);
  const [reasons, setReasons] = useState([]);

  const load = useCallback(() => {
    api.ptwhMonth(month).then(setData).catch((e) => setError(e.message));
  }, [month, setError]);
  useEffect(load, [load]);
  useEffect(() => { api.ptwhDay().then((d) => setReasons(d.reasons)).catch(() => {}); }, []);

  const workers = useMemo(() => (data?.workers || []).filter((w) => !station || w.station === station), [data, station]);
  const stations = useMemo(() => [...new Set((data?.workers || []).map((w) => w.station))].sort(), [data]);
  if (!data) return <Skeleton rows={6} />;

  const days = Array.from({ length: data.days_in_month }, (_, i) => i + 1);
  const totalPay = workers.reduce((a, w) => a + w.payable, 0);
  const totalDays = workers.reduce((a, w) => a + w.workdays, 0);

  const exportCsv = () => {
    const head = ["Station", "Name", "IC", ...days, "Workdays", "Payable (RM)"];
    const lines = workers.map((w) => [w.station, w.name, w.ic_no || "", ...days.map((d) => w.days[d]?.hours ?? (w.days[d] ? "open" : "")), w.workdays, w.payable.toFixed(2)]);
    const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `ptwh-attendance-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Month"><input type="month" className={inputCls} value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>
        {stations.length > 1 && (
          <Field label="Station">
            <select className={inputCls} value={station} onChange={(e) => setStation(e.target.value)}>
              <option value="">All stations</option>
              {stations.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-slate-600">Workdays <b className="text-ink">{totalDays}</b></span>
          <span className="text-slate-600">Payable <b className="text-ink">{rm(totalPay)}</b></span>
          <button onClick={exportCsv} disabled={!workers.length} className={`${btnCls} border border-slate-300 text-slate-700 disabled:opacity-50`}>Export CSV</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Name</th>
              <th className="px-2 py-2 text-left">Station</th>
              {days.map((d) => <th key={d} className="px-1.5 py-2 text-center font-medium">{d}</th>)}
              <th className="px-2 py-2 text-right">Days</th>
              <th className="px-2 py-2 text-right">Payable</th>
            </tr>
          </thead>
          <tbody>
            {workers.length === 0 && <tr><td colSpan={days.length + 4} className="px-3 py-6 text-center text-slate-500">Nothing recorded for this month.</td></tr>}
            {workers.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-ink">{w.name}{!w.active && <span className="ml-1 text-[10px] text-slate-400">(inactive)</span>}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{w.station}</td>
                {days.map((d) => {
                  const c = w.days[d];
                  const cls = !c ? "" : c.out == null ? "bg-amber-100 text-amber-800" : c.workday >= 1 ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800";
                  return (
                    <td key={d} className={`px-1.5 py-1.5 text-center tabular-nums ${cls} ${c ? "cursor-pointer" : ""}`} title={c ? `${c.in} – ${c.out || "still open"}${c.reason ? ` · ${c.reason}` : ""}` : undefined}
                      onClick={c ? () => setEditing({ worker: { ...w, last_reason: c.reason }, date: `${data.month}-${String(d).padStart(2, "0")}`, record: null, load: true }) : undefined}>
                      {c ? (c.out == null ? "…" : c.hours.toFixed(1)) : ""}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-right tabular-nums">{w.workdays}{w.open_days > 0 && <span title="Days still open (no clock-out)" className="ml-1 text-amber-600">⚠</span>}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{rm(w.payable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Cells show hours worked (green = full day, blue = half day under {data.rule.half_day_hours}h, amber … = clocked in, no clock-out yet). Click a day to correct it.
      </p>
      {editing && (
        <MonthRecordLoader {...editing} reasons={reasons} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} setError={setError} />
      )}
    </div>
  );
}

// The month grid doesn't carry record ids / notes, so open the day through the day endpoint and edit that.
function MonthRecordLoader({ worker, date, reasons, onClose, onSaved, setError }) {
  const [record, setRecord] = useState(undefined);
  useEffect(() => {
    api.ptwhDay(date)
      .then((d) => setRecord(d.rows.find((r) => r.id === worker.id)?.record || null))
      .catch((e) => { setError(e.message); onClose(); });
  }, [date, worker.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (record === undefined) return null;
  return <RecordModal worker={worker} date={date} record={record} reasons={reasons.length ? reasons : ["Other"]} onClose={onClose} onSaved={onSaved} setError={setError} />;
}

// ---------------------------------------------------------------- Workers

const EMPTY = { name: "", station: "", ic_no: "", phone: "", daily_rate: 50, joined_date: "", active: true };

function WorkersView({ setError }) {
  const [data, setData] = useState(null);
  const [station, setStation] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState(null); // {id?, ...fields}

  const load = useCallback(() => {
    api.ptwhWorkers().then(setData).catch((e) => setError(e.message));
  }, [setError]);
  useEffect(load, [load]);

  if (!data) return <Skeleton rows={6} />;
  const workers = data.workers.filter((w) => (!station || w.station === station) && (showInactive || w.active));
  const used = [...new Set(data.workers.map((w) => w.station))].sort();

  const save = async () => {
    const body = { name: form.name, station: form.station, ic_no: form.ic_no || null, phone: form.phone || null, daily_rate: Number(form.daily_rate), joined_date: form.joined_date || null, active: form.active };
    try {
      if (form.id) await api.ptwhWorkerSave(form.id, body);
      else await api.ptwhWorkerAdd(body);
      setForm(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {used.length > 1 && (
          <Field label="Station">
            <select className={inputCls} value={station} onChange={(e) => setStation(e.target.value)}>
              <option value="">All stations</option>
              {used.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
        </label>
        {data.can_edit && (
          <button onClick={() => setForm({ ...EMPTY, station: station || (data.stations.length === 1 ? data.stations[0] : ""), daily_rate: data.default_rate })} className={`${btnCls} ml-auto bg-brand text-white`}>Add PTWH</button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Station</th><th className="px-3 py-2">IC</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2 text-right">Daily rate</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2" /></tr>
          </thead>
          <tbody>
            {workers.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No PTWH yet.{data.can_edit ? " Use Add PTWH." : ""}</td></tr>}
            {workers.map((w) => (
              <tr key={w.id} className={`border-t border-slate-100 ${w.active ? "" : "text-slate-400"}`}>
                <td className="px-3 py-2 font-medium">{w.name}{!w.active && " (inactive)"}</td>
                <td className="px-3 py-2">{w.station}</td>
                <td className="px-3 py-2 tabular-nums">{w.ic_no || "—"}</td>
                <td className="px-3 py-2">{w.phone || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{rm(w.daily_rate)}</td>
                <td className="px-3 py-2">{w.joined_date || "—"}</td>
                <td className="px-3 py-2 text-right">{data.can_edit && <button onClick={() => setForm({ ...w, ic_no: w.ic_no || "", phone: w.phone || "", joined_date: w.joined_date || "" })} className="text-xs text-slate-500 underline">Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal title={form.id ? "Edit PTWH" : "Add PTWH"} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <Field label="Full name"><input className={`${inputCls} w-full`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Station">
              <select className={`${inputCls} w-full`} value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })}>
                <option value="">Pick a station</option>
                {data.stations.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="IC number"><input className={`${inputCls} w-full`} value={form.ic_no} onChange={(e) => setForm({ ...form, ic_no: e.target.value })} placeholder="123456-12-1234" /></Field>
              <Field label="Phone"><input className={`${inputCls} w-full`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Daily rate (RM)"><input type="number" min="1" step="1" className={`${inputCls} w-full`} value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} /></Field>
              <Field label="Joined"><input type="date" className={`${inputCls} w-full`} value={form.joined_date} onChange={(e) => setForm({ ...form, joined_date: e.target.value })} /></Field>
            </div>
            {form.id && (
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active (untick when they stop working with us -- their history stays)
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className={`${btnCls} text-slate-600`}>Cancel</button>
              <button disabled={!form.name.trim() || !form.station} onClick={save} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
