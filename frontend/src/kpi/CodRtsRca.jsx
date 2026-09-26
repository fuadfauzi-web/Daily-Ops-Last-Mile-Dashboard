import { useEffect, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import { exportCsv } from "../lib/csv";
import { formatTime } from "../lib/format";
import HBars from "./HBars";
import KpiUploadPanel from "./KpiUploadPanel";
import { kpiTargetText, useKpiTargets } from "../lib/kpiTargets";
import { dec1, int, pct1, selectClass } from "./fmt";
import { Cards, Panel, SortTable, TabsBar, TrendPanel, useApi, withPct } from "./rcaUi";

// COD RTS -- the RCA view. Which COD parcels went back to the shipper (RTS) and why. The KPI (RTS rate, target per region -- Admin -> KPI Targets) needs all COD
// orders as its denominator, which is not in the file, so this shows COUNTS and shares; the rate stays with the OPEX result.
//   Overview   stations, reasons, where the parcels are now, shippers, drivers, all-RTS summary
//   Reasons    every reason: share, before a 1st attempt, top station / shipper -- click one for the stations, shippers and driver types behind it
//   Shippers   who the parcels come from: share, cumulative share (Pareto), top reason -- and the parent-shipper roll-up
//   Drivers    the drivers with the most, with their own top reason
//   Timing     how long until the first attempt, before-a-first-attempt by station, FIFO N0, attempts before the RTS
//   Parcels    by parcel size, driver type, status, lost, FIFO
//   Date trend RTS per day for a region, zone, station or reason
//   Tracking numbers   the list behind whatever is picked
// Data: the RAW COD sheet of the RTS Analysis file (Metabase COD RTS Rate) and, optionally, its RAW Overal sheet (Metabase RTS Overall). Scope-limited.
const noneIf = (v) => (v === "all" ? undefined : v);

export default function CodRtsRca({ me }) {
  const canUpload = me.role === "admin";
  const [tab, setTab] = useState("overview");
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [hub, setHub] = useState(null);
  const [reason, setReason] = useState(null);
  const [shipper, setShipper] = useState(null);
  const [driver, setDriver] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [reload, setReload] = useState(0);
  const [opts, setOpts] = useState(null);

  const apiTab = tab === "trend" || tab === "tns" ? "overview" : tab;
  const q = { tab: apiTab, region: noneIf(region), zone: noneIf(zone), hub, reason: apiTab === "reasons" ? reason : undefined, shipper: apiTab === "shippers" ? shipper : undefined };
  const { data, error, loading } = useApi(() => api.kpiCodRtsView(q), [apiTab, region, zone, hub, apiTab === "reasons" ? reason : null, apiTab === "shippers" ? shipper : null, reload]);
  useEffect(() => {
    if (data?.options) setOpts(data.options);
  }, [data]);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "reasons", label: "Reasons" },
    { key: "shippers", label: "Shippers" },
    { key: "drivers", label: "Drivers" },
    { key: "timing", label: "Timing & attempts" },
    { key: "parcels", label: "Parcels" },
    { key: "trend", label: "Date trend" },
    { key: "tns", label: "Tracking numbers" },
  ];

  if (error && !data) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  if (!data.has_data) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">No COD RTS data uploaded yet</div>
          <p className="mt-2">Download the COD RTS Rate (and RTS Overall) results from Metabase -- links in the upload panel -- or use the RTS Analysis file (the whole workbook is fine). This page then shows why COD parcels are returned.</p>
          {!canUpload && <p className="mt-2 text-xs text-slate-400">Admins upload the data.</p>}
        </div>
        <KpiUploadPanel kpi="cod_rts" me={me} onChanged={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  const regions = opts?.regions || [];
  const zones = (opts?.zones || []).filter(([, r]) => region === "all" || r === region).map(([z]) => z);
  const hubList = (opts?.hubs || []).filter((h) => (region === "all" || h.region === region) && (zone === "all" || h.zone === zone));
  const hubName = hub ? opts?.hubs?.find((h) => h.code === hub)?.name : null;
  const picks = [hubName && `Station ${hubName}`, reason && `reason “${reason}”`, shipper && `shipper ${shipper}`, driver && `driver ${driver}`].filter(Boolean);
  const ready = data.tab === apiTab;
  const where = hubName ? `Station ${hubName}` : "all stations in view";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <TabsBar tabs={tabs} value={tab} onChange={setTab} />
      </div>
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
        <select className={selectClass} value={hub || "all"} onChange={(e) => setHub(e.target.value === "all" ? null : e.target.value)} aria-label="Station">
          <option value="all">All stations</option>
          {hubList.map((h) => (
            <option key={h.code} value={h.code}>{h.name}</option>
          ))}
        </select>
        {picks.length > 0 && (
          <>
            <span className="text-xs text-slate-500">Picked: {picks.join(" · ")}</span>
            <button onClick={() => { setHub(null); setReason(null); setShipper(null); setDriver(null); }} className="text-xs font-medium text-slate-500 underline hover:text-brand">
              Clear picks
            </button>
          </>
        )}
        <span className="text-xs text-slate-400">From {data.meta.filename} · {formatTime(data.meta.uploaded_at)}</span>
        {loading && <span className="text-xs text-slate-400">Loading…</span>}
        {canUpload && (
          <button onClick={() => setShowUpload((v) => !v)} className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
            {showUpload ? "Hide data upload" : "Data upload"}
          </button>
        )}
      </div>
      {showUpload && <KpiUploadPanel kpi="cod_rts" me={me} onChanged={() => setReload((n) => n + 1)} />}

      {tab === "trend" ? (
        <CodTrend region={region} zone={zone} hub={hub} />
      ) : tab === "tns" ? (
        <CodTns region={region} zone={zone} hub={hub} reason={reason} shipper={shipper} driver={driver} picks={picks} />
      ) : !ready ? (
        <Skeleton />
      ) : (
        <>
          {tab === "overview" && <CodOverview v={data} where={where} hub={hub} setHub={setHub} reason={reason} setReason={setReason} shipper={shipper} setShipper={setShipper} driver={driver} setDriver={setDriver} />}
          {tab === "reasons" && <CodReasons v={data} reason={reason} setReason={setReason} />}
          {tab === "shippers" && <CodShippers v={data} shipper={shipper} setShipper={setShipper} />}
          {tab === "drivers" && <CodDrivers v={data} driver={driver} setDriver={setDriver} />}
          {tab === "timing" && <CodTiming v={data} where={where} />}
          {tab === "parcels" && <CodParcels v={data} where={where} />}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Overview
function CodOverview({ v, where, hub, setHub, reason, setReason, shipper, setShipper, driver, setDriver }) {
  useKpiTargets(); // the target line below draws once the targets are known
  const t = v.totals;
  const ov = v.overall;
  return (
    <div className="space-y-3">
      <Cards
        cols="sm:grid-cols-5"
        items={[
          ["COD parcels RTS", int(t.count)],
          ["Before a 1st attempt", withPct(t.before, t.before_pct)],
          ["Already returned", withPct(t.returned, t.returned_pct)],
          ["Top reason", v.reasons[0] ? `${v.reasons[0].label} (${pct1(v.reasons[0].share)})` : "—"],
          ["Avg days to 1st attempt", t.avg_days == null ? "—" : dec1(t.avg_days)],
        ]}
      />
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">
        The COD RTS rate is met at or under <span className="font-semibold text-slate-700">{kpiTargetText("cod_rts") || "its target"}</span> (per region; changed by an admin under Admin → KPI Targets). This view shows the counts and shares behind the rate; the rate itself is on the OPEX Result page.
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <SortTable
          title="COD RTS by station"
          titleExtra={<span className="text-[10px] text-slate-400">click a station to break it down</span>}
          maxHeight="480px"
          columns={[
            { key: "name", label: "Station", sticky: true, align: "left", text: true, render: (r) => r.name },
            { key: "zone", label: "Zone", text: true, className: () => "text-slate-500" },
            { key: "count", label: "RTS parcels", render: (r) => int(r.count) },
            { key: "share", label: "% of all RTS", render: (r) => pct1(r.share) },
            { key: "before_pct", label: "Before 1st attempt", render: (r) => withPct(r.before, r.before_pct) },
            { key: "returned_pct", label: "Returned", render: (r) => withPct(r.returned, r.returned_pct) },
            { key: "avg_days", label: "Avg days to 1st attempt", render: (r) => (r.avg_days == null ? "—" : dec1(r.avg_days)) },
          ]}
          rows={v.hubs}
          defaultSort={{ key: "count", dir: "desc" }}
          rowKey={(r) => r.code}
          rowClassName={(r) => (r.code === hub ? "bg-rose-50" : "")}
          onRowClick={(r) => {
            setHub(hub === r.code ? null : r.code);
            setDriver(null);
          }}
          emptyMessage="No stations match."
          footer={`${v.hubs.length} stations · “Returned” = already back with the shipper · the % columns sort by the %`}
        />
        <div className="space-y-3">
          <Panel title={`Why they are returned — ${where}`}>
            <HBars rows={v.reasons.map((r) => ({ ...r, sub: pct1(r.share) }))} picked={reason} onPick={setReason} max={8} />
          </Panel>
          <Panel title={`Where they are now — ${where}`}>
            <HBars rows={v.statuses.map((r) => ({ ...r, sub: pct1(r.share) }))} max={6} />
          </Panel>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={`Top shippers — ${where}`}>
          <HBars rows={v.shippers.map((r) => ({ ...r, sub: pct1(r.share) }))} picked={shipper} onPick={setShipper} max={10} />
        </Panel>
        <Panel title={`Driver type — ${where}`}>
          <HBars rows={v.ctypes.map((r) => ({ ...r, sub: pct1(r.share) }))} max={8} />
        </Panel>
      </div>
      <SortTable
        title={`Drivers with the most COD RTS — ${where}`}
        titleExtra={<span className="text-[10px] text-slate-400">click a driver to use them in the tracking-number list</span>}
        maxHeight="360px"
        columns={[
          { key: "driver", label: "Driver", sticky: true, align: "left", text: true, render: (r) => r.driver },
          { key: "station", label: "Station", text: true, className: () => "text-slate-500" },
          { key: "count", label: "RTS parcels", render: (r) => int(r.count) },
          { key: "before_pct", label: "Before 1st attempt", render: (r) => withPct(r.before, r.before_pct) },
          { key: "top_reason", label: "Top reason", text: true, align: "left", className: () => "max-w-[240px] truncate text-xs text-slate-700", render: (r) => r.top_reason || "—" },
          { key: "top_reason_pct", label: "Top reason %", render: (r) => pct1(r.top_reason_pct) },
        ]}
        rows={v.drivers}
        defaultSort={{ key: "count", dir: "desc" }}
        rowKey={(r) => `${r.station}|${r.driver}`}
        rowClassName={(r) => (r.driver === driver ? "bg-rose-50" : "")}
        onRowClick={(r) => setDriver(driver === r.driver ? null : r.driver)}
        emptyMessage="No drivers."
        footer={'Top 20 by RTS parcels -- see the Drivers tab for all. "(no driver)" = returned without ever being routed to a driver.'}
      />
      {ov && (
        <Panel title={`All RTS (overall file) — ${where}: ${int(ov.total)} parcels, COD value RM ${int(ov.cod_value)}`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">By reason</div>
              <HBars rows={ov.reasons.map((r) => ({ ...r, sub: pct1(r.share) }))} max={8} />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">Delivery attempts before the RTS</div>
              <HBars rows={ov.attempts.map((r) => ({ ...r, sub: pct1(r.share) }))} max={4} />
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Reasons
function CodReasons({ v, reason, setReason }) {
  const d = v.detail;
  return (
    <div className="space-y-3">
      <SortTable
        title="COD RTS reasons"
        titleExtra={<span className="text-[10px] text-slate-400">click a reason for the stations, shippers and driver types behind it</span>}
        maxHeight="440px"
        columns={[
          { key: "reason", label: "Reason", sticky: true, align: "left", text: true, render: (r) => r.reason },
          { key: "count", label: "RTS parcels", render: (r) => int(r.count) },
          { key: "share", label: "% of all RTS", render: (r) => pct1(r.share) },
          { key: "before_pct", label: "Before 1st attempt", render: (r) => withPct(r.before, r.before_pct) },
          { key: "returned_pct", label: "Returned", render: (r) => withPct(r.returned, r.returned_pct) },
          { key: "avg_days", label: "Avg days to 1st attempt", render: (r) => (r.avg_days == null ? "—" : dec1(r.avg_days)) },
          { key: "top_station", label: "Top station (parcels)", text: true, align: "left", className: () => "text-xs text-slate-700", render: (r) => (r.top_station ? `${r.top_station} (${int(r.top_station_count)})` : "—"), sortValue: (r) => r.top_station_count },
          { key: "top_shipper", label: "Top shipper (parcels)", text: true, align: "left", className: () => "max-w-[260px] truncate text-xs text-slate-700", render: (r) => (r.top_shipper ? `${r.top_shipper} (${int(r.top_shipper_count)})` : "—"), sortValue: (r) => r.top_shipper_count },
        ]}
        rows={v.rows}
        defaultSort={{ key: "count", dir: "desc" }}
        rowKey={(r) => r.reason}
        rowClassName={(r) => (r.reason === reason ? "bg-rose-50" : "")}
        onRowClick={(r) => setReason(reason === r.reason ? null : r.reason)}
        emptyMessage="No RTS parcels here."
        footer="The % columns sort by the %; the two “top” columns sort by their parcel count."
      />
      {d ? (
        <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
          <SortTable
            title={`Where “${d.reason}” comes from — ${int(d.count)} parcels`}
            maxHeight="420px"
            columns={[
              { key: "station", label: "Station", sticky: true, align: "left", text: true, render: (r) => r.station },
              { key: "zone", label: "Zone", text: true, className: () => "text-slate-500" },
              { key: "count", label: "RTS parcels", render: (r) => int(r.count) },
              { key: "share_of_reason", label: "% of this reason", render: (r) => pct1(r.share_of_reason) },
              { key: "share_of_station", label: "% of the station's RTS", render: (r) => pct1(r.share_of_station) },
            ]}
            rows={d.stations}
            defaultSort={{ key: "count", dir: "desc" }}
            rowKey={(r) => r.station}
            footer="The last column says how much of that station's RTS is this one reason."
          />
          <div className="space-y-3">
            <Panel title="Shippers behind it"><HBars rows={d.shippers.map((r) => ({ ...r, sub: pct1(r.share) }))} max={8} /></Panel>
            <Panel title="Driver type"><HBars rows={d.ctypes.map((r) => ({ ...r, sub: pct1(r.share) }))} max={6} /></Panel>
            <Panel title="Where they are now"><HBars rows={d.statuses.map((r) => ({ ...r, sub: pct1(r.share) }))} max={6} /></Panel>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">Pick a reason above to see where it comes from.</div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Shippers
function CodShippers({ v, shipper, setShipper }) {
  const d = v.detail;
  return (
    <div className="space-y-3">
      <SortTable
        title={`Shippers — ${int(v.row_count)} with RTS parcels`}
        titleExtra={<span className="text-[10px] text-slate-400">click a shipper for their reasons and stations</span>}
        maxHeight="520px"
        pageSize={50}
        columns={[
          { key: "shipper", label: "Shipper", sticky: true, align: "left", text: true, render: (r) => r.shipper },
          { key: "parent", label: "Parent shipper", text: true, align: "left", className: () => "max-w-[220px] truncate text-xs text-slate-500" },
          { key: "count", label: "RTS parcels", render: (r) => int(r.count) },
          { key: "share", label: "% of all RTS", render: (r) => pct1(r.share) },
          { key: "cum_share", label: "Cumulative %", render: (r) => pct1(r.cum_share) },
          { key: "before_pct", label: "Before 1st attempt", render: (r) => withPct(r.before, r.before_pct) },
          { key: "avg_days", label: "Avg days to 1st attempt", render: (r) => (r.avg_days == null ? "—" : dec1(r.avg_days)) },
          { key: "top_reason", label: "Top reason", text: true, align: "left", className: () => "max-w-[240px] truncate text-xs text-slate-700", render: (r) => r.top_reason || "—" },
          { key: "top_reason_pct", label: "Top reason %", render: (r) => pct1(r.top_reason_pct) },
          { key: "stations", label: "Stations", render: (r) => int(r.stations) },
        ]}
        rows={v.rows}
        defaultSort={{ key: "count", dir: "desc" }}
        rowKey={(r) => r.shipper}
        rowClassName={(r) => (r.shipper === shipper ? "bg-rose-50" : "")}
        onRowClick={(r) => setShipper(shipper === r.shipper ? null : r.shipper)}
        emptyMessage="No shippers."
        footer={`Cumulative % = how much of all RTS the shippers down to this row make up (sorted by parcels)${v.row_count > v.rows.length ? ` · the top ${v.rows.length} of ${int(v.row_count)}` : ""}`}
      />
      {d && (
        <div className="grid gap-3 lg:grid-cols-3">
          <Panel title={`${d.shipper} — reasons`} right={`${int(d.count)} parcels`}><HBars rows={d.reasons.map((r) => ({ ...r, sub: pct1(r.share) }))} max={8} /></Panel>
          <Panel title="Stations they are returned at"><HBars rows={d.stations.map((r) => ({ ...r, sub: pct1(r.share) }))} max={10} /></Panel>
          <Panel title="Where they are now"><HBars rows={d.statuses.map((r) => ({ ...r, sub: pct1(r.share) }))} max={6} /></Panel>
        </div>
      )}
      <SortTable
        title="Parent shippers (all their accounts added up)"
        maxHeight="360px"
        pageSize={30}
        columns={[
          { key: "parent", label: "Parent shipper", sticky: true, align: "left", text: true, render: (r) => r.parent },
          { key: "count", label: "RTS parcels", render: (r) => int(r.count) },
          { key: "share", label: "% of all RTS", render: (r) => pct1(r.share) },
          { key: "shippers", label: "Shipper accounts", render: (r) => int(r.shippers) },
          { key: "before_pct", label: "Before 1st attempt %", render: (r) => pct1(r.before_pct) },
          { key: "top_reason", label: "Top reason", text: true, align: "left", className: () => "max-w-[240px] truncate text-xs text-slate-700", render: (r) => r.top_reason || "—" },
          { key: "top_reason_pct", label: "Top reason %", render: (r) => pct1(r.top_reason_pct) },
        ]}
        rows={v.parents}
        defaultSort={{ key: "count", dir: "desc" }}
        rowKey={(r) => r.parent}
      />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Drivers
function CodDrivers({ v, driver, setDriver }) {
  return (
    <SortTable
      title={`Drivers with COD RTS parcels — ${int(v.row_count)}`}
      titleExtra={<span className="text-[10px] text-slate-400">click a driver to use them in the tracking-number list</span>}
      maxHeight="600px"
      pageSize={100}
      columns={[
        { key: "driver", label: "Driver", sticky: true, align: "left", text: true, render: (r) => r.driver },
        { key: "station", label: "Station", text: true, className: () => "text-slate-500" },
        { key: "zone", label: "Zone", text: true, className: () => "text-slate-500" },
        { key: "ctype", label: "Driver type", text: true, className: () => "text-xs text-slate-500" },
        { key: "count", label: "RTS parcels", render: (r) => int(r.count) },
        { key: "before_pct", label: "Before 1st attempt", render: (r) => withPct(r.before, r.before_pct) },
        { key: "avg_days", label: "Avg days to 1st attempt", render: (r) => (r.avg_days == null ? "—" : dec1(r.avg_days)) },
        { key: "top_reason", label: "Top reason", text: true, align: "left", className: () => "max-w-[240px] truncate text-xs text-slate-700", render: (r) => r.top_reason || "—" },
        { key: "top_reason_pct", label: "Top reason %", render: (r) => pct1(r.top_reason_pct) },
      ]}
      rows={v.rows}
      defaultSort={{ key: "count", dir: "desc" }}
      rowKey={(r) => `${r.code}|${r.driver}`}
      rowClassName={(r) => (r.driver === driver ? "bg-rose-50" : "")}
      onRowClick={(r) => setDriver(driver === r.driver ? null : r.driver)}
      emptyMessage="No drivers."
      footer={`${v.row_count > v.rows.length ? `The ${v.rows.length} with the most of ${int(v.row_count)} · ` : ""}"(no driver)" = returned without ever being routed to a driver, counted per station · the % columns sort by the %`}
    />
  );
}

// ------------------------------------------------------------------------------------------------ Timing & attempts
function CodTiming({ v, where }) {
  return (
    <div className="space-y-3">
      <Cards
        cols="sm:grid-cols-4"
        items={[
          ["RTS parcels", int(v.total)],
          ["Returned before a 1st attempt", withPct(v.before.count, v.before.share)],
          ["FIFO N0 met", withPct(v.fifo.met, v.fifo.met_pct), "of these parcels"],
          ["FIFO N0 missed", withPct(v.fifo.missed, v.fifo.missed_pct)],
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={`Days until the first valid delivery attempt — ${where}`}>
          <HBars rows={v.buckets.map((b) => ({ ...b, sub: pct1(b.share) }))} max={7} />
          <div className="mt-1 text-[11px] text-slate-400">“No attempt yet” = the parcel was returned without a valid first attempt.</div>
        </Panel>
        {v.attempts ? (
          <Panel title={`Delivery attempts before the RTS (all RTS, overall file) — ${int(v.attempts_total)} parcels`}>
            <HBars rows={v.attempts.map((b) => ({ ...b, sub: pct1(b.share) }))} max={4} />
          </Panel>
        ) : (
          <div className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">Upload the RTS Overall file to see how many attempts were made before the RTS.</div>
        )}
      </div>
      <SortTable
        title="Timing by station"
        maxHeight="480px"
        pageSize={50}
        columns={[
          { key: "station", label: "Station", sticky: true, align: "left", text: true, render: (r) => r.station },
          { key: "zone", label: "Zone", text: true, className: () => "text-slate-500" },
          { key: "count", label: "RTS parcels", render: (r) => int(r.count) },
          { key: "before_pct", label: "Before 1st attempt", render: (r) => withPct(r.before, r.before_pct) },
          { key: "avg_days", label: "Avg days to 1st attempt", render: (r) => (r.avg_days == null ? "—" : dec1(r.avg_days)) },
          { key: "slow_pct", label: "Slow (3+ days to 1st attempt)", render: (r) => withPct(r.slow, r.slow_pct) },
        ]}
        rows={v.stations}
        defaultSort={{ key: "count", dir: "desc" }}
        rowKey={(r) => r.code}
        footer="The % columns sort by the %."
      />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Parcels
function CodParcels({ v, where }) {
  const list = (rows) => rows.map((r) => ({ ...r, sub: `${pct1(r.share)} · ${pct1(r.before_pct)} before 1st${r.avg_days == null ? "" : ` · ${dec1(r.avg_days)}d`}` }));
  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-500">
        {int(v.total)} RTS parcels — {where}. Beside each bar: its share of the RTS parcels · how many of them went back before a first attempt · average days to the first attempt.
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Parcel size"><HBars rows={list(v.sizes)} max={8} /></Panel>
        <Panel title="Driver type"><HBars rows={list(v.ctypes)} max={8} /></Panel>
        <Panel title="Where they are now"><HBars rows={list(v.statuses)} max={8} /></Panel>
        <Panel title="FIFO N0"><HBars rows={list(v.fifo)} max={4} /></Panel>
        <Panel title="Lost"><HBars rows={list(v.lost)} max={4} /></Panel>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Date trend
function CodTrend({ region, zone, hub }) {
  return (
    <TrendPanel
      levels={[{ key: "station", label: "Station" }, { key: "zone", label: "Zone" }, { key: "region", label: "Region" }, { key: "reason", label: "Reason" }]}
      load={(level, keys) => api.kpiCodRtsView({ tab: "trend", level, keys, region: noneIf(region), zone: noneIf(zone), hub })}
      metrics={[{ key: "count", label: "RTS parcels", value: (s, i) => s.count[i], fmt: int, zeroBased: true }]}
      filterKey={[region, zone, hub].join("|")}
      note={(d) => (d?.source === "overall" ? "dates from the overall RTS file (all RTS, not only COD)" : "by the date the RTS was triggered")}
    />
  );
}

// ------------------------------------------------------------------------------------------------ Tracking numbers
function CodTns({ region, zone, hub, reason, shipper, driver, picks }) {
  const [tns, setTns] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => setTns(null), [region, zone, hub, reason, shipper, driver]);
  const load = async () => {
    setBusy(true);
    try {
      setTns(await api.kpiCodRtsTns(Object.fromEntries(Object.entries({ region: noneIf(region), zone: noneIf(zone), hub, reason, shipper, driver }).filter(([, v]) => v))));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  return (
    <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-3">
        <div className="font-display text-sm font-medium text-slate-700">Tracking numbers{picks.length ? ` — ${picks.join(" · ")}` : " — everything in view"}</div>
        <button onClick={load} disabled={busy} className="min-h-[36px] rounded-lg bg-brand px-3 font-display text-xs font-semibold text-white disabled:opacity-50">
          {busy ? "Loading…" : tns ? "Reload" : "Show tracking numbers"}
        </button>
        {tns && (
          <button
            onClick={() =>
              exportCsv(
                "daily-ops-cod-rts.csv",
                ["Tracking ID", "Station", "RTS reason", "Status", "Shipper", "Parent shipper", "Driver", "Driver type", "Before 1st attempt", "Days to 1st attempt", "Parcel size", "RTS date"],
                tns.rows.map((r) => [r.tracking_id, r.hub, r.reason, r.status, r.shipper, r.parent, r.driver, r.courier_type, r.before_first_attempt ? "Yes" : "No", r.days_to_first_attempt ?? "", r.parcel_size, r.date || ""])
              )
            }
            className="min-h-[36px] rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV ({tns.rows.length.toLocaleString()}{tns.capped ? "+" : ""})
          </button>
        )}
        <span className="text-[11px] text-slate-400">Pick a station, reason, shipper or driver in the other tabs to narrow the list.</span>
      </div>
      {tns && (
        <SortTable
          maxHeight="480px"
          columns={[
            { key: "tracking_id", label: "Tracking ID", sticky: true, align: "left", text: true, className: () => "font-mono text-xs", render: (r) => r.tracking_id },
            { key: "hub", label: "Station", text: true, className: () => "text-xs text-slate-700" },
            { key: "reason", label: "RTS reason", text: true, className: () => "text-xs text-slate-700" },
            { key: "status", label: "Status", text: true, className: () => "text-xs text-slate-700" },
            { key: "shipper", label: "Shipper", text: true, className: () => "text-xs text-slate-700" },
            { key: "driver", label: "Driver", text: true, className: () => "text-xs text-slate-500" },
            { key: "days_to_first_attempt", label: "Days to 1st attempt", render: (r) => r.days_to_first_attempt ?? "—" },
            { key: "before_first_attempt", label: "Before 1st attempt", render: (r) => (r.before_first_attempt ? "Yes" : ""), sortValue: (r) => (r.before_first_attempt ? 1 : 0) },
          ]}
          rows={tns.rows}
          defaultSort={{ key: "hub", dir: "asc" }}
          rowKey={(r, i) => `${r.tracking_id}-${i}`}
          emptyMessage="No tracking numbers for this selection."
          footer={`${tns.rows.length.toLocaleString()}${tns.capped ? "+ (capped)" : ""} tracking numbers`}
        />
      )}
    </div>
  );
}
