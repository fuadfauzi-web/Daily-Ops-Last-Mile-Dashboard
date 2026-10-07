import { useEffect, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import RegionListPanel from "./RegionListPanel";

// Superadmin -> Documents (2026-10-04): every file the app is fed by hand, in one place -- the Station List used to be a tab of its own.
//   1. one card for ALL the Metabase feeders: open the one Metabase page, drop every downloaded file here, each is matched to its dataset by its columns
//   2. one card per document: what it is, where it comes from, what is loaded (and when / by whom), replace / remove
// A daily Metabase file that has not been uploaded today shows "Not updated today", and the same count is the bell on the Documents tab.
const FEEDER_DASHBOARD_URL = "https://metabase.ninjavan.co/dashboard/8479";

function Card({ title, right, children }) {
  return (
    <div className="rounded-[10px] bg-white p-3.5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-[14px] font-semibold text-ink">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Status({ u }) {
  if (!u.filename) return <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#92400E]">Nothing uploaded</span>;
  if (!u.daily) return <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">Loaded</span>;
  return u.updated_today ? (
    <span className="rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#166534]">Updated today</span>
  ) : (
    <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#92400E]">Not updated today</span>
  );
}

export default function DocumentsPage({ me, driverDetails, onChanged }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [many, setMany] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const load = () =>
    api
      .kpiUploads()
      .then(setItems)
      .catch((e) => setMsg({ kind: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []);
  const changed = async () => {
    await load();
    window.dispatchEvent(new Event("notifications-changed")); // the bell recounts
    onChanged?.();
  };

  const pick = async (dataset, file) => {
    if (!file) return;
    setBusy(dataset);
    setMsg(null);
    try {
      const res = await api.kpiUpload(dataset, file);
      setMsg({ kind: "ok", text: res.detail });
      await changed();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  };
  const pickMany = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy("many");
    setMsg(null);
    setMany(null);
    try {
      setMany(await api.kpiUploadMany(files));
      await changed();
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
      await changed();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  };

  if (items === null) return <div className="text-slate-500">{msg ? msg.text : "Loading…"}</div>;
  const daily = items.filter((u) => u.daily);
  const other = items.filter((u) => !u.daily && u.dataset !== "region_list");
  const stale = daily.filter((u) => !u.updated_today).length;

  const docCard = (u) => (
    <Card key={u.dataset} title={u.label} right={<Status u={u} />}>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{u.hint}</p>
      {u.link && (
        <a href={u.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-sky-700 underline hover:text-sky-900">
          {u.link_label || "Open in Metabase"} ↗
        </a>
      )}
      <div className="mt-2 text-xs text-slate-600">
        {u.filename ? (
          <>
            <span className="font-medium text-ink">{u.filename}</span> · {u.row_count?.toLocaleString()} rows
            <div className="text-[11px] text-slate-400">
              {formatTime(u.uploaded_at)} · {u.uploaded_by}
            </div>
          </>
        ) : (
          <span className="text-slate-400">Nothing uploaded yet</span>
        )}
      </div>
      {u.can_upload && (
        <div className="mt-2 flex items-center gap-3">
          <label className={`inline-flex min-h-[36px] cursor-pointer items-center rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-ink-2 hover:bg-canvas ${busy ? "pointer-events-none opacity-50" : ""}`}>
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
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card
        title="Metabase feeders -- every file in one go"
        right={
          <span className={`text-xs font-semibold ${stale ? "text-[#92400E]" : "text-status-good"}`}>
            {stale ? `${stale} of ${daily.length} daily files not updated today` : `All ${daily.length} daily files updated today`}
          </span>
        }
      >
        <p className="mt-1 text-xs text-slate-500">
          <a href={FEEDER_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-700 underline hover:text-sky-900">
            Open every feeder on one Metabase page ↗
          </a>{" "}
          and download each card as .csv (the cloud icon on the card), then drop them all in the box below.
        </p>
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
          className={`mt-3 flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border-2 border-dashed px-3 py-5 text-center transition ${
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
        {many && (
          <div className="mt-3 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
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
        {msg && <div className={`mt-2 text-sm ${msg.kind === "ok" ? "text-status-good" : "text-status-critical"}`}>{msg.text}</div>}
      </Card>

      <div>
        <div className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-subtle">Daily Metabase files</div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">{daily.map(docCard)}</div>
      </div>

      <div>
        <div className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-subtle">Other documents</div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {other.map(docCard)}
          {driverDetails && <Card title="Driver / rider details (Route Monitoring tenure)">{driverDetails}</Card>}
        </div>
      </div>

      <div>
        <div className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-subtle">Station list</div>
        <RegionListPanel me={me} />
      </div>
    </div>
  );
}
