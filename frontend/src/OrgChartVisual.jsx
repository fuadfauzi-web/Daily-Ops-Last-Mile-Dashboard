import { useMemo, useState } from "react";

// Visual org chart (2026-10-03, staging): HQ on top, the regions under it with their managers, click a region to open its zones (Region Head / RFS), click a zone to
// see its stations (Station Head / Fleet Assistants) underneath. Built from /api/org-chart, which places people by where they are POSTED; vacant seats show as dashed boxes.
const SHORT = { region_head: "RH", rfs: "RFS", station_head: "SH", fleet_assistant: "FA", manager: "Manager", hod: "HOD", fleet_admin: "Fleet Admin", opex: "OPEX", recovery: "Recovery", restock: "Restock" };
const TAG = {
  region_head: "bg-sky-100 text-sky-800", rfs: "bg-indigo-100 text-indigo-800", station_head: "bg-emerald-100 text-emerald-800", fleet_assistant: "bg-slate-100 text-slate-600",
  manager: "bg-violet-100 text-violet-800", hod: "bg-violet-100 text-violet-800", fleet_admin: "bg-amber-100 text-amber-800",
};
const plain = (n) => (n || "").replace(/\s*\([^)]*\)\s*$/, "").trim();

// lines between the boxes of the tree (a parent's children hang off one rail)
const CSS = `
.orgtree ul{display:flex;justify-content:center;padding-top:22px;position:relative;margin:0}
.orgtree li{list-style:none;text-align:center;position:relative;padding:22px 8px 0}
.orgtree li::before,.orgtree li::after{content:"";position:absolute;top:0;right:50%;border-top:1px solid #cbd5e1;width:50%;height:22px}
.orgtree li::after{right:auto;left:50%;border-left:1px solid #cbd5e1}
.orgtree li:only-child::after,.orgtree li:only-child::before{display:none}
.orgtree li:only-child{padding-top:0}
.orgtree li:first-child::before,.orgtree li:last-child::after{border:0 none}
.orgtree li:last-child::before{border-right:1px solid #cbd5e1;border-radius:0 6px 0 0}
.orgtree li:first-child::after{border-radius:6px 0 0 0}
.orgtree ul ul::before{content:"";position:absolute;top:0;left:50%;border-left:1px solid #cbd5e1;height:22px}
.orgtree > ul{padding-top:0;width:max-content;margin:0 auto}
`;

function PersonPill({ p, onEdit }) {
  const body = (
    <>
      <span className="font-medium text-ink">{plain(p.name) || p.email}</span>
      <span className={`ml-1 rounded px-1 text-[9px] font-semibold uppercase ${TAG[p.position] || "bg-slate-100 text-slate-600"}`}>{SHORT[p.position] || p.label}</span>
    </>
  );
  const cls = "inline-block max-w-[190px] rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-left text-[11px] leading-tight";
  return onEdit ? (
    <button type="button" title={p.email} onClick={() => onEdit(p.email)} className={`${cls} hover:border-slate-400`}>{body}</button>
  ) : (
    <span title={p.email} className={cls}>{body}</span>
  );
}

function Vacant({ n, label }) {
  return <span className="inline-block rounded-md border border-dashed border-slate-400 px-1.5 py-0.5 text-[11px] text-slate-600">{label ? `${label} ` : ""}vacant{n > 1 ? ` x${n}` : ""}</span>;
}

