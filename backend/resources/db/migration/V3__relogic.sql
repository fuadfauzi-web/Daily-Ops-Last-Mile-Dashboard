-- Rebuilds the Fleet Health V3 metric logic around last_scan_hub_name (where a
-- parcel physically is) instead of dest_hub, adds the resulting new buckets, the
-- Missing Hub/Ship-in split, and Total Routed/Attendance/COD% from the route-level
-- query. See backend/aggregate.py for the full formulas -- these were specified
-- directly by the Fleet Manager, column by column.

ALTER TABLE station_metrics
    ADD COLUMN zero_attempt_gt_d0 INT NOT NULL DEFAULT 0 AFTER zero_attempt,
    ADD COLUMN pending_ats        INT NOT NULL DEFAULT 0 AFTER on_hold,
    ADD COLUMN missing_hub        INT NOT NULL DEFAULT 0 AFTER missing_open,
    ADD COLUMN missing_ship_in    INT NOT NULL DEFAULT 0 AFTER missing_hub,
    ADD COLUMN age_gt6_ats        INT NOT NULL DEFAULT 0 AFTER age_gt3,
    ADD COLUMN cod_pct_hub        FLOAT NOT NULL DEFAULT 0 AFTER prior_gt_d0,
    ADD COLUMN total_routed       INT NOT NULL DEFAULT 0 AFTER cod_pct_hub,
    ADD COLUMN attendance         INT NOT NULL DEFAULT 0 AFTER total_routed,
    ADD COLUMN cod_pct_routed     FLOAT NOT NULL DEFAULT 0 AFTER attendance;
