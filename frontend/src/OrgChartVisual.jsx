import { useEffect, useMemo, useState } from "react";

// Visual org chart (2026-10-03, staging), laid out like the Fleet Management sheet's org pictures: the HQ chain on top (HOO > HOD > Fleet Strategist / Last Mile Operation
// managers / LM Administrator & Support), then one block per region -- the region's own Fleet Manager, and under it each zone's Region Head and Region Supervisor
// with the zone's stations as small code boxes. Click a person (or a station box) for the details: email, mobile, employee ID, where they are posted and based.
// View settings: everything, one region, or one station (remembered in this browser), and a search for a station, zone, region or person.
const REGION_ORDER = ["Klang Valley", "Northern", "Southern", "East Coast", "East Malaysia"];
const STORE = "orgchart-view:v1";
const plain = (n) => (n || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
const zoneTail = (z) => z.replace(/^(South|North|East Coast|East Malaysia|Zone)\s*/i, "").toUpperCase();

// lines between the boxes of a tree (a parent's children hang off one rail)
const CSS = `
.orgtree ul{display:flex;justify-content:center;padding-top:20px;position:relative;margin:0;padding-left:0}
.orgtree li{list-style:none;text-align:center;position:relative;padding:20px 5px 0}
.orgtree li::before,.orgtree li::after{content:"";position:absolute;top:0;right:50%;border-top:1px solid #94a3b8;width:50%;height:20px}
.orgtree li::after{right:auto;left:50%;border-left:1px solid #94a3b8}
.orgtree li:only-child::after,.orgtree li:only-child::before{display:none}
.orgtree li:only-child{padding-top:0}
.orgtree li:first-child::before,.orgtree li:last-child::after{border:0 none}
.orgtree li:last-child::before{border-right:1px solid #94a3b8;border-radius:0 5px 0 0}
.orgtree li:first-child::after{border-radius:5px 0 0 0}
.orgtree ul ul::before{content:"";position:absolute;top:0;left:50%;border-left:1px solid #94a3b8;height:20px}
.orgtree > ul{padding-top:0;width:max-content;margin:0 auto}
`;

// [name bar, title bar]
const THEMES = {
  hoo: ["bg-[#9b0000]", "bg-[#9b0000]"],
  hod: ["bg-black", "bg-black"],
  strategist: ["bg-[#251a63]", "bg-[#251a63]"],
  manager: ["bg-black", "bg-[#cc0000]"],
  rh: ["bg-[#cc0000]", "bg-black"],
  rfs: ["bg-[#cc0000]", "bg-[#3a3a3a]"],
  support: ["bg-black", "bg-[#555]"],
  station: ["bg-black", "bg-[#555]"],
};

function PersonCard({ p, theme, footer, onOpen, w = "w-[148px]" }) {
  const [head, foot] = THEMES[theme] || THEMES.station;
  return (
    <button type="button" onClick={() => onOpen(p)} className={`${w} overflow-hidden rounded-sm border border-black/70 bg-white text-center shadow-sm hover:ring-2 hover:ring-slate-400`} title={`${plain(p.name)} -- click for details`}>
      <div className={`${head} px-1.5 py-1 text-[11px] font-bold leading-tight text-white`}>{plain(p.name) || p.email}</div>
      <div className="truncate px-1 py-0.5 text-[9px] text-slate-500">{p.phone || " "}</div>
      <div className={`${foot} px-1 py-0.5 text-[9px] font-semibold uppercase leading-tight tracking-wide text-white`}>{footer || p.title}</div>
    </button>
  );
}

function VacantCard({ label, w = "w-[148px]" }) {
  return (
    <div className={`${w} overflow-hidden rounded-sm border border-dashed border-[#cc0000] bg-white text-center`}>
      <div className="bg-[#cc0000] px-1.5 py-1 text-[11px] font-bold text-white">*Vacant</div>
      <div className="px-1 py-0.5 text-[9px] text-slate-300">{" "}</div>
      <div className="bg-[#555] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">{label}</div>
    </div>
  );
}

function Banner({ children, tone = "bg-[#cc0000]" }) {
  return <div className={`inline-block min-w-[190px] px-6 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white ${tone}`}>{children}</div>;
}

function Dialog({ onClose, children, title }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        {children}
        <div className="mt-3 text-right"><button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600">Close</button></div>
      </div>
    </div>
  );
}

