import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

// Headcount (2026-10-02, staging): a station's headcount = the people posted there (Staff & Org Chart) + its TBA seats -- planned seats, or
// people whose email isn't known yet. Management View -> Capacity reads the same numbers. The HOD adds a seat straight away; a Manager's new
// seat waits for the HOD to approve it; a Manager or the HOD removes a seat with no approval. Removing a PERSON is the Fleet Admin team's job.
const DESIGNATIONS = [["fleet_assistant", "Fleet Assistant"], ["station_head", "Station Head"]];

export default function HeadcountView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [form, setForm] = useState({ station: "", designation: "fleet_assistant", note: "" });
  const [notice, setNotice] = useState(null);

  const load = () => api.headcount.get().then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const act = async (fn, okMessage) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await fn();
      if (okMessage) setNotice(okMessage);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const seatsByStation = useMemo(() => {
    const m = {};
    for (const s of data?.seats || []) (m[s.station] ||= []).push(s);
    return m;
  }, [data]);

  const regions = useMemo(() => [...new Set((data?.stations || []).map((s) => s.region))].sort(), [data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.stations || [])
      .filter((s) => region === "all" || s.region === region)
      .filter((s) => !q || `${s.name} ${s.zone} ${s.region}`.toLowerCase().includes(q));
  }, [data, search, region]);

  if (error && !data) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>;
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>;

  const totals = data.stations.reduce((a, s) => ({ filled: a.filled + s.filled, tba: a.tba + s.tba, pending: a.pending + s.pending }), { filled: 0, tba: 0, pending: 0 });
  const pending = data.seats.filter((s) => s.status === "pending");

  const submit = (e) => {
    e.preventDefault();
    if (!form.station) return setError("Pick a station");
    act(async () => {
      const r = await api.headcount.add({ station: form.station, designation: form.designation, note: form.note });
      setForm({ ...form, note: "" });
      setNotice(r.status === "pending" ? "Sent to the HOD for approval. It counts once approved." : "Headcount added.");
    });
  };

  const input = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2"><div className="text-xs text-slate-400">Headcount</div><div className="text-lg font-semibold tabular-nums">{totals.filled + totals.tba}</div></div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2"><div className="text-xs text-slate-400">People in the list</div><div className="text-lg font-semibold tabular-nums">{totals.filled}</div></div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2"><div className="text-xs text-slate-400">TBA seats</div><div className="text-lg font-semibold tabular-nums">{totals.tba}</div></div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2"><div className="text-xs text-slate-400">Waiting for the HOD</div><div className="text-lg font-semibold tabular-nums">{totals.pending}</div></div>
      </div>
      <p className="text-xs text-slate-500">
        A station's headcount is the people posted there plus its TBA seats (planned, or someone whose email isn't known yet). Management View → Capacity uses these numbers.
        When a real person is added to a station, one matching TBA seat there is used up.
      </p>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>}
      {notice && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}

      {data.can_change && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
          <select value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} className={input}>
            <option value="">Station…</option>
            {data.stations.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.zone})</option>)}
          </select>
          <select value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className={input}>
            {DESIGNATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Note (e.g. new hire, TBA)" maxLength={200} className={`${input} lg:col-span-2`} />
          <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {data.needs_approval ? "Request headcount" : "Add headcount"}
          </button>
          {data.needs_approval && <p className="text-xs text-slate-400 sm:col-span-2 lg:col-span-5">As a Manager, headcount you add waits for the HOD's approval. Removing a seat needs no approval.</p>}
        </form>
      )}

      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">Waiting for the HOD</div>
          <ul className="space-y-1 text-sm">
            {pending.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3">
                <span><strong>{s.station}</strong> · {s.label}{s.note ? ` · ${s.note}` : ""} <span className="text-xs text-slate-500">requested by {s.requested_by}</span></span>
                {data.can_approve && (
                  <span className="flex gap-2">
                    <button disabled={busy} onClick={() => act(() => api.headcount.approve(s.id))} className="text-xs font-medium text-emerald-700 hover:underline">Approve</button>
                    <button disabled={busy} onClick={() => act(() => api.headcount.reject(s.id))} className="text-xs font-medium text-status-critical hover:underline">Reject</button>
                  </span>
                )}
                {!data.can_approve && data.can_change && (
                  <button disabled={busy} onClick={() => act(() => api.headcount.remove(s.id))} className="text-xs text-slate-500 hover:underline">Cancel</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a station, zone or region…" className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
          <option value="all">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-slate-400">{rows.length} of {data.stations.length} stations</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Station</th>
              <th className="px-3 py-2 font-medium">Zone</th>
              <th className="px-3 py-2 text-right font-medium">People</th>
              <th className="px-3 py-2 font-medium">TBA seats</th>
              <th className="px-3 py-2 text-right font-medium">Headcount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.name} className="border-t border-slate-100 align-top">
                <td className="px-3 py-1.5">{s.name}</td>
                <td className="px-3 py-1.5 text-slate-500">{s.zone}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{s.filled}</td>
                <td className="px-3 py-1.5">
                  {(seatsByStation[s.name] || []).map((seat) => (
                    <span key={seat.id} title={seat.note || ""} className={`mr-1.5 inline-flex items-center gap-1 rounded border border-dashed px-2 py-0.5 text-xs ${seat.status === "pending" ? "border-amber-400 text-amber-800" : "border-slate-400 text-slate-600"}`}>
                      {seat.label}{seat.status === "pending" ? " (pending)" : ""}
                      {data.can_change && (
                        <button disabled={busy} onClick={() => act(() => api.headcount.remove(seat.id))} aria-label="Remove this seat" className="text-status-critical hover:underline">×</button>
                      )}
                    </span>
                  ))}
                </td>
                <td className="px-3 py-1.5 text-right font-medium tabular-nums">{s.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
