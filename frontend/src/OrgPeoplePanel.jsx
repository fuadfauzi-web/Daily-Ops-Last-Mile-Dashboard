import { useState } from "react";

// People who are on the org chart but have no dashboard access (HOO, HOD, Fleet Strategist, a region's Fleet Manager, Admin & Support interns).
// Only the Fleet Admin role edits them (the chart's can_edit); they come from /api/org-chart (source "org") and are saved through /api/org-people.
const BRANCHES = [["hoo", "HOO"], ["hod", "HOD"], ["strategist", "Fleet Strategist"], ["region_manager", "Fleet Manager of a region"], ["admin_support", "LM Administrator & Support"]];
const REGIONS = ["Klang Valley", "Northern", "Southern", "East Coast", "East Malaysia"];
const empty = { name: "", title: "", email: "", phone: "", employee_id: "", branch: "admin_support", region: "Southern" };

async function call(method, path, body) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    let detail = res.statusText;
    try { const j = await res.json(); detail = Array.isArray(j.detail) ? j.detail.map((d) => d.msg).join("; ") : j.detail || detail; } catch { /* no body */ }
    throw new Error(detail);
  }
  return res.json();
}

export default function OrgPeoplePanel({ chart, onChanged }) {
  const [form, setForm] = useState(null); // null = closed, else the person being added / edited (id set when editing)
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const t = chart.top || {};
  const people = [
    ...(t.hoo || []), ...(t.hod || []), ...(t.strategist || []), ...(t.admin_lead ? [t.admin_lead] : []), ...(t.admin_members || []),
    ...chart.regions.flatMap((r) => r.managers.map((m) => ({ ...m, region: r.name }))),
  ].filter((p) => p.source === "org");

  const edit = (p) => setForm({ id: p.org_id, name: p.name, title: p.title || "", email: p.email || "", phone: p.phone || "", employee_id: p.employee_id || "", branch: p.branch, region: p.region || "Southern" });
  const save = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { id, ...body } = form;
      if (id) await call("PATCH", `/api/org-people/${id}`, body);
      else await call("POST", "/api/org-people", body);
      setForm(null);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (p) => {
    if (!window.confirm(`Take ${p.name} off the org chart?`)) return;
    try { await call("DELETE", `/api/org-people/${p.org_id}`); onChanged(); } catch (err) { setError(err.message); }
  };
  const inp = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm";
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <details className="rounded-lg border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink">People on the chart only <span className="text-xs font-normal text-slate-400">({people.length}) -- no dashboard access: HOO, HOD, Fleet Strategist, a region's Fleet Manager, interns</span></summary>
      <div className="mt-3 space-y-3">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>}
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-400"><tr><th className="py-1 pr-3 font-medium">Name</th><th className="py-1 pr-3 font-medium">Title</th><th className="py-1 pr-3 font-medium">Where on the chart</th><th className="py-1 font-medium"></th></tr></thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.org_id} className="border-t border-slate-100">
                <td className="py-1 pr-3">{p.name}</td>
                <td className="py-1 pr-3 text-slate-500">{p.title}</td>
                <td className="py-1 pr-3 text-slate-500">{BRANCHES.find(([k]) => k === p.branch)?.[1]}{p.region ? ` · ${p.region}` : ""}</td>
                <td className="whitespace-nowrap py-1 text-right">
                  {chart.can_edit && <><button onClick={() => edit(p)} className="mr-3 text-xs text-brand hover:underline">Edit</button><button onClick={() => remove(p)} className="text-xs text-status-critical hover:underline">Remove</button></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {chart.can_edit && !form && <button onClick={() => setForm(empty)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">Add a person to the chart</button>}
        {chart.can_edit && form && (
          <form onSubmit={save} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input required placeholder="Full name" value={form.name} onChange={set("name")} className={inp} />
            <input placeholder="Title shown on the chart" value={form.title} onChange={set("title")} className={inp} />
            <select value={form.branch} onChange={set("branch")} className={inp}>{BRANCHES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            {form.branch === "region_manager" ? <select value={form.region} onChange={set("region")} className={inp}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select> : <span />}
            <input placeholder="Email" value={form.email} onChange={set("email")} className={inp} />
            <input placeholder="Mobile" value={form.phone} onChange={set("phone")} className={inp} />
            <input placeholder="Employee ID" value={form.employee_id} onChange={set("employee_id")} className={inp} />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{form.id ? "Save" : "Add"}</button>
              <button type="button" onClick={() => { setForm(null); setError(null); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
