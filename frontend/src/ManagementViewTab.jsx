import { useEffect, useState } from "react";
import { api } from "./api";
import TabBar from "./components/TabBar";
import Skeleton from "./components/Skeleton";
import OperationHealth from "./management/OperationHealth";
import CapacityView from "./management/CapacityView";
import BacklogRadar from "./management/BacklogRadar";

// Management View (2026-10-01, reworked 2026-10-02): a higher-level page for managers / admins / HOD / COO -- operation health,
// capacity and backlog, nationwide, instead of the ground-staff detail the rest of the app is built for. It reuses what the app already
// captures: the daily Station Health + Route Monitoring + Shipment Details snapshot (/api/dod, current + last week), live Aging
// Details and Shipper Radar. Only Capacity's Hub Size / Staff (uploaded workbook) and the manager-keyed PTWH, parcel capacity and
// backlog plans are new data.
// LH drivers: Metabase question 127512 (movement_trips_enriched), uploaded by an admin; Redash's station-level LH Timing is the fallback.
// Open items: the Hybrid/Independent attendance split is only recorded from 2 Oct onward; "OPS" attendance isn't split out anywhere.

const SUB_TABS = [
  { key: "health", label: "Operation Health" },
  { key: "capacity", label: "Capacity" },
  { key: "backlog", label: "Backlog Radar" },
];

// The first refresh after midnight stores the new day with every number at 0 -- left in, it shows as an empty row and drags the
// weekday / weekend averages down, so a day with no routes and no attendance anywhere is dropped until real numbers arrive.
function withoutEmptyDays(dod) {
  const live = new Set();
  dod.rows.forEach((r) => {
    if ((r.metrics.total_routed || 0) > 0 || (r.metrics.attendance || 0) > 0) live.add(r.day);
  });
  return { ...dod, days: dod.days.filter((d) => live.has(d)), rows: dod.rows.filter((r) => live.has(r.day)) };
}

export default function ManagementViewTab({ me }) {
  const [sub, setSub] = useState("health");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    Promise.all([
      api.dod(), api.shipperWatch(), api.agingSummary("delivery"), api.agingSummary("ats"), api.agingSummary("zero_attempt"),
      api.dashboard(), api.managementCapacity(), api.managementNotes(), api.managementLhTrips(),
    ])
      .then(([dod, shipper, delivery, ats, zero, dashboard, capacity, notes, lhTrips]) =>
        setData({ dod: withoutEmptyDays(dod), shipper, aging: { delivery, ats, zero_attempt: zero }, dashboard, capacity, notes, lhTrips })
      )
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  if (error) {
    return (
      <div className="space-y-2 rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">
        {error}
        <div><button onClick={() => { setError(null); load(); }} className="text-xs text-slate-500 underline">Try again</button></div>
      </div>
    );
  }
  if (!data) return <Skeleton rows={6} />;

  return (
    <div className="space-y-4">
      <TabBar tabs={SUB_TABS} activeKey={sub} onSelect={setSub} />
      {sub === "health" && <OperationHealth dod={data.dod} shipper={data.shipper} aging={data.aging} lhTrips={data.lhTrips} me={me} reload={load} setError={setError} />}
      {sub === "capacity" && <CapacityView capacity={data.capacity} dod={data.dod} me={me} reload={load} setError={setError} />}
      {sub === "backlog" && <BacklogRadar dashboard={data.dashboard} notes={data.notes} reload={load} setError={setError} />}
    </div>
  );
}