function Card({ title, sub, active, onClick, tone = "slate", wide, children }) {
  const border = active ? "border-ink ring-1 ring-ink" : tone === "ink" ? "border-ink" : "border-slate-300";
  const inner = (
    <>
      <div className="text-xs font-semibold text-ink">{title}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
      {children && <div className="mt-1.5 flex flex-wrap justify-center gap-1">{children}</div>}
    </>
  );
  const cls = `inline-block min-w-[150px] ${wide ? "max-w-[460px]" : "max-w-[230px]"} rounded-lg border bg-white px-2.5 py-2 text-center shadow-sm ${border}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:border-slate-500`}>{inner}</button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default function OrgChartVisual({ chart, onEdit }) {
  const [openRegions, setOpenRegions] = useState({});
  const [zoneKey, setZoneKey] = useState(null); // "Region|Zone"

  const stats = useMemo(() => {
    const out = {};
    for (const r of chart.regions) {
      const zones = r.zones.map((z) => ({ z, stations: z.stations.length, noHead: z.stations.filter((s) => s.heads.length === 0 && !s.tba_heads).length }));
      out[r.name] = { zones, stations: zones.reduce((n, x) => n + x.stations, 0), noHead: zones.reduce((n, x) => n + x.noHead, 0) };
    }
    return out;
  }, [chart]);

  // one region open at a time keeps the chart a readable width (Klang Valley alone has 9 zones)
  const toggleRegion = (name) => {
    setOpenRegions((o) => ({ [name]: !o[name] }));
    setZoneKey(null);
  };
  const [zoneRegion, zoneName] = zoneKey ? zoneKey.split("|") : [null, null];
  const zone = zoneKey ? chart.regions.find((r) => r.name === zoneRegion)?.zones.find((z) => z.name === zoneName) : null;
  const totalStations = Object.values(stats).reduce((n, x) => n + x.stations, 0);
  const totalNoHead = Object.values(stats).reduce((n, x) => n + x.noHead, 0);

  return (
    <div className="space-y-4">
      <style>{CSS}</style>
      <p className="text-xs text-slate-500">
        Click a region to open its zones (one region at a time), then a zone to see its stations below. {totalStations} stations{totalNoHead ? `, ${totalNoHead} with no Station Head and no vacant seat (marked in red)` : ", every one has a Station Head or a vacant seat"}.
        {onEdit ? " Click a person to edit them." : ""}
      </p>
      <div className="orgtree overflow-x-auto pb-3">
        <ul>
          <li>
            <Card title="HQ" sub="Fleet Last Mile" tone="ink" wide>
              {chart.hq.map((p) => <PersonPill key={p.email} p={p} onEdit={onEdit} />)}
              {chart.hq_vacant_fleet_admin > 0 && <Vacant n={chart.hq_vacant_fleet_admin} label="Fleet Admin" />}
            </Card>
            <ul>
              {chart.regions.map((r) => {
                const st = stats[r.name];
                const open = !!openRegions[r.name];
                return (
                  <li key={r.name}>
                    <Card title={`${open ? "▾" : "▸"} ${r.name}`} sub={`${r.zones.length} zones · ${st.stations} stations${st.noHead ? ` · ${st.noHead} no SH` : ""}`} active={open} onClick={() => toggleRegion(r.name)}>
                      {r.managers.map((p) => <PersonPill key={p.email} p={p} onEdit={onEdit} />)}
                    </Card>
                    {open && (
                      <ul>
                        {st.zones.map(({ z, stations, noHead }) => (
                          <li key={z.name}>
                            <Card title={z.name} sub={`${stations} stations${noHead ? ` · ${noHead} no SH` : ""}`} active={zoneKey === `${r.name}|${z.name}`} onClick={() => setZoneKey(zoneKey === `${r.name}|${z.name}` ? null : `${r.name}|${z.name}`)}>
                              {z.leads.map((p) => <PersonPill key={p.email} p={p} onEdit={onEdit} />)}
                              {z.tba_region_heads > 0 && <Vacant n={z.tba_region_heads} label="RH" />}
                              {z.tba_rfs > 0 && <Vacant n={z.tba_rfs} label="RFS" />}
                              {z.leads.length === 0 && !z.tba_region_heads && !z.tba_rfs && <span className="text-[11px] text-status-critical">No RH / RFS</span>}
                            </Card>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </div>

      {zone && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">{zone.name} <span className="text-xs font-normal text-slate-400">{zoneRegion} · {zone.stations.length} stations</span></div>
            <button onClick={() => setZoneKey(null)} className="rounded-lg border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">Close</button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {zone.stations.map((s) => {
              const none = s.heads.length === 0 && !s.tba_heads;
              return (
                <div key={s.name} className={`rounded-lg border p-2 ${none ? "border-red-300 bg-red-50/40" : "border-slate-200"}`}>
                  <div className="text-xs font-semibold text-ink">{s.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {s.heads.map((p) => <PersonPill key={p.email} p={p} onEdit={onEdit} />)}
                    {s.tba_heads > 0 && <Vacant n={s.tba_heads} label="SH" />}
                    {none && <span className="text-[11px] font-medium text-status-critical">No Station Head</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {s.assistants.map((p) => <PersonPill key={p.email} p={p} onEdit={onEdit} />)}
                    {s.tba_assistants > 0 && <Vacant n={s.tba_assistants} label="FA" />}
                    {s.assistants.length === 0 && !s.tba_assistants && <span className="text-[11px] text-slate-400">No Fleet Assistants</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
