import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const emptyForm = { email: "", role: "station", scope_type: "station", scope_value: "" };
const ROLE_LABELS = { station: "Station staff", region: "Region staff", manager: "Manager", admin: "Admin" };
const ROLE_OPTION_ORDER = ["station", "region", "manager", "admin"];
const SCOPE_LABELS = { station: "Sees: one station", zone: "Sees: one zone", region: "Sees: one region", all: "Sees: everything" };
const SCOPE_OPTION_ORDER = ["station", "zone", "region", "all"];

// What each acting role is allowed to hand out -- mirrors backend/main.py's
// _validate_grant_limits exactly, so the dropdowns/template never offer
// something the server would reject.
function allowedRoles(actingRole) {
  if (actingRole === "manager") return ["station", "region"];
  if (actingRole === "region") return ["station"];
  return ROLE_OPTION_ORDER; // admin
}
function allowedScopeTypes(actingRole) {
  if (actingRole === "manager") return ["station", "zone", "region"];
  if (actingRole === "region") return ["station"];
  return SCOPE_OPTION_ORDER; // admin
}

function bulkTemplateFor(actingRole) {
  const lines = ["email,role,scope_type,scope_value"];
  if (actingRole === "region") {
    lines.push("name1@ninjavan.co,station,station,Larkin", "name2@ninjavan.co,station,station,Segambut");
  } else if (actingRole === "manager") {
    lines.push("name1@ninjavan.co,station,station,Larkin", "name2@ninjavan.co,region,region,Southern");
  } else {
    lines.push(
      "name1@ninjavan.co,station,station,Larkin",
      "name2@ninjavan.co,region,region,Southern",
      "name3@ninjavan.co,manager,zone,South 1",
      "name4@ninjavan.co,admin,all,"
    );
  }
  return lines.join("\n");
}

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTime(iso) {
  if (!iso) return "Never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

// Each line: email,role,scope_type,scope_value -- a leading header line is
// skipped so pasting the template as-is (with or without editing it) works.
function parseBulkRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^email\s*,\s*role\s*,\s*scope_type/i.test(l));
  return lines.map((line) => {
    const [email, role, scope_type, scope_value] = line.split(",").map((p) => (p ?? "").trim());
    return {
      email,
      role: role || "station",
      scope_type: scope_type || "station",
      scope_value: !scope_type || scope_type === "all" ? null : scope_value || null,
    };
  });
}

