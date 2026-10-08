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
INSERT INTO headcount_seats (station, designation, note, status, requested_by, requested_at, decided_by, decided_at) VALUES
  ('Kuching', 'fleet_assistant', 'Mohammad Syafiq Bin Sulaiman (email TBA)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('Setia Alam', 'fleet_assistant', 'Muhamad Asyraf Bin Muhamed Suzeli (email TBA)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('Kepong', 'fleet_assistant', 'Muhammad Ryan Merannto Bin Abdullah (email TBA)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW()),
  ('Chow Kit', 'fleet_assistant', 'Vacant (TBA)', 'approved', 'fuad.mawardi@ninjavan.co', NOW(), 'fuad.mawardi@ninjavan.co', NOW());
