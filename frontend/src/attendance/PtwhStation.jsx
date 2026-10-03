import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import { Field, inputCls } from "./ui";

// Attendance -> PTWH -> Station: what the PTWH app checks at this station.
//   * LOCATION is how PTWH normally clock in: their phone must be within 100 m of the station. The station's position is its latitude / longitude in
//     Fleet Admin -> Premises -- the same for every station, and not editable here (station users can't move it or change the 100 m).
//   * the QR code for THIS hour (it changes on the hour) is an EMERGENCY fallback for when a phone's location isn't working. PTWH are told to avoid it: they
//     must give a reason and every QR clock goes to Audit as "needs review". Keep this page open on a screen at the station for those cases.

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
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">Station QR code · {station}</h3>
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Emergency only</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-6">
        {img ? (
          <img src={img} alt="QR code for an emergency clock in at this station" className="h-[260px] w-[260px] rounded-lg ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-[260px] w-[260px] items-center justify-center rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500 ring-1 ring-slate-200">
            {info.url ? "Making the code…" : "The PTWH app address isn't set yet, so there is nothing to scan. Ask the app owner to set PTWH_APP_URL."}
          </div>
        )}
        <div className="max-w-md space-y-2 text-sm text-slate-600">
          <p>
            PTWH clock in by <strong>location</strong>. Use this code only when a PTWH's phone location doesn't work: they scan it in the PTWH app (or type the code), must give a reason,
            and <strong>every QR clock goes to Audit as "needs review"</strong>.
          </p>
          <p>
            Changes in <strong className="tabular-nums text-ink">{mm}:{ss}</strong> (every hour, on the hour). Code now: <span className="font-mono text-ink">{info.code}</span>
          </p>
          {info.url && <p className="break-all text-xs text-slate-400">{info.url}</p>}
        </div>
      </div>
    </div>
  );
}

function LocationCard({ station }) {
  const [info, setInfo] = useState(null);
  useEffect(() => { setInfo(null); api.ptwhStation(station).then(setInfo).catch(() => setInfo({ geo: null })); }, [station]);
  if (!info) return <Skeleton rows={2} />;
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h3 className="font-display text-sm font-semibold text-ink">Station location · {station}</h3>
      {info.geo ? (
        <p className="mt-1 text-sm text-slate-600">
          A PTWH can clock in or out when their phone is within <strong>{info.geo.radius_m} m</strong> of{" "}
          <span className="tabular-nums">{info.geo.lat}, {info.geo.lng}</span>{" "}
          <a className="text-xs underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${info.geo.lat},${info.geo.lng}`}>see on map</a>.
          This comes from Fleet Admin → Premises; it is the same {info.geo.radius_m} m for every station and can't be changed here. Wrong spot? Ask the Fleet Admin team to correct it in Premises.
        </p>
      ) : (
        <p className="mt-1 text-sm text-amber-700">
          This station has no latitude / longitude in Fleet Admin → Premises yet, so PTWH here can't clock in by location (only by the emergency QR code). Ask the Fleet Admin team to add it.
        </p>
      )}
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
  if (!data.can_edit) return <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">The station QR code is shown by station and region staff and managers.</div>;
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
      {station && <LocationCard station={station} />}
      {station && <QrCard station={station} />}
    </div>
  );
}
