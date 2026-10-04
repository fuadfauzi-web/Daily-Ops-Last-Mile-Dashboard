import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import PremisesImport from "./PremisesImport";

// Fleet Admin -> Premises (2026-10-02, staging): one record per station -- address, size, launch date, business licence and tenancy dates, rent, deposit and
// document links. The Fleet Admin team keeps it here instead of the 'Address' tab of the Fleet Management sheet. The days left on the licence and tenancy are
// worked out from the dates; the chips on top filter to what needs attention first.
const EDIT_FIELDS = ["station_code", "address", "latitude", "longitude", "sqft", "launched_date", "license_expiry", "license_doc_url", "tenancy_end", "rental", "deposit", "chat_url", "contract_ref", "remarks"];
const SOON = 90;

const money = (n) => (n == null ? "" : Number(n).toLocaleString("en-MY", { maximumFractionDigits: 2 }));
const dmy = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

function DaysBadge({ date, days }) {
  if (!date) return <span className="text-xs text-slate-300">not set</span>;
  const tone = days < 0 ? "bg-red-100 text-status-critical" : days <= 30 ? "bg-red-50 text-status-critical" : days <= SOON ? "bg-amber-100 text-amber-800" : "text-slate-400";
  const text = days < 0 ? `expired ${-days}d ago` : days === 0 ? "today" : `${days}d left`;
  return (
    <div className="whitespace-nowrap">
      <div>{dmy(date)}</div>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{text}</span>
    </div>
  );
}

const urlLabel = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
};

