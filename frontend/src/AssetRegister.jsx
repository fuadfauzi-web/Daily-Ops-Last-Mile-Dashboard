import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { parseRegisterPaste } from "./lib/assetListsImport";

// Fleet Admin -> Assets -> Fire extinguisher / Weighing scale (2026-10-04, staging, Beta): a register of dated records per station. One component, two configs. The chips
// on top (expired, due within 90 days, no date) are what the Fleet Admin team acts on; only the Fleet Admin role edits, everyone with access reads.
const SOON = 90;
export const REGISTERS = {
  "fire-extinguisher": {
    label: "Fire extinguisher",
    blurb: "Every station's fire extinguishers: how many, their serial numbers and when they expire.",
    dateLabel: "Expires",
    columns: [["has_fe", "Has FE", "bool"], ["quantity", "Qty", "num"], ["serial_numbers", "Serial numbers", "text"], ["vendor", "Vendor", "text"], ["pic_name", "PIC", "text"], ["pic_phone", "Phone", "text"], ["remarks", "Remarks", "text"]],
    form: [["has_fe", "Station has fire extinguishers", "bool"], ["quantity", "Quantity", "num"], ["expiry_date", "Expiry date", "date"], ["serial_numbers", "Serial numbers", "text", true], ["vendor", "Vendor", "text"], ["pic_name", "PIC name", "text"], ["pic_phone", "PIC phone", "text"], ["remarks", "Remarks", "text", true]],
    heading: "Station, Hub ID, PIC, Phone No, Fire Extinguisher, Qty, Expiry Date, the serial / cert numbers, Remarks",
  },
  "weighing-scale": {
    label: "Weighing scale",
    blurb: "Every station's weighing scales: calibration dates, certificate and serial numbers, and when the calibration expires.",
    dateLabel: "Calibration expires",
    columns: [["manufacturer", "Manufacturer", "text"], ["last_calibrated", "Last calibrated", "date"], ["reference_no", "Reference no.", "text"], ["serial_no", "Serial no.", "text"], ["cable", "Cable", "text"], ["calibrated_by", "Calibrated by", "text"], ["certificate", "Certificate", "text"], ["remarks", "Remarks", "text"]],
    form: [["manufacturer", "Manufacturer", "text"], ["last_calibrated", "Last calibrated", "date"], ["expiry_date", "Calibration expires", "date"], ["reference_no", "Reference number", "text"], ["serial_no", "Serial number", "text"], ["cable", "Cable (YES / NO)", "text"], ["calibrated_by", "Calibrated by", "text"], ["borang_d", "Borang D (file / link)", "text"], ["certificate", "Certificate (file / link)", "text"], ["remarks", "Remarks", "text", true]],
    heading: "Station Name, Manufacturer, Last Calibrated Date, Expiration Date, Reference Number, Serial No, Cable, Calibrated By, Borang D, Certificate, Remarks",
  },
};
const dmy = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const input = "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm";

function Badge({ date, days }) {
  if (!date) return <span className="text-xs text-slate-300">not set</span>;
  const tone = days < 0 ? "bg-red-100 text-status-critical" : days <= 30 ? "bg-red-50 text-status-critical" : days <= SOON ? "bg-amber-100 text-amber-800" : "text-slate-400";
  return (
    <div className="whitespace-nowrap">
      <div>{dmy(date)}</div>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{days < 0 ? `expired ${-days}d ago` : days === 0 ? "today" : `${days}d left`}</span>
    </div>
  );
}

function Cell({ kind, v, type }) {
  if (type === "bool") return <span className={v ? "text-slate-600" : "font-medium text-slate-400"}>{v ? "Yes" : "No"}</span>;
  if (type === "date") return <span className="whitespace-nowrap">{dmy(v)}</span>;
  if (type === "num") return <span className="tabular-nums">{v ?? ""}</span>;
  return <div className="line-clamp-2 max-w-[260px] text-xs text-slate-600" title={v}>{v}</div>;
}

