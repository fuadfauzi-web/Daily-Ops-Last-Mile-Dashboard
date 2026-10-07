-- 2026-10-08 (Manager Dashboard, HOD + Fleet Manager only): the figures a manager types in, and their personal workspace.
--   manager_station_plan  the sheet's yellow cells per station: plan headcount, plan volume, drivers and riders required.
--   manager_links         a manager's own links with a category and a due date text ("Every 20th"); only the owner reads them.
--   manager_notes         one free-text notes page per manager.
CREATE TABLE manager_station_plan (
  station_code     VARCHAR(30)   NOT NULL,
  plan_headcount   INT           NULL,
  plan_vol         INT           NULL,
  driver_required  INT           NULL,
  rider_required   INT           NULL,
  updated_by       VARCHAR(255)  NULL,
  updated_at       DATETIME      NULL,
  PRIMARY KEY (station_code)
);

CREATE TABLE manager_links (
  id           BIGINT        NOT NULL AUTO_INCREMENT,
  owner_email  VARCHAR(255)  NOT NULL,
  category     VARCHAR(80)   NOT NULL DEFAULT '',
  title        VARCHAR(200)  NOT NULL,
  url          VARCHAR(1000) NOT NULL DEFAULT '',
  due_text     VARCHAR(120)  NOT NULL DEFAULT '',
  sort_order   INT           NOT NULL DEFAULT 0,
  created_at   DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_manager_links_owner (owner_email)
);

CREATE TABLE manager_notes (
  owner_email  VARCHAR(255)  NOT NULL,
  body         MEDIUMTEXT    NULL,
  updated_at   DATETIME      NULL,
  PRIMARY KEY (owner_email)
);
