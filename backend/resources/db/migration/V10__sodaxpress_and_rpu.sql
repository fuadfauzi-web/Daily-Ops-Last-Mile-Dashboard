-- Sodaxpress hypercare watch (same OVFD/Other shape as Orca) and the new RPU
-- tab (query 1397), which persists one pivot row per station per sub-type
-- (pending_pickup/ovfd/pending_inbound/aging_d5), same pattern as aging_details.

ALTER TABLE shipper_watch
    ADD COLUMN sodaxpress_ovfd INT NOT NULL DEFAULT 0 AFTER orca_other,
    ADD COLUMN sodaxpress_other INT NOT NULL DEFAULT 0 AFTER sodaxpress_ovfd;

CREATE TABLE rpu_snapshot (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    captured_at  DATETIME     NOT NULL,
    type         VARCHAR(20)  NOT NULL,
    station_code VARCHAR(20)  NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    zone         VARCHAR(20)  NOT NULL,
    region       VARCHAR(20)  NOT NULL,
    total_tn     INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_captured_type (captured_at, type),
    KEY idx_station (station_code, captured_at)
) DEFAULT CHARSET=utf8mb4;
