import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { loadKpiTargets, setKpiTargets } from "./lib/kpiTargets";

// Admin -> KPI Settings: what an admin controls for the KPI pages.
//   Scope    whether East Malaysia (Retail, not Last Mile) is counted -- off by default
//   Targets  the target of every KPI per region (backend/kpi_targets.py holds the defaults; what is changed here is stored on top of them).
//            A change is used by the KPI pages, the Weekly Dashboard and the Invalid POD / COD RTS / Hybrid pages straight away.
const fmt = (v) => (v == null || Number.isNaN(v) ? "" : String(Math.round(v * 10000) / 10000));
const cellKey = (kpi, region) => `${kpi}|${region}`;
const maxOf = (k) => (k.unit === "number" ? 100000 : 100);
const HINT = { hybrid: "the Productivity on the Hybrid page -- drivers below it are the low performers" };

export default function KpiTargetsPanel() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [switching, setSwitching] = useState(false);

  const fill = (d) => {
    const next = {};
    d.kpis.forEach((k) => d.regions.forEach((r) => (next[cellKey(k.key, r)] = fmt(k.targets[r]))));
    setDraft(next);
  };
  useEffect(() => {
    loadKpiTargets(true)
      .then((d) => {
        if (!d) throw new Error("Could not load the targets");
        setData(d);
        fill(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  // cells whose input differs from what is saved (an emptied "not set" cell goes back to not set)
  const changes = useMemo(() => {
    if (!data) return [];
    const out = [];
    data.kpis.forEach((k) =>
      data.regions.forEach((r) => {
        const text = String(draft[cellKey(k.key, r)] ?? "").trim();
        const current = k.targets[r];
        if (text === "") {
          if (current != null) out.push({ kpi: k.key, region: r, target: null, text });
        } else if (Number(text) !== current) out.push({ kpi: k.key, region: r, target: Number(text), text });
      })
    );
    return out;
  }, [data, draft]);
  const invalid = useMemo(
    () => changes.filter((c) => c.target != null && (!Number.isFinite(c.target) || c.target < 0 || c.target > maxOf(data.kpis.find((k) => k.key === c.kpi)))),
    [changes, data]
  );
  // an empty box is only allowed where the KPI has no default (Hybrid until the numbers are fed)
  const blank = data ? data.kpis.some((k) => data.regions.some((r) => String(draft[cellKey(k.key, r)] ?? "").trim() === "" && k.defaults[r] != null)) : false;

  if (error && !data) return <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading…</div>;

  const edit = (kpi, region, value) => {
    setDraft((d) => ({ ...d, [cellKey(kpi, region)]: value }));
    setSaved(false);
  };
  const resetRow = (k) => {
    setDraft((d) => {
      const next = { ...d };
      data.regions.forEach((r) => (next[cellKey(k.key, r)] = fmt(k.defaults[r])));
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.kpiTargetsSave(changes.map((c) => ({ kpi: c.kpi, region: c.region, target: c.target })));
      setKpiTargets(res);
      setData(res);
      fill(res);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const switchEastMalaysia = async (on) => {
    setSwitching(true);
    setError(null);
    try {
      const res = await api.kpiSettingsSave({ include_east_malaysia: on });
      setKpiTargets(res);
      setData((d) => ({ ...d, settings: res.settings, settings_changed_by: res.settings_changed_by, settings_changed_at: res.settings_changed_at }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSwitching(false);
    }
  };

  const eastMalaysia = !!data.settings?.include_east_malaysia;

  return (
    <div className="space-y-3">
      {error && <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{error}</div>}

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-ink">Scope</div>
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={eastMalaysia} disabled={switching} onChange={(e) => switchEastMalaysia(e.target.checked)} />
          <span>
            <span className="font-medium">Include East Malaysia in the KPI pages</span>
            <span className="block text-xs text-slate-500">
              Off by default: the KPI pages are for Last Mile stations and East Malaysia is Retail, so its stations and region are left out of the Dashboard, the RCA pages, the Weekly
              trend and the Hybrid page for everyone. Only stations on the station list are counted. {switching ? "Saving…" : data.settings_changed_by ? `Last changed by ${data.settings_changed_by}.` : ""}
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-slate-600">
          The target of each KPI by region. Every station, zone and region is judged against its own region's target. Percentages for the rates; Hybrid Productivity is a plain number.
        </div>
        <div className="ml-auto flex items-center gap-3">
          {data.last_changed_by && <span className="text-xs text-slate-400">Last change: {data.last_changed_at?.slice(0, 16).replace("T", " ")} · {data.last_changed_by}</span>}
          <button
            onClick={save}
            disabled={saving || !changes.length || invalid.length > 0 || blank}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : saved && !changes.length ? "Saved" : changes.length ? `Save ${changes.length} change${changes.length === 1 ? "" : "s"}` : "Save targets"}
          </button>
        </div>
      </div>
      {(invalid.length > 0 || blank) && <div className="text-xs text-status-critical">Every target needs a number (a percentage between 0 and 100 for the rates); only Hybrid Productivity may stay empty.</div>}

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink text-left text-white">
              <tr>
                <th className="whitespace-nowrap px-4 py-2 font-display font-medium">KPI</th>
                <th className="whitespace-nowrap px-4 py-2 font-display font-medium">Met when it is</th>
                {data.regions.map((r) => (
                  <th key={r} className="whitespace-nowrap px-4 py-2 text-right font-display font-medium">
                    {r}
                    {r === "East Malaysia" && !eastMalaysia && <span className="block text-[9px] font-normal normal-case opacity-60">left out of the KPI pages</span>}
                  </th>
                ))}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.kpis.map((k, i) => {
                const anyDifferent = data.regions.some((r) => String(draft[cellKey(k.key, r)] ?? "").trim() !== fmt(k.defaults[r]));
                return (
                  <tr key={k.key} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/50" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-ink">
                      {k.label}
                      {HINT[k.key] && <span className="block max-w-[15rem] whitespace-normal text-[10px] font-normal text-slate-400">{HINT[k.key]}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{k.direction === "lower" ? "at or under the target" : "at or over the target"}</td>
                    {data.regions.map((r) => {
                      const key = cellKey(k.key, r);
                      const text = String(draft[key] ?? "");
                      const def = k.defaults[r];
                      const empty = text.trim() === "";
                      const differs = empty ? def != null : Number(text) !== def;
                      const bad = empty ? def != null : !Number.isFinite(Number(text)) || Number(text) < 0 || Number(text) > maxOf(k);
                      return (
                        <td key={r} className="px-4 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={maxOf(k)}
                              value={text}
                              placeholder={def == null ? "not set" : undefined}
                              onChange={(e) => edit(k.key, r, e.target.value)}
                              aria-label={`${k.label} target, ${r}`}
                              className={`w-20 rounded border px-2 py-1 text-right text-xs tabular-nums ${bad ? "border-status-critical bg-status-critical/5" : differs ? "border-amber-400 bg-amber-50" : "border-slate-300"}`}
                            />
                            <span className="w-2 text-xs text-slate-400">{k.unit === "pct" ? "%" : ""}</span>
                          </div>
                          {differs && !bad && <div className="text-[10px] text-slate-400">default {def == null ? "not set" : `${fmt(def)}${k.unit === "pct" ? "%" : ""}`}</div>}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {anyDifferent && (
                        <button onClick={() => resetRow(k)} className="text-xs font-medium text-slate-500 underline hover:text-brand">
                          Back to default
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          Amber = different from the built-in default (shown under the box). Back to default puts the built-in numbers back; press Save to keep it. Lost and Complaint are percentages too: 0.005
          means 0.005%. Hybrid Productivity has no built-in target yet -- until a region has one the Hybrid page keeps its fixed line (productivity 80). The OPEX result always shows OPEX's own targets.
        </div>
      </div>
    </div>
  );
}
