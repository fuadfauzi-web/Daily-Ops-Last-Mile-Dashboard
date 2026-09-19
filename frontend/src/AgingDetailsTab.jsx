import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

// Station x age-bucket pivot, grouped by last_scan_hub_name like the rest of the app
// -- but unlike the main Age>3 metric, this INCLUDES On Hold / On Vehicle for Delivery
// statuses, so it's the full picture of everything sitting in a hub by age. Five
// sub-views share this same shape (see backend/aggregate.py's AGING_TYPES):
//   Overall / 0 Attempt / Delivery / ATS / COD
const AGING_TYPES = [
  { key: "overall", label: "Aging Overall" },
  { key: "zero_attempt", label: "Aging 0 Attempt" },
  { key: "delivery", label: "Aging Delivery" },
  { key: "ats", label: "Aging ATS" },
  { key: "cod", label: "Aging COD" },
];

const AGE_BUCKETS = [
  { key: "age_0", label: "Age 0" },
  { key: "age_1", label: "Age 1" },
  { key: "age_2", label: "Age 2" },
  { key: "age_3", label: "Age 3" },
  { key: "age_4_6", label: "Age 4-6" },
  { key: "age_7_plus", label: "Age 7+" },
];

// Mirrors backend/main.py's AGING_TN_ROWS_CAP -- for the truncation notice only.
const AGING_TN_ROWS_CAP = 2000;

const TN_COLUMNS = [
  { key: "tracking_number", label: "Tracking Number" },
  { key: "status", label: "Status" },
  { key: "attempts", label: "Attempt" },
  { key: "age", label: "Age" },
  { key: "tag", label: "Tag" },
  { key: "cod", label: "COD" },
  { key: "dest_hub", label: "Dest Hub" },
];

function formatTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
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
      <div className="border-b border-slate-100 px-4 py-2 font-display text-sm font-medium text-slate-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th
                className="sticky left-0 z-10 cursor-pointer select-none whitespace-nowrap bg-slate-50 px-4 py-2 font-display font-medium hover:bg-slate-200"
                onClick={() => toggleSort("key")}
              >
                {groupLabel} {sortKey === "key" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-slate-200"
                onClick={() => toggleSort("station_count")}
              >
                Stations {sortKey === "station_count" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-slate-200"
                onClick={() => toggleSort("total")}
              >
                Total {sortKey === "total" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              {AGE_BUCKETS.map((b) => (
                <th
                  key={b.key}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-slate-200"
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

export default function AgingDetailsTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia }) {
  const [agingType, setAgingType] = useState("overall");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("total");
  const [sortDir, setSortDir] = useState("desc");
  const [tnSortKey, setTnSortKey] = useState("age");
  const [tnSortDir, setTnSortDir] = useState("desc");

  const hideRegionCol = regionFilter !== "all" || me.scope_type !== "all";
  const hideZoneCol = zoneFilter !== "all" || me.scope_type === "zone" || me.scope_type === "station";

  useEffect(() => {
    setData(null);
    api
      .agingDetails(agingType)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [agingType]);

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

  const zoneGroups = useMemo(() => localRollup(filteredStations, "zone"), [filteredStations]);
  const regionGroups = useMemo(() => localRollup(filteredStations, "region"), [filteredStations]);

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

  const leadingCols = 1 + (hideRegionCol ? 0 : 1) + (hideZoneCol ? 0 : 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {data && <div className="text-sm text-slate-500">Data as of {formatTime(data.captured_at)}</div>}
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {AGING_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setAgingType(t.key)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                agingType === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!data && <div className="text-slate-500">Loading…</div>}

      {data && !data.captured_at && (
        <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>
      )}

      {data && data.captured_at && (
        <>
          <GroupTable title="By region (follows filters below)" groupLabel="Region" rows={regionGroups} />
          <GroupTable title="By zone (follows filters below)" groupLabel="Zone" rows={zoneGroups} />

          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-4 py-2 font-display text-sm font-medium text-slate-700">
              {data.type_label} — pivot
            </div>
            <div className="max-h-[50vh] overflow-auto">
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
                    <th
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
                      onClick={() => toggleSort("total")}
                    >
                      Total {sortKey === "total" && (sortDir === "asc" ? "↑" : "↓")}
                    </th>
                    {AGE_BUCKETS.map((b) => (
                      <th
                        key={b.key}
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
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
                      {AGE_BUCKETS.map((b) => (
                        <td key={b.key} className="px-4 py-2 text-center tabular-nums text-slate-700">
                          {r[b.key].toLocaleString()}
                        </td>
                      ))}
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
          </div>

          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-4 py-2 font-display text-sm font-medium text-slate-700">
              {data.type_label} — tracking numbers
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-20 bg-ink text-left text-white">
                  <tr>
                    <th
                      className="sticky left-0 z-30 cursor-pointer select-none whitespace-nowrap bg-ink px-4 py-2 font-display font-medium"
                      onClick={() => toggleTnSort("station_name")}
                    >
                      Station {tnSortKey === "station_name" && (tnSortDir === "asc" ? "↑" : "↓")}
                    </th>
                    {TN_COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-center font-display font-medium hover:bg-brand"
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
              {filteredTnRows.length.toLocaleString()} tracking numbers · grouped by last_scan_hub_name, not dest_hub
              {data.tn_rows_truncated && (
                <span className="ml-1 font-medium text-status-critical">
                  · showing the oldest {AGING_TN_ROWS_CAP.toLocaleString()} of {data.tn_rows_total.toLocaleString()}{" "}
                  nationwide — filter by region/zone/station to see the rest
                </span>
              )}
            </div>
          </div>
        </>
      )}
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
