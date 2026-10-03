import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { parseInventoryPaste } from "./lib/assetsImport";

// Fleet Admin -> Assets (2026-10-03, staging): all the Fleet Admin team's asset lists in one tab, by category. The first category is STATION INVENTORY: for every
// station, each item it should have, how many are good and how many damaged. Fire extinguisher renewals, weighing scales and the rest follow as more categories.
const CATEGORIES = [{ key: "inventory", label: "Station inventory", Component: StationInventory }];

export default function AssetsTab() {
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const Active = CATEGORIES.find((c) => c.key === category)?.Component;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Category</span>
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCategory(c.key)} className={`rounded-full border px-3 py-1 text-xs font-medium ${category === c.key ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600"}`}>
            {c.label}
          </button>
        ))}
        <span className="text-xs text-slate-400">More categories (fire extinguishers, weighing scales ...) will be added here.</span>
      </div>
      {Active && <Active />}
    </div>
  );
}

const input = "rounded-lg border border-slate-300 px-2 py-1 text-sm";

function StationDetail({ station, items, groups, standard, canEdit, onClose, onSaved }) {
  const [rows, setRows] = useState(() => items.map((i) => ({ item: i.item, uom: i.uom, good: i.good ?? "", damaged: i.damaged ?? "", remarks: i.remarks || "", group: i.group, orig: JSON.stringify([i.good ?? "", i.damaged ?? "", i.remarks || ""]) })));
  const [newItem, setNewItem] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const groupOf = (name) => standard.find((s) => s.item === name.toUpperCase())?.group || "Other";
  const dirty = rows.filter((r) => r.isNew || r.orig !== JSON.stringify([r.good, r.damaged, r.remarks]));
  const set = (idx, k, v) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [k]: v } : r)));
  const payload = (list) => list.map((r) => ({ item: r.item, uom: r.uom, good: r.good === "" ? null : String(r.good), damaged: r.damaged === "" ? null : String(r.damaged), remarks: r.remarks || null }));

  const run = async (fn, ok) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNotice(ok);
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  const save = () => run(() => api.assets.save(station, { items: payload(dirty) }), "Saved.");
  const startStandard = () => run(() => api.assets.save(station, { items: standard.map((s) => ({ item: s.item, good: "0", damaged: "0" })), replace: true }), "Started from the standard list. Fill in the counts.");
  const addItem = () => {
    const name = newItem.trim().toUpperCase();
    if (!name) return;
    if (rows.some((r) => r.item === name)) return setError(`${name} is already in the list`);
    setError(null);
    setRows((rs) => [...rs, { item: name, uom: "unit", good: "", damaged: "", remarks: "", group: groupOf(name), isNew: true, orig: "" }]);
    setNewItem("");
  };
  const remove = async (r, idx) => {
    if (r.isNew) return setRows((rs) => rs.filter((_, i) => i !== idx));
    if (!window.confirm(`Remove ${r.item} from ${station}'s list?`)) return;
    run(() => api.assets.removeItem(station, r.item), `${r.item} removed.`);
  };
  const parsed = useMemo(() => (paste.trim() ? parseInventoryPaste(paste) : null), [paste]);
  const importPaste = () => run(() => api.assets.save(station, { items: payload(parsed.items), replace: true }), `Replaced ${station}'s list with the ${parsed.items.length} pasted items.`);

  const byGroup = groups.map((g) => [g, rows.map((r, idx) => ({ ...r, idx })).filter((r) => (r.group || "Other") === g)]).filter(([, list]) => list.length);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-ink">{station} <span className="text-xs font-normal text-slate-400">inventory</span></div>
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button>
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {station} has no inventory yet.
          {canEdit && <button onClick={startStandard} disabled={busy} className="ml-2 rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-50">Start with the standard list ({standard.length} items)</button>}
        </div>
      )}

      {byGroup.map(([g, list]) => (
        <div key={g}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</div>
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs text-slate-400"><th className="w-72 py-1 pr-3 font-medium">Item</th><th className="w-24 py-1 pr-3 text-center font-medium">Good</th><th className="w-24 py-1 pr-3 text-center font-medium">Damaged</th><th className="py-1 font-medium">Remarks</th><th /></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.item} className={`border-t border-slate-100 ${r.isNew || r.orig !== JSON.stringify([r.good, r.damaged, r.remarks]) ? "bg-blue-50/40" : ""} ${(+r.damaged || 0) > 0 ? "text-status-critical" : ""}`}>
                  <td className="py-1 pr-3">{r.item}{r.uom === "type" ? <span className="ml-1 text-[10px] text-slate-400">(type)</span> : null}</td>
                  <td className="py-1 pr-3 text-center">{canEdit ? <input className={`${input} w-20 text-center`} inputMode="numeric" value={r.good} onChange={(e) => set(r.idx, "good", e.target.value)} /> : r.good}</td>
                  <td className="py-1 pr-3 text-center">{canEdit ? <input className={`${input} w-20 text-center`} inputMode="numeric" value={r.damaged} onChange={(e) => set(r.idx, "damaged", e.target.value)} /> : r.damaged}</td>
                  <td className="py-1">{canEdit ? <input className={`${input} w-full`} value={r.remarks} maxLength={300} onChange={(e) => set(r.idx, "remarks", e.target.value)} /> : <span className="text-xs text-slate-500">{r.remarks}</span>}</td>
                  <td className="whitespace-nowrap py-1 pl-2 text-right">{canEdit && <button onClick={() => remove(r, r.idx)} className="text-xs text-status-critical hover:underline">Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <input className={`${input} w-64`} placeholder="Add an item (e.g. STANDING DESK)" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())} />
          <button onClick={addItem} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">Add item</button>
          <button onClick={save} disabled={busy || dirty.length === 0} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">{busy ? "Saving…" : `Save ${dirty.length || ""} change${dirty.length === 1 ? "" : "s"}`}</button>
          <button onClick={() => setShowPaste((v) => !v)} className="ml-auto text-xs text-brand hover:underline">Paste this station's tab from the sheet</button>
          {error && <span className="text-sm text-status-critical">{error}</span>}
          {notice && !error && <span className="text-sm text-emerald-700">{notice}</span>}
        </div>
      )}

      {canEdit && showPaste && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Copy the item rows of this station's tab in the Fleet Inventory workbook (with the SKU / ITEMS / OUM / GOOD / DAMAGE heading) and paste them here. This <strong>replaces</strong> the station's whole list with what you paste.</p>
          <textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste rows here…" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" />
          {parsed && (
            <div className="text-xs">
              {parsed.problems.map((p) => <div key={p} className="text-status-critical">{p}</div>)}
              {parsed.items.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">{parsed.items.length} items read ({parsed.items.reduce((a, i) => a + (+i.good || 0), 0)} good, {parsed.items.reduce((a, i) => a + (+i.damaged || 0), 0)} damaged).</span>
                  <button onClick={importPaste} disabled={busy} className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-50">Replace {station}'s list</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StationInventory() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("station");
  const [open, setOpen] = useState(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [group, setGroup] = useState("all");
  const [chip, setChip] = useState("all");

  const load = () => api.assets.inventory().then((d) => { setData(d); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const stations = data?.stations || [];
  const regions = useMemo(() => [...new Set(stations.map((s) => s.region))].sort(), [stations]);
  const zones = useMemo(() => [...new Set(stations.filter((s) => region === "all" || s.region === region).map((s) => s.zone))].sort(), [stations, region]);

  const chips = useMemo(() => {
    const defs = [
      ["all", "All stations", () => true],
      ["none", "No inventory yet", (s) => s.items === 0],
      ["damaged", "Has damaged items", (s) => s.damaged > 0],
    ];
    return defs.map(([key, label, fn]) => ({ key, label, fn, n: stations.filter(fn).length }));
  }, [stations]);

  const inScope = (s) => (region === "all" || s.region === region) && (zone === "all" || s.zone === zone);
  const stationRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fn = chips.find((c) => c.key === chip)?.fn || (() => true);
    return stations.filter((s) => inScope(s) && fn(s) && (!q || `${s.name} ${s.zone} ${s.region}`.toLowerCase().includes(q)));
  }, [stations, chips, chip, region, zone, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemRows = useMemo(() => {
    const scope = new Set(stations.filter(inScope).map((s) => s.name));
    const q = search.trim().toLowerCase();
    const m = {};
    for (const i of data?.items || []) {
      if (!scope.has(i.station) || (group !== "all" && i.group !== group)) continue;
      if (q && !i.item.toLowerCase().includes(q)) continue;
      const r = (m[i.item] ||= { item: i.item, group: i.group, stations: 0, good: 0, damaged: 0, damagedStations: 0 });
      r.stations += 1; r.good += i.good || 0; r.damaged += i.damaged || 0; if ((i.damaged || 0) > 0) r.damagedStations += 1;
    }
    return Object.values(m).sort((a, b) => a.group.localeCompare(b.group) || a.item.localeCompare(b.item));
  }, [data, stations, region, zone, group, search]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>;
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>;
  const openStation = open && stations.find((s) => s.name === open);
  const sel = "h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700";

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        What each station has -- laptops, scanners, cages, baskets, fans, fire extinguishers ... -- and how many are good or damaged. {data.can_edit ? "Open a station to change its counts, add an item or paste its tab from the sheet." : "Only the Fleet Admin team can edit."}
        {" "}{stations.filter((s) => s.items > 0).length} of {stations.length} stations have an inventory so far; a station with none can start from the standard list.
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c.key} onClick={() => { setChip(c.key); setView("station"); }} className={`rounded-full border px-3 py-1 text-xs font-medium ${chip === c.key && view === "station" ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600"}`}>
            {c.label} <span className="ml-1 font-semibold">{c.n}</span>
          </button>
        ))}
        <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
          {[["station", "By station"], ["item", "By item"]].map(([k, l]) => <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 ${view === k ? "bg-ink text-white" : "text-slate-500"}`}>{l}</button>)}
        </div>
      </div>

      {openStation && <StationDetail key={`${openStation.name}-${data.items.length}-${openStation.updated_at}`} station={openStation.name} items={data.items.filter((i) => i.station === openStation.name)} groups={data.groups} standard={data.standard} canEdit={data.can_edit} onClose={() => setOpen(null)} onSaved={() => load()} />}

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === "item" ? "Find an item…" : "Find a station, zone or region…"} className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
        <select value={region} onChange={(e) => { setRegion(e.target.value); setZone("all"); }} aria-label="Region" className={sel}><option value="all">All regions</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Zone" className={sel}><option value="all">All zones</option>{zones.map((z) => <option key={z} value={z}>{z}</option>)}</select>
        {view === "item" && <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group" className={sel}><option value="all">All groups</option>{data.groups.map((g) => <option key={g} value={g}>{g}</option>)}</select>}
        <span className="text-xs text-slate-400">{view === "item" ? `${itemRows.length} items` : `${stationRows.length} of ${stations.length} stations`}</span>
      </div>

      {view === "station" ? (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
              <tr><th className="px-3 py-2 font-medium">Station</th><th className="px-3 py-2 font-medium">Zone</th><th className="px-3 py-2 text-center font-medium">Items</th><th className="px-3 py-2 text-center font-medium">Good</th><th className="px-3 py-2 text-center font-medium">Damaged</th><th className="px-3 py-2 font-medium">Last saved</th><th /></tr>
            </thead>
            <tbody>
              {stationRows.map((s) => (
                <tr key={s.name} className={`border-t border-slate-100 ${open === s.name ? "bg-blue-50/50" : ""}`}>
                  <td className="px-3 py-1.5 font-medium text-ink">{s.name}</td>
                  <td className="px-3 py-1.5 text-slate-500">{s.zone}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{s.items || <span className="text-xs text-slate-300">none</span>}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{s.items ? s.good : ""}</td>
                  <td className={`px-3 py-1.5 text-center tabular-nums ${s.damaged > 0 ? "font-medium text-status-critical" : ""}`}>{s.items ? s.damaged : ""}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs text-slate-400">{s.updated_at || ""}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right"><button onClick={() => { setOpen(s.name); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs text-brand hover:underline">{data.can_edit ? (s.items ? "Open / edit" : "Start") : "Open"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
              <tr><th className="px-3 py-2 font-medium">Item</th><th className="px-3 py-2 font-medium">Group</th><th className="px-3 py-2 text-center font-medium">Stations</th><th className="px-3 py-2 text-center font-medium">Good</th><th className="px-3 py-2 text-center font-medium">Damaged</th><th className="px-3 py-2 text-center font-medium">Stations with damaged</th></tr>
            </thead>
            <tbody>
              {itemRows.map((r) => (
                <tr key={r.item} className="border-t border-slate-100">
                  <td className="px-3 py-1.5">{r.item}</td>
                  <td className="px-3 py-1.5 text-xs text-slate-500">{r.group}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{r.stations}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{r.good}</td>
                  <td className={`px-3 py-1.5 text-center tabular-nums ${r.damaged > 0 ? "font-medium text-status-critical" : ""}`}>{r.damaged}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{r.damagedStations}</td>
                </tr>
              ))}
              {itemRows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">No items.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
