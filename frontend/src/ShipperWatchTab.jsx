import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { columnsToDetailRows } from "./lib/detailRows";
import DataTable from "./components/DataTable";
import TnModal from "./components/TnModal";
import DetailPanel from "./components/DetailPanel";
import SegmentedControl from "./components/SegmentedControl";
import Skeleton from "./components/Skeleton";
import AgingDetailsTab from "./AgingDetailsTab";
import HighValueView from "./HighValueView";

// 2026-09-24 feedback: renamed Shipper Watch -> Shipper Radar, restructured
// as sub-tabs -- the original per-shipper SLA table below (now "Summary View").
// 2026-10-08 feedback: renamed Hypercare Shippers, with Summary View (the old Shipper SLA table), Cold Chain, Special Handling Shippers (Orca,
// Soda Express + their guideline) and High-Value Shippers (Zalora NXD, Amway, Watson, Zitron, Ceva: tracking-number level + SLA). Restock moved out to
// its own Restock tab (2026-10-08, with Document Compliance).
const RADAR_SUB_TABS = [
  { key: "sla", label: "Summary View" },
  { key: "cold", label: "Cold Chain" }, // 2026-09-25: lives here only (its own top-level tab was removed)
  { key: "special", label: "Special Handling Shippers" },
  { key: "highvalue", label: "High-Value Shippers" },
];

// Amway/Watson SLA: attempt on day 0, succeed delivery before day 3 -- so 0-Attempt
// and Aging(>Day0) are what matters. Orca: OVFD vs everything else (no confirmed TN
// pattern for Orca -- see backend/aggregate.py). Zalora: 0-Attempt + OVFD/Other split,
// only for parcels sitting at their correct hub. None of this has been cross-checked
// against live data yet -- numbers are provisional until confirmed.
//
// Restock moved to its own Restock tab (2026-09-20) -- not shown here anymore.
const SHIPPERS = [
  {
    key: "zalora",
    label: "Zalora",
    columns: [
      { key: "zalora_zero_attempt", label: "Zalora NXD 0 Attempt" },
      { key: "zalora_ovfd", label: "Zalora NXD OVFD" },
      { key: "zalora_other", label: "Zalora NXD Other Status" },
    ],
  },
  {
    key: "amway",
    label: "Amway",
    columns: [
      { key: "amway_zero_attempt", label: "Amway 0 Attempt" },
      { key: "amway_aging", label: "Amway Aging >D0" },
    ],
  },
  {
    key: "watson",
    label: "Watson",
    columns: [
      { key: "watson_zero_attempt", label: "Watson 0 Attempt" },
      { key: "watson_aging", label: "Watson Aging >D0" },
    ],
  },
  {
    // 2026-10-08: Zitron (TN prefix ZTRON) and Ceva (prefix LSGMY) -- same rule and SLA as Amway.
    key: "zitron",
    label: "Zitron",
    columns: [
      { key: "zitron_zero_attempt", label: "Zitron 0 Attempt" },
      { key: "zitron_aging", label: "Zitron Aging >D0" },
    ],
  },
  {
    key: "ceva",
    label: "Ceva",
    columns: [
      { key: "ceva_zero_attempt", label: "Ceva 0 Attempt" },
      { key: "ceva_aging", label: "Ceva Aging >D0" },
    ],
  },
  {
    // 2026-10-09: Fujifilm (TN prefix FUJIF) -- same 0 Attempt and Aging >D0 numbers as Amway.
    key: "fujifilm",
    label: "Fujifilm",
    columns: [
      { key: "fujifilm_zero_attempt", label: "Fujifilm 0 Attempt" },
      { key: "fujifilm_aging", label: "Fujifilm Aging >D0" },
    ],
  },
  {
    // 2026-09-26: same rule as Amway / Watson (0 Attempt, Aging >D0); parcels are picked by the Cold Chain tracking-number list.
    key: "coldchain",
    label: "Cold Chain",
    columns: [
      { key: "cold_chain_zero_attempt", label: "Cold Chain 0 Attempt" },
      { key: "cold_chain_aging", label: "Cold Chain Aging >D0" },
    ],
  },
  {
    key: "orca",
    label: "Orca",
    columns: [
      { key: "orca_ovfd", label: "Orca OVFD" },
      { key: "orca_other", label: "Orca Other Status" },
    ],
  },
  {
    key: "sodaxpress",
    label: "Soda Express",
    columns: [
      { key: "sodaxpress_ovfd", label: "Soda Express OVFD" },
      { key: "sodaxpress_other", label: "Soda Express Other Status" },
    ],
  },
];

