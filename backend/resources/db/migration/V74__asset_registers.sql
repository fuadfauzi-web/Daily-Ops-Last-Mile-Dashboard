-- 2026-10-04: Fleet Admin -> Assets gets two more categories (Beta): Fire extinguisher and Weighing scale registers. One record per extinguisher batch / scale, per station
-- (a station can have several). Schema only -- production starts empty; the sample rows from the sheets are loaded by the app on the staging app only (backend/asset_lists.py).
CREATE TABLE fire_extinguishers (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  station        VARCHAR(100) NOT NULL,
  has_fe         TINYINT(1)   NOT NULL DEFAULT 1,
  quantity       INT          NULL,
  expiry_date    DATE         NULL,
  serial_numbers VARCHAR(500) NULL,
  vendor         VARCHAR(100) NULL,
  pic_name       VARCHAR(120) NULL,
  pic_phone      VARCHAR(60)  NULL,
  remarks        VARCHAR(500) NULL,
  updated_by     VARCHAR(255) NULL,
  updated_at     DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_fire_extinguishers_station (station)
);

CREATE TABLE weighing_scales (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  station         VARCHAR(100) NOT NULL,
  manufacturer    VARCHAR(120) NULL,
  last_calibrated DATE         NULL,
  expiry_date     DATE         NULL,
  reference_no    VARCHAR(80)  NULL,
  serial_no       VARCHAR(80)  NULL,
  cable           VARCHAR(20)  NULL,
  calibrated_by   VARCHAR(120) NULL,
  borang_d        VARCHAR(300) NULL,
  certificate     VARCHAR(300) NULL,
  remarks         VARCHAR(500) NULL,
  updated_by      VARCHAR(255) NULL,
  updated_at      DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_weighing_scales_station (station)
);
