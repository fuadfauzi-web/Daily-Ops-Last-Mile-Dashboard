-- Backs the new Old Route tab (query 1451). Like shipment_details/routed_stations,
-- this is an hourly station-level snapshot; the TN-level rows and driver rollup
-- are kept in memory only (see main.py), same as the rest of the app's TN detail.

CREATE TABLE old_route (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    captured_at  DATETIME     NOT NULL,
    station_code VARCHAR(20)  NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    zone         VARCHAR(20)  NOT NULL,
    region       VARCHAR(20)  NOT NULL,
    total_tn     INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_captured (captured_at),
    KEY idx_station (station_code, captured_at)
) DEFAULT CHARSET=utf8mb4;