function Field({ label, children, wide }) {
  return (
    <label className={`block text-xs font-medium text-slate-500 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      {label}
      <div className="mt-0.5 font-normal text-ink">{children}</div>
    </label>
  );
}

const input = "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm";

function EditForm({ p, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    ...Object.fromEntries(EDIT_FIELDS.map((k) => [k, p[k] == null ? "" : String(p[k])])),
    tenancy_doc_urls: (p.tenancy_doc_urls || []).join("\n"),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.premises.save(p.station, f); // "" clears a field
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
        <div>
          <div className="text-sm font-semibold text-ink">{p.station}</div>
          <div className="text-xs text-slate-400">{p.zone} · {p.region}{p.updated_by ? ` · last saved ${p.updated_at || ""} by ${p.updated_by}` : ""}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Cancel</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Address" wide><textarea rows={2} className={input} value={f.address} onChange={set("address")} /></Field>
        <Field label="Station ID"><input className={input} value={f.station_code} onChange={set("station_code")} /></Field>
        <Field label="Latitude"><input className={input} value={f.latitude} onChange={set("latitude")} inputMode="decimal" /></Field>
        <Field label="Longitude"><input className={input} value={f.longitude} onChange={set("longitude")} inputMode="decimal" /></Field>
        <Field label="Size (sqft)"><input className={input} value={f.sqft} onChange={set("sqft")} inputMode="decimal" /></Field>
        <Field label="Launched"><input type="date" className={input} value={f.launched_date} onChange={set("launched_date")} /></Field>
        <Field label="Business licence expires"><input type="date" className={input} value={f.license_expiry} onChange={set("license_expiry")} /></Field>
        <Field label="Licence document (link)"><input className={input} value={f.license_doc_url} onChange={set("license_doc_url")} placeholder="https://…" /></Field>
        <Field label="Tenancy ends"><input type="date" className={input} value={f.tenancy_end} onChange={set("tenancy_end")} /></Field>
        <Field label="Rental (RM / month)"><input className={input} value={f.rental} onChange={set("rental")} inputMode="decimal" /></Field>
        <Field label="Deposit (RM)"><input className={input} value={f.deposit} onChange={set("deposit")} inputMode="decimal" /></Field>
        <Field label="Tenancy documents (one link per line)" wide>
          <textarea rows={2} className={`${input} font-mono text-xs`} value={f.tenancy_doc_urls} onChange={set("tenancy_doc_urls")} placeholder="https://…" />
        </Field>
        <Field label="Google Chat space (link)"><input className={input} value={f.chat_url} onChange={set("chat_url")} placeholder="https://chat.google.com/…" /></Field>
        <Field label="Contract lodgement no."><input className={input} value={f.contract_ref} onChange={set("contract_ref")} /></Field>
        <Field label="Remarks" wide><textarea rows={2} className={input} value={f.remarks} onChange={set("remarks")} /></Field>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        {error && <span className="text-sm text-status-critical">{error}</span>}
      </div>
    </form>
  );
}

export default function PremisesTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [chip, setChip] = useState("all");
  const [sort, setSort] = useState("station");
  const [editing, setEditing] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const load = () => api.premises.list().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const all = data?.premises || [];
  const canEdit = !!data?.can_edit;
  const regions = useMemo(() => [...new Set(all.map((p) => p.region))].filter(Boolean).sort(), [all]);
  const zones = useMemo(() => [...new Set(all.filter((p) => region === "all" || p.region === region).map((p) => p.zone))].filter(Boolean).sort(), [all, region]);

  const chips = useMemo(() => {
    const n = (fn) => all.filter(fn).length;
    return [
      { key: "all", label: "All stations", n: all.length, fn: () => true },
      { key: "lic_expired", label: "Licence expired", n: n((p) => p.license_days != null && p.license_days < 0), fn: (p) => p.license_days != null && p.license_days < 0, tone: "text-status-critical" },
      { key: "lic_soon", label: `Licence ≤ ${SOON} days`, n: n((p) => p.license_days != null && p.license_days >= 0 && p.license_days <= SOON), fn: (p) => p.license_days != null && p.license_days >= 0 && p.license_days <= SOON, tone: "text-amber-700" },
      { key: "ten_expired", label: "Tenancy ended", n: n((p) => p.tenancy_days != null && p.tenancy_days < 0), fn: (p) => p.tenancy_days != null && p.tenancy_days < 0, tone: "text-status-critical" },
      { key: "ten_soon", label: `Tenancy ≤ ${SOON} days`, n: n((p) => p.tenancy_days != null && p.tenancy_days >= 0 && p.tenancy_days <= SOON), fn: (p) => p.tenancy_days != null && p.tenancy_days >= 0 && p.tenancy_days <= SOON, tone: "text-amber-700" },
      { key: "missing", label: "Dates missing", n: n((p) => !p.license_expiry || !p.tenancy_end), fn: (p) => !p.license_expiry || !p.tenancy_end, tone: "text-slate-600" },
    ];
  }, [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fn = chips.find((c) => c.key === chip)?.fn || (() => true);
    const out = all
      .filter((p) => (region === "all" || p.region === region) && (zone === "all" || p.zone === zone) && fn(p))
      .filter((p) => !q || [p.station, p.zone, p.region, p.address, p.station_code, p.remarks, p.contract_ref].join(" ").toLowerCase().includes(q));
    const days = (k) => (p) => (p[k] == null ? 1e9 : p[k]);
    const by = { station: (p) => p.station, license: days("license_days"), tenancy: days("tenancy_days"), rental: (p) => -(p.rental || 0) };
    return [...out].sort((a, b) => { const x = by[sort](a), y = by[sort](b); return x < y ? -1 : x > y ? 1 : a.station.localeCompare(b.station); });
  }, [all, chips, chip, region, zone, search, sort]);

  if (error) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>;
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>;

  const editRow = editing && all.find((p) => p.station === editing);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Where each station is, how big it is, and when its business licence and tenancy run out. Rent and deposit are visible to HQ staff and above.
        {canEdit ? " Click a row's Edit to change it, or paste rows from the sheet." : " Only the Fleet Admin team can edit."}
      </p>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c.key} onClick={() => setChip(c.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${chip === c.key ? "border-ink bg-ink text-white" : `border-slate-200 bg-white ${c.tone || "text-slate-600"}`}`}>
            {c.label} <span className="ml-1 font-semibold">{c.n}</span>
          </button>
        ))}
      </div>

      {canEdit && !editRow && (
        <div>
          <button onClick={() => setShowImport((v) => !v)} className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700">Paste from sheet</button>
        </div>
      )}
      {canEdit && showImport && !editRow && <PremisesImport stations={all} onClose={() => setShowImport(false)} onDone={load} />}
      {editRow && <EditForm key={editRow.station} p={editRow} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a station, address, ID, remark…" className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
        <select value={region} onChange={(e) => { setRegion(e.target.value); setZone("all"); }} aria-label="Region" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
          <option value="all">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Zone" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
          <option value="all">All zones</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
          <option value="station">Sort: station A-Z</option>
          <option value="license">Sort: licence expiry (soonest first)</option>
          <option value="tenancy">Sort: tenancy end (soonest first)</option>
          <option value="rental">Sort: rent (highest first)</option>
        </select>
        <span className="text-xs text-slate-400">{rows.length} of {all.length} stations</span>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
            <tr>
              <th className="px-3 py-2 font-medium">Station</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 text-right font-medium">Sqft</th>
              <th className="px-3 py-2 font-medium">Launched</th>
              <th className="px-3 py-2 font-medium">Business licence</th>
              <th className="px-3 py-2 font-medium">Tenancy ends</th>
              <th className="px-3 py-2 text-right font-medium">Rent (RM)</th>
              <th className="px-3 py-2 text-right font-medium">Deposit (RM)</th>
              <th className="px-3 py-2 font-medium">Links</th>
              <th className="px-3 py-2 font-medium">Remarks</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.station} className={`border-t border-slate-100 align-top ${editing === p.station ? "bg-blue-50/50" : ""}`}>
                <td className="px-3 py-1.5">
                  <div className="font-medium text-ink">{p.station}</div>
                  <div className="text-[11px] text-slate-400">{p.zone}{p.station_code ? ` · ${p.station_code}` : ""}</div>
                </td>
                <td className="max-w-[260px] px-3 py-1.5 text-xs text-slate-500">
                  <div className="line-clamp-2" title={p.address}>{p.address}</div>
                  {p.latitude != null && p.longitude != null && (
                    <a className="text-brand hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}>map</a>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{p.sqft != null ? Number(p.sqft).toLocaleString("en-MY") : ""}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{dmy(p.launched_date)}</td>
                <td className="px-3 py-1.5"><DaysBadge date={p.license_expiry} days={p.license_days} /></td>
                <td className="px-3 py-1.5"><DaysBadge date={p.tenancy_end} days={p.tenancy_days} /></td>
                <td className="px-3 py-1.5 text-right tabular-nums">{money(p.rental)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{money(p.deposit)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-xs">
                  {[
                    p.license_doc_url && ["Licence", p.license_doc_url],
                    ...(p.tenancy_doc_urls || []).map((u, i) => [`Tenancy${p.tenancy_doc_urls.length > 1 ? ` ${i + 1}` : ""}`, u]),
                    p.chat_url && ["Chat", p.chat_url],
                  ].filter(Boolean).map(([label, url]) => (
                    <a key={label + url} className="mr-2 text-brand hover:underline" target="_blank" rel="noopener noreferrer" href={url} title={urlLabel(url)}>{label}</a>
                  ))}
                </td>
                <td className="max-w-[220px] px-3 py-1.5 text-xs text-slate-500"><div className="line-clamp-2" title={p.remarks}>{p.remarks}</div></td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                  {canEdit && <button onClick={() => { setEditing(p.station); setShowImport(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs text-brand hover:underline">Edit</button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-400">No station matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
