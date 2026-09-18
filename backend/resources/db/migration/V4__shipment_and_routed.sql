-- Backs the new Shipment Details and Routed View tabs. Driver-level Routed View rows
-- are NOT persisted here -- like the tracking-number drilldown cache, they're rebuilt
-- in memory on every refresh (a daily driver roster has no need for hourly history).

ALTER TABLE station_metrics
    CHANGE COLUMN pending_ats pending_ats_zero_attempt INT NOT NULL DEFAULT 0,
    ADD COLUMN pending_ats_attempted INT NOT NULL DEFAULT 0 AFTER pending_ats_zero_attempt,
    DROP COLUMN age_gt6_ats;

CREATE TABLE shipment_details (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    captured_at         DATETIME     NOT NULL,
    station_code        VARCHAR(20)  NOT NULL,
    station_name        VARCHAR(100) NOT NULL,
    zone                VARCHAR(20)  NOT NULL,
    region              VARCHAR(20)  NOT NULL,
    total_fresh         INT          NOT NULL DEFAULT 0,
    total_shipment      INT          NOT NULL DEFAULT 0,
    fresh_unscan        INT          NOT NULL DEFAULT 0,
    latlong             INT          NOT NULL DEFAULT 0,
    fresh_attempt_count INT          NOT NULL DEFAULT 0,
    fresh_attempt_pct   FLOAT        NOT NULL DEFAULT 0,
    lh_trip1_time       VARCHAR(40)  DEFAULT NULL,
    lh_trip1_parcels    INT          DEFAULT NULL,
    lh_trip2_time       VARCHAR(40)  DEFAULT NULL,
    lh_trip2_parcels    INT          DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_captured (captured_at),
    KEY idx_station (station_code, captured_at)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE routed_stations (
    id                     BIGINT       NOT NULL AUTO_INCREMENT,
    captured_at            DATETIME     NOT NULL,
    station_code           VARCHAR(20)  NOT NULL,
    station_name           VARCHAR(100) NOT NULL,
    zone                   VARCHAR(20)  NOT NULL,
    region                 VARCHAR(20)  NOT NULL,
    total_routed           INT          NOT NULL DEFAULT 0,
    attendance             INT          NOT NULL DEFAULT 0,
    attendance_staff       INT          NOT NULL DEFAULT 0,
    attendance_independent INT          NOT NULL DEFAULT 0,
    attendance_rescue      INT          NOT NULL DEFAULT 0,
    current_ovfd           INT          NOT NULL DEFAULT 0,
    current_success        INT          NOT NULL DEFAULT 0,
    total_cod               INT          NOT NULL DEFAULT 0,
    cod_pct                FLOAT        NOT NULL DEFAULT 0,
    success_rate           FLOAT        NOT NULL DEFAULT 0,
    completion_rate        FLOAT        NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_captured (captured_at),
    KEY idx_station (station_code, captured_at)
) DEFAULT CHARSET=utf8mb4;
