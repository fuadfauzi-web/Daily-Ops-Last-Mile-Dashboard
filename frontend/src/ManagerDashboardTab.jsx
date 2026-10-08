import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Skeleton from "./components/Skeleton";
import TabBar from "./components/TabBar";
import DriverStrength from "./manager/DriverStrength";
import StationCapacity from "./manager/StationCapacity";
import Workspace from "./manager/Workspace";
import { ScopeBar, SourcesNote } from "./manager/shared";

// Manager Dashboard (2026-10-08): the Fleet Manager's own page, built from the "South Management" sheet -- Station Capacity and Driver Strength per station of their region (plan figures typed in
// here instead of the sheet), and a private workspace (links with due dates, notes). Only HOD and Manager open it; a Manager is limited to the region posted on their account.
// Numbers: Metabase feeds pulled by the app (drivers by type, active drivers) + the daily Station Health snapshot + Staff & Org Chart -- see backend/manager_dashboard.py.

const SUB_TABS = [
  { key: "capacity", label: "Station Capacity" },
  { key: "drivers", label: "Driver Strength" },
  { key: "workspace", label: "My Workspace" },
];

export default function ManagerDashboardTab() {
  const [sub, setSub] = useState("capacity");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState("");

  const load = () =>
    api
      .managerStations()
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const regions = useMemo(() => [...new Set((data?.rows || []).map((r) => r.region))].sort(), [data]);
  const rows = useMemo(() => (data ? data.rows.filter((r) => !region || r.region === region) : []), [data, region]);

  // Save one plan figure: update the row on screen straight away, ask the server, and put the server's answer (or the old value, on a failure) back.
  const savePlan = async (code, patch) => {
    const before = data.rows.find((r) => r.station_code === code);
    if (!before) return;
    const next = { ...before.plan, ...patch };
    setData((d) => ({ ...d, rows: d.rows.map((r) => (r.station_code === code ? { ...r, plan: next } : r)) }));
    try {
      const saved = await api.managerPlanSave(code, next);
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r.station_code === code ? { ...r, plan: saved } : r)) }));
    } catch (e) {
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r.station_code === code ? { ...r, plan: before.plan } : r)) }));
      setError(e.message);
    }
  };

  const errorBox = error && (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 text-sm text-status-critical ring-1 ring-slate-200">
      <span>{error}</span>
      <button onClick={() => setError(null)} className="shrink-0 text-xs text-slate-500 underline">
        Dismiss
      </button>
    </div>
  );

  if (!data && error) return <div className="space-y-3">{errorBox}<button onClick={() => { setError(null); load(); }} className="text-xs text-slate-500 underline">Try again</button></div>;
  if (!data) return <Skeleton rows={6} />;

  return (
    <div className="space-y-4">
      <TabBar tabs={SUB_TABS} activeKey={sub} onSelect={setSub} />
      {errorBox}
      {sub !== "workspace" && (
        <>
          <ScopeBar scope={data.scope} locked={data.locked} regions={regions} region={region} setRegion={setRegion} note={data.scope_note} />
          {sub === "capacity" && <StationCapacity data={data} rows={rows} savePlan={savePlan} canEdit={data.can_edit_plan} />}
          {sub === "drivers" && <DriverStrength data={data} rows={rows} savePlan={savePlan} canEdit={data.can_edit_plan} />}
          <SourcesNote sources={data.sources} today={data.today} />
        </>
      )}
      {sub === "workspace" && <Workspace setError={setError} />}
    </div>
  );
}
