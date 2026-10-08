import { useMemo, useState } from "react";
// Small pieces the PTWH attendance screens share (modal, labelled field, button / input classes).

export const inputCls = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";
export const btnCls = "min-h-[36px] rounded-md px-3 py-1.5 text-sm font-semibold";

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`max-h-[90vh] w-full ${wide ? "max-w-3xl" : "max-w-md"} overflow-y-auto rounded-xl bg-white p-5 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-ink" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <div className="mt-1 text-sm font-normal text-ink">{children}</div>
    </label>
  );
}

export const hhmm = (iso) => (iso ? iso.slice(11, 16) : "");

// Local calendar day / month (yyyy-mm-dd, yyyy-mm). Not toISOString(): that is UTC, which is yesterday for the first 8 hours of a Malaysian day --
// exactly when PTWH are clocking in.
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const localMonth = (d = new Date()) => localDay(d).slice(0, 7);

// Region -> Zone -> Station filter for a table of rows that carry region / zone / station. Each box only offers what the one before it allows and a box only appears when
// there is more than one choice, so a station user (one station) sees none and a Region Head / Manager can narrow down. Returns the filtered rows and the boxes to render.
export function useScopeFilter(all) {
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [station, setStation] = useState("");
  const regions = useMemo(() => [...new Set(all.map((w) => w.region).filter(Boolean))].sort(), [all]);
  const zones = useMemo(() => [...new Set(all.filter((w) => !region || w.region === region).map((w) => w.zone).filter(Boolean))].sort(), [all, region]);
  const stations = useMemo(() => [...new Set(all.filter((w) => (!region || w.region === region) && (!zone || w.zone === zone)).map((w) => w.station))].sort(), [all, region, zone]);
  const rows = useMemo(() => all.filter((w) => (!region || w.region === region) && (!zone || w.zone === zone) && (!station || w.station === station)), [all, region, zone, station]);
  const sel = (value, set, options, label, reset = []) => (
    <select className={inputCls} value={value} onChange={(e) => { set(e.target.value); reset.forEach((f) => f("")); }}>
      <option value="">{label}</option>
      {options.map((x) => <option key={x}>{x}</option>)}
    </select>
  );
  const controls = (
    <>
      {regions.length > 1 && <Field label="Region">{sel(region, setRegion, regions, "All regions", [setZone, setStation])}</Field>}
      {zones.length > 1 && <Field label="Zone">{sel(zone, setZone, zones, "All zones", [setStation])}</Field>}
      {stations.length > 1 && <Field label="Station">{sel(station, setStation, stations, "All stations")}</Field>}
    </>
  );
  return { rows, controls };
}
