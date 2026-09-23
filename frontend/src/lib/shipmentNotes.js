// Shipment Details header notes. See backend/aggregate.py's build_shipment_details.
export const SHIPMENT_NOTES = {
  total_fresh: "Total parcels expected in at this station today (query 653's total_orders). Reference only -- not evaluated.",
  total_shipment: "Total shipments recorded on today's line-haul trips into this station (query 1500).",
  fresh_unscan: "Blank 1st_sweep_at_WM_station_datetime -- the parcel hasn't been scanned in at any hub yet since the shipment completed. Action: sweep it in.",
  latlong: "shp_dest_hub_name (intended dest) differs from dest_hub_name (current dest), excluding RTS. Action: check why the parcel's destination changed and re-route if needed.",
  fresh_attempt_pct: "% of today's fresh parcels that have a first_attempt_datetime recorded. Target ≥96%.",
  process_time_minutes: "Average time-of-day today's fresh parcels were first scanned/swept in (beta -- not yet confirmed accurate).",
  process_within_1h: "Parcels scanned in within 1 hour of shipment_completion_datetime (column G -> column I).",
  process_within_2h: "Parcels scanned in between 1 and 2 hours after shipment_completion_datetime.",
  process_within_3h: "Parcels scanned in between 2 and 3 hours after shipment_completion_datetime.",
  process_over_3h: "Parcels that took more than 3 hours to be scanned in. Action: these are the slowest to clear -- worth checking what held them up.",
};
