import { useEffect, useState } from "react";
import { api } from "./api";

const SUB_REGIONS = ["South 1", "South 2", "South 3", "South 4"];

const emptyForm = { email: "", role: "station", scope_type: "station", scope_value: "", display_name: "" };

export default function AdminPanel() {
  const [users, setUsers] = useState(null);
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = () => api.users.list().then(setUsers).catch((e) => setError(e.message));
  const loadRefreshStatus = () => api.refresh.status().then(setRefreshStatus).catch(() => {});

  useEffect(() => {
    loadUsers();
    api.stations().then(setStations).catch(() => {});
    loadRefreshStatus();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form, scope_value: form.scope_type === "all" ? null : form.scope_value };
      await api.users.add(payload);
      setForm(emptyForm);
      loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (email) => {
    if (!confirm(`Remove access for ${email}?`)) return;
    try {
      await api.users.remove(email);
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
          Runs automatically every hour. Use this to pull fresh data on demand.
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-medium text-slate-800">Add teammate</div>
        <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            required
            type="email"
            placeholder="name@ninjavan.co"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Display name (optional)"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="station">Station staff</option>
            <option value="manager">Sub-region manager</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={form.scope_type}
            onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_value: "" })}
          >
            <option value="station">Sees: one station</option>
            <option value="sub_region">Sees: one sub-region</option>
            <option value="all">Sees: everything</option>
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
                  {s.station_name} ({s.sub_region})
                </option>
              ))}
            </select>
          )}
          {form.scope_type === "sub_region" && (
            <select
              required
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              value={form.scope_value}
              onChange={(e) => setForm({ ...form, scope_value: e.target.value })}
            >
              <option value="">Pick a sub-region…</option>
              {SUB_REGIONS.map((sr) => (
                <option key={sr} value={sr}>
                  {sr}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="rounded-lg bg-series1 px-4 py-1.5 text-sm font-medium text-white sm:col-span-2 lg:col-span-1"
          >
            Add
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Scope</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.email} className="border-t border-slate-100">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 text-slate-500">{u.display_name || "—"}</td>
                <td className="px-4 py-2 capitalize">{u.role}</td>
                <td className="px-4 py-2 text-slate-500">
                  {u.scope_type === "all" ? "Everything" : u.scope_value}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => remove(u.email)} className="text-xs text-status-critical hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
