"""What this deployment has released (2026-10-04). Production gets the People / Recovery-Beta modules one at a time, in the user's order
(Staff & Org Chart, Attendance, Fleet Admin, Recovery Beta): flip the constant here AND the matching flag in frontend/src/lib/features.js, then
redeploy. Staging (APP_URL contains "-staging") always has everything on, so staging behaves as before."""
import os

STAGING = "-staging" in (os.environ.get("APP_URL") or "")

STAFF_DIRECTORY = STAGING or False  # /api/staff, /api/org-chart (they list people's emails / phones)
RECOVERY_BETA = STAGING or False  # /api/recovery-cases (PDCNR / Damage / No Label from Hub)
