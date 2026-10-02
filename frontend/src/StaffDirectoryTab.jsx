import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import MultiSelect from "./components/MultiSelect";
import { POSITIONS, positionLabel } from "./lib/roles";

// "Staff & Org Chart" (2026-10-02, staging): the one place the Fleet Admin team keeps the staff list right -- who the Region Heads,
// RFS, Station Heads and Fleet Assistants are, and where. It edits the same users table that gives people access and feeds the PIC
// box, so a change here is live everywhere at once. The Org chart view is built from that list and shows vacant seats.
const SHORT = { region_head: "RH", rfs: "RFS", station_head: "SH", fleet_assistant: "FA" };
const POSITION_OPTIONS = ["region_head", "rfs", "station_head", "fleet_assistant"];
const emptyForm = { email: "", name: "", role: "fleet_assistant", scope_type: "station", scope_values: [] };

// "Name (SH - Larkin)": the same label the backend builds for a person added without a name (main.py _auto_display_name).
const composeName = (f) => `${f.name.trim()} (${SHORT[f.role] || positionLabel(f.role)} - ${f.scope_values.join(" & ")})`;
const plainName = (n) => (n || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
const whereText = (u) => (u.scope_type === "all" || u.scope_type === "hq" ? "HQ" : (u.scope_values || []).join(", "));

function Person({ p, onEdit }) {
  const label = plainName(p.name) || p.email;
  const body = (
    <>
      <span className="font-medium text-ink">{label}</span>
      <span className="ml-1 text-[10px] uppercase text-slate-400">{SHORT[p.position] || p.label}</span>
    </>
  );
  return onEdit ? (
    <button type="button" title={p.email} onClick={() => onEdit(p.email)} className="mr-1.5 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs hover:bg-slate-200">
      {body}
    </button>
  ) : (
    <span title={p.email} className="mr-1.5 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">
      {body}
    </span>
  );
}

function OrgChart({ chart, onEdit }) {
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const vacancies = chart.regions.flatMap((r) => r.zones.flatMap((z) => z.stations)).filter((s) => s.heads.length === 0).length;
  const stationCount = chart.regions.reduce((n, r) => n + r.zones.reduce((m, z) => m + z.stations.length, 0), 0);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">HQ</div>
        <div className="mt-1.5">{chart.hq.length ? chart.hq.map((p) => <Person key={p.email} p={p} />) : <span className="text-xs text-slate-400">Nobody yet</span>}</div>
        <p className="mt-2 text-xs text-slate-400">
          {stationCount} stations, {vacancies === 0 ? "every one has a Station Head" : `${vacancies} without a Station Head (shown in red)`}.
          {onEdit ? " Click a person to edit them." : ""}
        </p>
      </div>
      {chart.regions.map((r) => (
        <div key={r.name} className="rounded-lg border border-slate-200 bg-white">
          <button type="button" onClick={() => toggle(r.name)} className="flex w-full items-center justify-between px-3 py-2 text-left">
            <span className="text-sm font-semibold text-ink">
              {open[r.name] ? "▾" : "▸"} {r.name}
              <span className="ml-2 text-xs font-normal text-slate-400">{r.zones.length} zones</span>
            </span>
            <span>{r.managers.map((p) => <Person key={p.email} p={p} />)}</span>
          </button>
          {open[r.name] && (
            <div className="space-y-3 border-t border-slate-100 px-3 py-3">
              {r.zones.map((z) => (
                <div key={z.name}>
                  <div className="mb-1 flex flex-wrap items-center gap-x-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{z.name}</span>
                    <span>
                      {z.leads.length ? z.leads.map((p) => <Person key={p.email} p={p} onEdit={onEdit} />) : <span className="text-xs text-status-critical">No Region Head / RFS</span>}
                    </span>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400">
                        <th className="w-40 py-1 pr-3 font-medium">Station</th>
                        <th className="w-72 py-1 pr-3 font-medium">Station Head</th>
                        <th className="py-1 font-medium">Fleet Assistants</th>
                      </tr>
                    </thead>
                    <tbody>
                      {z.stations.map((s) => (
                        <tr key={s.name} className="border-t border-slate-100 align-top">
                          <td className="py-1 pr-3">{s.name}</td>
                          <td className="py-1 pr-3">
                            {s.heads.length ? s.heads.map((p) => <Person key={p.email} p={p} onEdit={onEdit} />) : <span className="text-xs font-medium text-status-critical">Vacant</span>}
                          </td>
                          <td className="py-1">
                            {s.assistants.length ? s.assistants.map((p) => <Person key={p.email} p={p} onEdit={onEdit} />) : <span className="text-xs text-slate-400">None</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function StaffDirectoryTab({ me }) {
  const [view, setView] = useState("list");
  const [chart, setChart] = useState(null);
  const [users, setUsers] = useState(null);
  const [stations, setStations] = useState([]);
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const load = () => {
    api.orgChart().then(setChart).catch((e) => setError(e.message));
    api.users.list().then(setUsers).catch(() => setUsers([]));
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
    return (users || [])
      .filter((u) => roleFilter === "all" || u.role === roleFilter)
      .filter((u) => !q || [u.email, u.display_name, positionLabel(u.role), ...(u.scope_values || [])].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email));
  }, [users, search, roleFilter]);

  const startEdit = (email) => {
    const u = (users || []).find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u) return;
    setEditing(u.email);
    setForm({ email: u.email, name: plainName(u.display_name), role: u.role, scope_type: u.scope_type, scope_values: u.scope_values || [] });
    setShowForm(true);
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

  const pickRole = (role) => {
    const tier = POSITIONS[role]?.tier;
    setForm((f) => ({ ...f, role, scope_type: tier === "region" && f.scope_type === "station" ? "zone" : tier === "station" ? "station" : f.scope_type, scope_values: [] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!form.name.trim()) throw new Error("Type the person's name");
      if (form.scope_values.length === 0) throw new Error("Pick where they work");
      const payload = { email: form.email.trim(), role: form.role, scope_type: form.scope_type, scope_values: form.scope_values, display_name: composeName(form) };
      if (editing) await api.users.update(editing, payload);
      else await api.users.add(payload);
      cancel();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Remove ${plainName(u.display_name) || u.email}? They lose their dashboard access and drop off the PIC list.`)) return;
    try {
      await api.users.remove(u.email);
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
            Who looks after each station, zone and region. This is the list the PIC box searches and the list that gives people access, so keep it current:
            add new joiners, move people between stations, remove leavers.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
          {[["list", "Staff list"], ["chart", "Org chart"]].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 ${view === k ? "bg-ink text-white" : "text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>}
      {!chart && !error && <div className="text-sm text-slate-400">Loading…</div>}

      {chart && view === "chart" && <OrgChart chart={chart} onEdit={canEdit ? startEdit : null} />}

      {chart && view === "list" && (
        <>
          {canEdit && !showForm && (
            <button onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white">
              + Add a person
            </button>
          )}
          {canEdit && showForm && (
            <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
              <input required type="email" disabled={!!editing} placeholder="name@ninjavan.co" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500" />
              <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <select value={form.role} onChange={(e) => pickRole(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                {POSITION_OPTIONS.map((r) => <option key={r} value={r}>{positionLabel(r)}</option>)}
                {!POSITION_OPTIONS.includes(form.role) && <option value={form.role}>{positionLabel(form.role)}</option>}
              </select>
              <div className="flex gap-2">
                {tier === "region" && (
                  <select value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_values: [] })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                    <option value="zone">Zone(s)</option>
                    <option value="region">Region(s)</option>
                  </select>
                )}
                <div className="min-w-0 flex-1">
                  <MultiSelect placeholder={form.scope_type === "station" ? "Pick station(s)…" : form.scope_type === "zone" ? "Pick zone(s)…" : "Pick region(s)…"}
                    options={scopeOptions} value={form.scope_values} onChange={(vals) => setForm({ ...form, scope_values: vals })} />
                </div>
              </div>
              <div className="flex items-start gap-2">
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
              {POSITION_OPTIONS.map((r) => <option key={r} value={r}>{positionLabel(r)}</option>)}
              <option value="region">Region staff (position not set)</option>
              <option value="station">Station staff (position not set)</option>
            </select>
            <span className="text-xs text-slate-400">{users ? `${rows.length} of ${users.length} people` : ""}</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Position</th>
                  <th className="px-3 py-2 font-medium">Where</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.email} className={`border-t border-slate-100 ${editing === u.email ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-1.5">{plainName(u.display_name) || "-"}</td>
                    <td className="px-3 py-1.5 text-slate-500">{u.email}</td>
                    <td className="px-3 py-1.5">{positionLabel(u.role)}</td>
                    <td className="px-3 py-1.5 text-slate-500">{whereText(u)}</td>
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
                {users && rows.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-400">Nobody matches.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Managers, HOD and the other HQ staff are not edited here -- ask an admin. The list shows Region Heads, RFS, Station Heads and Fleet Assistants.
          </p>
        </>
      )}
    </div>
  );
}
