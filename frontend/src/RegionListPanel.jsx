import { useEffect, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import KpiUploadPanel from "./kpi/KpiUploadPanel";

// Admin -> Documents -> Station list: where the app gets its station list (hub code, station, zone, region). It follows the Fleet Manager's Region List sheet, so a
// station opening or closing needs no code change. Three sources, in this order: the sheet's published CSV link (read every hour), the file uploaded here, and the
// snapshot built into the app (backend/stations.py) -- see backend/region_list.py.
const SOURCE_TEXT = {
  sheet: "the Region List sheet (published link, read every hour)",
  upload: "the uploaded file",
  bundled: "the list built into the app (nothing uploaded, no sheet link yet)",
};

export default function RegionListPanel({ me }) {
  const [status, setStatus] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const take = (s) => {
    setStatus(s);
    setUrl(s.url || "");
  };
  const load = () => api.regionListStatus().then(take).catch((e) => setMsg({ kind: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []);

  const run = async (fn, okText) => {
    setBusy(true);
    setMsg(null);
    try {
      take(await fn());
      if (okText) setMsg({ kind: "ok", text: okText });
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!status) return <div className="rounded-xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-200">{msg ? msg.text : "Loading…"}</div>;
  const ch = status.changes_vs_bundled || { added: [], removed: [], changed: [] };
  const rep = status.report;
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-display text-sm font-semibold text-ink">Station list</div>
          <a href={status.sheet_link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-sky-700 underline hover:text-sky-900">
            Open the Region List sheet ↗
          </a>
        </div>
        <p className="mt-1 text-sm text-slate-700">
          <span className="font-semibold">{status.stations}</span> Last Mile stations, from <span className="font-medium">{SOURCE_TEXT[status.source] || status.source}</span>
          {status.applied_at ? ` · applied ${formatTime(status.applied_at)}` : ""}.{" "}
          <span className="text-slate-500">{Object.entries(status.by_region).map(([r, n]) => `${r} ${n}`).join(" · ")}</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Only Active / Virtual rows in Klang Valley, Northern, Southern, East Coast and East Malaysia count; Closed stations and the SAMEDAY / NO HUB groups are left out. A change is used at once by the KPI pages and by the
          dashboards at their next refresh (within 15 minutes).
        </p>
        {(ch.added.length > 0 || ch.removed.length > 0 || ch.changed.length > 0) && (
          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
            <div className="font-semibold text-slate-700">Different from the list built into the app</div>
            {ch.added.length > 0 && <div>Added ({ch.added.length}): {ch.added.join(", ")}</div>}
            {ch.removed.length > 0 && <div>Not in the sheet any more ({ch.removed.length}): {ch.removed.join(", ")}</div>}
            {ch.changed.length > 0 && <div>Changed ({ch.changed.length}): {ch.changed.join("; ")}</div>}
          </div>
        )}
        {rep && (rep.closed > 0 || Object.keys(rep.not_last_mile || {}).length > 0) && (
          <div className="mt-1 text-[11px] text-slate-400">
            Left out of the file: {rep.closed} closed / not active
            {Object.keys(rep.not_last_mile || {}).length > 0 ? ` · not Last Mile: ${Object.entries(rep.not_last_mile).map(([r, n]) => `${r} ${n}`).join(", ")}` : ""}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-ink">Link the sheet (optional, best)</div>
        <p className="mt-1 text-xs text-slate-500">
          The sheet needs a sign-in, so the app can only read it through a "published to the web" link: in the sheet choose <em>File → Share → Publish to web</em>, pick the <em>Region</em> tab and{" "}
          <em>Comma-separated values (.csv)</em>, press Publish and paste the link here. The app then re-reads it every hour, so nobody has to upload anything. Clear the box to go back to the uploaded file.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?gid=…&single=true&output=csv"
            className="min-w-[280px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            aria-label="Published CSV link of the Region List sheet"
          />
          <button
            onClick={() => run(() => api.regionListSetUrl(url.trim() || null), url.trim() ? "Link saved and read." : "Link cleared.")}
            disabled={busy || url.trim() === (status.url || "")}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Save link
          </button>
          <button onClick={() => run(() => api.regionListSync(), "Read again.")} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Sync now
          </button>
        </div>
        {status.url && (
          <div className="mt-1 text-[11px] text-slate-400">
            {status.sync?.ok_at ? `Last read ${formatTime(status.sync.ok_at)}.` : "Not read successfully yet."}
            {status.sync?.error && <span className="text-status-critical"> {status.sync.error}</span>}
          </div>
        )}
        {msg && <div className={`mt-1 text-sm ${msg.kind === "ok" ? "text-status-good" : "text-status-critical"}`}>{msg.text}</div>}
      </div>

      <KpiUploadPanel kpi="region" me={me} title="Or upload the sheet as a file" onChanged={load} />
    </div>
  );
}
