import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import VehiclesImport from "./VehiclesImport";

// Fleet Admin -> Vehicles (2026-10-03, staging): the Master Vehicle Inventory, one record per plate -- station, type, owner, driver, licence dates and the fuel / toll
// cards. The Fleet Admin team keeps it here instead of the Google Sheet. Card numbers are hidden (last 4 digits) until "Show card numbers" is switched on.
const SOON = 90;
const FIELDS = [
  "vehicle_function", "state", "station_code", "location_ns", "tms_route", "status", "vehicle_type", "ownership", "driver", "hiring_label", "returned_van",
  "license_doc_url", "gdl_expiry", "license_expiry", "old_fuel_card", "old_fuel_status", "new_fuel_card", "new_fuel_status", "fuel_limit", "petronas_card",
  "fuel_type", "fuel_card_id", "tng_card", "tng_serial", "tng_id", "remarks", "admin_note",
];
const dmy = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const mask = (n, show) => (!n ? "" : show || n.length <= 4 ? n : `••••${n.slice(-4)}`);

function DaysBadge({ date, days }) {
  if (!date) return <span className="text-xs text-slate-300">not set</span>;
  const tone = days < 0 ? "bg-red-100 text-status-critical" : days <= 30 ? "bg-red-50 text-status-critical" : days <= SOON ? "bg-amber-100 text-amber-800" : "text-slate-400";
  return (
    <div className="whitespace-nowrap">
      <div>{dmy(date)}</div>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{days < 0 ? `expired ${-days}d ago` : days === 0 ? "today" : `${days}d left`}</span>
    </div>
  );
}

