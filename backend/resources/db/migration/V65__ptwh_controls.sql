-- 2026-10-04: tighter controls on PTWH.
--   QR on request     ptwh_qr_codes: a station asks for a QR for ONE named PTWH; it lasts 10 minutes, works once, and the next request for that station replaces it.
--                     (The old hourly QR from V59/V62 is gone.)
--   end date          ptwh_workers.end_date: the last day they work. After it (or after 30 days with no clock in / out) a PTWH goes inactive -- no clocking, no app login,
--                     no schedule -- and inactive_since starts a 60-day timer, after which their personal data is cleared (cleaned_at). Coming back is a re-hire: the same
--                     Region Head + Manager approval as a new hire, at whichever station they come back to.
--   corrections       ptwh_corrections: every manual change to a clock record is a request with a reason, kept for good (old / new times, who, who decided). A change within
--                     30 minutes of the original is applied at once and logged; anything bigger, a missing day, or a void waits for a Region Head / RFS / Manager. While a
--                     correction is pending the day's pay is on hold. ptwh_attendance.voided replaces deleting a record.
CREATE TABLE ptwh_qr_codes (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  station     VARCHAR(100)  NOT NULL,
  worker_id   BIGINT        NOT NULL,
  code        VARCHAR(20)   NOT NULL,
  status      VARCHAR(12)   NOT NULL DEFAULT 'active',
  issued_by   VARCHAR(255)  NOT NULL,
  issued_at   DATETIME      NOT NULL,
  expires_at  DATETIME      NOT NULL,
  used_at     DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ptwh_qr_code (code),
  KEY idx_ptwh_qr_station (station, status)
);

ALTER TABLE ptwh_workers ADD COLUMN end_date DATE NULL;
ALTER TABLE ptwh_workers ADD COLUMN inactive_since DATE NULL;
ALTER TABLE ptwh_workers ADD COLUMN inactive_reason VARCHAR(100) NULL;
ALTER TABLE ptwh_workers ADD COLUMN cleaned_at DATETIME NULL;
-- People already marked inactive start their 60-day clock today.
UPDATE ptwh_workers SET inactive_since = CURDATE(), inactive_reason = 'Made inactive before end dates existed' WHERE active = 0 AND approval_status IN ('approved', 'rejected') AND inactive_since IS NULL;

ALTER TABLE ptwh_attendance ADD COLUMN voided TINYINT NOT NULL DEFAULT 0;

CREATE TABLE ptwh_corrections (
  id            BIGINT        NOT NULL AUTO_INCREMENT,
  kind          VARCHAR(8)    NOT NULL,
  worker_id     BIGINT        NOT NULL,
  work_date     DATE          NOT NULL,
  record_id     BIGINT        NULL,
  old_in        DATETIME      NULL,
  old_out       DATETIME      NULL,
  new_in        DATETIME      NULL,
  new_out       DATETIME      NULL,
  reason        VARCHAR(300)  NOT NULL,
  status        VARCHAR(10)   NOT NULL,
  auto_applied  TINYINT       NOT NULL DEFAULT 0,
  requested_by  VARCHAR(255)  NOT NULL,
  requested_at  DATETIME      NOT NULL,
  decided_by    VARCHAR(255)  NULL,
  decided_at    DATETIME      NULL,
  decision_note VARCHAR(300)  NULL,
  PRIMARY KEY (id),
  KEY idx_ptwh_corr_day (worker_id, work_date, status),
  KEY idx_ptwh_corr_status (status, requested_at)
);
