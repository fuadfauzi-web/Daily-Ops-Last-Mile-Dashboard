import { useEffect, useState } from "react";
import { api } from "./api";
import { registerRoles } from "./lib/roles";
import DepartmentsPanel from "./DepartmentsPanel";
import RoleAccessPanel from "./RoleAccessPanel";

// Superadmin -> Access Setting (2026-10-10; was "Departments" + "Role Access"). Three parts:
//   Roles & departments  departments and the roles in them, plus custom roles (create / rename / move / delete)
//   Module access        which role may open and do what in which module, with optional scope
//   Beta                 switch Beta availability on or off per module and per sub-page, independently
const TIER_LABELS = { hq_staff: "HQ staff (head-office pages, all regions)", region: "Region staff (their region / zones)", station: "Station staff (their stations)" };

function RolesManager() {
  const [roles, setRoles] = useState(null);
  const [depts, setDepts] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ label: "", tier: "hq_staff", department: "" });
  const [editing, setEditing] = useState(null); // role key
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const list = await api.roles();
      registerRoles(list);
      setRoles(list);
      setDepts(await api.departments.list());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setForm({ label: "", tier: "hq_staff", department: "" });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    const body = { label: form.label, tier: form.tier, department: form.department || null };
    run(() => (editing ? api.roleEdit(editing, body) : api.roleAdd(body)));
  };
  const startEdit = (r) => {
    setEditing(r.key);
    setForm({ label: r.label, tier: r.tier === "manager" || r.tier === "admin" ? "hq_staff" : r.tier, department: r.department || "" });
  };
  const remove = (r) => {
    if (!confirm(`Delete the role "${r.label}"? Its access settings go with it.`)) return;
    run(() => api.roleRemove(r.key));
  };

  if (!roles) return <div className="text-slate-500">{error || "Loading…"}</div>;
  const custom = roles.filter((r) => !r.builtin);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-medium text-slate-800">Roles</div>
        <p className="mt-1 text-sm text-slate-500">
          Create a role for a department (for example a Restock role) and decide what it can reach in <strong>Module access</strong>. A custom role starts from a <strong>base level</strong> that
          sets the kind of data it takes (head office, region or station) and what its pages let it do; Module access then narrows it -- it never lifts a limit a page keeps for itself. Built-in
          roles cannot be renamed or deleted.
        </p>
        {error && <div className="mt-2 rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{error}</div>}
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Role name
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} maxLength={60} className="mt-0.5 block w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800" />
          </label>
          <label className="text-xs text-slate-500">
            Base level
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="mt-0.5 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800">
              {Object.entries(TIER_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Department
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-0.5 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800">
              <option value="">(none)</option>
              {depts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy || !form.label.trim()} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">
            {editing ? "Save role" : "Add role"}
          </button>
          {editing && (
            <button type="button" onClick={() => (setEditing(null), setForm({ label: "", tier: "hq_staff", department: "" }))} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          )}
        </form>
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Custom roles</div>
        {custom.length === 0 ? (
          <div className="mt-1 text-sm text-slate-400">None yet.</div>
        ) : (
          <ul className="mt-1 divide-y divide-slate-100">
            {custom.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{r.label}</span>
                <span className="text-xs text-slate-500">{TIER_LABELS[r.tier] || r.tier}</span>
                <span className="text-xs text-slate-500">{r.department ? `Department: ${r.department}` : "No department"}</span>
                <span className="text-xs text-slate-400">{r.users} user{r.users === 1 ? "" : "s"}</span>
                <span className="ml-auto flex gap-3">
                  <button onClick={() => startEdit(r)} className="text-sky-700 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => remove(r)} className="text-status-critical hover:underline">
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DepartmentsPanel />
    </div>
  );
}

function BetaPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () =>
    api
      .roleAccess()
      .then((d) => (setData(d), setError(null)))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const toggle = async (m) => {
    setBusy(m.id);
    setError(null);
    try {
      await api.moduleBeta(m.id, !m.beta_on);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <div className="text-slate-500">{error || "Loading…"}</div>;
  const betas = data.modules.filter((m) => m.beta);
  const top = betas.filter((m) => !m.parent);
  const kids = (id) => betas.filter((m) => m.parent === id);
  const parentless = betas.filter((m) => m.parent && !top.some((t) => t.id === m.parent));

  const Row = ({ m, indent }) => (
    <li className={`flex items-center gap-3 py-2 ${indent ? "pl-6" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-800">
          {m.label} <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-800">Beta</span>
        </div>
        <div className="text-xs text-slate-500">{m.group}{m.parent ? " · sub-page" : " · module"}</div>
      </div>
      <span className={`text-xs font-semibold ${m.beta_on ? "text-emerald-700" : "text-red-700"}`}>{m.beta_on ? "Beta ON -- available to roles with access" : "Beta OFF -- hidden from everyone but you"}</span>
      <button
        role="switch"
        aria-checked={m.beta_on}
        aria-label={`Beta for ${m.label}`}
        disabled={busy === m.id}
        onClick={() => toggle(m)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${m.beta_on ? "bg-emerald-500" : "bg-slate-300"} disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${m.beta_on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </li>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Beta controls decide whether a still-maturing module or sub-page is <strong>available</strong>. Each switch works on its own -- turning one on or off never changes another. A person sees a Beta
        page only when <strong>both</strong> hold: their role has access to it (Module access) <strong>and</strong> its Beta is ON here. Switching Beta off only hides the page; its data and settings stay
        untouched, and you as Superadmin still see it. Changes apply within about 30 seconds.
      </p>
      {error && <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{error}</div>}
      <ul className="divide-y divide-slate-100 rounded-xl bg-white px-4 ring-1 ring-slate-200">
        {top.map((m) => (
          <div key={m.id}>
            <Row m={m} />
            {kids(m.id).map((k) => (
              <Row key={k.id} m={k} indent />
            ))}
          </div>
        ))}
        {parentless.map((m) => (
          <Row key={m.id} m={m} />
        ))}
        {betas.length === 0 && <li className="py-3 text-sm text-slate-400">No Beta modules at the moment.</li>}
      </ul>
    </div>
  );
}

const TABS = [
  ["roles", "Roles & departments"],
  ["modules", "Module access"],
  ["beta", "Beta"],
];

export default function AccessSettingPanel() {
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem("accessSettingTab") || "roles";
    } catch {
      return "roles";
    }
  });
  const pick = (k) => {
    setTab(k);
    try {
      sessionStorage.setItem("accessSettingTab", k);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => pick(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "roles" && <RolesManager />}
      {tab === "modules" && <RoleAccessPanel />}
      {tab === "beta" && <BetaPanel />}
    </div>
  );
}
