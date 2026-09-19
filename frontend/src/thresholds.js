// The single source of truth for SLA cutoffs. One entry per metric in
// Dashboard.jsx's ALL_COLUMNS.
//
//   scored    → has an SLA. Coloured green / warning / critical against the cutoffs.
//   reference → no SLA. Always plain ink, never ranked, never flagged.
//
// direction: "higher-is-worse" (default) or "lower-is-worse" (e.g. attendance rate).
//
// This file is the SEED AND FALLBACK ONLY -- the real, editable values live in the
// `sla_thresholds` database table (see backend/resources/db/migration/V13__sla_thresholds.sql),
// set through Admin -> SLA Targets. The frontend fetches those over `/api/thresholds`
// and only falls back to this file's values if that request fails. Add a metric here
// the same day you add its column; an unlisted metric renders as reference.

export const METRICS = {
  // ---- reference only: no SLA, no colour ----
  total_fresh: { kind: "reference" },
  total_routed: { kind: "reference" },
  attendance: { kind: "reference" },
  total_in_hub: { kind: "reference" },
  still_ovfd: { kind: "reference" },
  cod_pct_hub: { kind: "reference", unit: "%" },

  // ---- scored: TO BE SUPPLIED, placeholders below ----
  zero_attempt: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  zero_attempt_gt_d0: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  // Scored as a % of Total In Hub by default (2026-09-20 feedback), e.g.
  // warning=20 means "no more than 20% of what's in hub should be Age >3".
  age_gt3: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0, percentOf: "total_in_hub" },
  on_hold: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  reschedule: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  prior_d0: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  prior_gt_d0: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  unsweep_document: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  unsweep_parcel: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  missing_hub: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  missing_ship_in: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  pending_ats_zero_attempt: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
  pending_ats_attempted: { kind: "scored", direction: "higher-is-worse", warning: 0, critical: 0 },
};
