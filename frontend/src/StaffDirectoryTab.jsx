import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import HeadcountView from "./HeadcountView";
import OrgChartVisual from "./OrgChartVisual";
import OrgDetailsList from "./OrgDetailsList";
import OrgPeoplePanel from "./OrgPeoplePanel";
import StaffImport from "./StaffImport";
import MultiSelect from "./components/MultiSelect";
import { GROUPS, POSITIONS, positionLabel } from "./lib/roles";

// "Staff & Org Chart" (2026-10-02, staging): the one place the Fleet Admin team keeps the staff list right -- every person's position
// and where they are posted, HQ staff included. It feeds the PIC box and the org chart. It does NOT edit access (what a person may
// see): that starts out the same as the posting and is changed only by a Manager / HOD, a Region Head / RFS or the Superadmin in
// Settings -> Users, e.g. to give someone sent to rescue another station or region that place's data. The list shows when it differs.
const emptyForm = { email: "", name: "", role: "fleet_assistant", scope_type: "station", scope_values: [], phone: "", employee_id: "", job_title: "", based_station: "" };
// Every position the Fleet Admin team may set (the Superadmin role is not one of them), grouped like the roles are.
const POSITION_GROUPS = GROUPS.map((g) => ({ ...g, positions: g.positions.filter((p) => p !== "admin") }));

const whereText = (sc) => (!sc || sc.scope_type === "all" || sc.scope_type === "hq" ? "HQ" : (sc.scope_values || []).join(", "));

// Headcount is for the Manager, the HOD and the Fleet Admin role (and the Superadmin); other HQ roles -- OPEX, Recovery, Restock ... -- do not see it.
const HEADCOUNT_POSITIONS = ["hod", "manager", "fleet_admin"];

