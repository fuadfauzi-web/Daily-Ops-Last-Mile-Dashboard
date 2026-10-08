import { useMemo, useState } from "react";
import { useEffect } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import { btnCls, Field, inputCls, useScopeFilter } from "./ui";

// Attendance -> Emails (2026-10-10): the emails of every PTWH and Hybrid driver who needs the Ninjavan Shift app, in one place, to copy straight into the Substrait access whitelist
// (only whitelisted emails can open the app on the dev environment). Stations key the emails in (PTWH -> Workers, Hybrid -> Drivers). Superadmin / HOD / Managers only.

export default function EmailsView() {
  const [data, setData] = useState(null);
  const [group, setGroup] = useState("");
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  useEffect(() => { api.attendanceEmails().then(setData).catch((e) => setError(e.message)); }, []);
  const { rows: scoped, controls } = useScopeFilter(data?.rows || []);
  const rows = useMemo(() => scoped.filter((r) => !group || r.group === group), [scoped, group]);
  const emails = useMemo(() => [...new Set(rows.map((r) => r.email).filter(Boolean))], [rows]);
  const missing = rows.filter((r) => !r.email);
  if (error) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>;
  if (!data) return <Skeleton rows={5} />;
  const copy = async (sep, label) => {
    try {
      await navigator.clipboard.writeText(emails.join(sep));
      setNote(`${emails.length} email${emails.length === 1 ? "" : "s"} copied (${label}).`);
    } catch {
      setNote("The browser blocked copying -- select the emails in the box below and copy them.");
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Who">
          <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">PTWH and Hybrid</option><option value="PTWH">PTWH only</option><option value="Hybrid">Hybrid only</option>
          </select>
        </Field>
        {controls}
        <div className="ml-auto flex flex-wrap gap-2">
          <button disabled={!emails.length} onClick={() => copy(", ", "separated by commas")} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Copy {emails.length} emails</button>
          <button disabled={!emails.length} onClick={() => copy("\n", "one per line")} className={`${btnCls} border border-slate-300 text-slate-700 disabled:opacity-50`}>Copy one per line</button>
        </div>
      </div>
      {note && <div className="flex items-start justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200"><span>{note}</span><button onClick={() => setNote(null)} className="text-xs underline">OK</button></div>}
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="max-h-[60vh] overflow-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Group</th><th className="px-3 py-2">Station</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Nobody in this selection.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-xs text-slate-500">{r.group}</td>
                  <td className="px-3 py-1.5 text-slate-600">{r.station}</td>
                  <td className="px-3 py-1.5 font-medium text-ink">{r.name}</td>
                  <td className="px-3 py-1.5 text-xs">{r.email || <span className="text-amber-600">missing -- the station has to key it in</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Ready to paste ({emails.length})</label>
          <textarea readOnly rows={12} value={emails.join(", ")} onFocus={(e) => e.target.select()} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
          <p className="mt-1 text-xs text-slate-500">{data.with_email} of {data.with_email + data.without_email} active people have an email{missing.length ? `; ${missing.length} in this selection still need one` : ""}.</p>
        </div>
      </div>
    </div>
  );
}