function Row({ k, v, href }) {
  if (!v) return null;
  return (
    <div className="flex gap-3 border-t border-slate-100 py-1.5 text-sm">
      <div className="w-28 shrink-0 text-xs text-slate-400">{k}</div>
      <div className="min-w-0 break-words text-ink">{href ? <a className="text-brand hover:underline" href={href}>{v}</a> : v}</div>
    </div>
  );
}

function PersonDetails({ p, extra }) {
  return (
    <div>
      <div className="text-base font-semibold text-ink">{plain(p.name)}</div>
      <div className="mb-2 text-xs text-slate-500">{extra || p.title || p.label}</div>
      <Row k="Position" v={p.title || p.label} />
      <Row k="Posted at" v={p.posted} />
      <Row k="Based at" v={p.based_station} />
      <Row k="Email" v={p.email} href={p.email ? `mailto:${p.email}` : null} />
      <Row k="Mobile" v={p.phone} href={p.phone ? `tel:${p.phone.split("/")[0].replace(/[^\d+]/g, "")}` : null} />
      <Row k="Employee ID" v={p.employee_id} />
      {p.source === "org" && <div className="mt-2 text-[11px] text-slate-400">On the chart only -- no dashboard access.</div>}
    </div>
  );
}

// where the signed-in person sits on the chart (null = not on it, e.g. the owner without a chart entry)
function findMe(chart, email) {
  if (!email) return null;
  const e = email.toLowerCase();
  const is = (p) => (p.email || "").toLowerCase() === e;
  for (const r of chart.regions) {
    if (r.managers.some(is)) return { region: r.name };
    for (const z of r.zones) {
      const lead = z.leads.find(is);
      if (lead) return { region: r.name, zone: z.name, station: z.stations.some((s) => s.name === lead.based_station) ? lead.based_station : undefined };
      for (const s of z.stations) if ([...s.heads, ...s.assistants].some(is)) return { region: r.name, zone: z.name, station: s.name };
    }
  }
  return null;
}

function HqChain({ chart, onOpen }) {
  const t = chart.top || {};
  const managers = chart.regions.flatMap((r) => r.managers.map((m) => ({ m, region: r.name }))).sort((a, b) => REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region));
  const key = (p) => p.org_id || p.email;
  return (
    <div className="orgtree overflow-x-auto pb-2">
      <ul>
        <li>
          <div className="flex flex-col items-center gap-1">{(t.hoo || []).map((p) => <PersonCard key={key(p)} p={p} theme="hoo" onOpen={onOpen} w="w-[230px]" />)}</div>
          <ul>
            <li>
              <div className="flex flex-col items-center gap-1">{(t.hod || []).map((p) => <PersonCard key={key(p)} p={p} theme="hod" onOpen={onOpen} w="w-[230px]" />)}</div>
              <ul>
                <li>
                  <Banner tone="bg-[#251a63]">Fleet Strategist</Banner>
                  <ul>
                    <li><div className="flex flex-col items-center gap-2">{(t.strategist || []).map((p) => <PersonCard key={key(p)} p={p} theme="strategist" onOpen={onOpen} />)}</div></li>
                  </ul>
                </li>
                <li>
                  <Banner>Last Mile Operation</Banner>
                  <ul>
                    {managers.map(({ m }) => <li key={key(m)}><PersonCard p={m} theme="manager" onOpen={onOpen} /></li>)}
                  </ul>
                </li>
                <li>
                  <Banner tone="bg-[#444]">LM Administrator &amp; Support</Banner>
                  <ul>
                    <li>
                      {t.admin_lead && <PersonCard p={t.admin_lead} theme="support" onOpen={onOpen} w="w-[200px]" />}
                      <div className="mx-auto mt-3 grid w-[320px] grid-cols-2 gap-2">
                        {(t.admin_members || []).map((p) => <PersonCard key={key(p)} p={p} theme="support" onOpen={onOpen} w="w-full" />)}
                        {chart.hq_vacant_fleet_admin > 0 && <VacantCard label={`Fleet Admin${chart.hq_vacant_fleet_admin > 1 ? ` x${chart.hq_vacant_fleet_admin}` : ""}`} w="w-full" />}
                      </div>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  );
}

