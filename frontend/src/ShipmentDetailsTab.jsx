import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const COLUMNS = [
  { key: "total_fresh", label: "Total Fresh" },
  { key: "total_shipment", label: "Total Shipment" },
  { key: "fresh_unscan", label: "Fresh Unscan", clickable: true },
  { key: "latlong", label: "Latlong", clickable: true },
  { key: "fresh_attempt_pct", label: "Fresh Attempt %", percent: true },
];

function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

// "after 10am pre-warning, after 11am warning, after 12pm red flag"
function tripBadgeClass(isoTime) {
  const hour = new Date(isoTime.includes("T") ? isoTime : isoTime.replace(" ", "T")).getHours();
  if (hour >= 12) return "bg-red-100 text-red-700";
  if (hour >= 11) return "bg-amber-100 text-amber-700";
  if (hour >= 10) return "bg-blue-100 text-blue-700";
  return "bg-green-100 text-green-700";
}

function tripLabel(isoTime) {
  const d = new Date(isoTime.includes("T") ? isoTime : isoTime.replace(" ", "T"));
  return d.toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", hour12: true });
}

function TripBadge({ trip }) {
  if (!trip) return <span className="text-slate-300">—</span>;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${tripBadgeClass(trip.time)}`}>
      {tripLabel(trip.time)} · {trip.parcels.toLocaleString()}
    </span>
  );
}

function ShipmentTnModal({ state, onClose }) {
  const [tns, setTns] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state) return;
    setTns(null);
    setError(null);
    setCopied(false);
    api
      .shipmentDrilldown(state.stationCode, state.metricKey)
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

export default function ShipmentDetailsTab({ regionFilter, zoneFilter, search }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("fresh_unscan");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    api
      .shipmentDetails()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const filteredStations = useMemo(() => {
    if (!data) return [];
    let rows = data.stations;
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
  }, [data, regionFilter, zoneFilter, search, sortKey, sortDir]);

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

  return (
    <div className="space-y-3">
      <ShipmentTnModal state={modal} onClose={() => setModal(null)} />
      <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-900 text-left text-white">
              <tr>
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-slate-900 px-4 py-2 font-medium"
                  onClick={() => toggleSort("station_name")}
                >
                  Station {sortKey === "station_name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium">Region</th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium">Zone</th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-right font-medium hover:bg-brand"
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium">LH Timing (1st / 2nd trip)</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((r) => (
                <tr key={r.station_code} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.station_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.region}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.zone}</td>
                  {COLUMNS.map((c) => {
                    const value = r[c.key];
                    const content = c.percent ? `${value.toFixed(1)}%` : value.toLocaleString();
                    const pctClass = c.key === "fresh_attempt_pct" ? (value >= 96 ? "text-status-good font-semibold" : "text-status-critical font-semibold") : "";
                    if (!c.clickable) {
                      return (
                        <td key={c.key} className={`px-4 py-2 text-right tabular-nums ${pctClass}`}>
                          {content}
                          {c.key === "fresh_attempt_pct" && <span className="ml-1 text-[10px] text-slate-400">/96%</span>}
                        </td>
                      );
                    }
                    return (
                      <td key={c.key} className="px-4 py-2 text-right tabular-nums">
                        <button
                          onClick={() =>
                            setModal({ stationCode: r.station_code, stationName: r.station_name, metricKey: c.key, metricLabel: c.label })
                          }
                          className={`underline decoration-dotted underline-offset-2 hover:decoration-solid ${
                            value > 0 ? "font-semibold text-status-critical" : "text-slate-700"
                          }`}
                        >
                          {content}
                        </button>
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex gap-1.5">
                      <TripBadge trip={r.lh_trips[0]} />
                      <TripBadge trip={r.lh_trips[1]} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStations.length === 0 && (
                <tr>
                  <td colSpan={4 + COLUMNS.length} className="px-4 py-6 text-center text-slate-400">
                    No stations match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {filteredStations.length} rows · LH Timing: green &lt;10am, blue 10–11am, amber 11am–12pm, red after 12pm
        </div>
      </div>
    </div>
  );
}
