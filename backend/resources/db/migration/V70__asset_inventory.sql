-- 2026-10-03: station inventory (Fleet Admin -> Assets). One row per station and item: how many are good and how many damaged, with a remark. Loaded from the
-- zone workbooks in the 'Fleet Inventory' Drive folder (FL-SOUTH 1, 2, 4, FL-NORTH 1, FL-EAST COAST 2: one tab per station, 41 stations so far). From now on the
-- Fleet Admin team keeps it in the app (Fleet Admin -> Assets); the other stations start with the standard item list. N/A and non-number cells are stored as empty
-- (a text such as UNIFI goes into the remark). The tagging details further down each station tab (who holds which laptop / scanner) are not carried over yet.
CREATE TABLE asset_inventory (
  station    VARCHAR(100) NOT NULL,
  item       VARCHAR(120) NOT NULL,
  uom        VARCHAR(20)  NULL,
  good       INT          NULL,
  damaged    INT          NULL,
  remarks    VARCHAR(300) NULL,
  sort_no    INT          NULL,
  updated_by VARCHAR(255) NULL,
  updated_at DATETIME     NULL,
  PRIMARY KEY (station, item)
);

-- (data statement left out of the production release: it loads staging people / test data)
