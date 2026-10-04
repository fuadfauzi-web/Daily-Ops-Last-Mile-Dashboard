import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import { btnCls, Field, inputCls } from "./ui";

// Attendance -> PTWH -> Station: what the PTWH app checks at this station.
//   * LOCATION is how PTWH normally clock in: their phone must be within 100 m of the station. The station's position is its latitude / longitude in
//     Fleet Admin -> Premises -- the same for every station, and not editable here (station users can't move it or change the 100 m).
//   * the QR code is an EMERGENCY fallback for a PTWH whose phone location isn't working. It is NOT shown until a station asks for one, and it is made for ONE named PTWH:
//     it lasts 10 minutes, works once (a clock-out needs a fresh one), and asking for another replaces the last. The PTWH must give a reason, and every QR clock goes to
//     Audit as "needs review" with the day's pay held.

function QrRequest({ station, info }) {
  const [workerId, setWorkerId] = useState("");
  const [issued, setIssued] = useState(null);
  const [img, setImg] = useState(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setIssued(null); setImg(null); setWorkerId(""); setError(null); }, [station]);
  // Count down; when the 10 minutes are up the code is gone (the PTWH's phone would be refused anyway).
  useEffect(() => {
    if (!issued) return undefined;
    const t = setInterval(() => setLeft((s) => (s <= 1 ? (setIssued(null), setImg(null), 0) : s - 1)), 1000);
    return () => clearInterval(t);
  }, [issued]);
  useEffect(() => {
    if (!issued?.url) { setImg(null); return; }
    QRCode.toDataURL(issued.url, { width: 360, margin: 1, errorCorrectionLevel: "M" }).then(setImg).catch(() => setImg(null));
  }, [issued?.url]);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.ptwhQr(station, Number(workerId));
      setIssued(r);
      setLeft(r.expires_in);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">Emergency QR code · {station}</h3>
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Emergency only</span>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        PTWH clock in by <strong>location</strong>. Ask for a QR code only when that PTWH's phone location doesn't work. It is made for <strong>that one person</strong>, lasts <strong>{info.qr_ttl_min} minutes</strong>, works <strong>once</strong>{" "}
        (clocking out needs a new one), and asking for another replaces the last. They must give a reason, and the clock goes to Audit as <strong>needs review</strong> with the day's pay on hold.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Make a QR code for">
          <select className={`${inputCls} min-w-[240px]`} value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
            <option value="">Choose the PTWH…</option>
            {info.workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <button disabled={!workerId || busy} onClick={request} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>{busy ? "Making…" : issued ? "Make a new one" : "Request QR code"}</button>
        {info.workers.length === 0 && <span className="pb-2 text-xs text-slate-500">No PTWH can work at this station right now.</span>}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {issued && (
        <div className="mt-4 flex flex-wrap items-center gap-6 rounded-lg bg-slate-50 p-4">
          {img ? (
            <img src={img} alt={`QR code for ${issued.worker.name}`} className="h-[240px] w-[240px] rounded-lg bg-white ring-1 ring-slate-200" />
          ) : (
            <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg bg-white p-4 text-center text-xs text-slate-500 ring-1 ring-slate-200">
              {issued.url ? "Making the code…" : "The PTWH app address isn't set yet, so there is nothing to scan. Ask the app owner to set PTWH_APP_URL. The code to type is below."}
            </div>
          )}
          <div className="max-w-md space-y-2 text-sm text-slate-600">
            <p>For <strong className="text-ink">{issued.worker.name}</strong> only. Valid for <strong className="tabular-nums text-ink">{mm}:{ss}</strong> more, and once.</p>
            <p>They scan it in the PTWH app, or type this code: <span className="select-all rounded bg-white px-2 py-0.5 font-mono text-ink ring-1 ring-slate-200">{issued.code}</span></p>
            {issued.url && <p className="break-all text-xs text-slate-400">{issued.url}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationCard({ info }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h3 className="font-display text-sm font-semibold text-ink">Station location · {info.station}</h3>
      {info.geo ? (
        <p className="mt-1 text-sm text-slate-600">
          A PTWH can clock in or out when their phone is within <strong>{info.geo.radius_m} m</strong> of{" "}
          <span className="tabular-nums">{info.geo.lat}, {info.geo.lng}</span>{" "}
          <a className="text-xs underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${info.geo.lat},${info.geo.lng}`}>see on map</a>.
          This comes from Fleet Admin → Premises; it is the same {info.geo.radius_m} m for every station and can't be changed here. Wrong spot? Ask the Fleet Admin team to correct it in Premises.
        </p>
      ) : (
        <p className="mt-1 text-sm text-amber-700">
          This station has no latitude / longitude in Fleet Admin → Premises yet, so PTWH here can't clock in by location (only by an emergency QR code). Ask the Fleet Admin team to add it.
        </p>
      )}
    </div>
  );
}

export default function StationView({ setError }) {
  const [data, setData] = useState(null);
  const [station, setStation] = useState("");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.ptwhWorkers().then((d) => { setData(d); setStation((s) => s || d.stations[0] || ""); }).catch((e) => setError(e.message));
  }, [setError]);
  useEffect(() => {
    if (!station) return;
    setInfo(null);
    api.ptwhStation(station).then(setInfo).catch((e) => setError(e.message));
  }, [station, setError]);

  if (!data) return <Skeleton rows={4} />;
  if (!data.can_edit) return <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">The station location and emergency QR codes are handled by station and region staff and managers.</div>;
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
      {!info ? <Skeleton rows={3} /> : (
        <>
          <LocationCard info={info} />
          <QrRequest station={station} info={info} />
        </>
      )}
    </div>
  );
}
