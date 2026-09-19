import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { resolveThreshold, classify, SEVERITY_MARK } from "./lib/thresholds";
import { ALL_COLUMNS } from "./lib/metrics";
import { exportCsv } from "./lib/csv";
import DataTable from "./components/DataTable";
import SegmentedControl from "./components/SegmentedControl";
import TnModal from "./components/TnModal";

// What do I act on today? Sits in front of the other six tabs -- picks up
// the same role-scoped, already-filtered station list Dashboard already
// has, so a station clerk automatically sees only their station and a
// region head only their region, same as everywhere else in the app.
const DEFAULT_METRICS = ["zero_attempt", "unsweep_parcel", "missing_hub"];
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

function pillClass(sev) {
  if (sev === "critical") return "bg-status-critical text-white";
  if (sev === "warning") return "bg-status-warning text-white";
  return "bg-status-good/10 text-status-good";
}

// Sums every ALL_COLUMNS metric across the stations in each unit at the
// chosen level -- "station" is just the stations themselves, unaggregated.
function groupStations(stations, level) {
  if (level === "station") {
    return stations.map((s) => ({
      key: s.station_code,
      name: s.station_name,
      region: s.region,
      zone: s.zone,
      stationCodes: [s.station_code],
      ...Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, s[c.key] || 0])),
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
        ...Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, 0])),
      });
    }
    const g = groups.get(k);
    g.stationCodes.push(s.station_code);
    ALL_COLUMNS.forEach((c) => {
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
    const sev = classify(t, row[m]);
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
        const col = ALL_COLUMNS.find((c) => c.key === b.metricKey);
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

export default function ActionBoard({ stations, yesterdayStations, capturedAt, thresholdRows, me, onFilterTo }) {
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
  const [level, setLevel] = useState("zone");
  const [breachesOnly, setBreachesOnly] = useState(false);
  const [modal, setModal] = useState(null);
  const [tnByStation, setTnByStation] = useState({});

  const scoredMetrics = useMemo(
    () => ALL_COLUMNS.filter((c) => resolveThreshold(thresholdRows, c.key, null).scored),
    [thresholdRows]
  );

  const toggleMetric = (key) => {
    setSelectedMetrics((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* private browsing / storage blocked -- selection just won't persist */
      }
      return next;
    });
  };

  // If an admin un-scores a metric a user had saved, drop it from the active
  // set silently rather than rendering a stale reference-styled column --
  // it reappears (still checked) if the metric gets re-scored later.
  const activeMetrics = useMemo(
    () => selectedMetrics.filter((m) => scoredMetrics.some((c) => c.key === m)),
    [selectedMetrics, scoredMetrics]
  );

  const todayGroups = useMemo(() => groupStations(stations, level), [stations, level]);
  const yesterdayGroups = useMemo(() => groupStations(yesterdayStations, level), [yesterdayStations, level]);
  const yesterdayByKey = useMemo(() => new Map(yesterdayGroups.map((g) => [g.key, g])), [yesterdayGroups]);

  const heatmapRows = useMemo(() => {
    const rows = todayGroups.map((r) => {
      const { count, worstRank } = breachInfo(r, activeMetrics, thresholdRows);
      return { ...r, breachCount: count, worstRank };
    });
    const filtered = breachesOnly ? rows.filter((r) => r.breachCount > 0) : rows;
    return [...filtered].sort(
      (a, b) => b.breachCount - a.breachCount || b.worstRank - a.worstRank || a.name.localeCompare(b.name)
    );
  }, [todayGroups, activeMetrics, thresholdRows, breachesOnly]);

  // "Act on these today" is always station-level -- that's the only
  // granularity a tracking-number list (and therefore Copy TNs) makes sense
  // at, regardless of what the heatmap above is currently grouped by.
  const stationRows = useMemo(() => groupStations(stations, "station"), [stations]);
  const actionRows = useMemo(() => {
    const rows = stationRows.map((r) => {
      const breaches = activeMetrics
        .map((m) => {
          const t = resolveThreshold(thresholdRows, m, r.region);
          const sev = classify(t, r[m]);
          return { metricKey: m, sev, value: r[m], target: t.warning_at, direction: t.direction };
        })
        .filter((b) => b.sev === "critical" || b.sev === "warning");
      const worstRank = breaches.reduce((acc, b) => Math.max(acc, b.sev === "critical" ? 2 : 1), 0);
      return { ...r, breaches, worstRank };
    });
    return rows
      .filter((r) => r.breaches.length > 0)
      .sort((a, b) => b.breaches.length - a.breaches.length || b.worstRank - a.worstRank)
      .slice(0, ACT_LIST_CAP);
  }, [stationRows, activeMetrics, thresholdRows]);

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
              api
                .drilldown(r.key, b.metricKey)
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
  }, [actionRows]);

  const handleCellClick = (row, metricKey) => {
    const col = ALL_COLUMNS.find((c) => c.key === metricKey);
    if (level === "station") {
      setModal({ stationCode: row.key, stationName: row.name, metricKey, metricLabel: col.label });
    } else {
      onFilterTo(level, row.key, row.region);
    }
  };

  const identityLabel = level === "region" ? "Region" : level === "zone" ? "Zone" : "Station";

  const heatmapColumns = [
    { key: "name", label: identityLabel, sticky: true, align: "left" },
    { key: "station_count", label: "Stations", className: () => "text-slate-500", render: (r) => r.stationCodes.length },
    { key: "breaches", label: "Breaches", className: () => "font-semibold text-slate-600", render: (r) => r.breachCount },
    ...activeMetrics.map((metricKey) => {
      const col = ALL_COLUMNS.find((c) => c.key === metricKey);
      const natThreshold = resolveThreshold(thresholdRows, metricKey, null);
      return {
        key: metricKey,
        label: (
          <>
            {col.label}
            <div className="text-[10px] font-normal normal-case text-slate-300">
              {natThreshold.direction === "lower-is-worse" ? "≥" : "≤"} {natThreshold.warning_at}
            </div>
          </>
        ),
        sortable: false,
        render: (r) => {
          const t = resolveThreshold(thresholdRows, metricKey, r.region);
          const sev = classify(t, r[metricKey]);
          const yRow = yesterdayByKey.get(r.key);
          const delta = yRow ? deltaText(r[metricKey], yRow[metricKey]) : null;
          return (
            <button
              onClick={() => handleCellClick(r, metricKey)}
              className={`inline-flex min-w-[60px] items-center justify-center gap-1 whitespace-nowrap rounded px-2 py-1 font-semibold tabular-nums ${pillClass(sev)}`}
            >
              {SEVERITY_MARK[sev]}
              {r[metricKey].toLocaleString()}
              {delta && <span className="text-[10px] font-normal opacity-80">{delta}</span>}
            </button>
          );
        },
      };
    }),
  ];

  return (
    <div className="space-y-4">
      <TnModal state={modal} onClose={() => setModal(null)} fetcher={api.drilldown} />

      {capturedAt && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
          Data as of {formatTime(capturedAt)}
        </div>
      )}

      <div className="space-y-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-xs font-semibold text-slate-700">Metrics:</span>
          {scoredMetrics.length === 0 && (
            <span className="text-xs text-slate-400">
              No metrics are scored yet -- set targets in Admin → SLA Targets first.
            </span>
          )}
          {scoredMetrics.map((c) => {
            const on = selectedMetrics.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggleMetric(c.key)}
                className={`min-h-[44px] rounded-full border px-3 py-1 font-display text-xs font-semibold ${
                  on ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {c.label}
              </button>
            );
          })}
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
                    [identityLabel, "Stations", "Breaches", ...activeMetrics.map((m) => ALL_COLUMNS.find((c) => c.key === m).label)],
                    heatmapRows.map((r) => [r.name, r.stationCodes.length, r.breachCount, ...activeMetrics.map((m) => r[m])])
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
                      const col = ALL_COLUMNS.find((c) => c.key === b.metricKey);
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
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <CopyTnsButton tnsByMetric={tnByStation[r.key]} breaches={r.breaches} />
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
