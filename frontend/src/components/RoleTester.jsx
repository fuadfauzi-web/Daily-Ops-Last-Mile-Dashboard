import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import MultiSelect from "./MultiSelect";

// Lets the real admin preview a different role/scope's view -- without
// changing their own account -- to check a permission or scoping change
// actually works for that role. Lives in the header (not Settings) and is
// keyed off me.real_role, not me.role, so it stays reachable even while
// currently viewing as a non-admin role that can't see Settings itself
// (2026-09-24 feedback).
const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "region", label: "Region staff" },
  { value: "station", label: "Station staff" },
];

export default function RoleTester({ me, onChanged }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("station");
  const [scopeType, setScopeType] = useState("station");
  const [scopeValues, setScopeValues] = useState([]);
  const [regions, setRegions] = useState([]);
  const [stations, setStations] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    api.regions().then(setRegions).catch(() => {});
    api.stations().then(setStations).catch(() => {});
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const scopeOptions = useMemo(() => {
    if (scopeType === "region") return regions.map((r) => ({ value: r.region, label: r.region }));
    if (scopeType === "zone") return regions.flatMap((r) => r.zones).map((z) => ({ value: z, label: z }));
    if (scopeType === "station") return stations.map((s) => ({ value: s.station_name, label: s.station_name }));
    return [];
  }, [scopeType, regions, stations]);

  // Only Admin is always nationwide -- Manager/Region/Station can each be
  // scoped to a region/zone/station like any other role (2026-09-24 feedback:
  // Role Tester wrongly assumed Manager was always "all").
  const apply = () => {
    api.viewAs.set({
      role,
      scopeType: role === "admin" ? "all" : scopeType,
      scopeValues: role === "admin" ? [] : scopeValues,
    });
    setOpen(false);
    onChanged();
  };

  const exit = () => {
    api.viewAs.set(null);
    onChanged();
  };

  if (me.real_role !== "admin") return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-lg border px-3 py-1.5 font-display text-[11px] font-semibold ${
          me.is_impersonating ? "border-status-warning bg-status-warning/10 text-status-warning" : "border-slate-300 text-slate-600"
        }`}
      >
        {me.is_impersonating ? `Viewing as ${me.role}` : "Role Tester"}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 text-xs font-semibold text-slate-700">Preview the app as another role</div>
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

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={apply}
              disabled={role !== "admin" && scopeType !== "all" && scopeValues.length === 0}
              className="flex-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              View as this
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
