-- 2026-10-03: the station QR code is now an EMERGENCY fallback for the PTWH app (location is how people normally clock in). A clock by QR needs a reason, which is kept
-- here, and is put in the audit queue with flag_status = 'review' ("needs review") until an auditor marks it Checked OK or flags it.
-- Station locations now come from the Fleet Admin team's Premises (premises.latitude / longitude) and the radius is fixed at 100 m for every station, so the
-- ptwh_station_geo table from V59 is no longer used.
ALTER TABLE ptwh_attendance ADD COLUMN in_reason VARCHAR(200) NULL;
ALTER TABLE ptwh_attendance ADD COLUMN out_reason VARCHAR(200) NULL;
