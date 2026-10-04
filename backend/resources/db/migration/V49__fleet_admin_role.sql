-- 2026-10-02: Fleet Admin is its own role ("fleet_admin"), not a Manager. V47 loaded the four Fleet Admin / support people
-- as Manager (scope: everything); they become Fleet Admin, still seeing every region. Only rows that are still exactly what
-- V47 created are touched, so anyone whose role was changed by hand in Settings -> Users since is left alone.
-- (data statement left out of the production release: it loads staging people / test data)
SELECT 1;