// onlyKeys / variant / title (2026-10-08): the Special Handling tab shows just Orca and Soda Express through this same table, with its own remembered picks.
function ShipperSlaView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick, onlyKeys, variant, title }) {
  const shippers = useMemo(() => (onlyKeys ? SHIPPERS.filter((s) => onlyKeys.includes(s.key)) : SHIPPERS), [onlyKeys]);
  const allKeys = useMemo(() => shippers.map((s) => s.key), [shippers]);
  const storageKey = `shipper-watch-shippers${variant ? `-${variant}` : ""}-${me.email}`;
  const seenKey = `shipper-watch-seen${variant ? `-${variant}` : ""}-${me.email}`;
  const [selectedShippers, setSelectedShippers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved) && saved.length) {
        // A shipper added after this person saved their picks (Cold Chain, 2026-09-26) is switched on once so it doesn't stay
        // hidden; after that their own choice wins.
        const seen = JSON.parse(localStorage.getItem(seenKey) || "null");
        const known = Array.isArray(seen) ? seen : allKeys.filter((k) => k !== "coldchain");
        const fresh = allKeys.filter((k) => !known.includes(k));
        const next = fresh.length ? [...saved, ...fresh] : saved;
        localStorage.setItem(seenKey, JSON.stringify(allKeys));
        if (fresh.length) localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      }
    } catch {
      /* private browsing / storage blocked / bad JSON -- default to everything */
    }
    return allKeys;
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(onlyKeys ? SHIPPERS.find((s) => s.key === onlyKeys[0]).columns[0].key : "zalora_zero_attempt");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const hideRegionCol = regionFilter !== "all" || (me.scope_type !== "all" && me.scope_values.length <= 1);
  const hideZoneCol =
    zoneFilter !== "all" || ((me.scope_type === "zone" || me.scope_type === "station") && me.scope_values.length <= 1);

  const toggleShipper = (key) => {
    setSelectedShippers((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* private browsing / storage blocked -- selection just won't persist */
      }
      return next;
    });
  };

  const activeColumns = useMemo(
    () => shippers.filter((s) => selectedShippers.includes(s.key)).flatMap((s) => s.columns),
    [selectedShippers, shippers]
  );

  useEffect(() => {
    api
      .shipperWatch()
      .then(setData)
      .catch((e) => setError(e.message));
  }, [refreshTick]);

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
    // 2026-09-23 feedback: a station with nothing flagged under any currently
    // selected shipper is noise, not signal -- drop it rather than showing a
    // row of zeroes. (Re-evaluated whenever the shipper picker changes, via
    // activeColumns in the dependency list below.)
    rows = rows.filter((r) => activeColumns.some((c) => r[c.key] > 0));
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, regionFilter, zoneFilter, search, sortKey, sortDir, excludeEastMalaysia, activeColumns]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.captured_at)
    return <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200 text-slate-600">No data yet.</div>;

  const columns = [
    ...(!hideRegionCol ? [{ key: "region", label: "Region", className: () => "text-slate-500" }] : []),
    ...(!hideZoneCol ? [{ key: "zone", label: "Zone", className: () => "text-slate-500" }] : []),
    { key: "station_name", label: "Station", sticky: true, align: "left" },
    ...activeColumns.map((c) => ({
      key: c.key,
      label: c.label,
      render: (r) => r[c.key].toLocaleString(),
      className: (r) => (r[c.key] > 0 ? "font-semibold text-status-critical" : "text-slate-700"),
      onClick: (r) => setModal({ stationCode: r.station_code, stationName: r.station_name, metricKey: c.key, metricLabel: c.label }),
    })),
  ];

  return (
    <div className="space-y-3">
      <TnModal state={modal} onClose={() => setModal(null)} fetcher={api.shipperDrilldown} />
      <DetailPanel
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={detailRow?.station_name}
        subtitle={detailRow ? `${detailRow.region} · ${detailRow.zone} · ${detailRow.station_code}` : null}
        rows={detailRow ? columnsToDetailRows(columns, detailRow) : []}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <span className="font-display text-xs font-semibold text-slate-700">Shippers:</span>
        {shippers.map((s) => {
          const on = selectedShippers.includes(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggleShipper(s.key)}
              className={`min-h-[44px] rounded-full border px-3 py-1 font-display text-xs font-semibold ${
                on ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {activeColumns.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Pick at least one shipper above to see its columns.
        </div>
      ) : (
        <DataTable
          title={title || "Hypercare Shippers — Summary"}
          titleExtra={
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-shipper-watch-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Region", "Zone", "Station", ...activeColumns.map((c) => c.label)],
                  filteredStations.map((r) => [r.region, r.zone, r.station_name, ...activeColumns.map((c) => r[c.key])])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          }
          maxHeight="70vh"
          columns={columns}
          rows={filteredStations}
          rowKey={(r) => r.station_code}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onRowClick={(r) => setDetailRow(r)}
          emptyMessage="All clear — no station currently has a flagged parcel under the selected shipper(s)."
          footer={
            <>
              {filteredStations.length} rows · Amway/Watson SLA: attempt day 0, succeed before day 3. Zalora only
              counts parcels at their correct hub (dest hub = last sweep hub). These formulas haven't been checked
              against live data yet — flag anything that looks off.
            </>
          }
        />
      )}
    </div>
  );
}

// Special Handling Shippers (2026-10-08): Orca and Soda Express run a special parcel flow. Each has a card with its flow note and a link to the
// guideline slides (both set by the Superadmin under Superadmin -> Hypercare Settings -- the slide links are still to come), then the same
// station table as the Summary View, just for these two.
function SpecialHandlingView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    api
      .hypercareConfig()
      .then(setConfig)
      .catch(() => setConfig({ special: [], can_edit: false }));
  }, [refreshTick]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {(config?.special || []).map((s) => (
          <div key={s.key} className="rounded-xl border-l-4 border-brand bg-white p-3 ring-1 ring-slate-200">
            <div className="font-display text-sm font-bold text-ink">{s.label} — special flow</div>
            {s.guideline_note ? (
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{s.guideline_note}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">The flow note has not been added yet.</p>
            )}
            {s.guideline_url ? (
              <a
                href={s.guideline_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-ink px-3 font-display text-xs font-semibold text-white hover:bg-brand"
              >
                Open the {s.label} guideline slides ↗
              </a>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                Guideline slides: the link is coming soon{config?.can_edit ? " -- add it under Superadmin → Hypercare Settings." : "."}
              </p>
            )}
          </div>
        ))}
      </div>
      <ShipperSlaView
        regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
        excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        onlyKeys={["orca", "sodaxpress"]} variant="special" title="Special Handling Shippers — Orca and Soda Express"
      />
    </div>
  );
}

export default function ShipperWatchTab({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [subTab, setSubTab] = useState("sla");

  return (
    <div className="space-y-3">
      <SegmentedControl options={RADAR_SUB_TABS} value={subTab} onChange={setSubTab} />

      {subTab === "sla" ? (
        <ShipperSlaView
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        />
      ) : subTab === "cold" ? (
        <AgingDetailsTab
          source="coldchain"
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        />
      ) : subTab === "special" ? (
        <SpecialHandlingView
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        />
      ) : (
        <HighValueView
          regionFilter={regionFilter} zoneFilter={zoneFilter} search={search} me={me}
          excludeEastMalaysia={excludeEastMalaysia} refreshTick={refreshTick}
        />
      )}
    </div>
  );
}
