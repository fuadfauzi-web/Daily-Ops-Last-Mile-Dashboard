-- 2026-10-10: Superadmin -> Access Setting. Custom (department-specific) roles and per-module Beta availability. role_access (V80/V87) keeps the per-role module settings;
-- its module "*" row now means "the role's default for every module without its own setting" (none = an allow-list role).
-- access_roles: roles the Superadmin created. The built-in positions stay in code (auth.POSITIONS) and keep working exactly as before. `tier` is the base level the role works as
-- (hq_staff / region / station): it decides what its pages let it do and the data scope it takes. Loaded into auth.CUSTOM_POSITIONS (role_access.ensure_roles).
CREATE TABLE access_roles (
  role_key    VARCHAR(20)   NOT NULL,
  label       VARCHAR(80)   NOT NULL,
  tier        VARCHAR(12)   NOT NULL,
  department  VARCHAR(100)  NULL,
  created_by  VARCHAR(255)  NULL,
  created_at  DATETIME      NULL,
  PRIMARY KEY (role_key)
);

-- module_beta: a Beta module / sub-module switched ON or OFF for everyone but the Superadmin. No row = ON (as shipped), so nothing changes until the Superadmin switches one off.
CREATE TABLE module_beta (
  module      VARCHAR(40)   NOT NULL,
  enabled     TINYINT       NOT NULL DEFAULT 1,
  updated_by  VARCHAR(255)  NULL,
  updated_at  DATETIME      NULL,
  PRIMARY KEY (module)
);
