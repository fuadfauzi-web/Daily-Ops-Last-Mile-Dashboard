import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import MultiSelect from "./components/MultiSelect";

// Superadmin -> Access Setting -> Module access (2026-10-08, extended 2026-10-10): which role may open and do what in which module (menu page).
//   No access  the page is hidden and its data refused;   Open only  the page opens and reads, every change is refused;   Open + act  the page works as the role's own permissions allow.
// A scope (the small tag under a cell) cuts the data the role sees in that module down to a region, zones or stations.
// The first row is the role's DEFAULT for every module without a setting of its own: "Open + act" = as today; "No access" turns the role into an allow-list -- only the modules set to
// Open there are reachable (a Restock role that gets the Restock modules and nothing else, without the Action Board). A module is only ever reachable inside what the role's own permissions
// already allow (a page only Managers may open stays so). The Superadmin is never restricted. The check sits in the one place every request passes (backend role_access.py), so the menu and
// direct API calls follow the same settings.
const LEVELS = [
  ["edit", "Open + act"],
  ["view", "Open only"],
  ["none", "No access"],
];
const CELL = {
  edit: "border-slate-200 bg-white text-slate-600",
  view: "border-amber-300 bg-amber-50 text-amber-900 font-semibold",
  none: "border-red-300 bg-red-50 text-red-800 font-semibold",
};

