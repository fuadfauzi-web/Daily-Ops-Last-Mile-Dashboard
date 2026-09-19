-- RPU no longer persists a separate pivot per stage -- stage/shipper/age
-- filtering all happens at request time off the in-memory row cache (see
-- main.py). rpu_snapshot goes back to one simple nationwide total per station.

ALTER TABLE rpu_snapshot
    DROP KEY idx_captured_type,
    DROP COLUMN type,
    ADD KEY idx_captured (captured_at);
