import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import TrendChart from "../components/TrendChart";
import { exportCsv } from "../lib/csv";
import { formatTime } from "../lib/format";
import HBars from "./HBars";
import KpiUploadPanel from "./KpiUploadPanel";
import { groupBy, int, pct1, pctOf, selectClass } from "./fmt";
import { Cards, Panel, SortTable, TabsBar, TrendPanel, useApi, withPct } from "./rcaUi";

// Invalid POD -- the RCA view (staging). Every failed delivery attempt is validated: FAILURE = the proof of delivery attempt was judged
// invalid, SUCCESS = valid. The KPI is the invalid share (target under 25%); this shows WHERE it comes from -- station, driver, reason, day --
// and lists the tracking numbers behind every number.
//   Overview           stations, why it is invalid, the drivers with the most, tracking numbers
//   Drivers & reasons  every driver with invalid POD and the reasons behind it, top reason first
//   Date trend         invalid % / count per day for a region, zone, station or driver
//   Reasons            each reason and which stations it comes from
//   LM performance     the LM POD Performance workbook (audit + final result); managers and admins only
// Data: the POD validation Raw sheet (Metabase question 69573), uploaded here. Everything follows the viewer's scope.
const TARGET = 25;
const WARN = 20;
const sev = (p) => (p >= TARGET ? "font-semibold text-status-critical" : p >= WARN ? "font-medium text-status-warning" : "text-status-good");
const pctFmt = (v) => `${(Math.round(v * 10) / 10).toFixed(1)}%`;
const noneIf = (v) => (v === "all" ? undefined : v);

