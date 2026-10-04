import { useMemo, useState } from "react";
import { api } from "./api";
import { positionLabel } from "./lib/roles";
import { parseStaffPaste } from "./lib/staffImport";

// "Paste from sheet" (2026-10-02, staging): paste rows copied from the Fleet Management sheet (or a CSV), check the preview, import.
// New emails are added, emails already in the list are updated (position, posting, name, phone, employee ID -- access follows the
// posting unless it was set by hand). A row that can't be read is shown with the reason and skipped; the rest still go in.
const STATUS = { add: ["New", "bg-emerald-100 text-emerald-800"], update: ["Update", "bg-sky-100 text-sky-800"], error: ["Skipped", "bg-red-100 text-status-critical"] };

export default function StaffImport({ people, stations, regions, onClose, onDone }) {
  const [text, setText] = useState("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const rows = useMemo(
    () => parseStaffPaste(text, { stations, regions, existing: (people || []).map((p) => p.email) }),
    [text, stations, regions, people]
  );
  const good = rows.filter((r) => r.ok && (updateExisting || r.status === "add"));
  const counts = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await api.staff.bulk({ rows: good.map((r) => r.row), update_existing: updateExisting });
      setResult(out);
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
            Copy the rows from the Fleet Management sheet (with the header row) and paste them below. Columns are found by their headings: Email, Name,
            Designation, Station (or Zone / Region), Mobile, Employee ID. Without a header row the order is Name, Email, Position, Place, Mobile, Employee ID.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button>
      </div>

      {!result && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste rows here…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" />
          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-medium text-ink">{rows.length} rows:</span>
                <span className="text-emerald-700">{counts.add || 0} new</span>
                <span className="text-sky-700">{counts.update || 0} already in the list</span>
                <span className="text-status-critical">{counts.error || 0} skipped</span>
                <label className="ml-auto flex items-center gap-1.5 font-medium text-slate-600">
                  <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
                  Update people already in the list
                </label>
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-1 font-medium">Row</th>
                      <th className="px-2 py-1 font-medium"></th>
                      <th className="px-2 py-1 font-medium">Name</th>
                      <th className="px-2 py-1 font-medium">Email</th>
                      <th className="px-2 py-1 font-medium">Position</th>
                      <th className="px-2 py-1 font-medium">Posted at</th>
                      <th className="px-2 py-1 font-medium">Mobile</th>
                      <th className="px-2 py-1 font-medium">Employee ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className="border-t border-slate-100 align-top">
                        <td className="px-2 py-1 text-slate-400">{r.line}</td>
                        <td className="px-2 py-1">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                        </td>
                        {r.ok ? (
                          <>
                            <td className="px-2 py-1">{r.row.name}</td>
                            <td className="px-2 py-1 text-slate-500">{r.row.email}</td>
                            <td className="px-2 py-1">{positionLabel(r.row.role)}</td>
                            <td className="px-2 py-1 text-slate-500">{r.row.scope_type === "hq" ? "HQ" : r.row.scope_values.join(", ")}</td>
                            <td className="px-2 py-1 text-slate-500">{r.row.phone || ""}</td>
                            <td className="px-2 py-1 text-slate-500">{r.row.employee_id || ""}</td>
                          </>
                        ) : (
                          <td colSpan={6} className="px-2 py-1 text-status-critical">{r.label}: {r.error}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={run} disabled={busy || good.length === 0} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                  {busy ? "Importing…" : `Import ${good.length} ${good.length === 1 ? "person" : "people"}`}
                </button>
                {error && <span className="text-sm text-status-critical">{error}</span>}
              </div>
            </>
          )}
        </>
      )}

      {result && (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-ink">
            Done: {result.added} added, {result.updated} updated{result.skipped ? `, ${result.skipped} skipped` : ""}
            {result.errors ? `, ${result.errors} refused` : ""}.
          </div>
          {result.errors > 0 && (
            <ul className="list-disc pl-5 text-xs text-status-critical">
              {result.results.filter((x) => x.status === "error").map((x) => <li key={x.email}>{x.email}: {x.detail}</li>)}
            </ul>
          )}
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button>
        </div>
      )}
    </div>
  );
}
