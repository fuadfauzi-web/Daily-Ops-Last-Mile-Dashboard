import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import TabBar from "./components/TabBar";
import PtwhAttendance from "./attendance/PtwhAttendance";
import ScheduleView from "./attendance/ScheduleView";
import StaffAttendance from "./attendance/StaffAttendance";

// Attendance (2026-10-02, staging, Beta): one tab for all attendance. PTWH is built first (clock in / out, month sheet, payable); Staff and Hybrid attendance
// are placeholders until their turn -- Hybrid attendance already shows up inside KPI -> Hybrid Productivity (from Metabase), Staff will follow the Staff & Org
// Chart. Schedule is shared by all three groups: who works which shift, edited by Station Heads, Region Heads and Managers.
// A banner tells Station Heads / Region Heads / Managers when PTWH QR (emergency) clocks are waiting for review.
const SUB_TABS = [
  { key: "staff", label: "Staff" },
  { key: "hybrid", label: "Hybrid" },
  { key: "ptwh", label: "PTWH" },
  { key: "schedule", label: "Schedule" },
];

const SOON = {
  hybrid: "Hybrid driver attendance will live here. Until then the attendance days used for Hybrid productivity are in KPI -> Hybrid Productivity. Hybrid drivers' schedule is already in the Schedule tab.",
};

export default function AttendanceTab({ me }) {
  const [sub, setSub] = useState("ptwh");
  const [review, setReview] = useState(0);
  const [approvals, setApprovals] = useState(0);
  const [corrections, setCorrections] = useState(0);
  const [goView, setGoView] = useState(null); // {view, n} -- asks the PTWH tab to show its Audit / Workers view

  const loadReview = useCallback(() => {
    api.notifications().then((n) => { setReview(n.ptwh_review || 0); setApprovals(n.ptwh_approvals || 0); setCorrections(n.ptwh_corrections || 0); }).catch(() => {});
  }, []);
  useEffect(() => {
    loadReview();
    window.addEventListener("ptwh-review-changed", loadReview);
    return () => window.removeEventListener("ptwh-review-changed", loadReview);
  }, [loadReview]);

  return (
    <div className="space-y-4">
      {approvals > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-200">
          <span><strong>{approvals} new PTWH hire{approvals === 1 ? "" : "s"} waiting for your approval.</strong> They can't work, be scheduled or get an app login until the Region Head and then a Manager approve.</span>
          <button onClick={() => { setSub("ptwh"); setGoView({ view: "workers", n: Date.now() }); }} className="rounded-md bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white">Open Workers</button>
        </div>
      )}
      {corrections > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-200">
          <span><strong>{corrections} PTWH clock correction{corrections === 1 ? "" : "s"} waiting for your approval.</strong> The pay for {corrections === 1 ? "that day is" : "those days is"} on hold until you approve or reject {corrections === 1 ? "it" : "them"}.</span>
          <button onClick={() => { setSub("ptwh"); setGoView({ view: "corrections", n: Date.now() }); }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white">Open Corrections</button>
        </div>
      )}
      {review > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <span>
            <strong>{review} PTWH clock{review === 1 ? "" : "s"} by QR code {review === 1 ? "is" : "are"} ready for review.</strong> QR is for emergencies only -- check the selfie and the reason;
            the pay for {review === 1 ? "that day is" : "those days is"} on hold until you mark {review === 1 ? "it" : "them"} Checked OK.
          </span>
          <button onClick={() => { setSub("ptwh"); setGoView({ view: "audit", n: Date.now() }); }} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white">Open Audit</button>
        </div>
      )}
      <TabBar tabs={SUB_TABS} activeKey={sub} onSelect={setSub} />
      {sub === "ptwh" ? (
        <PtwhAttendance me={me} requestView={goView} />
      ) : sub === "staff" ? (
        <StaffAttendance />
      ) : sub === "schedule" ? (
        <ScheduleViewWrapper />
      ) : (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display font-semibold text-ink">Coming soon</div>
          <p className="mt-1">{SOON[sub]}</p>
        </div>
      )}
    </div>
  );
}

// Schedule keeps its own error line, like the PTWH views do.
function ScheduleViewWrapper() {
  const [error, setError] = useState(null);
  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}
      <ScheduleView setError={setError} />
    </div>
  );
}
