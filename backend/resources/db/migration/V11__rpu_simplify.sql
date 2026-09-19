-- RPU no longer persists a separate pivot per stage -- stage/shipper/age
-- filtering all happens at request time off the in-memory row cache (see
-- main.py). rpu_snapshot goes back to one simple nationwide total per
-- station. Dropped and recreated (rather than ALTERed) since this table has
-- no precious data -- it's a fully-regenerated hourly cache -- and the
-- combined DROP KEY/DROP COLUMN/ADD KEY in one ALTER TABLE is exactly the
-- kind of multi-clause statement OceanBase's MySQL-compat mode can choke on.

DROP TABLE IF EXISTS rpu_snapshot;

CREATE TABLE rpu_snapshot (
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
