import { useEffect, useState } from "react";
import { api } from "../api";
import { formatTime } from "../lib/format";

// One Metabase page that holds every feeder question (2026-10-03) -- open it once, download each card as .csv, then drop all the files in the box below.
const FEEDER_DASHBOARD_URL = "https://metabase.ninjavan.co/dashboard/8479";

// Data upload for one KPI (admins upload; everyone sees what is loaded). One current file per dataset -- uploading
// again replaces it. Excel workbooks are fine: the right sheet is picked automatically. An uploaded file is used instead of Metabase
// until it is removed. (2026-09-26: the way to feed the KPI page while the Metabase link is being sorted out, and for RCA files that
// are pasted by hand today.)
export default function KpiUploadPanel({ kpi, me, onChanged, title = "Data upload" }) {
  const canUploadAny = me.role === "admin"; // the panel-level hint; each file says for itself who may upload it (can_upload)
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [many, setMany] = useState(null); // results of the last multi-file drop
  const [dragOver, setDragOver] = useState(false);

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
  // Several files at once: the server matches each to its dataset by its columns (any KPI, not only this page's), so the whole
  // set of downloads can go in with one action from wherever the admin is.
  const pickMany = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy("many");
    setMsg(null);
    setMany(null);
    try {
      setMany(await api.kpiUploadMany(files));
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

  // Someone who cannot upload any of these files does not see the card at all -- nor the Metabase links in it (Fleet Manager, 2026-09-26)
  if (items !== null && !items.some((u) => u.can_upload ?? canUploadAny)) return null;
  if (items === null && !canUploadAny) return null;

  return (
    <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-sm font-semibold text-ink">{title}</div>
        <div className="text-[11px] text-slate-400">
          {items?.some((u) => u.can_upload) ? "CSV or Excel. An uploaded file is used instead of Metabase until you remove it." : "Admins upload the data."}
        </div>
      </div>
      {items?.some((u) => u.can_upload ?? canUploadAny) && (
        <div className="space-y-2">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickMany(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border-2 border-dashed px-3 py-3 text-center transition ${
              dragOver ? "border-brand bg-brand/5" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
            } ${busy ? "pointer-events-none opacity-60" : ""}`}
          >
            <span className="font-display text-sm font-semibold text-slate-700">
              {busy === "many" ? "Uploading…" : "Drop all your downloaded files here, or click to choose several"}
            </span>
            <span className="text-[11px] text-slate-500">
              Each file is matched to its KPI file by its columns -- you don't have to pick which is which. CSV or Excel, up to 25 at once.
            </span>
            <input type="file" multiple accept=".csv,.xlsx,.xlsm" className="sr-only" onChange={(e) => { pickMany(e.target.files); e.target.value = ""; }} />
          </label>
          <div className="text-[11px] text-slate-500">
            Fewer clicks:{" "}
            <a href={FEEDER_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-700 underline hover:text-sky-900">
              open every feeder on one Metabase page ↗
            </a>{" "}
            and download each card as .csv (the cloud icon on the card), then drop them all in the box above.
          </div>
          {many && (
            <div className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
              {many.map((r, i) => (
                <div key={`${r.filename}-${i}`} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                  <span className={`mt-px font-bold ${r.ok ? "text-status-good" : "text-status-critical"}`}>{r.ok ? "✓" : "✗"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-slate-500">{r.filename}</div>
                    <div className={r.ok ? "text-slate-800" : "text-status-critical"}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
                      {u.link_label || "Open in Metabase"} ↗
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
              {(u.can_upload ?? canUploadAny) && (
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
