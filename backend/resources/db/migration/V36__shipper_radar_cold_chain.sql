-- 2026-09-26: Shipper Radar -> Shipper SLA gets a Cold Chain shipper: 0 Attempt and Aging >D0, the same rule as Amway / Watson.
ALTER TABLE shipper_watch
  ADD COLUMN cold_chain_zero_attempt INT NOT NULL DEFAULT 0,
  ADD COLUMN cold_chain_aging INT NOT NULL DEFAULT 0;
