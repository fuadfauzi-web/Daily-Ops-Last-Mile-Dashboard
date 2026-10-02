import { useMemo, useState } from "react";
import { api } from "../api";
import DataTable from "../components/DataTable";
import SegmentedControl from "../components/SegmentedControl";
import { CardRow, Section, StatCard, SubHead, dayLabel, dec1, int, isWeekend, pct, sum, weekLabel, weekStartOf } from "./shared";

// Capacity (2026-10-02): Staff + Hub Size from the uploaded Fleet Management workbook; PTWH and a parcel-capacity override are keyed
// in here by a manager (they change with the roster / the hub, there's no feed for them); driver/rider attendance by weekday vs
// weekend, per day or per week, from the DoD daily snapshots.

const LEVELS = [
  { key: "region", label: "Region" },
  { key: "zone", label: "Zone" },
  { key: "station", label: "Station" },
];
const TIMES = [
  { key: "dow", label: "Weekday vs weekend" },
  { key: "date", label: "By date" },
  { key: "week", label: "By week" },
];
const groupOf = (level, r) =>
  level === "region" ? { key: r.region, name: r.region } : level === "zone" ? { key: r.zone, name: r.zone } : { key: r.station_code, name: r.station_name };

export default function CapacityView({ capacity, dod, me, reload, setError }) {
  const rows = capacity.rows;
  const density = capacity.parcels_per_sqft;
  const [level, setLevel] = useState("region");
  const [time, setTime] = useState("dow");
  const [draft, setDraft] = useState({});
  const [densityDraft, setDensityDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const canUpload = me.role === "admin";

  const latestDay = dod.days[dod.days.length - 1];
  const inHubNow = useMemo(() => {
    const m = {};
    dod.rows.filter((r) => r.day === latestDay).forEach((r) => (m[r.station_code] = r.metrics.total_in_hub || 0));
    return m;
  }, [dod.rows, latestDay]);

  const eff = (r) => r.parcel_capacity ?? (r.sqft && density ? Math.round(r.sqft * density) : null);
  const tableRows = rows.map((r) => {
    const cap = eff(r);
    return { ...r, capacity_eff: cap, in_hub: inHubNow[r.station_code] ?? null, util: cap && inHubNow[r.station_code] != null ? pct(inHubNow[r.station_code], cap) : null };
  });
  const totalCap = sum(tableRows.filter((r) => r.capacity_eff), "capacity_eff");
  const withBoth = tableRows.filter((r) => r.capacity_eff && r.in_hub != null);
  const capHubsInHub = sum(withBoth, "in_hub");
  const capHubsCap = sum(withBoth, "capacity_eff");

  // ---- attendance by weekday / weekend, per day or per week, grouped by region / zone / station
  const days = dod.days;
  const weeks = [...new Set(days.map(weekStartOf))];
  const attendance = useMemo(() => {
    const groups = new Map();
    dod.rows.forEach((r) => {
      const g = groupOf(level, r);
      let e = groups.get(g.key);
      if (!e) {
        e = { key: g.key, name: g.name, byDay: {} };
        groups.set(g.key, e);
      }
      e.byDay[r.day] = (e.byDay[r.day] || 0) + (r.metrics.attendance || 0);
    });
    const capByGroup = {};
    rows.forEach((r) => {
      const g = groupOf(level, r);
      const c = (capByGroup[g.key] ||= { staff: 0, ptwh: 0 });
      c.staff += r.staff_count || 0;
      c.ptwh += r.ptwh_count || 0;
    });
    return [...groups.values()].map((e) => {
      const wd = days.filter((d) => !isWeekend(d) && e.byDay[d] != null).map((d) => e.byDay[d]);
      const we = days.filter((d) => isWeekend(d) && e.byDay[d] != null).map((d) => e.byDay[d]);
      const avg = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);
      const byWeek = {};
      days.forEach((d) => (byWeek[weekStartOf(d)] = (byWeek[weekStartOf(d)] || 0) + (e.byDay[d] || 0)));
      return { ...e, byWeek, wdAvg: avg(wd), weAvg: avg(we), wdDays: wd.length, weDays: we.length, ...(capByGroup[e.key] || { staff: 0, ptwh: 0 }) };
    }).sort((a, b) => b.wdAvg - a.wdAvg);
  }, [dod.rows, level, days, rows]);

  const allWd = days.filter((d) => !isWeekend(d)), allWe = days.filter((d) => isWeekend(d));
  const dayTotal = (d) => sum(dod.rows.filter((r) => r.day === d).map((r) => ({ v: r.metrics.attendance || 0 })), "v");
  const avgOf = (ds) => (ds.length ? ds.reduce((a, d) => a + dayTotal(d), 0) / ds.length : 0);

  const attendanceColumns = [
    { key: "name", label: level === "station" ? "Station" : level === "zone" ? "Zone" : "Region", align: "left", sticky: true },
    ...(time === "dow"
      ? [
          { key: "wdAvg", label: "Weekday avg / day", render: (r) => int(r.wdAvg) },
          { key: "weAvg", label: "Weekend avg / day", render: (r) => int(r.weAvg) },
          { key: "diff", label: "Weekend vs weekday", sortable: false, render: (r) => (r.wdAvg ? `${dec1(pct(r.weAvg, r.wdAvg))}%` : "—") },
        ]
      : time === "date"
      ? days.map((d) => ({ key: `d${d}`, label: dayLabel(d), sortable: false, render: (r) => (r.byDay[d] == null ? "—" : int(r.byDay[d])) }))
      : weeks.map((w) => ({ key: `w${w}`, label: weekLabel(w), sortable: false, render: (r) => int(r.byWeek[w]) }))),
    { key: "staff", label: "Staff", render: (r) => int(r.staff) },
    { key: "ptwh", label: "PTWH", render: (r) => int(r.ptwh) },
  ];

  // ---- editing PTWH / parcel capacity
  const val = (code, field, row) => (draft[code]?.[field] !== undefined ? draft[code][field] : row[field] ?? "");
  const setVal = (code, field, v) => setDraft((d) => ({ ...d, [code]: { ...d[code], [field]: v } }));
  const dirty = Object.keys(draft).length > 0 || densityDraft !== null;
  const save = async () => {
    setSaving(true);
    try {
      const byCode = Object.fromEntries(rows.map((r) => [r.station_code, r]));
      const toNum = (v) => (v === "" || v == null ? null : Math.max(0, Math.round(Number(v))));
      const edits = Object.entries(draft).map(([code, d]) => ({
        station_code: code,
        ptwh_count: toNum(d.ptwh_count !== undefined ? d.ptwh_count : byCode[code].ptwh_count),
        parcel_capacity: toNum(d.parcel_capacity !== undefined ? d.parcel_capacity : byCode[code].parcel_capacity),
      }));
      await api.managementCapacitySave({
        edits, set_density: densityDraft !== null,
        parcels_per_sqft: densityDraft === null || densityDraft === "" ? null : Number(densityDraft),
      });
      setDraft({});
      setDensityDraft(null);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const doUpload = async (dataset, file) => {
    if (!file) return;
    setUploading(dataset);
    try {
      await api.kpiUpload(dataset, file);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };
  const input = "w-20 rounded border border-slate-300 px-1.5 py-1 text-right text-sm tabular-nums";

  return (
    <div className="space-y-4">
      <Section
        title="Capacity by hub"
        note={
          capacity.sources.hub_size || capacity.sources.staff
            ? `Hub size: ${capacity.sources.hub_size || "not uploaded"} · Staff: ${capacity.sources.staff || "not uploaded"}`
            : "Not uploaded yet"
        }
      >
        <CardRow>
          <StatCard label="Staff" value={rows.some((r) => r.staff_count != null) ? int(sum(rows, "staff_count")) : "—"} sub="from the uploaded manpower sheet" />
          <StatCard label="PTWH" value={int(sum(rows, "ptwh_count"))} sub="keyed in by managers, below" />
          <StatCard label="Hub size (sqft)" value={rows.some((r) => r.sqft != null) ? int(sum(rows, "sqft")) : "—"} />
          <StatCard
            label="Parcel capacity"
            value={totalCap ? int(totalCap) : "—"}
            sub={totalCap ? `${dec1(pct(capHubsInHub, capHubsCap))}% filled now` : "needs hub sizes uploaded"}
          />
        </CardRow>
        {canUpload && (
          <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-2 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              Upload Hub Size (the "control" sheet)
              <input type="file" accept=".xlsx,.xls,.csv" disabled={!!uploading} onChange={(e) => doUpload("capacity_hub_size", e.target.files[0])} />
              {uploading === "capacity_hub_size" && <span>Uploading…</span>}
            </label>
            <label className="flex items-center gap-2">
              Upload Staff headcount (the "SH &amp; FA Manpower" sheet)
              <input type="file" accept=".xlsx,.xls,.csv" disabled={!!uploading} onChange={(e) => doUpload("capacity_staff", e.target.files[0])} />
              {uploading === "capacity_staff" && <span>Uploading…</span>}
            </label>
          </div>
        )}
      </Section>

      <Section title="Driver / rider attendance" note={`${days.length} day(s) of history · weekend = Sat + Sun`}>
        <CardRow>
          <StatCard label="Weekday avg / day" value={int(avgOf(allWd))} sub={`${allWd.length} weekday(s)`} />
          <StatCard label="Weekend avg / day" value={int(avgOf(allWe))} sub={`${allWe.length} weekend day(s)`} />
        </CardRow>
        <div className="flex flex-wrap gap-3">
          <SegmentedControl options={LEVELS} value={level} onChange={setLevel} />
          <SegmentedControl options={TIMES} value={time} onChange={setTime} />
        </div>
        <DataTable columns={attendanceColumns} rows={attendance} rowKey={(r) => r.key} maxHeight="480px" emptyMessage="No attendance history yet." />
      </Section>

      <Section
        title="Hub size, staff, PTWH and parcel capacity by station"
        note="PTWH and parcel capacity are typed by managers -- change them whenever the roster or the hub changes"
        right={
          <button onClick={save} disabled={!dirty || saving} className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40">
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      >
        <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          Parcels per sqft
          <input
            type="number" step="0.1" min="0" className={input} placeholder="1"
            value={densityDraft !== null ? densityDraft : density ?? ""}
            onChange={(e) => setDensityDraft(e.target.value)}
          />
          <span className="text-[10px] text-slate-400">
            capacity = sqft × this (1 = one parcel per sqft), unless a hub has its own parcel capacity typed below.
          </span>
        </label>
        <SubHead>Hubs ({rows.length})</SubHead>
        <DataTable
          maxHeight="560px"
          columns={[
            { key: "station_name", label: "Station", sticky: true, align: "left" },
            { key: "region", label: "Region" },
            { key: "sqft", label: "SQFT", render: (r) => (r.sqft == null ? "—" : int(r.sqft)) },
            { key: "staff_count", label: "Staff", render: (r) => (r.staff_count == null ? "—" : int(r.staff_count)) },
            {
              key: "ptwh_count", label: "PTWH",
              render: (r) => (
                <input type="number" min="0" className={input} value={val(r.station_code, "ptwh_count", r)} onChange={(e) => setVal(r.station_code, "ptwh_count", e.target.value)} />
              ),
            },
            {
              key: "parcel_capacity", label: "Parcel capacity (override)",
              render: (r) => (
                <input type="number" min="0" className={input} placeholder={r.capacity_eff && r.parcel_capacity == null ? int(r.capacity_eff) : ""} value={val(r.station_code, "parcel_capacity", r)} onChange={(e) => setVal(r.station_code, "parcel_capacity", e.target.value)} />
              ),
            },
            { key: "capacity_eff", label: "Capacity used", render: (r) => (r.capacity_eff == null ? "—" : int(r.capacity_eff)) },
            { key: "in_hub", label: "In hub", render: (r) => (r.in_hub == null ? "—" : int(r.in_hub)) },
            {
              key: "util", label: "Filled",
              className: (r) => (r.util != null && r.util >= 100 ? "text-status-critical font-bold" : r.util != null && r.util >= 80 ? "text-status-warning font-bold" : ""),
              render: (r) => (r.util == null ? "—" : `${dec1(r.util)}%`),
            },
          ]}
          rows={tableRows}
          rowKey={(r) => r.station_code}
        />
      </Section>
    </div>
  );
}
