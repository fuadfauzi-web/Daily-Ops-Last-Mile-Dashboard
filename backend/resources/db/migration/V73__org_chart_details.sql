-- 2026-10-03: what the org chart and the staff details need beyond access.
--  * users.job_title: the title shown on the chart ("Team Lead (Admin & Ops Support- LM)"), when it is more than the position;
--  * users.based_station: where a Region Head / RFS sits (the sheet's "St.Based"): they manage a zone but are based at a station;
--  * org_people: people who are on the chart but do NOT have dashboard access -- the HOO, the HOD, the Fleet Strategist, the Fleet Manager of Southern
--    (the owner keeps the Superadmin role but shows as the Southern Manager) and the Admin (LM) interns. branch says where they hang:
--    hoo | hod | strategist | region_manager (with region) | admin_support.
-- Mobile / employee ID for the Region Heads, RFS, Managers and the Fleet Admin team come from the MY - Fleet Management sheet; a value somebody already typed in is kept.
ALTER TABLE users
  ADD COLUMN job_title VARCHAR(80) NULL AFTER employee_id,
  ADD COLUMN based_station VARCHAR(100) NULL AFTER job_title;

CREATE TABLE org_people (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  title       VARCHAR(120) NULL,
  email       VARCHAR(255) NULL,
  phone       VARCHAR(40)  NULL,
  employee_id VARCHAR(30)  NULL,
  branch      VARCHAR(20)  NOT NULL,
  region      VARCHAR(40)  NULL,
  sort_no     INT          NULL,
  updated_by  VARCHAR(255) NULL,
  updated_at  DATETIME     NULL,
  PRIMARY KEY (id)
);

-- (data statement left out of the production release: it loads staging people / test data)

-- The two Admin (LM) interns are on the chart as people now, so their two vacant Fleet Admin seats (V60) go; the Fleet Admin headcount still adds up
-- (the interns count as people there).
-- (data statement left out of the production release: it loads staging people / test data)

-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
-- (data statement left out of the production release: it loads staging people / test data)
