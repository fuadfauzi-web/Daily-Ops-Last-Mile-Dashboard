-- 2026-10-08 (Activity tab): Action Board's new per-station counts, stored with the Shipper Watch snapshot like shipper_sla_warning / _breach.
--   shipper_sla_*_ovfd / _aash   the Shipper SLA warning / breach counts split by parcel status (On Vehicle for Delivery / Arrived at Sorting Hub)
--   aging_delivery_gt3           Aging Delivery parcels older than 3 days
--   aging_ats_gt7                Aging ATS parcels older than 7 days
--   rpu_aging_gt5                RPU parcels older than 5 days
--   missing_to_answer            open Active Missing parcels nobody at the station has answered yet
--   lost_to_answer               this week's Lost Declared parcels nobody has answered yet
ALTER TABLE shipper_watch
  ADD COLUMN shipper_sla_warning_ovfd INT NOT NULL DEFAULT 0,
  ADD COLUMN shipper_sla_warning_aash INT NOT NULL DEFAULT 0,
  ADD COLUMN shipper_sla_breach_ovfd INT NOT NULL DEFAULT 0,
  ADD COLUMN shipper_sla_breach_aash INT NOT NULL DEFAULT 0,
  ADD COLUMN aging_delivery_gt3 INT NOT NULL DEFAULT 0,
  ADD COLUMN aging_ats_gt7 INT NOT NULL DEFAULT 0,
  ADD COLUMN rpu_aging_gt5 INT NOT NULL DEFAULT 0,
  ADD COLUMN missing_to_answer INT NOT NULL DEFAULT 0,
  ADD COLUMN lost_to_answer INT NOT NULL DEFAULT 0;
