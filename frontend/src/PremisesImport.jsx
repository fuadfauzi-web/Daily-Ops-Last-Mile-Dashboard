import { useMemo, useState } from "react";
import { api } from "./api";
import { parsePremisesPaste } from "./lib/premisesImport";

// "Paste from sheet" for Premises (2026-10-02, staging): copy the rows (with the heading row) from the Address tab of the Fleet Management sheet, check the
// preview, import. Only the cells that have something in them are saved -- a blank, TBA or N/A cell never wipes what is already in the app.
export default function PremisesImport({ stations, onClose, onDone }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const rows = useMemo(() => parsePremisesPaste(text, { stations }), [text, stations]);
  const good = rows.filter((r) => r.ok);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.premises.bulk({ rows: good.map((r) => r.row) }));
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
            Copy the rows of the Address tab together with its heading row (Station, Address, Latlong, SQFT, Launched Date, Expiring Date, Terminate Date, Rental,
            Deposit, Document, Remarks ...) and paste them below. Columns are found by their headings; stations are matched by name.
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
                <span className="text-emerald-700">{good.length} to save</span>
                <span className="text-status-critical">{rows.length - good.length} skipped</span>
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-1 font-medium">Row</th>
                      <th className="px-2 py-1 font-medium"></th>
                      <th className="px-2 py-1 font-medium">Station</th>
                      <th className="px-2 py-1 font-medium">What will be saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className="border-t border-slate-100 align-top">
                        <td className="px-2 py-1 text-slate-400">{r.line}</td>
                        <td className="px-2 py-1">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${r.ok ? "bg-sky-100 text-sky-800" : "bg-red-100 text-status-critical"}`}>{r.ok ? "Save" : "Skipped"}</span>
                        </td>
                        <td className="px-2 py-1">{r.station || r.label}</td>
                        <td className={`px-2 py-1 ${r.ok ? "text-slate-500" : "text-status-critical"}`}>{r.ok ? r.summary : r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={run} disabled={busy || good.length === 0} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                  {busy ? "Importing…" : `Import ${good.length} ${good.length === 1 ? "station" : "stations"}`}
                </button>
                {error && <span className="text-sm text-status-critical">{error}</span>}
              </div>
            </>
          )}
        </>
      )}

      {result && (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-ink">Done: {result.updated + result.added} saved{result.errors ? `, ${result.errors} refused` : ""}.</div>
          {result.errors > 0 && (
            <ul className="list-disc pl-5 text-xs text-status-critical">
              {result.results.filter((x) => x.status === "error").map((x) => <li key={x.station}>{x.station}: {x.detail}</li>)}
            </ul>
          )}
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button>
        </div>
      )}
    </div>
  );
}
