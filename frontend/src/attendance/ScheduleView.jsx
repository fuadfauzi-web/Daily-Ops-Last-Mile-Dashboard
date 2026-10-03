import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";
import { btnCls, Field, inputCls, localDay } from "./ui";

// Attendance -> Schedule (2026-10-03, staging): who works which shift on which day, per station and week, for PTWH, Staff and Hybrid drivers in one place.
// Only Station Heads, Region Heads and Managers / HOD change it; everyone else with the station in their scope can read it. The PTWH app's "My schedule"
// shows each PTWH their next two weeks from here.
// Staff = the people posted at the station in the Staff & Org Chart. PTWH = the station's active (approved) PTWH. Hybrid = drivers typed in by name as a STOPGAP:
// the Hybrid driver list will come from a Fleet Admin tab (like the Staff & Org Chart) that is not built yet; this then reads from there.

const GROUPS = [
  { key: "ptwh", label: "PTWH" },
  { key: "staff", label: "Staff" },
  { key: "hybrid", label: "Hybrid" },
];
const SHIFT_CLS = {
  AM: "bg-indigo-50 text-indigo-800", MD: "bg-teal-50 text-teal-800", HD: "bg-sky-50 text-sky-800", PM: "bg-violet-50 text-violet-800",
  WK: "bg-emerald-50 text-emerald-800", OFF: "bg-slate-100 text-slate-500", AL: "bg-amber-50 text-amber-800",
};
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return localDay(d); };

export default function ScheduleView({ setError }) {
  const [station, setStation] = useState("");
  const [week, setWeek] = useState(localDay());
  const [group, setGroup] = useState("ptwh");
  const [data, setData] = useState(null);
  const [driver, setDriver] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.schedule(station, week).then((d) => { setData(d); if (!station && d.station) setStation(d.station); }).catch((e) => setError(e.message));
  }, [station, week, setError]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Skeleton rows={6} />;
  if (!data.station) return <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">No station in your scope.</div>;

  const shifts = data.shifts[group];
  const people = data.groups[group];
  const monday = data.week_start;
  const thisMonday = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return localDay(d); })();

  const setCell = async (person, date, shift) => {
    const prev = data;
    setData({ ...data, groups: { ...data.groups, [group]: people.map((p) => (p.ref === person.ref ? { ...p, cells: { ...p.cells, [date]: shift || undefined } } : p)) } });
    try {
      await api.scheduleCell({ station: data.station, group, ref: person.ref, date, shift: shift || null });
    } catch (e) {
      setError(e.message);
      setData(prev);
    }
  };
  const copyLast = async () => {
    if (!window.confirm(`Copy last week's ${GROUPS.find((g) => g.key === group).label} schedule onto this week? This replaces what is already here.`)) return;
    setBusy(true);
    try {
      await api.scheduleCopy({ station: data.station, group, from_week: addDays(monday, -7), to_week: monday });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const addDriver = async () => {
    try {
      await api.scheduleAddDriver(data.station, driver);
      setDriver("");
      load();
    } catch (e) {
      setError(e.message);
    }
  };
  const removeDriver = async (name) => {
    if (!window.confirm(`Take ${name} off this station's Hybrid schedule? Their scheduled days are removed.`)) return;
    try {
      await api.scheduleRemoveDriver(data.station, name);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {data.stations.length > 1 && (
          <Field label="Station">
            <select className={inputCls} value={data.station} onChange={(e) => setStation(e.target.value)}>
              {data.stations.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <SegmentedControl options={GROUPS} value={group} onChange={setGroup} />
        <div className="flex items-center gap-1">
          <button onClick={() => setWeek(addDays(monday, -7))} className={`${btnCls} border border-slate-300 text-slate-600`} aria-label="Previous week">‹</button>
          <div className="min-w-[170px] text-center text-sm font-semibold tabular-nums text-ink">
            {data.days[0].date.slice(5).replace("-", "/")} – {data.days[6].date.slice(5).replace("-", "/")}{monday === thisMonday ? " (this week)" : ""}
          </div>
          <button onClick={() => setWeek(addDays(monday, 7))} className={`${btnCls} border border-slate-300 text-slate-600`} aria-label="Next week">›</button>
          {monday !== thisMonday && <button onClick={() => setWeek(localDay())} className="ml-1 text-xs text-slate-500 underline">This week</button>}
        </div>
        {data.can_edit && people.length > 0 && <button disabled={busy} onClick={copyLast} className={`${btnCls} ml-auto border border-slate-300 text-slate-700`}>Copy last week</button>}
      </div>

      {!data.can_edit && (
        <p className="text-xs text-slate-500">You can read the schedule. Only Station Heads, Region Heads and Managers can change it.</p>
      )}

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">{GROUPS.find((g) => g.key === group).label}</th>
              {data.days.map((d) => (
                <th key={d.date} className={`px-2 py-2 text-center font-medium ${d.date === localDay() ? "text-brand" : ""}`}>
                  <div>{d.dow}</div><div className="text-[11px] font-normal">{d.day}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                {group === "ptwh" ? "No active PTWH at this station yet -- add them in PTWH → Workers." : group === "staff" ? "Nobody is posted at this station in the Staff & Org Chart yet." : "No Hybrid drivers on this station's schedule yet. (Until the Fleet Admin team has a Hybrid driver list, drivers are typed in here.)"}
                {group === "hybrid" && data.can_edit ? " Add a driver below." : ""}
              </td></tr>
            )}
            {people.map((p) => (
              <tr key={p.ref} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-ink">
                  {p.name}
                  {group === "hybrid" && data.can_edit && <button onClick={() => removeDriver(p.name)} className="ml-2 text-[11px] font-normal text-slate-400 underline">remove</button>}
                </td>
                {data.days.map((d) => {
                  const v = p.cells[d.date] || "";
                  return (
                    <td key={d.date} className="px-1 py-1 text-center">
                      {data.can_edit ? (
                        <select value={v} onChange={(e) => setCell(p, d.date, e.target.value)} className={`w-[74px] rounded-md border border-transparent px-1 py-1 text-xs font-semibold hover:border-slate-300 ${v ? SHIFT_CLS[v] : "text-slate-300"}`}>
                          <option value="">—</option>
                          {shifts.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                        </select>
                      ) : v ? (
                        <span title={shifts.find((s) => s.code === v)?.hours} className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${SHIFT_CLS[v]}`}>{shifts.find((s) => s.code === v)?.label || v}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {group === "hybrid" && data.can_edit && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Add a Hybrid driver by name (temporary -- the driver list will come from Fleet Admin)">
            <input className={`${inputCls} w-72`} value={driver} onChange={(e) => setDriver(e.target.value)} onKeyDown={(e) => e.key === "Enter" && driver.trim() && addDriver()} />
          </Field>
          <button disabled={driver.trim().length < 2} onClick={addDriver} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Add driver</button>
        </div>
      )}

      <p className="text-xs text-slate-500">
        {group === "ptwh" && " Each PTWH sees their own next two weeks in the PTWH app (My month → My schedule)."}
        {group === "staff" && " Staff come from the Staff & Org Chart (Station Head and Fleet Assistants posted at this station)."}
      </p>
    </div>
  );
}
