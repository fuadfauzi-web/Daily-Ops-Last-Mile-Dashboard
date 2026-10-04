import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";
import LoginModal from "./PtwhLogin";
import AuditView from "./PtwhAudit";
import StationView from "./PtwhStation";
import { btnCls, Field, hhmm, inputCls, localMonth, Modal } from "./ui";

// Attendance -> PTWH (2026-10-02, staging). Three views over the same records:
//   Today   -- who is in, clock people in / out, fix a forgotten time (what the station staff typed into the Google Sheet by hand)
//   Month   -- the old sheet's grid: a row per PTWH, a column per day, workdays + payable
//   Workers -- the PTWH roster (the sheet's PTWH DETAILS tab)
// Every day carries one of the 4 standard PTWH categories (C1-C4, from the PTWH Monitoring template); each worker has a default that pre-fills it.
// For now station staff clock people in / out for them; the PTWH's own app (their own login) will write the same clock times later.

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "month", label: "Month sheet" },
  { key: "workers", label: "Workers" },
  { key: "audit", label: "Audit" },
  { key: "corrections", label: "Corrections" },
  { key: "station", label: "Station QR" },
];

const rm = (n) => `RM${(n || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const thisMonth = () => localMonth();

const CAT_CHIP = { C1: "bg-indigo-100 text-indigo-700", C2: "bg-amber-100 text-amber-800", C3: "bg-teal-100 text-teal-700", C4: "bg-rose-100 text-rose-700" };

function CatChip({ code, categories }) {
  if (!code) return <span className="text-slate-400">—</span>;
  const c = categories?.find((x) => x.code === code);
  return <span title={c ? `${c.code} · ${c.name}` : code} className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${CAT_CHIP[code] || "bg-slate-100 text-slate-600"}`}>{code}</span>;
}

function CategorySelect({ value, onChange, categories, className = "", allowNone = false }) {
  return (
    <select className={className} value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
      {allowNone && <option value="">Not set</option>}
      {categories.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
    </select>
  );
}

// What each category means -- the template's own wording, so the person choosing one can see the difference.
function CategoryLegend({ categories }) {
  return (
    <details className="rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
      <summary className="cursor-pointer font-semibold text-slate-700">What the PTWH categories mean</summary>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {categories.map((c) => (
          <div key={c.code}>
            <CatChip code={c.code} categories={categories} /> <strong className="text-ink">{c.name}</strong>
            <div className="mt-0.5">{c.covers}</div>
            <div className="mt-0.5 text-slate-500">{c.max_days ? `Up to ${c.max_days} days a month` : "Days as approved"}</div>
          </div>
        ))}
      </div>
    </details>
  );
}

function dayPay(rate, hours, rule) {
  if (hours == null || hours <= 0) return 0;
  return rate * (hours >= rule.half_day_hours ? 1 : rule.half_day_factor);
}

// The PTWH app's address, for a station to copy / open and give to a PTWH who has lost it.
function AppLink() {
  const [url, setUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { api.ptwhLogins().then((d) => setUrl(d.app_url)).catch(() => {}); }, []);
  if (!url) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the address is on screen to select */ }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
      <span className="font-semibold text-slate-700">PTWH app link</span>
      <a href={url} target="_blank" rel="noreferrer" className="break-all text-sky-700 underline">{url}</a>
      <button onClick={copy} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700">{copied ? "Copied ✓" : "Copy"}</button>
      <span className="text-xs text-slate-500">Give this to a PTWH who has lost it -- they log in with the username you created for them.</span>
    </div>
  );
}

export default function PtwhAttendance({ me, requestView }) {
  const [view, setView] = useState("today");
  const [error, setError] = useState(null);
  useEffect(() => { if (requestView?.view) setView(requestView.view); }, [requestView]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
        <p className="text-xs text-slate-500">
          Beta · station staff can clock PTWH in and out, and PTWH can clock themselves in the PTWH app (by location, with an emergency-only QR, plus a selfie -- see Audit).
        </p>
      </div>
      <AppLink />
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}
      {view === "today" && <TodayView setError={setError} />}
      {view === "month" && <MonthView setError={setError} me={me} />}
      {view === "workers" && <WorkersView setError={setError} me={me} />}
      {view === "audit" && <AuditView setError={setError} />}
      {view === "corrections" && <CorrectionsView setError={setError} />}
      {view === "station" && <StationView setError={setError} />}
    </div>
  );
}

// ---------------------------------------------------------------- Today

