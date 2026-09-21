-- Settings -> Users: a Region/Zone/Station-scoped user can now be granted more
-- than one region/zone/station (e.g. a Region staff member covering 2 regions)
-- instead of exactly one. scope_value (single string) becomes scope_values (a
-- JSON array of strings), read/written as a Python list -- see auth.py's
-- CurrentUser.scope_values and main.py's _scope_filter_stations (now an `in`
-- membership test instead of equality). NULL/empty array when scope_type='all'.
ALTER TABLE users
    ADD COLUMN scope_values JSON NULL AFTER scope_value;

UPDATE users
    SET scope_values = JSON_ARRAY(scope_value)
    WHERE scope_value IS NOT NULL AND scope_value <> '';

ALTER TABLE users
    DROP COLUMN scope_value;
