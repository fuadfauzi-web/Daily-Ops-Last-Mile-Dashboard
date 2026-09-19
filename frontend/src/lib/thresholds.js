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
  if (!seed) return { scored: false, direction: "higher-is-worse", warning_at: 0, critical_at: 0 };
  return {
    scored: seed.kind === "scored",
    direction: seed.direction || "higher-is-worse",
    warning_at: seed.warning ?? 0,
    critical_at: seed.critical ?? 0,
  };
}

// "critical" | "warning" | "good" (scored, within target) | "reference" (not scored)
export function classify(threshold, value) {
  if (!threshold.scored) return "reference";
  // Unconfigured placeholder (0/0, "TO BE SUPPLIED") -- render plain rather
  // than flagging everything critical against an unset target.
  if (threshold.warning_at === 0 && threshold.critical_at === 0) return "reference";
  const worse = threshold.direction === "lower-is-worse" ? (a, b) => a <= b : (a, b) => a >= b;
  if (worse(value, threshold.critical_at)) return "critical";
  if (worse(value, threshold.warning_at)) return "warning";
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
