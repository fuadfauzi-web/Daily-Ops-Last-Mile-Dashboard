import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

// Station x age-bucket pivot, grouped by last_scan_hub_name like the rest of the app
// -- but unlike the main Age>3 metric, this INCLUDES On Hold / On Vehicle for Delivery
// statuses, so it's the full picture of everything sitting in a hub by age.
const AGE_BUCKETS = [
  { key: "age_0", label: "Age 0" },
  { key: "age_1", label: "Age 1" },
  { key: "age_2", label: "Age 2" },
  { key: "age_3", label: "Age 3" },
  { key: "age_4_6", label: "Age 4-6" },
  { key: "age_7_plus", label: "Age 7+" },
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
      .agingDrilldown(state.stationCode, state.bucketKey)
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
            <div className="text-xs text-slate-500">{state.bucketLabel}</div>
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

function GroupTable({ title, groupLabel, rows }) {
  const [sortKey, setSortKey] = useState("key");
  const [sortDir, setSortDir] = useState("asc");

  if (rows.length <= 1) return null;

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "key" ? "asc" : "desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th
                className="sticky left-0 z-10 cursor-pointer select-none whitespace-nowrap bg-slate-50 px-4 py-2 font-medium hover:bg-slate-200"
                onClick={() => toggleSort("key")}
              >
                {groupLabel} {sortKey === "key" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-slate-200"
                onClick={() => toggleSort("station_count")}
              >
                Stations {sortKey === "station_count" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-slate-200"
                onClick={() => toggleSort("total")}
              >
                Total {sortKey === "total" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              {AGE_BUCKETS.map((b) => (
                <th
                  key={b.key}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-slate-200"
                  onClick={() => toggleSort(b.key)}
                >
                  {b.label} {sortKey === b.key && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.key} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                  {g.key}
                </td>
                <td className="px-4 py-2 text-center tabular-nums text-slate-500">{g.station_count}</td>
                <td className="px-4 py-2 text-center tabular-nums text-slate-700">{g.total.toLocaleString()}</td>
                {AGE_BUCKETS.map((b) => (
                  <td key={b.key} className="px-4 py-2 text-center tabular-nums text-slate-700">
                    {g[b.key].toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AgingDetailsTab({ regionFilter, zoneFilter, search, me }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("total");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    api
      .agingDetails()
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

  const zoneGroups = useMemo(() => localRollup(filteredStations, "zone"), [filteredStations]);
  const regionGroups = useMemo(() => localRollup(filteredStations, "region"), [filteredStations]);

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

      <GroupTable title="By region (follows filters below)" groupLabel="Region" rows={regionGroups} />
      <GroupTable title="By zone (follows filters below)" groupLabel="Zone" rows={zoneGroups} />

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-900 text-left text-white">
              <tr>
                {!hideRegionCol && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleSort("region")}
                  >
                    Region {sortKey === "region" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                {!hideZoneCol && (
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleSort("zone")}
                  >
                    Zone {sortKey === "zone" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                )}
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-slate-900 px-4 py-2 font-medium"
                  onClick={() => toggleSort("station_name")}
                >
                  Station {sortKey === "station_name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                  onClick={() => toggleSort("total")}
                >
                  Total {sortKey === "total" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                {AGE_BUCKETS.map((b) => (
                  <th
                    key={b.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleSort(b.key)}
                  >
                    {b.label} {sortKey === b.key && (sortDir === "asc" ? "↑" : "↓")}
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
                  <td className="px-4 py-2 text-center tabular-nums text-slate-700">{r.total.toLocaleString()}</td>
                  {AGE_BUCKETS.map((b) => {
                    const value = r[b.key];
                    return (
                      <td key={b.key} className="px-4 py-2 text-center tabular-nums">
                        <button
                          onClick={() =>
                            setModal({ stationCode: r.station_code, stationName: r.station_name, bucketKey: b.key, bucketLabel: b.label })
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
                  <td colSpan={leadingCols + 1 + AGE_BUCKETS.length} className="px-4 py-6 text-center text-slate-400">
                    No stations match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {filteredStations.length} rows · Grouped by last_scan_hub_name like the rest of the app, but includes On
          Hold / On Vehicle for Delivery so this is everything sitting in a hub by age, not just what's awaiting
          attempt.
        </div>
      </div>
    </div>
  );
}

function localRollup(rows, groupKey) {
  const groups = {};
  rows.forEach((r) => {
    const key = r[groupKey];
    if (!groups[key]) {
      groups[key] = { key, region: r.region, station_count: 0, total: 0 };
      AGE_BUCKETS.forEach((b) => (groups[key][b.key] = 0));
    }
    groups[key].station_count += 1;
    groups[key].total += r.total;
    AGE_BUCKETS.forEach((b) => (groups[key][b.key] += r[b.key]));
  });
  return Object.values(groups);
}
