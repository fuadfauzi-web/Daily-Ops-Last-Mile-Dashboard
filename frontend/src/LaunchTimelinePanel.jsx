import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Skeleton from "./components/Skeleton";

// Settings -> Launch Timeline (2026-10-04, staging): the Attendance build goes live BY BATCH. A Superadmin / HOD / Manager sets a launch date per region, zone or station;
// the most specific wins (station > zone > region). A station with no date can't see Attendance at all; from the day BEFORE its date it is visible and can test-run.
// Every region / zone / station is listed; a station without its own date shows the one it inherits.

const STATE = {
  off: ["Not open", "bg-slate-100 text-slate-500"],
  test: ["Test run", "bg-amber-100 text-amber-800"],
  live: ["Live", "bg-emerald-100 text-emerald-800"],
};
const SRC = { station: "its own date", zone: "from its zone", region: "from its region" };

function DateBox({ value, inherited, onSave, disabled, label }) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  const changed = v !== (value || "");
  return (
    <span className="inline-flex items-center gap-1">
      <input type="date" aria-label={label} disabled={disabled} value={v} onChange={(e) => setV(e.target.value)}
        className={`rounded-md border px-2 py-1 text-xs tabular-nums disabled:bg-slate-50 ${value ? "border-slate-300 text-ink" : "border-slate-200 text-slate-400"}`} placeholder={inherited || ""} />
      {changed && <button onClick={() => onSave(v || null)} className="rounded-md bg-brand px-2 py-1 text-xs font-semibold text-white">Save</button>}
      {!changed && value && !disabled && <button onClick={() => onSave(null)} className="text-[11px] text-slate-400 underline">clear</button>}
    </span>
  );
}

export default function LaunchTimelinePanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});
  const [q, setQ] = useState("");

  const load = useCallback(() => { api.launchList().then(setData).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const save = async (scope_type, scope_value, date) => {
    setError(null);
    try {
      await api.launchSet({ scope_type, scope_value, date });
      load();
    } catch (e) {
      setError(e.message);
    }
  };
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const counts = useMemo(() => {
    const c = { off: 0, test: 0, live: 0 };
    (data?.regions || []).forEach((r) => r.zones.forEach((z) => z.stations.forEach((s) => { c[s.state] += 1; })));
    return c;
  }, [data]);
  if (!data) return <Skeleton rows={6} />;
  const needle = q.trim().toLowerCase();

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h3 className="font-display text-base font-semibold text-ink">Launch Timeline · Attendance</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Attendance goes live in batches. Set a launch date for a <b>region</b>, a <b>zone</b> or a single <b>station</b> (the most specific date wins). A station with no date <b>can't see Attendance at all</b>.
          From <b>the day before</b> its date the station can see it and test-run it; from the date it is live. The Superadmin, HOD and Managers always see everything.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span>Today <b className="tabular-nums text-ink">{data.today}</b></span>
          {Object.entries(STATE).map(([k, [label, cls]]) => <span key={k} className={`rounded px-1.5 py-0.5 font-semibold ${cls}`}>{label} {counts[k]}</span>)}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a station or zone" className="ml-auto rounded-md border border-slate-300 px-2 py-1 text-sm" />
        </div>
      </div>
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{error}</span><button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">Region / zone / station</th><th className="px-3 py-2">Launch date</th><th className="px-3 py-2">Effective</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Set by</th></tr>
          </thead>
          <tbody>
            {data.regions.map((r) => {
              const regionKey = `r:${r.name}`;
              const stationsOfRegion = r.zones.flatMap((z) => z.stations);
              const matches = (z, s) => !needle || z.name.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle);
              if (needle && !stationsOfRegion.some((s) => matches(r.zones.find((z) => z.stations.includes(s)), s))) return null;
              const rOpen = open[regionKey] || !!needle;
              const rState = stationsOfRegion.reduce((a, s) => ({ ...a, [s.state]: (a[s.state] || 0) + 1 }), {});
              return [
                <tr key={regionKey} className="border-t border-slate-200 bg-slate-50/60">
                  <td className="px-3 py-2 font-semibold text-ink"><button onClick={() => toggle(regionKey)} className="mr-1.5 text-slate-400">{rOpen ? "▾" : "▸"}</button>{r.name} <span className="text-xs font-normal text-slate-400">region · {stationsOfRegion.length} stations</span></td>
                  <td className="px-3 py-2"><DateBox label={`${r.name} launch date`} value={r.date} onSave={(d) => save("region", r.name, d)} /></td>
                  <td className="px-3 py-2 text-xs text-slate-400" colSpan={2}>{Object.entries(rState).map(([k, n]) => `${n} ${STATE[k][0].toLowerCase()}`).join(" · ")}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{r.date ? (r.set_by || "").split("@")[0] : ""}</td>
                </tr>,
                ...(rOpen ? r.zones.flatMap((z) => {
                  const zoneKey = `z:${z.name}`;
                  const zs = z.stations.filter((s) => matches(z, s));
                  if (!zs.length) return [];
                  const zOpen = open[zoneKey] || !!needle;
                  return [
                    <tr key={zoneKey} className="border-t border-slate-100">
                      <td className="py-1.5 pl-9 pr-3 font-medium text-slate-700"><button onClick={() => toggle(zoneKey)} className="mr-1.5 text-slate-400">{zOpen ? "▾" : "▸"}</button>{z.name} <span className="text-xs font-normal text-slate-400">zone · {z.stations.length}</span></td>
                      <td className="px-3 py-1.5"><DateBox label={`${z.name} launch date`} value={z.date} onSave={(d) => save("zone", z.name, d)} /></td>
                      <td colSpan={2} />
                      <td className="px-3 py-1.5 text-xs text-slate-400">{z.date ? (z.set_by || "").split("@")[0] : ""}</td>
                    </tr>,
                    ...(zOpen ? zs.map((s) => (
                      <tr key={`s:${s.name}`} className="border-t border-slate-50">
                        <td className="py-1 pl-16 pr-3 text-slate-700">{s.name}</td>
                        <td className="px-3 py-1"><DateBox label={`${s.name} launch date`} value={s.date} inherited={s.effective} onSave={(d) => save("station", s.name, d)} /></td>
                        <td className="px-3 py-1 text-xs tabular-nums text-slate-600">{s.effective ? <>{s.effective} <span className="text-slate-400">{SRC[s.source]}</span></> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-1"><span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATE[s.state][1]}`}>{STATE[s.state][0]}</span></td>
                        <td className="px-3 py-1 text-xs text-slate-400">{s.date ? (s.set_by || "").split("@")[0] : ""}</td>
                      </tr>
                    )) : []),
                  ];
                }) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        A date set on a region or zone applies to every station in it that has no date of its own. Clear a date to take Attendance away from those stations again. Anything keyed in during the test run (dated before the launch date) is <b>cleared when the station reaches its launch date</b> -- attendance, corrections and photos; the people, drivers and schedule stay. This happens once per station.
      </p>
    </div>
  );
}
