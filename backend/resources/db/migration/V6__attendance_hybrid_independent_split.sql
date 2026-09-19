-- Attendance is now tracked per position (Hybrid Driver/Rider, Independent
-- Driver/Rider) instead of one combined staff/independent count, so the
-- Routed View can show "1HD/9HR" style breakdowns.

ALTER TABLE routed_stations
    CHANGE COLUMN attendance_staff attendance_hd INT NOT NULL DEFAULT 0,
    ADD COLUMN attendance_hr INT NOT NULL DEFAULT 0 AFTER attendance_hd,
    CHANGE COLUMN attendance_independent attendance_id INT NOT NULL DEFAULT 0,
    ADD COLUMN attendance_ir INT NOT NULL DEFAULT 0 AFTER attendance_id;
