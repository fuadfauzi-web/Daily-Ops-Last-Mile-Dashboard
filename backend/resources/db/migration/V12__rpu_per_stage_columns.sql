-- RPU Status's summary table now breaks out each stage as its own column
-- instead of one Total TN. Drop-and-recreate again (same reasoning as V11 --
-- no precious data, fully regenerated hourly, and this sidesteps OceanBase's
-- combined multi-clause ALTER gotcha entirely).

DROP TABLE IF EXISTS rpu_snapshot;

CREATE TABLE rpu_snapshot (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    captured_at        DATETIME     NOT NULL,
    station_code       VARCHAR(20)  NOT NULL,
    station_name       VARCHAR(100) NOT NULL,
    zone               VARCHAR(20)  NOT NULL,
    region             VARCHAR(20)  NOT NULL,
    pending_pickup_tn  INT          NOT NULL DEFAULT 0,
    ovfd_tn            INT          NOT NULL DEFAULT 0,
    pending_inbound_tn INT          NOT NULL DEFAULT 0,
    total_tn           INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_captured (captured_at),
    KEY idx_station (station_code, captured_at)
) DEFAULT CHARSET=utf8mb4;
