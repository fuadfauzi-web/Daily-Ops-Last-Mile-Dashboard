import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

// From the Fleet Manager's "LM - RPU Tracker" sheet (query 1397):
//   Pending Pick Up  -- granular_status = Pending Pickup
//   OVFD             -- granular_status = Van en-route to pickup (the sheet's own
//                       name for this stage -- not delivery OVFD elsewhere in this app)
//   Pending Inbound  -- granular_status = En-route to Sorting Hub (picked up, not yet
//                       scanned in at the hub)
//   Aging D5+        -- 5+ days since scheduled, still at Pending Pick Up or OVFD stage
// Shipper Details reuses Pending Pick Up / OVFD filtered to one shipper_group.
const RPU_TABS = [
  { key: "pending_pickup", label: "Pending Pick Up" },
  { key: "ovfd", label: "OVFD" },
  { key: "pending_inbound", label: "Pending Inbound" },
  { key: "aging_d5", label: "Aging D5+" },
  { key: "shipper_details", label: "RPU Shipper Details" },
];

const SHIPPER_STAGES = [
  { key: "pending_pickup", label: "Pending Pick Up" },
  { key: "ovfd", label: "OVFD" },
];

const SHIPPERS = ["Zalora", "Cainiao"];

const TN_COLUMNS = [
  { key: "tracking_number", label: "Tracking Number" },
  { key: "status", label: "Status" },
  { key: "attempts", label: "Attempt" },
  { key: "age", label: "Age" },
  { key: "failure_reason", label: "Failure Reason" },
  { key: "driver_name", label: "Driver" },
  { key: "shipper_name", label: "Shipper" },
];

function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

function RpuView({ type, shipperGroup, regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("total_tn");
  const [sortDir, setSortDir] = useState("desc");
  const [tnSortKey, setTnSortKey] = useState("age");
  const [tnSortDir, setTnSortDir] = useState("desc");

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    setData(null);
    api
      .rpu(type, shipperGroup)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [type, shipperGroup]);

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

  const visibleStationCodes = useMemo(() => new Set(filteredStations.map((r) => r.station_code)), [filteredStations]);

  const filteredTnRows = useMemo(() => {
    if (!data) return [];
    const rows = data.tn_rows.filter((r) => visibleStationCodes.has(r.station_code));
    return [...rows].sort((a, b) => {
      const av = a[tnSortKey];
      const bv = b[tnSortKey];
      if (av == null || bv == null) return 0;
      if (typeof av === "string") return tnSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return tnSortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, visibleStationCodes, tnSortKey, tnSortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleTnSort = (key) => {
    if (key === tnSortKey) setTnSortDir(tnSortDir === "asc" ? "desc" : "asc");
    else {
      setTnSortKey(key);
      setTnSortDir("desc");
    }
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading…</div>;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const leadingCols = 1 + (hideRegionCol ? 0 : 1) + (hideZoneCol ? 0 : 1);

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-500">{data.type_label} data as of {formatTime(data.captured_at)}</div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[45vh] overflow-auto">
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
                  onClick={() => toggleSort("total_tn")}
                >
                  Total TN {sortKey === "total_tn" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((r) => (
                <tr key={r.station_code} className="border-t border-slate-100 hover:bg-slate-50/60">
                  {!hideRegionCol && <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.region}</td>}
                  {!hideZoneCol && <td className="whitespace-nowrap px-4 py-2 text-center text-slate-500">{r.zone}</td>}
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.station_name}
                  </td>
                  <td className="px-4 py-2 text-center tabular-nums font-semibold text-status-critical">
                    {r.total_tn.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredStations.length === 0 && (
                <tr>
                  <td colSpan={leadingCols + 1} className="px-4 py-6 text-center text-slate-400">
                    No stations match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Tracking numbers</div>
        <div className="max-h-[50vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-900 text-left text-white">
              <tr>
                <th
                  className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-slate-900 px-4 py-2 font-medium"
                  onClick={() => toggleTnSort("station_name")}
                >
                  Station {tnSortKey === "station_name" && (tnSortDir === "asc" ? "↑" : "↓")}
                </th>
                {TN_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-medium hover:bg-brand"
                    onClick={() => toggleTnSort(c.key)}
                  >
                    {c.label} {tnSortKey === c.key && (tnSortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTnRows.map((r, i) => (
                <tr key={`${r.tracking_number}-${i}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                    {r.station_name}
                  </td>
                  {TN_COLUMNS.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-4 py-2 text-center font-mono text-xs text-slate-700">
                      {r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredTnRows.length === 0 && (
                <tr>
                  <td colSpan={1 + TN_COLUMNS.length} className="px-4 py-6 text-center text-slate-400">
                    No tracking numbers match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {filteredTnRows.length.toLocaleString()} tracking numbers
          {data.tn_rows_truncated && (
            <span className="ml-1 font-medium text-status-critical">
              · showing the oldest {filteredTnRows.length.toLocaleString()} of {data.tn_rows_total.toLocaleString()}{" "}
              — filter by region/zone/station to see the rest
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RpuTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [rpuTab, setRpuTab] = useState("pending_pickup");
  const [shipper, setShipper] = useState("Zalora");
  const [shipperStage, setShipperStage] = useState("pending_pickup");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {RPU_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setRpuTab(t.key)}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              rpuTab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rpuTab === "shipper_details" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {SHIPPERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setShipper(s)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    shipper === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {SHIPPER_STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setShipperStage(s.key)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    shipperStage === s.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <RpuView
            type={shipperStage} shipperGroup={shipper}
            regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
            excludeEastMalaysia={excludeEastMalaysia}
          />
        </div>
      ) : (
        <RpuView
          type={rpuTab} shipperGroup={null}
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia}
        />
      )}
    </div>
  );
}
