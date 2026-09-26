import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { loadKpiTargets, setKpiTargets } from "./lib/kpiTargets";

// Admin -> KPI Targets: the target of every KPI per region (backend/kpi_targets.py holds the defaults; what is changed here is stored on top of
// them). A change is used by the KPI pages, the Weekly Dashboard and the Invalid POD / COD RTS pages straight away.
const fmt = (v) => (v == null || Number.isNaN(v) ? "" : String(Math.round(v * 10000) / 10000));
const cellKey = (kpi, region) => `${kpi}|${region}`;

export default function KpiTargetsPanel() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

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

  // cells whose input differs from what is saved
  const changes = useMemo(() => {
    if (!data) return [];
    const out = [];
    data.kpis.forEach((k) =>
      data.regions.forEach((r) => {
        const text = String(draft[cellKey(k.key, r)] ?? "").trim();
        if (text !== "" && Number(text) !== k.targets[r]) out.push({ kpi: k.key, region: r, target: Number(text), text });
      })
    );
    return out;
  }, [data, draft]);
  const invalid = useMemo(() => changes.filter((c) => !Number.isFinite(c.target) || c.target < 0 || c.target > 100), [changes]);
  const blank = data ? data.kpis.some((k) => data.regions.some((r) => String(draft[cellKey(k.key, r)] ?? "").trim() === "")) : false;

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

  return (
    <div className="space-y-3">
      {error && <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">{error}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-slate-600">
          The target of each KPI by region, in %. The KPI pages, the Weekly Dashboard and the Invalid POD / COD RTS pages judge every station, zone and region against its own
          region's target.
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
      {(invalid.length > 0 || blank) && <div className="text-xs text-status-critical">Every target needs a number between 0 and 100.</div>}

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink text-left text-white">
              <tr>
                <th className="whitespace-nowrap px-4 py-2 font-display font-medium">KPI</th>
                <th className="whitespace-nowrap px-4 py-2 font-display font-medium">Met when the rate is</th>
                {data.regions.map((r) => (
                  <th key={r} className="whitespace-nowrap px-4 py-2 text-right font-display font-medium">
                    {r}
                  </th>
                ))}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.kpis.map((k, i) => {
                const anyDifferent = data.regions.some((r) => Number(draft[cellKey(k.key, r)]) !== k.defaults[r]);
                return (
                  <tr key={k.key} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/50" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-ink">{k.label}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{k.direction === "lower" ? "at or under the target" : "at or over the target"}</td>
                    {data.regions.map((r) => {
                      const key = cellKey(k.key, r);
                      const text = draft[key] ?? "";
                      const differs = Number(text) !== k.defaults[r];
                      const bad = text.trim() === "" || !Number.isFinite(Number(text)) || Number(text) < 0 || Number(text) > 100;
                      return (
                        <td key={r} className="px-4 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="100"
                              value={text}
                              onChange={(e) => edit(k.key, r, e.target.value)}
                              aria-label={`${k.label} target, ${r}`}
                              className={`w-20 rounded border px-2 py-1 text-right text-xs tabular-nums ${bad ? "border-status-critical bg-status-critical/5" : differs ? "border-amber-400 bg-amber-50" : "border-slate-300"}`}
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                          {differs && !bad && <div className="text-[10px] text-slate-400">default {fmt(k.defaults[r])}%</div>}
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
          Amber = different from the built-in default (shown under the box). Back to default puts the built-in numbers back; press Save to keep it. Lost is a percentage too:
          0.005 means 0.005%. Hybrid Productivity has targets per region as well; they are added here once they are set. The OPEX Result page always shows OPEX's own targets.
        </div>
      </div>
    </div>
  );
}
