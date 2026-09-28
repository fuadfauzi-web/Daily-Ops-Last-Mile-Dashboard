-- 2026-09-28: the DoD Daily View also shows Shipment Details' LH Timing (1st / 2nd line-haul trip), same columns as shipment_details.
ALTER TABLE dod_daily
  ADD COLUMN lh_trip1_time    VARCHAR(40) DEFAULT NULL,
  ADD COLUMN lh_trip1_parcels INT         DEFAULT NULL,
  ADD COLUMN lh_trip2_time    VARCHAR(40) DEFAULT NULL,
  ADD COLUMN lh_trip2_parcels INT         DEFAULT NULL;
