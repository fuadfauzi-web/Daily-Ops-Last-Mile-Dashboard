import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import DataTable from "../components/DataTable";
import Skeleton from "../components/Skeleton";
import { exportCsv } from "../lib/csv";
import { formatTime } from "../lib/format";
import HBars from "./HBars";
import KpiUploadPanel from "./KpiUploadPanel";
import { dec1, groupBy, int, pct1, pctOf, selectClass, sortBy } from "./fmt";

// COD RTS -- the RCA view (staging). Which COD parcels went back to the shipper (RTS) and why: by hub, reason, shipper, driver and
// whether they were returned before a first attempt. The KPI (RTS rate, target under 9%) needs all COD orders as its denominator, which
// is not in the file, so this page shows COUNTS and shares; the rate stays with the OPEX result. Data: the RAW COD sheet of the RTS
// Analysis file (and, optionally, its RAW Overal sheet for the all-RTS view), uploaded here.

export default function CodRtsRca({ me }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [hub, setHub] = useState(null);
  const [reason, setReason] = useState(null);
  const [shipper, setShipper] = useState(null);
  const [driver, setDriver] = useState(null);
  const [tns, setTns] = useState(null);
  const [tnBusy, setTnBusy] = useState(false);
  const [sort, setSort] = useState({ key: "rts", dir: "desc" });
  const [showUpload, setShowUpload] = useState(false);
  const canUpload = me.role === "admin";

  const load = () =>
    api
      .kpiCodRts()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  useEffect(() => setTns(null), [region, zone, hub, reason, shipper, driver]);

  const hubs = data?.hubs || [];
  const hubMeta = useMemo(() => new Map(hubs.map((h) => [h.code, h])), [hubs]);
  const regions = useMemo(() => [...new Set(hubs.map((h) => h.region))].sort(), [hubs]);
  const zones = useMemo(() => [...new Set(hubs.filter((h) => region === "all" || h.region === region).map((h) => h.zone))].sort(), [hubs, region]);
  const okHub = (code) => {
    const m = hubMeta.get(code);
    return !!m && (region === "all" || m.region === region) && (zone === "all" || m.zone === zone);
  };

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.has_data) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">No COD RTS data uploaded yet</div>
          <p className="mt-2">Upload the RTS Analysis file (the whole workbook is fine -- its RAW COD sheet is used, and RAW Overal too if you add it) and this page shows why COD parcels are returned.</p>
        </div>
        <KpiUploadPanel kpi="cod_rts" me={me} onChanged={load} />
      </div>
    );
  }

  const hubRows = sortBy(
    hubs.filter((h) => okHub(h.code)).map((h) => ({ ...h, beforePct: pctOf(h.before_first_attempt, h.rts), returnedPct: pctOf(h.returned, h.rts) })),
    sort.key,
    sort.dir
  );
  const scopeCodes = hub ? [hub] : hubRows.map((h) => h.code);
  const inScope = (code) => scopeCodes.includes(code);
  const total = hubRows.filter((h) => inScope(h.code)).reduce((a, h) => ({ rts: a.rts + h.rts, before: a.before + h.before_first_attempt, returned: a.returned + h.returned }), { rts: 0, before: 0, returned: 0 });
  const tally = (list, field) =>
    [...groupBy(list.filter((r) => inScope(r.code)), (r) => r[field]).entries()].map(([label, rows]) => ({ key: label, label, value: rows.reduce((s, r) => s + r.count, 0) })).sort((a, b) => b.value - a.value);
  const reasons = tally(data.reasons, "reason");
  const statuses = tally(data.statuses, "status");
  const ctypes = tally(data.courier_types, "type");
  const shippers = tally(data.shippers, "shipper");
  const drivers = sortBy(
    [...groupBy(data.drivers.filter((d) => inScope(d.code)), (d) => d.driver).entries()].map(([name, rows]) => ({ key: name, driver: name, count: rows.reduce((s, r) => s + r.count, 0), before: rows.reduce((s, r) => s + r.before_first_attempt, 0) })),
    "count",
    "desc"
  ).slice(0, 20);
  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "zone" ? "asc" : "desc" }));
  const hubName = hub ? hubMeta.get(hub)?.name : null;
  const where = hubName ? `Station ${hubName}` : "all stations in view";
  const filterText = [hubName && `Station ${hubName}`, reason && `reason "${reason}"`, shipper && `shipper ${shipper}`, driver && `driver ${driver}`].filter(Boolean).join(" · ");

  const loadTns = async () => {
    setTnBusy(true);
    try {
      const q = {};
      if (hub) q.hub = hub;
      if (reason) q.reason = reason;
      if (shipper) q.shipper = shipper;
      if (driver) q.driver = driver;
      setTns(await api.kpiCodRtsTns(q));
    } catch (e) {
      setError(e.message);
    } finally {
      setTnBusy(false);
    }
  };

  const ov = data.overall;
  const ovScope = ov ? { hubs: ov.hubs.filter((h) => inScope(h.code)), reasons: ov.reasons.filter((r) => inScope(r.code)), attempts: ov.attempts.filter((a) => inScope(a.code)) } : null;
  const ovReasons = ovScope ? [...groupBy(ovScope.reasons, (r) => r.reason).entries()].map(([label, rows]) => ({ key: label, label, value: rows.reduce((s, r) => s + r.count, 0) })).sort((a, b) => b.value - a.value) : [];
  const ovAttempts = ovScope ? [0, 1, 2, 3].map((n) => ({ key: String(n), label: n === 3 ? "3+ attempts" : `${n} attempt${n === 1 ? "" : "s"}`, value: ovScope.attempts.filter((a) => a.attempts === n).reduce((s, a) => s + a.count, 0) })) : [];
  const ovTotal = ovScope ? ovScope.hubs.reduce((s, h) => s + h.total, 0) : 0;
  const ovCod = ovScope ? ovScope.hubs.reduce((s, h) => s + h.cod_value, 0) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
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
        {(hub || reason || shipper || driver) && (
          <button onClick={() => { setHub(null); setReason(null); setShipper(null); setDriver(null); }} className="text-xs font-medium text-slate-500 underline hover:text-brand">
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
      {showUpload && <KpiUploadPanel kpi="cod_rts" me={me} onChanged={load} />}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["COD parcels RTS", int(total.rts)],
          ["Before a 1st attempt", `${int(total.before)} (${pct1(pctOf(total.before, total.rts))})`],
          ["Already returned", `${int(total.returned)} (${pct1(pctOf(total.returned, total.rts))})`],
          ["Top reason", reasons[0] ? `${reasons[0].label} (${pct1(pctOf(reasons[0].value, total.rts))})` : "—"],
        ].map(([t, v]) => (
          <div key={t} className="rounded-lg border-l-4 border-brand bg-white px-3 py-2 ring-1 ring-slate-200">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t}</div>
            <div className="mt-0.5 font-display text-base font-black text-ink">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <DataTable
          title="COD RTS by station"
          titleExtra={<span className="text-[10px] text-slate-400">click a station to break it down</span>}
          maxHeight="480px"
          columns={[
            { key: "name", label: "Station", sticky: true, align: "left", render: (r) => r.name },
            { key: "zone", label: "Zone", className: () => "text-slate-500" },
            { key: "rts", label: "RTS parcels", render: (r) => int(r.rts) },
            { key: "before_first_attempt", label: "Before 1st attempt", render: (r) => `${int(r.before_first_attempt)} (${pct1(r.beforePct)})` },
            { key: "returned", label: "Returned", render: (r) => `${int(r.returned)} (${pct1(r.returnedPct)})` },
            { key: "avg_days_to_first_attempt", label: "Avg days to 1st attempt", render: (r) => (r.avg_days_to_first_attempt == null ? "—" : dec1(r.avg_days_to_first_attempt)) },
          ]}
          rows={hubRows}
          rowKey={(r) => r.code}
          rowClassName={(r) => (r.code === hub ? "bg-brand/10" : "")}
          onRowClick={(r) => { setHub(hub === r.code ? null : r.code); setDriver(null); }}
          sortKey={sort.key}
          sortDir={sort.dir}
          onSort={toggleSort}
          emptyMessage="No stations match."
          footer={`${hubRows.length} stations · "Returned" = already back with the shipper (status Returned to Sender)`}
        />
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <div className="mb-2 border-b-2 border-brand pb-1 font-display text-xs font-bold uppercase tracking-wide text-ink">Why they are returned — {where}</div>
            <HBars rows={reasons} picked={reason} onPick={setReason} max={8} sub={undefined} />
          </div>
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <div className="mb-2 border-b-2 border-brand pb-1 font-display text-xs font-bold uppercase tracking-wide text-ink">Where they are now — {where}</div>
            <HBars rows={statuses} max={6} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="mb-2 border-b-2 border-brand pb-1 font-display text-xs font-bold uppercase tracking-wide text-ink">Top shippers — {where}</div>
          <HBars rows={shippers} picked={shipper} onPick={setShipper} max={10} />
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="mb-2 border-b-2 border-brand pb-1 font-display text-xs font-bold uppercase tracking-wide text-ink">Driver type — {where}</div>
          <HBars rows={ctypes} max={8} />
        </div>
      </div>

      <DataTable
        title={`Drivers with the most COD RTS — ${where}`}
        titleExtra={<span className="text-[10px] text-slate-400">click a driver to filter the tracking numbers</span>}
        maxHeight="360px"
        columns={[
          { key: "driver", label: "Driver", sticky: true, align: "left", sortable: false, render: (r) => r.driver },
          { key: "count", label: "RTS parcels", sortable: false, render: (r) => int(r.count) },
          { key: "before", label: "Before 1st attempt", sortable: false, render: (r) => int(r.before) },
        ]}
        rows={drivers}
        rowKey={(r) => r.key}
        rowClassName={(r) => (r.driver === driver ? "bg-brand/10" : "")}
        onRowClick={(r) => setDriver(driver === r.driver ? null : r.driver)}
        emptyMessage="No drivers."
        footer={'Top 20 by RTS parcels. "(no driver)" = the parcel was returned without ever being routed to a driver.'}
      />

      {ovScope && (
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="mb-2 border-b-2 border-brand pb-1 font-display text-xs font-bold uppercase tracking-wide text-ink">
            All RTS (overall file) — {where}: {int(ovTotal)} parcels, COD value RM {int(ovCod)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">By reason</div>
              <HBars rows={ovReasons} max={8} />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">Delivery attempts before the RTS</div>
              <HBars rows={ovAttempts} max={4} />
            </div>
          </div>
        </div>
      )}

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
                  `daily-ops-cod-rts-${(hubName || "all").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
                  ["Tracking ID", "Station", "RTS reason", "Status", "Shipper", "Driver", "Driver type", "Before 1st attempt", "Days to 1st attempt", "Parcel size"],
                  tns.rows.map((r) => [r.tracking_id, r.hub, r.reason, r.status, r.shipper, r.driver, r.courier_type, r.before_first_attempt ? "Yes" : "No", r.days_to_first_attempt ?? "", r.parcel_size])
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
              { key: "reason", label: "RTS reason", sortable: false, className: () => "text-xs text-slate-700", render: (r) => r.reason },
              { key: "status", label: "Status", sortable: false, className: () => "text-xs text-slate-700", render: (r) => r.status },
              { key: "shipper", label: "Shipper", sortable: false, className: () => "text-xs text-slate-700", render: (r) => r.shipper },
              { key: "driver", label: "Driver", sortable: false, className: () => "text-xs text-slate-500", render: (r) => r.driver },
              { key: "before_first_attempt", label: "Before 1st attempt", sortable: false, className: () => "text-xs text-slate-500", render: (r) => (r.before_first_attempt ? "Yes" : "") },
            ]}
            rows={tns.rows.slice(0, 500)}
            rowKey={(r, i) => `${r.tracking_id}-${i}`}
            emptyMessage="No tracking numbers for this selection."
            footer={`${tns.rows.length.toLocaleString()}${tns.capped ? "+ (capped)" : ""} tracking numbers${tns.rows.length > 500 ? " · showing the first 500 -- the CSV has them all" : ""}`}
          />
        )}
      </div>
    </div>
  );
}
