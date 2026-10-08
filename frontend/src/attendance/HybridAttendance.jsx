import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";
import { btnCls, Field, hhmm, inputCls, localDay, localMonth, Modal, useScopeFilter } from "./ui";

// Attendance -> Hybrid (2026-10-04, staging): MANUAL for now. Station staff key in the Hybrid drivers' details and each day's attendance; once Hybrid drivers can sign in
// (with the same login as the driver app) this changes. The Hybrid productivity KPI still reads its own Metabase file -- this does not replace it.
//   Today    -- every driver on the list: Present / Absent / Leave, optional clock in / out, a note
//   Month    -- a grid of the month
//   Drivers  -- the list with details: name, driver ID, phone, vehicle, joined / end date

const VIEWS = [{ key: "today", label: "Today" }, { key: "month", label: "Month sheet" }, { key: "drivers", label: "Drivers" }];
const STATUS = {
  present: ["Present", "bg-emerald-100 text-emerald-800", "bg-emerald-600 text-white"],
  absent: ["Absent", "bg-red-100 text-red-700", "bg-red-600 text-white"],
  leave: ["Leave", "bg-amber-100 text-amber-800", "bg-amber-500 text-white"],
};

function StationPicker({ stations, value, onChange }) {
  if (stations.length < 2) return null;
  return (
    <Field label="Station">
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All stations</option>
        {stations.map((s) => <option key={s}>{s}</option>)}
      </select>
    </Field>
  );
}

// ---------------------------------------------------------------- Today: key in a day

