import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { formatLocalDateTime, formatTime } from "../lib/format";
import { exportCsv } from "../lib/csv";
import { FEATURES } from "../lib/features";
import TnSheet from "./TnSheet";

// The tracking-number drilldown modal. Every tab that has a clickable metric
// (Station Health, Shipment Details, Shipper Watch) uses this same component,
// pointed at its own endpoint via `fetcher`.
//
// Last scan (2026-10-08 feedback): each tracking number shows its last scan date / time
// (looked up in one call after the list arrives, so every endpoint gets it without changing),
// and the list can be sorted by tracking number or by last scan, oldest or newest first.
const csvTime = (v) => (v ? String(v).replace("T", " ").replace(/\.\d+$/, "").replace(/[+-]\d\d:\d\d$/, "") : "");

export default function TnModal({ state, onClose, fetcher }) {
  const [tns, setTns] = useState(null);
  const [scans, setScans] = useState(null); // { tn: "2026-10-08 07:00:41.000" | null } -- null until looked up
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: "desc" }); // key: "tn" | "scan" | null (the order the list came in)

  useEffect(() => {
    if (!state) return undefined;
    setTns(null);
    setScans(null);
    setError(null);
    setCopied(false);
    setSort({ key: null, dir: "desc" });
    let cancelled = false;
    fetcher(state.stationCode, state.metricKey)
      .then((r) => {
        if (cancelled) return;
        setTns(r);
        api
          .tnLastScan(r.tracking_numbers || [])
          .then((s) => !cancelled && setScans(s.last_scan || {}))
          .catch(() => !cancelled && setScans({})); // the list still works without the dates
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [state]);

  const list = useMemo(() => {
    const base = tns?.tracking_numbers || [];
    if (!sort.key) return base;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      if (sort.key === "tn") return sign * a.localeCompare(b);
      const av = scans?.[a] || "";
      const bv = scans?.[b] || "";
      if (!av && !bv) return 0;
      if (!av) return 1; // no scan date always last
      if (!bv) return -1;
      return sign * av.localeCompare(bv);
    });
  }, [tns, scans, sort]);

  if (!state) return null;

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "scan" ? "desc" : "asc" }));
  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : "");

  const copy = () => {
    if (!list.length) return;
    navigator.clipboard.writeText(list.join("\n")).then(() => setCopied(true));
  };

  const download = () => {
    if (!list.length) return;
    const st = tns?.statuses; // some lists (Action Board's AASH TNs) also say each parcel's status
    exportCsv(
      `daily-ops-${state.stationCode}-${state.metricKey}-${new Date().toISOString().slice(0, 10)}.csv`,
      st ? ["Tracking Number", "Status", "Last Scan"] : ["Tracking Number", "Last Scan"],
      list.map((tn) => (st ? [tn, st[tn] || "", csvTime(scans?.[tn])] : [tn, csvTime(scans?.[tn])]))
    );
  };

  return (
    <>
      {FEATURES.phoneTnSheet && (
        <TnSheet
          title={state.stationName}
          subtitle={state.metricLabel}
          count={list.length}
          asOf={tns?.as_of ? formatTime(tns.as_of) : null}
          loading={!tns && !error}
          error={error}
          rows={list.map((tn) => ({ key: tn, primary: tn, secondary: [tns?.statuses?.[tn], scans?.[tn] ? `Last scan ${formatLocalDateTime(scans[tn])}` : null].filter(Boolean).join(" · ") || null }))}
          onClose={onClose}
          onCopy={copy}
          onCsv={download}
          copied={copied}
        />
      )}
    <div className={`fixed inset-0 z-50 items-start justify-center bg-black/50 pt-[8vh] ${FEATURES.phoneTnSheet ? "hidden md:flex" : "flex"}`} onClick={onClose}>
      <div
        className="max-h-[75vh] w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">{state.stationName}</div>
            <div className="text-xs text-slate-500">{state.metricLabel}</div>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        <div className="px-4 py-3">
          {error && <div className="text-sm text-status-critical">{error}</div>}
          {!error && !tns && <div className="text-sm text-slate-400">Loading…</div>}
          {tns && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {list.length.toLocaleString()} tracking number
                  {list.length === 1 ? "" : "s"}
                  {tns.as_of && ` · as of ${formatTime(tns.as_of)}`}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={download}
                    disabled={!list.length}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-40"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={copy}
                    disabled={!list.length}
                    className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {copied ? "Copied!" : "Copy list"}
                  </button>
                </div>
              </div>
              <div className="max-h-[45vh] overflow-y-auto rounded-lg bg-slate-50 text-xs text-slate-700">
                {list.length === 0 ? (
                  <div className="p-3">No tracking numbers.</div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-100 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">
                          <button onClick={() => toggleSort("tn")} className="hover:text-brand">Tracking Number{arrow("tn")}</button>
                        </th>
                        {tns.statuses && <th className="px-3 py-1.5 font-medium">Status</th>}
                        <th className="px-3 py-1.5 font-medium">
                          <button onClick={() => toggleSort("scan")} className="hover:text-brand" title="Sort by last scan date and time">Last Scan{arrow("scan")}</button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="leading-relaxed">
                      {list.map((tn) => (
                        <tr key={tn} className="border-t border-slate-200/70">
                          <td className="px-3 py-1 font-mono">{tn}</td>
                          {tns.statuses && <td className="px-3 py-1">{tns.statuses[tn] || ""}</td>}
                          <td className="whitespace-nowrap px-3 py-1 tabular-nums">
                            {scans === null ? <span className="text-slate-300">…</span> : scans[tn] ? formatLocalDateTime(scans[tn]) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
