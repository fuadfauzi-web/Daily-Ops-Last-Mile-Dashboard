import { useState } from "react";
import PremisesTab from "./PremisesTab";
import VehiclesTab from "./VehiclesTab";
import AssetsTab from "./AssetsTab";
import BetaTag from "./components/BetaTag";

// "Fleet Admin" (2026-10-02, staging): the Fleet Admin team's own working area -- the lists they used to keep in Google Sheets, now kept here. Premises first;
// Vehicles and Assets follow. HQ staff and above can read it; only the Fleet Admin role edits. (Staff & Org Chart has its own tab.)
const SECTIONS = [
  { key: "premises", label: "Premises", Component: PremisesTab },
  { key: "vehicles", label: "Vehicles", Component: VehiclesTab },
  { key: "assets", label: "Assets", Component: AssetsTab },
];

export default function FleetAdminTab({ me }) {
  const [section, setSection] = useState(SECTIONS[0].key);
  const Active = SECTIONS.find((s) => s.key === section)?.Component;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">Fleet Admin <BetaTag /></h2>
          <p className="text-xs text-slate-500">Beta: still being set up and not live yet. Only the Fleet Admin team edits it.</p>
        </div>
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
