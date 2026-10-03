import { useState } from "react";
import PremisesTab from "./PremisesTab";
import VehiclesTab from "./VehiclesTab";

// "Fleet Admin" (2026-10-02, staging): the Fleet Admin team's own working area -- the lists they used to keep in Google Sheets, now kept here. Premises first;
// Vehicles and Assets follow. HQ staff and above can read it; the Fleet Admin team and the Superadmin edit. (Staff & Org Chart has its own tab.)
const SECTIONS = [
  { key: "premises", label: "Premises", Component: PremisesTab },
  { key: "vehicles", label: "Vehicles", Component: VehiclesTab },
];

export default function FleetAdminTab({ me }) {
  const [section, setSection] = useState(SECTIONS[0].key);
  const Active = SECTIONS.find((s) => s.key === section)?.Component;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Fleet Admin</h2>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setSection(s.key)} className={`px-3 py-1.5 ${section === s.key ? "bg-ink text-white" : "text-slate-500"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {Active && <Active me={me} />}
    </div>
  );
}
