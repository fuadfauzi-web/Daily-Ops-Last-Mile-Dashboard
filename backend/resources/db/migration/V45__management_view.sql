-- Management View (2026-10-01): manager/admin-only higher-level page. Backlog radar's
-- mitigation plan / rescue plan / deployment cost are manager-typed, not pulled from any
-- source -- one row per station, blank until someone fills it in. ptwh_count is here too
-- (manual) until it's confirmed whether Part Time Warehouse headcount has a real source.
CREATE TABLE station_notes (
    station_code  VARCHAR(20) NOT NULL PRIMARY KEY,
    mitigation_plan     TEXT NULL,
    rescue_plan         TEXT NULL,
    rescue_deployment_cost VARCHAR(100) NULL,
    ptwh_count          INT NULL,
    updated_by    VARCHAR(255) NULL,
    updated_at    DATETIME NULL
);
