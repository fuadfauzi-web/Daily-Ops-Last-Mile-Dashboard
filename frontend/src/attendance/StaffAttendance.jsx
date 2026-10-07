import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";
import { btnCls, Field, hhmm, inputCls, localDay, localMonth, Modal, useScopeFilter } from "./ui";

// Attendance -> Staff (2026-10-04, staging): Station Heads and Fleet Assistants clock in and out here, signed in with their Ninja Van Google account (no extra login,
// no selfie). Proof of presence is the phone's location within 100 m of the station (Fleet Admin -> Premises). The Region Head's QR fallback is not built yet: someone whose
// location won't work tells their Region Head / RFS / Manager, who can fix the time with a reason (the original is kept).
//   My clock -- the signed-in person's own Clock in / Clock out
//   Today    -- everyone in scope: scheduled shift, clock in / out, how far from the station
//   Month    -- a grid: a row per person, hours per day, days worked, days still open

const POSITION = { station_head: "Station Head", fleet_assistant: "Fleet Assistant", station: "Station staff" };

const FLAG_CLS = {
  not_in: "bg-red-100 text-red-700", no_out: "bg-red-100 text-red-700", late_in: "bg-amber-100 text-amber-800", short: "bg-slate-200 text-slate-700",
};

function FlagChip({ f }) {
  return (
    <span title={`${f.detail}${f.handled ? ` -- handled by ${f.handled.by}: ${f.handled.note}` : ""}`}
      className={`mr-1 inline-block cursor-help rounded px-1.5 py-0.5 text-[11px] font-semibold ${f.handled ? "bg-emerald-100 text-emerald-700" : FLAG_CLS[f.kind]}`}>
      {f.label}{f.minutes ? ` ${f.minutes}m` : ""}{f.handled ? " ✓" : ""}
    </span>
  );
}

function place() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This browser can't give its location. Try another browser or phone."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? "Location is blocked. Allow location for this site in your browser settings, then try again." : "Couldn't get your location. Go outside, turn on precise location and try again.")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

