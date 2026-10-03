import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { formatTime } from "./lib/format";
import MultiSelect from "./components/MultiSelect";
import Skeleton from "./components/Skeleton";
import { Cards, SortTable } from "./kpi/rcaUi";
import { SelectCell, TextCell } from "./RecoveryLost";
import { selectClass } from "./kpi/fmt";

// Recovery -> PDCNR, Damage, No Label from Hub (2026-10-03): the recovery team's sheets, moved into the app. One page for all three; the
// field list, who fills what and when a row counts as closed come from the backend (backend/recovery_cases.py), so this only draws them.

const dash = <span className="text-slate-300">—</span>;
const inputBase = "rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 focus:border-brand focus:outline-none";

function DateCell({ value, onSave, disabled }) {
  if (disabled) return value ? <span className="whitespace-nowrap text-xs text-slate-700">{value}</span> : dash;
  return <input type="date" value={value || ""} onChange={(e) => e.target.value !== (value || "") && onSave(e.target.value)} className={inputBase} />;
}

const isImage = (type) => (type || "").startsWith("image/");

// A photo column: an uploaded file (viewable, downloadable, replaceable) or an older text link typed in the sheet.
function FileCell({ type, field, row, disabled, onRow, onError }) {
  const value = row.data[field.key];
  const [busy, setBusy] = useState(false);
  const url = (download) => api.recoveryCaseFileUrl(type, row.id, field.key, download);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onRow((await api.recoveryCaseUpload(type, row.id, field.key, file)).row);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    try {
      onRow((await api.recoveryCaseSave(type, row.id, { fields: { [field.key]: "" } })).row);
    } catch (err) {
      onError(err.message);
    }
  };
  const uploadBtn = !disabled && (
    <label className="cursor-pointer text-[11px] font-medium text-brand underline">
      {busy ? "Uploading…" : value ? "Replace" : "Upload photo"}
      <input type="file" accept="image/*,.pdf" className="hidden" onChange={pick} disabled={busy} />
    </label>
  );
  if (value && typeof value === "object") {
    return (
      <div className="flex items-center gap-2">
        <a href={url(false)} target="_blank" rel="noreferrer" title={value.name}>
          {isImage(value.type) ? (
            <img src={url(false)} alt={value.name} loading="lazy" className="h-10 w-10 rounded border border-slate-200 object-cover" />
          ) : (
            <span className="rounded border border-slate-200 px-1.5 py-1 text-[10px] font-semibold text-slate-600">PDF</span>
          )}
        </a>
        <div className="flex flex-col items-start gap-0.5">
          <a href={url(true)} download={value.name} className="text-[11px] font-medium text-slate-700 underline">Download</a>
          {uploadBtn}
          {!disabled && <button onClick={remove} className="text-[11px] text-slate-400 hover:text-status-critical">Remove</button>}
        </div>
      </div>
    );
  }
  if (value) {
    const isUrl = /^https?:\/\//i.test(value);
    return (
      <div className="flex flex-col items-start gap-0.5">
        {isUrl ? <a href={value} target="_blank" rel="noreferrer" className="max-w-[10rem] truncate text-[11px] font-medium text-slate-700 underline">Old link</a> : <span className="max-w-[10rem] truncate text-[11px] text-slate-600" title={value}>{value}</span>}
        {uploadBtn}
        {!disabled && <button onClick={remove} className="text-[11px] text-slate-400 hover:text-status-critical">Remove</button>}
      </div>
    );
  }
  return uploadBtn || dash;
}

function FieldCell({ field, row, save, type, onRow, onError }) {
  const value = row.data[field.key];
  const disabled = !row.can_edit[field.key];
  if (field.kind === "file") return <FileCell type={type} field={field} row={row} disabled={disabled} onRow={onRow} onError={onError} />;
  const onSave = (v) => save(row, { fields: { [field.key]: v } });
  if (field.kind === "select") return <SelectCell value={value} options={field.options} disabled={disabled} onSave={onSave} />;
  if (field.kind === "date") return <DateCell value={value} disabled={disabled} onSave={onSave} />;
  return <TextCell value={value} rows={field.wide ? 2 : 1} width={field.wide ? "w-56" : "w-40"} disabled={disabled} onSave={onSave} />;
}

