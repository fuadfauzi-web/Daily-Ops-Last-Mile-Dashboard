import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

// My workspace (the South Management sheet's Link tab, and a notes page): the manager's own links with a category and a due date ("Every 20th", "End of month"), and one free notes page.
// Private -- only the person who types it can read it.

const EMPTY = { category: "", title: "", url: "", due_text: "" };
const field = "min-h-[36px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-ink focus:border-brand focus:outline-none";

function LinkForm({ value, categories, onSave, onCancel, busy, saveLabel }) {
  const [v, setV] = useState(value);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
      className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1.6fr_1fr_auto]"
    >
      <input className={field} list="mgr-link-categories" value={v.category} onChange={set("category")} placeholder="Category (e.g. HR Payroll)" maxLength={80} aria-label="Category" />
      <input className={field} value={v.title} onChange={set("title")} placeholder="Name" maxLength={200} required aria-label="Name" />
      <input className={field} value={v.url} onChange={set("url")} placeholder="https://…" maxLength={1000} aria-label="Link address" />
      <input className={field} value={v.due_text} onChange={set("due_text")} placeholder="Due (e.g. Every 20th)" maxLength={120} aria-label="Due" />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="min-h-[36px] rounded-lg bg-brand px-3 font-display text-xs font-semibold text-white disabled:opacity-50">
          {saveLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-slate-500 underline">
            Cancel
          </button>
        )}
      </div>
      <datalist id="mgr-link-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </form>
  );
}

function Links({ setError }) {
  const [links, setLinks] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.managerLinks().then(setLinks).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => [...new Set((links || []).map((l) => l.category).filter(Boolean))].sort(), [links]);
  const groups = useMemo(() => {
    const m = new Map();
    (links || []).forEach((l) => {
      const k = l.category || "Other";
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(l);
    });
    return [...m.entries()].sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  }, [links]);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div>
        <div className="font-display text-sm font-bold text-ink">Links &amp; due dates</div>
        <div className="text-[11px] text-slate-400">Your own list -- payroll and OT submissions, trackers, forms. Only you can see it.</div>
      </div>
      <LinkForm value={EMPTY} categories={categories} busy={busy} saveLabel="Add" onSave={(v) => run(async () => { await api.managerLinkAdd(v); })} key={links?.length ?? 0} />
      {links === null ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : links.length === 0 ? (
        <div className="text-sm text-slate-400">Nothing saved yet -- add your first link above.</div>
      ) : (
        <div className="space-y-4">
          {groups.map(([cat, items]) => (
            <div key={cat}>
              <div className="mb-1 font-display text-[11px] font-bold uppercase tracking-wider text-subtle">{cat}</div>
              <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
                {items.map((l) =>
                  editing === l.id ? (
                    <li key={l.id} className="p-2">
                      <LinkForm value={l} categories={categories} busy={busy} saveLabel="Save" onCancel={() => setEditing(null)} onSave={(v) => run(async () => { await api.managerLinkEdit(l.id, v); setEditing(null); })} />
                    </li>
                  ) : (
                    <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        {l.url ? (
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-700 underline hover:text-sky-900">
                            {l.title} ↗
                          </a>
                        ) : (
                          <span className="font-medium text-ink">{l.title}</span>
                        )}
                      </span>
                      {l.due_text && <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">{l.due_text}</span>}
                      <span className="flex gap-3 text-xs">
                        <button onClick={() => setEditing(l.id)} className="text-slate-500 underline hover:text-ink">
                          Edit
                        </button>
                        <button
                          onClick={() => window.confirm(`Remove "${l.title}"?`) && run(() => api.managerLinkDelete(l.id))}
                          className="text-slate-500 underline hover:text-status-critical"
                        >
                          Remove
                        </button>
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Notes({ setError }) {
  const [body, setBody] = useState(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.managerNotes().then((n) => { setBody(n.body); setSaved(n.body); }).catch((e) => setError(e.message));
  }, []);
  const save = async () => {
    setBusy(true);
    try {
      const n = await api.managerNotesSave({ body });
      setSaved(n.body);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const dirty = body !== null && body !== saved;
  return (
    <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-display text-sm font-bold text-ink">Notes</div>
          <div className="text-[11px] text-slate-400">Your own page -- reminders, follow-ups, things to raise. Only you can see it.</div>
        </div>
        <div className="flex items-center gap-3">
          {dirty ? <span className="text-xs text-status-warning">Not saved</span> : body !== null && <span className="text-xs text-slate-400">Saved</span>}
          <button onClick={save} disabled={!dirty || busy} className="min-h-[36px] rounded-lg bg-brand px-3 font-display text-xs font-semibold text-white disabled:opacity-40">
            {busy ? "Saving…" : "Save notes"}
          </button>
        </div>
      </div>
      <textarea
        value={body ?? ""}
        onChange={(e) => setBody(e.target.value)}
        disabled={body === null}
        rows={14}
        maxLength={20000}
        placeholder="Type here…"
        className="w-full rounded-lg border border-slate-300 p-3 text-sm text-ink focus:border-brand focus:outline-none"
      />
    </div>
  );
}

export default function Workspace({ setError }) {
  return (
    <div className="space-y-4">
      <Links setError={setError} />
      <Notes setError={setError} />
    </div>
  );
}
