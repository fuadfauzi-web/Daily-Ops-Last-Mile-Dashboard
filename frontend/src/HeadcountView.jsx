import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import MultiSelect from "./components/MultiSelect";

// Headcount (2026-10-02, staging): a place's headcount = the people posted there (Staff & Org Chart) + its vacant seats -- planned seats, or
// people whose email isn't known yet. Three tables: STATIONS (Station Head / Fleet Assistant), ZONES (Region Head / Regional Fleet Supervisor) and
// HQ (Fleet Admin). A seat can cover more than one place (a Regional Fleet Supervisor for South 1 and South 2 is one seat): it shows in each place's row
// and the cards count it once. Management View -> Capacity reads the station numbers. The HOD adds a seat straight away; a Manager's new seat waits for the HOD
// to approve it; a Manager or the HOD removes a seat with no approval. Removing a PERSON is the Fleet Admin team's job.
const DESIGNATIONS = [
  ["fleet_assistant", "Fleet Assistant", "station"],
  ["station_head", "Station Head", "station"],
  ["region_head", "Region Head", "zone"],
  ["rfs", "Regional Fleet Supervisor", "zone"],
  ["fleet_admin", "Fleet Admin", "hq"],
];
const KIND_OF = Object.fromEntries(DESIGNATIONS.map(([k, , kind]) => [k, kind]));
const SECTIONS = [["stations", "Stations", "Station Head · Fleet Assistant"], ["zones", "Zones", "Region Head · RFS"], ["hq", "HQ", "Fleet Admin"]];
const KIND_FOR_SECTION = { stations: "station", zones: "zone", hq: "hq" };

const vacantText = (c) => (c.tba + c.pending > 0 ? c.tba + (c.pending ? ` (+${c.pending} pending)` : "") : 0);

