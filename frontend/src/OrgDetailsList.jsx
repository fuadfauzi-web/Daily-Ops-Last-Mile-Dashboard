import { useMemo, useState } from "react";

// Org chart as a details list (2026-10-03, staging), laid out like the Fleet Management sheet's station list:
// Station ID | Zone | Station | Designation | Name | Email | Mobile | Employee ID. Region Head / RFS rows sit at the top of their zone and carry the
// station they are BASED at (they manage a zone but sit at a station); vacant seats show as "*Vacant". Everyone sees this list.
const REGION_ORDER = ["Klang Valley", "Northern", "Southern", "East Coast", "East Malaysia"];
const plain = (n) => (n || "").replace(/\s*\([^)]*\)\s*$/, "").trim();

function buildRows(chart) {
  const rows = [];
  const add = (r) => rows.push({ stationId: "", zone: "", station: "", based: "", vacant: false, ...r });
  const person = (p, extra) => add({ designation: p.title || p.label, name: plain(p.name), email: p.email, phone: p.phone, employeeId: p.employee_id, ...extra });
  const t = chart.top || {};
  const hq = { region: "HQ", zone: "HQ" };
  for (const p of t.hoo || []) person(p, hq);
  for (const p of t.hod || []) person(p, hq);
  for (const p of t.strategist || []) person(p, hq);
  if (t.admin_lead) person(t.admin_lead, hq);
  for (const p of t.admin_members || []) person(p, hq);
  for (let i = 0; i < (chart.hq_vacant_fleet_admin || 0); i++) add({ ...hq, designation: "Fleet Admin", vacant: true });
  for (const r of [...chart.regions].sort((a, b) => REGION_ORDER.indexOf(a.name) - REGION_ORDER.indexOf(b.name))) {
    for (const m of r.managers) person(m, { region: r.name, zone: r.name });
    for (const z of r.zones) {
      const base = { region: r.name, zone: z.name };
      for (const p of z.leads) person(p, { ...base, designation: p.position === "region_head" ? "Region Head" : p.covers?.length > 1 ? `Region Supervisor (${p.covers.join(" & ")})` : "Region Supervisor", based: p.based_station });
      for (let i = 0; i < z.tba_region_heads; i++) add({ ...base, designation: "Region Head", vacant: true });
      for (let i = 0; i < z.tba_rfs; i++) add({ ...base, designation: "Region Supervisor", vacant: true });
      for (const s of z.stations) {
        const at = { ...base, station: s.name, stationId: s.station_id };
        for (const p of s.heads) person(p, { ...at, designation: "Station Head" });
        for (let i = 0; i < s.tba_heads; i++) add({ ...at, designation: "Station Head", vacant: true });
        let n = 0;
        for (const p of s.assistants) person(p, { ...at, designation: `Fleet Assistant ${++n}` });
        for (let i = 0; i < s.tba_assistants; i++) add({ ...at, designation: `Fleet Assistant ${++n}`, vacant: true });
        if (!s.heads.length && !s.tba_heads && !s.assistants.length && !s.tba_assistants) add({ ...at, designation: "Station Head", vacant: true, noSeat: true });
      }
    }
  }
  return rows;
}

export default function OrgDetailsList({ chart }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [only, setOnly] = useState("all"); // all | people | vacant
  const all = useMemo(() => buildRows(chart), [chart]);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((r) => (region === "all" || r.region === region)
      && (only === "all" || (only === "vacant") === r.vacant)
      && (!t || [r.stationId, r.zone, r.station, r.designation, r.name, r.email, r.phone, r.employeeId, r.based, r.vacant ? "vacant" : ""].join(" ").toLowerCase().includes(t)));
  }, [all, q, region, only]);
  const cell = "px-3 py-1.5";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search station, zone, name, email, ID…" className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
          <option value="all">All regions</option>
          <option value="HQ">HQ</option>
          {REGION_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Show" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
          <option value="all">People and vacant seats</option>
          <option value="people">People only</option>
          <option value="vacant">Vacant seats only</option>
        </select>
        <span className="text-xs text-slate-400">{rows.length} of {all.length} rows</span>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
            <tr>
              {["Station ID", "Zone", "Station", "Designation", "Name", "Email", "Mobile no", "Employee ID", "Based station"].map((h) => <th key={h} className={`${cell} font-medium`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t border-slate-100 ${r.vacant ? "bg-amber-50/40" : ""}`}>
                <td className={`${cell} whitespace-nowrap text-slate-500`}>{r.stationId}</td>
                <td className={`${cell} whitespace-nowrap text-slate-500`}>{r.zone}</td>
                <td className={`${cell} whitespace-nowrap`}>{r.station}</td>
                <td className={`${cell} whitespace-nowrap`}>{r.designation}</td>
                <td className={cell}>{r.vacant ? <span className="rounded border border-dashed border-[#cc0000] px-2 py-0.5 text-xs font-semibold text-[#cc0000]">*Vacant{r.noSeat ? " (no seat opened)" : ""}</span> : r.name}</td>
                <td className={`${cell} text-slate-500`}>{r.email}</td>
                <td className={`${cell} whitespace-nowrap text-slate-500`}>{r.phone}</td>
                <td className={`${cell} whitespace-nowrap text-slate-500`}>{r.employeeId}</td>
                <td className={`${cell} whitespace-nowrap`}>{r.based}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-400">Nothing matches.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Region Head / Supervisor rows show the station they are based at; they manage the whole zone. Stations with nobody and no vacant seat show a vacant Station Head.</p>
    </div>
  );
}