function StationBox({ s, onOpen }) {
  const none = s.heads.length === 0 && !s.tba_heads;
  return (
    <button type="button" onClick={() => onOpen(s)} title={`${s.name}${none ? " -- no Station Head" : ""}`}
      className={`border bg-white px-1 py-1.5 text-center text-[12px] font-semibold tracking-wide hover:bg-slate-100 ${none ? "border-[#cc0000] text-[#cc0000]" : "border-black/60 text-ink"}`}>
      {s.code || s.name.slice(0, 3).toUpperCase()}
    </button>
  );
}

function ZoneColumn({ z, onPerson, onStation, mark }) {
  const rhs = z.leads.filter((p) => p.position === "region_head");
  const rfs = z.leads.filter((p) => p.position !== "region_head");
  const rfsLabel = (p) => (p.covers && p.covers.length > 1 ? `Region Supervisor ${p.covers.map(zoneTail).join(" & ")}` : "Region Supervisor");
  return (
    <div id={`zone-${z.name}`} className={`mx-auto flex w-[154px] flex-col items-center gap-1.5 p-0.5 ${mark ? "rounded ring-2 ring-amber-400" : ""}`}>
      {rhs.map((p) => <PersonCard key={p.email} p={p} theme="rh" footer="Region Head" onOpen={onPerson} />)}
      {Array.from({ length: z.tba_region_heads }).map((_, i) => <VacantCard key={`vh${i}`} label="Region Head" />)}
      {rhs.length === 0 && !z.tba_region_heads && <VacantCard label="Region Head" />}
      {rfs.map((p) => <PersonCard key={p.email} p={p} theme="rfs" footer={rfsLabel(p)} onOpen={onPerson} />)}
      {Array.from({ length: z.tba_rfs }).map((_, i) => <VacantCard key={`vr${i}`} label="Region Supervisor" />)}
      {rfs.length === 0 && !z.tba_rfs && <VacantCard label="Region Supervisor" />}
      <div className="mt-1 w-full border-y-2 border-[#cc0000] bg-white py-0.5 text-center text-[11px] font-extrabold uppercase text-ink">{z.name}</div>
      <div className="grid w-full grid-cols-3 gap-0.5">
        {z.stations.map((s) => <StationBox key={s.name} s={s} onOpen={onStation} />)}
      </div>
    </div>
  );
}

function RegionBlock({ r, onPerson, onStation, markZone }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-stretch">
        <div className="flex w-12 items-center justify-center bg-black text-sm font-bold text-white">{r.station_count}</div>
        <div className="flex-1 bg-[#444] px-4 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-white">{r.name}</div>
      </div>
      <div className="orgtree overflow-x-auto pb-2">
        <ul>
          <li>
            <div className="flex flex-wrap justify-center gap-2">
              {r.managers.map((m) => <PersonCard key={m.org_id || m.email} p={m} theme="manager" onOpen={onPerson} w="w-[190px]" />)}
              {r.managers.length === 0 && <VacantCard label="Fleet Manager" w="w-[190px]" />}
            </div>
            <ul>
              {r.zones.map((z) => (
                <li key={z.name}><ZoneColumn z={z} onPerson={onPerson} onStation={onStation} mark={markZone === z.name} /></li>
              ))}
            </ul>
          </li>
        </ul>
      </div>
    </section>
  );
}

