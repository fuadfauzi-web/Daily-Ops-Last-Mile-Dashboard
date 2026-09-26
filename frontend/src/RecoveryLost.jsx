import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { exportCsv } from "./lib/csv";
import { formatTime } from "./lib/format";
import MultiSelect from "./components/MultiSelect";
import Skeleton from "./components/Skeleton";
import KpiUploadPanel from "./kpi/KpiUploadPanel";
import { Cards, SortTable } from "./kpi/rcaUi";
import { selectClass } from "./kpi/fmt";

// Recovery -> Active Missing, Lost Declared This Week, Lost Declared Summary (2026-09-26): the team's "Active Missing Southern" sheet, moved into the app.
//   Active Missing          the open missing TNs in your access (Ship Out and B2B left out); every user answers for their own; a settled TN drops off by itself
//   Lost Declared This Week the Metabase question "This Week Lost Declared" (an admin uploads its CSV daily); region staff answer, everyone monitors their access
//   Lost Declared Summary   what This Week collects, moved here every Monday 10pm for good
// See backend/recovery_lost.py.

const dash = <span className="text-slate-300">—</span>;
const inputBase = "rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 focus:border-brand focus:outline-none disabled:border-transparent disabled:bg-transparent disabled:text-slate-700";

function SelectCell({ value, options, onSave, disabled }) {
  if (disabled) return value ? <span className="whitespace-nowrap text-xs text-slate-700">{value}</span> : dash;
  return (
    <select value={value || ""} onChange={(e) => onSave(e.target.value)} className={`${inputBase} min-w-[6.5rem]`}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function TextCell({ value, onSave, disabled, rows = 1, width = "w-40" }) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  if (disabled) return value ? <span className={`block max-w-[16rem] whitespace-pre-wrap text-left text-xs text-slate-700`}>{value}</span> : dash;
  const commit = () => v.trim() !== (value || "").trim() && onSave(v);
  return rows > 1 ? (
    <textarea value={v} rows={rows} onChange={(e) => setV(e.target.value)} onBlur={commit} className={`${inputBase} ${width} resize-y text-left`} />
  ) : (
    <input value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className={`${inputBase} ${width} text-left`} />
  );
}

const items = (text) => {
  if (!text) return "";
  try {
    const list = JSON.parse(text);
    if (Array.isArray(list)) return list.map((i) => `${i.item_description || "item"}${i.quantity && i.quantity !== 1 ? ` ×${i.quantity}` : ""}`).join("; ");
  } catch {
    /* not JSON: show as it is */
  }
  return text;
};
const clip = (text, n = 60) => (text && text.length > n ? `${text.slice(0, n)}…` : text);
const inFilters = (r, { regionFilter, zoneFilter, search, excludeEastMalaysia }) => {
  if (excludeEastMalaysia && r.region === "East Malaysia") return false;
  if (regionFilter !== "all" && r.region !== regionFilter) return false;
  if (zoneFilter !== "all" && r.zone !== zoneFilter) return false;
  if (search.trim() && !r.station_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
  return true;
};
const answered = (r, keys) => keys.some((k) => r[k] != null && String(r[k]).trim() !== "");
const csvDate = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------------------------------------ Active Missing
const AM_KEYS = ["ticket_updated", "parcel_found", "contacted_customer", "customer_received", "liable_party", "remarks"];
const AM_TYPES = ["Hub", "Driver/Rider", "Ship In", "PDCNR", "Other"];

export function ActiveMissingView(props) {
  const { refreshTick } = props;
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [stations, setStations] = useState([]);
  const [toAnswerOnly, setToAnswerOnly] = useState(false);
  const [highOnly, setHighOnly] = useState(false);

  useEffect(() => {
    api
      .activeMissing()
      .then((d) => {
        setData(d);
        setRows(d.rows);
      })
      .catch((e) => setError(e.message));
  }, [refreshTick]);

  const inScope = useMemo(() => rows.filter((r) => inFilters(r, props)), [rows, props.regionFilter, props.zoneFilter, props.search, props.excludeEastMalaysia]); // eslint-disable-line react-hooks/exhaustive-deps
  const stationOptions = useMemo(() => [...new Set(inScope.map((r) => r.station_name))].sort().map((v) => ({ value: v, label: v })), [inScope]);
  const list = useMemo(
    () =>
      inScope.filter((r) => (!stations.length || stations.includes(r.station_name)) && (!toAnswerOnly || !answered(r, AM_KEYS)) && (!highOnly || r.is_high_value)),
    [inScope, stations, toAnswerOnly, highOnly]
  );
  const byStation = useMemo(() => {
    const m = new Map();
    inScope.forEach((r) => {
      if (!m.has(r.station_code)) m.set(r.station_code, { station_code: r.station_code, station_name: r.station_name, zone: r.zone, region: r.region, total: 0, answered: 0, ...Object.fromEntries(AM_TYPES.map((t) => [t, 0])) });
      const s = m.get(r.station_code);
      s.total += 1;
      if (answered(r, AM_KEYS)) s.answered += 1;
      s[AM_TYPES.includes(r.type) ? r.type : "Other"] += 1;
    });
    return [...m.values()].map((s) => ({ ...s, pending: s.total - s.answered }));
  }, [inScope]);

  if (error) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.captured_at) return <div className="rounded-xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">No data yet.</div>;

  const save = async (row, patch) => {
    setMsg(null);
    try {
      const res = await api.activeMissingSave(row.tracking_number, patch);
      setRows((rs) => rs.map((r) => (r.tracking_number === row.tracking_number ? { ...r, ...res } : r)));
    } catch (e) {
      setMsg(e.message);
    }
  };
  const opt = data.options;
  const total = inScope.length;
  const done = inScope.filter((r) => answered(r, AM_KEYS)).length;
  const highPending = inScope.filter((r) => r.is_high_value && !answered(r, AM_KEYS)).length;

  const tnColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left", text: true },
    { key: "tracking_number", label: "Tracking Number", text: true, className: () => "font-mono text-xs" },
    { key: "type", label: "Type", text: true },
    { key: "age", label: "Age (days)", render: (r) => (r.age != null ? Number(r.age).toFixed(1) : "—") },
    { key: "cod_value", label: "COD Value", render: (r) => (r.cod_value != null ? r.cod_value.toLocaleString() : "—"), className: (r) => (r.is_high_value ? "font-semibold text-status-critical" : "") },
    { key: "item_description", label: "Item", text: true, render: (r) => <span title={r.item_description || ""}>{clip(r.item_description, 40) || "—"}</span>, className: (r) => (r.is_high_value ? "font-semibold text-status-critical" : "") },
    { key: "state", label: "Answer", sortValue: (r) => (answered(r, AM_KEYS) ? 1 : 0), render: (r) => (answered(r, AM_KEYS) ? <span className="font-medium text-status-good">Answered</span> : <span className="font-medium text-status-warning">To answer</span>) },
    { key: "ticket_updated", label: "Ticket to In Progress?", sortable: true, render: (r) => <SelectCell value={r.ticket_updated} options={opt.ticket_updated} onSave={(v) => save(r, { ticket_updated: v })} /> },
    { key: "parcel_found", label: "Parcel found?", render: (r) => <SelectCell value={r.parcel_found} options={opt.parcel_found} onSave={(v) => save(r, { parcel_found: v })} /> },
    { key: "contacted_customer", label: "If no, contacted customer?", render: (r) => <SelectCell value={r.contacted_customer} options={opt.contacted_customer} onSave={(v) => save(r, { contacted_customer: v })} /> },
    { key: "customer_received", label: "Customer already received?", render: (r) => <SelectCell value={r.customer_received} options={opt.customer_received} onSave={(v) => save(r, { customer_received: v })} /> },
    { key: "liable_party", label: "Liable party", render: (r) => <SelectCell value={r.liable_party} options={opt.liable_party} onSave={(v) => save(r, { liable_party: v })} /> },
    { key: "remarks", label: "Remarks (explain the current situation)", sortable: false, render: (r) => <TextCell value={r.remarks} rows={2} width="w-64" onSave={(v) => save(r, { remarks: v })} /> },
    { key: "checked_by", label: "Check by", render: (r) => <TextCell value={r.checked_by} onSave={(v) => save(r, { checked_by: v })} /> },
    { key: "updated_at", label: "Last update", sortValue: (r) => r.updated_at || "", render: (r) => (r.updated_at ? <span className="whitespace-nowrap text-[11px] text-slate-500">{formatTime(r.updated_at)}<br />{r.updated_by}</span> : dash) },
  ];
  const stationColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left", text: true },
    ...AM_TYPES.map((t) => ({ key: t, label: t })),
    { key: "total", label: "Total", className: () => "font-semibold text-status-critical" },
    { key: "answered", label: "Answered", className: () => "text-status-good" },
    { key: "pending", label: "To answer", className: (r) => (r.pending ? "font-semibold text-status-warning" : "text-slate-400") },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
        Every open missing tracking number in your access (Ship Out and B2B are left out). Answer for your own: pick from the lists or type, it saves as you go. A tracking number that is settled drops off by
        itself -- with its answers -- even if nobody answered it.
      </div>
      <Cards cols="sm:grid-cols-4" items={[["Active missing TNs", total.toLocaleString()], ["Answered", done.toLocaleString(), total ? `${Math.round((done / total) * 100)}%` : ""], ["To answer", (total - done).toLocaleString()], ["High value, to answer", highPending.toLocaleString(), "red rows below"]]} />
      {msg && <div className="rounded-lg bg-status-critical/5 px-3 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{msg}</div>}
      <SortTable title="By station" maxHeight="32vh" columns={stationColumns} rows={byStation} defaultSort={{ key: "pending", dir: "desc" }} rowKey={(r) => r.station_code} emptyMessage="No stations match." />
      <SortTable
        title="Active missing tracking numbers"
        titleExtra={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-48">
              <MultiSelect options={stationOptions} value={stations} onChange={setStations} placeholder="Search station (this table only)…" />
            </div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={toAnswerOnly} onChange={(e) => setToAnswerOnly(e.target.checked)} />
              To answer only
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={highOnly} onChange={(e) => setHighOnly(e.target.checked)} />
              High value only
            </label>
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-active-missing-${csvDate()}.csv`,
                  ["Station", "Tracking Number", "Type", "Age", "COD Value", "Item", "Ticket to In Progress?", "Parcel found?", "Contacted customer?", "Customer already received?", "Liable party", "Remarks", "Check by", "Last update", "Updated by"],
                  list.map((r) => [r.station_name, r.tracking_number, r.type, r.age ?? "", r.cod_value ?? "", r.item_description ?? "", r.ticket_updated ?? "", r.parcel_found ?? "", r.contacted_customer ?? "", r.customer_received ?? "", r.liable_party ?? "", r.remarks ?? "", r.checked_by ?? "", r.updated_at ?? "", r.updated_by ?? ""])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        }
        maxHeight="65vh"
        columns={tnColumns}
        rows={list}
        defaultSort={{ key: "age", dir: "desc" }}
        rowKey={(r) => r.tracking_number}
        emptyMessage="No tracking numbers match."
        footer={`${list.length.toLocaleString()} tracking numbers${data.truncated ? ` · showing the oldest ${data.rows.length.toLocaleString()} of ${data.total.toLocaleString()} -- filter by region / zone / station to see the rest` : ""}`}
      />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Lost Declared (This Week + Summary)
const LD_KEYS = ["customer_received", "liable_party", "remarks", "driver_name"];

export function LostDeclaredView({ view, me, ...props }) {
  const { refreshTick } = props;
  const isSummary = view === "summary";
  const [week, setWeek] = useState(null);
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [stations, setStations] = useState([]);
  const [toAnswerOnly, setToAnswerOnly] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setData(null);
  }, [view]);
  useEffect(() => {
    api
      .lostDeclared(view, isSummary ? week : null)
      .then((d) => {
        setData(d);
        setRows(d.rows);
        setError(null);
        if (isSummary && week == null) setWeek(d.week);
      })
      .catch((e) => setError(e.message));
  }, [view, week, refreshTick, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const inScope = useMemo(() => rows.filter((r) => inFilters(r, props)), [rows, props.regionFilter, props.zoneFilter, props.search, props.excludeEastMalaysia]); // eslint-disable-line react-hooks/exhaustive-deps
  const stationOptions = useMemo(() => [...new Set(inScope.map((r) => r.station_name))].sort().map((v) => ({ value: v, label: v })), [inScope]);
  const list = useMemo(() => inScope.filter((r) => (!stations.length || stations.includes(r.station_name)) && (!toAnswerOnly || !answered(r, LD_KEYS))), [inScope, stations, toAnswerOnly]);
  const outcomes = useMemo(() => [...new Set(inScope.map((r) => r.outcome).filter(Boolean))].sort(), [inScope]);
  const liableList = data?.options?.liable_party || [];
  const byStation = useMemo(() => {
    const m = new Map();
    inScope.forEach((r) => {
      if (!m.has(r.station_code)) m.set(r.station_code, { station_code: r.station_code, station_name: r.station_name, zone: r.zone, region: r.region, total: 0, answered: 0, notset: 0, out: {}, liable: {} });
      const s = m.get(r.station_code);
      s.total += 1;
      if (answered(r, LD_KEYS)) s.answered += 1;
      s.out[r.outcome || "?"] = (s.out[r.outcome || "?"] || 0) + 1;
      if (r.liable_party) s.liable[r.liable_party] = (s.liable[r.liable_party] || 0) + 1;
      else s.notset += 1;
    });
    return [...m.values()];
  }, [inScope]);

  if (error && !data) return <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;

  const canEdit = data.can_edit;
  const save = async (row, patch) => {
    setMsg(null);
    try {
      const res = await api.lostDeclaredSave(row.tracking_number, patch);
      setRows((rs) => rs.map((r) => (r.tracking_number === row.tracking_number ? { ...r, ...res } : r)));
    } catch (e) {
      setMsg(e.message);
    }
  };
  const move = async () => {
    if (!window.confirm("Move everything on Lost Declared This Week to the Summary now? (This also happens by itself every Monday at 10pm.)")) return;
    try {
      const r = await api.lostDeclaredMove();
      setMsg(`${r.moved} tracking number${r.moved === 1 ? "" : "s"} moved to the Summary.`);
      setReload((n) => n + 1);
    } catch (e) {
      setMsg(e.message);
    }
  };
  const opt = data.options;
  const total = inScope.length;
  const done = inScope.filter((r) => answered(r, LD_KEYS)).length;

  const columns = [
    { key: "station_name", label: "Station", sticky: true, align: "left", text: true },
    ...(isSummary ? [{ key: "week_no", label: "Week", render: (r) => r.week_no ?? "—" }] : []),
    { key: "tracking_number", label: "Tracking ID", text: true, className: () => "font-mono text-xs" },
    { key: "resolution_date", label: "Resolved", text: true, render: (r) => r.resolution_date || "—" },
    { key: "days_to_resolution", label: "Days to resolution", render: (r) => r.days_to_resolution ?? "—" },
    { key: "outcome", label: "Outcome", text: true, className: () => "whitespace-nowrap text-xs" },
    { key: "last_scan_type", label: "Last scan before resolution", text: true, className: () => "whitespace-nowrap text-xs text-slate-500" },
    { key: "cod_value", label: "COD Value", render: (r) => r.cod_value ?? "—" },
    { key: "ticket_notes", label: "Ticket notes", sortable: false, render: (r) => <span title={r.ticket_notes || ""} className="block max-w-[14rem] text-left text-xs">{clip(r.ticket_notes, 80) || "—"}</span> },
    { key: "items", label: "Items", sortable: false, render: (r) => <span title={items(r.items)} className="block max-w-[12rem] text-left text-xs">{clip(items(r.items), 60) || "—"}</span> },
    { key: "delivery_instructions", label: "Delivery instructions", sortable: false, render: (r) => <span title={r.delivery_instructions || ""} className="block max-w-[12rem] text-left text-xs text-slate-500">{clip(r.delivery_instructions, 50) || "—"}</span> },
    { key: "customer_received", label: "Customer already received?", render: (r) => <SelectCell value={r.customer_received} options={opt.customer_received} disabled={!canEdit} onSave={(v) => save(r, { customer_received: v })} /> },
    { key: "liable_party", label: "Liable party", render: (r) => <SelectCell value={r.liable_party} options={opt.liable_party} disabled={!canEdit} onSave={(v) => save(r, { liable_party: v })} /> },
    { key: "remarks", label: "Remarks (explain the current situation) -- RH / RFS", sortable: false, render: (r) => <TextCell value={r.remarks} rows={2} width="w-64" disabled={!canEdit} onSave={(v) => save(r, { remarks: v })} /> },
    { key: "driver_name", label: "If under driver: driver display name", render: (r) => <TextCell value={r.driver_name} disabled={!canEdit} width="w-44" onSave={(v) => save(r, { driver_name: v })} /> },
    { key: "checked_by", label: "Check by", render: (r) => <TextCell value={r.checked_by} disabled={!canEdit} onSave={(v) => save(r, { checked_by: v })} /> },
    { key: "updated_at", label: "Last update", sortValue: (r) => r.updated_at || "", render: (r) => (r.updated_at ? <span className="whitespace-nowrap text-[11px] text-slate-500">{formatTime(r.updated_at)}<br />{r.updated_by}</span> : dash) },
  ];
  const stationColumns = [
    { key: "station_name", label: "Station", sticky: true, align: "left", text: true },
    ...outcomes.map((o) => ({ key: `o:${o}`, label: o.replace("LOST - ", "").replace("NO RESPONSE - ", "NO RESP. - "), sortValue: (r) => r.out[o] || 0, render: (r) => r.out[o] || 0 })),
    ...liableList.map((l) => ({ key: `l:${l}`, label: l, sortValue: (r) => r.liable[l] || 0, render: (r) => r.liable[l] || <span className="text-slate-300">0</span> })),
    { key: "notset", label: "No liable party yet", className: (r) => (r.notset ? "font-semibold text-status-warning" : "text-slate-400") },
    { key: "total", label: "Total", className: () => "font-semibold text-status-critical" },
  ];
  const weekLabel = data.weeks.find((w) => w.key === data.week);

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
        {isSummary ? (
          <>What Lost Declared This Week collected, moved here every Monday at 10pm for good (answers included). </>
        ) : (
          <>
            The tickets declared lost this week, from the Metabase question{" "}
            <a href="https://metabase.ninjavan.co/question/125947-this-week-lost-declared" target="_blank" rel="noopener noreferrer" className="font-medium text-sky-700 underline hover:text-sky-900">
              This Week Lost Declared ↗
            </a>
            {data.upload ? ` -- last loaded ${formatTime(data.upload.uploaded_at)} (${data.upload.filename}).` : " -- nothing loaded yet."} Everything on this list moves to the Summary every Monday at 10pm.{" "}
          </>
        )}
        {canEdit ? "You can answer for the stations in your access." : "Only region staff (and managers / admins) answer here; you can monitor the stations in your access."}
      </div>

      {!isSummary && me.role === "admin" && (
        <div className="space-y-2">
          <KpiUploadPanel kpi="recovery" me={me} title="Data upload (admins) -- the Metabase CSV, once a day" onChanged={() => setReload((n) => n + 1)} />
          <div className="flex justify-end">
            <button onClick={move} className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
              Move everything to the Summary now
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {isSummary && (
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
            Week
            <select className={selectClass} value={data.week || "all"} onChange={(e) => setWeek(e.target.value)}>
              {data.weeks.map((w) => (
                <option key={w.key} value={w.key}>
                  Week {w.week} ({w.year}) · {w.count}
                </option>
              ))}
              <option value="all">All weeks</option>
            </select>
          </label>
        )}
        <Cards
          cols="sm:grid-cols-3 flex-1"
          items={[
            [isSummary ? `Lost declared${weekLabel ? ` · week ${weekLabel.week}` : ""}` : "Lost declared this week", total.toLocaleString()],
            ["Answered", done.toLocaleString(), total ? `${Math.round((done / total) * 100)}%` : ""],
            ["To answer", (total - done).toLocaleString()],
          ]}
        />
      </div>
      {msg && <div className="rounded-lg bg-status-critical/5 px-3 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{msg}</div>}

      <SortTable title="By station — outcome and liable party" maxHeight="32vh" columns={stationColumns} rows={byStation} defaultSort={{ key: "total", dir: "desc" }} rowKey={(r) => r.station_code} emptyMessage="No lost declared tracking numbers." />

      <SortTable
        title={isSummary ? "Lost Declared Summary" : "Lost Declared This Week"}
        titleExtra={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-48">
              <MultiSelect options={stationOptions} value={stations} onChange={setStations} placeholder="Search station (this table only)…" />
            </div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={toAnswerOnly} onChange={(e) => setToAnswerOnly(e.target.checked)} />
              To answer only
            </label>
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-lost-declared-${isSummary ? "summary" : "this-week"}-${csvDate()}.csv`,
                  ["Week", "Station", "Tracking ID", "Resolved", "Days to resolution", "Outcome", "Last scan before resolution", "COD Value", "Ticket notes", "Items", "Delivery instructions", "Customer already received?", "Liable party", "Remarks", "Driver display name", "Check by", "Last update", "Updated by"],
                  list.map((r) => [r.week_no ?? "", r.station_name, r.tracking_number, r.resolution_date ?? "", r.days_to_resolution ?? "", r.outcome ?? "", r.last_scan_type ?? "", r.cod_value ?? "", r.ticket_notes ?? "", items(r.items), r.delivery_instructions ?? "", r.customer_received ?? "", r.liable_party ?? "", r.remarks ?? "", r.driver_name ?? "", r.checked_by ?? "", r.updated_at ?? "", r.updated_by ?? ""])
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        }
        maxHeight="65vh"
        columns={columns}
        rows={list}
        defaultSort={{ key: "resolution_date", dir: "desc" }}
        rowKey={(r) => r.tracking_number}
        emptyMessage={isSummary ? "Nothing in the Summary yet -- it fills every Monday at 10pm." : "No lost declared tracking numbers this week."}
        footer={`${list.length.toLocaleString()} tracking numbers${data.truncated ? ` · showing the newest ${data.rows.length.toLocaleString()} of ${data.total.toLocaleString()}` : ""}`}
      />
    </div>
  );
}
