import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import DataTable from "../components/DataTable";
import Skeleton from "../components/Skeleton";
import { exportCsv } from "../lib/csv";
import { formatTime } from "../lib/format";
import KpiUploadPanel from "./KpiUploadPanel";
import { selectClass } from "./fmt";

// OPEX Result (staging): the OPEX team's KPI dashboard shows the RESULT (a %) -- this page is where that result sits next to the RCA
// pages. Its layout isn't agreed yet, so for now the uploaded file is shown as it is (search, sort, export) and gets a proper view
// once the columns are known -- the plan is to merge it into the Weekly Dashboard.
export default function OpexResult({ me }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ col: null, dir: "asc" });
  const [showUpload, setShowUpload] = useState(false);
  const canUpload = me.role === "admin" || me.role === "manager";

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
          <p className="mt-2">Upload the OPEX KPI dashboard result (CSV or Excel, first sheet) to see it here next to the RCA pages. Its layout will be set once we see it.</p>
        </div>
        <KpiUploadPanel kpi="opex" me={me} onChanged={load} />
      </div>
    );
  }

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