function Card({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function HeadcountView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("stations");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState({ key: "station", dir: "asc" });
  const [form, setForm] = useState({ places: [], designation: "fleet_assistant", note: "" });
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

  const kind = KIND_FOR_SECTION[section];
  const seatsByPlace = useMemo(() => {
    const m = {};
    for (const s of data?.seats || []) (m[`${s.place_type || "station"}:${s.station}`] ||= []).push(s);
    return m;
  }, [data]);

  const switchSection = (key) => {
    setSection(key);
    setSort({ key: "station", dir: "asc" });
  };

  const regions = useMemo(() => [...new Set((section === "zones" ? data?.zones : data?.stations || []).map((s) => s.region))].sort(), [data, section]);

  // one row shape for the station and zone tables
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const dir = sort.dir === "asc" ? 1 : -1;
    if (section === "stations") {
      const get = { station: (s) => s.name.toLowerCase(), zone: (s) => s.zone.toLowerCase(), people: (s) => s.filled, vacant: (s) => s.tba + s.pending, total: (s) => s.total }[sort.key];
      return (data?.stations || [])
        .filter((s) => region === "all" || s.region === region)
        .filter((s) => !q || `${s.name} ${s.zone} ${s.region}`.toLowerCase().includes(q))
        .sort((a, b) => (get(a) < get(b) ? -dir : get(a) > get(b) ? dir : a.name.localeCompare(b.name)));
    }
    if (section === "zones") {
      const get = {
        station: (z) => z.name.toLowerCase(), zone: (z) => z.region.toLowerCase(),
        rh: (z) => z.region_head.filled, rhv: (z) => z.region_head.tba + z.region_head.pending,
        rfs: (z) => z.rfs.filled, rfsv: (z) => z.rfs.tba + z.rfs.pending, total: (z) => z.total,
      }[sort.key] || ((z) => z.name.toLowerCase());
      return (data?.zones || [])
        .filter((z) => region === "all" || z.region === region)
        .filter((z) => !q || `${z.name} ${z.region}`.toLowerCase().includes(q))
        .sort((a, b) => (get(a) < get(b) ? -dir : get(a) > get(b) ? dir : a.name.localeCompare(b.name)));
    }
    return [];
  }, [data, section, search, region, sort]);
  // Click a header to sort; click again to flip. Numbers start high-to-low, names A-Z.
  const sortBy = (key) => setSort((p) => (p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "station" || key === "zone" ? "asc" : "desc" }));
  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  if (error && !data) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>;
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>;

  // The cards count each person and each seat once, even when it covers two places (a table row per place would count it twice).
  const totals = data.totals?.[section] || { filled: 0, tba: 0, pending: 0 };
  const peopleCard = totals.filled;
  const pending = data.seats.filter((s) => s.status === "pending");
  const sectionSeats = data.seats.filter((s) => (s.place_type || "station") === kind);

  const formKind = KIND_OF[form.designation];
  const submit = (e) => {
    e.preventDefault();
    if (formKind !== "hq" && form.places.length === 0) return setError(formKind === "zone" ? "Pick a zone" : "Pick a station");
    act(async () => {
      const r = await api.headcount.add({ places: formKind === "hq" ? [] : form.places, designation: form.designation, note: form.note });
      setForm({ ...form, places: [], note: "" });
      setSection(formKind === "zone" ? "zones" : formKind === "hq" ? "hq" : "stations"); // show where the seat landed
      setNotice(r.status === "pending" ? "Sent to the HOD for approval. It counts once approved." : "Headcount added.");
    });
  };
  const placeOptions = formKind === "station" ? data.stations.map((s) => ({ value: s.name, label: `${s.name} (${s.zone})` })) : formKind === "zone" ? data.zones.map((z) => ({ value: z.name, label: `${z.name} (${z.region})` })) : [];

  const SeatChips = ({ place, type }) =>
    (seatsByPlace[`${type}:${place}`] || []).map((seat) => (
      <span key={seat.id} title={seat.note || ""} className={`mr-1.5 inline-flex items-center gap-1 rounded border border-dashed px-2 py-0.5 text-xs ${seat.status === "pending" ? "border-amber-400 text-amber-800" : "border-slate-400 text-slate-600"}`}>
        {seat.label}{(seat.places || []).length > 1 ? ` · ${seat.places.join(" + ")}` : ""}{seat.status === "pending" ? " (pending)" : ""}{type === "hq" && seat.note ? ` · ${seat.note}` : ""}
        {data.can_change && (
          <button disabled={busy} onClick={() => act(() => api.headcount.remove(seat.id))} aria-label="Remove this seat" className="text-status-critical hover:underline">×</button>
        )}
      </span>
    ));

  const Th = ({ k, children, center }) => (
    <th className={`px-3 py-2 font-medium ${center ? "text-center" : ""}`}>
      <button type="button" onClick={() => sortBy(k)} className="font-medium hover:text-ink" title="Click to sort">{children}{arrow(k)}</button>
    </th>
  );

  const input = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold sm:w-fit">
        {SECTIONS.map(([key, label, sub]) => (
          <button key={key} onClick={() => switchSection(key)} className={`px-4 py-1.5 text-left ${section === key ? "bg-ink text-white" : "text-slate-500"}`}>
            {label} <span className={`ml-1 font-normal ${section === key ? "text-slate-300" : "text-slate-400"}`}>{sub}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Card label="Headcount" value={peopleCard + totals.tba} />
        <Card label="People in the list" value={peopleCard} />
        <Card label="Vacant seats" value={totals.tba} />
        <Card label="Waiting for the HOD" value={totals.pending} />
      </div>
      <p className="text-xs text-slate-500">
        {section === "stations" && "A station's headcount is the people posted there plus its vacant seats (planned, or someone whose email isn't known yet). Management View → Capacity uses these numbers. "}
        {section === "zones" && "A zone's headcount is its Region Head and Regional Fleet Supervisor (RFS) plus their vacant seats. Someone who covers two zones is listed in both rows and counted once in the cards. "}
        {section === "hq" && "The Fleet Admin team's headcount is the Fleet Admin people at HQ plus its vacant seats. "}
        When the Fleet Admin team adds a person where a seat is vacant, that seat is used up; when someone leaves, their seat stays and becomes vacant. Only a Manager or the HOD adds or removes seats.
      </p>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-critical">{error}</div>}
      {notice && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}

      {data.can_change && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
          <select value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value, places: KIND_OF[e.target.value] === KIND_OF[form.designation] ? form.places : [] })} className={input} aria-label="Role">
            {DESIGNATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {formKind === "hq" ? (
            <div className={`${input} bg-slate-50 text-slate-500`}>HQ (the Fleet Admin team)</div>
          ) : (
            <MultiSelect placeholder={formKind === "zone" ? "Zone(s)… pick two if it covers both" : "Station(s)…"} options={placeOptions} value={form.places} onChange={(v) => setForm({ ...form, places: v })} />
          )}
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Note (e.g. new hire)" maxLength={200} className={`${input} lg:col-span-2`} />
          <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {data.needs_approval ? "Request headcount" : "Add headcount"}
          </button>
          <p className="text-xs text-slate-400 sm:col-span-2 lg:col-span-5">
            Pick the role, then where it sits: station(s) for a Station Head / Fleet Assistant, zone(s) for a Region Head / RFS (a seat for two zones, e.g. South 1 and South 2, is one seat), HQ for Fleet Admin.
            {data.needs_approval ? " As a Manager, headcount you add waits for the HOD's approval. Removing a seat needs no approval." : ""}
          </p>
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

      {section !== "hq" && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={section === "zones" ? "Find a zone or region…" : "Find a station, zone or region…"} className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
            <option value="all">All regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="text-xs text-slate-400">{rows.length} of {section === "zones" ? data.zones.length : data.stations.length} {section === "zones" ? "zones" : "stations"}</span>
        </div>
      )}

      {section === "stations" && (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
              <tr>
                <Th k="station">Station</Th>
                <Th k="zone">Zone</Th>
                <Th k="people" center>People</Th>
                <Th k="vacant" center>Vacant</Th>
                <Th k="total" center>Headcount</Th>
                <th className="px-3 py-2 font-medium">Vacant seats</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.name} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-1.5">{s.name}</td>
                  <td className="px-3 py-1.5 text-slate-500">{s.zone}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{s.filled}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{vacantText(s)}</td>
                  <td className="px-3 py-1.5 text-center font-medium tabular-nums">{s.total}</td>
                  <td className="px-3 py-1.5"><SeatChips place={s.name} type="station" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "zones" && (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_#e2e8f0]">
              <tr>
                <Th k="station">Zone</Th>
                <Th k="zone">Region</Th>
                <Th k="rh" center>Region Head</Th>
                <Th k="rhv" center>RH vacant</Th>
                <Th k="rfs" center>RFS</Th>
                <Th k="rfsv" center>RFS vacant</Th>
                <Th k="total" center>Headcount</Th>
                <th className="px-3 py-2 font-medium">Vacant seats</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((z) => (
                <tr key={z.name} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-1.5">{z.name}</td>
                  <td className="px-3 py-1.5 text-slate-500">{z.region}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{z.region_head.filled}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{vacantText(z.region_head)}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{z.rfs.filled}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{vacantText(z.rfs)}</td>
                  <td className="px-3 py-1.5 text-center font-medium tabular-nums">{z.total}</td>
                  <td className="px-3 py-1.5"><SeatChips place={z.name} type="zone" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "hq" && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Team</th>
                <th className="px-3 py-2 text-center font-medium">People</th>
                <th className="px-3 py-2 text-center font-medium">Vacant</th>
                <th className="px-3 py-2 text-center font-medium">Headcount</th>
                <th className="px-3 py-2 font-medium">Vacant seats</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 align-top">
                <td className="px-3 py-1.5">Fleet Admin (HQ)</td>
                <td className="px-3 py-1.5 text-center tabular-nums">{data.hq.fleet_admin.filled}</td>
                <td className="px-3 py-1.5 text-center tabular-nums">{vacantText(data.hq.fleet_admin)}</td>
                <td className="px-3 py-1.5 text-center font-medium tabular-nums">{data.hq.fleet_admin.total}</td>
                <td className="px-3 py-1.5"><SeatChips place="HQ" type="hq" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {section !== "stations" && sectionSeats.length === 0 && <p className="text-xs text-slate-400">No vacant seats here.</p>}
    </div>
  );
}