function MyClock({ me, reload, setError }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  if (!me) return <Skeleton rows={3} />;
  if (!me.eligible) return <div className="rounded-xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">{me.reason}</div>;
  const rec = me.record;
  const action = !rec ? "in" : !rec.clock_out ? "out" : null;
  const go = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const pos = await place();
      const r = await api.staffClock({ action, ...pos });
      setDone(`Clocked ${r.action} at ${r.time.slice(11, 16)} (${r.distance_m} m from ${r.station}).`);
      reload();
      window.dispatchEvent(new Event("ptwh-review-changed"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-xl space-y-3 rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div>
        <div className="font-display text-base font-semibold text-ink">{me.name}</div>
        <div className="text-sm text-slate-500">{me.stations.join(", ")} · {localDay()}</div>
      </div>
      {me.shift && <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Today's shift: <b>{me.shift.label}</b>{me.shift.hours && ` (${me.shift.hours})`}{me.shift.break && <span className="text-slate-500"> · break {me.shift.break}</span>}</div>}
      <div className="flex gap-6 text-sm">
        <div><div className="text-xs text-slate-500">Clock in</div><div className="text-lg font-semibold tabular-nums">{rec ? hhmm(rec.clock_in) : "—"}</div></div>
        <div><div className="text-xs text-slate-500">Clock out</div><div className="text-lg font-semibold tabular-nums">{rec?.clock_out ? hhmm(rec.clock_out) : "—"}</div></div>
        {rec?.hours != null && <div><div className="text-xs text-slate-500">Hours</div><div className="text-lg font-semibold tabular-nums">{rec.hours.toFixed(1)}</div></div>}
      </div>
      {action ? (
        <button disabled={busy || !me.geo_ready} onClick={go} className={`${btnCls} w-full py-3 text-base text-white disabled:opacity-50 ${action === "in" ? "bg-emerald-600" : "bg-brand"}`}>
          {busy ? "Checking your location…" : action === "in" ? "Clock in" : "Clock out"}
        </button>
      ) : (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">You have clocked in and out today. Thank you.</div>
      )}
      {done && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{done}</div>}
      {!me.geo_ready && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your station has no latitude / longitude in Fleet Admin → Premises yet, so nobody can clock in there. Ask the Fleet Admin team to add it.</div>}
      <p className="text-xs text-slate-500">
        You must be within <b>{me.radius_m} m</b> of your station. Your phone's location is checked when you press the button and kept with that clock. Location not working? Tell your Region Head, who can fix the time.
        If you are on a computer, use the dashboard on your phone for this.
      </p>
    </div>
  );
}

function FixModal({ target, onClose, onSaved, setError }) {
  const [cin, setCin] = useState(target.clock_in || "08:00");
  const [cout, setCout] = useState(target.clock_out || "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.staffFix({ email: target.email, work_date: target.date, clock_in: cin, clock_out: cout || null, reason });
      onSaved();
    } catch (e) {
      setError(e.message);
      onClose();
    }
  };
  return (
    <Modal title={`Fix ${target.name} · ${target.date}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Clock in"><input type="time" className={`${inputCls} w-full`} value={cin} onChange={(e) => setCin(e.target.value)} /></Field>
          <Field label="Clock out"><input type="time" className={`${inputCls} w-full`} value={cout} onChange={(e) => setCout(e.target.value)} /></Field>
        </div>
        <Field label="Why? (needed -- a few words)">
          <input className={`${inputCls} w-full`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. forgot to clock out, left at 6pm" />
        </Field>
        <p className="text-xs text-slate-500">A shift can be 12 hours at most. A clock-out earlier than the clock-in is read as the next morning (night shift). The original times and who changed them are kept. You can't fix your own time.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={`${btnCls} text-slate-600`}>Cancel</button>
          <button disabled={saving || reason.trim().length < 5 || !cin} onClick={save} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Save fix</button>
        </div>
      </div>
    </Modal>
  );
}


// ---------------------------------------------------------------- Flags: staff who didn't clock in / out as scheduled

function FlagsView({ setError }) {
  const [data, setData] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const load = useCallback(() => { api.staffFlags().then(setData).catch((e) => setError(e.message)); }, [setError]);
  useEffect(() => { load(); }, [load]);
  const { rows, controls } = useScopeFilter(data?.flags || []);
  if (!data) return <Skeleton rows={4} />;
  const shown = rows.filter((f) => showDone || !f.handled);
  const handle = async (f) => {
    const note = window.prompt(`What was done about ${f.name} (${f.label.toLowerCase()}, ${f.date})? e.g. called, on MC, fixed the time`);
    if (!note || note.trim().length < 3) return;
    try {
      await api.staffFlagAction({ email: f.email, date: f.date, kind: f.kind, note });
      load();
      window.dispatchEvent(new Event("ptwh-review-changed"));
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {controls}
        <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show handled</label>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">Day</th><th className="px-3 py-2">Station</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Flag</th><th className="px-3 py-2">What happened</th><th className="px-3 py-2">Handled</th><th className="px-3 py-2" /></tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Nobody to chase -- everyone scheduled has clocked as expected.</td></tr>}
            {shown.map((f) => (
              <tr key={`${f.email}-${f.date}-${f.kind}`} className="border-t border-slate-100 align-top">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{f.date}</td>
                <td className="px-3 py-2 text-slate-600">{f.station}</td>
                <td className="px-3 py-2 font-medium text-ink">{f.name}</td>
                <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${FLAG_CLS[f.kind]}`}>{f.label}</span></td>
                <td className="max-w-[360px] px-3 py-2 text-xs text-slate-600">{f.detail}</td>
                <td className="max-w-[220px] px-3 py-2 text-xs text-slate-600">{f.handled ? <><span className="text-emerald-700">✓ {f.handled.by.split("@")[0]}</span><div className="text-slate-400">{f.handled.note}</div></> : <span className="text-slate-300">—</span>}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {data.can_act && f.alert && <button onClick={() => handle(f)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700">{f.handled ? "Edit note" : "Mark handled"}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        A staff member scheduled for an AM / Middle / PM shift is flagged <b>not clocked in</b> {data.late_minutes} minutes after the shift starts (the station's own shift hours), <b>late</b> if they clocked in after that,
        <b> no clock-out</b> {data.no_out_minutes} minutes after the shift should have ended, and <b>short day</b> under {data.min_hours} hours. The Region Head, RFS and Manager are alerted for not clocked in and no clock-out.
        {data.unconfigured > 0 && ` ${data.unconfigured} scheduled day(s) can't be checked because their station hasn't written its shift hours yet (Schedule → Shift times).`}
      </p>
    </div>
  );
}

function TodayView({ setError }) {
  const [date, setDate] = useState(localDay());
  const [data, setData] = useState(null);
  const [fix, setFix] = useState(null);
  const load = useCallback(() => { api.staffDay(date).then(setData).catch((e) => setError(e.message)); }, [date, setError]);
  useEffect(() => { setData(null); load(); }, [load]);
  const { rows: shown, controls } = useScopeFilter(data?.rows || []);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Day"><input type="date" className={inputCls} value={date} max={localDay()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        {controls}
      </div>
      {!data ? <Skeleton rows={4} /> : (
        <div className="max-h-[70vh] overflow-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Station</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Shift</th><th className="px-3 py-2">In</th><th className="px-3 py-2">Out</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2">Flags</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No Station Head or Fleet Assistant posted at the stations in your scope.</td></tr>}
              {shown.map((r) => (
                <tr key={r.email} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-600">{r.station}</td>
                  <td className="px-3 py-2 font-medium text-ink">{r.name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{POSITION[r.position] || r.position}</td>
                  <td className="px-3 py-2 text-xs">{r.shift ? <span title={r.shift.hours || undefined} className={`rounded px-1.5 py-0.5 font-semibold ${r.shift.code === "OFF" || r.shift.code === "AL" ? "bg-slate-100 text-slate-600" : "bg-sky-50 text-sky-800"}`}>{r.shift.label}</span> : <span className="text-slate-300">—</span>}{r.shift?.hours && <span className="ml-1 text-[11px] tabular-nums text-slate-400">{r.shift.hours}</span>}{r.shift.break && <div className="text-[10px] text-slate-400">break {r.shift.break}</div>}</td>
                  <td className="px-3 py-2 tabular-nums">{r.record ? hhmm(r.record.clock_in) : <span className="text-slate-300">—</span>}{r.record?.in_dist != null && <span className="ml-1 text-[11px] text-slate-400">{r.record.in_dist} m</span>}</td>
                  <td className="px-3 py-2 tabular-nums">{r.record?.clock_out ? hhmm(r.record.clock_out) : r.record ? <span className="text-amber-600">…</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2 tabular-nums">{r.record?.hours != null ? r.record.hours.toFixed(1) : ""}{r.record?.edited_by && <span title={`Fixed by ${r.record.edited_by}: ${r.record.edit_reason}`} className="ml-1 cursor-help text-[11px] text-violet-600">fixed</span>}</td>
                  <td className="px-3 py-2">{(r.flags || []).map((f) => <FlagChip key={f.kind} f={f} />)}</td>
                  <td className="px-3 py-2 text-right">
                    {data.can_fix && <button onClick={() => setFix({ email: r.email, name: r.name, date: data.date, clock_in: hhmm(r.record?.clock_in), clock_out: hhmm(r.record?.clock_out) })} className="text-xs text-slate-500 underline">Fix time</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {fix && <FixModal target={fix} onClose={() => setFix(null)} onSaved={() => { setFix(null); load(); }} setError={setError} />}
    </div>
  );
}

function MonthView({ setError }) {
  const [month, setMonth] = useState(localMonth());
  const [data, setData] = useState(null);
  const [fix, setFix] = useState(null);
  const load = useCallback(() => { api.staffMonth(month).then(setData).catch((e) => setError(e.message)); }, [month, setError]);
  useEffect(() => { setData(null); load(); }, [load]);

  const { rows, controls } = useScopeFilter(data?.rows || []);
  const days = data ? Array.from({ length: data.days_in_month }, (_, i) => i + 1) : [];
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
                <th className="sticky left-0 z-30 bg-slate-50 px-3 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Station</th>
                {days.map((d) => <th key={d} className="px-1.5 py-2 text-center font-medium">{d}</th>)}
                <th className="px-2 py-2 text-right">Days</th>
                <th className="px-2 py-2 text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={days.length + 4} className="px-3 py-6 text-center text-slate-500">No Station Head or Fleet Assistant in this selection.</td></tr>}
              {rows.map((w) => (
                <tr key={w.email} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-ink">{w.name}<span className="ml-1 text-[10px] font-normal text-slate-400">{POSITION[w.position] || ""}</span></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{w.station}</td>
                  {days.map((d) => {
                    const c = w.days[d];
                    const cls = !c ? "" : !c.out ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800";
                    return (
                      <td key={d} title={c ? `${c.in} – ${c.out || "still open"}${c.edited ? " · fixed" : ""}` : undefined}
                        onClick={data.can_fix ? () => setFix({ email: w.email, name: w.name, date: `${data.month}-${String(d).padStart(2, "0")}`, clock_in: c?.in, clock_out: c?.out }) : undefined}
                        className={`px-1.5 py-1.5 text-center tabular-nums ${cls} ${data.can_fix ? "cursor-pointer" : ""}`}>
                        {c ? (c.out ? c.hours.toFixed(1) : "…") : ""}{c?.edited && <sup className="text-violet-600">*</sup>}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{w.worked}{w.open_days > 0 && <span title="Days still open (no clock-out)" className="ml-1 text-amber-600">⚠</span>}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{w.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Cells show hours worked (green); amber … = clocked in, no clock-out yet; * = a time was fixed by a Region Head, RFS or Manager (hover for the times).
        {data?.can_fix && " Click a day to fix a time -- a reason is needed and the original is kept."}
      </p>
      {fix && <FixModal target={fix} onClose={() => setFix(null)} onSaved={() => { setFix(null); load(); }} setError={setError} />}
    </div>
  );
}

export default function StaffAttendance({ requestView }) {
  const [me, setMe] = useState(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(() => { api.staffMe().then(setMe).catch((e) => setError(e.message)); }, []);
  useEffect(reload, [reload]);
  useEffect(() => { if (requestView?.view) setView(requestView.view); }, [requestView]);
  const views = [{ key: "clock", label: "My clock" }, { key: "today", label: "Today" }, { key: "flags", label: "Flags" }, { key: "month", label: "Month sheet" }];
  const current = view || (me?.eligible ? "clock" : "today");
  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl options={views} value={current} onChange={setView} />
        <p className="text-xs text-slate-500">Beta · Station Heads and Fleet Assistants clock in and out here by location, with their Google sign-in. Fixes need a Region Head, RFS or Manager.</p>
      </div>
      {current === "clock" ? <MyClock me={me} reload={reload} setError={setError} /> : current === "today" ? <TodayView setError={setError} /> : current === "flags" ? <FlagsView setError={setError} /> : <MonthView setError={setError} />}
    </div>
  );
}
