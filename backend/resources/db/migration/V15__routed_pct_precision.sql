-- Routed % now shows 2 decimal places (was 1), and its formula changed to
-- Total Routed / (Total Routed + Total In Hub) -- see aggregate.py's
-- merge_routed_into_station_metrics (2026-09-20 feedback).
ALTER TABLE station_metrics
  MODIFY COLUMN routed_pct DECIMAL(6,2) NOT NULL DEFAULT 0;
