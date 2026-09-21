-- Station Health / Route Monitoring: "Total 0 Attempt" as its own column,
-- separate from the D0-only zero_attempt and >D0-only zero_attempt_gt_d0 it
-- sums -- see aggregate.py's build_station_metrics for the 2026-09-21 formula
-- (status = Arrived at Sorting Hub, Attempt = 0, days_since_current_hub_first_sweep
-- not blank, dest hub = last-scan hub).
ALTER TABLE station_metrics
    ADD COLUMN zero_attempt_total INT NOT NULL DEFAULT 0 AFTER total_in_hub;
