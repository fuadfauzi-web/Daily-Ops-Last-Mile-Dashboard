-- 2026-10-08: Superadmin -> Role Access. The Superadmin can narrow what a role (position) may do in a module (a menu page): level 'none' (the page is hidden and its API refused),
-- 'view' (read only: every change is refused) -- 'edit' is what the module allows today and is stored as NO row. An optional scope (region / zone / station values) narrows the data that
-- role sees in that module to places inside it. Only deliberate overrides are stored; no row = behaviour as before. The Superadmin is never restricted. role_access.py reads this table
-- (cached for 30 seconds, dropped when it is saved) in auth.get_current_user, so every endpoint of every module follows it.
CREATE TABLE role_access (
  position      VARCHAR(30)   NOT NULL,
  module        VARCHAR(40)   NOT NULL,
  level         VARCHAR(10)   NOT NULL,
  scope_type    VARCHAR(10)   NULL,
  scope_values  TEXT          NULL,
  updated_by    VARCHAR(255)  NULL,
  updated_at    DATETIME      NULL,
  PRIMARY KEY (position, module)
);