export default function InvalidPodRca({ me }) {
  const isManager = me.role === "manager" || me.role === "admin";
  const canUpload = me.role === "admin";
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [week, setWeek] = useState("all");
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [hub, setHub] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

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

  const hubs = data?.hubs || [];
  const hubMeta = useMemo(() => new Map(hubs.map((h) => [h.code, h])), [hubs]);
  const regions = useMemo(() => [...new Set(hubs.map((h) => h.region))].sort(), [hubs]);
  const zones = useMemo(() => [...new Set(hubs.filter((h) => region === "all" || h.region === region).map((h) => h.zone))].sort(), [hubs, region]);
  const stationOptions = useMemo(() => {
    const seen = new Map();
    hubs.forEach((h) => (region === "all" || h.region === region) && (zone === "all" || h.zone === zone) && seen.set(h.code, h.name));
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [hubs, region, zone]);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "drivers", label: "Drivers & reasons" },
    { key: "trend", label: "Date trend" },
    { key: "reasons", label: "Reasons" },
    ...(isManager ? [{ key: "perf", label: "LM performance" }] : []),
  ];

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;

  const uploadBar = (
    <div className="flex flex-wrap items-center gap-2">
      {data.has_data && <span className="text-xs text-slate-400">From {data.meta.filename} · {formatTime(data.meta.uploaded_at)}</span>}
      {canUpload && (
        <button onClick={() => setShowUpload((v) => !v)} className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
          {showUpload ? "Hide data upload" : "Data upload"}
        </button>
      )}
    </div>
  );

  const filters = data.has_data && tab !== "perf" && (
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
      <select className={selectClass} value={hub || "all"} onChange={(e) => setHub(e.target.value === "all" ? null : e.target.value)} aria-label="Station">
        <option value="all">All stations</option>
        {stationOptions.map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
      {(hub || region !== "all" || zone !== "all" || week !== "all") && (
        <button onClick={() => { setHub(null); setRegion("all"); setZone("all"); setWeek("all"); }} className="text-xs font-medium text-slate-500 underline hover:text-brand">
          Reset filters
        </button>
      )}
    </div>
  );

  const ctx = { data, hubs, hubMeta, week, region, zone, hub, setHub };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <TabsBar tabs={tabs} value={tab} onChange={setTab} />
        <div className="ml-auto min-w-0 flex-1">{uploadBar}</div>
      </div>
      {showUpload && <KpiUploadPanel kpi="invalid_pod" me={me} onChanged={load} />}
      {tab !== "perf" && !data.has_data ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">No POD validation data uploaded yet</div>
          <p className="mt-2">
            Download the POP/POD Validation Tasks Raw Data from Metabase (link in the upload panel) or use the POD Validation Analysis file -- the whole workbook is fine, its Raw sheet is
            used -- and this page breaks the invalid POD % down by station, driver, reason and day.
          </p>
          {!canUpload && <p className="mt-2 text-xs text-slate-400">Admins upload the data.</p>}
        </div>
      ) : (
        <>
          {filters}
          {tab === "overview" && <PodOverview {...ctx} />}
          {tab === "drivers" && <PodDrivers {...ctx} />}
          {tab === "trend" && <PodTrend {...ctx} />}
          {tab === "reasons" && <PodReasons {...ctx} />}
          {tab === "perf" && isManager && <PodPerformance me={me} />}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Overview
function PodOverview({ data, hubs, hubMeta, week, region, zone, hub, setHub }) {
  const [reason, setReason] = useState(null);
  const [courier, setCourier] = useState(null);
  const [tns, setTns] = useState(null);
  const [tnBusy, setTnBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => setTns(null), [week, region, zone, hub, reason, courier]);

  const inWeek = (w) => week === "all" || w === week;
  const okHub = (code) => {
    const m = hubMeta.get(code);
    return !!m && (region === "all" || m.region === region) && (zone === "all" || m.zone === zone) && (!hub || code === hub);
  };
  const okArea = (code) => {
    const m = hubMeta.get(code);
    return !!m && (region === "all" || m.region === region) && (zone === "all" || m.zone === zone);
  };
  // the station table lists every station in the region / zone (you pick FROM it); every other panel follows the picked station
  const hubRows = useMemo(() => {
    const by = groupBy(hubs.filter((h) => inWeek(h.week) && okArea(h.code)), (h) => h.code);
    return [...by.entries()].map(([code, rows]) => {
      const total = rows.reduce((s, r) => s + r.total, 0);
      const invalid = rows.reduce((s, r) => s + r.invalid, 0);
      return { code, name: rows[0].name, zone: rows[0].zone, total, invalid, valid: total - invalid, invalidPct: pctOf(invalid, total) };
    });
  }, [hubs, week, region, zone]); // eslint-disable-line react-hooks/exhaustive-deps
  const inView = useMemo(() => hubRows.filter((h) => !hub || h.code === hub), [hubRows, hub]);
  const totals = inView.reduce((a, h) => ({ total: a.total + h.total, invalid: a.invalid + h.invalid }), { total: 0, invalid: 0 });
  const reasonRows = useMemo(
    () =>
      [...groupBy(data.reasons.filter((r) => inWeek(r.week) && okHub(r.code)), (r) => r.reason).entries()]
        .map(([label, rows]) => ({ key: label, label, value: rows.reduce((s, r) => s + r.count, 0) }))
        .sort((a, b) => b.value - a.value),
    [data, week, region, zone, hub] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const invalidInScope = reasonRows.reduce((s, r) => s + r.value, 0);
  const courierRows = useMemo(
    () =>
      [...groupBy(data.couriers.filter((c) => inWeek(c.week) && okHub(c.code)), (c) => `${c.code}|${c.courier}`).entries()]
        .map(([k, rows]) => {
          const total = rows.reduce((s, r) => s + r.total, 0);
          const invalid = rows.reduce((s, r) => s + r.invalid, 0);
          return { key: k, courier: rows[0].courier, station: hubMeta.get(rows[0].code)?.name || rows[0].code, total, invalid, invalidPct: pctOf(invalid, total) };
        })
        .sort((a, b) => b.invalid - a.invalid)
        .slice(0, 200),
    [data, week, region, zone, hub] // eslint-disable-line react-hooks/exhaustive-deps
  );

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
  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;

  return (
    <div className="space-y-3">
      <Cards
        items={[
          ["Validated attempts", int(totals.total)],
          ["Invalid POD", int(totals.invalid)],
          ["Invalid %", <span key="p" className={sev(pctOf(totals.invalid, totals.total))}>{pct1(pctOf(totals.invalid, totals.total))}</span>],
          ["Top reason", reasonRows[0] ? `${reasonRows[0].label} (${pct1(pctOf(reasonRows[0].value, invalidInScope))})` : "—"],
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <SortTable
          title={`Invalid POD by station (target under ${TARGET}%)`}
          titleExtra={<span className="text-[10px] text-slate-400">click a station to break it down</span>}
          maxHeight="480px"
          columns={[
            { key: "name", label: "Station", sticky: true, align: "left", text: true, render: (r) => r.name },
            { key: "zone", label: "Zone", text: true, className: () => "text-slate-500" },
            { key: "total", label: "Validated", render: (r) => int(r.total) },
            { key: "invalid", label: "Invalid", render: (r) => int(r.invalid) },
            { key: "invalidPct", label: "Invalid %", render: (r) => pct1(r.invalidPct), className: (r) => sev(r.invalidPct) },
          ]}
          rows={hubRows}
          defaultSort={{ key: "invalidPct", dir: "desc" }}
          rowKey={(r) => r.code}
          rowClassName={(r) => (r.code === hub ? "bg-rose-50" : "")}
          onRowClick={(r) => {
            setHub(hub === r.code ? null : r.code);
            setCourier(null);
          }}
          emptyMessage="No stations match."
          footer={`${hubRows.length} stations · red = at or over ${TARGET}%, amber = ${WARN}%+`}
        />
        <Panel title={`Why it's invalid — ${hubName ? `Station ${hubName}` : "all stations in view"}`}>
          <HBars rows={reasonRows.map((r) => ({ ...r, sub: pct1(pctOf(r.value, invalidInScope)) }))} picked={reason} onPick={setReason} format={int} max={10} empty="No invalid attempts here." />
          <div className="mt-1 text-[11px] text-slate-400">Click a reason to filter the drivers and the tracking numbers below.</div>
        </Panel>
      </div>

      <SortTable
        title={`Drivers with the most invalid POD — ${hubName ? `Station ${hubName}` : "all stations in view"}`}
        titleExtra={<span className="text-[10px] text-slate-400">click a driver to filter the tracking numbers · top reasons are in “Drivers & reasons”</span>}
        maxHeight="360px"
        columns={[
          { key: "courier", label: "Driver", sticky: true, align: "left", text: true, render: (r) => r.courier },
          { key: "station", label: "Station", text: true, className: () => "text-slate-500" },
          { key: "invalid", label: "Invalid", render: (r) => int(r.invalid) },
          { key: "total", label: "Validated", render: (r) => int(r.total) },
          { key: "invalidPct", label: "Invalid %", render: (r) => pct1(r.invalidPct), className: (r) => sev(r.invalidPct) },
        ]}
        rows={courierRows}
        defaultSort={{ key: "invalid", dir: "desc" }}
        rowKey={(r) => r.key}
        rowClassName={(r) => (r.courier === courier ? "bg-rose-50" : "")}
        onRowClick={(r) => setCourier(courier === r.courier ? null : r.courier)}
        emptyMessage="No drivers with invalid POD here."
        footer="Top 200 by invalid count."
      />

      <TnList
        title={`Tracking numbers${filterText ? ` — ${filterText}` : " — everything in view"}`}
        tns={tns}
        busy={tnBusy}
        onLoad={loadTns}
        filename={`daily-ops-invalid-pod-${(hubName || "all").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`}
        extra={(hub || reason || courier) && (
          <button onClick={() => { setHub(null); setReason(null); setCourier(null); }} className="text-xs font-medium text-slate-500 underline hover:text-brand">
            Clear picks
          </button>
        )}
      />
    </div>
  );
}

function TnList({ title, tns, busy, onLoad, filename, extra }) {
  return (
    <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-3">
        <div className="font-display text-sm font-medium text-slate-700">{title}</div>
        <button onClick={onLoad} disabled={busy} className="min-h-[36px] rounded-lg bg-brand px-3 font-display text-xs font-semibold text-white disabled:opacity-50">
          {busy ? "Loading…" : tns ? "Reload" : "Show tracking numbers"}
        </button>
        {tns && (
          <button
            onClick={() =>
              exportCsv(
                filename,
                ["Tracking ID", "Hub", "Driver", "Failure reason", "Invalid POD reason", "Attempted", "Validated", "Validated by"],
                tns.rows.map((r) => [r.tracking_id, r.hub, r.courier, r.failure_reason, r.invalid_reason, r.attempted, r.validated, r.validator])
              )
            }
            className="min-h-[36px] rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV ({tns.rows.length.toLocaleString()}{tns.capped ? "+" : ""})
          </button>
        )}
        {extra}
      </div>
      {tns && (
        <SortTable
          maxHeight="420px"
          columns={[
            { key: "tracking_id", label: "Tracking ID", sticky: true, align: "left", text: true, className: () => "font-mono text-xs", render: (r) => r.tracking_id },
            { key: "courier", label: "Driver", text: true, className: () => "text-xs text-slate-700", render: (r) => r.courier },
            { key: "invalid_reason", label: "Invalid POD reason", text: true, className: () => "text-xs text-slate-700", render: (r) => r.invalid_reason },
            { key: "failure_reason", label: "Failure reason", text: true, className: () => "text-xs text-slate-500", render: (r) => r.failure_reason },
            { key: "attempted", label: "Attempted", text: true, className: () => "text-xs text-slate-500", render: (r) => r.attempted },
            { key: "validator", label: "Validated by", text: true, className: () => "text-xs text-slate-500", render: (r) => r.validator },
          ]}
          rows={tns.rows}
          defaultSort={{ key: "attempted", dir: "asc" }}
          rowKey={(r, i) => `${r.tracking_id}-${i}`}
          emptyMessage="No invalid tracking numbers for this selection."
          footer={`${tns.rows.length.toLocaleString()}${tns.capped ? "+ (capped)" : ""} tracking numbers`}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Drivers & reasons
function PodDrivers({ data, week, region, zone, hub }) {
  const [minInvalid, setMinInvalid] = useState(1);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(null);
  const [tns, setTns] = useState(null);
  const [tnBusy, setTnBusy] = useState(false);
  const filters = { week: noneIf(week), region: noneIf(region), zone: noneIf(zone), hub };
  const { data: d, error, loading } = useApi(() => api.kpiInvalidPodDrivers({ ...filters, min_invalid: minInvalid }), [week, region, zone, hub, minInvalid]);
  useEffect(() => setTns(null), [picked]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (d?.rows || [])
      .map((r) => ({ ...r, key: `${r.code}|${r.courier}`, pct: pctOf(r.invalid, r.total), topPct: pctOf(r.top_count, r.invalid), second: r.reasons[1]?.reason || "—" }))
      .filter((r) => !needle || `${r.courier} ${r.station} ${r.top_reason || ""}`.toLowerCase().includes(needle));
  }, [d, q]);
  const chosen = rows.find((r) => r.key === picked) || null;
  const mix = useMemo(
    () => [...groupBy(rows, (r) => r.top_reason || "(no reason given)").entries()].map(([label, list]) => ({ key: label, label, value: list.length, sub: pct1(pctOf(list.length, rows.length)) })).sort((a, b) => b.value - a.value),
    [rows]
  );
  const drvTrend = useApi(
    () => (chosen ? api.kpiInvalidPodTrend({ ...filters, level: "driver", keys: [chosen.key], top: 1 }) : Promise.resolve(null)),
    [chosen?.key, week, region, zone, hub]
  );

  if (error) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!d) return <Skeleton />;

  const loadTns = async () => {
    setTnBusy(true);
    try {
      const qy = { hub: chosen.code, courier: chosen.courier };
      if (week !== "all") qy.week = week;
      setTns(await api.kpiInvalidPodTns(qy));
    } finally {
      setTnBusy(false);
    }
  };
  const t = drvTrend.data;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <input className={`${selectClass} w-56 font-normal`} placeholder="Search driver, station, reason…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
          At least
          <select className={selectClass} value={minInvalid} onChange={(e) => setMinInvalid(Number(e.target.value))}>
            {[1, 3, 5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} invalid</option>
            ))}
          </select>
        </label>
        {loading && <span className="text-xs text-slate-400">Loading…</span>}
        <button
          onClick={() =>
            exportCsv(
              "daily-ops-invalid-pod-drivers.csv",
              ["Driver", "Station", "Zone", "Region", "Validated", "Invalid", "Invalid %", "Top invalid reason", "Top reason count", "Top reason % of driver's invalid", "Other reasons"],
              rows.map((r) => [r.courier, r.station, r.zone, r.region, r.total, r.invalid, r.pct.toFixed(2), r.top_reason || "", r.top_count, r.topPct.toFixed(2), r.reasons.slice(1).map((x) => `${x.reason} (${x.count})`).join("; ")])
            )
          }
          disabled={!rows.length}
          className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <SortTable
          title="Drivers with invalid POD — and the reason behind it"
          titleExtra={<span className="text-[10px] text-slate-400">click a driver for the breakdown and the day-by-day trend</span>}
          maxHeight="560px"
          columns={[
            { key: "courier", label: "Driver", sticky: true, align: "left", text: true, render: (r) => r.courier },
            { key: "station", label: "Station", text: true, className: () => "text-slate-500" },
            { key: "total", label: "Validated", render: (r) => int(r.total) },
            { key: "invalid", label: "Invalid", render: (r) => int(r.invalid) },
            { key: "pct", label: "Invalid %", render: (r) => pct1(r.pct), className: (r) => sev(r.pct) },
            { key: "top_reason", label: "Top invalid reason", text: true, align: "left", className: () => "max-w-[260px] truncate text-xs text-slate-700", render: (r) => r.top_reason || "—" },
            { key: "topPct", label: "Top reason (count · % of driver's invalid)", render: (r) => withPct(r.top_count, r.topPct), sortValue: (r) => r.topPct },
            { key: "second", label: "2nd reason", text: true, className: () => "max-w-[200px] truncate text-xs text-slate-500" },
          ]}
          rows={rows}
          defaultSort={{ key: "invalid", dir: "desc" }}
          rowKey={(r) => r.key}
          rowClassName={(r) => (r.key === picked ? "bg-rose-50" : "")}
          onRowClick={(r) => setPicked(picked === r.key ? null : r.key)}
          emptyMessage="No drivers with invalid POD match."
          footer={`${rows.length.toLocaleString()} drivers${d.capped ? ` (the ${d.rows.length.toLocaleString()} with the most invalid of ${d.total_drivers.toLocaleString()})` : ""} · % columns sort by the %`}
        />
        <div className="space-y-3">
          {chosen ? (
            <>
              <Panel title={`${chosen.courier} — ${chosen.station}`} right={`${int(chosen.invalid)} invalid of ${int(chosen.total)} (${pct1(chosen.pct)})`}>
                <div className="mb-1 text-xs font-semibold text-slate-600">Why their POD is invalid</div>
                <HBars rows={chosen.reasons.map((x) => ({ key: x.reason, label: x.reason, value: x.count, sub: pct1(pctOf(x.count, chosen.invalid)) }))} format={int} max={8} />
              </Panel>
              <Panel title="Invalid % per day">
                {drvTrend.loading && !t ? (
                  <div className="p-4 text-center text-sm text-slate-400">Loading…</div>
                ) : t && t.days.length ? (
                  <TrendChart
                    labels={t.days.map((x) => `${Number(x.slice(8))}/${Number(x.slice(5, 7))}`)}
                    series={[
                      { key: "d", name: chosen.courier, tone: "brand", values: t.days.map((_x, i) => (t.series[0]?.total[i] ? (t.series[0].invalid[i] / t.series[0].total[i]) * 100 : null)), zeroBased: false, format: pctFmt },
                    ]}
                    format={pctFmt}
                    zeroBased={false}
                    height={200}
                  />
                ) : (
                  <div className="p-4 text-center text-sm text-slate-400">No dated attempts.</div>
                )}
              </Panel>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={loadTns} disabled={tnBusy} className="min-h-[36px] rounded-lg bg-brand px-3 font-display text-xs font-semibold text-white disabled:opacity-50">
                  {tnBusy ? "Loading…" : tns ? "Reload tracking numbers" : "Show this driver's tracking numbers"}
                </button>
              </div>
            </>
          ) : (
            <Panel title="Which reason is on top for each driver" right={`${rows.length.toLocaleString()} drivers`}>
              <HBars rows={mix} format={(v) => `${int(v)} drivers`} max={10} empty="No drivers." />
              <div className="mt-1 text-[11px] text-slate-400">Each driver counts once, under their own most common invalid reason. Pick a driver in the table for their full breakdown.</div>
            </Panel>
          )}
        </div>
      </div>
      {chosen && tns && (
        <SortTable
          title={`Tracking numbers — ${chosen.courier}`}
          maxHeight="360px"
          columns={[
            { key: "tracking_id", label: "Tracking ID", sticky: true, align: "left", text: true, className: () => "font-mono text-xs", render: (r) => r.tracking_id },
            { key: "invalid_reason", label: "Invalid POD reason", text: true, className: () => "text-xs text-slate-700", render: (r) => r.invalid_reason },
            { key: "failure_reason", label: "Failure reason", text: true, className: () => "text-xs text-slate-500", render: (r) => r.failure_reason },
            { key: "attempted", label: "Attempted", text: true, className: () => "text-xs text-slate-500", render: (r) => r.attempted },
          ]}
          rows={tns.rows}
          defaultSort={{ key: "attempted", dir: "asc" }}
          rowKey={(r, i) => `${r.tracking_id}-${i}`}
          footer={`${tns.rows.length.toLocaleString()} tracking numbers`}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Date trend
function PodTrend({ week, region, zone, hub }) {
  const filters = { week: noneIf(week), region: noneIf(region), zone: noneIf(zone), hub };
  const metrics = [
    { key: "pct", label: "Invalid %", value: (s, i) => (s.total[i] ? (s.invalid[i] / s.total[i]) * 100 : null), fmt: pctFmt, zeroBased: false },
    { key: "invalid", label: "Invalid POD", value: (s, i) => s.invalid[i], fmt: int, zeroBased: true },
    { key: "total", label: "Validated", value: (s, i) => s.total[i], fmt: int, zeroBased: true },
  ];
  return (
    <TrendPanel
      levels={[{ key: "region", label: "Region" }, { key: "zone", label: "Zone" }, { key: "station", label: "Station" }, { key: "driver", label: "Driver" }]}
      load={(level, keys) => api.kpiInvalidPodTrend({ ...filters, level, keys })}
      metrics={metrics}
      filterKey={[week, region, zone, hub].join("|")}
      note={`target under ${TARGET}%`}
    />
  );
}

// ------------------------------------------------------------------------------------------------ Reasons
function PodReasons({ data, hubs, hubMeta, week, region, zone, hub }) {
  const [reason, setReason] = useState(null);
  const inWeek = (w) => week === "all" || w === week;
  const okHub = (code) => {
    const m = hubMeta.get(code);
    return !!m && (region === "all" || m.region === region) && (zone === "all" || m.zone === zone) && (!hub || code === hub);
  };
  const rows = useMemo(() => {
    const list = data.reasons.filter((r) => inWeek(r.week) && okHub(r.code));
    const total = list.reduce((s, r) => s + r.count, 0);
    return [...groupBy(list, (r) => r.reason).entries()].map(([name, rs]) => {
      const count = rs.reduce((s, r) => s + r.count, 0);
      return { reason: name, count, share: pctOf(count, total), stations: new Set(rs.map((r) => r.code)).size };
    });
  }, [data, week, region, zone, hub]); // eslint-disable-line react-hooks/exhaustive-deps
  const stationInvalid = useMemo(() => {
    const m = new Map();
    hubs.filter((h) => inWeek(h.week) && okHub(h.code)).forEach((h) => m.set(h.code, (m.get(h.code) || 0) + h.invalid));
    return m;
  }, [hubs, week, region, zone, hub]); // eslint-disable-line react-hooks/exhaustive-deps
  const detail = useMemo(() => {
    if (!reason) return [];
    const list = data.reasons.filter((r) => r.reason === reason && inWeek(r.week) && okHub(r.code));
    const reasonTotal = list.reduce((s, r) => s + r.count, 0);
    return [...groupBy(list, (r) => r.code).entries()].map(([code, rs]) => {
      const count = rs.reduce((s, r) => s + r.count, 0);
      const m = hubMeta.get(code);
      return { code, station: m?.name || code, zone: m?.zone || "", count, ofReason: pctOf(count, reasonTotal), ofStation: pctOf(count, stationInvalid.get(code) || 0) };
    });
  }, [reason, data, week, region, zone, hub, stationInvalid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr]">
      <SortTable
        title="Invalid POD reasons"
        titleExtra={<span className="text-[10px] text-slate-400">click a reason to see which stations it comes from</span>}
        maxHeight="520px"
        columns={[
          { key: "reason", label: "Reason", sticky: true, align: "left", text: true, render: (r) => r.reason },
          { key: "count", label: "Invalid POD", render: (r) => int(r.count) },
          { key: "share", label: "% of all invalid", render: (r) => pct1(r.share) },
          { key: "stations", label: "Stations", render: (r) => int(r.stations) },
        ]}
        rows={rows}
        defaultSort={{ key: "count", dir: "desc" }}
        rowKey={(r) => r.reason}
        rowClassName={(r) => (r.reason === reason ? "bg-rose-50" : "")}
        onRowClick={(r) => setReason(reason === r.reason ? null : r.reason)}
        emptyMessage="No invalid attempts here."
      />
      {reason ? (
        <SortTable
          title={`Where “${reason}” comes from`}
          maxHeight="520px"
          columns={[
            { key: "station", label: "Station", sticky: true, align: "left", text: true, render: (r) => r.station },
            { key: "zone", label: "Zone", text: true, className: () => "text-slate-500" },
            { key: "count", label: "Invalid POD", render: (r) => int(r.count) },
            { key: "ofReason", label: "% of this reason", render: (r) => pct1(r.ofReason) },
            { key: "ofStation", label: "% of the station's invalid", render: (r) => pct1(r.ofStation) },
          ]}
          rows={detail}
          defaultSort={{ key: "count", dir: "desc" }}
          rowKey={(r) => r.code}
          footer="The last column says how much of that station's invalid POD is this one reason."
        />
      ) : (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200">Pick a reason on the left.</div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ LM performance (managers + admins)
function PodPerformance({ me }) {
  const canUpload = me.role === "admin";
  const [showUpload, setShowUpload] = useState(false);
  const [reload, setReload] = useState(0);
  const { data: v, error, loading } = useApi(() => api.kpiPodPerformance(), [reload]);

  if (error && !v) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!v) return <Skeleton />;
  if (!v.has_data) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">No LM POD Performance workbook uploaded yet</div>
          <p className="mt-2">
            This is the weekly POD performance view for managers and admins: every station, driver and OPS route, judged on the final result after the audit. Upload the LM POD Performance
            workbook (its RAW DATA sheet is used) to see it.
          </p>
        </div>
        <KpiUploadPanel kpi="invalid_pod" me={me} onChanged={() => setReload((n) => n + 1)} />
      </div>
    );
  }
  const h = v.headline;
  const routeOf = (name) => v.routes.find((r) => r.route === name);
  const stations = v.stations.map((s) => ({ ...s, valid: s.validated - s.invalid, pct: pctOf(s.invalid, s.validated) }));
  const zones = v.zones.map((z) => ({ ...z, valid: z.validated - z.invalid, pct: pctOf(z.invalid, z.validated) }));
  const withRoute = (list) => list.map((r) => ({ ...r, pct: pctOf(r.invalid, r.validated), topPct: pctOf(r.top_count, r.invalid) }));
  const drivers = withRoute(v.drivers);
  const ops = withRoute(v.ops_routes);
  const range = v.from && v.to ? `${v.from} → ${v.to}` : "";
  const routeCard = (name) => {
    const r = routeOf(name);
    return r ? `${pct1(pctOf(r.invalid, r.validated))} (${int(r.invalid)} of ${int(r.validated)})` : "—";
  };
  const driverCols = [
    { key: "courier", label: "Driver / route", sticky: true, align: "left", text: true, render: (r) => r.courier },
    { key: "station", label: "Station", text: true, className: () => "text-slate-500" },
    { key: "validated", label: "Validated", render: (r) => int(r.validated) },
    { key: "invalid", label: "Invalid", render: (r) => int(r.invalid) },
    { key: "pct", label: "Invalid %", render: (r) => pct1(r.pct), className: (r) => sev(r.pct) },
    { key: "top_reason", label: "Top invalid reason", text: true, align: "left", className: () => "max-w-[240px] truncate text-xs text-slate-700", render: (r) => r.top_reason || "—" },
    { key: "topPct", label: "Top reason (count · % of invalid)", render: (r) => withPct(r.top_count, r.topPct), sortValue: (r) => r.topPct },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-ink">
          LM POD Performance{v.weeks.length ? ` — week ${v.weeks.join(", ")}` : ""}
          {range && <span className="ml-2 text-xs font-normal text-slate-500">validated {range}</span>}
        </div>
        <span className="text-xs text-slate-400">From {v.meta.filename} · {formatTime(v.meta.uploaded_at)}</span>
        {loading && <span className="text-xs text-slate-400">Loading…</span>}
        {canUpload && (
          <button onClick={() => setShowUpload((x) => !x)} className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
            {showUpload ? "Hide data upload" : "Data upload"}
          </button>
        )}
      </div>
      {showUpload && <KpiUploadPanel kpi="invalid_pod" me={me} onChanged={() => setReload((n) => n + 1)} />}
      <Cards
        cols="sm:grid-cols-3 xl:grid-cols-6"
        items={[
          ["Failed deliveries validated", int(h.validated)],
          ["Invalid POD", int(h.invalid)],
          ["Invalid %", <span key="p" className={sev(pctOf(h.invalid, h.validated))}>{pct1(pctOf(h.invalid, h.validated))}</span>],
          ["Audited", `${int(h.audited)} (${pct1(pctOf(h.audited, h.validated))})`, `${int(h.audit_changed)} changed by the audit`],
          ["Driver routes", routeCard("Driver"), "invalid %"],
          ["OPS routes", routeCard("OPS"), "invalid %"],
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <SortTable
          title="Zones with the most invalid POD"
          maxHeight="440px"
          columns={[
            { key: "zone", label: "Zone", sticky: true, align: "left", text: true, render: (r) => r.zone },
            { key: "validated", label: "Validated", render: (r) => int(r.validated) },
            { key: "invalid", label: "Invalid", render: (r) => int(r.invalid) },
            { key: "valid", label: "Valid", render: (r) => int(r.valid) },
            { key: "pct", label: "Invalid %", render: (r) => pct1(r.pct), className: (r) => sev(r.pct) },
          ]}
          rows={zones}
          defaultSort={{ key: "pct", dir: "desc" }}
          rowKey={(r) => r.zone}
          pageSize={30}
        />
        <SortTable
          title="Stations with the most invalid POD"
          maxHeight="440px"
          columns={[
            { key: "station", label: "Station", sticky: true, align: "left", text: true, render: (r) => r.station },
            { key: "zone", label: "Zone", text: true, className: () => "text-slate-500" },
            { key: "validated", label: "Validated", render: (r) => int(r.validated) },
            { key: "invalid", label: "Invalid", render: (r) => int(r.invalid) },
            { key: "pct", label: "Invalid %", render: (r) => pct1(r.pct), className: (r) => sev(r.pct) },
          ]}
          rows={stations}
          defaultSort={{ key: "invalid", dir: "desc" }}
          rowKey={(r) => r.code}
          pageSize={20}
        />
      </div>
      <SortTable title="Top drivers with the most invalid POD (driver routes)" maxHeight="440px" columns={driverCols} rows={drivers} defaultSort={{ key: "invalid", dir: "desc" }} rowKey={(r) => `${r.code}|${r.courier}`} pageSize={20} footer={`${drivers.length} drivers with invalid POD · % columns sort by the %`} />
      <SortTable title="OPS routes" maxHeight="360px" columns={driverCols} rows={ops} defaultSort={{ key: "invalid", dir: "desc" }} rowKey={(r) => `${r.code}|${r.courier}`} pageSize={20} emptyMessage="No OPS routes." />
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Invalid reasons (final)" right={`${int(h.invalid)} invalid`}>
          <HBars rows={v.invalid_reasons.map((r) => ({ key: r.reason, label: r.reason, value: r.count, sub: pct1(pctOf(r.count, h.invalid)) }))} format={int} max={12} />
        </Panel>
        <Panel title="Failure reasons (what the driver reported)" right="invalid % beside each">
          <HBars rows={v.failure_reasons.map((r) => ({ key: r.reason, label: r.reason, value: r.validated, sub: `${pct1(pctOf(r.invalid, r.validated))} invalid` }))} format={int} max={10} />
        </Panel>
      </div>
      <Panel title="Invalid % per validation day">
        <TrendChart
          labels={v.days.map((x) => `${Number(x.day.slice(8))}/${Number(x.day.slice(5, 7))}`)}
          series={[{ key: "p", name: "Invalid %", tone: "brand", values: v.days.map((x) => pctOf(x.invalid, x.validated)), zeroBased: false, format: pctFmt }]}
          format={pctFmt}
          zeroBased={false}
          height={220}
        />
      </Panel>
    </div>
  );
}
