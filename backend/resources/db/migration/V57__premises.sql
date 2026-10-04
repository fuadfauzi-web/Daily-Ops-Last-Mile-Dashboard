-- 2026-10-02: premises (Fleet Admin tab). One row per station: address, size, launch date, business licence and tenancy dates, rent, deposit,
-- document links. Loaded from the MY - Fleet Management sheet's 'Address' tab; from now on the Fleet Admin team edits it in the app
-- (Fleet Admin -> Premises) instead of the sheet. Rent / deposit are visible to HQ staff and above only.
-- 'Expires In' columns of the sheet are not stored: the app works the days left out from the dates.
CREATE TABLE premises (
  station          VARCHAR(100) NOT NULL,
  station_code     VARCHAR(20)  NULL,
  address          VARCHAR(500) NULL,
  latitude         DOUBLE       NULL,
  longitude        DOUBLE       NULL,
  sqft             DOUBLE       NULL,
  launched_date    DATE         NULL,
  license_expiry   DATE         NULL,
  license_doc_url  VARCHAR(600) NULL,
  tenancy_end      DATE         NULL,
  rental           DECIMAL(12,2) NULL,
  deposit          DECIMAL(12,2) NULL,
  tenancy_doc_urls TEXT         NULL,
  remarks          VARCHAR(1000) NULL,
  chat_url         VARCHAR(600) NULL,
  contract_ref     VARCHAR(60)  NULL,
  updated_by       VARCHAR(255) NULL,
  updated_at       DATETIME     NULL,
  PRIMARY KEY (station)
);

-- (data statement left out of the production release: it loads staging people / test data)
