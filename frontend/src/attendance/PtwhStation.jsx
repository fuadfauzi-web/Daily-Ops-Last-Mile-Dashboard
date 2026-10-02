import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import { btnCls, Field, inputCls } from "./ui";

// Attendance -> PTWH -> Station: what a station needs to set up for the PTWH app.
//   * the QR code for THIS hour (it changes on the hour) -- keep this page open on a screen at the station; a PTWH scans it with their phone's camera
//     and it opens the PTWH app ready to clock in. A code is useless an hour later, so a photo of it sent to a friend doesn't last.
//   * where the station is (latitude / longitude) and how close a PTWH must be to clock in by location (50 m by default) -- the other way to prove
//     they are at the station. Set it by standing at the station and pressing "Use this device's location".

function QrCard({ station }) {
  const [info, setInfo] = useState(null);
  const [img, setImg] = useState(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.ptwhStation(station).then((d) => { setInfo(d); setLeft(d.seconds_left); setError(null); }).catch((e) => setError(e.message));
  }, [station]);
  useEffect(() => { setInfo(null); load(); }, [load]);

  // The code changes on the hour: count down and fetch the next one the moment this one runs out.
  useEffect(() => {
    if (!info) return undefined;
    const t = setInterval(() => setLeft((s) => (s <= 1 ? (load(), 0) : s - 1)), 1000);
    return () => clearInterval(t);
  }, [info, load]);

  useEffect(() => {
    if (!info?.url) { setImg(null); return; }
    QRCode.toDataURL(info.url, { width: 360, margin: 1, errorCorrectionLevel: "M" }).then(setImg).catch(() => setImg(null));
  }, [info?.url]);

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-red-700 ring-1 ring-slate-200">{error}</div>;
  if (!info) return <Skeleton rows={4} />;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h3 className="font-display text-sm font-semibold text-ink">Station QR code · {station}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-6">
        {img ? (
          <img src={img} alt="QR code to clock in at this station" className="h-[260px] w-[260px] rounded-lg ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-[260px] w-[260px] items-center justify-center rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500 ring-1 ring-slate-200">
            {info.url ? "Making the code…" : "The PTWH app address isn't set yet, so there is nothing to scan. Ask the app owner to set PTWH_APP_URL."}
          </div>
        )}
        <div className="space-y-2 text-sm text-slate-600">
          <p>Keep this page open on a screen at the station. A PTWH scans it with their phone camera, which opens the PTWH app.</p>
          <p>
            Changes in <strong className="tabular-nums text-ink">{mm}:{ss}</strong> (every hour, on the hour). Code now: <span className="font-mono text-ink">{info.code}</span>
          </p>
          {info.url && <p className="max-w-md break-all text-xs text-slate-400">{info.url}</p>}
        </div>
      </div>
    </div>
  );
}

function GeoCard({ station }) {
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ lat: "", lng: "", radius_m: 50 });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.ptwhStation(station).then((d) => {
      setInfo(d);
      setForm(d.geo ? { lat: d.geo.lat, lng: d.geo.lng, radius_m: d.geo.radius_m } : { lat: "", lng: "", radius_m: d.default_radius_m });
    }).catch((e) => setMsg({ bad: true, text: e.message }));
  }, [station]);

  const useHere = () => {
    if (!navigator.geolocation) return setMsg({ bad: true, text: "This device can't give its location" });
    setMsg({ text: "Getting your location…" });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setForm((f) => ({ ...f, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }));
        setMsg({ text: `Got it (accurate to about ${Math.round(p.coords.accuracy)} m). Press Save.` });
      },
      (e) => setMsg({ bad: true, text: e.code === 1 ? "Location is blocked for this page -- allow it in the browser" : "Couldn't get a location -- try again outside" }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.ptwhStationGeo(station, { lat: Number(form.lat), lng: Number(form.lng), radius_m: Number(form.radius_m) });
      setMsg({ text: "Saved" });
    } catch (e) {
      setMsg({ bad: true, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <Skeleton rows={3} />;
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h3 className="font-display text-sm font-semibold text-ink">Station location · {station}</h3>
      <p className="mt-1 text-xs text-slate-500">
        A PTWH can clock in or out by location when their phone is within the radius below. Stand at the station (the warehouse door is best) and use this device's location.
        {!info.geo && <strong className="text-amber-700"> Not set yet -- until it is, PTWH can only clock in with the QR code.</strong>}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Latitude"><input className={`${inputCls} w-36`} value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} inputMode="decimal" /></Field>
        <Field label="Longitude"><input className={`${inputCls} w-36`} value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} inputMode="decimal" /></Field>
        <Field label="Radius (metres)"><input type="number" min="20" max="200" className={`${inputCls} w-24`} value={form.radius_m} onChange={(e) => setForm({ ...form, radius_m: e.target.value })} /></Field>
        <button onClick={useHere} className={`${btnCls} border border-slate-300 text-slate-700`}>Use this device's location</button>
        <button disabled={busy || !form.lat || !form.lng} onClick={save} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Save</button>
        {info.geo && <a className="pb-2 text-xs text-slate-500 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${info.geo.lat},${info.geo.lng}`}>See on map</a>}
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.bad ? "text-red-600" : "text-slate-500"}`}>{msg.text}</p>}
    </div>
  );
}

export default function StationView({ setError }) {
  const [data, setData] = useState(null);
  const [station, setStation] = useState("");

  useEffect(() => {
    api.ptwhWorkers().then((d) => { setData(d); setStation((s) => s || d.stations[0] || ""); }).catch((e) => setError(e.message));
  }, [setError]);

  if (!data) return <Skeleton rows={4} />;
  if (!data.can_edit) return <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">The station QR code and location are set up by station and region staff and managers.</div>;
  if (!data.stations.length) return <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">No station in your scope.</div>;
  return (
    <div className="space-y-3">
      {data.stations.length > 1 && (
        <Field label="Station">
          <select className={inputCls} value={station} onChange={(e) => setStation(e.target.value)}>
            {data.stations.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      )}
      {station && <QrCard station={station} />}
      {station && <GeoCard station={station} />}
    </div>
  );
}
