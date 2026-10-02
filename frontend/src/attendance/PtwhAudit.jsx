import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import { Field, hhmm, inputCls, localDay, Modal } from "./ui";

// Attendance -> PTWH -> Audit: every clock in / out made in the PTWH app, with HOW it was verified (the station's QR code, or the phone's location
// and how far from the station it was), where the phone was, and the selfie taken at the time -- so someone can check the person really was at the
// station. Visible to everyone whose scope covers the station: station, RH, RFS, manager, HOD, Fleet Admin ...

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
      ) : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] text-slate-400">no photo</div>}
      <div className="text-xs leading-tight">
        <div className="text-sm font-semibold tabular-nums text-ink">{time}</div>
        <div className="text-slate-500">{METHOD[p.method] || "—"}{p.dist != null ? ` · ${p.dist} m` : ""}</div>
      </div>
    </div>
  );
}

function PhotoModal({ ev, which, onClose }) {
  const p = ev[which];
  return (
    <Modal title={`${ev.name} · ${ev.station} · ${ev.date}`} onClose={onClose}>
      <img src={api.ptwhPhotoUrl(ev.id, which)} alt="Selfie" className="w-full rounded-lg ring-1 ring-slate-200" />
      <div className="mt-3 space-y-1 text-sm text-slate-600">
        <div><strong className="text-ink">{which === "in" ? "Clock in" : "Clock out"}</strong> at {hhmm(ev[which === "in" ? "clock_in" : "clock_out"])} -- verified by {p.method === "qr" ? "the station QR code" : "location"}</div>
        {p.dist != null && <div>{p.dist} m from the station{p.acc != null ? ` (phone location accurate to about ${p.acc} m)` : ""}</div>}
        {p.lat != null && (
          <a className="text-xs underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}>Where the phone was</a>
        )}
      </div>
    </Modal>
  );
}

export default function AuditView({ setError }) {
  const today = new Date();
  const [from, setFrom] = useState(day(new Date(today.getTime() - 6 * 86400000)));
  const [to, setTo] = useState(day(today));
  const [station, setStation] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    setData(null);
    api.ptwhAudit(from, to, station).then(setData).catch((e) => { setError(e.message); setData({ events: [], stations: [] }); });
  }, [from, to, station, setError]);
  useEffect(load, [load]);

  const events = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.events || []).filter((e) => !needle || e.name.toLowerCase().includes(needle));
  }, [data, q]);

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
        <span className="ml-auto pb-2 text-xs text-slate-500">{data ? `${events.length} clock records` : ""}</span>
      </div>
      {!data ? <Skeleton rows={5} /> : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Station</th><th className="px-3 py-2">Clock in</th><th className="px-3 py-2">Clock out</th></tr>
            </thead>
            <tbody>
              {events.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No clock records from the PTWH app in this period yet.</td></tr>}
              {events.map((ev) => (
                <tr key={ev.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{ev.date}</td>
                  <td className="px-3 py-2 font-medium text-ink">{ev.name}</td>
                  <td className="px-3 py-2 text-slate-600">{ev.station}</td>
                  <td className="px-3 py-2"><Proof ev={ev} which="in" onOpen={setOpen} /></td>
                  <td className="px-3 py-2"><Proof ev={ev} which="out" onOpen={setOpen} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Selfies are personal photos kept for audit only. Check the face is clear and the station is visible behind the person; a QR check proves the person saw the station's screen that hour, a location check shows how far from the station the phone was.
      </p>
      {open && <PhotoModal {...open} onClose={() => setOpen(null)} />}
    </div>
  );
}
