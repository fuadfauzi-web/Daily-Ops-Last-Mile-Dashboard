-- Station Health: Missing (Driver/Rider), between Missing (Hub) and Missing
-- (Ship-in) -- see aggregate.py's build_station_metrics / _classify_missing
-- (last_scan_type = "Inbound" -> driver_rider).
ALTER TABLE station_metrics
    ADD COLUMN missing_driver_rider INT NOT NULL DEFAULT 0 AFTER missing_hub;
