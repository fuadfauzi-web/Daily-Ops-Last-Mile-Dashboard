import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import DataTable from "../components/DataTable";
import Skeleton from "../components/Skeleton";
import { exportCsv } from "../lib/csv";
import { formatTime } from "../lib/format";
import KpiUploadPanel from "./KpiUploadPanel";
import { selectClass } from "./fmt";

// OPEX Result (staging): the OPEX team's KPI dashboard (Last Mile Performance) shows the RESULT (a %) -- this page is where that result sits
// next to the RCA pages. Open to every user in full (no scope filter, Fleet Manager 2026-09-26). The OPEX dashboard's own "Download CSV"
// (one row per region / area / hub with rate, target and met / missed per KPI) gets a proper view; any other table is shown as it is.
// The plan is to merge it into the Weekly Dashboard and, once Metabase is connected, to stop uploading.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const niceDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const pct = (v, decimals) => (v == null ? "—" : `${v.toFixed(decimals)}%`);

function OpexStructured({ data, me, onChanged }) {
  const o = data.opex;
  const canUpload = me.role === "admin";
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "missed", dir: "desc" });
  const [showUpload, setShowUpload] = useState(false);
  const levelLabel = { hub: "Hub", area: "Area", zone: "Zone", region: "Region" }[o.level] || "Row";

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = o.rows.map((r, i) => ({ id: i, ...r, label: r.station || r.name }));
    if (needle) list = list.filter((r) => `${r.label} ${r.name} ${r.zone || ""}`.toLowerCase().includes(needle));
    const val = (r) => (sort.key === "name" ? r.label : sort.key === "missed" ? r.missed : r.values[sort.key]?.rate ?? -1);
    return [...list].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      const c = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sort.dir === "asc" ? c : -c;
    });
  }, [o, q, sort]);

  const met = (k) => o.rows.filter((r) => r.values[k]?.met === true).length;
  const counted = (k) => o.rows.filter((r) => r.values[k]?.met != null).length;
  const columns = [
    {
      key: "name", label: levelLabel, sticky: true, align: "left",
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-800">{r.label}</div>
          {(r.station || r.zone) && <div className="text-[10px] text-slate-400">{[r.station ? r.name : null, r.zone].filter(Boolean).join(" · ")}</div>}
        </div>
      ),
    },
    { key: "missed", label: "KPIs missed", render: (r) => r.missed, className: (r) => (r.missed >= 6 ? "font-bold text-status-critical" : r.missed === 0 ? "font-bold text-status-good" : "font-semibold text-slate-800") },
    ...o.kpis.map((k) => ({
      key: k.key,
      label: k.label,
      render: (r) => {
        const v = r.values[k.key];
        return (
          <div>
            <div>{pct(v?.rate, k.decimals)}</div>
            <div className="text-[10px] font-normal text-slate-400">target {pct(v?.target, k.decimals)}</div>
          </div>
        );
      },
      className: (r) => {
        const m = r.values[k.key]?.met;
        return m === true ? "bg-emerald-50 font-semibold text-status-good" : m === false ? "bg-red-50 font-semibold text-status-critical" : "text-slate-500";
      },
    })),
  ];
  const period = o.from && o.to ? `${niceDay(o.from)} – ${niceDay(o.to)}` : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="mr-2 font-display text-sm font-semibold text-ink">
          {[o.scope, o.grain, period].filter(Boolean).join(" · ") || "OPEX KPI result"}
        </div>
        <input className={`${selectClass} w-48 font-normal`} placeholder={`Search ${levelLabel.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-xs text-slate-400">From {data.meta.filename} · {formatTime(data.meta.uploaded_at)}</span>
        <button
          onClick={() =>
            exportCsv(
              "daily-ops-opex-result.csv",
              [levelLabel, "Station", "KPIs missed", ...o.kpis.flatMap((k) => [`${k.label} %`, `${k.label} target %`, `${k.label} met`])],
              rows.map((r) => [r.name, r.station || "", r.missed, ...o.kpis.flatMap((k) => [r.values[k.key]?.rate ?? "", r.values[k.key]?.target ?? "", r.values[k.key]?.met == null ? "" : r.values[k.key].met ? "met" : "missed"])])
            )
          }
          className="h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Export CSV
        </button>
        {canUpload && (
          <button onClick={() => setShowUpload((v) => !v)} className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
            {showUpload ? "Hide data upload" : "Data upload"}
          </button>
        )}
      </div>
      {showUpload && <KpiUploadPanel kpi="opex" me={me} onChanged={onChanged} />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {o.kpis.map((k) => (
          <div key={k.key} className="rounded-lg border-l-4 border-brand bg-white px-3 py-2 ring-1 ring-slate-200">
            <div className="text-[10px] font-bold uppercase text-slate-500">{k.label}</div>
            <div className="mt-0.5 font-display text-lg font-black text-ink">
              {met(k.key)}<span className="text-xs font-semibold text-slate-400"> / {counted(k.key)}</span>
            </div>
            <div className="text-[10px] text-slate-400">{levelLabel.toLowerCase()}s on target</div>
          </div>
        ))}
      </div>
      <DataTable
        title={`OPEX KPI result by ${levelLabel.toLowerCase()} (rate vs target)`}
        maxHeight="70vh"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sortKey={sort.key}
        sortDir={sort.dir}
        onSort={(key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }))}
        emptyMessage="No rows match."
        footer="Green = on target, red = missed, as the OPEX dashboard reports it. Everyone sees the whole result."
      />
    </div>
  );
}

export default function OpexResult({ me }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ col: null, dir: "asc" });
  const [showUpload, setShowUpload] = useState(false);
  const canUpload = me.role === "admin";

  const load = () =>
    api
      .kpiTable("opex_result")
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    if (!data?.rows) return [];
    const needle = q.trim().toLowerCase();
    let list = needle ? data.rows.filter((r) => r.some((c) => String(c ?? "").toLowerCase().includes(needle))) : data.rows;
    if (sort.col != null) {
      list = [...list].sort((a, b) => {
        const av = a[sort.col];
        const bv = b[sort.col];
        const an = Number(av);
        const bn = Number(bv);
        const c = av !== "" && bv !== "" && !Number.isNaN(an) && !Number.isNaN(bn) ? an - bn : String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? c : -c;
      });
    }
    return list;
  }, [data, q, sort]);

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.has_data) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">No OPEX result uploaded yet</div>
          <p className="mt-2">
            Open the OPEX Last Mile Performance dashboard (link below), pick the region / area and the dates, press <strong>Download CSV</strong>, then upload that file here (admins). It shows here, open to every user, next to the RCA pages.
          </p>
        </div>
        <KpiUploadPanel kpi="opex" me={me} onChanged={load} />
      </div>
    );
  }

  if (data.opex) return <OpexStructured data={data} me={me} onChanged={load} />;

  const columns = data.columns.map((name, i) => ({
    key: `c${i}`,
    label: name.startsWith("_col") ? `Column ${i + 1}` : name,
    align: i === 0 ? "left" : undefined,
    sticky: i === 0,
    render: (r) => (r[i] == null ? "" : String(r[i])),
    className: () => "text-xs text-slate-700",
  }));
  const tableRows = rows.slice(0, 1000).map((r, i) => ({ id: i, r }));
  const wrapped = columns.map((c, i) => ({ ...c, render: (row) => (row.r[i] == null ? "" : String(row.r[i])) }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <input className={`${selectClass} w-56 font-normal`} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-xs text-slate-400">From {data.meta.filename} · {formatTime(data.meta.uploaded_at)}</span>
        <button
          onClick={() => exportCsv("daily-ops-opex-result.csv", data.columns, rows)}
          className="h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Export CSV
        </button>
        {canUpload && (
          <button onClick={() => setShowUpload((v) => !v)} className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
            {showUpload ? "Hide data upload" : "Data upload"}
          </button>
        )}
      </div>
      {showUpload && <KpiUploadPanel kpi="opex" me={me} onChanged={load} />}
      <DataTable
        title="OPEX KPI result (as uploaded)"
        maxHeight="70vh"
        columns={wrapped}
        rows={tableRows}
        rowKey={(r) => r.id}
        sortKey={sort.col != null ? `c${sort.col}` : null}
        sortDir={sort.dir}
        onSort={(key) => {
          const col = Number(key.slice(1));
          setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
        }}
        emptyMessage="No rows match."
        footer={`${rows.length.toLocaleString()} rows${rows.length > 1000 ? " · showing the first 1,000 -- Export CSV has them all" : ""}${data.capped ? " · the file has more rows than the page loads" : ""}`}
      />
    </div>
  );
}