export default function StaffDirectoryTab({ me }) {
  const canSeeHeadcount = me?.role === "admin" || HEADCOUNT_POSITIONS.includes(me?.position);
  const [view, setView] = useState("list");
  const [chartMode, setChartMode] = useState("visual"); // the org chart as a picture (default) or the details list
  const [chart, setChart] = useState(null);
  const [people, setPeople] = useState(null);
  const [vacant, setVacant] = useState([]);
  const [hqView, setHqView] = useState(false); // HQ tiers also see employee ID and access; everyone else sees who is posted where + a phone number
  const [stations, setStations] = useState([]);
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const load = () => {
    api.orgChart().then(setChart).catch((e) => setError(e.message));
    api.staff.list().then((r) => { setPeople(r.people); setVacant(r.vacant || []); setHqView(!!r.hq_view); }).catch(() => setPeople([]));
  };
  useEffect(() => {
    load();
    api.stations().then(setStations).catch(() => {});
    api.regions().then(setRegions).catch(() => {});
  }, []);

  const canEdit = !!chart?.can_edit;
  const allZones = useMemo(() => regions.flatMap((r) => r.zones).sort(), [regions]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (people || [])
      .filter((u) => roleFilter === "all" || u.position === roleFilter || POSITIONS[u.position]?.group === roleFilter)
      .filter((u) => !q || [u.email, u.name, u.phone, u.employee_id, positionLabel(u.position), ...(u.home.scope_values || [])].join(" ").toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, search, roleFilter]);

  // Vacant seats (opened by a Manager / HOD in the Headcount view) show in the list as "Vacant" rows, first, so they get filled.
  const vacantRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vacant
      .filter((v) => roleFilter === "all" || v.designation === roleFilter || POSITIONS[v.designation]?.group === roleFilter)
      .filter((v) => !q || ["vacant", v.station, v.zone, v.region, v.label, v.note].join(" ").toLowerCase().includes(q));
  }, [vacant, search, roleFilter]);

  const startFill = (v) => {
    setEditing(null);
    const type = v.place_type === "zone" ? "zone" : v.place_type === "hq" ? "hq" : "station";
    setForm({ ...emptyForm, role: v.designation, scope_type: type, scope_values: type === "hq" ? [] : v.places || [v.station] });
    setShowForm(true);
    setShowImport(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = (email) => {
    const u = (people || []).find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u) return;
    setEditing(u.email);
    setForm({ email: u.email, name: u.name, role: u.position, scope_type: u.home.scope_type === "all" ? "hq" : u.home.scope_type, scope_values: u.home.scope_values || [], phone: u.phone || "", employee_id: u.employee_id || "", job_title: u.job_title || "", based_station: u.based_station || "" });
    setShowForm(true);
    setShowImport(false);
    setView("list");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancel = () => {
    setEditing(null);
    setShowForm(false);
    setForm(emptyForm);
    setError(null);
  };

  // HQ staff are based at HQ (or a dedicated region, like a regional Manager); region staff at zones / regions; station staff at a station.
  const pickRole = (role) => {
    const tier = POSITIONS[role]?.tier;
    const type = tier === "station" ? "station" : tier === "region" ? (form.scope_type === "region" ? "region" : "zone") : form.scope_type === "region" ? "region" : "hq";
    setForm((f) => ({ ...f, role, scope_type: type, scope_values: type === f.scope_type ? f.scope_values : [] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!form.name.trim()) throw new Error("Type the person's name");
      if (form.scope_type !== "hq" && form.scope_values.length === 0) throw new Error("Pick where they are based");
      const payload = { email: form.email.trim(), name: form.name.trim(), role: form.role, scope_type: form.scope_type, scope_values: form.scope_type === "hq" ? [] : form.scope_values, phone: form.phone.trim(), employee_id: form.employee_id.trim(), job_title: form.job_title.trim(), based_station: form.based_station };
      if (editing) await api.staff.update(editing, payload);
      else await api.staff.add(payload);
      cancel();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Remove ${u.name}? They lose their dashboard access and drop off the PIC list.`)) return;
    try {
      await api.staff.remove(u.email);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const tier = POSITIONS[form.role]?.tier;
  const scopeOptions = form.scope_type === "station" ? stations.map((s) => ({ value: s.station_name, label: `${s.station_name} (${s.zone})` }))
    : form.scope_type === "zone" ? allZones.map((z) => ({ value: z, label: z }))
    : regions.map((r) => ({ value: r.region, label: r.region }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Staff &amp; Org Chart</h2>
          <p className="text-xs text-slate-500">
            Who is posted where, HQ staff included. The PIC box and the org chart follow this list, and a person's access starts out the same, so keep it
            current: add new joiners, move people between stations, remove leavers.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
          {[["list", "Staff list"], ["chart", "Org chart"], ...(canSeeHeadcount ? [["headcount", "Headcount"]] : [])].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 ${view === k ? "bg-ink text-white" : "text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>}
      {!chart && !error && <div className="text-sm text-slate-400">Loading…</div>}

      {view === "headcount" && canSeeHeadcount && <HeadcountView />}

      {chart && view === "chart" && (
        <div className="space-y-3">
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold sm:w-fit">
            {[["visual", "Chart"], ["list", "Details list"]].map(([k, label]) => (
              <button key={k} onClick={() => setChartMode(k)} className={`px-3 py-1 ${chartMode === k ? "bg-ink text-white" : "text-slate-500"}`}>{label}</button>
            ))}
          </div>
          {chartMode === "visual" ? <OrgChartVisual chart={chart} me={me} /> : <OrgDetailsList chart={chart} />}
          <OrgPeoplePanel chart={chart} onChanged={load} />
        </div>
      )}

      {chart && view === "list" && (
        <>
          {canEdit && !showForm && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setShowForm(true); setShowImport(false); setEditing(null); setForm(emptyForm); }} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white">
                + Add a person
              </button>
              <button onClick={() => setShowImport((v) => !v)} className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700">
                Paste from sheet
              </button>
            </div>
          )}
          {canEdit && showImport && !showForm && <StaffImport people={people} stations={stations} regions={regions} onClose={() => setShowImport(false)} onDone={load} />}
          {canEdit && showForm && (
            <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
              <input required type="email" disabled={!!editing} placeholder="name@ninjavan.co" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500" />
              <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <select value={form.role} onChange={(e) => pickRole(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                {POSITION_GROUPS.map((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {g.positions.map((r) => <option key={r} value={r}>{positionLabel(r)}</option>)}
                  </optgroup>
                ))}
                {!POSITIONS[form.role] && <option value={form.role}>{form.role}</option>}
              </select>
              <div className="flex gap-2">
                {tier !== "station" && (
                  <select value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_values: [] })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                    {tier !== "region" && <option value="hq">HQ</option>}
                    {tier === "region" && <option value="zone">Zone(s)</option>}
                    <option value="region">Region(s)</option>
                  </select>
                )}
                {form.scope_type !== "hq" && (
                  <div className="min-w-0 flex-1">
                    <MultiSelect placeholder={form.scope_type === "station" ? "Pick station(s)…" : form.scope_type === "zone" ? "Pick zone(s)…" : "Pick region(s)…"}
                      options={scopeOptions} value={form.scope_values} onChange={(vals) => setForm({ ...form, scope_values: vals })} />
                  </div>
                )}
              </div>
              <input placeholder="Mobile (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <input placeholder="Employee ID (optional)" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <input placeholder="Title on the org chart (optional)" maxLength={80} value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              {tier === "region" && (
                <select value={form.based_station} onChange={(e) => setForm({ ...form, based_station: e.target.value })} aria-label="Based station" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                  <option value="">Based station (optional)</option>
                  {form.based_station && !stations.some((x) => x.station_name === form.based_station) && <option value={form.based_station}>{form.based_station}</option>}
                  {stations.map((x) => <option key={x.station_name} value={x.station_name}>{x.station_name}</option>)}
                </select>
              )}
              {!editing && ["station_head", "fleet_assistant", "region_head", "rfs", "fleet_admin"].includes(form.role) && (
                <p className="text-xs text-slate-400 sm:col-span-2 lg:col-span-5">
                  A Station Head / Fleet Assistant, Region Head / RFS or Fleet Admin can only be added where a Manager or the HOD has opened a vacant seat for it (use <em>Add person</em> on a Vacant row, or ask them to add the headcount first).
                </p>
              )}
              <div className="flex items-start gap-2 lg:col-span-3">
                <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{editing ? "Save" : "Add"}</button>
                <button type="button" onClick={cancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600">Cancel</button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find by name, email, position, station or zone…"
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by position" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
              <option value="all">All positions</option>
              {POSITION_GROUPS.map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {g.positions.map((r) => <option key={r} value={r}>{positionLabel(r)}</option>)}
                </optgroup>
              ))}
              <optgroup label="Position not set yet">
                <option value="region">Region staff</option>
                <option value="station">Station staff</option>
              </optgroup>
            </select>
            <span className="text-xs text-slate-400">{people ? `${rows.length} of ${people.length} people${vacant.length ? ` · ${vacantRows.length} of ${vacant.length} vacant` : ""}` : ""}</span>
          </div>

          <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Position</th>
                  <th className="px-3 py-2 font-medium">Posted at</th>
                  <th className="px-3 py-2 font-medium">Mobile</th>
                  {hqView && <th className="px-3 py-2 font-medium">Employee ID</th>}
                  {hqView && <th className="px-3 py-2 font-medium">Access</th>}
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {vacantRows.map((v) => (
                  <tr key={`vacant-${v.id}`} className="border-t border-slate-100 bg-amber-50/40">
                    <td className="px-3 py-1.5"><span className="rounded border border-dashed border-slate-400 px-2 py-0.5 text-xs font-medium text-slate-600">Vacant</span></td>
                    <td className="px-3 py-1.5 text-xs text-slate-500" colSpan={1}>{v.note || ""}</td>
                    <td className="px-3 py-1.5">{v.label}</td>
                    <td className="px-3 py-1.5 text-slate-500">{v.station}</td>
                    <td className="px-3 py-1.5 text-slate-300">-</td>
                    {hqView && <td className="px-3 py-1.5 text-slate-300">-</td>}
                    {hqView && <td className="px-3 py-1.5 text-xs text-slate-400">Counts in headcount</td>}
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">
                      {canEdit && <button onClick={() => startFill(v)} className="text-xs text-brand hover:underline">Add person</button>}
                    </td>
                  </tr>
                ))}
                {rows.map((u) => (
                  <tr key={u.email} className={`border-t border-slate-100 ${editing === u.email ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-1.5">{u.name}</td>
                    <td className="px-3 py-1.5 text-slate-500">{u.email}</td>
                    <td className="px-3 py-1.5">{positionLabel(u.position)}</td>
                    <td className="px-3 py-1.5 text-slate-500">{whereText(u.home)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{u.phone}</td>
                    {hqView && <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{u.employee_id}</td>}
                    {hqView && (
                      <td className="px-3 py-1.5 text-xs">
                        {u.custom_access ? (
                          <span title="Set by hand in Settings -> Users, e.g. covering another station or region" className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                            Custom: {whereText(u.access)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Same as posting</span>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">
                      {canEdit && (
                        <>
                          <button onClick={() => startEdit(u.email)} className="mr-3 text-xs text-brand hover:underline">Edit</button>
                          <button onClick={() => remove(u)} className="text-xs text-status-critical hover:underline">Remove</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {people && rows.length === 0 && vacantRows.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">Nobody matches.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            This list is where people are <strong>posted</strong>. What each person can <strong>see</strong> (their access) starts out the same and is
            changed in Settings -&gt; Users by a Manager, HOD, Region Head / RFS or the Superadmin -- for example to give someone sent to rescue another
            station or region that place's data. A posting change moves access with it, unless the access was set by hand (shown as Custom).
          </p>
        </>
      )}
    </div>
  );
}
