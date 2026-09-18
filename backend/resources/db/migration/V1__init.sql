-- Flyway migration (OceanBase / MySQL dialect). All DDL lives here, never in code.

CREATE TABLE users (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    email        VARCHAR(255) NOT NULL,
    role         VARCHAR(20)  NOT NULL DEFAULT 'station',   -- 'admin' | 'manager' | 'station'
    scope_type   VARCHAR(20)  NOT NULL DEFAULT 'station',   -- 'all' | 'sub_region' | 'station'
    scope_value  VARCHAR(100) DEFAULT NULL,                 -- e.g. 'South 1' or 'Larkin'; NULL when scope_type='all'
    display_name VARCHAR(255) DEFAULT NULL,
    invited_by   VARCHAR(255) DEFAULT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_email (email)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE station_metrics (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    captured_at   DATETIME     NOT NULL,
    station_code  VARCHAR(20)  NOT NULL,
    station_name  VARCHAR(100) NOT NULL,
    sub_region    VARCHAR(20)  NOT NULL,
    region        VARCHAR(20)  NOT NULL DEFAULT 'Southern',
    total_in_hub  INT          NOT NULL DEFAULT 0,
    zero_attempt  INT          NOT NULL DEFAULT 0,
    on_hold       INT          NOT NULL DEFAULT 0,
    missing_open  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_captured (captured_at),
    KEY idx_station (station_code, captured_at)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE refresh_log (
    id             BIGINT      NOT NULL AUTO_INCREMENT,
    started_at     DATETIME    NOT NULL,
    finished_at    DATETIME    DEFAULT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'running',  -- 'running' | 'ok' | 'error'
    stations_count INT         DEFAULT NULL,
    error_message  TEXT        DEFAULT NULL,
    triggered_by   VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARSET=utf8mb4;

-- Seed the first admin so there's a way into the admin panel after first deploy.
INSERT INTO users (email, role, scope_type, scope_value, display_name)
VALUES ('fuad.mawardi@ninjavan.co', 'admin', 'all', NULL, 'Fuad Mawardi');