export default function AdminPanel({ me }) {
  const isFullAdmin = me.role === "admin";
  const myAllowedRoles = useMemo(() => allowedRoles(me.role), [me.role]);
  const myAllowedScopeTypes = useMemo(() => allowedScopeTypes(me.role), [me.role]);

  const [users, setUsers] = useState(null);
  const [stations, setStations] = useState([]);
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, role: myAllowedRoles[0], scope_type: myAllowedScopeTypes[0] });
  const [editingEmail, setEditingEmail] = useState(null);
  const [error, setError] = useState(null);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addMode, setAddMode] = useState("one"); // "one" | "bulk"
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkFileName, setBulkFileName] = useState(null);

  const loadUsers = () => api.users.list().then(setUsers).catch((e) => setError(e.message));
  const loadRefreshStatus = () => api.refresh.status().then(setRefreshStatus).catch(() => {});

  useEffect(() => {
    api.stations().then(setStations).catch(() => {});
    api.regions().then(setRegions).catch(() => {});
    if (isFullAdmin) {
      loadUsers();
      loadRefreshStatus();
    }
  }, [isFullAdmin]);

  const allZones = useMemo(() => regions.flatMap((r) => r.zones).sort(), [regions]);

  const startEdit = (u) => {
    setEditingEmail(u.email);
    setForm({ email: u.email, role: u.role, scope_type: u.scope_type, scope_value: u.scope_value || "" });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingEmail(null);
    setForm(emptyForm);
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form, scope_value: form.scope_type === "all" ? null : form.scope_value };
      if (editingEmail) {
        await api.users.update(editingEmail, payload);
        setEditingEmail(null);
      } else {
        await api.users.add(payload);
      }
      setForm(emptyForm);
      if (isFullAdmin) loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const runBulkAdd = async (rows) => {
    setError(null);
    setBulkResult(null);
    if (!rows.length) {
      setError("No rows to add — check the file/text has at least one email,role,scope_type,scope_value line.");
      return;
    }
    try {
      const result = await api.users.bulkAdd({ users: rows });
      setBulkResult(result);
      setBulkText("");
      setBulkFileName(null);
      if (isFullAdmin) loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const bulkSubmit = async (e) => {
    e.preventDefault();
    await runBulkAdd(parseBulkRows(bulkText));
  };

  const bulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setError('Please upload a .csv file — in Excel, use "Save As → CSV UTF-8 (.csv)" after editing the template.');
      return;
    }
    const text = await file.text();
    await runBulkAdd(parseBulkRows(text));
    e.target.value = "";
  };

  const remove = async (email) => {
    if (!confirm(`Remove access for ${email}?`)) return;
    try {
      await api.users.remove(email);
      if (editingEmail === email) cancelEdit();
      loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const status = await api.refresh.trigger();
      setRefreshStatus(status);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-status-critical ring-1 ring-red-200">
          {error}
        </div>
      )}

      {!isFullAdmin && (
        <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          You can add teammates here. Viewing/editing the full team list and triggering a data refresh are
          admin-only.
        </div>
      )}

      {isFullAdmin && (
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800">Data refresh</div>
              {refreshStatus ? (
                <div className="mt-1 text-sm text-slate-500">
                  Last: {refreshStatus.status}
                  {refreshStatus.stations_count != null && ` · ${refreshStatus.stations_count} stations`}
                  {refreshStatus.error_message && ` · ${refreshStatus.error_message}`}
                  {" · "}
                  {refreshStatus.triggered_by || "scheduler"}
                </div>
              ) : (
                <div className="mt-1 text-sm text-slate-500">No refresh has run yet.</div>
              )}
            </div>
            <button
              onClick={doRefresh}
              disabled={refreshing}
              className="rounded-lg bg-series1 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh now"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Runs automatically every 30 minutes, and now asks Redash to re-run each query first (best-effort — if
            the API key can't trigger that, it falls back to whatever Redash last computed on its own).
          </p>
        </div>
      )}

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <div className="font-medium text-slate-800">{editingEmail ? `Edit access — ${editingEmail}` : "Add teammate"}</div>
          {editingEmail ? (
            <button onClick={cancelEdit} className="text-xs text-slate-500 hover:underline">
              Cancel edit
            </button>
          ) : (
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              <button
                onClick={() => setAddMode("one")}
                className={`rounded px-2 py-1 font-medium ${addMode === "one" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                Add one
              </button>
              <button
                onClick={() => setAddMode("bulk")}
                className={`rounded px-2 py-1 font-medium ${addMode === "bulk" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                Bulk add
              </button>
            </div>
          )}
        </div>

        {(editingEmail || addMode === "one") && (
          <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              required
              type="email"
              disabled={!!editingEmail}
              placeholder="name@ninjavan.co"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {myAllowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              value={form.scope_type}
              onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_value: "" })}
            >
              {myAllowedScopeTypes.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </option>
              ))}
            </select>
            {form.scope_type === "station" && (
              <select
                required
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                value={form.scope_value}
                onChange={(e) => setForm({ ...form, scope_value: e.target.value })}
              >
                <option value="">Pick a station…</option>
                {stations.map((s) => (
                  <option key={s.station_code} value={s.station_name}>
                    {s.station_name} ({s.zone})
                  </option>
                ))}
              </select>
            )}
            {form.scope_type === "zone" && (
              <select
                required
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                value={form.scope_value}
                onChange={(e) => setForm({ ...form, scope_value: e.target.value })}
              >
                <option value="">Pick a zone…</option>
                {allZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            )}
            {form.scope_type === "region" && (
              <select
                required
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                value={form.scope_value}
                onChange={(e) => setForm({ ...form, scope_value: e.target.value })}
              >
                <option value="">Pick a region…</option>
                {regions.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.region}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              className="rounded-lg bg-series1 px-4 py-1.5 text-sm font-medium text-white sm:col-span-2 lg:col-span-1"
            >
              {editingEmail ? "Save changes" : "Add"}
            </button>
          </form>
        )}

        {!editingEmail && addMode === "bulk" && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
              <button
                type="button"
                onClick={() => downloadCsv("bulk-add-template.csv", bulkTemplateFor(me.role))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Download template (.csv)
              </button>
              <label className="rounded-lg bg-series1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 cursor-pointer">
                Upload filled-in CSV
                <input type="file" accept=".csv" onChange={bulkFileChange} className="hidden" />
              </label>
              {bulkFileName && <span className="text-xs text-slate-500">{bulkFileName}</span>}
              <span className="text-xs text-slate-400">
                Columns: email, role, scope_type, scope_value. Edit the downloaded file in Excel/Sheets, then
                upload it back (Save As → CSV if your editor changes the format).
              </span>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Or paste rows directly</summary>
              <form onSubmit={bulkSubmit} className="mt-2 space-y-2">
                <textarea
                  rows={5}
                  placeholder={bulkTemplateFor(me.role)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <button type="submit" className="rounded-lg bg-series1 px-4 py-1.5 text-sm font-medium text-white">
                  Add all
                </button>
              </form>
            </details>

            <p className="text-xs text-slate-400">
              {me.role === "region"
                ? "You can only grant the Station staff role with station-level access."
                : me.role === "manager"
                  ? "You can grant Station staff or Region staff roles, with any access level except \"sees everything\"."
                  : "role: station, region, manager, or admin. scope_type: station, zone, region, or all (leave scope_value blank for \"all\")."}
            </p>

            {bulkResult && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-status-good">{bulkResult.added.length} added</span>
                {bulkResult.added.length > 0 && `: ${bulkResult.added.join(", ")}`}
                {bulkResult.skipped.length > 0 && <> · Already set up (skipped): {bulkResult.skipped.join(", ")}</>}
                {bulkResult.errors.length > 0 && (
                  <div className="mt-1 font-semibold text-status-critical">
                    {bulkResult.errors.length} error{bulkResult.errors.length === 1 ? "" : "s"}: {bulkResult.errors.join("; ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isFullAdmin && (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Scope</th>
                <th className="px-4 py-2 font-medium">Last opened</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u) => (
                <tr key={u.email} className={`border-t border-slate-100 ${editingEmail === u.email ? "bg-blue-50/50" : ""}`}>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {u.scope_type === "all" ? "Everything" : `${u.scope_value} (${u.scope_type})`}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatTime(u.last_seen_at)}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => startEdit(u)} className="mr-3 text-xs text-series1 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => remove(u.email)} className="text-xs text-status-critical hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