function StationFocus({ regions, station, onPerson }) {
  let r, z, s;
  for (const rr of regions) for (const zz of rr.zones) { const f = zz.stations.find((x) => x.name === station); if (f) { r = rr; z = zz; s = f; } }
  if (!s) return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Pick a station above (or search for one).</div>;
  const rhs = z.leads.filter((p) => p.position === "region_head");
  const rfs = z.leads.filter((p) => p.position !== "region_head");
  const staff = [...s.heads.map((p) => ({ p, foot: "Station Head" })), ...s.assistants.map((p, i) => ({ p, foot: `Fleet Assistant ${i + 1}` }))];
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-ink">{s.name} <span className="text-xs font-normal text-slate-400">{s.code}{s.station_id ? ` · ID ${s.station_id}` : ""} · {z.name} · {r.name}</span></div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {r.managers.map((m) => <PersonCard key={m.org_id || m.email} p={m} theme="manager" onOpen={onPerson} w="w-[190px]" />)}
          {r.managers.length === 0 && <VacantCard label="Fleet Manager" w="w-[190px]" />}
        </div>
        <div className="h-4 w-px bg-slate-400" />
        <div className="flex flex-wrap justify-center gap-2">
          {rhs.map((p) => <PersonCard key={p.email} p={p} theme="rh" footer="Region Head" onOpen={onPerson} />)}
          {Array.from({ length: z.tba_region_heads }).map((_, i) => <VacantCard key={`vh${i}`} label="Region Head" />)}
          {rfs.map((p) => <PersonCard key={p.email} p={p} theme="rfs" footer="Region Supervisor" onOpen={onPerson} />)}
          {Array.from({ length: z.tba_rfs }).map((_, i) => <VacantCard key={`vr${i}`} label="Region Supervisor" />)}
        </div>
        <div className="h-4 w-px bg-slate-400" />
        <div className="border-y-2 border-[#cc0000] px-6 py-0.5 text-xs font-extrabold uppercase text-ink">{s.name}</div>
        <div className="flex flex-wrap justify-center gap-2">
          {staff.map(({ p, foot }) => <PersonCard key={p.email} p={p} theme="station" footer={foot} onOpen={onPerson} />)}
          {Array.from({ length: s.tba_heads }).map((_, i) => <VacantCard key={`sh${i}`} label="Station Head" />)}
          {Array.from({ length: s.tba_assistants }).map((_, i) => <VacantCard key={`sa${i}`} label="Fleet Assistant" />)}
          {staff.length === 0 && !s.tba_heads && !s.tba_assistants && <span className="text-xs text-status-critical">Nobody posted here yet</span>}
        </div>
      </div>
    </div>
  );
}

