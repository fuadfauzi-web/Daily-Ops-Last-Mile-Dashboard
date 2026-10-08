-- 2026-10-08: Users get a Department (Last Mile, Restock, Recovery ...). The Superadmin keeps the list of departments, and which roles (positions) belong to each, on the
-- Superadmin -> Departments tab; the Users page offers only those roles once a department is picked. roles is a JSON list of positions (auth.POSITIONS); an empty list means "no restriction".
CREATE TABLE departments (
  name        VARCHAR(100)  NOT NULL,
  roles       TEXT          NULL,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_by  VARCHAR(255)  NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (name)
);

ALTER TABLE users ADD COLUMN department VARCHAR(100) NULL;

INSERT INTO departments (name, roles, sort_order, created_by) VALUES
  ('Last Mile', '["hod","manager","fleet_admin","region_head","rfs","station_head","fleet_assistant"]', 1, 'system'),
  ('Restock', '["restock"]', 2, 'system'),
  ('Recovery', '["recovery"]', 3, 'system');

UPDATE users SET department = 'Last Mile' WHERE role IN ('hod','manager','fleet_admin','region_head','rfs','station_head','fleet_assistant','region','station') AND department IS NULL;
UPDATE users SET department = 'Restock' WHERE role = 'restock' AND department IS NULL;
UPDATE users SET department = 'Recovery' WHERE role = 'recovery' AND department IS NULL;
