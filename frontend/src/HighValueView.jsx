import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import AgingDetailsTab from "./AgingDetailsTab";
import DataTable from "./components/DataTable";
import Skeleton from "./components/Skeleton";

// Hypercare Shippers -> High-Value Shippers (2026-10-08 feedback): Zalora NXD, Amway, Watson, Zitron (TN prefix ZTRON), Ceva (prefix LSGMY) and Fujifilm (prefix FUJIF).
// A one-line summary per shipper (parcels and how many break its SLA), then the picked shipper's parcels the way Cold Chain shows them: a
// station x age pivot and the tracking-number table (backend/hypercare.py), with the SLA columns. The SLAs -- Attempt (a valid attempt is
// needed) and Delivery (the parcel must be delivered), each Same day / Next day / Within 2 days / Within 3 days -- are set by the Superadmin.
export default function HighValueView({ regionFilter, zoneFilter, search, me, excludeEastMalaysia, refreshTick }) {
  const [config, setConfig] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [shipper, setShipper] = useState("zalora");

  useEffect(() => {
    api
      .hypercareConfig()
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, [refreshTick]);
  useEffect(() => {
    api
      .hypercareHighValue()
      .then(setOverview)
      .catch((e) => setError(e.message));
  }, [refreshTick]);

  const picked = useMemo(() => config?.high_value.find((s) => s.key === shipper), [config, shipper]);

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!config || !overview) return <Skeleton />;

  const columns = [
    { key: "label", label: "Shipper", sticky: true, align: "left", render: (r) => <b>{r.label}</b> },
    { key: "attempt_label", label: "SLA Attempt", sortable: false, className: () => "text-slate-600" },
    { key: "delivery_label", label: "SLA Delivery", sortable: false, className: () => "text-slate-600" },
    { key: "parcels", label: "Parcels", render: (r) => r.parcels.toLocaleString() },
    { key: "attempt_breach", label: "Attempt breached", render: (r) => r.attempt_breach.toLocaleString(), className: (r) => (r.attempt_breach > 0 ? "font-semibold text-status-critical" : "text-slate-400") },
    { key: "attempt_due_today", label: "Attempt due today", render: (r) => r.attempt_due_today.toLocaleString(), className: (r) => (r.attempt_due_today > 0 ? "font-semibold text-status-warning" : "text-slate-400") },
    { key: "delivery_breach", label: "Delivery breached", render: (r) => r.delivery_breach.toLocaleString(), className: (r) => (r.delivery_breach > 0 ? "font-semibold text-status-critical" : "text-slate-400") },
    { key: "delivery_due_today", label: "Delivery due today", render: (r) => r.delivery_due_today.toLocaleString(), className: (r) => (r.delivery_due_today > 0 ? "font-semibold text-status-warning" : "text-slate-400") },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        title={
          <>
            High-Value Shippers <span className="font-normal text-slate-400">— click a shipper for its parcels (everything in your scope)</span>
          </>
        }
        columns={columns}
        rows={overview.shippers}
        rowKey={(r) => r.key}
        rowClassName={(r) => (r.key === shipper ? "bg-rose-50" : "")}
        onRowClick={(r) => setShipper(r.key)}
        emptyMessage="No data yet."
      />

      {picked && (
        <div className="rounded-xl border-l-4 border-brand bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <div className="font-display text-sm font-bold text-ink">{picked.label} — SLA</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              <b>SLA Attempt: {picked.attempt_label}</b> — the parcel needs a valid attempt.
            </li>
            <li>
              <b>SLA Delivery: {picked.delivery_label}</b> — the parcel needs to be successfully delivered.
            </li>
          </ul>
          <p className="mt-1 text-xs text-slate-400">Counted from the parcel's first sweep at its current hub. Set by the Superadmin (Superadmin → Hypercare Settings).</p>
        </div>
      )}

      <AgingDetailsTab
        key={shipper}
        source="hypercare"
        shipper={shipper}
        regionFilter={regionFilter}
        zoneFilter={zoneFilter}
        search={search}
        me={me}
        excludeEastMalaysia={excludeEastMalaysia}
        refreshTick={refreshTick}
      />
    </div>
  );
}
