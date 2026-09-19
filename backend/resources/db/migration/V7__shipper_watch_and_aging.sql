-- Backs the new Shipper Watch and Aging Details tabs. Like shipment_details/
-- routed_stations, these are hourly snapshots at station+zone+region level;
-- tracking-number drilldowns stay in-memory only (see main.py).

CREATE TABLE shipper_watch (
    id                      BIGINT       NOT NULL AUTO_INCREMENT,
    captured_at             DATETIME     NOT NULL,
    station_code            VARCHAR(20)  NOT NULL,
    station_name            VARCHAR(100) NOT NULL,
    zone                    VARCHAR(20)  NOT NULL,
    region                  VARCHAR(20)  NOT NULL,
    amway_zero_attempt      INT          NOT NULL DEFAULT 0,
    amway_aging             INT          NOT NULL DEFAULT 0,
    watson_zero_attempt     INT          NOT NULL DEFAULT 0,
    watson_aging            INT          NOT NULL DEFAULT 0,
    orca_ovfd               INT          NOT NULL DEFAULT 0,
    orca_other              INT          NOT NULL DEFAULT 0,
    zalora_zero_attempt     INT          NOT NULL DEFAULT 0,
    zalora_ovfd             INT          NOT NULL DEFAULT 0,
    zalora_other            INT          NOT NULL DEFAULT 0,
    restock_bundles         INT          NOT NULL DEFAULT 0,
    restock_pieces          INT          NOT NULL DEFAULT 0,
    restock_potential_breach INT         NOT NULL DEFAULT 0,
    restock_breach          INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_captured (captured_at),
    KEY idx_station (station_code, captured_at)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE aging_details (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    captured_at  DATETIME     NOT NULL,
    station_code VARCHAR(20)  NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    zone         VARCHAR(20)  NOT NULL,
    region       VARCHAR(20)  NOT NULL,
    total        INT          NOT NULL DEFAULT 0,
    age_0        INT          NOT NULL DEFAULT 0,
    age_1        INT          NOT NULL DEFAULT 0,
    age_2        INT          NOT NULL DEFAULT 0,
    age_3        INT          NOT NULL DEFAULT 0,
    age_4_6      INT          NOT NULL DEFAULT 0,
    age_7_plus   INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_captured (captured_at),
    KEY idx_station (station_code, captured_at)
) DEFAULT CHARSET=utf8mb4;
