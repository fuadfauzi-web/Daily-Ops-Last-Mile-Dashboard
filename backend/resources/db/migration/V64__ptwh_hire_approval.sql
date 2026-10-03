-- 2026-10-03: a NEW PTWH hire needs the Region Head's approval and then the Manager's before they can work (clock in, be scheduled, get an app login).
--   approval_status  'pending_rh' (waiting for the Region Head) -> 'pending_mgr' (waiting for a Manager / HOD) -> 'approved'; or 'rejected' at either step.
--                    Everyone already in the list (and everyone loaded from the PTWH DETAILS import, who are existing PTWH) is 'approved'.
--   a pending / rejected PTWH is kept inactive (active = 0) until the final approval switches them on.
-- created_by on the row is who asked for the hire.
ALTER TABLE ptwh_workers ADD COLUMN approval_status VARCHAR(12) NOT NULL DEFAULT 'approved';
ALTER TABLE ptwh_workers ADD COLUMN rh_by VARCHAR(255) NULL;
ALTER TABLE ptwh_workers ADD COLUMN rh_at DATETIME NULL;
ALTER TABLE ptwh_workers ADD COLUMN mgr_by VARCHAR(255) NULL;
ALTER TABLE ptwh_workers ADD COLUMN mgr_at DATETIME NULL;
ALTER TABLE ptwh_workers ADD COLUMN decision_note VARCHAR(300) NULL;