function EditForm({ kind, cfg, rec, stations, onClose, onSaved }) {
  const adding = !rec;
  const [station, setStation] = useState(rec?.station || "");
  const [f, setF] = useState(() => Object.fromEntries(cfg.form.map(([k, , t]) => [k, rec ? (t === "bool" ? !!rec[k] : rec[k] == null ? "" : String(rec[k])) : t === "bool" ? true : ""])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!station) throw new Error("Pick the station");
      const body = { station, ...f };
      if (adding) await api.assetLists.create(kind, body);
      else await api.assetLists.update(kind, rec.id, body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-ink">{adding ? `Add a ${cfg.label.toLowerCase()} record` : `${cfg.label}: ${rec.station}`}</div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Cancel</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-medium text-slate-500">Station
          <select className={`${input} mt-0.5 font-normal text-ink`} value={station} onChange={(e) => setStation(e.target.value)}>
            <option value="">Pick a station…</option>
            {stations.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.zone})</option>)}
          </select>
        </label>
        {cfg.form.map(([k, label, type, wide]) => (
          <label key={k} className={`block text-xs font-medium text-slate-500 ${wide ? "sm:col-span-2" : ""}`}>
            {label}
            {type === "bool" ? (
              <div className="mt-1.5"><input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /></div>
            ) : (
              <input type={type === "date" ? "date" : "text"} inputMode={type === "num" ? "numeric" : undefined} className={`${input} mt-0.5 font-normal text-ink`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            )}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : adding ? "Add" : "Save"}</button>
        {!adding && (
          <button type="button" disabled={busy} className="ml-auto text-xs text-status-critical hover:underline" onClick={async () => {
            if (!window.confirm(`Remove this ${cfg.label.toLowerCase()} record for ${rec.station}?`)) return;
            setBusy(true);
            try { await api.assetLists.remove(kind, rec.id); onSaved(); } catch (err) { setError(err.message); setBusy(false); }
          }}>Remove record</button>
        )}
        {error && <span className="text-sm text-status-critical">{error}</span>}
      </div>
    </form>
  );
}

function Import({ kind, cfg, onClose, onDone }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const parsed = useMemo(() => (text.trim() ? parseRegisterPaste(kind, text) : null), [kind, text]);
  const good = (parsed?.rows || []).filter((r) => r.ok);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.assetLists.bulk(kind, { rows: good.map((r) => r.row) }));
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">Paste from the sheet</div>
          <p className="text-xs text-slate-500">Copy the rows with the heading row ({cfg.heading}) and paste them below. A row with the same station and serial number is updated; any other is added. A blank or N/A cell never wipes a value.</p>
        </div>
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button>
      </div>
      {!result && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Paste rows here…" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" />
          {parsed?.problem && <div className="text-xs text-status-critical">{parsed.problem}</div>}
          {parsed && parsed.rows.length > 0 && (
            <>
              <div className="text-xs"><span className="font-medium text-ink">{parsed.rows.length} rows:</span> <span className="text-emerald-700">{good.length} to save</span> · <span className="text-status-critical">{parsed.rows.length - good.length} skipped</span></div>
              <div className="max-h-60 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-2 py-1 font-medium">Row</th><th className="px-2 py-1 font-medium"></th><th className="px-2 py-1 font-medium">Station</th><th className="px-2 py-1 font-medium">What will be saved</th></tr></thead>
                  <tbody>
                    {parsed.rows.map((r) => (
                      <tr key={r.line} className="border-t border-slate-100"><td className="px-2 py-1 text-slate-400">{r.line}</td>
                        <td className="px-2 py-1"><span className={`rounded px-1.5 py-0.5 font-medium ${r.ok ? "bg-sky-100 text-sky-800" : "bg-red-100 text-status-critical"}`}>{r.ok ? "Save" : "Skipped"}</span></td>
                        <td className="px-2 py-1">{r.label}</td><td className={`px-2 py-1 ${r.ok ? "text-slate-500" : "text-status-critical"}`}>{r.ok ? r.summary : r.error}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={run} disabled={busy || good.length === 0} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Importing…" : `Import ${good.length} record${good.length === 1 ? "" : "s"}`}</button>
                {error && <span className="text-sm text-status-critical">{error}</span>}
              </div>
            </>
          )}
        </>
      )}
      {result && (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-ink">Done: {result.added} added, {result.updated} updated{result.errors ? `, ${result.errors} refused` : ""}.</div>
          {result.errors > 0 && <ul className="list-disc pl-5 text-xs text-status-critical">{result.results.filter((x) => x.status === "error").map((x, i) => <li key={i}>{x.station}: {x.detail}</li>)}</ul>}
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button>
        </div>
      )}
    </div>
  );
}

export default function AssetRegister({ kind }) {
  const cfg = REGISTERS[kind];
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [chip, setChip] = useState("all");
  const [editing, setEditing] = useState(null); // record id | "new"
  const [showImport, setShowImport] = useState(false);

  const load = () => api.assetLists.list(kind).then(setData).catch((e) => setError(e.message));
  useEffect(() => { setData(null); setEditing(null); setShowImport(false); setChip("all"); load(); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = data?.items || [];
  const stations = data?.stations || [];
  const regions = useMemo(() => [...new Set(stations.map((s) => s.region))].sort(), [stations]);
  const zones = useMemo(() => [...new Set(stations.filter((s) => region === "all" || s.region === region).map((s) => s.zone))].sort(), [stations, region]);
  const chips = useMemo(() => {
    const defs = [
      ["all", "All records", () => true, ""],
      ["expired", "Expired", (i) => i.expiry_days != null && i.expiry_days < 0, "text-status-critical"],
      ["soon", `Due within ${SOON} days`, (i) => i.expiry_days != null && i.expiry_days >= 0 && i.expiry_days <= SOON, "text-amber-700"],
      ["nodate", "No date", (i) => i.expiry_days == null && (kind !== "fire-extinguisher" || i.has_fe), "text-slate-600"],
    ];
    return defs.map(([key, label, fn, tone]) => ({ key, label, fn, tone, n: items.filter(fn).length }));
  }, [items, kind]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fn = chips.find((c) => c.key === chip)?.fn || (() => true);
    return items.filter((i) => (region === "all" || i.region === region) && (zone === "all" || i.zone === zone) && fn(i)
      && (!q || `${i.station} ${i.zone} ${i.serial_numbers || ""} ${i.serial_no || ""} ${i.reference_no || ""} ${i.pic_name || ""} ${i.remarks || ""}`.toLowerCase().includes(q)));
  }, [items, chips, chip, region, zone, search]);

  if (error) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>;
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>;
  const canEdit = data.can_edit;
  const rec = editing && editing !== "new" ? items.find((i) => i.id === editing) : null;
  const sel = "h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700";

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{cfg.blurb} {canEdit ? "Add, edit or remove records, or paste rows from the sheet." : "Only the Fleet Admin team can edit."} {items.length === 0 ? "Nothing here yet." : ""}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c.key} onClick={() => setChip(c.key)} className={`rounded-full border px-3 py-1 text-xs font-medium ${chip === c.key ? "border-ink bg-ink text-white" : `border-slate-200 bg-white ${c.tone || "text-slate-600"}`}`}>
            {c.label} <span className="ml-1 font-semibold">{c.n}</span>
          </button>
        ))}
      </div>
      {canEdit && !editing && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setEditing("new"); setShowImport(false); }} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white">+ Add a record</button>
          <button onClick={() => setShowImport((v) => !v)} className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700">Paste from sheet</button>
        </div>
      )}
      {canEdit && showImport && !editing && <Import kind={kind} cfg={cfg} onClose={() => setShowImport(false)} onDone={load} />}
      {editing === "new" && <EditForm key="new" kind={kind} cfg={cfg} stations={stations} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {rec && <EditForm key={rec.id} kind={kind} cfg={cfg} rec={rec} stations={stations} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a station, serial number, PIC…" className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
        <select value={region} onChange={(e) => { setRegion(e.target.value); setZone("all"); }} aria-label="Region" className={sel}><option value="all">All regions</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Zone" className={sel}><option value="all">All zones</option>{zones.map((z) => <option key={z} value={z}>{z}</option>)}</select>
        <span className="text-xs text-slate-400">{rows.length} of {items.length} records</span>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
            <tr>
              <th className="px-3 py-2 font-medium">Station</th>
              {cfg.columns.slice(0, kind === "fire-extinguisher" ? 2 : 2).map(([k, l]) => <th key={k} className="px-3 py-2 font-medium">{l}</th>)}
              <th className="px-3 py-2 font-medium">{cfg.dateLabel}</th>
              {cfg.columns.slice(2).map(([k, l]) => <th key={k} className="px-3 py-2 font-medium">{l}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className={`border-t border-slate-100 align-top ${editing === i.id ? "bg-blue-50/50" : ""}`}>
                <td className="px-3 py-1.5"><div className="font-medium text-ink">{i.station}</div><div className="text-[11px] text-slate-400">{i.zone}</div></td>
                {cfg.columns.slice(0, 2).map(([k, , t]) => <td key={k} className="px-3 py-1.5"><Cell kind={kind} v={i[k]} type={t} /></td>)}
                <td className="px-3 py-1.5"><Badge date={i.expiry_date} days={i.expiry_days} /></td>
                {cfg.columns.slice(2).map(([k, , t]) => <td key={k} className="px-3 py-1.5"><Cell kind={kind} v={i[k]} type={t} /></td>)}
                <td className="whitespace-nowrap px-3 py-1.5 text-right">{canEdit && <button onClick={() => { setEditing(i.id); setShowImport(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs text-brand hover:underline">Edit</button>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={cfg.columns.length + 3} className="px-3 py-6 text-center text-sm text-slate-400">No records.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
