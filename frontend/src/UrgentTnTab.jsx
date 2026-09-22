import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import { exportCsv } from "./lib/csv";
import DataTable from "./components/DataTable";

// Parses a paste of tracking numbers separated by newlines, commas, semicolons
// or whitespace -- however the user copies them out of a sheet or chat message.
function parseTns(text) {
  return Array.from(new Set(text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)));
}

export default function UrgentTnTab({ me, refreshTick }) {
  const storageKey = `urgent-tn-list-${me.email}`;
  const [tns, setTns] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved)) return saved;
    } catch {
      /* private browsing / storage blocked / bad JSON -- start empty */
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [results, setResults] = useState({}); // { tracking_number: result }
  const [asOf, setAsOf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const persist = (next) => {
    setTns(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* private browsing / storage blocked -- list just won't persist */
    }
  };

  const lookup = async (list) => {
    if (list.length === 0) {
      setResults({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.urgentTnLookup(list);
      setResults(Object.fromEntries(res.results.map((r) => [r.tracking_number, r])));
      setAsOf(res.captured_at);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-lookup whatever was already being tracked, on first load -- and again
  // whenever the background auto-refresh ticks, so a watched TN's status stays
  // current without the user re-pasting the list.
  useEffect(() => {
    if (tns.length > 0) lookup(tns);
  }, [refreshTick]);

  const addTns = () => {
    const parsed = parseTns(input);
    if (parsed.length === 0) return;
    const next = Array.from(new Set([...tns, ...parsed]));
    persist(next);
    setInput("");
    lookup(next);
  };

  const removeTn = (tn) => {
    const next = tns.filter((t) => t !== tn);
    persist(next);
    setResults((r) => {
      const { [tn]: _removed, ...rest } = r;
      return rest;
    });
  };

  const clearAll = () => {
    persist([]);
    setResults({});
  };

  const rows = useMemo(
    () =>
      tns.map((tn) => {
        const r = results[tn];
        return {
          tracking_number: tn,
          found: r?.found ?? null, // null = not looked up yet
          dest_hub: r?.dest_hub ?? null,
          last_sweep_hub: r?.last_sweep_hub ?? null,
          status: r?.status ?? null,
          age: r?.age ?? null,
          attempts: r?.attempts ?? null,
          cod: r?.cod ?? null,
        };
      }),
    [tns, results]
  );

  const columns = [
    { key: "tracking_number", label: "Tracking Number", sticky: true, align: "left", className: () => "font-mono text-xs" },
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: (r) => (r.found === false ? "Not found" : r.status ?? "—"),
      className: (r) => (r.found === false ? "font-medium text-status-critical" : "text-slate-700"),
    },
    { key: "dest_hub", label: "Dest Hub", sortable: false, render: (r) => r.dest_hub ?? "—" },
    { key: "last_sweep_hub", label: "Last Sweep Hub", sortable: false, render: (r) => r.last_sweep_hub ?? "—" },
    { key: "age", label: "Age", sortable: false, render: (r) => (r.age != null ? r.age.toFixed(1) : "—") },
    { key: "attempts", label: "Attempt", sortable: false, render: (r) => r.attempts ?? "—" },
    { key: "cod", label: "COD", sortable: false, render: (r) => r.cod ?? "—" },
    {
      key: "remove",
      label: "",
      sortable: false,
      render: (r) => (
        <button onClick={() => removeTn(r.tracking_number)} className="text-xs font-medium text-slate-400 hover:text-status-critical">
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="font-display text-xs font-semibold text-slate-700">
          Track a tracking number — paste one or more (newline, comma or space separated)
        </div>
        <textarea
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
          rows={3}
          placeholder="NVMYNINJA050427359&#10;NVMYNINJA050427360"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={addTns}
            disabled={!input.trim()}
            className="min-h-[44px] rounded-lg bg-brand px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-40"
          >
            Track
          </button>
          <button
            onClick={() => lookup(tns)}
            disabled={tns.length === 0 || loading}
            className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600 disabled:opacity-40"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {tns.length > 0 && (
            <>
              <button
                onClick={() =>
                  exportCsv(
                    `daily-ops-urgent-tn-${new Date().toISOString().slice(0, 10)}.csv`,
                    ["Tracking Number", "Status", "Dest Hub", "Last Sweep Hub", "Age", "Attempt", "COD"],
                    rows.map((r) => [
                      r.tracking_number, r.found === false ? "Not found" : r.status ?? "",
                      r.dest_hub ?? "", r.last_sweep_hub ?? "", r.age ?? "", r.attempts ?? "", r.cod ?? "",
                    ])
                  )
                }
                className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600"
              >
                Export CSV
              </button>
              <button onClick={clearAll} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 font-display text-xs font-medium text-slate-600">
                Clear all
              </button>
            </>
          )}
          {asOf && <span className="text-xs text-slate-400">Looked up against data as of {formatTime(asOf)}</span>}
        </div>
      </div>

      {error && <div className="rounded-xl bg-white p-4 text-sm text-status-critical ring-1 ring-slate-200">{error}</div>}

      <DataTable
        title="Tracked tracking numbers"
        maxHeight="60vh"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.tracking_number}
        emptyMessage="Nothing tracked yet -- paste a tracking number above."
        footer={
          <>
            {rows.length} tracking number{rows.length === 1 ? "" : "s"} tracked · looked up from the same query 78
            data Station Health uses (refreshed every 30 minutes), not a live search.
          </>
        }
      />
    </div>
  );
}
