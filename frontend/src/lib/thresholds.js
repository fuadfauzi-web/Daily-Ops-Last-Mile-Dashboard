import { useEffect, useState } from "react";
import { api } from "../api";
import { METRICS as SEED_METRICS } from "../thresholds";

// Fetches /api/thresholds once per session. Falls back to thresholds.js's
// seed values (via resolveThreshold below) if the request fails, so the UI
// never breaks if the table is briefly unreachable.
export function useThresholds() {
  const [rows, setRows] = useState(null); // null = still loading
  const [error, setError] = useState(null);

  useEffect(() => {
    api.thresholds
      .list()
      .then(setRows)
      .catch((e) => {
        setError(e.message);
        setRows([]);
      });
  }, []);

  return { rows: rows || [], loading: rows === null, error };
}

// Resolves a metric's threshold for a given region: a region-specific
// override row wins, else the nationwide row, else thresholds.js's seed.
export function resolveThreshold(rows, metricKey, region) {
  const regionRow = region && rows.find((r) => r.metric_key === metricKey && r.scope === region);
  if (regionRow) return regionRow;
  const nationalRow = rows.find((r) => r.metric_key === metricKey && r.scope === "nationwide");
  if (nationalRow) return nationalRow;
  const seed = SEED_METRICS[metricKey];
  if (!seed) return { scored: false, direction: "higher-is-worse", warning_at: 0, critical_at: 0, percent_of: null };
  return {
    scored: seed.kind === "scored",
    direction: seed.direction || "higher-is-worse",
    warning_at: seed.warning ?? 0,
    critical_at: seed.critical ?? 0,
    percent_of: seed.percentOf || null,
  };
}

// "critical" | "warning" | "good" (scored, within target) | "reference" (not scored)
//
// `row`, when given, lets a metric be scored as a percentage of another field on
// the same row instead of its raw count -- e.g. Age >3 scored as % of Total In Hub
// (threshold.percent_of === "total_in_hub") rather than a flat number, per
// 2026-09-20 feedback. Only takes effect when the threshold actually has
// percent_of set (via Admin -> SLA Targets); every other metric classifies its
// raw value exactly as before.
export function classify(threshold, value, row) {
  if (!threshold.scored) return "reference";
  // Unconfigured placeholder (0/0, "TO BE SUPPLIED") -- render plain rather
  // than flagging everything critical against an unset target.
  if (threshold.warning_at === 0 && threshold.critical_at === 0) return "reference";
  let effective = value;
  if (threshold.percent_of && row) {
    const denom = row[threshold.percent_of];
    effective = denom ? (value / denom) * 100 : 0;
  }
  const worse = threshold.direction === "lower-is-worse" ? (a, b) => a <= b : (a, b) => a >= b;
  if (worse(effective, threshold.critical_at)) return "critical";
  if (worse(effective, threshold.warning_at)) return "warning";
  return "good";
}

// Colourblind redundancy: severity is never colour alone.
export const SEVERITY_MARK = { critical: "▲ ", warning: "■ ", good: "", reference: "" };

export const SEVERITY_CLASS = {
  critical: "font-semibold text-status-critical",
  warning: "font-medium text-status-warning",
  good: "text-status-neutral",
  reference: "text-slate-700",
};
