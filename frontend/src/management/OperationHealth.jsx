import { useMemo, useState } from "react";
import { api } from "../api";
import DataTable from "../components/DataTable";
import SegmentedControl from "../components/SegmentedControl";
import {
  BarList, CardRow, Section, StatCard, SubHead, addDays, dayLabel, dec1, defaultDay, int, networkTotals, pct, stationRollup, sum,
  weekLabel, weekStartOf,
} from "./shared";

// Operation Health (2026-10-02, renamed from Overall Health). Everything date-driven here comes from /api/dod -- one snapshot per
// station per Malaysia day for the current + last week, so "past 2 weeks, daily or weekly, default yesterday" is exactly what is
// stored. The "live" blocks (Aging, Hypercare) read the latest refresh and say so.

const ROUTED_BUCKETS = [
  { key: "lt50", label: "Below 50%", test: (p) => p < 50 },
  { key: "50", label: "50 – 60%", test: (p) => p >= 50 && p < 60 },
  { key: "60", label: "60 – 70%", test: (p) => p >= 60 && p < 70 },
  { key: "70", label: "70 – 80%", test: (p) => p >= 70 && p < 80 },
  { key: "80", label: "80 – 90%", test: (p) => p >= 80 && p < 90 },
  { key: "90", label: "90% and above", test: (p) => p >= 90 },
];
const COVERAGE_BUCKETS = [
  { key: "lt50", label: "Below 50%", test: (c) => c < 50 },
  { key: "50", label: "50 – 70%", test: (c) => c >= 50 && c < 70 },
  { key: "70", label: "70 – 90%", test: (c) => c >= 70 && c < 90 },
  { key: "90", label: "90 – 100%", test: (c) => c >= 90 && c < 100 },
  { key: "100", label: "100% and above", test: (c) => c >= 100 },
];
const PRODUCTIVITY_TARGETS = [40, 50, 60, 70, 80];
const LH_BUCKETS = [
  { key: "after12", label: "After 12pm", test: (h) => h >= 12 },
  { key: "11", label: "11am", test: (h) => h === 11 },
  { key: "10", label: "10am", test: (h) => h === 10 },
  { key: "9", label: "9am", test: (h) => h === 9 },
  { key: "8", label: "8am and below", test: (h) => h < 9 },
];
const aged3 = (r) => (r.age_4_6 || 0) + (r.age_7_plus || 0);
const agedD0 = (r) => (r.total || 0) - (r.age_0 || 0);
const agedGt1 = (r) => (r.total || 0) - (r.age_0 || 0) - (r.age_1 || 0);

