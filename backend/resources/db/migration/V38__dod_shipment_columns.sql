-- 2026-09-26 (staging): the DoD Daily View also shows Shipment Details' Fresh Unscan and Latlong.
ALTER TABLE dod_daily
  ADD COLUMN fresh_unscan DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN latlong DOUBLE NOT NULL DEFAULT 0;
