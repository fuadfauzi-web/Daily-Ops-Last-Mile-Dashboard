-- "Routed %" = Total Routed / Total Fresh, shown next to Total Routed in Station
-- Health. Computed and stored per snapshot like every other station_metrics column
-- (see aggregate.py's merge_routed_into_station_metrics) rather than derived on
-- read, so historical snapshots keep their own accurate value.
ALTER TABLE station_metrics
  ADD COLUMN routed_pct DECIMAL(5,1) NOT NULL DEFAULT 0 AFTER total_routed;
