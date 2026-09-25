import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import DataTable from "../components/DataTable";
import Skeleton from "../components/Skeleton";
import { exportCsv } from "../lib/csv";
import { formatTime } from "../lib/format";
import HBars from "./HBars";
import KpiUploadPanel from "./KpiUploadPanel";
import { groupBy, int, pct1, pctOf, selectClass, sortBy } from "./fmt";

// Invalid POD -- the RCA view (staging). Every failed delivery attempt is validated: FAILURE = the proof of delivery attempt was judged
// invalid, SUCCESS = valid. The KPI is the invalid share (target under 25%); this shows WHERE it comes from -- hub, reason, driver --
// and lists the tracking numbers behind every number. Data: the Raw sheet of the POD Validation Analysis file, uploaded here.
const TARGET = 25;
const WARN = 20;
const sev = (p) => (p >= TARGET ? "font-semibold text-status-critical" : p >= WARN ? "font-medium text-status-warning" : "text-status-good");

export default function InvalidPodRca({ me }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [week, setWeek] = useState("all");
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [hub, setHub] = useState(null);
  const [reason, setReason] = useState(null);
  const [courier, setCourier] = useState(null);
  const [tns, setTns] = useState(null);
  const [tnBusy, setTnBusy] = useState(false);
  const [sort, setSort] = useState({ key: "invalidPct", dir: "desc" });
  const [showUpload, setShowUpload] = useState(false);
  const canUpload = me.role === "admin";

  const load = () =>
    api
      .kpiInvalidPod()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  useEffect(() => setTns(null), [week, region, zone, hub, reason, courier]);

  const hubs = data?.hubs || [];
  const inWeek = (w) => week === "all" || w === week;
  const hubMeta = useMemo(() => new Map(hubs.map((h) => [h.code, h])), [hubs]);
  const regions = useMemo(() => [...new Set(hubs.map((h) => h.region))].sort(), [hubs]);
  const zones = useMemo(() => [...new Set(hubs.filter((h) => region === "all" || h.region === region).map((h) => h.zone))].sort(), [hubs, region]);
  const okHub = (code) => {
    const m = hubMeta.get(code);
    return !!m && (region === "all" || m.region === region) && (zone === "all" || m.zone === zone);
  };

  // hubs table rows: one per hub, weeks combined
  const hubRows = useMemo(() => {
    const by = groupBy(hubs.filter((h) => inWeek(h.week) && okHub(h.code)), (h) => h.code);
    return [...by.entries()].map(([code, rows]) => {
      const total = rows.reduce((s, r) => s + r.total, 0);
      const invalid = rows.reduce((s, r) => s + r.invalid, 0);
      return { code, name: rows[0].name, zone: rows[0].zone, total, invalid, valid: total - invalid, invalidPct: pctOf(invalid, total) };
    });
  }, [hubs, week, region, zone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.has_data) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">No POD validation data uploaded yet</div>
          <p className="mt-2">Upload the POD Validation Analysis file (the whole workbook is fine -- its Raw sheet is used) and this page breaks the invalid POD % down by hub, reason and driver.</p>
        </div>
        <KpiUploadPanel kpi="invalid_pod" me={me} onChanged={load} />
      </div>
    );
  }

  const scopeCodes = hub ? [hub] : hubRows.map((h) => h.code);
  const inScope = (code) => scopeCodes.includes(code);
  const totals = hubRows.reduce((a, h) => ({ total: a.total + h.total, invalid: a.invalid + h.invalid }), { total: 0, invalid: 0 });
  const reasonRows = [...groupBy(data.reasons.filter((r) => inWeek(r.week) && inScope(r.code)), (r) => r.reason).entries()]
    .map(([label, rows]) => ({ key: label, label, value: rows.reduce((s, r) => s + r.count, 0) }))
    .sort((a, b) => b.value - a.value);
  const invalidInScope = reasonRows.reduce((s, r) => s + r.value, 0);
  const courierRows = sortBy(
    [...groupBy(data.couriers.filter((c) => inWeek(c.week) && inScope(c.code)), (c) => `${c.code}|${c.courier}`).entries()].map(([k, rows]) => {
      const total = rows.reduce((s, r) => s + r.total, 0);
      const invalid = rows.reduce((s, r) => s + r.invalid, 0);
      return { key: k, courier: rows[0].courier, station: hubMeta.get(rows[0].code)?.name || rows[0].code, total, invalid, invalidPct: pctOf(invalid, total) };
    }),
    "invalid",
    "desc"
  ).slice(0, 25);

  const tableRows = sortBy(hubRows, sort.key, sort.dir);
  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "zone" ? "asc" : "desc" }));

  const loadTns = async () => {
    setTnBusy(true);
    try {
      const q = {};
      if (hub) q.hub = hub;
      if (week !== "all") q.week = week;
      if (reason) q.reason = reason;
      if (courier) q.courier = courier;
      setTns(await api.kpiInvalidPodTns(q));
    } catch (e) {
      setError(e.message);
    } finally {
      setTnBusy(false);
    }
  };

  const hubName = hub ? hubMeta.get(hub)?.name : null;
  const filterText = [hubName && `Station ${hubName}`, reason && `reason "${reason}"`, courier && `driver ${courier}`, week !== "all" && (data.weeks.find((w) => w.key === week)?.label || week)].filter(Boolean).join(" · ");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        {data.weeks.length > 1 && (
          <select className={selectClass} value={week} onChange={(e) => setWeek(e.target.value)} aria-label="Week">
            <option value="all">All weeks</option>
            {data.weeks.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
        )}
        <select className={selectClass} value={region} onChange={(e) => { setRegion(e.target.value); setZone("all"); setHub(null); }} aria-label="Region">
          <option value="all">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select className={selectClass} value={zone} onChange={(e) => { setZone(e.target.value); setHub(null); }} aria-label="Zone">
          <option value="all">All zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        {(hub || reason || courier) && (
          <button onClick={() => { setHub(null); setReason(null); setCourier(null); }} className="text-xs font-medium text-slate-500 underline hover:text-brand">
            Clear picks
          </button>
        )}
        <span className="text-xs text-slate-400">From {data.meta.filename} · {formatTime(data.meta.uploaded_at)}</span>
        {canUpload && (
          <button onClick={() => setShowUpload((v) => !v)} className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
            {showUpload ? "Hide data upload" : "Data upload"}
          </button>
        )}
      </div>
      {showUpload && <KpiUploadPanel kpi="invalid_pod" me={me} onChanged={load} />}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Validated attempts", int(totals.total)],
          ["Invalid POD", int(totals.invalid)],
          ["Invalid %", <span key="p" className={sev(pctOf(totals.invalid, totals.total))}>{pct1(pctOf(totals.invalid, totals.total))}</span>],
          ["Top reason", reasonRows[0] ? `${reasonRows[0].label} (${pct1(pctOf(reasonRows[0].value, invalidInScope))})` : "—"],
        ].map(([t, v]) => (
          <div key={t} className="rounded-lg border-l-4 border-brand bg-white px-3 py-2 ring-1 ring-slate-200">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t}</div>
            <div className="mt-0.5 font-display text-base font-black text-ink">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <DataTable
          title={`Invalid POD by station (target under ${TARGET}%)`}
          titleExtra={<span className="text-[10px] text-slate-400">click a station to break it down</span>}
          maxHeight="480px"
          columns={[
            { key: "name", label: "Station", sticky: true, align: "left", render: (r) => r.name },
            { key: "zone", label: "Zone", className: () => "text-slate-500" },
            { key: "total", label: "Validated", render: (r) => int(r.total) },
            { key: "invalid", label: "Invalid", render: (r) => int(r.invalid) },
            { key: "invalidPct", label: "Invalid %", render: (r) => pct1(r.invalidPct), className: (r) => sev(r.invalidPct) },
          ]}
          rows={tableRows}
          rowKey={(r) => r.code}
          rowClassName={(r) => (r.code === hub ? "bg-brand/10" : "")}
          onRowClick={(r) => { setHub(hub === r.code ? null : r.code); setCourier(null); }}
          sortKey={sort.key}
          sortDir={sort.dir}
          onSort={toggleSort}
          emptyMessage="No stations match."
          footer={`${tableRows.length} stations · red = at or over ${TARGET}%, amber = ${WARN}%+`}
        />
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="mb-2 border-b-2 border-brand pb-1 font-display text-xs font-bold uppercase tracking-wide text-ink">
            Why it's invalid — {hubName ? `Station ${hubName}` : "all stations in view"}
          </div>
          <HBars
            rows={reasonRows}
            picked={reason}
            onPick={setReason}
            format={int}
            max={10}
            empty="No invalid attempts here."
          />
          <div className="mt-1 text-[11px] text-slate-400">Click a reason to filter the drivers and the tracking numbers below.</div>
        </div>
      </div>

      <DataTable
        title={`Drivers with the most invalid POD — ${hubName ? `Station ${hubName}` : "all stations in view"}${reason ? "" : ""}`}
        titleExtra={<span className="text-[10px] text-slate-400">click a driver to filter the tracking numbers</span>}
        maxHeight="360px"
        columns={[
          { key: "courier", label: "Driver", sticky: true, align: "left", sortable: false, render: (r) => r.courier },
          { key: "station", label: "Station", sortable: false, className: () => "text-slate-500" },
          { key: "invalid", label: "Invalid", sortable: false, render: (r) => int(r.invalid) },
          { key: "total", label: "Validated", sortable: false, render: (r) => int(r.total) },
          { key: "invalidPct", label: "Invalid %", sortable: false, render: (r) => pct1(r.invalidPct), className: (r) => sev(r.invalidPct) },
        ]}
        rows={courierRows}
        rowKey={(r) => r.key}
        rowClassName={(r) => (r.courier === courier ? "bg-brand/10" : "")}
        onRowClick={(r) => setCourier(courier === r.courier ? null : r.courier)}
        emptyMessage="No drivers with invalid POD here."
        footer="Top 25 by invalid count."
      />

      <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="font-display text-sm font-medium text-slate-700">Tracking numbers{filterText ? ` — ${filterText}` : " — everything in view"}</div>
          <button onClick={loadTns} disabled={tnBusy} className="min-h-[36px] rounded-lg bg-brand px-3 font-display text-xs font-semibold text-white disabled:opacity-50">
            {tnBusy ? "Loading…" : tns ? "Reload" : "Show tracking numbers"}
          </button>
          {tns && (
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-invalid-pod-${(hubName || "all").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
                  ["Tracking ID", "Hub", "Driver", "Failure reason", "Invalid POD reason", "Attempted", "Validated", "Validated by"],
                  tns.rows.map((r) => [r.tracking_id, r.hub, r.courier, r.failure_reason, r.invalid_reason, r.attempted, r.validated, r.validator])
                )
              }
              className="min-h-[36px] rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV ({tns.rows.length.toLocaleString()}{tns.capped ? "+" : ""})
            </button>
          )}
        </div>
        {tns && (
          <DataTable
            maxHeight="420px"
            columns={[
              { key: "tracking_id", label: "Tracking ID", sticky: true, align: "left", sortable: false, className: () => "font-mono text-xs", render: (r) => r.tracking_id },
              { key: "courier", label: "Driver", sortable: false, className: () => "text-xs text-slate-700", render: (r) => r.courier },
              { key: "invalid_reason", label: "Invalid POD reason", sortable: false, className: () => "text-xs text-slate-700", render: (r) => r.invalid_reason },
              { key: "failure_reason", label: "Failure reason", sortable: false, className: () => "text-xs text-slate-500", render: (r) => r.failure_reason },
              { key: "attempted", label: "Attempted", sortable: false, className: () => "text-xs text-slate-500", render: (r) => r.attempted },
              { key: "validator", label: "Validated by", sortable: false, className: () => "text-xs text-slate-500", render: (r) => r.validator },
            ]}
            rows={tns.rows.slice(0, 500)}
            rowKey={(r, i) => `${r.tracking_id}-${i}`}
            emptyMessage="No invalid tracking numbers for this selection."
            footer={`${tns.rows.length.toLocaleString()}${tns.capped ? "+ (capped)" : ""} tracking numbers${tns.rows.length > 500 ? " · showing the first 500 -- the CSV has them all" : ""}`}
          />
        )}
      </div>
    </div>
  );
}
