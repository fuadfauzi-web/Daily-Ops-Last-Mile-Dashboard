import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import { btnCls, Field, hhmm, inputCls, localDay, Modal } from "./ui";

// Attendance -> PTWH -> Audit: every clock in / out made in the PTWH app, with HOW it was verified (the station's QR code, or the phone's location
// and how far from the station it was), where the phone was, and the selfie taken at the time -- so someone can check the person really was at the
// station. Visible to everyone whose scope covers the station: station, RH, RFS, manager, HOD, Fleet Admin ...
// An auditor can FLAG a clock event as suspicious (with a note) or mark it checked OK. Selfies are kept for 14 days, except flagged ones.

const day = localDay;
const METHOD = { qr: "QR", geo: "Location" };

function Proof({ ev, which, onOpen }) {
  const p = ev[which];
  if (!ev[which === "in" ? "clock_in" : "clock_out"]) return <span className="text-slate-400">—</span>;
  const time = hhmm(ev[which === "in" ? "clock_in" : "clock_out"]);
  return (
    <div className="flex items-center gap-2">
      {p.photo ? (
        <button onClick={() => onOpen({ ev, which })} className="shrink-0">
          <img loading="lazy" src={api.ptwhPhotoUrl(ev.id, which)} alt={`${which === "in" ? "Clock in" : "Clock out"} selfie`} className="h-12 w-12 rounded-md object-cover ring-1 ring-slate-200" />
        </button>
      ) : <div title={ev.purged ? "Selfies are deleted after 14 days" : undefined} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1 text-center text-[9px] leading-tight text-slate-400">{ev.purged ? "photo deleted" : "no photo"}</div>}
      <div className="text-xs leading-tight">
        <div className="text-sm font-semibold tabular-nums text-ink">{time}</div>
        <div className={p.method === "qr" ? "font-semibold text-amber-700" : "text-slate-500"}>{p.method === "qr" ? "QR (emergency)" : METHOD[p.method] || "—"}{p.dist != null ? ` · ${p.dist} m` : ""}</div>
        {p.reason && <div className="max-w-[200px] text-slate-500" title={p.reason}>“{p.reason}”</div>}
      </div>
    </div>
  );
}

function FlagChip({ flag }) {
  if (!flag) return <span className="text-xs text-slate-400">Not reviewed</span>;
  if (flag.status === "review") return <span title={flag.note || "Clocked by the emergency QR code"} className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">⚠ Needs review (QR)</span>;
  return flag.status === "flagged"
    ? <span title={`${flag.by}: ${flag.note || ""}`} className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">⚑ Flagged</span>
    : <span title={flag.by} className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700">✓ Checked OK</span>;
}

// Flag / mark OK / clear, with a note. Used from the photo viewer and from the row.
function ReviewBox({ ev, onSaved, setError }) {
  const [note, setNote] = useState(ev.flag?.note || "");
  const [busy, setBusy] = useState(false);
  const run = async (status) => {
    setBusy(true);
    try {
      await api.ptwhFlag(ev.id, status, note);
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
      <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">Review</span><FlagChip flag={ev.flag} /></div>
      {ev.flag?.status === "review" && <p className="text-xs text-amber-800">A QR clock is only for emergencies and must be checked: mark it Checked OK or flag it.</p>}
      {ev.flag?.note && <p className="text-xs text-slate-600">“{ev.flag.note}” -- {ev.flag.by}</p>}
      <input className={`${inputCls} w-full`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Why? (needed to flag), e.g. station not visible behind the person" />
      <div className="flex flex-wrap justify-end gap-2">
        {ev.flag && ev.flag.status !== "review" && <button disabled={busy} onClick={() => run(null)} className={`${btnCls} text-slate-500`}>Clear</button>}
        <button disabled={busy} onClick={() => run("ok")} className={`${btnCls} border border-emerald-300 text-emerald-700`}>Checked OK</button>
        <button disabled={busy || note.trim().length < 3} onClick={() => run("flagged")} className={`${btnCls} bg-red-600 text-white disabled:opacity-50`}>Flag as suspicious</button>
      </div>
    </div>
  );
}

function PhotoModal({ ev, which, onClose, onSaved, setError }) {
  const p = ev[which];
  return (
    <Modal title={`${ev.name} · ${ev.station} · ${ev.date}`} onClose={onClose}>
      <img src={api.ptwhPhotoUrl(ev.id, which)} alt="Selfie" className="w-full rounded-lg ring-1 ring-slate-200" />
      <div className="mt-3 space-y-1 text-sm text-slate-600">
        <div><strong className="text-ink">{which === "in" ? "Clock in" : "Clock out"}</strong> at {hhmm(ev[which === "in" ? "clock_in" : "clock_out"])} -- verified by {p.method === "qr" ? "the station QR code (emergency)" : "location"}</div>
        {p.reason && <div>Reason given: “{p.reason}”</div>}
        {p.dist != null && <div>{p.dist} m from the station{p.acc != null ? ` (phone location accurate to about ${p.acc} m)` : ""}</div>}
        {p.lat != null && (
          <a className="text-xs underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}>Where the phone was</a>
        )}
      </div>
      <ReviewBox ev={ev} setError={setError} onSaved={() => { onSaved(); onClose(); }} />
    </Modal>
  );
}

export default function AuditView({ setError }) {
  const today = new Date();
  const [from, setFrom] = useState(day(new Date(today.getTime() - 6 * 86400000)));
  const [to, setTo] = useState(day(today));
  const [station, setStation] = useState("");
  const [q, setQ] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [onlyReview, setOnlyReview] = useState(false);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    api.ptwhAudit(from, to, station).then(setData).catch((e) => { setError(e.message); setData({ events: [], stations: [] }); });
  }, [from, to, station, setError]);
  useEffect(() => { setData(null); load(); }, [load]);

  const events = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.events || []).filter((e) => (!needle || e.name.toLowerCase().includes(needle)) && (!onlyFlagged || e.flag?.status === "flagged") && (!onlyReview || e.flag?.status === "review"));
  }, [data, q, onlyFlagged, onlyReview]);
  const reviewCount = (data?.events || []).filter((e) => e.flag?.status === "review").length;
  const flaggedCount = (data?.events || []).filter((e) => e.flag?.status === "flagged").length;
  const days = data?.retention_days || 14;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From"><input type="date" className={inputCls} value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className={inputCls} value={to} min={from} max={day(today)} onChange={(e) => e.target.value && setTo(e.target.value)} /></Field>
        {(data?.stations?.length || 0) > 1 && (
          <Field label="Station">
            <select className={inputCls} value={station} onChange={(e) => setStation(e.target.value)}>
              <option value="">All stations</option>
              {data.stations.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <Field label="Find a person"><input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" /></Field>
        <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> Flagged only {flaggedCount > 0 && <span className="rounded bg-red-100 px-1.5 font-bold text-red-700">{flaggedCount}</span>}
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
          <input type="checkbox" checked={onlyReview} onChange={(e) => setOnlyReview(e.target.checked)} /> Needs review (QR) {reviewCount > 0 && <span className="rounded bg-amber-100 px-1.5 font-bold text-amber-800">{reviewCount}</span>}
        </label>
        <span className="ml-auto pb-2 text-xs text-slate-500">{data ? `${events.length} clock records` : ""}</span>
      </div>
      {!data ? <Skeleton rows={5} /> : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Station</th><th className="px-3 py-2">Clock in</th><th className="px-3 py-2">Clock out</th><th className="px-3 py-2">Review</th></tr>
            </thead>
            <tbody>
              {events.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No clock records from the PTWH app in this period{onlyFlagged ? " are flagged" : onlyReview ? " need review" : " yet"}.</td></tr>}
              {events.map((ev) => (
                <tr key={ev.id} className={`border-t border-slate-100 ${ev.flag?.status === "flagged" ? "bg-red-50/50" : ""}`}>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{ev.date}</td>
                  <td className="px-3 py-2 font-medium text-ink">{ev.name}</td>
                  <td className="px-3 py-2 text-slate-600">{ev.station}</td>
                  <td className="px-3 py-2"><Proof ev={ev} which="in" onOpen={setOpen} /></td>
                  <td className="px-3 py-2"><Proof ev={ev} which="out" onOpen={setOpen} /></td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <FlagChip flag={ev.flag} />
                      <div><button onClick={() => setOpen({ ev, which: ev.in.photo || !ev.out.photo ? "in" : "out" })} className="text-xs text-slate-500 underline">Review</button></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Selfies are personal photos kept for audit only, and are deleted after {days} days -- a flagged clock-in, or a QR (emergency) one still waiting for review, keeps its photos until it is cleared or marked OK. Check the face is clear and the station is visible behind the person. Normal clocks are verified by location (how many metres from the station the phone was); a QR clock means the person said their location wasn't working, so every one needs a look.
      </p>
      {open && <PhotoModal {...open} onClose={() => setOpen(null)} onSaved={load} setError={setError} />}
    </div>
  );
}
