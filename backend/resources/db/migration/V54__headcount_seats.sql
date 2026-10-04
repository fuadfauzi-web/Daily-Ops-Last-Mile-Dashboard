-- 2026-10-02: headcount seats. A station's headcount = the people posted there (Staff & Org Chart) + its TBA seats: seats that are
-- planned, or held by someone whose email is not known yet. HOD / Superadmin add a seat straight away; a Manager's new seat waits
-- for HOD approval (status 'pending'); a seat can be removed by a Manager or HOD without approval. When a real person is added to
-- the station in that designation, one matching seat is used up.
CREATE TABLE headcount_seats (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  station      VARCHAR(100) NOT NULL,
  designation  VARCHAR(20)  NOT NULL,
  note         VARCHAR(200) NULL,
  status       VARCHAR(10)  NOT NULL DEFAULT 'approved',
  requested_by VARCHAR(255) NOT NULL,
  requested_at DATETIME     NOT NULL,
  decided_by   VARCHAR(255) NULL,
  decided_at   DATETIME     NULL,
  PRIMARY KEY (id)
);

-- The people on the Fleet Management sheet whose email is still TBA (and one vacant seat): headcount, as the Fleet Manager said.
-- (data statement left out of the production release: it loads staging people / test data)
