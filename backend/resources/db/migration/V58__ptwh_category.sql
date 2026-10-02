-- 2026-10-02: PTWH categories. The PTWH Monitoring template (PTWH Build / Setup tabs) merges the 7 labels the regions used into 4 standard
-- categories: C1 Core Shift - Inbound & Push-off, C2 Vacancy Cover - Short of Staff, C3 Leave & Rotation Cover, C4 Volume Surge / PM Support.
-- A category replaces the free "reason" the attendance sheet's justification column carried, so the day-level reason column is dropped
-- (nothing was recorded in it yet) and replaced by a category on the day record plus a default category on the worker.
ALTER TABLE ptwh_workers ADD COLUMN category VARCHAR(2) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN category VARCHAR(2) NULL;
ALTER TABLE ptwh_attendance DROP COLUMN reason;
