import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { resolveThreshold, classify, SEVERITY_MARK } from "./lib/thresholds";
import { EXTRA_METRICS, NO_DRILLDOWN_METRICS, BOARD_COLUMNS, findBoardColumn as findColumn } from "./lib/actionMetrics";
import { exportCsv } from "./lib/csv";
import DataTable from "./components/DataTable";
import MultiSelect from "./components/MultiSelect";
import SegmentedControl from "./components/SegmentedControl";
import TnModal from "./components/TnModal";

// What do I act on today? Sits in front of the other six tabs -- picks up
// the same role-scoped, already-filtered station list Dashboard already
// has, so a station clerk automatically sees only their station and a
// region head only their region, same as everywhere else in the app.
const DEFAULT_METRICS = ["zero_attempt_total", "unsweep_parcel", "missing_hub"];
const LEVELS = [
  { key: "region", label: "Region" },
  { key: "zone", label: "Zone" },
  { key: "station", label: "Station" },
];
const ACT_LIST_CAP = 20;

function deltaText(current, previous) {
  if (previous == null) return null;
  const diff = current - previous;
  if (diff === 0) return "0";
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff).toLocaleString()}`;
}

// One column per metric, TNs listed underneath -- matches the Copy TNs text
// layout so the CSV reads the same way once opened in a spreadsheet.
function exportStationTnsCsv(stationName, breaches, tnsByMetric) {
  const headers = breaches.map((b) => findColumn(b.metricKey).label);
  const columns = breaches.map((b) => tnsByMetric[b.metricKey] || []);
  const maxLen = Math.max(0, ...columns.map((c) => c.length));
  const rows = Array.from({ length: maxLen }, (_, i) => columns.map((c) => c[i] || ""));
  exportCsv(
    `daily-ops-action-board-${stationName.replace(/\s+/g, "-").toLowerCase()}-tns-${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows
  );
}

function pillClass(sev) {
  if (sev === "critical") return "bg-status-critical text-white";
  if (sev === "warning") return "bg-status-warning text-white";
  return "bg-status-good/10 text-status-good";
}

// Sums every BOARD_COLUMNS metric across the stations in each unit at the
// chosen level -- "station" is just the stations themselves, unaggregated.
function groupStations(stations, level) {
  if (level === "station") {
    return stations.map((s) => ({
      key: s.station_code,
      name: s.station_name,
      region: s.region,
      zone: s.zone,
      stationCodes: [s.station_code],
      ...Object.fromEntries(BOARD_COLUMNS.map((c) => [c.key, s[c.key] || 0])),
    }));
  }
  const groupField = level === "region" ? "region" : "zone";
  const groups = new Map();
  stations.forEach((s) => {
    const k = s[groupField];
    if (!groups.has(k)) {
      groups.set(k, {
        key: k,
        name: k,
        region: level === "region" ? k : s.region,
        stationCodes: [],
        ...Object.fromEntries(BOARD_COLUMNS.map((c) => [c.key, 0])),
      });
    }
    const g = groups.get(k);
    g.stationCodes.push(s.station_code);
    BOARD_COLUMNS.forEach((c) => {
      g[c.key] += s[c.key] || 0;
    });
  });
  return Array.from(groups.values());
}

function breachInfo(row, metricKeys, thresholdRows) {
  let count = 0;
  let worstRank = 0;
  metricKeys.forEach((m) => {
    const t = resolveThreshold(thresholdRows, m, row.region);
    const sev = classify(t, row[m], row);
    if (sev === "critical" || sev === "warning") {
      count += 1;
      worstRank = Math.max(worstRank, sev === "critical" ? 2 : 1);
    }
  });
  return { count, worstRank };
}

// tnsByMetric: { metricKey: [tracking_number, ...] } -- kept split by metric
// (rather than merged into one flat list) so the copied text says which
// metric each TN was flagged for; a TN breaching two metrics at once appears
// under both headings on purpose.
function CopyTnsButton({ tnsByMetric, breaches }) {
  const [copied, setCopied] = useState(false);
  if (!tnsByMetric) {
    return <span className="whitespace-nowrap text-xs text-slate-400">Loading…</span>;
  }
  const totalUnique = new Set(Object.values(tnsByMetric).flat()).size;
  const buildText = () =>
    breaches
      .map((b) => {
        const tns = tnsByMetric[b.metricKey] || [];
        const col = findColumn(b.metricKey);
        return `${col.label} (${tns.length}):\n${tns.join("\n")}`;
      })
      .join("\n\n");
  return (
    <button
      onClick={() => {
        if (!totalUnique) return;
        navigator.clipboard.writeText(buildText()).then(() => setCopied(true));
        setTimeout(() => setCopied(false), 2000);
      }}
      disabled={!totalUnique}
      className="min-h-[44px] shrink-0 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40"
    >
      {copied ? "Copied!" : `Copy ${totalUnique.toLocaleString()} TN${totalUnique === 1 ? "" : "s"}`}
    </button>
  );
}

