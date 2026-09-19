-- Routed View's "Pending in Yesterday Route" sub-tab: a snapshot of everything
-- still On Vehicle for Delivery, captured once daily just after 02:00 Malaysia
-- time and held static until the next day's capture (see main.py's
-- _maybe_capture_pending_yesterday_route). Persisted (not just in-memory like
-- Old Route/Aging's TN caches) because it must survive a pod restart mid-day --
-- an in-memory-only cache would go blank until the next 02:00 capture if the app
-- redeployed at, say, 2pm.
CREATE TABLE pending_yesterday_route (
  captured_at DATETIME NOT NULL,
  captured_for_date DATE NOT NULL,
  station_code VARCHAR(32) NOT NULL,
  station_name VARCHAR(128) NOT NULL,
  zone VARCHAR(64) NOT NULL,
  region VARCHAR(64) NOT NULL,
  total_tn INT NOT NULL DEFAULT 0,
  PRIMARY KEY (captured_for_date, station_code)
);

CREATE TABLE pending_yesterday_route_tns (
  captured_for_date DATE NOT NULL,
  tracking_number VARCHAR(64) NOT NULL,
  station_code VARCHAR(32) NOT NULL,
  station_name VARCHAR(128) NOT NULL,
  zone VARCHAR(64) NOT NULL,
  region VARCHAR(64) NOT NULL,
  dest_hub VARCHAR(32) NULL,
  age DOUBLE NULL,
  attempts INT NULL,
  PRIMARY KEY (captured_for_date, tracking_number)
);
