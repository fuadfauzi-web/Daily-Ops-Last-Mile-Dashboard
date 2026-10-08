import { useEffect, useState } from "react";
import { api } from "./api";
import Skeleton from "./components/Skeleton";

// Superadmin -> Hypercare Settings (2026-10-08 feedback): the SLA of each High-Value shipper (Attempt: the parcel needs a valid attempt; Delivery:
// the parcel must be delivered -- each Same day / Next day / Within 2 days / Within 3 days) and, for the Special Handling shippers (Orca, Soda
// Express), the link to their guideline slides and a short note on the special flow. Everyone sees them on Hypercare Shippers; only the
// Superadmin changes them.
const selectClass = "h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-brand focus:outline-none";

export default function HypercareSettingsPanel() {
  const [config, setConfig] = useState(null);
  const [high, setHigh] = useState({}); // key -> { attempt_days, delivery_days }
  const [special, setSpecial] = useState({}); // key -> { guideline_url, guideline_note }
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = (c) => {
    setConfig(c);
    setHigh(Object.fromEntries(c.high_value.map((s) => [s.key, { attempt_days: s.attempt_days, delivery_days: s.delivery_days }])));
    setSpecial(Object.fromEntries(c.special.map((s) => [s.key, { guideline_url: s.guideline_url || "", guideline_note: s.guideline_note || "" }])));
  };

  useEffect(() => {
    api
      .hypercareConfig()
      .then(load)
      .catch((e) => setError(e.message));
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const items = [
        ...config.high_value.map((s) => ({ shipper_key: s.key, attempt_days: Number(high[s.key].attempt_days), delivery_days: Number(high[s.key].delivery_days) })),
        ...config.special.map((s) => ({ shipper_key: s.key, guideline_url: special[s.key].guideline_url, guideline_note: special[s.key].guideline_note })),
      ];
      load(await api.hypercareSettings(items));
      setSaved("Saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!config) return error ? <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div> : <Skeleton />;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-ink">High-Value Shippers — SLA</div>
        <p className="mt-1 text-xs text-slate-500">
          <b>SLA Attempt</b>: the parcel needs a valid attempt within the days. <b>SLA Delivery</b>: the parcel needs to be successfully delivered within the days.
          Counted from the parcel's first sweep at its current hub. Shown as notes on Hypercare Shippers → High-Value Shippers, which also flags parcels past them.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-1 pr-4 font-medium">Shipper</th>
                <th className="py-1 pr-4 font-medium">SLA Attempt</th>
                <th className="py-1 font-medium">SLA Delivery</th>
              </tr>
            </thead>
            <tbody>
              {config.high_value.map((s) => (
                <tr key={s.key} className="border-t border-slate-100">
                  <td className="py-2 pr-4 font-semibold text-ink">{s.label}</td>
                  {["attempt_days", "delivery_days"].map((field) => (
                    <td key={field} className="py-2 pr-4">
                      <select
                        className={selectClass}
                        value={high[s.key]?.[field] ?? 0}
                        onChange={(e) => setHigh((h) => ({ ...h, [s.key]: { ...h[s.key], [field]: Number(e.target.value) } }))}
                      >
                        {config.sla_options.map((o) => (
                          <option key={o.days} value={o.days}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-ink">Special Handling Shippers — guideline</div>
        <p className="mt-1 text-xs text-slate-500">The link to each shipper's slide deck and a short note on its special flow, shown on Hypercare Shippers → Special Handling Shippers.</p>
        <div className="mt-3 space-y-4">
          {config.special.map((s) => (
            <div key={s.key} className="space-y-1.5">
              <div className="font-semibold text-ink">{s.label}</div>
              <input
                value={special[s.key]?.guideline_url ?? ""}
                onChange={(e) => setSpecial((p) => ({ ...p, [s.key]: { ...p[s.key], guideline_url: e.target.value } }))}
                placeholder="Link to the guideline slides (https://…)"
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand focus:outline-none"
              />
              <textarea
                value={special[s.key]?.guideline_note ?? ""}
                onChange={(e) => setSpecial((p) => ({ ...p, [s.key]: { ...p[s.key], guideline_note: e.target.value } }))}
                placeholder="Short note on the special flow (optional)"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="h-9 rounded-lg bg-brand px-4 font-display text-xs font-semibold uppercase text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-status-good">{saved}</span>}
        {error && <span className="text-sm text-status-critical">{error}</span>}
      </div>
    </div>
  );
}
