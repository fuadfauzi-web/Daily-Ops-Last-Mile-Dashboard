-- Shipment Details: how long between shipment_completion_datetime (column G,
-- when the TN arrives at the station) and 1st_dest_hub_sweep_after_shipment_
-- completion_datetime (column I, when it's actually scanned in) -- see
-- aggregate.py's build_shipment_details. Bucketed per station so it's clear
-- how many parcels cleared within the 1st hour, 2nd hour, 3rd hour, or took
-- longer (2026-09-24 feedback).
ALTER TABLE shipment_details
    ADD COLUMN process_within_1h INT NOT NULL DEFAULT 0 AFTER process_time_minutes,
    ADD COLUMN process_within_2h INT NOT NULL DEFAULT 0 AFTER process_within_1h,
    ADD COLUMN process_within_3h INT NOT NULL DEFAULT 0 AFTER process_within_2h,
    ADD COLUMN process_over_3h INT NOT NULL DEFAULT 0 AFTER process_within_3h;
