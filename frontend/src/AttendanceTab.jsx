import { useState } from "react";
import TabBar from "./components/TabBar";
import PtwhAttendance from "./attendance/PtwhAttendance";

// Attendance (2026-10-02, staging, Beta): one tab for all attendance. PTWH is built first (clock in / out, month sheet, payable); Staff and Hybrid
// are placeholders until their turn -- Hybrid attendance already shows up inside KPI -> Hybrid Productivity (from Metabase), Staff will follow the
// Staff & Org Chart.
const SUB_TABS = [
  { key: "staff", label: "Staff" },
  { key: "hybrid", label: "Hybrid" },
  { key: "ptwh", label: "PTWH" },
];

const SOON = {
  staff: "Station staff (Station Heads and Fleet Assistants) attendance will live here, following the people in the Staff & Org Chart.",
  hybrid: "Hybrid driver attendance will live here. Until then the attendance days used for Hybrid productivity are in KPI -> Hybrid Productivity.",
};

export default function AttendanceTab({ me }) {
  const [sub, setSub] = useState("ptwh");
  return (
    <div className="space-y-4">
      <TabBar tabs={SUB_TABS} activeKey={sub} onSelect={setSub} />
      {sub === "ptwh" ? (
        <PtwhAttendance me={me} />
      ) : (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display font-semibold text-ink">Coming soon</div>
          <p className="mt-1">{SOON[sub]}</p>
        </div>
      )}
    </div>
  );
}