const input = "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm";
function Field({ label, children, wide }) {
  return (
    <label className={`block text-xs font-medium text-slate-500 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      {label}
      <div className="mt-0.5 font-normal text-ink">{children}</div>
    </label>
  );
}

function EditForm({ v, adding, onClose, onSaved }) {
  const [plate, setPlate] = useState(v?.plate || "");
  const [f, setF] = useState(() => Object.fromEntries(FIELDS.map((k) => [k, v?.[k] == null ? "" : String(v[k])])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const text = (k, label, extra = {}) => <Field label={label} {...extra}><input className={input} value={f[k]} onChange={set(k)} /></Field>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!plate.trim()) throw new Error("Type the plate number");
      await api.vehicles.save(plate.trim(), f); // "" clears a field
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-ink">
          {adding ? "Add a vehicle" : v.plate}
          {!adding && <span className="ml-2 text-xs font-normal text-slate-400">{v.station || v.station_code}{v.updated_by ? ` · last saved ${v.updated_at || ""} by ${v.updated_by}` : ""}</span>}
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Cancel</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {adding && <Field label="Plate number"><input className={input} value={plate} onChange={(e) => setPlate(e.target.value)} /></Field>}
        {text("vehicle_function", "Function (LM / SDD)")}
        {text("state", "State")}
        {text("station_code", "Station code (e.g. AJL)")}
        {text("location_ns", "Location")}
        {text("tms_route", "TMS route")}
        {text("status", "Status (Active / Inactive / Released)")}
        {text("vehicle_type", "Vehicle type")}
        {text("ownership", "Ownership")}
        {text("returned_van", "Returned van")}
        {text("driver", "Driver")}
        {text("hiring_label", "Hiring / replacement label")}
        <Field label="GDL expiry"><input type="date" className={input} value={f.gdl_expiry} onChange={set("gdl_expiry")} /></Field>
        <Field label="Licence expiry"><input type="date" className={input} value={f.license_expiry} onChange={set("license_expiry")} /></Field>
        {text("license_doc_url", "Driver's licence document (link)", { wide: true })}
        {text("fuel_type", "Fuel type")}
        {text("fuel_limit", "Fuel card limit (RM)")}
        {text("fuel_card_id", "Fuel card ID")}
        {text("new_fuel_card", "New fuel card no.")}
        {text("new_fuel_status", "New fuel card status")}
        {text("old_fuel_card", "Old fuel card no.")}
        {text("old_fuel_status", "Old fuel card status")}
        {text("petronas_card", "Fuel card no. (Petronas)")}
        {text("tng_card", "TnG card no.")}
        {text("tng_serial", "TnG serial no.")}
        {text("tng_id", "TnG ID")}
        {text("remarks", "Remarks", { wide: true })}
        {text("admin_note", "Admin note", { wide: true })}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : adding ? "Add vehicle" : "Save"}</button>
        {!adding && (
          <button type="button" disabled={busy} onClick={async () => {
            if (!window.confirm(`Remove ${v.plate} from the vehicle list? Use this when the vehicle has left the fleet.`)) return;
            setBusy(true);
            try { await api.vehicles.remove(v.plate); onSaved(); } catch (err) { setError(err.message); setBusy(false); }
          }} className="ml-auto text-xs text-status-critical hover:underline">Remove vehicle</button>
        )}
        {error && <span className="text-sm text-status-critical">{error}</span>}
      </div>
    </form>
  );
}

export default function VehiclesTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [f, setFilter] = useState({ region: "all", state: "all", status: "all", func: "all", owner: "all" });
  const [chip, setChip] = useState("all");
  const [showCards, setShowCards] = useState(false);
  const [editing, setEditing] = useState(null); // plate, or "new"
  const [showImport, setShowImport] = useState(false);

  const load = () => api.vehicles.list().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const all = data?.vehicles || [];
  const canEdit = !!data?.can_edit;
  const uniq = (k) => [...new Set(all.map((v) => v[k]).filter(Boolean))].sort();
  const chips = useMemo(() => {
    const exp = (k, lo, hi) => (v) => v[k] != null && v[k] >= lo && v[k] <= hi;
    return [
      { key: "all", label: "All vehicles", fn: () => true },
      { key: "lic_expired", label: "Licence expired", fn: exp("license_days", -1e9, -1), tone: "text-status-critical" },
      { key: "lic_soon", label: `Licence ≤ ${SOON} days`, fn: exp("license_days", 0, SOON), tone: "text-amber-700" },
      { key: "gdl_expired", label: "GDL expired", fn: exp("gdl_days", -1e9, -1), tone: "text-status-critical" },
      { key: "gdl_soon", label: `GDL ≤ ${SOON} days`, fn: exp("gdl_days", 0, SOON), tone: "text-amber-700" },
      { key: "no_driver", label: "No driver", fn: (v) => !v.driver, tone: "text-slate-600" },
    ].map((c) => ({ ...c, n: all.filter(c.fn).length }));
  }, [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fn = chips.find((c) => c.key === chip)?.fn || (() => true);
    return all
      .filter((v) => (f.region === "all" || v.region === f.region) && (f.state === "all" || v.state === f.state) && (f.status === "all" || v.status === f.status)
        && (f.func === "all" || v.vehicle_function === f.func) && (f.owner === "all" || v.ownership === f.owner) && fn(v))
      .filter((v) => !q || [v.plate, v.driver, v.station, v.station_code, v.tms_route, v.hiring_label, v.old_fuel_card, v.new_fuel_card, v.petronas_card, v.tng_card, v.fuel_card_id, v.remarks].join(" ").toLowerCase().includes(q));
  }, [all, chips, chip, f, search]);

  if (error) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>;
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>;

  const editRow = editing && editing !== "new" ? all.find((v) => v.plate === editing) : null;
  const select = (key, label, opts) => (
    <select value={f[key]} onChange={(e) => setFilter({ ...f, [key]: e.target.value })} aria-label={label} className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
      <option value="all">{label}</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Every van and truck: where it is based, who drives it, when the driver's GDL and licence run out, and its fuel and toll cards. Card numbers show their last 4 digits until you switch on
        <em> Show card numbers</em>. {canEdit ? "Click Edit to change a vehicle, add one, or paste rows from the sheet." : "Only the Fleet Admin team can edit."}
      </p>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c.key} onClick={() => setChip(c.key)} className={`rounded-full border px-3 py-1 text-xs font-medium ${chip === c.key ? "border-ink bg-ink text-white" : `border-slate-200 bg-white ${c.tone || "text-slate-600"}`}`}>
            {c.label} <span className="ml-1 font-semibold">{c.n}</span>
          </button>
        ))}
      </div>

      {canEdit && !editing && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setEditing("new"); setShowImport(false); }} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white">+ Add a vehicle</button>
          <button onClick={() => setShowImport((x) => !x)} className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700">Paste from sheet</button>
        </div>
      )}
      {canEdit && showImport && !editing && <VehiclesImport existing={all.map((v) => v.plate)} onClose={() => setShowImport(false)} onDone={load} />}
      {editing === "new" && <EditForm key="new" adding onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {editRow && <EditForm key={editRow.plate} v={editRow} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a plate, driver, station, route, card…" className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
        {select("region", "All regions", uniq("region"))}
        {select("state", "All states", uniq("state"))}
        {select("status", "All statuses", uniq("status"))}
        {select("func", "LM + SDD", uniq("vehicle_function"))}
        {select("owner", "All owners", uniq("ownership"))}
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <input type="checkbox" checked={showCards} onChange={(e) => setShowCards(e.target.checked)} /> Show card numbers
        </label>
        <span className="text-xs text-slate-400">{rows.length} of {all.length} vehicles</span>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
            <tr>
              <th className="px-3 py-2 font-medium">Plate</th>
              <th className="px-3 py-2 font-medium">Station</th>
              <th className="px-3 py-2 font-medium">Vehicle</th>
              <th className="px-3 py-2 font-medium">Driver</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">GDL</th>
              <th className="px-3 py-2 font-medium">Licence</th>
              <th className="px-3 py-2 font-medium">Fuel</th>
              <th className="px-3 py-2 font-medium">Cards</th>
              <th className="px-3 py-2 font-medium">Remarks</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.plate} className={`border-t border-slate-100 align-top ${editing === v.plate ? "bg-blue-50/50" : ""}`}>
                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-ink">{v.plate}<div className="text-[11px] font-normal text-slate-400">{v.vehicle_function}</div></td>
                <td className="px-3 py-1.5">
                  <div>{v.station || v.station_code}</div>
                  <div className="text-[11px] text-slate-400">{v.zone || v.state}{v.tms_route ? ` · ${v.tms_route}` : ""}</div>
                </td>
                <td className="px-3 py-1.5 text-xs"><div>{v.vehicle_type}</div><div className="text-slate-400">{v.ownership}</div></td>
                <td className="px-3 py-1.5 text-xs">
                  <div>{v.driver || <span className="text-status-critical">none</span>}</div>
                  {v.license_doc_url && <a className="text-brand hover:underline" target="_blank" rel="noopener noreferrer" href={v.license_doc_url}>licence file</a>}
                </td>
                <td className="px-3 py-1.5 text-xs">{v.status}</td>
                <td className="px-3 py-1.5"><DaysBadge date={v.gdl_expiry} days={v.gdl_days} /></td>
                <td className="px-3 py-1.5"><DaysBadge date={v.license_expiry} days={v.license_days} /></td>
                <td className="px-3 py-1.5 text-xs">
                  <div>{v.fuel_type}{v.fuel_limit != null ? ` · RM${v.fuel_limit}` : ""}</div>
                  <div className="text-slate-400">{v.new_fuel_status}{v.fuel_card_id ? ` · ${v.fuel_card_id}` : ""}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-slate-500">
                  {v.new_fuel_card && <div title="New fuel card">New {mask(v.new_fuel_card, showCards)}</div>}
                  {v.old_fuel_card && <div title={`Old fuel card${v.old_fuel_status ? ` (${v.old_fuel_status})` : ""}`}>Old {mask(v.old_fuel_card, showCards)}{v.old_fuel_status ? ` · ${v.old_fuel_status}` : ""}</div>}
                  {v.petronas_card && <div title="Petronas">PTN {mask(v.petronas_card, showCards)}</div>}
                  {v.tng_card && <div title={`TnG ${v.tng_id || ""} ${v.tng_serial || ""}`}>TnG {mask(v.tng_card, showCards)}{v.tng_id ? ` · ${v.tng_id}` : ""}</div>}
                </td>
                <td className="max-w-[200px] px-3 py-1.5 text-xs text-slate-500"><div className="line-clamp-2" title={`${v.remarks} ${v.admin_note}`}>{[v.remarks, v.admin_note].filter(Boolean).join(" · ")}</div></td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                  {canEdit && <button onClick={() => { setEditing(v.plate); setShowImport(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs text-brand hover:underline">Edit</button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-400">No vehicle matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
