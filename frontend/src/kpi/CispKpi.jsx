import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import { exportCsv } from "../lib/csv";
import { formatTime } from "../lib/format";
import KpiUploadPanel from "./KpiUploadPanel";
import { int, selectClass } from "./fmt";
import { Cards, Panel, SortTable, TabsBar, TrendPanel, useApi } from "./rcaUi";

// CISP KPIs -- Prior, Completion D0 / D3, Terminal T7, FIFO D0 (staging + production, Beta).
// The OPEX dashboard's result is the OFFICIAL number: this page shows it (from the uploaded OPEX file) next to the analysis, which is built from small
// Metabase feeder files (station by start-clock day). Those use provisional exclusions, so a rate here can differ a little from the official one.
//   Overview    the result against the target for the last 7 / 14 / 28 days (or the whole file) with the change on the period before, the regions / zones /
//               stations under target, and the official OPEX numbers
//   Date trend  the % met per day or week for regions, zones, stations -- by start-clock date -- with the target line
// FIFO D0 comes from one Metabase question run for one period, so it has no trend.
const noneIf = (v) => (v === "all" ? undefined : v);
const pctFmt = (v) => `${(Math.round(v * 10) / 10).toFixed(1)}%`;
const pp = (v) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} pp`);
const GROUP = { prior: "prior", d0: "completion", d3: "completion", t7: "terminal", fifo: "fifo" };
const NOTE = {
  prior: "Prior KPI: PRE-tagged TNs; met = completed on the working start-clock day; TNs with an open PETs ticket are not counted yet. Trend by start-clock date.",
  d0: "Completion D0: TNs measured at D0 (n0 measured) that met it (n0 met). Cut-off date for the calculation, start-clock date for the trend.",
  d3: "Completion D3: TNs measured at D3 (n3 measured) that met it (n3 met) after 0 / 1 / 2 / 3 days. Cut-off date for the calculation, start-clock date for the trend.",
  t7: "Terminal T7: TNs past their N7 cut-off that met it (n7 met), by last-mile start-clock date.",
  fifo: "FIFO D0: the parcel was attempted at D0 (from the Metabase FIFO D0 question, one period per file).",
};
const OPEX_KEY = { prior: "prior", d0: "d0_d2", d3: "d3", t7: "d7", fifo: "fifo" }; // what the OPEX dashboard calls each one
const OPEX_NAME = { prior: "Priority", d0_d2: "D0/D2", d3: "D3", d7: "D7", fifo: "FIFO" };

function Rate({ r, target }) {
  if (r == null) return <span className="text-slate-300">—</span>;
  return <span className={r >= target ? "font-semibold text-status-good" : "font-semibold text-status-critical"}>{pctFmt(r)}</span>;
}
function Delta({ d }) {
  if (d == null) return <span className="text-slate-300">—</span>;
  if (Math.abs(d) < 0.05) return <span className="text-slate-400">±0</span>;
  return <span className={`font-semibold ${d > 0 ? "text-status-good" : "text-status-critical"}`}>{d > 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)} pp</span>;
}

// The official result: what the OPEX dashboard says (uploaded on the OPEX Result page), for this KPI.
function OpexOfficial({ opexKey, label }) {
  const { data, error } = useApi(() => api.kpiTable("opex_result"), []);
  if (error) return null;
  if (!data) return <Panel title="Official result (OPEX)"><div className="p-3 text-sm text-slate-400">Loading…</div></Panel>;
  const o = data.opex;
  const rows = (o?.rows || []).map((r) => ({ ...r, v: r.values[opexKey] })).filter((r) => r.v && r.v.rate != null);
  if (!o || !rows.length) {
    return (
      <Panel title="Official result (OPEX)">
        <div className="text-sm text-slate-500">
          The official {label} number comes from the OPEX dashboard. Once an admin uploads its Download CSV on the <strong>OPEX Result</strong> page it shows here.
        </div>
      </Panel>
    );
  }
  const level = { hub: "hub", area: "area", zone: "zone", region: "region" }[o.level] || "row";
  const met = rows.filter((r) => r.v.met === true).length;
  const targets = new Set(rows.map((r) => r.v.target).filter((v) => v != null)); // the OPEX file carries a target per row; they differ by region
  return (
    <Panel title={`Official result (OPEX) — ${label}${OPEX_NAME[opexKey] && OPEX_NAME[opexKey] !== label ? ` (OPEX calls it ${OPEX_NAME[opexKey]})` : ""}`} right={[o.scope, o.grain, o.from && o.to ? `${o.from} → ${o.to}` : null].filter(Boolean).join(" · ")}>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-slate-600">{met} of {rows.length} {level}s on target</span>
        {targets.size === 1 && <span className="text-xs text-slate-400">target {pctFmt([...targets][0])}</span>}
        {targets.size > 1 && <span className="text-xs text-slate-400">targets differ by region -- see the Target column</span>}
      </div>
      <SortTable
        maxHeight="260px"
        pageSize={30}
        columns={[
          { key: "label", label: level[0].toUpperCase() + level.slice(1), sticky: true, align: "left", text: true, render: (r) => r.station || r.name, sortValue: (r) => r.station || r.name },
          { key: "rate", label: "Official %", render: (r) => <Rate r={r.v.rate} target={r.v.target ?? 0} />, sortValue: (r) => r.v.rate },
          { key: "target", label: "Target", render: (r) => (r.v.target == null ? "—" : pctFmt(r.v.target)), sortValue: (r) => r.v.target },
          { key: "gap", label: "vs target", render: (r) => pp(r.v.target == null ? null : r.v.rate - r.v.target), sortValue: (r) => (r.v.target == null ? null : r.v.rate - r.v.target) },
        ]}
        rows={rows}
        defaultSort={{ key: "rate", dir: "asc" }}
        rowKey={(r, i) => `${r.name}-${i}`}
        footer="From the OPEX dashboard's Download CSV as uploaded on the OPEX Result page -- the numbers to quote."
      />
    </Panel>
  );
}

export default function CispKpi({ me, kpi }) {
  const canUpload = me.role === "admin";
  const rank = { station: 0, region: 1, manager: 2, admin: 3 }[me.role] ?? 0;
  const [tab, setTab] = useState("overview");
  const [win, setWin] = useState("7");
  const [region, setRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [hub, setHub] = useState(null);
  const [grain, setGrain] = useState("day");
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [reload, setReload] = useState(0);
  const [opts, setOpts] = useState(null);

  const { data, error, loading } = useApi(() => api.kpiCispView(kpi, { tab: "overview", window: win, region: noneIf(region), zone: noneIf(zone), hub }), [kpi, win, region, zone, hub, reload]);
  useEffect(() => {
    if (data?.options) setOpts(data.options);
  }, [data]);
  const opex = useApi(() => api.kpiTable("opex_result"), []);

  // official (OPEX) numbers per station, when the OPEX file is at hub level
  const officialByStation = useMemo(() => {
    const o = opex.data?.opex;
    const key = data?.opex_key;
    if (!o || o.level !== "hub" || !key) return new Map();
    return new Map(o.rows.filter((r) => r.station && r.values[key]?.rate != null).map((r) => [r.station, r.values[key]]));
  }, [opex.data, data?.opex_key]);

  if (error && !data) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <Skeleton />;
  const label = data.label;
  if (!data.has_data) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          <div className="font-display text-base font-semibold text-ink">No {label} data uploaded yet</div>
          <p className="mt-2">{NOTE[kpi]}</p>
          <p className="mt-2">
            The data comes from a small Metabase file: open the question from the upload panel below, download the results as CSV, and upload it here (admins). The official {label} number is on the{" "}
            <strong>OPEX Result</strong> page.
          </p>
          {!canUpload && <p className="mt-2 text-xs text-slate-400">Admins upload the data.</p>}
        </div>
        <KpiUploadPanel kpi={GROUP[kpi]} me={me} onChanged={() => setReload((n) => n + 1)} />
        <OpexOfficial opexKey={OPEX_KEY[kpi]} label={label} />
      </div>
    );
  }

  const snapshot = data.snapshot;
  const target = data.target; // one region: that region's target; several: the blend of theirs (data.target_mixed)
  const mixed = data.target_mixed;
  const regions = opts?.regions || [];
  const zones = (opts?.zones || []).filter(([, r]) => region === "all" || r === region).map(([z]) => z);
  const hubList = (opts?.hubs || []).filter((h) => (region === "all" || h.region === region) && (zone === "all" || h.zone === zone));
  const t = data.totals;
  const tabs = [{ key: "overview", label: "Overview" }, ...(snapshot ? [] : [{ key: "trend", label: "Date trend" }])];
  const levels = [...(rank >= 2 ? [{ key: "region", label: "Region" }] : []), ...(rank >= 1 ? [{ key: "zone", label: "Zone" }] : []), { key: "station", label: "Station" }];
  const stationRows = (data.stations || []).map((s) => {
    const off = officialByStation.get(s.name);
    return { ...s, official: off ? off.rate : null, officialMet: off ? off.met : null };
  });
  const shownStations = onlyMissed ? stationRows.filter((s) => s.status === "missed") : stationRows;
  const hasOfficial = officialByStation.size > 0;
  const windowLabel = snapshot ? "the uploaded period" : win === "all" ? "the whole file" : `the last ${win} days`;

  const rollCols = (nameLabel, withStations) => [
    { key: "name", label: nameLabel, sticky: true, align: "left", text: true, render: (r) => <b>{r.name}</b> },
    ...(withStations ? [{ key: "stations", label: "Stations", render: (r) => int(r.stations) }] : []),
    { key: "measured", label: "Measured", render: (r) => int(r.measured) },
    { key: "rate", label: "% met", render: (r) => <Rate r={r.rate} target={r.target} />, sortValue: (r) => r.rate },
    { key: "target", label: "Target", render: (r) => pctFmt(r.target), className: () => "text-slate-400", sortValue: (r) => r.target },
    { key: "gap", label: "vs target", render: (r) => pp(r.gap), sortValue: (r) => r.gap },
    ...(snapshot ? [] : [{ key: "delta", label: "vs previous period", render: (r) => <Delta d={r.delta} />, sortValue: (r) => r.delta }]),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <TabsBar tabs={tabs} value={tab} onChange={setTab} />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        {!snapshot && (
          <select className={selectClass} value={win} onChange={(e) => setWin(e.target.value)} aria-label="Period" disabled={tab === "trend"} title={tab === "trend" ? "The trend shows every day in the file" : undefined}>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="28">Last 28 days</option>
            <option value="all">Whole file</option>
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
          {hubList.map((h) => (
            <option key={h.code} value={h.code}>{h.name}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          From {data.meta.filename} · {formatTime(data.meta.uploaded_at)}
          {data.range ? ` · days ${data.range.from} → ${data.range.to}` : ""}
        </span>
        {loading && <span className="text-xs text-slate-400">Loading…</span>}
        {canUpload && (
          <button onClick={() => setShowUpload((v) => !v)} className="ml-auto h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50">
            {showUpload ? "Hide data upload" : "Data upload"}
          </button>
        )}
      </div>
      {showUpload && <KpiUploadPanel kpi={GROUP[kpi]} me={me} onChanged={() => setReload((n) => n + 1)} />}

      {tab === "trend" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-display font-semibold uppercase text-slate-500">Group by</span>
            <TabsBar tabs={[{ key: "day", label: "Day" }, { key: "week", label: "Week" }]} value={grain} onChange={setGrain} />
            <span className="text-slate-400">by start-clock date · dashed green line = the target{mixed ? " (targets differ by region, so each target has its own line)" : ` ${pctFmt(target)}`}</span>
          </div>
          <TrendPanel
            levels={levels}
            load={(level, keys) => api.kpiCispView(kpi, { tab: "trend", level, grain, keys, region: noneIf(region), zone: noneIf(zone), hub })}
            metrics={[{ key: "rate", label: "% met", value: (s, i) => (s.measured[i] ? (s.met[i] / s.measured[i]) * 100 : null), fmt: pctFmt, zeroBased: false }]}
            filterKey={[kpi, grain, region, zone, hub].join("|")}
            targetLine={(d) => (d?.series?.length ? [...new Set(d.series.map((s) => s.target))] : d?.target)}
            note="the entities furthest under target are drawn first"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <Cards
            cols="sm:grid-cols-5"
            items={[
              [`${label} — ${windowLabel}`, <Rate key="r" r={t.rate} target={target} />, t.status === "met" ? "on target" : t.status === "missed" ? "under target" : ""],
              [mixed ? "Target (blended)" : "Target", pctFmt(target), mixed ? "regions differ -- see the table below" : t.gap == null ? "" : `${pp(t.gap)} vs target`],
              ["Change vs the period before", snapshot ? "—" : <Delta key="d" d={t.delta} />, snapshot ? "one period per file" : data.prev_from ? `${data.prev_from} → ${data.prev_to}` : "no earlier period in the file"],
              ["Stations under target", `${data.stations_below_target} of ${data.stations_total}`, ""],
              ["TNs measured", int(t.measured), `${int(t.met)} met`],
            ]}
          />
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">
            {NOTE[kpi]} Built from a Metabase feeder file with provisional exclusions -- the official number is the OPEX result below.
            <div className="mt-1 text-slate-600">
              <span className="font-semibold">Target by region:</span>{" "}
              {Object.entries(data.targets || {}).map(([r, v]) => `${r} ${pctFmt(v)}`).join(" · ")}. Every row is judged against its own region's target{mixed ? "; the total against the blend of the regions in view" : ""}.
            </div>
          </div>
          <OpexOfficial opexKey={data.opex_key} label={label} />
          {rank >= 1 && (
            <div className="grid gap-3 lg:grid-cols-2">
              {rank >= 2 && (
                <SortTable title="By region" maxHeight="300px" columns={rollCols("Region", true)} rows={data.regions} defaultSort={{ key: "rate", dir: "asc" }} rowKey={(r) => r.name} emptyMessage="No data." />
              )}
              {rank >= 1 && (
                <SortTable title="By zone" maxHeight="300px" columns={rollCols("Zone", true)} rows={data.zones} defaultSort={{ key: "rate", dir: "asc" }} rowKey={(r) => r.name} emptyMessage="No data." />
              )}
            </div>
          )}
          <SortTable
            title={`Stations — ${data.stations_below_target} of ${data.stations_total} under ${mixed ? "their region's" : "the"} target`}
            titleExtra={
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={onlyMissed} onChange={() => setOnlyMissed((v) => !v)} />
                Under target only
              </label>
            }
            maxHeight="520px"
            pageSize={60}
            columns={[
              { key: "name", label: "Station", sticky: true, align: "left", text: true, render: (r) => r.name },
              { key: "zone", label: "Zone", text: true, className: () => "text-slate-500" },
              { key: "measured", label: "Measured", render: (r) => int(r.measured) },
              { key: "met", label: "Met", render: (r) => int(r.met) },
              { key: "rate", label: "% met", render: (r) => <Rate r={r.rate} target={r.target} />, sortValue: (r) => r.rate },
              { key: "target", label: "Target", render: (r) => pctFmt(r.target), className: () => "text-slate-400", sortValue: (r) => r.target },
              { key: "gap", label: "vs target", render: (r) => pp(r.gap), sortValue: (r) => r.gap },
              ...(snapshot ? [] : [{ key: "delta", label: "vs previous period", render: (r) => <Delta d={r.delta} />, sortValue: (r) => r.delta }]),
              ...(hasOfficial ? [{ key: "official", label: "Official (OPEX) %", render: (r) => (r.official == null ? <span className="text-slate-300">—</span> : <Rate r={r.official} target={r.target} />), sortValue: (r) => r.official }] : []),
            ]}
            rows={shownStations}
            defaultSort={{ key: "rate", dir: "asc" }}
            rowKey={(r) => r.code}
            rowClassName={(r) => (r.code === hub ? "bg-rose-50" : "")}
            onRowClick={(r) => setHub(hub === r.code ? null : r.code)}
            emptyMessage="No stations."
            footer="Sorted worst first. Click a station to filter the page to it."
          />
          <div className="flex justify-end">
            <button
              onClick={() =>
                exportCsv(
                  `daily-ops-${kpi}-stations.csv`,
                  ["Station", "Zone", "Region", "Measured", "Met", "% met", "Target %", "vs target (pp)", ...(snapshot ? [] : ["Previous period %", "Change (pp)"]), ...(hasOfficial ? ["Official (OPEX) %"] : [])],
                  shownStations.map((s) => [s.name, s.zone, s.region, s.measured, s.met, s.rate ?? "", s.target ?? "", s.gap ?? "", ...(snapshot ? [] : [s.prev_rate ?? "", s.delta ?? ""]), ...(hasOfficial ? [s.official ?? ""] : [])])
                )
              }
              className="h-9 rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
