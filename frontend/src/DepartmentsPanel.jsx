import { useEffect, useState } from "react";
import { api } from "./api";
import { GROUPS, POSITIONS } from "./lib/roles";

// Superadmin -> Departments (2026-10-08): the departments people belong to (Last Mile, Restock, Recovery ...) and which roles each one includes. On the Users page a person
// gets a department first and the role list then offers only that department's roles. A department with no roles ticked accepts any role.
const OFFERED = GROUPS.flatMap((g) => g.positions).filter((p) => p !== "admin"); // the Superadmin is nobody's department role

function RoleChecks({ value, onChange }) {
  const toggle = (p) => onChange(value.includes(p) ? value.filter((r) => r !== p) : [...value, p]);
  return (
    <div className="space-y-2">
      {GROUPS.map((g) => {
        const roles = g.positions.filter((p) => OFFERED.includes(p));
        return (
          <div key={g.key} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-24 text-[11px] font-bold uppercase tracking-wider text-subtle">{g.label}</span>
            {roles.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input type="checkbox" checked={value.includes(p)} onChange={() => toggle(p)} />
                {POSITIONS[p].label}
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function DepartmentCard({ dept, onSaved, onError }) {
  const [name, setName] = useState(dept.name);
  const [roles, setRoles] = useState(dept.roles);
  const [busy, setBusy] = useState(false);
  const dirty = name !== dept.name || roles.join("|") !== dept.roles.join("|");

  const save = async () => {
    setBusy(true);
    onError(null);
    try {
      await api.departments.update(dept.name, { name, roles });
      onSaved();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(`Remove the ${dept.name} department?`)) return;
    setBusy(true);
    onError(null);
    try {
      await api.departments.remove(dept.name);
      onSaved();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium" aria-label="Department name" />
        <span className="text-xs text-slate-400">
          {dept.users} {dept.users === 1 ? "user" : "users"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={remove} disabled={busy} className="text-xs text-status-critical hover:underline disabled:opacity-40">
            Remove
          </button>
          <button onClick={save} disabled={busy || !dirty || !name.trim()} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <div className="mt-3">
        <RoleChecks value={roles} onChange={setRoles} />
        {roles.length === 0 && <p className="mt-2 text-xs text-slate-400">No role ticked -- people in this department can have any role.</p>}
      </div>
    </div>
  );
}

export default function DepartmentsPanel() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [roles, setRoles] = useState([]);
  const [adding, setAdding] = useState(false);

  const load = () =>
    api.departments
      .list()
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await api.departments.add({ name, roles });
      setName("");
      setRoles([]);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (items === null) return <div className="text-slate-500">{error || "Loading…"}</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        A person on the Users page gets a department first; the role list then shows only the roles ticked for that department. Add a department here, tick its roles, and it appears on the
        Users page straight away.
      </p>
      {error && <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{error}</div>}

      {items.map((d) => (
        <DepartmentCard key={d.name} dept={d} onSaved={load} onError={setError} />
      ))}

      <form onSubmit={add} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-medium text-slate-800">Add a department</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <button type="submit" disabled={adding || !name.trim()} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">
            {adding ? "Adding…" : "Add department"}
          </button>
        </div>
        <div className="mt-3">
          <RoleChecks value={roles} onChange={setRoles} />
        </div>
      </form>
    </div>
  );
}
