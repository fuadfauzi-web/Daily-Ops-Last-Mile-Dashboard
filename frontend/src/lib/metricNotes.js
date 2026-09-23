// Station Health header notes -- what each metric actually counts (backend
// logic, see backend/aggregate.py's build_station_metrics) and what to do
// about it. Shown via HeaderNote, click-to-open, so this text never has to
// live in the table itself (2026-09-24 feedback).
export const METRIC_NOTES = {
  total_fresh: "Total parcels expected in at this station today (query 653). Reference only -- not evaluated.",
  total_routed: "Total parcels routed out to a driver/rider today (Route Monitoring's own total).",
  routed_pct: "Total Routed ÷ (Total Routed + In Hub) -- how much of what's sitting in-hub has actually gone out.",
  attendance: "Unique Hybrid/Independent drivers (HD/HR/ID/IR) who had a route today. OPS and unparsed names aren't counted here.",
  zero_attempt_total: "At its own dest hub, status \"Arrived at Sorting Hub\", 0 delivery attempts, age known. Sum of 0 Attempt D0 + 0 Attempt >D0. Action: route to a driver/rider to attempt delivery.",
  zero_attempt: "Zero Attempt parcels aged D0 (today). Action: route today.",
  zero_attempt_gt_d0: "Zero Attempt parcels aged more than D0 -- already sitting past today. Action: prioritise, these are overdue.",
  total_in_hub: "Parcels physically at their correct dest hub right now (not On Hold, not still On Vehicle). The base for several % metrics below.",
  age_gt3: "Parcels aged more than 3 days since their first sweep at the current hub. Action: investigate why it hasn't moved -- check for a hold, missing route, or recurring failure.",
  on_hold: "Parcels with status On Hold. Action: resolve whatever's blocking it (address issue, customer contact, etc.) before it can route.",
  reschedule: "In-hub parcels that have already been attempted at least once (attempts > 0). Action: reschedule/re-route for another attempt.",
  still_ovfd: "Parcels still On Vehicle for Delivery -- out on a route, not yet resolved. Not actionable at the hub until the driver returns/updates.",
  cod_pct_hub: "% of in-hub parcels that are COD. Reference -- useful for cash-handling planning, not a target to hit.",
  prior_d0: "PRIOR-tagged parcels at Arrived at Sorting Hub with 0 attempts, aged D0. Action: these are flagged priority -- attempt today before anything else.",
  prior_gt_d0: "PRIOR-tagged parcels aged past D0. Action: overdue priority parcels -- attempt immediately.",
  unsweep_document: "Unswept tracking numbers that look like a document ID (DO/PSO/RDO/GRN pattern), not a parcel. Action: sweep/scan it in at the hub.",
  unsweep_parcel: "Unswept tracking numbers that look like a regular parcel. Action: sweep/scan it in at the hub.",
  missing_hub: "Open missing-parcel tickets last scanned as a Sweep (lost somewhere in-hub). Action: physically search the hub, check nearby bins/shelves.",
  missing_driver_rider: "Open missing-parcel tickets last scanned as an Inbound (lost with a driver/rider). Action: follow up with the driver/rider who last had it.",
  missing_ship_in: "Open missing-parcel tickets last scanned as a Shipment Completion (lost in a line-haul/ship-in). Action: trace the shipment/line-haul it came in on.",
  pending_ats_zero_attempt: "Not yet at its own dest hub (still in transit to the correct hub), 0 attempts. Reference -- nothing to action here until it arrives.",
  pending_ats_attempted: "Not yet at its own dest hub, but already attempted once (status Arrived at Sorting Hub elsewhere). Reference -- worth checking why an attempt happened before the parcel reached its real dest hub.",
};
