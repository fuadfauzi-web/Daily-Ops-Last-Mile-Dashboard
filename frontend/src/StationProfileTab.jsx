import { useEffect, useMemo, useState } from "react";

// Station Profile (2026-10-07, staging): the MY - Fleet Management sheet's 'Station' tab as a page. Pick a station and see its IDs, zone (sub region), how long it has been
// open, Google Chat space, address, the Region Head / Supervisor over it, its own team, the WORKMAIL GROUP / MANAGER ON DUTY / BUSINESS HOURS boxes, the Last Mile
// station totals and the postcodes it covers. Open to every role; the Fleet Admin Team Lead (and the Superadmin) edits the Warehouse ID, the boxes and the postcodes.
const STORE = "station-profile:v1";
const REGION_ORDER = ["Klang Valley", "Northern", "Southern", "East Coast", "East Malaysia"];

async function call(method, path, body, isForm) {
  const res = await fetch(path, { method, headers: body && !isForm ? { "Content-Type": "application/json" } : undefined, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  if (!res.ok) {
    let detail = res.statusText;
    try { const j = await res.json(); detail = Array.isArray(j.detail) ? j.detail.map((d) => d.msg).join("; ") : j.detail || detail; } catch { /* no body */ }
    throw new Error(detail);
  }
  return res.json();
}

function Card({ title, children, right }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ k, children }) {
  return (
    <div className="flex gap-3 border-t border-slate-100 py-1.5 text-sm first:border-t-0">
      <div className="w-36 shrink-0 text-xs text-slate-400">{k}</div>
      <div className="min-w-0 break-words text-ink">{children || <span className="text-slate-300">-</span>}</div>
    </div>
  );
}

function PeopleTable({ rows, empty, withOffice }) {
  if (!rows.length) return <div className="text-sm text-slate-400">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-slate-400">
          <tr>
            <th className="py-1 pr-3 font-medium">{rows[0].designation !== undefined ? "Designation" : "Name"}</th>
            {rows[0].designation !== undefined && <th className="py-1 pr-3 font-medium">Name</th>}
            <th className="py-1 pr-3 font-medium">Email</th>
            <th className="py-1 pr-3 font-medium">Mobile</th>
            {withOffice && <th className="py-1 font-medium">Office based</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i} className="border-t border-slate-100">
              {p.designation !== undefined && <td className="whitespace-nowrap py-1 pr-3 text-slate-500">{p.designation}</td>}
              <td className="py-1 pr-3">{p.vacant ? <span className="rounded border border-dashed border-[#cc0000] px-2 py-0.5 text-xs font-semibold text-[#cc0000]">*Vacant</span> : p.name}</td>
              <td className="py-1 pr-3 text-slate-500">{p.email}</td>
              <td className="whitespace-nowrap py-1 pr-3 text-slate-500">{p.phone}</td>
              {withOffice && <td className="py-1">{p.office_based}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function vacantRows(n) {
  return Array.from({ length: n }, () => ({ vacant: true, name: "", email: "", phone: "", office_based: "" }));
}

export default function StationProfileTab() {
  const [list, setList] = useState(null);
  const [station, setStation] = useState("");
  const [filter, setFilter] = useState("");
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null); // "boxes" | "warehouse" | null
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState(null);
  const [pcFilter, setPcFilter] = useState("");

  useEffect(() => {
    call("GET", "/api/station-profile").then((r) => {
      setList(r);
      let saved = "";
      try { saved = localStorage.getItem(STORE) || ""; } catch { /* private window */ }
      const names = new Set(r.stations.map((s) => s.station));
      setStation(r.mine || (names.has(saved) ? saved : r.stations.find((s) => s.region === "Southern")?.station || r.stations[0]?.station || ""));
    }).catch((e) => setError(e.message));
  }, []);

  const load = (name) => {
    if (!name) return;
    setP(null);
    call("GET", `/api/station-profile/${encodeURIComponent(name)}`).then(setP).catch((e) => setError(e.message));
  };
  useEffect(() => {
    load(station);
    try { if (station) localStorage.setItem(STORE, station); } catch { /* private window */ }
  }, [station]);

  const grouped = useMemo(() => {
    const t = filter.trim().toLowerCase();
    const out = {};
    for (const s of list?.stations || []) {
      if (t && !`${s.station} ${s.code} ${s.zone}`.toLowerCase().includes(t) && s.station !== station) continue;
      (out[s.region] ||= []).push(s);
    }
    return out;
  }, [list, filter, station]);

  const save = async (fn) => {
    setError(null);
    setMsg(null);
    try { await fn(); setEdit(null); load(station); } catch (e) { setError(e.message); }
  };
  const upload = async (file) => {
    if (!file) return;
    setError(null);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await call("POST", "/api/station-postcodes/upload", fd, true);
      setMsg(`${r.postcodes} postcodes loaded for ${r.stations} stations${r.unknown_stations?.length ? `; not in the app: ${r.unknown_stations.join(", ")}` : ""}.`);
      load(station);
    } catch (e) { setError(e.message); }
  };

  const info = p?.info;
  const postcodes = useMemo(() => (p?.postcodes || []).filter((x) => !pcFilter.trim() || x.includes(pcFilter.trim())), [p, pcFilter]);
  const input = "rounded-lg border border-slate-300 px-2 py-1 text-sm";
  const setRow = (key, i, field, v) => setDraft((d) => ({ ...d, [key]: d[key].map((r, j) => (j === i ? { ...r, [field]: v } : r)) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Station Profile</h2>
          <p className="text-xs text-slate-500">Pick a station to see everything about it: IDs, address, who looks after it, its team and the postcodes it covers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a station…" className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
          <select value={station} onChange={(e) => { setStation(e.target.value); setEdit(null); setMsg(null); setError(null); }} aria-label="Station" className="h-9 min-w-[200px] rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-ink">
            {REGION_ORDER.filter((r) => grouped[r]).map((r) => (
              <optgroup key={r} label={r}>{grouped[r].map((s) => <option key={s.station} value={s.station}>{s.station} ({s.code})</option>)}</optgroup>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}
      {!p && !error && <div className="text-sm text-slate-400">Loading…</div>}

      {p && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={`${p.zone} · ${p.region}`}>
            <Field k="Station">{p.station} <span className="text-xs text-slate-400">{p.code}</span></Field>
            <Field k="Station ID">{p.station_id}</Field>
            <Field k="Warehouse ID">
              {edit === "warehouse" ? (
                <span className="flex items-center gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} className={`${input} w-28`} maxLength={20} />
                  <button onClick={() => save(() => call("PATCH", `/api/station-profile/${encodeURIComponent(p.station)}`, { warehouse_id: draft }))} className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white">Save</button>
                  <button onClick={() => setEdit(null)} className="text-xs text-slate-500">Cancel</button>
                </span>
              ) : (
                <>{p.warehouse_id}{p.can_edit && <button onClick={() => { setDraft(p.warehouse_id); setEdit("warehouse"); }} className="ml-3 text-xs text-brand hover:underline">Edit</button>}</>
              )}
            </Field>
            <Field k="Sub region">{p.zone}</Field>
            <Field k="Opened for">{p.opened_for?.text}{p.opening_date && <span className="ml-2 text-xs text-slate-400">since {p.opening_date}</span>}</Field>
            <Field k="Google Chat space">{p.chat_url && <a href={p.chat_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">Open the space</a>}</Field>
            <Field k="Address">{p.address}</Field>
            <Field k="Lat / long">{p.latlong && <a href={`https://www.google.com/maps?q=${encodeURIComponent(p.latlong)}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">{p.latlong}</a>}</Field>
          </Card>

          <Card title="Who looks after this station">
            <div className="space-y-4">
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Fleet Manager · {p.region}</div>
                <PeopleTable rows={p.managers} empty="No Fleet Manager for this region" />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Region Head · {p.zone}</div>
                <PeopleTable rows={[...p.region_heads, ...vacantRows(p.region_head_vacant)]} empty="No Region Head" withOffice />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Region Supervisor · {p.zone}</div>
                <PeopleTable rows={[...p.supervisors, ...vacantRows(p.supervisor_vacant)]} empty="No Region Supervisor" withOffice />
              </div>
            </div>
          </Card>

          <Card title="Station team">
            <PeopleTable rows={p.team} empty="Nobody is posted here yet" />
          </Card>

          <Card title="Last Mile stations">
            <Field k="TOTAL LM STATION"><span className="font-semibold">{p.totals.total}</span> <span className="text-xs text-slate-400">(without East Malaysia)</span></Field>
            {p.totals.regions.slice().sort((a, b) => REGION_ORDER.indexOf(a.name) - REGION_ORDER.indexOf(b.name)).map((r) => (
              <Field key={r.name} k={r.name.toUpperCase()}>{r.stations}</Field>
            ))}
          </Card>

          <Card
            title="Workmail groups · Manager on duty · Business hours"
            right={p.can_edit && edit !== "boxes" && <button onClick={() => { setDraft({ workmail_groups: info.workmail_groups.map((x) => ({ ...x })), managers_on_duty: info.managers_on_duty.map((x) => ({ ...x })), business_hours: { delivery_window: "", opening_days: "", opening_hours: "", ...info.business_hours } }); setEdit("boxes"); }} className="text-xs text-brand hover:underline">Edit (same for every station)</button>}
          >
            {edit === "boxes" ? (
              <div className="space-y-3">
                {[["workmail_groups", "Workmail groups", "label", "email"], ["managers_on_duty", "Manager on duty", "area", "name"]].map(([key, title, a, b]) => (
                  <div key={key}>
                    <div className="mb-1 text-xs font-semibold text-slate-500">{title}</div>
                    {draft[key].map((r, i) => (
                      <div key={i} className="mb-1 flex gap-2">
                        <input value={r[a]} onChange={(e) => setRow(key, i, a, e.target.value)} className={`${input} flex-1`} />
                        <input value={r[b]} onChange={(e) => setRow(key, i, b, e.target.value)} className={`${input} flex-1`} />
                        <button onClick={() => setDraft((d) => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }))} className="text-xs text-status-critical">Remove</button>
                      </div>
                    ))}
                    <button onClick={() => setDraft((d) => ({ ...d, [key]: [...d[key], { [a]: "", [b]: "" }] }))} className="text-xs text-brand hover:underline">Add a line</button>
                  </div>
                ))}
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-500">Business hours</div>
                  {[["delivery_window", "Delivery window"], ["opening_days", "Opening days"], ["opening_hours", "Opening hours"]].map(([k, l]) => (
                    <div key={k} className="mb-1 flex items-center gap-2"><span className="w-32 text-xs text-slate-400">{l}</span><input value={draft.business_hours[k]} onChange={(e) => setDraft((d) => ({ ...d, business_hours: { ...d.business_hours, [k]: e.target.value } }))} className={`${input} flex-1`} /></div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => save(() => call("PUT", "/api/station-profile-info", draft))} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white">Save</button>
                  <button onClick={() => setEdit(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-500">WORKMAIL GROUP</div>
                  {info.workmail_groups.map((g, i) => <div key={i} className="flex gap-3 border-t border-slate-100 py-1"><span className="w-44 shrink-0 text-slate-500">{g.label}</span><a href={`mailto:${g.email}`} className="text-brand hover:underline">{g.email}</a></div>)}
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-500">MANAGER ON DUTY</div>
                  {info.managers_on_duty.map((m, i) => <div key={i} className="flex gap-3 border-t border-slate-100 py-1"><span className="w-44 shrink-0 text-slate-500">{m.area}</span><span>{m.name}</span></div>)}
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-500">BUSINESS HOURS LM STATION</div>
                  <div className="border-t border-slate-100 py-1"><span className="inline-block w-44 text-slate-500">Delivery window</span>{info.business_hours.delivery_window}</div>
                  <div className="border-t border-slate-100 py-1"><span className="inline-block w-44 text-slate-500">Opening hours</span>{info.business_hours.opening_days} · {info.business_hours.opening_hours}</div>
                </div>
              </div>
            )}
          </Card>

          <Card
            title={`Postcode coverage (${p.postcodes.length})`}
            right={p.can_edit && (
              <label className="cursor-pointer text-xs text-brand hover:underline">
                Upload postcode file
                <input type="file" accept=".csv,.xlsx,.xlsm" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            )}
          >
            {p.postcodes.length === 0 ? (
              <div className="text-sm text-slate-400">No postcodes loaded for this station yet{p.can_edit ? " -- upload the [MY] Master Postcodes sheet (CSV or Excel with Postcode and Station columns)." : "."}</div>
            ) : (
              <>
                <input value={pcFilter} onChange={(e) => setPcFilter(e.target.value)} placeholder="Find a postcode…" className={`${input} mb-2 w-40`} />
                <div className="flex max-h-56 flex-wrap gap-1 overflow-auto">
                  {postcodes.map((x) => <span key={x} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{x}</span>)}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
