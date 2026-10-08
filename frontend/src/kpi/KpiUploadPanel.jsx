import { useEffect, useState } from "react";
import { api } from "../api";
import { formatTime } from "../lib/format";

// "Data source" for one KPI (admins only). Since 2026-10-08 the files that come from Metabase are PULLED by the app on a schedule (Superadmin -> Documents) -- there is no file to
// upload for them: this card shows when each was last pulled and lets the Superadmin pull it now. A file with no Metabase source (the weekly KPI sheet, the OPEX download, the
// station list ...) is still uploaded here by hand; one current file per dataset, uploading again replaces it, Excel workbooks are fine (the right sheet is picked automatically).
export default function KpiUploadPanel({ kpi, me, onChanged, title = "Data source" }) {
  const isAdmin = me.role === "admin";
  const [items, setItems] = useState(null);
  const [feeds, setFeeds] = useState({}); // dataset -> the Metabase feed (Superadmin only)
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => {
    api
      .kpiUploads()
      .then((all) => setItems(all.filter((u) => u.kpi === kpi)))
      .catch((e) => setMsg({ kind: "error", text: e.message }));
    if (isAdmin)
      api
        .metabaseFeeds()
        .then((d) => setFeeds(Object.fromEntries(d.feeds.map((f) => [f.dataset, f]))))
        .catch(() => {});
  };
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
      load();
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
      load();
      onChanged?.();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  };
  const pullNow = async (dataset) => {
    setBusy(dataset);
    setMsg(null);
    try {
      const res = await api.metabasePull(dataset);
      setMsg({ kind: "ok", text: res.detail });
      load();
      onChanged?.();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  };

  // only the Superadmin sees where the data comes from and can refresh it (the Recovery lost-declared files used to be uploaded by managers too -- they are pulled now)
  if (items !== null && !items.some((u) => u.can_upload || (u.metabase && isAdmin))) return null;
  if (items === null && !isAdmin) return null;

  return (
    <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-sm font-semibold text-ink">{title}</div>
        <div className="text-[11px] text-slate-400">Metabase files are pulled automatically -- set the schedule in Superadmin → Documents.</div>
      </div>
      {items === null ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((u) => {
            const f = feeds[u.dataset];
            return (
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
                  {!u.metabase && <div className="text-[11px] text-slate-400">{u.hint}</div>}
                </div>
                <div className="min-w-[200px] flex-1 text-xs text-slate-600">
                  {u.metabase ? (
                    <>
                      {f ? <div className="text-slate-500">Pulled from Metabase · {f.schedule}</div> : <div className="text-slate-500">Pulled from Metabase</div>}
                      {u.filename ? (
                        <div className="text-[11px] text-slate-400">
                          Loaded {formatTime(u.uploaded_at)} · {u.row_count?.toLocaleString()} rows
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">Nothing loaded yet</div>
                      )}
                      {f?.last_status === "error" && <div className="text-[11px] text-status-critical">Last pull failed: {f.last_message}</div>}
                    </>
                  ) : u.filename ? (
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
                {u.metabase
                  ? isAdmin && (
                      <button
                        onClick={() => pullNow(u.dataset)}
                        disabled={!!busy}
                        className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busy === u.dataset ? "Pulling…" : "Pull now"}
                      </button>
                    )
                  : u.can_upload && (
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
            );
          })}
        </div>
      )}
      {msg && <div className={`text-sm ${msg.kind === "ok" ? "text-status-good" : "text-status-critical"}`}>{msg.text}</div>}
    </div>
  );
}
