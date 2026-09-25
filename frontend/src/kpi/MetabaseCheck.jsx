import { useState } from "react";
import { api } from "../api";

// Admins: "what does Metabase say to this app's API key?" -- a plain-English verdict plus the raw answers (never the key itself).
export default function MetabaseCheck() {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setRes(await api.kpiMetabaseCheck());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <button onClick={run} disabled={busy} className="min-h-[36px] rounded-lg bg-brand px-3 font-display text-xs font-semibold text-white disabled:opacity-50">
        {busy ? "Checking…" : "Check Metabase connection"}
      </button>
      {error && <div className="text-sm text-status-critical">{error}</div>}
      {res && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <div className="font-medium text-ink">{res.verdict}</div>
          <ul className="space-y-0.5 text-xs text-slate-500">
            <li>Metabase address the app uses: <span className="font-mono">{res.base_url}</span></li>
            <li>
              Key: {res.key_present ? `${res.key_length} characters` : "not set"}
              {res.key_present && (res.key_starts_with_mb_ ? ", starts with mb_ (looks like a Metabase API key)" : ", does NOT start with mb_")}
              {res.key_had_spaces_or_quotes && ", had spaces / quotes around it (removed)"}
            </li>
            {res.checks.map((c) => (
              <li key={c.name}>
                {c.name}: {c.error ? `failed (${c.error})` : `HTTP ${c.status}`}
                {c.content_type ? ` · ${c.content_type}` : ""}
                {c.redirect ? ` · redirects to ${c.redirect}` : ""}
                {c.snippet ? <div className="ml-3 font-mono text-[11px] text-slate-400">{c.snippet}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
