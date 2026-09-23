// Route Monitoring header notes (Region/Zone/Station/Driver views only --
// Old Route, Pending Yesterday Route, and Summary have their own separate
// tables/wording). See backend/aggregate.py's build_routed_view.
export const ROUTED_NOTES = {
  total_routed: "Total parcels routed out to a driver/rider today.",
  attendance: "Unique Hybrid/Independent drivers (HD/HR/ID/IR) with a route today. OPS and unparsed names aren't counted here.",
  routed_pct: "Total Routed ÷ (Total Routed + In Hub, from Station Health) -- how much of what's sitting in-hub has actually gone out.",
  zero_attempt: "0 Attempt parcels at their own dest hub (Station Health's Total 0 Attempt). Action: route to a driver/rider to attempt delivery.",
  current_ovfd: "Parcels still On Vehicle for Delivery on this route right now -- not yet resolved. Action: push the driver/rider to clear it before 12am (see the Summary view).",
  current_success: "Parcels successfully delivered on this route so far today.",
  cod_pct: "% of this route's parcels that are COD.",
  success_rate: "Current Success ÷ Total Routed.",
  productivity_pct: "Same number as Success Rate, shown as a plain figure instead of a %. Scored per driver position (Hybrid/Independent) in Admin -> SLA Targets, not per region.",
  completion_rate: "(Total Routed − Current OVFD) ÷ Total Routed -- 100% means nothing is left on the vehicle. Action: chase whichever driver/rider is below 100%.",
  hybrid_total: "Hybrid Driver/Rider attendance headcount (HD/HR).",
  independent_total: "Independent Driver/Rider attendance headcount (ID/IR).",
  tenure: "Time since this driver's employment start date, from the driver/rider details file uploaded in Settings -> Documents. \"—\" means that driver isn't in the uploaded file.",
};