export default function ActionBoard({ stations, yesterdayStations, thresholdRows, me, onFilterTo }) {
  const storageKey = `action-board-metrics-${me.email}`;
  const [selectedMetrics, setSelectedMetrics] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {
      /* private browsing / storage blocked / bad JSON -- use the default */
    }
    return DEFAULT_METRICS;
  });
  const [level, setLevel] = useState("station");
  const [breachesOnly, setBreachesOnly] = useState(true);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);
  const [tnByStation, setTnByStation] = useState({});

  // EXTRA_METRICS' own data -- fetched independently of the stations prop (which
  // only carries Station Health), same pattern each of those tabs already uses.
  const [oldRouteData, setOldRouteData] = useState(null);
  const [shipperData, setShipperData] = useState(null);
  const [routedData, setRoutedData] = useState(null);
  const [shipmentData, setShipmentData] = useState(null);
  useEffect(() => {
    api.oldRoute().then(setOldRouteData).catch(() => {});
    api.shipperWatch().then(setShipperData).catch(() => {});
    api.routedView().then(setRoutedData).catch(() => {});
    api.shipmentDetails().then(setShipmentData).catch(() => {});
  }, []);

  const oldRouteByStation = useMemo(() => {
    const m = new Map();
    (oldRouteData?.stations || []).forEach((s) => m.set(s.station_code, s.total_tn));
    return m;
  }, [oldRouteData]);
  const shipperByStation = useMemo(() => {
    const m = new Map();
    (shipperData?.stations || []).forEach((s) => m.set(s.station_code, s));
    return m;
  }, [shipperData]);
  const routedByStation = useMemo(() => {
    const m = new Map();
    (routedData?.stations || []).forEach((s) => m.set(s.station_code, s));
    return m;
  }, [routedData]);
  const shipmentByStation = useMemo(() => {
    const m = new Map();
    (shipmentData?.stations || []).forEach((s) => m.set(s.station_code, s));
    return m;
  }, [shipmentData]);

  // stations, enriched with EXTRA_METRICS -- built by looking up each already
  // role/filter-scoped station in the (unfiltered but same-role-scoped) extra
  // datasets, so the Dashboard's region/zone/search/East-Malaysia filters still
  // apply correctly without re-deriving them here.
  const enrichedStations = useMemo(
    () =>
      stations.map((s) => ({
        ...s,
        old_route_tn: oldRouteByStation.get(s.station_code) || 0,
        zalora_zero_attempt: shipperByStation.get(s.station_code)?.zalora_zero_attempt || 0,
        zalora_ovfd: shipperByStation.get(s.station_code)?.zalora_ovfd || 0,
        routed_current_ovfd: routedByStation.get(s.station_code)?.current_ovfd || 0,
        fresh_unscan: shipmentByStation.get(s.station_code)?.fresh_unscan || 0,
        shipper_sla_warning: shipperByStation.get(s.station_code)?.shipper_sla_warning || 0,
        shipper_sla_breach: shipperByStation.get(s.station_code)?.shipper_sla_breach || 0,
      })),
    [stations, oldRouteByStation, shipperByStation, routedByStation, shipmentByStation]
  );

  const scoredMetrics = useMemo(
    () => BOARD_COLUMNS.filter((c) => resolveThreshold(thresholdRows, c.key, null).scored),
    [thresholdRows]
  );

  const setMetrics = (next) => {
    setSelectedMetrics(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* private browsing / storage blocked -- selection just won't persist */
    }
  };

  // If an admin un-scores a metric a user had saved, drop it from the active
  // set silently rather than rendering a stale reference-styled column --
  // it reappears (still checked) if the metric gets re-scored later.
  const activeMetrics = useMemo(
    () => selectedMetrics.filter((m) => scoredMetrics.some((c) => c.key === m)),
    [selectedMetrics, scoredMetrics]
  );

  // Station-level breach evaluation, independent of the heatmap's own level --
  // used so a region/zone heatmap row can name WHICH of its stations are
  // breaching instead of just a count (2026-09-24 feedback).
  const stationBreachRows = useMemo(() => groupStations(enrichedStations, "station"), [enrichedStations]);
  const breachingStationNames = useMemo(() => {
    const map = new Map();
    stationBreachRows.forEach((r) => {
      const hasBreach = activeMetrics.some((m) => {
        const t = resolveThreshold(thresholdRows, m, r.region);
        const sev = classify(t, r[m], r);
        return sev === "critical" || sev === "warning";
      });
      if (hasBreach) map.set(r.key, r.name);
    });
    return map;
  }, [stationBreachRows, activeMetrics, thresholdRows]);

  const todayGroups = useMemo(() => groupStations(enrichedStations, level), [enrichedStations, level]);
  // yesterdayStations only ever carries Station Health fields -- EXTRA_METRICS
  // have no "yesterday" snapshot, so their delta is suppressed below rather than
  // comparing against a silent 0.
  const yesterdayGroups = useMemo(() => groupStations(yesterdayStations, level), [yesterdayStations, level]);
  const yesterdayByKey = useMemo(() => new Map(yesterdayGroups.map((g) => [g.key, g])), [yesterdayGroups]);

  const heatmapRows = useMemo(() => {
    const rows = todayGroups.map((r) => {
      const { count, worstRank } = breachInfo(r, activeMetrics, thresholdRows);
      // Only meaningful for a grouped (region/zone) row -- at station level
      // each row already IS one station, so there's nothing to list.
      const breachingStations =
        level !== "station"
          ? r.stationCodes.filter((c) => breachingStationNames.has(c)).map((c) => breachingStationNames.get(c))
          : [];
      return { ...r, breachCount: count, worstRank, breachingStations };
    });
    const filtered = breachesOnly ? rows.filter((r) => r.breachCount > 0) : rows;
    // No header clicked yet -- default sort stays breach count, then worst
    // severity, then name, same as always. Once a header is clicked, that
    // column drives the sort instead (2026-09-23 feedback).
    if (!sortKey) {
      return [...filtered].sort(
        (a, b) => b.breachCount - a.breachCount || b.worstRank - a.worstRank || a.name.localeCompare(b.name)
      );
    }
    return [...filtered].sort((a, b) => {
      const av = sortKey === "station_count" ? a.stationCodes.length : a[sortKey];
      const bv = sortKey === "station_count" ? b.stationCodes.length : b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [todayGroups, activeMetrics, thresholdRows, breachesOnly, sortKey, sortDir, level, breachingStationNames]);

  const toggleHeatmapSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // "Act on these today" is always station-level -- that's the only
  // granularity a tracking-number list (and therefore Copy TNs) makes sense
  // at, regardless of what the heatmap above is currently grouped by.
  const stationRows = useMemo(() => groupStations(enrichedStations, "station"), [enrichedStations]);
  // Routed View's metric has no TN list at all (see NO_DRILLDOWN_METRICS) so it
  // never contributes to this list, even if it's one of the selected metrics --
  // it still shows up in the heatmap above via activeMetrics.
  const drilldownMetrics = useMemo(
    () => activeMetrics.filter((m) => !NO_DRILLDOWN_METRICS.has(m)),
    [activeMetrics]
  );
  const actionRows = useMemo(() => {
    const rows = stationRows.map((r) => {
      const breaches = drilldownMetrics
        .map((m) => {
          const t = resolveThreshold(thresholdRows, m, r.region);
          const sev = classify(t, r[m], r);
          return { metricKey: m, sev, value: r[m], target: t.warning_at, direction: t.direction, percentOf: t.percent_of };
        })
        .filter((b) => b.sev === "critical" || b.sev === "warning");
      const worstRank = breaches.reduce((acc, b) => Math.max(acc, b.sev === "critical" ? 2 : 1), 0);
      return { ...r, breaches, worstRank };
    });
    return rows
      .filter((r) => r.breaches.length > 0)
      .sort((a, b) => b.breaches.length - a.breaches.length || b.worstRank - a.worstRank)
      .slice(0, ACT_LIST_CAP);
  }, [stationRows, drilldownMetrics, thresholdRows]);

  // Routes each metric to whichever endpoint actually holds its TN list --
  // Station Health metrics via /api/drilldown, Zalora via Shipper Watch's own
  // drilldown, Old Route by filtering the flat TN list it already fetched above
  // (no separate per-metric endpoint exists since Old Route only has one metric).
  const fetchTnsFor = (stationCode, metricKey) => {
    if (metricKey === "old_route_tn") {
      const list = (oldRouteData?.tn_rows || [])
        .filter((row) => row.station_code === stationCode)
        .map((row) => row.tracking_number);
      return Promise.resolve({ tracking_numbers: list, as_of: oldRouteData?.captured_at });
    }
    if (["zalora_zero_attempt", "zalora_ovfd", "shipper_sla_warning", "shipper_sla_breach"].includes(metricKey)) {
      return api.shipperDrilldown(stationCode, metricKey);
    }
    if (metricKey === "fresh_unscan") {
      return api.shipmentDrilldown(stationCode, metricKey);
    }
    return api.drilldown(stationCode, metricKey);
  };

  useEffect(() => {
    let cancelled = false;
    if (actionRows.length === 0) {
      setTnByStation({});
      return;
    }
    (async () => {
      const results = await Promise.all(
        actionRows.map(async (r) => {
          const perMetric = await Promise.all(
            r.breaches.map((b) =>
              fetchTnsFor(r.key, b.metricKey)
                .then((res) => [b.metricKey, res.tracking_numbers])
                .catch(() => [b.metricKey, []])
            )
          );
          return [r.key, Object.fromEntries(perMetric)];
        })
      );
      if (!cancelled) setTnByStation(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
    };
  }, [actionRows, oldRouteData]);

  const handleCellClick = (row, metricKey) => {
    if (level === "station") {
      if (NO_DRILLDOWN_METRICS.has(metricKey)) return; // heatmap-only, no TN list exists
      const col = findColumn(metricKey);
      setModal({ stationCode: row.key, stationName: row.name, metricKey, metricLabel: col.label });
    } else {
      onFilterTo(level, row.key, row.region);
    }
  };

  const identityLabel = level === "region" ? "Region" : level === "zone" ? "Zone" : "Station";

  const heatmapColumns = [
    { key: "name", label: identityLabel, sticky: true, align: "left" },
    // Region/zone rows name which of their stations are breaching instead of
    // just a station count; a station row already IS one station, so it gets
    // neither column (2026-09-24 feedback).
    ...(level !== "station"
      ? [{
          key: "breachingStations",
          label: "Breach",
          align: "left",
          sortable: false,
          className: () => "text-left text-xs text-slate-600",
          render: (r) => (r.breachingStations.length ? r.breachingStations.join(", ") : "—"),
        }]
      : []),
    ...activeMetrics.map((metricKey) => {
      const col = findColumn(metricKey);
      const isExtra = EXTRA_METRICS.some((e) => e.key === metricKey);
      const natThreshold = resolveThreshold(thresholdRows, metricKey, null);
      const percentOfLabel = natThreshold.percent_of ? findColumn(natThreshold.percent_of)?.label : null;
      return {
        key: metricKey,
        label: (
          <>
            {col.label}
            <div className="text-[10px] font-normal normal-case text-slate-300">
              {natThreshold.direction === "lower-is-worse" ? "≥" : "≤"} {natThreshold.warning_at}
              {percentOfLabel ? `% of ${percentOfLabel}` : ""}
            </div>
          </>
        ),
        render: (r) => {
          const t = resolveThreshold(thresholdRows, metricKey, r.region);
          const sev = classify(t, r[metricKey], r);
          const pctSuffix = t.percent_of && r[t.percent_of] ? ` (${((r[metricKey] / r[t.percent_of]) * 100).toFixed(1)}%)` : "";
          // EXTRA_METRICS have no "yesterday" snapshot -- never show a delta for
          // them rather than silently comparing against 0.
          const yRow = !isExtra ? yesterdayByKey.get(r.key) : null;
          const delta = yRow ? deltaText(r[metricKey], yRow[metricKey]) : null;
          const clickable = !(level === "station" && NO_DRILLDOWN_METRICS.has(metricKey));
          return (
            <button
              onClick={() => clickable && handleCellClick(r, metricKey)}
              disabled={!clickable}
              className={`inline-flex min-w-[60px] items-center justify-center gap-1 whitespace-nowrap rounded px-2 py-1 font-semibold tabular-nums ${pillClass(sev)} ${
                clickable ? "" : "cursor-default"
              }`}
            >
              {SEVERITY_MARK[sev]}
              {r[metricKey].toLocaleString()}
              {pctSuffix && <span className="text-[10px] font-normal opacity-80">{pctSuffix}</span>}
              {delta && <span className="text-[10px] font-normal opacity-80">{delta}</span>}
            </button>
          );
        },
      };
    }),
  ];

  return (
    <div className="space-y-4">
      <TnModal state={modal} onClose={() => setModal(null)} fetcher={fetchTnsFor} />

      <div className="space-y-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-xs font-semibold text-slate-700">Metrics:</span>
          {scoredMetrics.length === 0 ? (
            <span className="text-xs text-slate-400">
              No metrics are scored yet -- set targets in Admin → SLA Targets first.
            </span>
          ) : (
            <>
              <div className="w-64">
                <MultiSelect
                  options={scoredMetrics.map((c) => ({ value: c.key, label: c.label }))}
                  value={selectedMetrics}
                  onChange={setMetrics}
                  placeholder="Select metrics"
                />
              </div>
              {/* Chosen metrics shown as chips to the right of the picker, not
                  below it -- bold like the old toggle-button style, just
                  smaller (2026-09-24 feedback). */}
              <div className="flex flex-wrap items-center gap-1">
                {activeMetrics.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 font-display text-[11px] font-semibold text-white"
                  >
                    {findColumn(m).label}
                    <button
                      type="button"
                      onClick={() => setMetrics(selectedMetrics.filter((k) => k !== m))}
                      className="text-white/70 hover:text-white"
                      aria-label={`Remove ${findColumn(m).label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl options={LEVELS} value={level} onChange={setLevel} />
          <label className="flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={breachesOnly} onChange={(e) => setBreachesOnly(e.target.checked)} />
            Breaches only
          </label>
        </div>
      </div>

      {activeMetrics.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Pick at least one metric above to build the board.
        </div>
      ) : (
        <>
          <DataTable
            title={`${identityLabel} × metric heatmap`}
            titleExtra={
              <button
                onClick={() =>
                  exportCsv(
                    `daily-ops-action-board-${level}-${new Date().toISOString().slice(0, 10)}.csv`,
                    [identityLabel, ...(level !== "station" ? ["Breach"] : []), ...activeMetrics.map((m) => findColumn(m).label)],
                    heatmapRows.map((r) => [
                      r.name,
                      ...(level !== "station" ? [r.breachingStations.join(", ")] : []),
                      ...activeMetrics.map((m) => r[m]),
                    ])
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Export CSV
              </button>
            }
            maxHeight="60vh"
            columns={heatmapColumns}
            rows={heatmapRows}
            rowKey={(r) => r.key}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleHeatmapSort}
            emptyMessage="No rows match."
            footer={`Sorted by breach count, then worst severity. Click a cell to ${
              level === "station" ? "see its tracking numbers" : "filter Station Health to it"
            }.`}
          />

          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <div className="font-display text-sm font-medium text-slate-700">
                Act on these today <span className="font-normal text-slate-400">— stations breaching any selected metric, worst first</span>
              </div>
              <div className="text-xs text-slate-400">
                {actionRows.length} station{actionRows.length === 1 ? "" : "s"}
              </div>
            </div>
            {actionRows.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Nothing breaching the selected targets right now.
              </div>
            ) : (
              actionRows.map((r) => (
                <div key={r.key} className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0">
                  <div className={`h-8 w-1 shrink-0 rounded ${r.worstRank === 2 ? "bg-status-critical" : "bg-status-warning"}`} />
                  <div className="min-w-[140px] flex-1">
                    <div className="font-display text-sm font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.zone}</div>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-1.5" style={{ flexBasis: "260px" }}>
                    {r.breaches.map((b) => {
                      const col = findColumn(b.metricKey);
                      return (
                        <span
                          key={b.metricKey}
                          className={`whitespace-nowrap rounded px-2 py-1 text-xs ${
                            b.sev === "critical" ? "bg-status-critical/10 text-status-critical" : "bg-status-warning/10 text-status-warning"
                          }`}
                        >
                          {col.label} <strong className="tabular-nums">{b.value.toLocaleString()}</strong>{" "}
                          <span className="opacity-70">
                            / {b.direction === "lower-is-worse" ? "≥" : "≤"}
                            {b.target}
                            {b.percentOf ? `% of ${findColumn(b.percentOf)?.label}` : ""}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <CopyTnsButton tnsByMetric={tnByStation[r.key]} breaches={r.breaches} />
                    <button
                      onClick={() => exportStationTnsCsv(r.name, r.breaches, tnByStation[r.key])}
                      disabled={!tnByStation[r.key]}
                      className="min-h-[44px] shrink-0 whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 font-display text-xs font-medium text-slate-600 disabled:opacity-40"
                    >
                      CSV
                    </button>
                  </div>
                </div>
              ))
            )}
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
              Scoped to what you can see -- a station user gets only their own station's breaches.
              {actionRows.length === ACT_LIST_CAP && ` Showing the worst ${ACT_LIST_CAP}.`}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
