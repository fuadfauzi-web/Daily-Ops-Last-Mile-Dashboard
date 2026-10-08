-- 2026-10-08: Hypercare Shippers.
--  * Zitron (tracking numbers start ZTRON) and Ceva (start LSGMY) join the Summary view with the same two numbers as Amway / Watson:
--    0 Attempt and Aging >D0.
--  * hypercare_settings: what the Superadmin sets under Superadmin -> Hypercare Settings -- the SLA (days) of each High-Value shipper
--    (attempt / delivery) and the guideline link + note of each Special Handling shipper. A row exists only for a shipper someone has
--    edited; the code supplies the defaults. No data is inserted here.
ALTER TABLE shipper_watch
  ADD COLUMN zitron_zero_attempt INT NOT NULL DEFAULT 0,
  ADD COLUMN zitron_aging INT NOT NULL DEFAULT 0,
  ADD COLUMN ceva_zero_attempt INT NOT NULL DEFAULT 0,
  ADD COLUMN ceva_aging INT NOT NULL DEFAULT 0;

CREATE TABLE hypercare_settings (
  shipper_key    VARCHAR(30)  NOT NULL PRIMARY KEY,
  attempt_days   INT          DEFAULT NULL,
  delivery_days  INT          DEFAULT NULL,
  guideline_url  VARCHAR(500) DEFAULT NULL,
  guideline_note TEXT         DEFAULT NULL,
  updated_by     VARCHAR(255) DEFAULT NULL,
  updated_at     DATETIME     DEFAULT NULL
);
