import { useEffect, useState } from "react";
import { api } from "../api";
import { formatTime } from "../lib/format";

// Data upload for one KPI (admins upload; everyone sees what is loaded). One current file per dataset -- uploading
// again replaces it. Excel workbooks are fine: the right sheet is picked automatically. An uploaded file is used instead of Metabase
// until it is removed. (2026-09-26: the way to feed the KPI page while the Metabase link is being sorted out, and for RCA files that
// are pasted by hand today.)
export default function KpiUploadPanel({ kpi, me, onChanged, title = "Data upload" }) {
  const canUpload = me.role === "admin";
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () =>
    api
      .kpiUploads()
      .then((all) => setItems(all.filter((u) => u.kpi === kpi)))
      .catch((e) => setMsg({ kind: "error", text: e.message }));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpi]);

  const pick = async (dataset, file) => {
    if (!file) return;
    setBusy(dataset);
    setMsg(null);
    try {
      const res = await api.kpiUpload(dataset, file);
      setMsg({ kind: "ok", text: res.detail });
      await load();
      onChanged?.();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  };
  const remove = async (dataset) => {
    setBusy(dataset);
    setMsg(null);
    try {
      await api.kpiUploadRemove(dataset);
      await load();
      onChanged?.();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-sm font-semibold text-ink">{title}</div>
        <div className="text-[11px] text-slate-400">
          {canUpload ? "CSV or Excel. An uploaded file is used instead of Metabase until you remove it." : "Admins upload the data."}
        </div>
      </div>
      {items === null ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((u) => (
            <div key={u.dataset} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-sm font-semibold text-slate-800">{u.label}</span>
                  {u.link && (
                    <a href={u.link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-sky-700 underline hover:text-sky-900">
                      Open in Metabase ↗
                    </a>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">{u.hint}</div>
              </div>
              <div className="min-w-[200px] flex-1 text-xs text-slate-600">
                {u.filename ? (
                  <>
                    <span className="font-medium text-slate-800">{u.filename}</span> · {u.row_count?.toLocaleString()} rows
                    <div className="text-[11px] text-slate-400">
                      {formatTime(u.uploaded_at)} · {u.uploaded_by}
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400">Nothing uploaded</span>
                )}
              </div>
              {canUpload && (
                <div className="flex items-center gap-2">
                  <label className={`inline-flex min-h-[36px] cursor-pointer items-center rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50 ${busy ? "pointer-events-none opacity-50" : ""}`}>
                    {busy === u.dataset ? "Uploading…" : u.filename ? "Replace file" : "Choose file"}
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xlsm"
                      className="sr-only"
                      onChange={(e) => {
                        pick(u.dataset, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {u.filename && (
                    <button onClick={() => remove(u.dataset)} disabled={!!busy} className="text-xs font-medium text-slate-500 underline hover:text-status-critical disabled:opacity-40">
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {msg && <div className={`text-sm ${msg.kind === "ok" ? "text-status-good" : "text-status-critical"}`}>{msg.text}</div>}
    </div>
  );
}
