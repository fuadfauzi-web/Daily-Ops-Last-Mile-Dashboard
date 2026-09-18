-- Expands the dashboard from Southern-only to nationwide (143 stations, 5 regions),
-- and adds a Region-level access tier plus six new per-station metrics that were
-- validated against the old Apps Script logic (see backend/aggregate.py).

ALTER TABLE station_metrics
    CHANGE COLUMN sub_region zone VARCHAR(20) NOT NULL,   -- e.g. 'South 1', 'East Coast 2', 'Zone B'
    MODIFY COLUMN region      VARCHAR(20) NOT NULL,        -- no longer defaults to 'Southern'
    ADD COLUMN total_fresh  INT NOT NULL DEFAULT 0 AFTER missing_open,
    ADD COLUMN age_gt3      INT NOT NULL DEFAULT 0 AFTER total_fresh,
    ADD COLUMN reschedule   INT NOT NULL DEFAULT 0 AFTER age_gt3,
    ADD COLUMN still_ovfd   INT NOT NULL DEFAULT 0 AFTER reschedule,
    ADD COLUMN prior_d0     INT NOT NULL DEFAULT 0 AFTER still_ovfd,
    ADD COLUMN prior_gt_d0  INT NOT NULL DEFAULT 0 AFTER prior_d0;

-- users.scope_type now allows 'region' (sees one whole region, e.g. Klang Valley) in
-- addition to 'all' | 'zone' (renamed from 'sub_region') | 'station'. No column change
-- needed (plain VARCHAR, validated in application code) -- this comment documents it.
