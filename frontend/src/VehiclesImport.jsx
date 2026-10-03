import { useMemo, useState } from "react";
import { api } from "./api";
import { parseVehiclesPaste } from "./lib/vehiclesImport";

// "Paste from sheet" for Vehicles (2026-10-03, staging): copy the rows (with the heading row) from the Master tab of the Master Vehicle Inventory sheet, check the
// preview, import. New plates are added, plates already in the app are updated with the cells that have something in them; a blank / N/A cell never wipes a value.
export default function VehiclesImport({ existing, onClose, onDone }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const have = useMemo(() => new Set(existing), [existing]);
  const rows = useMemo(() => parseVehiclesPaste(text), [text]);
  const good = rows.filter((r) => r.ok);
  const fresh = good.filter((r) => !have.has(r.plate)).length;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.vehicles.bulk({ rows: good.map((r) => r.row) }));
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">Paste from the sheet</div>
          <p className="text-xs text-slate-500">
            Copy the rows of the Master tab together with its heading row (VRN, Function, State, Station, TMS, Vehicle Type, Ownership, Driver, GDL / LICENSE EXPIRY DATE, the fuel and
            TnG card columns ...) and paste them below. Columns are found by their headings.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button>
      </div>

      {!result && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste rows here…" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" />
          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-medium text-ink">{rows.length} rows:</span>
                <span className="text-emerald-700">{fresh} new</span>
                <span className="text-sky-700">{good.length - fresh} already in the app</span>
                <span className="text-status-critical">{rows.length - good.length} skipped</span>
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-1 font-medium">Row</th>
                      <th className="px-2 py-1 font-medium"></th>
                      <th className="px-2 py-1 font-medium">Plate</th>
                      <th className="px-2 py-1 font-medium">What will be saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className="border-t border-slate-100 align-top">
                        <td className="px-2 py-1 text-slate-400">{r.line}</td>
                        <td className="px-2 py-1">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${!r.ok ? "bg-red-100 text-status-critical" : have.has(r.plate) ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {!r.ok ? "Skipped" : have.has(r.plate) ? "Update" : "New"}
                          </span>
                        </td>
                        <td className="px-2 py-1">{r.plate || r.label}</td>
                        <td className={`px-2 py-1 ${r.ok ? "text-slate-500" : "text-status-critical"}`}>{r.ok ? r.summary : r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={run} disabled={busy || good.length === 0} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                  {busy ? "Importing…" : `Import ${good.length} ${good.length === 1 ? "vehicle" : "vehicles"}`}
                </button>
                {error && <span className="text-sm text-status-critical">{error}</span>}
              </div>
            </>
          )}
        </>
      )}

      {result && (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-ink">Done: {result.added} added, {result.updated} updated{result.errors ? `, ${result.errors} refused` : ""}.</div>
          {result.errors > 0 && (
            <ul className="list-disc pl-5 text-xs text-status-critical">
              {result.results.filter((x) => x.status === "error").map((x) => <li key={x.plate}>{x.plate}: {x.detail}</li>)}
            </ul>
          )}
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button>
        </div>
      )}
    </div>
  );
}
