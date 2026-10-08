# Developer Notes

## 2026-10-08 — Frontend automatic refresh failure handling

- **Scope:** Frontend only. Backend refresh/publication behavior was intentionally left unchanged.
- **Files changed:** `frontend/src/Dashboard.jsx`, `frontend/src/App.jsx`.
- Automatic dashboard refresh failures after the initial load no longer replace the valid dashboard data with the full error screen.
- The last successful dashboard data remains visible.
- A non-blocking warning is shown in the existing freshness area: **“Refresh failed — showing last successful data: [timestamp]”**.
- A subsequent successful refresh clears the warning and updates the freshness timestamp normally.
- Initial-load failures still use the existing error state.
- Different backend snapshot/table refresh versions remain allowed as previously designed.
- **Handoff for Claude:** treat this as an intentional frontend resilience fix; do not undo it while modifying unrelated dashboard refresh behavior.
