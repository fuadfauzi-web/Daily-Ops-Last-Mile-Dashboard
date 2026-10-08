// Action Board column notes (2026-09-26 feedback): for every metric on the heatmap -- what it counts, which parcels it covers when
// that isn't "everything", the direction and target, and what to do. Station Health metrics reuse METRIC_NOTES; the metrics that
// only exist on the Action Board are described here.
import { SHIPMENT_NOTES } from "./shipmentNotes";

const SHIPPER_SLA_SCOPE = "Amway · Watson · Orca · Cold Chain · Soda Express · Zalora NXD only";

// Shown under the column name, so a metric that only covers some parcels can't be read as "all shippers".
export const BOARD_SCOPE = {
  shipper_sla_warning_ovfd: SHIPPER_SLA_SCOPE,
  shipper_sla_warning_aash: SHIPPER_SLA_SCOPE,
  shipper_sla_breach_ovfd: SHIPPER_SLA_SCOPE,
  shipper_sla_breach_aash: SHIPPER_SLA_SCOPE,
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
  shipper_sla_warning_ovfd:
    "Amway, Watson, Orca, Cold Chain, Soda Express and Zalora NXD parcels ONLY. Warning = older than 0 days since their first sweep at the hub; counts the parcels On Vehicle for Delivery and the ones still En-route to the station. Action: make sure the driver delivers or returns them today.",
  shipper_sla_warning_aash:
    "Amway, Watson, Orca, Cold Chain, Soda Express and Zalora NXD parcels ONLY. Warning = older than 0 days; counts the parcels Arrived at Sorting Hub. Parcels in any other status are listed in the tracking numbers (with their status) but not counted. Action: route and attempt them today, before they become a breach.",
  shipper_sla_breach_ovfd:
    "Amway, Watson, Orca, Cold Chain, Soda Express and Zalora NXD parcels ONLY. Breach = older than 1 day; counts the parcels On Vehicle for Delivery and the ones still En-route to the station: the SLA is missed. Action: chase the driver to complete or return them and escalate the cause.",
  shipper_sla_breach_aash:
    "Amway, Watson, Orca, Cold Chain, Soda Express and Zalora NXD parcels ONLY. Breach = older than 1 day; counts the parcels Arrived at Sorting Hub. Parcels in any other status are listed in the tracking numbers (with their status) but not counted. Action: clear these first and escalate the cause.",
  aging_delivery_gt3:
    "Aging Details -> Aging Delivery: parcels Arrived at Sorting Hub at their own destination hub that are more than 3 days old since their first sweep. Action: attempt them, or find out why they cannot be.",
  aging_ats_gt7:
    "Aging Details -> Aging ATS: parcels sitting at a hub that is NOT their destination hub for more than 7 days. Action: get them moved on to their destination hub.",
  rpu_aging_gt5:
    "RPU (return pickup) parcels more than 5 days past their scheduled pickup date, at any stage. Action: complete the pickup or update the case.",
  missing_to_answer:
    "Open Active Missing parcels (not Ship Out, not B2B documents) that nobody has answered yet in Recovery -> Active Missing. Action: open the case, check the parcel and fill in the answers.",
  lost_to_answer:
    "This week's Lost Declared parcels with no answer yet (neither customer received nor liable party), not counting ones the app already shows as Recovered. Action: region staff answer them in Recovery -> Lost Declared.",
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
  const minW = t.min_count_warning != null ? ` and at least ${t.min_count_warning} parcels` : "";
  const minC = t.min_count_critical != null ? ` and at least ${t.min_count_critical} parcels` : "";
  if (t.critical_at >= 999999) parts.push(`Warning once it reaches ${cmp} ${t.warning_at}${unit}${minW}.`);
  else if (t.warning_at === t.critical_at && !minW && !minC) parts.push(`Breach (critical) as soon as it reaches ${cmp} ${t.critical_at}${unit}.`);
  else parts.push(`Warning at ${cmp} ${t.warning_at}${unit}${minW}, critical at ${cmp} ${t.critical_at}${unit}${minC}.`);
  return parts.join(" ");
}
