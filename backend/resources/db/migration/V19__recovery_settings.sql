-- Admin-editable "high value" highlighting rule for Recovery -> Missing
-- Details (see aggregate.py's build_missing_details). Singleton row (id
-- always 1) -- there's only ever one nationwide setting, no per-region
-- override needed for this.
CREATE TABLE recovery_settings (
  id TINYINT NOT NULL PRIMARY KEY,
  high_cod_value_threshold DOUBLE NOT NULL DEFAULT 100,
  high_value_item_keywords TEXT NOT NULL,
  changed_by VARCHAR(255) NULL,
  changed_at DATETIME NULL
);

INSERT INTO recovery_settings (id, high_cod_value_threshold, high_value_item_keywords) VALUES
  (1, 100, 'smartphone,iphone,samsung,macbook,laptop,tablet,ipad,camera,drone,watch,playstation,xbox,console,jewellery,jewelry,gold');