function TodayView({ setError }) {
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [station, setStation] = useState("");
  const [q, setQ] = useState("");
  const [cats, setCats] = useState({});
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

      {!isToday && <p className="text-xs text-amber-700">Looking at a past day -- clock buttons are for today only; use Correct to ask for a change (it is logged, and bigger changes need approval).</p>}

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Station</th>
              <th className="px-3 py-2">Category</th>
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
              const cat = cats[r.id] ?? r.default_category ?? "C2";
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-ink">{r.name}</td>
                  <td className="px-3 py-2 text-slate-600">{r.station}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {!rec && isToday && data.can_edit ? (
                      <CategorySelect className={`${inputCls} max-w-[240px] text-xs`} value={cat} categories={data.categories} onChange={(v) => setCats({ ...cats, [r.id]: v })} />
                    ) : <CatChip code={rec?.category} categories={data.categories} />}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{rec ? hhmm(rec.clock_in) : "—"}{rec?.source === "app" && <span title="Clocked in the PTWH app -- see Audit for the selfie" className="ml-1.5 rounded bg-sky-100 px-1 py-0.5 text-[10px] font-semibold text-sky-700">app</span>}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {rec?.clock_out ? hhmm(rec.clock_out) : open ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Working</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{rec?.hours != null ? rec.hours.toFixed(1) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {rec?.held ? <span title="A QR (emergency) clock, one an auditor flagged, or one whose correction is waiting is not paid until it has been checked" className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">On hold</span>
                      : rec?.hours != null ? rm(dayPay(r.daily_rate, rec.hours, data.rule)) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {data.can_edit && (
                      <>
                        {isToday && !rec && (
                          <button disabled={busy === r.id} onClick={() => act(r.id, () => api.ptwhClockIn(r.id, cat))} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Clock in</button>
                        )}
                        {isToday && open && (
                          <button disabled={busy === r.id} onClick={() => act(r.id, () => api.ptwhClockOut(r.id))} className={`${btnCls} bg-ink text-white disabled:opacity-50`}>Clock out</button>
                        )}
                        <button onClick={() => setEditing({ worker: r, date: data.date, record: rec })} className="ml-2 text-xs text-slate-500 underline">Correct</button>
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
        A day with {data.rule.half_day_hours}+ hours is a full day at the worker's rate; shorter is a half day. Clocked in but not out yet pays nothing until it is closed. A clock by the emergency QR code, or one an auditor flagged, is <strong>on hold</strong> (no pay) until it has been checked in Audit.
      </p>
      {editing && <CorrectionModal {...editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); window.dispatchEvent(new Event("ptwh-review-changed")); }} setError={setError} />}
      <CategoryLegend categories={data.categories} />
    </div>
  );
}

// ---------------------------------------------------------------- Ask for a correction (nothing is edited or deleted directly)

// Changing a clock record is a REQUEST with a reason: a change within 30 minutes of the original is applied at once and logged; anything bigger, a missing day, or a void
// waits for a Region Head / RFS / Manager and the day's pay is held until then. A shift can't be longer than 12 hours. Days clocked in the app (with a selfie) can't have
// their times changed -- only a missing clock-out filled in, or a void asked for.
function CorrectionModal({ worker, date, record, onClose, onSaved, setError }) {
  const app = record?.source === "app";
  const locked = app && !!record?.clock_out; // an app day that is complete: the evidence stays as it is
  const [mode, setMode] = useState(locked ? "void" : "edit");
  const [cin, setCin] = useState(hhmm(record?.clock_in) || "08:00");
  const [cout, setCout] = useState(hhmm(record?.clock_out) || "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    setSaving(true);
    try {
      setResult(await api.ptwhCorrect({ worker_id: worker.id, work_date: date, kind: mode, clock_in: mode === "edit" ? cin : null, clock_out: mode === "edit" ? cout || null : null, reason }));
    } catch (e) {
      setError(e.message);
      onClose();
    }
  };

  if (result) {
    return (
      <Modal title={`${worker.name} · ${date}`} onClose={() => onSaved()}>
        <p className={`rounded-lg p-3 text-sm ${result.status === "applied" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{result.message}</p>
        <div className="mt-3 flex justify-end"><button onClick={() => onSaved()} className={`${btnCls} bg-brand text-white`}>OK</button></div>
      </Modal>
    );
  }
  return (
    <Modal title={`Correct ${worker.name} · ${date}`} onClose={onClose}>
      <div className="space-y-3">
        {record && (
          <div className="flex gap-2 text-sm">
            <button onClick={() => setMode("edit")} disabled={locked} className={`rounded-md px-3 py-1.5 font-semibold ${mode === "edit" ? "bg-ink text-white" : "border border-slate-300 text-slate-600"} disabled:opacity-40`}>Change the times</button>
            <button onClick={() => setMode("void")} className={`rounded-md px-3 py-1.5 font-semibold ${mode === "void" ? "bg-red-600 text-white" : "border border-slate-300 text-slate-600"}`}>Void this record</button>
          </div>
        )}
        {mode === "edit" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Clock in"><input type="time" className={`${inputCls} w-full`} value={cin} disabled={app} onChange={(e) => setCin(e.target.value)} /></Field>
              <Field label="Clock out"><input type="time" className={`${inputCls} w-full`} value={cout} onChange={(e) => setCout(e.target.value)} /></Field>
            </div>
            {app && <p className="text-xs text-slate-500">Clocked in the PTWH app with a selfie: the clock-in can't change. Only the missing clock-out can be filled in, and that needs approval.</p>}
            {!record && <p className="text-xs text-slate-500">Nobody clocked this day. Give both times; it needs approval before it counts.</p>}
          </>
        ) : (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">A void takes this day out of the pay. The record is not deleted -- it stays in the history -- and a Region Head, RFS or Manager has to approve it.</p>
        )}
        <Field label="Why? (needed -- a few words)">
          <input className={`${inputCls} w-full`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === "void" ? "e.g. clocked twice by mistake" : "e.g. the PTWH left at 2pm, station keyed 5pm"} />
        </Field>
        <p className="text-xs text-slate-500">
          A shift can be 12 hours at most. A change within 30 minutes of the original time is applied at once and logged; anything bigger needs approval, and the day's pay is on hold until it is approved. Nothing is ever deleted.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className={`${btnCls} text-slate-600`}>Cancel</button>
          <button disabled={saving || reason.trim().length < 5 || (mode === "edit" && !cin)} onClick={send} className={`${btnCls} ${mode === "void" ? "bg-red-600" : "bg-brand"} text-white disabled:opacity-50`}>
            {mode === "void" ? "Ask to void" : "Send correction"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Month sheet

function MonthView({ setError, me }) {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [station, setStation] = useState("");
  const [editing, setEditing] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [note, setNote] = useState(null);

  const load = useCallback(() => {
    api.ptwhMonth(month).then(setData).catch((e) => setError(e.message));
  }, [month, setError]);
  useEffect(load, [load]);

  const all = data?.workers || [];
  // Region -> Zone -> Station: each box only offers what the one before it allows, so a manager can narrow to one region / zone and copy just that to HR.
  const regions = useMemo(() => [...new Set(all.map((w) => w.region).filter(Boolean))].sort(), [all]);
  const zones = useMemo(() => [...new Set(all.filter((w) => !region || w.region === region).map((w) => w.zone).filter(Boolean))].sort(), [all, region]);
  const stations = useMemo(() => [...new Set(all.filter((w) => (!region || w.region === region) && (!zone || w.zone === zone)).map((w) => w.station))].sort(), [all, region, zone]);
  const workers = useMemo(() => all.filter((w) => (!region || w.region === region) && (!zone || w.zone === zone) && (!station || w.station === station)), [all, region, zone, station]);
  if (!data) return <Skeleton rows={6} />;

  const days = Array.from({ length: data.days_in_month }, (_, i) => i + 1);
  const totalPay = workers.reduce((a, w) => a + w.payable, 0);
  const totalHold = workers.reduce((a, w) => a + (w.on_hold || 0), 0);
  const totalDays = workers.reduce((a, w) => a + w.workdays, 0);
  const cats = data.categories;
  // Cost by category (what the HOD dashboard reads), and who is over a category's max days for the month.
  const byCat = {};
  workers.forEach((w) => Object.entries(w.by_category).forEach(([k, v]) => {
    const t = (byCat[k] ||= { days: 0, payable: 0, people: 0 });
    t.days += v.days; t.payable += v.payable; t.people += 1;
  }));
  const overCap = (w) => Object.entries(w.by_category).filter(([k, v]) => (cats.find((c) => c.code === k)?.max_days || 0) > 0 && v.days > cats.find((c) => c.code === k).max_days).map(([k]) => k);

  // Export in the HR sheet's layout (typed columns A..AJ: month, station, name, IC, justification, then the RM amount for each day). Region staff and Managers only: it carries full IC numbers.
  const canExport = ["admin", "manager", "region"].includes(me?.role);
  const filters = { month: data.month, region, zone, station };
  const exportHr = async () => {
    setExporting("csv");
    try {
      const r = await api.ptwhExport({ ...filters, fmt: "csv", header: true });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([r.text], { type: "text/csv" }));
      a.download = `ptwh-hr-${data.month}${station ? `-${station}` : zone ? `-${zone}` : region ? `-${region}` : ""}.csv`.replace(/\s+/g, "_");
      a.click();
      URL.revokeObjectURL(a.href);
      setNote(`${r.rows} PTWH exported for HR${r.rows === 0 ? " -- nothing is payable yet for this selection" : ""}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(null);
    }
  };
  const copyHr = async () => {
    setExporting("copy");
    try {
      const r = await api.ptwhExport({ ...filters, fmt: "tsv", header: false });
      await navigator.clipboard.writeText(r.text);
      setNote(`${r.rows} rows copied -- click cell A of the first empty row in the HR sheet and paste.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(null);
    }
  };

  const sel = (value, set, options, all_label, reset = []) => (
    <select className={inputCls} value={value} onChange={(e) => { set(e.target.value); reset.forEach((f) => f("")); }}>
      <option value="">{all_label}</option>
      {options.map((s) => <option key={s}>{s}</option>)}
    </select>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Month"><input type="month" className={inputCls} value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>
        {regions.length > 1 && <Field label="Region">{sel(region, setRegion, regions, "All regions", [setZone, setStation])}</Field>}
        {zones.length > 1 && <Field label="Zone">{sel(zone, setZone, zones, "All zones", [setStation])}</Field>}
        {stations.length > 1 && <Field label="Station">{sel(station, setStation, stations, "All stations")}</Field>}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-600">Workdays <b className="text-ink">{totalDays}</b></span>
          <span className="text-slate-600">Payable <b className="text-ink">{rm(totalPay)}</b></span>
          {totalHold > 0 && <span className="text-amber-700" title="Days waiting for an auditor or for a correction to be approved">On hold <b>{rm(totalHold)}</b></span>}
          {canExport && (
            <>
              <button onClick={copyHr} disabled={!workers.length || exporting} title="Copies the rows in the HR sheet's format, to paste straight into it" className={`${btnCls} border border-slate-300 text-slate-700 disabled:opacity-50`}>{exporting === "copy" ? "Copying…" : "Copy for HR sheet"}</button>
              <button onClick={exportHr} disabled={!workers.length || exporting} title="Downloads a CSV in the HR sheet's format" className={`${btnCls} border border-slate-300 text-slate-700 disabled:opacity-50`}>{exporting === "csv" ? "Preparing…" : "Export CSV for HR"}</button>
            </>
          )}
        </div>
      </div>
      {note && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <span>{note}</span><button onClick={() => setNote(null)} className="text-xs underline">OK</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Name</th>
              <th className="px-2 py-2 text-left">Station</th>
              <th className="px-2 py-2 text-left">Cat.</th>
              {days.map((d) => <th key={d} className="px-1.5 py-2 text-center font-medium">{d}</th>)}
              <th className="px-2 py-2 text-right">Days</th>
              <th className="px-2 py-2 text-right">Payable</th>
            </tr>
          </thead>
          <tbody>
            {workers.length === 0 && <tr><td colSpan={days.length + 5} className="px-3 py-6 text-center text-slate-500">Nothing recorded for this month{region || zone || station ? " in this selection" : ""}.</td></tr>}
            {workers.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-ink">{w.name}{!w.active && <span className="ml-1 text-[10px] text-slate-400">(inactive)</span>}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{w.station}</td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {Object.keys(w.by_category).filter((k) => k !== "NA").map((k) => <span key={k} className="mr-0.5"><CatChip code={k} categories={cats} /></span>)}
                  {overCap(w).length > 0 && <span title={`Over the max days for ${overCap(w).join(", ")} this month`} className="text-amber-600">⚠</span>}
                </td>
                {days.map((d) => {
                  const c = w.days[d];
                  const cls = !c ? "" : c.held ? "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-400" : c.out == null ? "bg-amber-100 text-amber-800" : c.workday >= 1 ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800";
                  return (
                    <td key={d} className={`px-1.5 py-1.5 text-center tabular-nums ${cls} ${c ? "cursor-pointer" : ""}`}
                      title={c ? `${c.in} – ${c.out || "still open"}${c.category ? ` · ${c.category}` : ""}${c.correction_pending ? " · correction waiting for approval, pay on hold" : c.held ? " · pay on hold until checked in Audit" : ""}` : undefined}
                      onClick={c ? () => setEditing({ worker: { ...w, default_category: c.category || w.category }, date: `${data.month}-${String(d).padStart(2, "0")}` }) : undefined}>
                      {c ? (c.out == null ? "…" : c.hours.toFixed(1)) : ""}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-right tabular-nums">{w.workdays}{w.open_days > 0 && <span title="Days still open (no clock-out)" className="ml-1 text-amber-600">⚠</span>}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
                  {rm(w.payable)}
                  {w.on_hold > 0 && <div className="text-[10px] font-normal text-amber-700">+{rm(w.on_hold)} on hold</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Object.keys(byCat).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">By category</span>
          {Object.entries(byCat).sort().map(([k, t]) => (
            <span key={k} className="rounded-lg bg-white px-2.5 py-1 ring-1 ring-slate-200">
              {k === "NA" ? "No category" : <CatChip code={k} categories={cats} />} <b className="text-ink">{t.days}</b> days · {t.people} people · <b className="text-ink">{rm(t.payable)}</b>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">
        Cells show hours worked (green = full day, blue = half day under {data.rule.half_day_hours}h, amber … = clocked in, no clock-out yet, amber outline = pay on hold until an auditor checks the QR / flagged clock or a correction is approved). Click a day to ask for a correction.
        {canExport && " The HR export fills the sheet's typed columns (month, station, name, IC, justification, and the RM amount for each day) for what is filtered above; a day on hold or still open is left blank so it can't be paid by accident, and the justification is the person's first category of the month."}
      </p>
      {editing && (
        <MonthRecordLoader {...editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); window.dispatchEvent(new Event("ptwh-review-changed")); }} setError={setError} />
      )}
    </div>
  );
}

// The month grid doesn't carry record ids / notes, so open the day through the day endpoint and correct that.
function MonthRecordLoader({ worker, date, onClose, onSaved, setError }) {
  const [record, setRecord] = useState(undefined);
  useEffect(() => {
    api.ptwhDay(date)
      .then((d) => setRecord(d.rows.find((r) => r.id === worker.id)?.record || null))
      .catch((e) => { setError(e.message); onClose(); });
  }, [date, worker.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (record === undefined) return null;
  return <CorrectionModal worker={worker} date={date} record={record} onClose={onClose} onSaved={onSaved} setError={setError} />;
}

// ---------------------------------------------------------------- Corrections: requests waiting for approval, and the history

const CORR_STATUS = { pending: ["Waiting", "bg-amber-100 text-amber-800"], approved: ["Approved", "bg-emerald-100 text-emerald-800"], applied: ["Applied (small)", "bg-sky-100 text-sky-800"], rejected: ["Rejected", "bg-red-100 text-red-700"] };

function CorrectionsView({ setError }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("pending");

  const load = useCallback(() => {
    api.ptwhCorrections(status).then(setData).catch((e) => setError(e.message));
  }, [status, setError]);
  useEffect(() => { setData(null); load(); }, [load]);

  const decide = async (c, decision) => {
    let note = null;
    if (decision === "reject") {
      note = window.prompt(`Why are you rejecting this correction for ${c.name}?`);
      if (!note || note.trim().length < 3) return;
    }
    try {
      await api.ptwhCorrectionDecision(c.id, decision, note);
      load();
      window.dispatchEvent(new Event("ptwh-review-changed"));
    } catch (e) {
      setError(e.message);
    }
  };
  const change = (c) => (c.kind === "void" ? <span className="font-semibold text-red-700">Void the record ({c.old_in}–{c.old_out || "open"})</span>
    : c.kind === "add" ? <span>Add the day: {c.new_in}–{c.new_out}</span>
    : <span>{c.old_in}–{c.old_out || "open"} → <b>{c.new_in}–{c.new_out}</b></span>);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Show">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Waiting for approval</option>
            <option value="">Everything (this month and last)</option>
            <option value="approved">Approved</option>
            <option value="applied">Applied (small changes)</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
        <p className="ml-auto max-w-xl pb-1 text-xs text-slate-500">
          Nobody edits or deletes a clock record directly. A correction within {data?.auto_minutes || 30} minutes of the original is applied and logged; anything bigger, a missing day or a void waits here for a Region Head, RFS or Manager
          (never the person who asked), and the day's pay is on hold until then. A shift can be {data?.max_shift_hours || 12} hours at most.
        </p>
      </div>
      {!data ? <Skeleton rows={4} /> : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Day</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Station</th><th className="px-3 py-2">Change</th><th className="px-3 py-2">Why</th><th className="px-3 py-2">Asked by</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {data.corrections.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">{status === "pending" ? "Nothing is waiting for approval." : "No corrections yet."}</td></tr>}
              {data.corrections.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{c.date}</td>
                  <td className="px-3 py-2 font-medium text-ink">{c.name}</td>
                  <td className="px-3 py-2 text-slate-600">{c.station}</td>
                  <td className="px-3 py-2 tabular-nums">{change(c)}</td>
                  <td className="max-w-[260px] px-3 py-2 text-xs text-slate-600">{c.reason}{c.note && <div className="mt-0.5 text-slate-400">“{c.note}” -- {c.decided_by}</div>}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{c.requested_by}<div>{(c.requested_at || "").replace("T", " ")}</div></td>
                  <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${CORR_STATUS[c.status]?.[1]}`}>{c.status === "approved" && c.decided_by ? "Approved" : CORR_STATUS[c.status]?.[0] || c.status}</span>{c.status !== "pending" && c.decided_by && c.decided_by !== "auto" && <div className="mt-0.5 text-[11px] text-slate-400">{c.decided_by}</div>}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {c.can_decide && (
                      <span className="flex gap-2">
                        <button onClick={() => decide(c, "reject")} className="rounded-md border border-red-300 px-3 py-1 text-xs font-semibold text-red-700">Reject</button>
                        <button onClick={() => decide(c, "approve")} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Approve</button>
                      </span>
                    )}
                    {c.status === "pending" && !c.can_decide && <span className="text-xs text-slate-400">Needs a Region Head, RFS or Manager</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Workers

const EMPTY = { name: "", station: "", ic_no: "", phone: "", daily_rate: 50, joined_date: "", end_date: "", category: null };

function WorkersView({ setError, me }) {
  const [data, setData] = useState(null);
  const [station, setStation] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState(null); // {id?, ...fields}
  const [importing, setImporting] = useState(false);
  const [rehire, setRehire] = useState(null); // the PTWH being brought back
  const [notice, setNotice] = useState(null);
  const [logins, setLogins] = useState({ logins: {}, app_url: null });
  const [loginFor, setLoginFor] = useState(null);

  const load = useCallback(() => {
    api.ptwhWorkers().then(setData).catch((e) => setError(e.message));
    api.ptwhLogins().then(setLogins).catch(() => {});
  }, [setError]);
  useEffect(load, [load]);

  if (!data) return <Skeleton rows={6} />;
  const workers = data.workers.filter((w) => (!station || w.station === station) && (showInactive || w.active) && (w.approval === "approved" || showInactive));
  const pending = data.workers.filter((w) => (!station || w.station === station) && (w.approval === "pending_rh" || w.approval === "pending_mgr"));
  const decide = async (w, decision) => {
    let note = null;
    if (decision === "reject") {
      note = window.prompt(`Why are you rejecting ${w.name}?`);
      if (!note || note.trim().length < 3) return;
    }
    try {
      await api.ptwhDecision(w.id, decision, note);
      load();
      window.dispatchEvent(new Event("ptwh-review-changed"));
    } catch (e) {
      setError(e.message);
    }
  };
  const used = [...new Set(data.workers.map((w) => w.station))].sort();

  const save = async () => {
    const body = { name: form.name, station: form.station, ic_no: form.ic_no || null, phone: form.phone || null, daily_rate: Number(form.daily_rate), joined_date: form.joined_date || null, end_date: form.end_date || null, category: form.category || null };
    try {
      if (form.id) await api.ptwhWorkerSave(form.id, body);
      else setNotice((await api.ptwhWorkerAdd(body)).message);
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
        {["admin", "manager"].includes(me?.role) && (
          <button onClick={() => setImporting(true)} title="Managers load the existing PTWH list from the sheet. New hires are added one by one and need approval." className={`${btnCls} ml-auto border border-slate-300 text-slate-700`}>Import existing PTWH</button>
        )}
        {data.can_edit && (
          <button onClick={() => setForm({ ...EMPTY, station: station || (data.stations.length === 1 ? data.stations[0] : ""), daily_rate: data.default_rate })} className={`${btnCls} bg-brand text-white`}>Add PTWH</button>
        )}
      </div>
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <span>{notice}</span><button onClick={() => setNotice(null)} className="text-xs underline">OK</button>
        </div>
      )}
      {pending.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <div className="mb-2 text-sm font-semibold text-amber-900">New PTWH hires waiting for approval <span className="font-normal text-amber-800">-- the Region Head approves first, then a Manager</span></div>
          <div className="space-y-1.5">
            {pending.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                <span className="font-medium text-ink">{w.name}</span>
                <span className="text-slate-500">{w.station} · {rm(w.daily_rate)} a day</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">{data.approval_labels[w.approval]}</span>
                {w.can_decide ? (
                  <span className="ml-auto flex gap-2">
                    <button onClick={() => decide(w, "reject")} className="rounded-md border border-red-300 px-3 py-1 text-xs font-semibold text-red-700">Reject</button>
                    <button onClick={() => decide(w, "approve")} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Approve</button>
                  </span>
                ) : <span className="ml-auto text-xs text-slate-400">{w.approval === "pending_rh" ? "Needs the Region Head" : "Needs a Manager"}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Station</th><th className="px-3 py-2">IC</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Daily rate</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2">End date</th><th className="px-3 py-2">App login</th><th className="px-3 py-2" /></tr>
          </thead>
          <tbody>
            {workers.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No PTWH yet.{data.can_edit ? " Add one with Add PTWH -- a new hire needs the Region Head's, then a Manager's approval." : ""}</td></tr>}
            {workers.map((w) => (
              <tr key={w.id} className={`border-t border-slate-100 ${w.active ? "" : "text-slate-400"}`}>
                <td className="px-3 py-2 font-medium">{w.name}
                  {!w.active && (
                    <div className="text-[11px] font-normal text-slate-500" title={w.cleaned ? "Personal data (IC, phone, selfies, app login) has been cleared" : `Cleared ${data.cleanup_days} days after going inactive`}>
                      {w.approval === "rejected" ? "Hire rejected" : "Inactive"}{w.inactive_reason ? ` · ${w.inactive_reason}` : ""}{w.inactive_since ? ` (${w.inactive_since})` : ""}{w.cleaned ? " · data cleared" : ""}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">{w.station}</td>
                <td className="px-3 py-2 tabular-nums">{w.ic_no || "—"}</td>
                <td className="px-3 py-2">{w.phone || "—"}</td>
                <td className="px-3 py-2"><CatChip code={w.category} categories={data.categories} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{rm(w.daily_rate)}</td>
                <td className="px-3 py-2">{w.joined_date || "—"}</td>
                <td className="px-3 py-2">{w.end_date || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {logins.logins[w.id] ? (
                    <button onClick={() => setLoginFor(w)} className={`text-xs underline ${logins.logins[w.id].disabled ? "text-red-600" : "text-emerald-700"}`}>
                      {logins.logins[w.id].username}{logins.logins[w.id].disabled ? " (off)" : ""}
                    </button>
                  ) : data.can_edit && w.active ? (
                    <button onClick={() => setLoginFor(w)} className="text-xs text-slate-500 underline">Create login</button>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {data.can_edit && <button onClick={() => setForm({ ...w, ic_no: w.ic_no || "", phone: w.phone || "", joined_date: w.joined_date || "", end_date: w.end_date || "" })} className="text-xs text-slate-500 underline">Edit</button>}
                  {data.can_edit && !w.working && (w.approval === "approved" || w.approval === "rejected") && <button onClick={() => setRehire(w)} className="ml-2 text-xs font-semibold text-sky-700 underline">Re-hire</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CategoryLegend categories={data.categories} />
      {rehire && (
        <RehireModal worker={rehire} stations={data.stations} onClose={() => setRehire(null)} setError={setError}
          onDone={(msg) => { setRehire(null); setNotice(msg); load(); window.dispatchEvent(new Event("ptwh-review-changed")); }} />
      )}
      {loginFor && <LoginModal worker={loginFor} login={logins.logins[loginFor.id]} appUrl={logins.app_url} onClose={() => setLoginFor(null)} onChanged={load} setError={setError} />}
      {importing && <ImportModal onClose={() => setImporting(false)} onDone={() => { setImporting(false); load(); }} setError={setError} />}
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
              <Field label="Default category"><CategorySelect className={`${inputCls} w-full`} value={form.category} categories={data.categories} allowNone onChange={(v) => setForm({ ...form, category: v })} /></Field>
              <Field label="Daily rate (RM)"><input type="number" min="1" step="1" className={`${inputCls} w-full`} value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} /></Field>
              <Field label="Joined"><input type="date" className={`${inputCls} w-full`} value={form.joined_date} onChange={(e) => setForm({ ...form, joined_date: e.target.value })} /></Field>
              {form.id && <Field label="End date (last working day)"><input type="date" className={`${inputCls} w-full`} value={form.end_date} min={form.joined_date || undefined} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>}
            </div>
            {form.id && (
              <p className="text-xs text-slate-500">
                When a PTWH stops, set their end date. After it they are inactive: no clocking, no app login, off the schedule -- their history stays. Someone with no clock in or out for {data.auto_inactive_days} days
                also goes inactive by itself, and {data.cleanup_days} days after that their IC, phone, selfies and app login are cleared. Coming back is a <strong>Re-hire</strong> (the Region Head's and then a Manager's approval), not an edit.
              </p>
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

// ---------------------------------------------------------------- Re-hire a PTWH who left

function RehireModal({ worker, stations, onClose, onDone, setError }) {
  const [station, setStation] = useState(stations.includes(worker.station) ? worker.station : stations[0] || "");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      onDone((await api.ptwhRehire(worker.id, station)).message);
    } catch (e) {
      setError(e.message);
      onClose();
    }
  };
  return (
    <Modal title={`Re-hire ${worker.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm text-slate-600">
        <p>Bringing someone back is treated like a new hire: the <strong>Region Head</strong> and then a <strong>Manager</strong> have to approve before they can clock in, be scheduled or log in to the app again. They may come back to a different station.</p>
        <Field label="Station they are coming back to">
          <select className={`${inputCls} w-full`} value={station} onChange={(e) => setStation(e.target.value)}>
            {stations.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={`${btnCls} text-slate-600`}>Cancel</button>
          <button disabled={busy || !station} onClick={go} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Send for approval</button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Import the PTWH DETAILS tab

function ImportModal({ onClose, onDone, setError }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = async (f) => {
    setFile(f);
    setPreview(null);
    if (!f) return;
    setBusy(true);
    try {
      setPreview(await api.ptwhImport(f, true));
    } catch (e) {
      setError(e.message);
      setFile(null);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    setBusy(true);
    try {
      await api.ptwhImport(file, false);
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  const unmatched = preview ? Object.entries(preview.unmatched_stations) : [];

  return (
    <Modal title="Import PTWH from the sheet" onClose={onClose}>
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Open the <strong>PTWH DETAILS</strong> tab of the PTWH attendance sheet and choose <em>File → Download → Comma-separated values (.csv)</em>, then pick that file here.
          Only name, IC, station, phone, joined date, rate and (if there is one) category are read -- bank details and address are not copied.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => pick(e.target.files?.[0] || null)} />
        {busy && !preview && <p className="text-xs text-slate-500">Reading the file…</p>}
        {preview && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
            <div className="text-sm"><strong className="text-ink">{preview.new}</strong> new PTWH will be added <span className="text-slate-500">(of {preview.rows} rows)</span></div>
            <ul className="list-disc space-y-0.5 pl-4 text-slate-600">
              {preview.existing > 0 && <li>{preview.existing} already in the list -- left as they are (nobody is overwritten)</li>}
              {preview.duplicate_in_file > 0 && <li>{preview.duplicate_in_file} repeated in the file (same IC) -- counted once</li>}
              {preview.outside_scope > 0 && <li>{preview.outside_scope} are at stations outside your scope -- skipped</li>}
              {preview.bad_rows > 0 && <li>{preview.bad_rows} rows without a name or station -- skipped</li>}
              {preview.bad_ic > 0 && <li>{preview.bad_ic} new rows have an IC that is not 12 digits -- added anyway, worth a look</li>}
              {unmatched.length > 0 && <li className="text-amber-700">Station not recognised, skipped: {unmatched.map(([n, c]) => `${n} (${c})`).join(", ")}</li>}
            </ul>
            {preview.sample.length > 0 && (
              <div className="text-slate-500">e.g. {preview.sample.slice(0, 4).map((p) => `${p.name} (${p.station})`).join(" · ")}</div>
            )}
            <p className="text-slate-500">Everyone is added as <em>active</em> -- untick Active in Edit for anyone who has left. Stations can edit anyone afterwards.</p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className={`${btnCls} text-slate-600`}>Cancel</button>
          <button disabled={busy || !preview || preview.new === 0} onClick={confirm} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>
            {preview ? `Import ${preview.new} PTWH` : "Import"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