const inFilters = (r, { regionFilter, zoneFilter, search, excludeEastMalaysia }) => {
  if (excludeEastMalaysia && r.region === "East Malaysia") return false;
  if (regionFilter !== "all" && r.region !== regionFilter) return false;
  if (zoneFilter !== "all" && r.zone !== zoneFilter) return false;
  if (search.trim() && !r.station_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
  return true;
};

// "TN" or "TN, station" / "TN<tab>station" per line (what you get pasting two columns from a sheet).
function parseLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [tn, ...rest] = l.split(/\t|,/);
      return { tracking_number: tn.trim(), station: rest.join(",").trim() || null };
    });
}

function AddRows({ type, data, onDone }) {
  const cfg = data.config;
  const entryFields = cfg.fields.filter((f) => f.entry);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(data.today);
  const [station, setStation] = useState("");
  const [text, setText] = useState("");
  const [shared, setShared] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const lines = parseLines(text);
  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const fields = Object.fromEntries(Object.entries(shared).filter(([, v]) => v));
      const res = await api.recoveryCasesAdd(type, { rows: lines.map((l) => ({ ...l, fields })), default_station: station || null, default_date: date });
      const skipped = res.skipped.length ? ` Skipped ${res.skipped.length}: ${res.skipped.slice(0, 5).map((s) => `${s.tracking_number} (${s.reason})`).join("; ")}${res.skipped.length > 5 ? "…" : ""}` : "";
      setMsg({ ok: res.created > 0, text: `Added ${res.created}.${skipped}` });
      if (res.created > 0) {
        setText("");
        onDone();
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="h-9 rounded-lg bg-brand px-3 font-display text-xs font-semibold uppercase text-white">
        Add rows
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div className="font-display text-sm font-semibold text-ink">Add {cfg.label} rows</div>
        <button onClick={() => setOpen(false)} className="text-xs font-medium text-slate-500 underline hover:text-brand">
          Close
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold uppercase text-slate-500">
          {cfg.date_label}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${selectClass} mt-1 block`} />
        </label>
        <label className="text-xs font-semibold uppercase text-slate-500">
          Station {text.includes(",") || text.includes("\t") ? "(for lines without one)" : ""}
          <select value={station} onChange={(e) => setStation(e.target.value)} className={`${selectClass} mt-1 block`}>
            <option value="">— pick —</option>
            {data.stations.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {entryFields.map((f) => (
          <label key={f.key} className="text-xs font-semibold uppercase text-slate-500">
            {f.label}
            {f.kind === "select" ? (
              <select value={shared[f.key] || ""} onChange={(e) => setShared((s) => ({ ...s, [f.key]: e.target.value }))} className={`${selectClass} mt-1 block`}>
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input value={shared[f.key] || ""} onChange={(e) => setShared((s) => ({ ...s, [f.key]: e.target.value }))} className={`${selectClass} mt-1 block w-44 font-normal`} />
            )}
          </label>
        ))}
      </div>
      <label className="block text-xs font-semibold uppercase text-slate-500">
        {cfg.tn_label} — one per line, or paste two columns ({cfg.tn_label.toLowerCase()} and station) from a sheet
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="mt-1 block w-full max-w-xl rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs font-normal text-slate-700 focus:border-brand focus:outline-none"
          placeholder={"MYNJV70089958996\nNLMYA70222688\tPONTIAN"}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={submit} disabled={busy || !lines.length} className="h-9 rounded-lg bg-brand px-3 font-display text-xs font-semibold uppercase text-white disabled:opacity-40">
          {busy ? "Adding…" : `Add ${lines.length || ""} row${lines.length === 1 ? "" : "s"}`}
        </button>
        <span className="text-xs text-slate-500">A tracking number that is already open here is skipped. Fill the rest of each row in the table.</span>
      </div>
      {msg && <div className={`text-sm ${msg.ok ? "text-status-good" : "text-status-critical"}`}>{msg.text}</div>}
    </div>
  );
}

// Bring rows in from the old Google Sheet: File -> Download -> CSV on its tab, then pick that file here. Safe to repeat (same TN + date is skipped).
function ImportRows({ type, onDone }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.recoveryCasesImport(type, await file.text());
      const skipped = res.skipped_total ? ` Skipped ${res.skipped_total}: ${res.skipped.slice(0, 6).map((s) => `${s.row} (${s.reason})`).join("; ")}${res.skipped_total > 6 ? "…" : ""}.` : "";
      const dropped = res.values_dropped ? ` ${res.values_dropped} value(s) were not in the list of choices and were left blank.` : "";
      setMsg({ ok: res.imported > 0, text: `Imported ${res.imported} row${res.imported === 1 ? "" : "s"}.${skipped}${dropped}` });
      if (res.imported > 0) onDone();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
        Import from old sheet
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-6">
        <div className="font-display text-sm font-semibold text-ink">Import from the old sheet</div>
        <button onClick={() => setOpen(false)} className="text-xs font-medium text-slate-500 underline hover:text-brand">
          Close
        </button>
      </div>
      <p className="max-w-xl text-xs text-slate-600">
        In the sheet, open the tab, then File → Download → Comma Separated Values (.csv), and pick that file. The column titles are matched by name, dates are read as the sheet writes them, and a row with the same
        tracking number and date that is already here is skipped, so importing the same file twice is safe. Photos stay as the old links.
      </p>
      <label className="inline-block cursor-pointer rounded-lg bg-brand px-3 py-2 font-display text-xs font-semibold uppercase text-white">
        {busy ? "Importing…" : "Choose CSV file"}
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={pick} disabled={busy} />
      </label>
      {msg && <div className={`text-sm ${msg.ok ? "text-status-good" : "text-status-critical"}`}>{msg.text}</div>}
    </div>
  );
}

export default function RecoveryCases({ type, me, refreshTick, ...filters }) {
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [stations, setStations] = useState([]);
  const [status, setStatus] = useState("Open");
  const [q, setQ] = useState("");
  const [reload, setReload] = useState(0);

  // refreshing (the 60-second tick, or after adding rows) re-fetches in place -- no skeleton, so the Add rows form and its message stay put
  useEffect(() => {
    setError(null);
    api
      .recoveryCases(type)
      .then((d) => {
        setData(d);
        setRows(d.rows);
      })
      .catch((e) => setError(e.message));
  }, [type, refreshTick, reload]);

  const inScope = useMemo(() => rows.filter((r) => inFilters(r, filters)), [rows, filters.regionFilter, filters.zoneFilter, filters.search, filters.excludeEastMalaysia]); // eslint-disable-line react-hooks/exhaustive-deps
  const stationOptions = useMemo(() => [...new Set(inScope.map((r) => r.station_name))].sort().map((v) => ({ value: v, label: v })), [inScope]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return inScope.filter(
      (r) => (status === "All" || r.status === status) && (!stations.length || stations.includes(r.station_name)) && (!term || r.tracking_number.toLowerCase().includes(term))
    );
  }, [inScope, status, stations, q]);

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;

  const cfg = data.config;
  const open = inScope.filter((r) => r.status === "Open");
  const oldest = open.reduce((m, r) => Math.max(m, r.days_open || 0), 0);
  const proofMissing = inScope.filter((r) => r.proof_missing).length;

  const save = async (row, patch) => {
    setMsg(null);
    try {
      const res = await api.recoveryCaseSave(type, row.id, patch);
      setRows((rs) => rs.map((r) => (r.id === row.id ? res.row : r)));
    } catch (e) {
      setMsg(e.message);
    }
  };
  const applyRow = (row) => setRows((rs) => rs.map((r) => (r.id === row.id ? row : r)));
  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.tracking_number}? This cannot be undone.`)) return;
    setMsg(null);
    try {
      await api.recoveryCaseDelete(type, row.id);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
    } catch (e) {
      setMsg(e.message);
    }
  };

  const columns = [
    { key: "station_name", label: "Station", sticky: true, align: "left", text: true },
    { key: "tracking_number", label: cfg.tn_label, text: true, className: () => "font-mono text-xs" },
    { key: "status", label: "Status", render: (r) => <span className={`font-medium ${r.status === "Closed" ? "text-status-good" : "text-status-warning"}`}>{r.status}</span> },
    { key: "days_open", label: "Days", render: (r) => (r.days_open ?? "—") },
    { key: "case_date", label: cfg.date_label, render: (r) => r.case_date || dash, sortValue: (r) => r.case_date || "" },
    { key: "week_no", label: "Week" },
    { key: "region", label: "Region", text: true, className: () => "text-slate-500" },
    ...cfg.fields.map((f) => ({
      key: `f_${f.key}`,
      label: f.label,
      sortable: f.kind !== "text" || !f.wide,
      sortValue: (r) => { const v = r.data[f.key]; return v && typeof v === "object" ? v.name || "file" : v || ""; },
      render: (r) => (
        <div>
          <FieldCell field={f} row={r} save={save} type={type} onRow={applyRow} onError={setMsg} />
          {f.key === "proof_of_delivery" && r.proof_missing && <div className="text-[10px] font-semibold text-status-critical">Proof missing</div>}
        </div>
      ),
    })),
    { key: "updated_at", label: "Last update", sortValue: (r) => r.updated_at || "", render: (r) => (r.updated_at ? <span className="whitespace-nowrap text-[11px] text-slate-500">{formatTime(r.updated_at)}<br />{r.updated_by}</span> : dash) },
    { key: "del", label: "", sortable: false, render: (r) => (r.can_delete ? <button onClick={() => remove(r)} className="text-xs text-slate-400 hover:text-status-critical" title="Delete this row">✕</button> : null) },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
        {cfg.blurb} Pick from the lists or type; it saves as you go. You can fill the columns you are allowed to; the rest are greyed text.
      </div>
      <Cards
        cols={cfg.label === "PDCNR" ? "sm:grid-cols-4" : "sm:grid-cols-3"}
        items={[
          ["Open", open.length.toLocaleString(), `of ${inScope.length.toLocaleString()}`],
          ["Closed", (inScope.length - open.length).toLocaleString()],
          ["Oldest open", open.length ? `${oldest}d` : "—"],
          ...(cfg.label === "PDCNR" ? [["Proof missing", proofMissing.toLocaleString(), "outcome Customer Received, no link"]] : []),
        ]}
      />
      {msg && <div className="rounded-lg bg-status-critical/5 px-3 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{msg}</div>}
      <div className="flex flex-wrap items-start gap-3">
        {data.can_create && <AddRows type={type} data={data} onDone={() => setReload((n) => n + 1)} />}
        {data.is_recovery && <ImportRows type={type} onDone={() => setReload((n) => n + 1)} />}
      </div>
      <SortTable
        title={cfg.label}
        titleExtra={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-48">
              <MultiSelect options={stationOptions} value={stations} onChange={setStations} placeholder="Search station (this table only)…" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} aria-label="Status">
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="All">All</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tracking number…" className={`${selectClass} w-44 font-normal`} />
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-${type}-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Station", "Region", cfg.tn_label, "Status", "Days", cfg.date_label, "Week", ...cfg.fields.map((f) => f.label), "Last update", "Updated by"],
                  list.map((r) => [r.station_name, r.region, r.tracking_number, r.status, r.days_open ?? "", r.case_date ?? "", r.week_no ?? "", ...cfg.fields.map((f) => r.data[f.key] ?? ""), r.updated_at ?? "", r.updated_by ?? ""])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        }
        maxHeight="70vh"
        columns={columns}
        rows={list}
        defaultSort={{ key: "case_date", dir: "desc" }}
        rowKey={(r) => r.id}
        emptyMessage={rows.length ? "No rows match." : data.can_create ? "Nothing here yet -- use Add rows." : "Nothing here yet."}
        footer={`${list.length.toLocaleString()} rows · ${me?.scope_type === "all" ? "everything" : "your access"}`}
      />
    </div>
  );
}