export default function RoleAccessPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);
  const [regions, setRegions] = useState([]);
  const [busy, setBusy] = useState(null);
  const [saved, setSaved] = useState(null);
  const [scopeEdit, setScopeEdit] = useState(null); // { position, module, scope_type, scope_values }

  const load = () =>
    api
      .roleAccess()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.stations().then(setStations).catch(() => {});
    api.regions().then(setRegions).catch(() => {});
  }, []);

  const ruleMap = useMemo(() => new Map((data?.rules || []).map((r) => [`${r.position}|${r.module}`, r])), [data]);
  const defaultOf = (position) => ruleMap.get(`${position}|*`)?.level || "edit";
  const levelOf = (position, module) => ruleMap.get(`${position}|${module}`)?.level || defaultOf(position);

  const put = async (payload) => {
    setBusy(`${payload.position}|${payload.module}`);
    setError(null);
    try {
      await api.roleAccessSave(payload);
      setSaved(`${payload.position}|${payload.module}`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  const setLevel = (position, module, level) => {
    const cur = ruleMap.get(`${position}|${module}`);
    put({ position, module, level, scope_type: module === "*" ? null : cur?.scope_type || null, scope_values: module === "*" ? [] : cur?.scope_values || [] });
  };
  const openScope = (position, module) => {
    const cur = ruleMap.get(`${position}|${module}`);
    setScopeEdit({ position, module, scope_type: cur?.scope_type || "region", scope_values: cur?.scope_values || [] });
  };
  const saveScope = async () => {
    await put({ position: scopeEdit.position, module: scopeEdit.module, level: levelOf(scopeEdit.position, scopeEdit.module), scope_type: scopeEdit.scope_type, scope_values: scopeEdit.scope_values });
    setScopeEdit(null);
  };
  const clearScope = async () => {
    await put({ position: scopeEdit.position, module: scopeEdit.module, level: levelOf(scopeEdit.position, scopeEdit.module), scope_type: null, scope_values: [] });
    setScopeEdit(null);
  };

  if (!data) return <div className="text-slate-500">{error || "Loading…"}</div>;

  const groups = [...new Set(data.modules.map((m) => m.group))];
  const scopeOptions = !scopeEdit
    ? []
    : scopeEdit.scope_type === "station"
      ? stations.map((s) => ({ value: s.station_name, label: `${s.station_name} (${s.zone})` }))
      : scopeEdit.scope_type === "zone"
        ? regions.flatMap((r) => r.zones).sort().map((z) => ({ value: z, label: z }))
        : regions.map((r) => ({ value: r.region, label: r.region }));
  const roleLabel = (k) => data.roles.find((r) => r.key === k)?.label || k;
  const moduleLabel = (k) => data.modules.find((m) => m.id === k)?.label || k;
  const overrides = data.rules.length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Set, per role and module, whether the module is hidden (<strong>No access</strong>), opens read-only (<strong>Open only</strong>) or works fully (<strong>Open + act</strong> -- doing, approving,
        administering, as the role's own permissions allow). The top row is the role's <strong>default</strong> for every module without its own setting: set it to <strong>No access</strong> and tick only the
        modules the role needs. A <strong>scope</strong> (the small tag under a cell) limits the data to a region, zones or stations. You as Superadmin are never restricted. Changes apply within about 30 seconds,
        for the menu and for direct API calls alike.
      </p>
      {error && <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{error}</div>}

      {scopeEdit && (
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-300">
          <div className="font-medium text-slate-800">
            Scope for {roleLabel(scopeEdit.position)} in {moduleLabel(scopeEdit.module)}
          </div>
          <p className="mt-1 text-xs text-slate-500">The role sees data in this module only for the places below (and only where its own access reaches them).</p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <select
              value={scopeEdit.scope_type}
              onChange={(e) => setScopeEdit({ ...scopeEdit, scope_type: e.target.value, scope_values: [] })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              aria-label="Scope type"
            >
              <option value="region">Region(s)</option>
              <option value="zone">Zone(s)</option>
              <option value="station">Station(s)</option>
            </select>
            <div className="w-72">
              <MultiSelect placeholder="Pick…" options={scopeOptions} value={scopeEdit.scope_values} onChange={(v) => setScopeEdit({ ...scopeEdit, scope_values: v })} />
            </div>
            <button onClick={saveScope} disabled={!scopeEdit.scope_values.length || !!busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">
              Save scope
            </button>
            {ruleMap.get(`${scopeEdit.position}|${scopeEdit.module}`)?.scope_type && (
              <button onClick={clearScope} disabled={!!busy} className="text-sm text-status-critical hover:underline">
                Remove scope
              </button>
            )}
            <button onClick={() => setScopeEdit(null)} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-xl bg-white ring-1 ring-slate-200" style={{ maxHeight: "70vh" }}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[210px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">Module</th>
              {data.roles.map((r) => (
                <th key={r.key} className="sticky top-0 z-20 min-w-[104px] border-b border-l border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-600">
                  {r.label}
                  {!r.builtin && <div className="text-[9px] font-semibold uppercase text-sky-700">custom</div>}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 top-[41px] z-30 border-b border-slate-200 bg-amber-50 px-3 py-1.5 text-left text-xs font-semibold text-amber-900">Default for every other module</th>
              {data.roles.map((r) => {
                const key = `${r.key}|*`;
                const level = defaultOf(r.key);
                return (
                  <th key={r.key} className="sticky top-[41px] z-20 border-b border-l border-slate-200 bg-amber-50 px-1.5 py-1.5">
                    <select
                      value={level}
                      disabled={busy === key}
                      onChange={(e) => setLevel(r.key, "*", e.target.value)}
                      aria-label={`${r.label}: default for every other module`}
                      className={`w-full rounded-md border px-1 py-1 text-xs ${CELL[level]} ${saved === key && busy !== key ? "ring-1 ring-status-good" : ""}`}
                    >
                      {LEVELS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <GroupRows key={g} group={g} modules={data.modules.filter((m) => m.group === g)} roles={data.roles} ruleMap={ruleMap} levelOf={levelOf} busy={busy} saved={saved} onLevel={setLevel} onScope={openScope} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        {overrides ? `${overrides} setting${overrides === 1 ? "" : "s"} differ from the default.` : "Nothing differs from the default yet -- every role works as before."} Amber = open only, red = no access, a tag under a cell = it
        has a scope.
      </p>
    </div>
  );
}

function GroupRows({ group, modules, roles, ruleMap, levelOf, busy, saved, onLevel, onScope }) {
  return (
    <>
      <tr>
        <td colSpan={roles.length + 1} className="sticky left-0 border-b border-slate-100 bg-canvas px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-subtle">
          {group}
        </td>
      </tr>
      {modules.map((m) => (
        <tr key={m.id}>
          <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-1.5 text-slate-800">
            {m.label}
            {m.beta && <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-800">Beta</span>}
          </td>
          {roles.map((r) => {
            const rule = ruleMap.get(`${r.key}|${m.id}`);
            const level = levelOf(r.key, m.id);
            const key = `${r.key}|${m.id}`;
            return (
              <td key={r.key} className="border-b border-l border-slate-100 px-1.5 py-1 text-center align-top">
                <select
                  value={level}
                  disabled={busy === key}
                  onChange={(e) => onLevel(r.key, m.id, e.target.value)}
                  aria-label={`${r.label}: ${m.label}`}
                  className={`w-full rounded-md border px-1 py-1 text-xs ${CELL[level]} ${saved === key && busy !== key ? "ring-1 ring-status-good" : ""}`}
                >
                  {LEVELS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                {level !== "none" && (
                  <button
                    onClick={() => onScope(r.key, m.id)}
                    className={`mt-0.5 block w-full truncate text-[10px] ${rule?.scope_type ? "font-semibold text-sky-700" : "text-slate-300 hover:text-slate-500"}`}
                    title={rule?.scope_type ? `${rule.scope_type}: ${rule.scope_values.join(", ")}` : "Limit this role to some places"}
                  >
                    {rule?.scope_type ? `${rule.scope_type}: ${rule.scope_values.length}` : "scope"}
                  </button>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
