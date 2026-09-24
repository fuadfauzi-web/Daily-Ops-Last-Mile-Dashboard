import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import MultiSelect from "./MultiSelect";

// Lets the real admin preview the app as somebody else -- without changing their
// own account -- to check a permission or scoping change actually works, or to
// test a per-person feature end to end. Two modes (2026-09-25):
//   * Role: any role + region/zone/station scope, still signed in as yourself.
//   * User: act as one specific user from the user list -- their email, role and
//     scope -- so things tied to a person (an Urgent TN assigned to them, their
//     notifications, their feedback) show up exactly as they would for them.
// Lives in the header (not Settings) and is keyed off me.real_role, not me.role,
// so it stays reachable even while viewing as a role that can't see Settings
// itself (2026-09-24 feedback).
const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "region", label: "Region staff" },
  { value: "station", label: "Station staff" },
];

export default function RoleTester({ me, onChanged }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("role");
  const [role, setRole] = useState("station");
  const [scopeType, setScopeType] = useState("station");
  const [scopeValues, setScopeValues] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [regions, setRegions] = useState([]);
  const [stations, setStations] = useState([]);
  const [users, setUsers] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    // noViewAs: these pickers must list everything even while a View As is active.
    api.regions({ noViewAs: true }).then(setRegions).catch(() => {});
    api.stations({ noViewAs: true }).then(setStations).catch(() => {});
    api.users.list({ noViewAs: true }).then(setUsers).catch(() => {});
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const scopeOptions = useMemo(() => {
    if (scopeType === "region") return regions.map((r) => ({ value: r.region, label: r.region }));
    if (scopeType === "zone") return regions.flatMap((r) => r.zones).map((z) => ({ value: z, label: z }));
    // Station scope values are station NAMES everywhere else (users.scope_values,
    // _scope_filter_stations) -- not station codes.
    if (scopeType === "station") return stations.map((s) => ({ value: s.station_name, label: s.station_name }));
    return [];
  }, [scopeType, regions, stations]);

  const viewingAs = api.viewAs.get();
  const viewingLabel = viewingAs?.email ? me.display_name || me.email : me.role;

  // Only Admin is always nationwide -- Manager/Region/Station can each be
  // scoped to a region/zone/station like any other role (2026-09-24 feedback:
  // Role Tester wrongly assumed Manager was always "all").
  const apply = () => {
    if (mode === "user") {
      api.viewAs.set({ email: userEmail });
    } else {
      api.viewAs.set({
        role,
        scopeType: role === "admin" ? "all" : scopeType,
        scopeValues: role === "admin" ? [] : scopeValues,
      });
    }
    setOpen(false);
    onChanged();
  };

  const exit = () => {
    api.viewAs.set(null);
    onChanged();
  };

  if (me.real_role !== "admin") return null;

  const canApply = mode === "user" ? !!userEmail : role === "admin" || scopeType === "all" || scopeValues.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-lg border px-3 py-1.5 font-display text-[11px] font-semibold ${
          me.is_impersonating ? "border-status-warning bg-status-warning/10 text-status-warning" : "border-slate-300 text-slate-600"
        }`}
      >
        {me.is_impersonating ? `Viewing as ${viewingLabel}` : "Role Tester"}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
            {[
              { key: "role", label: "As a role" },
              { key: "user", label: "As a specific user" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex-1 px-2 py-1.5 ${mode === m.key ? "bg-ink text-white" : "text-slate-500"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "user" ? (
            <>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">User</label>
              <select
                className="mb-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              >
                <option value="">Pick a user…</option>
                {[...users]
                  .sort((a, b) => a.email.localeCompare(b.email))
                  .map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.email} — {u.role}
                      {u.scope_type !== "all" ? ` · ${(u.scope_values || []).join(", ")}` : ""}
                    </option>
                  ))}
              </select>
              <p className="mb-2 text-[10px] text-slate-400">
                You'll see and act as that user: their access, their Urgent TN list, notifications and feedback. Change
                their access level in Settings → Users first (exit this view to get there).
              </p>
            </>
          ) : (
            <>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Role</label>
              <select
                className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setScopeValues([]);
                }}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              {role !== "admin" && (
                <>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Scope</label>
                  <select
                    className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    value={scopeType}
                    onChange={(e) => {
                      setScopeType(e.target.value);
                      setScopeValues([]);
                    }}
                  >
                    <option value="all">All (nationwide)</option>
                    <option value="region">Region</option>
                    <option value="zone">Zone</option>
                    <option value="station">Station</option>
                  </select>
                  {scopeType !== "all" && (
                    <div className="mb-2">
                      <MultiSelect
                        options={scopeOptions}
                        value={scopeValues}
                        onChange={setScopeValues}
                        placeholder={`Pick ${scopeType}(s)…`}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={apply}
              disabled={!canApply}
              className="flex-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {mode === "user" ? "View as this user" : "View as this"}
            </button>
            {me.is_impersonating && (
              <button onClick={exit} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600">
                Exit
              </button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Your own account isn't changed -- this only affects what you see while it's active, and only in this
            browser tab.
          </p>
        </div>
      )}
    </div>
  );
}