export default function OrgChartVisual({ chart, me }) {
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; }
  }, []);
  const mine = useMemo(() => findMe(chart, me?.email), [chart, me?.email]);
  const [mode, setMode] = useState(saved.mode || "all"); // all | region | station
  const [region, setRegion] = useState(saved.region || mine?.region || "Southern");
  const [station, setStation] = useState(saved.station || mine?.station || "");
  const [markZone, setMarkZone] = useState(null);
  const [dialog, setDialog] = useState(null); // { person } | { station }
  const [q, setQ] = useState("");

  const regions = useMemo(() => [...chart.regions].sort((a, b) => REGION_ORDER.indexOf(a.name) - REGION_ORDER.indexOf(b.name)), [chart]);
  const allStations = useMemo(() => regions.flatMap((r) => r.zones.flatMap((z) => z.stations.map((s) => ({ ...s, zone: z.name, region: r.name })))), [regions]);
  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ mode, region, station })); } catch { /* private window: not remembered */ }
  }, [mode, region, station]);

  const regionOf = (name) => allStations.find((s) => s.name === name)?.region;
  const go = (m, patch = {}) => {
    setMode(m);
    if (patch.region) setRegion(patch.region);
    if (patch.station !== undefined) setStation(patch.station);
    setMarkZone(patch.zone || null);
    if (patch.zone) setTimeout(() => document.getElementById(`zone-${patch.zone}`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }), 150);
  };

  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const out = [];
    for (const r of regions) if (r.name.toLowerCase().includes(t)) out.push({ kind: "region", label: r.name, sub: "Region", region: r.name });
    for (const r of regions) for (const z of r.zones) if (z.name.toLowerCase().includes(t)) out.push({ kind: "zone", label: z.name, sub: `Zone · ${r.name}`, region: r.name, zone: z.name });
    for (const s of allStations) if (s.name.toLowerCase().includes(t) || (s.code || "").toLowerCase() === t) out.push({ kind: "station", label: s.name, sub: `${s.code || ""} · ${s.zone} · ${s.region}`, station: s.name, region: s.region });
    const people = [];
    for (const r of regions) {
      for (const m of r.managers) people.push({ p: m, region: r.name });
      for (const z of r.zones) {
        for (const p of z.leads) people.push({ p, region: r.name, zone: z.name });
        for (const s of z.stations) for (const p of [...s.heads, ...s.assistants]) people.push({ p, region: r.name, zone: z.name, station: s.name });
      }
    }
    const seen = new Set();
    for (const x of people) {
      const k = x.p.email || x.p.name;
      if (seen.has(`${k}|${x.region}|${x.zone}`) || !`${x.p.name} ${x.p.email}`.toLowerCase().includes(t)) continue;
      seen.add(`${k}|${x.region}|${x.zone}`);
      out.push({ kind: "person", label: plain(x.p.name), sub: `${x.p.title || x.p.label} · ${x.station || x.zone || x.region}`, p: x.p, region: x.region, zone: x.zone, station: x.station });
    }
    return out.slice(0, 10);
  }, [q, regions, allStations]);

  const pick = (h) => {
    setQ("");
    if (h.kind === "station") go("station", { station: h.station, region: h.region });
    else if (h.kind === "region") go("region", { region: h.region });
    else if (h.kind === "zone") go("region", { region: h.region, zone: h.zone });
    else { setDialog({ person: h.p }); go("region", { region: h.region, zone: h.zone }); }
  };

  const setSeg = (k) => {
    if (k === "all") go("all");
    else if (k === "region") go("region", { region: mine?.region || region });
    else go("station", { station: mine?.station || station, region: regionOf(mine?.station || station) || region });
  };
  const shownRegions = mode === "region" ? regions.filter((r) => r.name === region) : regions;
  const selectCls = "h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700";
  const openPerson = (p) => setDialog({ person: p });

  return (
    <div className="space-y-3">
      <style>{CSS}</style>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold" role="group" aria-label="View">
          {[["all", "Everything"], ["region", "Region only"], ["station", "Station only"]].map(([k, label]) => (
            <button key={k} onClick={() => setSeg(k)} className={`px-3 py-1.5 ${mode === k ? "bg-ink text-white" : "text-slate-500"}`}>{label}</button>
          ))}
        </div>
        {mode === "region" && (
          <select value={region} onChange={(e) => go("region", { region: e.target.value })} className={selectCls} aria-label="Region">
            {regions.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        )}
        {mode === "station" && (
          <select value={station} onChange={(e) => go("station", { station: e.target.value, region: regionOf(e.target.value) || region })} className={selectCls} aria-label="Station">
            <option value="">Pick a station…</option>
            {regions.map((r) => (
              <optgroup key={r.name} label={r.name}>
                {allStations.filter((s) => s.region === r.name).map((s) => <option key={s.name} value={s.name}>{s.name} ({s.code})</option>)}
              </optgroup>
            ))}
          </select>
        )}
        <div className="relative ml-auto w-full max-w-xs">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a station, zone, region or person…" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
          {hits.length > 0 && (
            <ul className="absolute right-0 z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
              {hits.map((h, i) => (
                <li key={i}><button type="button" onClick={() => pick(h)} className="block w-full px-3 py-1 text-left hover:bg-slate-50"><span className="font-medium text-ink">{h.label}</span> <span className="text-xs text-slate-400">{h.sub}</span></button></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {mode === "all" ? "Click a person for their details; a station box (its 3-letter code) opens that station's team. A station box in red has no Station Head and no vacant seat."
          : mode === "region" ? `Showing ${region} only.` : "Showing one station: its Fleet Manager, Region Head / Supervisor and team."}
        {!mine && " You are not placed on the chart, so \"my\" region / station is the last one you picked."}
      </p>

      {mode === "all" && <HqChain chart={chart} onOpen={openPerson} />}
      {mode === "station" ? (
        <StationFocus regions={regions} station={station} onPerson={openPerson} />
      ) : (
        <div className="space-y-4">
          {shownRegions.map((r) => <RegionBlock key={r.name} r={r} markZone={markZone} onPerson={openPerson} onStation={(s) => setDialog({ station: s })} />)}
        </div>
      )}

      {dialog?.person && (
        <Dialog onClose={() => setDialog(null)} title="Person"><PersonDetails p={dialog.person} /></Dialog>
      )}
      {dialog?.station && (
        <Dialog onClose={() => setDialog(null)} title="Station">
          <div className="text-base font-semibold text-ink">{dialog.station.name}</div>
          <div className="mb-2 text-xs text-slate-500">{dialog.station.code}{dialog.station.station_id ? ` · Station ID ${dialog.station.station_id}` : ""}</div>
          {[...dialog.station.heads.map((p) => [p, "Station Head"]), ...dialog.station.assistants.map((p, i) => [p, `Fleet Assistant ${i + 1}`])].map(([p, role]) => (
            <div key={p.email} className="mb-2 rounded-lg border border-slate-200 p-2"><PersonDetails p={p} extra={role} /></div>
          ))}
          {dialog.station.heads.length + dialog.station.assistants.length === 0 && <div className="text-sm text-slate-500">Nobody posted here yet.</div>}
        </Dialog>
      )}
    </div>
  );
}