function DayRow({ row, date, canEdit, onSaved, setError }) {
  const rec = row.record;
  const [status, setStatus] = useState(rec?.status || "");
  const [cin, setCin] = useState(hhmm(rec?.clock_in));
  const [cout, setCout] = useState(hhmm(rec?.clock_out));
  const [note, setNote] = useState(rec?.note || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setStatus(rec?.status || ""); setCin(hhmm(rec?.clock_in)); setCout(hhmm(rec?.clock_out)); setNote(rec?.note || ""); }, [rec?.status, rec?.clock_in, rec?.clock_out, rec?.note, date]);
  const dirty = status !== (rec?.status || "") || cin !== hhmm(rec?.clock_in) || cout !== hhmm(rec?.clock_out) || note !== (rec?.note || "");
  const save = async () => {
    setBusy(true);
    try {
      await api.hybridSave({ driver_id: row.id, work_date: date, status, clock_in: status === "present" ? cin || null : null, clock_out: status === "present" ? cout || null : null, note: note || null });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const clear = async () => {
    if (!window.confirm(`Take ${row.name}'s entry for ${date} off?`)) return;
    try {
      await api.hybridClear(row.id, date);
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2 text-slate-600">{row.station}</td>
      <td className="px-3 py-2"><div className="font-medium text-ink">{row.name}</div><div className="text-[11px] text-slate-400">{row.driver_id}</div></td>
      <td className="px-3 py-2 text-xs">{row.scheduled ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{row.scheduled === "WK" ? "Working" : row.scheduled === "OFF" ? "Off" : "Leave"}</span> : <span className="text-slate-300">—</span>}</td>
      <td className="px-3 py-2">
        {canEdit ? (
          <div className="flex gap-1">
            {Object.entries(STATUS).map(([k, [label, , on]]) => (
              <button key={k} onClick={() => setStatus(k)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${status === k ? on : "border border-slate-300 text-slate-600"}`}>{label}</button>
            ))}
          </div>
        ) : status ? <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS[status][1]}`}>{STATUS[status][0]}</span> : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-3 py-2">
        {canEdit ? (
          <div className="flex items-center gap-1">
            <input type="time" disabled={status !== "present"} className={`${inputCls} w-[100px] disabled:bg-slate-100`} value={cin} onChange={(e) => setCin(e.target.value)} aria-label="Clock in" />
            <span className="text-slate-400">–</span>
            <input type="time" disabled={status !== "present"} className={`${inputCls} w-[100px] disabled:bg-slate-100`} value={cout} onChange={(e) => setCout(e.target.value)} aria-label="Clock out" />
          </div>
        ) : <span className="tabular-nums">{rec?.clock_in ? `${hhmm(rec.clock_in)} – ${hhmm(rec.clock_out) || "…"}` : ""}</span>}
      </td>
      <td className="px-3 py-2">
        {canEdit ? <input className={`${inputCls} w-full min-w-[140px]`} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" /> : <span className="text-xs text-slate-600">{rec?.note}</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        {canEdit && dirty && status && <button disabled={busy} onClick={save} className={`${btnCls} bg-brand py-1 text-white disabled:opacity-50`}>Save</button>}
        {canEdit && !dirty && rec && <button onClick={clear} className="text-xs text-slate-400 underline">Clear</button>}
        {rec && !dirty && <div className="mt-0.5 text-[10px] text-slate-400" title={`Keyed by ${rec.recorded_by}${rec.edited_by ? `, changed by ${rec.edited_by}` : ""}`}>{(rec.edited_by || rec.recorded_by || "").split("@")[0]}</div>}
      </td>
    </tr>
  );
}

function TodayView({ setError }) {
  const [date, setDate] = useState(localDay());
  const [data, setData] = useState(null);
  const load = useCallback(() => { api.hybridDay(date).then(setData).catch((e) => setError(e.message)); }, [date, setError]);
  useEffect(() => { setData(null); load(); }, [load]);
  const { rows, controls } = useScopeFilter(data?.rows || []);
  const counts = useMemo(() => rows.reduce((a, r) => { if (r.record) a[r.record.status] = (a[r.record.status] || 0) + 1; return a; }, {}), [rows]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Day"><input type="date" className={inputCls} value={date} max={localDay()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        {controls}
        <div className="ml-auto flex gap-3 pb-1 text-sm text-slate-600">
          <span>Present <b className="text-ink">{counts.present || 0}</b></span><span>Absent <b className="text-ink">{counts.absent || 0}</b></span><span>Leave <b className="text-ink">{counts.leave || 0}</b></span>
          <span>Not keyed <b className="text-ink">{rows.length - (counts.present || 0) - (counts.absent || 0) - (counts.leave || 0)}</b></span>
        </div>
      </div>
      {!data ? <Skeleton rows={4} /> : (
        <div className="max-h-[70vh] overflow-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Station</th><th className="px-3 py-2">Driver</th><th className="px-3 py-2">Schedule</th><th className="px-3 py-2">Attendance</th><th className="px-3 py-2">In – Out (optional)</th><th className="px-3 py-2">Note</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No Hybrid driver on the list for this day -- the list comes from Metabase every morning (see the Drivers view).</td></tr>}
              {rows.map((r) => <DayRow key={`${r.id}-${date}`} row={r} date={date} canEdit={data.can_edit} onSaved={load} setError={setError} />)}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Keyed in by hand for now: choose Present, Absent or Leave and press Save (times are optional). {data?.can_edit ? `You can key or change the last ${data?.window_days || 35} days; each entry shows who keyed it.` : "You can read this; station and region staff and Managers key it in."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Month grid

function MonthView({ setError }) {
  const [month, setMonth] = useState(localMonth());
  const [data, setData] = useState(null);
  useEffect(() => { setData(null); api.hybridMonth(month).then(setData).catch((e) => setError(e.message)); }, [month, setError]);
  const { rows, controls } = useScopeFilter(data?.rows || []);
  const days = data ? Array.from({ length: data.days_in_month }, (_, i) => i + 1) : [];
  const CELL = { present: "bg-emerald-50 text-emerald-800", absent: "bg-red-50 text-red-700", leave: "bg-amber-50 text-amber-800" };
  const LETTER = { present: "P", absent: "A", leave: "L" };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Month"><input type="month" className={inputCls} value={month} max={localMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>
        {controls}
      </div>
      {!data ? <Skeleton rows={5} /> : (
        <div className="max-h-[70vh] overflow-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 px-3 py-2 text-left">Driver</th><th className="px-2 py-2 text-left">Station</th>
                {days.map((d) => <th key={d} className="px-1.5 py-2 text-center font-medium">{d}</th>)}
                <th className="px-2 py-2 text-right">Present</th><th className="px-2 py-2 text-right">Absent</th><th className="px-2 py-2 text-right">Leave</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={days.length + 5} className="px-3 py-6 text-center text-slate-500">No Hybrid driver or entry for this month.</td></tr>}
              {rows.map((w) => (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-ink">{w.name}{!w.active && <span className="ml-1 text-[10px] text-slate-400">(inactive)</span>}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{w.station}</td>
                  {days.map((d) => { const c = w.days[d]; return <td key={d} title={c ? `${STATUS[c.status][0]}${c.in ? ` ${c.in}–${c.out || "…"}` : ""}` : undefined} className={`px-1.5 py-1.5 text-center font-semibold ${c ? CELL[c.status] : ""}`}>{c ? LETTER[c.status] : ""}</td>; })}
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{w.present}</td><td className="px-2 py-1.5 text-right tabular-nums">{w.absent}</td><td className="px-2 py-1.5 text-right tabular-nums">{w.leave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">P = present, A = absent, L = leave. Change a day in the Today view (pick the day).</p>
    </div>
  );
}

// ---------------------------------------------------------------- Drivers

const emptyDriver = { name: "", driver_id: "", phone: "", vehicle_type: "", joined_date: "", end_date: "", notes: "" };

function DriverModal({ driver, stations, onClose, onSaved, setError }) {
  const [f, setF] = useState(driver ? { ...emptyDriver, ...Object.fromEntries(Object.entries(driver).map(([k, v]) => [k, v ?? ""])) } : { ...emptyDriver, station: stations[0] || "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setSaving(true);
    try {
      const body = { name: f.name, driver_id: f.driver_id, phone: f.phone, vehicle_type: f.vehicle_type, joined_date: f.joined_date || null, end_date: f.end_date || null, notes: f.notes };
      if (driver) await api.hybridDriverEdit(driver.id, { ...body, active: f.end_date ? undefined : driver.active ? undefined : true });
      else await api.hybridDriverAdd({ ...body, station: f.station });
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };
  return (
    <Modal title={driver ? `Edit ${driver.name}` : "Add a Hybrid driver"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {!driver && stations.length > 1 && (
          <div className="col-span-2"><Field label="Station"><select className={`${inputCls} w-full`} value={f.station} onChange={set("station")}>{stations.map((s) => <option key={s}>{s}</option>)}</select></Field></div>
        )}
        <div className="col-span-2"><Field label="Name"><input className={`${inputCls} w-full`} value={f.name} onChange={set("name")} /></Field></div>
        <Field label="Driver ID (driver app)"><input className={`${inputCls} w-full`} value={f.driver_id} onChange={set("driver_id")} /></Field>
        <Field label="Phone"><input className={`${inputCls} w-full`} value={f.phone} onChange={set("phone")} /></Field>
        <div className="col-span-2"><Field label="Vehicle type"><input className={`${inputCls} w-full`} value={f.vehicle_type} onChange={set("vehicle_type")} placeholder="Van, car, motorcycle…" /></Field></div>
        <Field label="Joined"><input type="date" className={`${inputCls} w-full`} value={f.joined_date} onChange={set("joined_date")} /></Field>
        <Field label="End date"><input type="date" className={`${inputCls} w-full`} value={f.end_date} onChange={set("end_date")} /></Field>
        <div className="col-span-2"><Field label="Notes"><input className={`${inputCls} w-full`} maxLength={300} value={f.notes} onChange={set("notes")} /></Field></div>
      </div>
      <p className="mt-2 text-xs text-slate-500">An end date in the past switches the driver off (their history stays and their future shifts are cleared). A name change follows onto the Schedule.</p>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className={`${btnCls} text-slate-600`}>Cancel</button>
        <button disabled={saving || f.name.trim().length < 2} onClick={save} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>{driver ? "Save" : "Add driver"}</button>
      </div>
    </Modal>
  );
}

function DriversView({ setError }) {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null); // {} = new, driver = edit
  const [showOff, setShowOff] = useState(false);
  const load = useCallback(() => { api.hybridDrivers().then(setData).catch((e) => setError(e.message)); }, [setError]);
  useEffect(load, [load]);
  if (!data) return <Skeleton rows={4} />;
  const { rows: inScope, controls } = useScopeFilter(data.drivers);
  const rows = inScope.filter((d) => showOff || d.active);
  const src = data.source || {};
  const refresh = async () => {
    setRefreshing(true);
    try {
      await api.hybridDriversRefresh();
      load();
    } catch (e) {
      setError(e.message);
      load();
    } finally {
      setRefreshing(false);
    }
  };
  const toggle = async (d) => {
    try {
      await api.hybridDriverEdit(d.id, { active: !d.active, ...(d.active ? {} : { end_date: "" }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {controls}
        <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600"><input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} /> Show inactive</label>
        <div className="ml-auto flex items-center gap-2">
          {data.can_manage && <button disabled={refreshing} onClick={refresh} className={`${btnCls} border border-slate-300 text-slate-700 disabled:opacity-50`}>{refreshing ? "Pulling…" : "Refresh from Metabase"}</button>}
          {data.can_manage && data.stations.length > 0 && <button onClick={() => setEditing({})} className={`${btnCls} bg-brand text-white`}>Add driver</button>}
        </div>
      </div>
      <div className={`rounded-lg p-3 text-sm ring-1 ${src.error ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-slate-50 text-slate-600 ring-slate-200"}`}>
        The Hybrid drivers come from the Metabase question <b>Active Driver Details</b> and refresh every morning{src.last_ok ? <> (last pulled {src.last_ok.replace("T", " ")}, {src.hybrid_rows} Hybrid drivers)</> : ""}.
        {src.error && <> <b>Last problem:</b> {src.error}</>}
        {" "}A driver who has resigned or been terminated stays here until their <b>employment end date</b> is updated in <b>Ninja Van Operator → Driver Strength</b>; the next morning they turn inactive, are kept for a month, then removed with their attendance.
        {!src.configured && " Metabase isn't connected on this app yet (METABASE_API_KEY), so the list only has what a Manager added by hand."}
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">Station</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Driver ID</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Vehicle type</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2">End</th><th className="px-3 py-2" /></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No Hybrid driver yet -- the list fills from Metabase every morning.</td></tr>}
            {rows.map((d) => (
              <tr key={d.id} className={`border-t border-slate-100 ${d.active ? "" : "text-slate-400"}`}>
                <td className="px-3 py-2">{d.station}</td>
                <td className="px-3 py-2 font-medium">{d.name}{!d.active && <span className="ml-1 text-[10px]">(inactive)</span>}</td>
                <td className="px-3 py-2">{d.driver_id}</td>
                <td className="px-3 py-2">{d.phone}</td>
                <td className="px-3 py-2">{d.vehicle_type}</td>
                <td className="px-3 py-2 tabular-nums">{d.joined_date}</td>
                <td className="px-3 py-2 tabular-nums">{d.end_date}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {data.can_manage && (
                    <span className="flex justify-end gap-3 text-xs">
                      <button onClick={() => setEditing(d)} className="text-slate-500 underline">Edit</button>
                      <button onClick={() => toggle(d)} className="text-slate-500 underline">{d.active ? "Switch off" : "Switch on"}</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <DriverModal driver={editing.id ? editing : null} stations={data.stations} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} setError={setError} />}
    </div>
  );
}

export default function HybridAttendance() {
  const [view, setView] = useState("today");
  const [error, setError] = useState(null);
  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
        <p className="text-xs text-slate-500">Beta · keyed in by station staff for now; the driver-app sign-in will replace this later.</p>
      </div>
      {view === "today" ? <TodayView setError={setError} /> : view === "month" ? <MonthView setError={setError} /> : <DriversView setError={setError} />}
    </div>
  );
}
