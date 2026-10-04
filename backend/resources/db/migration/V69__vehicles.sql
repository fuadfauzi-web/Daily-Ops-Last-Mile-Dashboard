-- 2026-10-03: vehicles (Fleet Admin tab). One row per plate, loaded from the 'Master' tab of the 'Master Vehicle Inventory - Last Mile / SDD' sheet
-- (189 vehicles). From now on the Fleet Admin team edits it in the app (Fleet Admin -> Vehicles) instead of the sheet. HQ staff and above can read
-- it, with the card numbers hidden until revealed; only the Fleet Admin team and the Superadmin edit. The sheet's 'Replace' and unnamed flag columns
-- and the second VRN column are not carried over. 'N/A' / TBA cells are stored as empty.
CREATE TABLE vehicles (
  plate           VARCHAR(20)  NOT NULL,
  vehicle_function VARCHAR(10) NULL,
  state           VARCHAR(30)  NULL,
  station_code    VARCHAR(10)  NULL,
  location_ns     VARCHAR(100) NULL,
  tms_route       VARCHAR(60)  NULL,
  status          VARCHAR(20)  NULL,
  vehicle_type    VARCHAR(40)  NULL,
  ownership       VARCHAR(100) NULL,
  driver          VARCHAR(120) NULL,
  hiring_label    VARCHAR(120) NULL,
  returned_van    VARCHAR(60)  NULL,
  license_doc_url VARCHAR(600) NULL,
  gdl_expiry      DATE         NULL,
  license_expiry  DATE         NULL,
  old_fuel_card   VARCHAR(40)  NULL,
  old_fuel_status VARCHAR(30)  NULL,
  new_fuel_card   VARCHAR(40)  NULL,
  new_fuel_status VARCHAR(40)  NULL,
  fuel_limit      DECIMAL(8,2) NULL,
  petronas_card   VARCHAR(40)  NULL,
  fuel_type       VARCHAR(20)  NULL,
  fuel_card_id    VARCHAR(40)  NULL,
  tng_card        VARCHAR(40)  NULL,
  tng_serial      VARCHAR(40)  NULL,
  tng_id          VARCHAR(40)  NULL,
  remarks         VARCHAR(500) NULL,
  admin_note      VARCHAR(500) NULL,
  updated_by      VARCHAR(255) NULL,
  updated_at      DATETIME     NULL,
  PRIMARY KEY (plate)
);

-- (data statement left out of the production release: it loads staging people / test data)
