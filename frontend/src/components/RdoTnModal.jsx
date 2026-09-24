import { useEffect, useState } from "react";
import { api } from "../api";
import { exportCsv } from "../lib/csv";
import { formatLocalDateTime, formatTime } from "../lib/format";

// B2B Document Compliance drilldown: every RDO tracking number behind one station
// row's count (Total TN, or one RDO-status column), with the bundle details --
// including bundles that are NOT completed yet -- and a full-detail CSV export
// (2026-09-25 feedback).
export function bundleStatusText(r) {
  if (r.bundle_status === "Completed" && r.bundle_delivered_at) {
    return `Completed · ${formatLocalDateTime(r.bundle_delivered_at)}`;
  }
  return r.bundle_status ?? "—";
}

const COLUMNS = [
  { label: "RDO Tracking Number", text: (r) => r.tracking_number ?? "" },
  { label: "RDO Status", text: (r) => r.rdo_status ?? "" },
  { label: "RDO Created", text: (r) => formatLocalDateTime(r.rdo_created_at) },
  { label: "Age (days)", text: (r) => (r.age ?? "") },
  { label: "Bundle Tracking Number", text: (r) => r.bundle_tracking_number ?? "" },
  { label: "Bundle Status", text: bundleStatusText },
  { label: "Bundle Last Sweep Hub", text: (r) => r.bundle_last_sweep_hub ?? "" },
  { label: "Bundle Last Sweep", text: (r) => formatLocalDateTime(r.bundle_last_sweep_at) },
];

export default function RdoTnModal({ state, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state) return;
    setData(null);
    setError(null);
    setCopied(false);
    api
      .b2bComplianceTns(state.stationCode, state.status)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [state]);

  if (!state) return null;
  const rows = data?.tn_rows || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-3 pt-[6vh]" onClick={onClose}>
      <div
        className="max-h-[82vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">{state.stationName}</div>
            <div className="text-xs text-slate-500">RDO — {state.label}</div>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        <div className="px-4 py-3">
          {error && <div className="text-sm text-status-critical">{error}</div>}
          {!error && !data && <div className="text-sm text-slate-400">Loading…</div>}
          {data && (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-500">
                  {rows.length.toLocaleString()} tracking number{rows.length === 1 ? "" : "s"}
                  {data.captured_at && ` · as of ${formatTime(data.captured_at)}`}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      exportCsv(
                        `daily-ops-rdo-${state.stationName.replace(/\s+/g, "-")}-${state.status}-${new Date().toISOString().slice(0, 10)}.csv`,
                        ["Station", ...COLUMNS.map((c) => c.label)],
                        rows.map((r) => [state.stationName, ...COLUMNS.map((c) => c.text(r))])
                      )
                    }
                    disabled={!rows.length}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-40"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(rows.map((r) => r.tracking_number).join("\n")).then(() => setCopied(true));
                    }}
                    disabled={!rows.length}
                    className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {copied ? "Copied!" : "Copy list"}
                  </button>
                </div>
              </div>
              <div className="max-h-[58vh] overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                    <tr>
                      {COLUMNS.map((c) => (
                        <th key={c.label} className="whitespace-nowrap px-3 py-2 font-medium">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-slate-400">
                          No tracking numbers.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={`${r.tracking_number}-${i}`} className="border-t border-slate-100">
                          {COLUMNS.map((c, j) => (
                            <td key={c.label} className={`whitespace-nowrap px-3 py-1.5 ${j === 0 || j === 4 ? "font-mono" : ""}`}>
                              {c.text(r) || "—"}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
