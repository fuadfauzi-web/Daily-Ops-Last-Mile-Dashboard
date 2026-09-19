import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

// Amway/Watson SLA: attempt on day 0, succeed delivery before day 3 -- so 0-Attempt
// and Aging(>Day0) are what matters. Orca: OVFD vs everything else (no confirmed TN
// pattern for Orca -- see backend/aggregate.py). Zalora: 0-Attempt + OVFD/Other split,
// only for parcels sitting at their correct hub. Restock: bundle/piece counts plus its
// two breach buckets. None of this has been cross-checked against live data yet --
// numbers are provisional until confirmed.
const COLUMNS = [
  { key: "zalora_zero_attempt", label: "Zalora NXD 0 Attempt", clickable: true },
  { key: "zalora_ovfd", label: "Zalora NXD OVFD", clickable: true },
  { key: "zalora_other", label: "Zalora NXD Other Status", clickable: true },
  { key: "amway_zero_attempt", label: "Amway 0 Attempt", clickable: true },
  { key: "amway_aging", label: "Amway Aging >D0", clickable: true },
  { key: "watson_zero_attempt", label: "Watson 0 Attempt", clickable: true },
  { key: "watson_aging", label: "Watson Aging >D0", clickable: true },
  { key: "restock_bundles", label: "Restock Bundles", clickable: true },
  { key: "restock_pieces", label: "Restock Pieces", clickable: true },
  { key: "restock_potential_breach", label: "Restock Potential Breach", clickable: true },
  { key: "restock_breach", label: "Restock Breach", clickable: true },
  { key: "orca_ovfd", label: "Orca OVFD", clickable: true },
  { key: "orca_other", label: "Orca Other Status", clickable: true },
  { key: "sodaxpress_ovfd", label: "Sodaxpress OVFD", clickable: true },
  { key: "sodaxpress_other", label: "Sodaxpress Other Status", clickable: true },
];

function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

function TnModal({ state, onClose }) {
  const [tns, setTns] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state) return;
    setTns(null);
    setError(null);
    setCopied(false);
    api
      .shipperDrilldown(state.stationCode, state.metricKey)
      .then((r) => setTns(r))
      .catch((e) => setError(e.message));
  }, [state]);

  if (!state) return null;

  const copy = () => {
    if (!tns?.tracking_numbers?.length) return;
    navigator.clipboard.writeText(tns.tracking_numbers.join("\n")).then(() => setCopied(true));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[8vh]" onClick={onClose}>
      <div
        className="max-h-[75vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">{state.stationName}</div>
            <div className="text-xs text-slate-500">{state.metricLabel}</div>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        <div className="px-4 py-3">
          {error && <div className="text-sm text-status-critical">{error}</div>}
          {!error && !tns && <div className="text-sm text-slate-400">Loading…</div>}
          {tns && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {tns.tracking_numbers.length.toLocaleString()} tracking number
                  {tns.tracking_numbers.length === 1 ? "" : "s"}
                  {tns.as_of && ` · as of ${formatTime(tns.as_of)}`}
                </div>
                <button
                  onClick={copy}
                  disabled={!tns.tracking_numbers.length}
                  className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {copied ? "Copied!" : "Copy list"}
                </button>
              </div>
              <div className="max-h-[45vh] overflow-y-auto rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">
                {tns.tracking_numbers.length === 0
                  ? "No tracking numbers."
                  : tns.tracking_numbers.map((tn) => <div key={tn}>{tn}</div>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShipperWatchTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("zalora_zero_attempt");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    api
      .shipperWatch()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const filteredStations = useMemo(() => {
    if (!data) return [];
    let rows = data.stations;
    if (excludeEastMalaysia) rows = rows.filter((r) => r.region !== "East Malaysia");
    if (regionFilter !== "all") rows = rows.filter((r) => r.region === regionFilter);
    if (zoneFilter !== "all") rows = rows.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.station_name.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, regionFilter, zoneFilter, search, sortKey, sortDir, excludeEastMalaysia]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading…</div>;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const leadingCols = 1 + (hideRegionCol ? 0 : 1) + (hideZoneCol ? 0 : 1);

  return (
    <div className="space-y-3">
      <TnModal state={modal} onClose={() => setModal(null)} />
      <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-ink text-left text-white">
              <tr>
                {!hideRegionCol && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
                    onClick={() => toggleSort("region")}
                  >
                    Region {sortKey === "region" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                {!hideZoneCol && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
                    onClick={() => toggleSort("zone")}
                  >
                    Zone {sortKey === "zone" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-ink px-4 py-2 font-display font-medium"
                  onClick={() => toggleSort("station_name")}
                >
                  Station {sortKey === "station_name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((r) => (
                <tr key={r.station_code} className="border-t border-slate-100 hover:bg-slate-50/60">
                  {!hideRegionCol && (
                    <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.region}</td>
                  )}
                  {!hideZoneCol && (
                    <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.zone}</td>
                  )}
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.station_name}
                  </td>
                  {COLUMNS.map((c) => {
                    const value = r[c.key];
                    if (!c.clickable) {
                      return (
                        <td key={c.key} className="px-4 py-2 text-center tabular-nums text-slate-700">
                          {value.toLocaleString()}
                        </td>
                      );
                    }
                    return (
                      <td key={c.key} className="px-4 py-2 text-center tabular-nums">
                        <button
                          onClick={() =>
                            setModal({ stationCode: r.station_code, stationName: r.station_name, metricKey: c.key, metricLabel: c.label })
                          }
                          className={`underline decoration-dotted underline-offset-2 hover:decoration-solid ${
                            value > 0 ? "font-semibold text-status-critical" : "text-slate-700"
                          }`}
                        >
                          {value.toLocaleString()}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredStations.length === 0 && (
                <tr>
                  <td colSpan={leadingCols + COLUMNS.length} className="px-4 py-6 text-center text-slate-400">
                    No stations match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {filteredStations.length} rows · Amway/Watson SLA: attempt day 0, succeed before day 3. Zalora only
          counts parcels at their correct hub (dest hub = last sweep hub). Restock is counted by bundle, not by
          individual parcel — "Pieces" is the actual parcel count. These formulas haven't been checked against
          live data yet — flag anything that looks off.
        </div>
      </div>
    </div>
  );
}
