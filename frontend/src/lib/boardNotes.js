// Action Board column notes (2026-09-26 feedback): for every metric on the heatmap -- what it counts, which parcels it covers when
// that isn't "everything", the direction and target, and what to do. Station Health metrics reuse METRIC_NOTES; the metrics that
// only exist on the Action Board are described here.
import { SHIPMENT_NOTES } from "./shipmentNotes";

const SHIPPER_SLA_SCOPE = "Amway · Watson · Orca · Cold Chain only";

// Shown under the column name, so a metric that only covers some parcels can't be read as "all shippers".
export const BOARD_SCOPE = {
  shipper_sla_warning: SHIPPER_SLA_SCOPE,
  shipper_sla_breach: SHIPPER_SLA_SCOPE,
  zalora_zero_attempt: "Zalora only",
  zalora_ovfd: "Zalora only",
  old_route_tn: "Parcels on an old route",
  routed_current_ovfd: "Route level · no TN list",
};

export const BOARD_NOTES = {
  old_route_tn:
    "Tracking numbers still On Vehicle for Delivery on an OLD route -- the route is not today's (query \"XB: Aging OVFD Parcels\"). Action: get the driver to close the old route: deliver, return or update each parcel.",
  zalora_zero_attempt:
    "Zalora NXD parcels only. At their correct hub (destination hub = last sweep hub), 0 delivery attempts, already added to a shipment, and not en-route, on vehicle or pending reschedule. Action: route and attempt them today.",
  zalora_ovfd:
    "Zalora NXD parcels only. On Vehicle for Delivery, counted at the hub that last swept them. Action: chase the driver to complete or return them.",
  routed_current_ovfd:
    "Route Monitoring's Current OVFD: parcels still on a vehicle across today's routes. It is route level, so there is no tracking-number list behind it. Action: follow up with the drivers who haven't cleared their route.",
  fresh_unscan: SHIPMENT_NOTES.fresh_unscan,
  shipper_sla_warning:
    "Amway, Watson, Orca and Cold Chain parcels ONLY -- not every shipper. Parcels still at the station that are older than 0 days (1 day since their first sweep here). Parcels still en-route to the hub aren't counted. Action: attempt or deliver them today, before they become a breach.",
  shipper_sla_breach:
    "Amway, Watson, Orca and Cold Chain parcels ONLY -- not every shipper. Parcels still at the station that are older than 1 day since their first sweep here: the SLA is missed. Action: clear these first and escalate the cause.",
};

// "Higher is worse. Warning at >= 5, critical at >= 10." -- from the metric's target in Settings -> SLA Targets.
export function targetText(t, findColumn) {
  if (!t || !t.scored || (t.warning_at === 0 && t.critical_at === 0)) {
    return "No target is set yet -- admins set it in Settings → SLA Targets.";
  }
  const higherIsWorse = t.direction !== "lower-is-worse";
  const cmp = higherIsWorse ? "≥" : "≤";
  const unit = t.percent_of ? `% of ${findColumn(t.percent_of)?.label ?? t.percent_of}` : "";
  const parts = [`${higherIsWorse ? "Higher" : "Lower"} is worse.`];
  if (t.critical_at >= 999999) parts.push(`Warning once it reaches ${cmp} ${t.warning_at}${unit}.`);
  else if (t.warning_at === t.critical_at) parts.push(`Breach (critical) as soon as it reaches ${cmp} ${t.critical_at}${unit}.`);
  else parts.push(`Warning at ${cmp} ${t.warning_at}${unit}, critical at ${cmp} ${t.critical_at}${unit}.`);
  return parts.join(" ");
}
