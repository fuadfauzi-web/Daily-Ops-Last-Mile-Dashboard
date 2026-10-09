-- 2026-10-09: Fujifilm (tracking numbers start FUJIF) joins the Hypercare Summary view with the same two numbers as Amway / Watson / Zitron / Ceva:
-- 0 Attempt and Aging >D0. hypercare_settings needs nothing: a row exists only for a shipper somebody edited, the code (hypercare.HIGH_VALUE) supplies the default SLA.
ALTER TABLE shipper_watch
  ADD COLUMN fujifilm_zero_attempt INT NOT NULL DEFAULT 0,
  ADD COLUMN fujifilm_aging INT NOT NULL DEFAULT 0;