export default function OperationHealth({ dod, shipper, aging, lhTrips, me, reload, setError }) {
  const days = dod.days;
  const weeks = useMemo(() => [...new Set(days.map(weekStartOf))], [days]);
  const [grain, setGrain] = useState("daily");
  const [day, setDay] = useState(() => defaultDay(days, dod.today));
  const [week, setWeek] = useState(() => weekStartOf(defaultDay(days, dod.today)));
  const [target, setTarget] = useState(60);
  const [openBucket, setOpenBucket] = useState(null);
  const [openLh, setOpenLh] = useState("after12");

  const periodRows = useMemo(
    () => dod.rows.filter((r) => (grain === "daily" ? r.day === day : weekStartOf(r.day) === week)),
    [dod.rows, grain, day, week]
  );
  const stations = useMemo(() => stationRollup(periodRows), [periodRows]);
  const tot = networkTotals(stations);
  const periodDays = [...new Set(periodRows.map((r) => r.day))].sort();

  // Trend rows: one per stored day (daily) or per week (weekly).
  const trend = useMemo(() => {
    const keys = grain === "daily" ? days : weeks;
    return keys.map((k) => {
      const rows = dod.rows.filter((r) => (grain === "daily" ? r.day === k : weekStartOf(r.day) === k));
      return { key: k, label: grain === "daily" ? dayLabel(k) : weekLabel(k), ...networkTotals(stationRollup(rows)) };
    });
  }, [dod.rows, days, weeks, grain]);

  const withVolume = stations.filter((s) => s.volume > 0);

  // ---- routed % buckets, compared with 0 attempt
  const routedBuckets = ROUTED_BUCKETS.map((b) => {
    const list = withVolume.filter((s) => b.test(s.routed_pct));
    return {
      ...b, list, count: list.length, routed: sum(list, "total_routed"), inHub: sum(list, "total_in_hub"),
      zero: sum(list, "zero_attempt_total"),
    };
  });

  // ---- attendance vs volume at a productivity target
  const coverageOf = (s, t) => {
    const required = s.volume / t;
    return { required, coverage: required ? (s.attendance / required) * 100 : 100, gap: required - s.attendance };
  };
  const volume = tot.volume;
  const sensitivity = PRODUCTIVITY_TARGETS.map((t) => ({ target: t, required: volume / t, coverage: pct(tot.att, volume / t) }));
  const stationCoverage = withVolume.map((s) => ({ ...s, ...coverageOf(s, target) }));
  const coverageBuckets = COVERAGE_BUCKETS.map((b) => {
    const list = stationCoverage.filter((s) => b.test(s.coverage));
    return { ...b, count: list.length, gap: sum(list.filter((s) => s.gap > 0), "gap") };
  });
  const worstCoverage = [...stationCoverage].sort((a, b) => b.gap - a.gap).slice(0, 10);
  const here = sensitivity.find((s) => s.target === target);

  // ---- rescue
  const rescueStations = stations.filter((s) => s.attendance_rescue > 0).sort((a, b) => b.attendance_rescue - a.attendance_rescue);

  // ---- LH timing (daily view: that day; weekly view: the week's newest day with data)
  const lhDay = grain === "daily" ? day : periodDays[periodDays.length - 1];
  const lhRows = dod.rows.filter((r) => r.day === lhDay && r.lh_trips?.length);
  const lhStations = lhRows.map((r) => {
    const latest = r.lh_trips.reduce((a, b) => (b.time > a.time ? b : a));
    return {
      station_code: r.station_code, station_name: r.station_name, region: r.region, time: latest.time,
      hour: new Date(latest.time.replace(" ", "T")).getHours(), parcels: r.lh_trips.reduce((s, t) => s + t.parcels, 0),
    };
  });
  const lhBuckets = LH_BUCKETS.map((b) => {
    const list = lhStations.filter((s) => b.test(s.hour)).sort((a, c) => c.parcels - a.parcels);
    return { ...b, list, count: list.length, parcels: sum(list, "parcels") };
  });
  const openLhBucket = lhBuckets.find((b) => b.key === openLh) || lhBuckets[0];
  // Driver view (Metabase 127512, uploaded): every completed land-haul trip that arrived at a station that day, bucketed by its own
  // arrival hour; a driver's volume in a bucket = the parcels on their trips arriving in it.
  const dayTrips = (lhTrips?.trips || []).filter((t) => t.day === lhDay);
  const tripBucket = (t, b) => b.test(parseInt(t.time.slice(0, 2), 10));
  const driverRank = (b) => {
    const by = new Map();
    dayTrips.filter((t) => tripBucket(t, b)).forEach((t) => {
      const d = by.get(t.driver) || { driver: t.driver, trips: 0, parcels: 0, stations: new Set(), latest: "" };
      d.trips += 1; d.parcels += t.parcels; d.stations.add(t.station_code);
      if (t.time > d.latest) d.latest = t.time;
      by.set(t.driver, d);
    });
    return [...by.values()].map((d) => ({ ...d, stationCount: d.stations.size })).sort((a, c) => c.parcels - a.parcels);
  };
  const driverBuckets = lhBuckets.map((b) => {
    const list = driverRank(b);
    return { ...b, drivers: list, trips: sum(list, "trips"), tripParcels: sum(list, "parcels") };
  });
  const openDrivers = driverBuckets.find((b) => b.key === openLh) || driverBuckets[0];
  const hasDrivers = dayTrips.length > 0;
  const [uploadingLh, setUploadingLh] = useState(false);
  const uploadLh = async (file) => {
    if (!file) return;
    setUploadingLh(true);
    try {
      await api.kpiUpload("lh_trips", file);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingLh(false);
    }
  };

  const latlongTop = [...stations].filter((s) => s.latlong > 0).sort((a, b) => b.latlong - a.latlong).slice(0, 10);

  // ---- aging (live)
  const agingRows = (t) => aging[t]?.stations || [];
  const deliveryRows = agingRows("delivery"), atsRows = agingRows("ats"), zeroRows = agingRows("zero_attempt");
  const deliveryAged = sum(deliveryRows.map((r) => ({ v: aged3(r) })), "v");
  const deliveryTotal = sum(deliveryRows, "total");
  const atsAged = sum(atsRows.map((r) => ({ v: agedGt1(r) })), "v");
  const zeroTotal = sum(zeroRows, "total");
  const zeroAgedD0 = sum(zeroRows.map((r) => ({ v: agedD0(r) })), "v");
  const topBy = (rows, score, n) => [...rows].map((r) => ({ ...r, _score: score(r) })).filter((r) => r._score > 0).sort((a, b) => b._score - a._score).slice(0, n);
  const topDelivery = topBy(deliveryRows, aged3, 10);
  const topAts = topBy(atsRows, agedGt1, 3);
  const topZero = topBy(zeroRows, agedD0, 10);

  // ---- Hypercare (live): Watson, Orca, Zalora NXD, Cold Chain from Shipper Radar
  const shipperRows = shipper?.stations || [];
  const hyper = (r) => ({
    watson: (r.watson_zero_attempt || 0) + (r.watson_aging || 0),
    orca: (r.orca_ovfd || 0) + (r.orca_other || 0),
    zalora: (r.zalora_zero_attempt || 0) + (r.zalora_ovfd || 0) + (r.zalora_other || 0),
    cold: (r.cold_chain_zero_attempt || 0) + (r.cold_chain_aging || 0),
  });
  const hyperTotals = shipperRows.reduce(
    (a, r) => { const h = hyper(r); return { watson: a.watson + h.watson, orca: a.orca + h.orca, zalora: a.zalora + h.zalora, cold: a.cold + h.cold }; },
    { watson: 0, orca: 0, zalora: 0, cold: 0 }
  );
  const hyperAll = hyperTotals.watson + hyperTotals.orca + hyperTotals.zalora + hyperTotals.cold;
  const hyperTop = shipperRows
    .map((r) => ({ ...r, ...hyper(r), total: Object.values(hyper(r)).reduce((a, b) => a + b, 0) }))
    .filter((r) => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

  const noSplitNote = !tot.splitKnown && tot.att > 0;
  const pickerBar = (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <SegmentedControl options={[{ key: "daily", label: "Daily" }, { key: "weekly", label: "Weekly" }]} value={grain} onChange={setGrain} />
      {grain === "daily" ? (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Date
          <input
            type="date" value={day} min={days[0]} max={days[days.length - 1]}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>
      ) : (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Week
          <select value={week} onChange={(e) => setWeek(e.target.value)} className="min-h-[44px] rounded-lg border border-slate-300 px-2 text-sm">
            {weeks.map((w) => <option key={w} value={w}>{weekLabel(w)}</option>)}
          </select>
        </label>
      )}
      <div className="text-[11px] text-slate-400">
        {grain === "daily"
          ? `Showing ${dayLabel(day)}${day === dod.today ? " (today -- still moving)" : ""}. Defaults to yesterday; history is the current and last week.`
          : `${periodDays.length} day(s) of data. Flows are summed; in-hub / 0 Attempt / Age >3 are the per-day average.`}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {pickerBar}

      <Section title="Routing health" note="Fleet route data, from the daily Route Monitoring snapshot">
        <CardRow>
          <StatCard label="Total Routed" value={int(tot.routed)} />
          <StatCard label="Total Delivered" value={int(tot.success)} />
          <StatCard label="Success Rate" value={`${dec1(tot.successRate)}%`} sub="Delivered ÷ Routed" />
          <StatCard label="Routed %" value={`${dec1(tot.routedPct)}%`} sub="Routed ÷ (Routed + In Hub)" />
        </CardRow>
        <SubHead>Attendance</SubHead>
        <CardRow>
          <StatCard label="Total" value={int(tot.att)} />
          <StatCard label="Hybrid (HD+HR)" value={noSplitNote ? "n/a" : int(tot.hybrid)} sub={noSplitNote ? "split recorded from 2 Oct" : `${dec1(pct(tot.hybrid, tot.att))}% of attendance`} />
          <StatCard label="Independent (ID+IR)" value={noSplitNote ? "n/a" : int(tot.independent)} sub={noSplitNote ? "split recorded from 2 Oct" : `${dec1(pct(tot.independent, tot.att))}% of attendance`} />
          <StatCard label="Rescue" value={int(tot.rescue)} sub={`${dec1(pct(tot.rescue, tot.att))}% of attendance`} />
        </CardRow>
        <DataTable
          title={grain === "daily" ? "Daily trend" : "Weekly trend"}
          maxHeight="320px"
          variant="light"
          columns={[
            { key: "label", label: grain === "daily" ? "Day" : "Week", align: "left", sticky: true },
            { key: "routed", label: "Routed", render: (r) => int(r.routed) },
            { key: "success", label: "Delivered", render: (r) => int(r.success) },
            { key: "successRate", label: "Success %", render: (r) => `${dec1(r.successRate)}%` },
            { key: "routedPct", label: "Routed %", render: (r) => `${dec1(r.routedPct)}%` },
            { key: "att", label: "Attendance", render: (r) => int(r.att) },
            { key: "hybrid", label: "Hybrid", render: (r) => (r.splitKnown ? int(r.hybrid) : "—") },
            { key: "independent", label: "Independent", render: (r) => (r.splitKnown ? int(r.independent) : "—") },
            { key: "rescue", label: "Rescue", render: (r) => int(r.rescue) },
          ]}
          rows={trend}
          rowKey={(r) => r.key}
          rowClassName={(r) => ((grain === "daily" ? r.key === day : r.key === week) ? "bg-brand/10" : "")}
          onRowClick={(r) => (grain === "daily" ? setDay(r.key) : setWeek(r.key))}
        />
      </Section>

      <Section title="Routed % bucket vs 0 Attempt" note="0 Attempt = Arrived at Sorting Hub, 0 attempts, last sweep hub = destination hub. Click a bucket for its stations">
        <DataTable
          variant="light"
          columns={[
            { key: "label", label: "Routed % of station", align: "left" },
            { key: "count", label: "Stations", render: (r) => int(r.count) },
            { key: "routed", label: "Routed", render: (r) => int(r.routed) },
            { key: "inHub", label: "In Hub", render: (r) => int(r.inHub) },
            { key: "zero", label: "0 Attempt", render: (r) => int(r.zero) },
            { key: "zeroPct", label: "0 Attempt % of In Hub", render: (r) => `${dec1(pct(r.zero, r.inHub))}%` },
          ]}
          rows={routedBuckets}
          rowKey={(r) => r.key}
          onRowClick={(r) => setOpenBucket(openBucket === r.key ? null : r.key)}
          rowClassName={(r) => (r.key === openBucket ? "bg-brand/10" : "")}
        />
        {openBucket && (
          <DataTable
            title={`Stations in "${routedBuckets.find((b) => b.key === openBucket).label}"`}
            maxHeight="320px"
            columns={[
              { key: "station_name", label: "Station", align: "left", sticky: true },
              { key: "region", label: "Region" },
              { key: "routed_pct", label: "Routed %", render: (r) => `${dec1(r.routed_pct)}%` },
              { key: "total_routed", label: "Routed", render: (r) => int(r.total_routed) },
              { key: "total_in_hub", label: "In Hub", render: (r) => int(r.total_in_hub) },
              { key: "zero_attempt_total", label: "0 Attempt", render: (r) => int(r.zero_attempt_total) },
            ]}
            rows={[...routedBuckets.find((b) => b.key === openBucket).list].sort((a, b) => b.zero_attempt_total - a.zero_attempt_total)}
            rowKey={(r) => r.station_code}
          />
        )}
      </Section>

      <Section
        title="Attendance vs volume"
        note="Volume = Routed + parcels in hub that day"
        right={
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Parcels per driver
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className="min-h-[44px] rounded-lg border border-slate-300 px-2 text-sm">
              {PRODUCTIVITY_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        }
      >
        <CardRow>
          <StatCard label="Volume" value={int(volume)} sub="Routed + In Hub" />
          <StatCard label={`Attendance needed @ ${target}`} value={int(here.required)} sub="Volume ÷ productivity" />
          <StatCard label="Actual attendance" value={int(tot.att)} />
          <StatCard label="Attendance rate" value={`${dec1(here.coverage)}%`} sub="Actual ÷ needed" tone={here.coverage < 90 ? "warn" : undefined} />
        </CardRow>
        <SubHead>If each driver delivers…</SubHead>
        <DataTable
          variant="light"
          columns={[
            { key: "target", label: "Parcels per driver", align: "left" },
            { key: "required", label: "Attendance needed", render: (r) => int(r.required) },
            { key: "coverage", label: "Attendance rate", render: (r) => `${dec1(r.coverage)}%` },
          ]}
          rows={sensitivity}
          rowKey={(r) => r.target}
          rowClassName={(r) => (r.target === target ? "bg-brand/10" : "")}
          onRowClick={(r) => setTarget(r.target)}
        />
        <SubHead>Stations by attendance rate @ {target} per driver</SubHead>
        <BarList
          items={coverageBuckets.map((b) => ({ label: b.label, value: b.count, text: `${b.count} stations${b.gap ? ` · short ${int(b.gap)}` : ""}` }))}
        />
        <DataTable
          title="Biggest attendance gaps"
          maxHeight="320px"
          columns={[
            { key: "station_name", label: "Station", align: "left", sticky: true },
            { key: "region", label: "Region" },
            { key: "volume", label: "Volume", render: (r) => int(r.volume) },
            { key: "attendance", label: "Attendance", render: (r) => int(r.attendance) },
            { key: "required", label: "Needed", render: (r) => int(r.required) },
            { key: "coverage", label: "Rate", render: (r) => `${dec1(r.coverage)}%` },
            { key: "gap", label: "Gap", render: (r) => (r.gap > 0 ? int(r.gap) : "—") },
          ]}
          rows={worstCoverage}
          rowKey={(r) => r.station_code}
        />
      </Section>

      <Section title="Rescue routes" note="Rescue attendance from Route Monitoring">
        <CardRow>
          <StatCard label="Rescue attendance" value={int(tot.rescue)} sub={`${dec1(pct(tot.rescue, tot.att))}% of attendance`} />
          <StatCard label="Stations using rescue" value={int(rescueStations.length)} />
        </CardRow>
        <DataTable
          title="Top stations by rescue attendance"
          maxHeight="320px"
          columns={[
            { key: "station_name", label: "Station", align: "left", sticky: true },
            { key: "region", label: "Region" },
            { key: "attendance_rescue", label: "Rescue", render: (r) => int(r.attendance_rescue) },
            { key: "attendance", label: "Attendance", render: (r) => int(r.attendance) },
            { key: "share", label: "Rescue %", render: (r) => `${dec1(pct(r.attendance_rescue, r.attendance))}%` },
            { key: "total_routed", label: "Routed", render: (r) => int(r.total_routed) },
            { key: "sr", label: "Success %", render: (r) => `${dec1(pct(r.current_success, r.total_routed))}%` },
          ]}
          rows={rescueStations.slice(0, 10)}
          rowKey={(r) => r.station_code}
          emptyMessage="No rescue routes in this period."
        />
      </Section>

      <Section title="Aging health" note={`Live -- latest refresh${aging.delivery?.captured_at ? ` (${aging.delivery.captured_at.slice(0, 16).replace("T", " ")} UTC)` : ""}, not date-driven`}>
        <CardRow>
          <StatCard label="Aging Delivery >3 days" value={int(deliveryAged)} sub={`${dec1(pct(deliveryAged, deliveryTotal))}% of ${int(deliveryTotal)} at their hub`} tone="warn" />
          <StatCard label="Aging ATS >1 day" value={int(atsAged)} sub="parcels not at their destination hub" />
          <StatCard label="0 Attempt older than D0" value={int(zeroAgedD0)} sub={`${dec1(pct(zeroAgedD0, zeroTotal))}% of ${int(zeroTotal)} 0 Attempt`} />
        </CardRow>
        <div className="grid gap-3 xl:grid-cols-2">
          <DataTable
            title="Aging delivery >3 -- top 10 stations"
            columns={[
              { key: "station_name", label: "Station", align: "left", sticky: true },
              { key: "_score", label: "Age >3", render: (r) => int(r._score) },
              { key: "pct", label: "% of station", render: (r) => `${dec1(pct(r._score, r.total))}%` },
              { key: "total", label: "At hub", render: (r) => int(r.total) },
            ]}
            rows={topDelivery}
            rowKey={(r) => r.station_code}
          />
          <DataTable
            title="Aging 0 Attempt (older than D0) -- top 10 stations"
            columns={[
              { key: "station_name", label: "Station", align: "left", sticky: true },
              { key: "_score", label: "Older than D0", render: (r) => int(r._score) },
              { key: "total", label: "0 Attempt", render: (r) => int(r.total) },
              { key: "pct", label: "% aged", render: (r) => `${dec1(pct(r._score, r.total))}%` },
            ]}
            rows={topZero}
            rowKey={(r) => r.station_code}
          />
        </div>
        <DataTable
          title="Aging ATS >1 day -- top 3 stations"
          columns={[
            { key: "station_name", label: "Station", align: "left", sticky: true },
            { key: "_score", label: "Older than 1 day", render: (r) => int(r._score) },
            { key: "total", label: "ATS parcels", render: (r) => int(r.total) },
            { key: "pct", label: "% older than 1 day", render: (r) => `${dec1(pct(r._score, r.total))}%` },
          ]}
          rows={topAts}
          rowKey={(r) => r.station_code}
          emptyMessage="No aged ATS parcels."
        />
        <SubHead>Control Tower Hypercare shippers (Shipper Radar: Watson, Orca, Zalora NXD, Cold Chain)</SubHead>
        <CardRow>
          <StatCard label="Hypercare backlog" value={int(hyperAll)} sub="all four shippers, at stations now" />
          <StatCard label="Watson" value={int(hyperTotals.watson)} sub="0 Attempt + Aging >D0" />
          <StatCard label="Orca" value={int(hyperTotals.orca)} sub="OVFD + Other status" />
          <StatCard label="Zalora NXD" value={int(hyperTotals.zalora)} sub="0 Attempt + OVFD + Other" />
          <StatCard label="Cold Chain" value={int(hyperTotals.cold)} sub="0 Attempt + Aging >D0" />
        </CardRow>
        <DataTable
          title="Hypercare backlog -- top 10 stations"
          columns={[
            { key: "station_name", label: "Station", align: "left", sticky: true },
            { key: "region", label: "Region" },
            { key: "total", label: "Total", render: (r) => int(r.total) },
            { key: "watson", label: "Watson", render: (r) => int(r.watson) },
            { key: "orca", label: "Orca", render: (r) => int(r.orca) },
            { key: "zalora", label: "Zalora NXD", render: (r) => int(r.zalora) },
            { key: "cold", label: "Cold Chain", render: (r) => int(r.cold) },
          ]}
          rows={hyperTop}
          rowKey={(r) => r.station_code}
          emptyMessage="No Hypercare backlog."
        />
      </Section>

      <Section title="Shipment compliance" note={grain === "weekly" ? `LH timing is for ${lhDay ? dayLabel(lhDay) : "–"} (newest day of the week)` : undefined}>
        <SubHead>LH timing -- stations by latest line-haul arrival{lhDay ? ` on ${dayLabel(lhDay)}` : ""}</SubHead>
        <DataTable
          variant="light"
          columns={[
            { key: "label", label: "Arrived", align: "left" },
            { key: "count", label: "Stations", render: (r) => int(r.count) },
            { key: "parcels", label: "LH parcels", render: (r) => int(r.parcels) },
            { key: "share", label: "% of stations", render: (r) => `${dec1(pct(r.count, lhStations.length))}%` },
            ...(hasDrivers
              ? [
                  { key: "trips", label: "Trips", render: (r) => int(r.trips) },
                  { key: "drivers", label: "Drivers", render: (r) => int(r.drivers.length) },
                ]
              : []),
          ]}
          rows={driverBuckets}
          rowKey={(r) => r.key}
          rowClassName={(r) => (r.key === openLh ? "bg-brand/10" : "")}
          onRowClick={(r) => setOpenLh(r.key)}
          emptyMessage="No LH trips recorded."
        />
        {hasDrivers ? (
          <DataTable
            title={`Top 10 LH drivers by volume -- ${openDrivers.label}`}
            titleExtra={<span className="text-[10px] text-slate-400">{openDrivers.trips} trips · {openDrivers.drivers.length} drivers in this bucket · {lhTrips.source}</span>}
            columns={[
              { key: "driver", label: "Driver", align: "left", sticky: true },
              { key: "parcels", label: "Parcels", render: (r) => int(r.parcels) },
              { key: "trips", label: "Trips", render: (r) => int(r.trips) },
              { key: "stationCount", label: "Stations", render: (r) => int(r.stationCount) },
              { key: "latest", label: "Latest arrival" },
            ]}
            rows={openDrivers.drivers.slice(0, 10)}
            rowKey={(r) => r.driver}
            emptyMessage="No LH trips in this bucket."
          />
        ) : (
          <DataTable
            title={`Top 10 stations by LH volume -- ${openLhBucket.label}`}
            titleExtra={<span className="text-[10px] text-slate-400">Redash timing (stations). Upload Metabase 127512 for LH drivers{lhDay ? ` -- no driver trips for ${dayLabel(lhDay)} yet` : ""}</span>}
            columns={[
              { key: "station_name", label: "Station", align: "left", sticky: true },
              { key: "region", label: "Region" },
              { key: "time", label: "Latest arrival", render: (r) => r.time.slice(11, 16) },
              { key: "parcels", label: "LH parcels", render: (r) => int(r.parcels) },
            ]}
            rows={openLhBucket.list.slice(0, 10)}
            rowKey={(r) => r.station_code}
            emptyMessage="No stations in this bucket."
          />
        )}
        {me?.role === "admin" && (
          <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            Upload LH trips (Metabase question 127512, CSV, last 14 days)
            <input type="file" accept=".csv,.xlsx,.xls" disabled={uploadingLh} onChange={(e) => uploadLh(e.target.files[0])} />
            {uploadingLh && <span>Uploading…</span>}
            {lhTrips?.source && <span className="text-slate-400">current: {lhTrips.source}</span>}
          </label>
        )}
        <SubHead>Latlong -- top 10 hubs</SubHead>
        <CardRow>
          <StatCard label="Total Fresh" value={int(tot.fresh)} />
          <StatCard label="Latlong" value={int(tot.latlong)} sub={`${dec1(pct(tot.latlong, tot.fresh))}% of Total Fresh`} />
        </CardRow>
        <DataTable
          columns={[
            { key: "station_name", label: "Station", align: "left", sticky: true },
            { key: "region", label: "Region" },
            { key: "latlong", label: "Latlong", render: (r) => int(r.latlong) },
            { key: "pct", label: "% of fresh", render: (r) => `${dec1(pct(r.latlong, r.total_fresh))}%` },
          ]}
          rows={latlongTop}
          rowKey={(r) => r.station_code}
          emptyMessage="No latlong parcels."
        />
      </Section>
    </div>
  );
}
