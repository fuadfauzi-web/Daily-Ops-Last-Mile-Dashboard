-- Unsweep split (Station Health), Process Time (Shipment Details), and Aging
-- Details' move from one pivot to five type-tagged pivots (Overall/0 Attempt/
-- Delivery/ATS/COD) sharing the same table.

ALTER TABLE station_metrics
    ADD COLUMN unsweep_document INT NOT NULL DEFAULT 0 AFTER prior_gt_d0,
    ADD COLUMN unsweep_parcel INT NOT NULL DEFAULT 0 AFTER unsweep_document;

ALTER TABLE shipment_details
    ADD COLUMN process_time_minutes FLOAT DEFAULT NULL AFTER fresh_attempt_pct;

ALTER TABLE aging_details
    ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'overall' AFTER captured_at,
    ADD KEY idx_captured_type (captured_at, type);
