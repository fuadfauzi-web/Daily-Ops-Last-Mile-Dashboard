import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { formatTime } from "./lib/format";
import RegionListPanel from "./RegionListPanel";

// Superadmin -> Documents (2026-10-08).
//   1. Metabase pulls: the KPI / Recovery feeder files are pulled from Metabase by the app itself (Metabase API, questions in the Last Mile collection) on a schedule the Superadmin sets
//      per file -- every day at a time, every N hours, one weekday a week, one day a month. The default is every day at 06:00 (Metabase refreshes then); Lost Declared Tuesday to Sunday.
//   2. Other documents: what is still uploaded by hand (no Metabase source) -- the weekly KPI results, the POD performance workbook, hub sizes, the OPEX download, driver details.
//   3. The Station List.
const DAYS = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [7, "Sun"],
];
const MODE_LABEL = { daily: "On chosen days, once a day", hourly: "Every few hours", weekly: "Once a week", monthly: "Once a month", off: "Off (not pulled)" };

function Card({ title, right, children }) {
  return (
    <div className="rounded-[10px] bg-white p-3.5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-[14px] font-semibold text-ink">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Chip({ tone, children }) {
  const cls = {
    good: "bg-[#DCFCE7] text-[#166534]",
    warn: "bg-[#FEF3C7] text-[#92400E]",
    bad: "bg-[#FEE2E2] text-[#991B1B]",
    mute: "bg-canvas text-muted",
  }[tone];
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{children}</span>;
}

function FeedStatus({ f }) {
  if (f.running) return <Chip tone="warn">Pulling…</Chip>;
  if (f.mode === "off") return <Chip tone="mute">Off</Chip>;
  if (f.problem) return <Chip tone="bad">{f.last_status === "error" ? "Failed" : "Overdue"}</Chip>;
  if (f.last_ok_at) return <Chip tone="good">OK</Chip>;
  return <Chip tone="mute">Not pulled yet</Chip>;
}

// the schedule editor of one file (a row that opens under it)
function ScheduleEditor({ feed, questions, onSaved, onClose }) {
  const [mode, setMode] = useState(feed.mode);
  const [time, setTime] = useState(feed.run_time);
  const [days, setDays] = useState(feed.weekdays);
  const [monthDay, setMonthDay] = useState(feed.month_day);
  const [every, setEvery] = useState(feed.every_hours);
  const [qid, setQid] = useState(String(feed.question_id));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const toggle = (d) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const showDays = mode === "daily" || mode === "hourly";

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      let weekdays = days;
      if (mode === "weekly") weekdays = [days[0] || 1];
      await api.metabaseSaveFeed(feed.dataset, {
        question_id: Number(qid) || null,
        mode,
        run_time: time,
        weekdays,
        month_day: Number(monthDay) || 1,
        every_hours: Number(every) || 4,
      });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const inCollection = questions.some((q) => String(q.id) === String(qid));
  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-slate-500">
          Metabase question
          <div className="mt-1 flex items-center gap-2">
            <input
              value={qid}
              onChange={(e) => setQid(e.target.value.replace(/\D/g, ""))}
              className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-ink"
              inputMode="numeric"
              aria-label="Metabase question number"
            />
            {questions.length > 0 && (
              <select value={inCollection ? qid : ""} onChange={(e) => e.target.value && setQid(e.target.value)} className="max-w-[320px] rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-ink" aria-label="Pick from the Last Mile collection">
                <option value="">Pick from the collection…</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.id} · {q.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </label>
        <label className="text-xs text-slate-500">
          When
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-ink">
            {Object.entries(MODE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {mode !== "off" && (
          <label className="text-xs text-slate-500">
            {mode === "hourly" ? "First pull at" : "At"} (Malaysia time)
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-ink" required />
          </label>
        )}
        {mode === "hourly" && (
          <label className="text-xs text-slate-500">
            Then every
            <div className="mt-1 flex items-center gap-1.5">
              <select value={every} onChange={(e) => setEvery(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-ink">
                {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-sm text-slate-600">hours, until midnight</span>
            </div>
          </label>
        )}
        {mode === "monthly" && (
          <label className="text-xs text-slate-500">
            Day of the month
            <input type="number" min={1} max={31} value={monthDay} onChange={(e) => setMonthDay(e.target.value)} className="mt-1 block w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-ink" />
          </label>
        )}
      </div>
      {(showDays || mode === "weekly") && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">{mode === "weekly" ? "On" : "Days"}</span>
          {DAYS.map(([d, label]) =>
            mode === "weekly" ? (
              <label key={d} className="flex items-center gap-1 text-sm text-slate-700">
                <input type="radio" name={`wd-${feed.dataset}`} checked={days[0] === d} onChange={() => setDays([d])} />
                {label}
              </label>
            ) : (
              <label key={d} className="flex items-center gap-1 text-sm text-slate-700">
                <input type="checkbox" checked={days.includes(d)} onChange={() => toggle(d)} />
                {label}
              </label>
            )
          )}
        </div>
      )}
      {err && <div className="text-sm text-status-critical">{err}</div>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} className="text-sm text-slate-500 hover:underline">
          Cancel
        </button>
        <span className="text-xs text-slate-400">A change applies from the next scheduled time; "Pull now" runs it straight away.</span>
      </div>
    </div>
  );
}

function MetabasePulls() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [check, setCheck] = useState(null);
  const timer = useRef(null);

  const load = (refresh = false) =>
    api
      .metabaseFeeds(refresh)
      .then((d) => {
        setData(d);
        setError(null);
        return d;
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // while something is being pulled, keep looking every few seconds
  useEffect(() => {
    clearTimeout(timer.current);
    if (data && (data.pull_all_running || data.feeds.some((f) => f.running))) timer.current = setTimeout(() => load(), 4000);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const afterChange = () => {
    window.dispatchEvent(new Event("notifications-changed")); // the bell recounts
    return load();
  };
  const pullOne = async (f) => {
    setMsg(null);
    setData((d) => ({ ...d, feeds: d.feeds.map((x) => (x.dataset === f.dataset ? { ...x, running: true } : x)) }));
    try {
      const r = await api.metabasePull(f.dataset);
      setMsg({ kind: "ok", text: r.detail });
    } catch (e) {
      setMsg({ kind: "error", text: `${f.label}: ${e.message}` });
    }
    afterChange();
  };
  const pullAll = async () => {
    setMsg(null);
    try {
      const r = await api.metabasePullAll();
      setMsg({ kind: "ok", text: r.detail });
      setTimeout(load, 1500);
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    }
  };
  const runCheck = async () => {
    setCheck({ loading: true });
    try {
      setCheck(await api.metabaseCheck());
    } catch (e) {
      setCheck({ verdict: e.message });
    }
  };

  if (data === null) return <div className="text-slate-500">{error || "Loading…"}</div>;
  const problems = data.feeds.filter((f) => f.problem).length;
  const anyRunning = data.pull_all_running || data.feeds.some((f) => f.running);

  return (
    <Card
      title="Metabase pulls"
      right={
        <span className={`text-xs font-semibold ${problems ? "text-[#92400E]" : "text-status-good"}`}>
          {!data.configured ? "Not connected" : problems ? `${problems} of ${data.feeds.length} need attention` : `All ${data.feeds.length} files on schedule`}
        </span>
      }
    >
      <p className="mt-1 text-xs text-slate-500">
        The app pulls these files from Metabase by itself -- nothing to download or upload. Every question must be inside the{" "}
        <a href={data.collection_url} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-700 underline hover:text-sky-900">
          Last Mile collection ↗
        </a>
        . Metabase refreshes at 06:00, so the default is one pull a day at 06:00 (Malaysia time); change any file's schedule below.
      </p>
      {!data.configured && (
        <div className="mt-3 rounded-lg bg-[#FEF3C7] px-3 py-2 text-sm text-[#92400E]">
          The Metabase API key is not set on this app. In the Substrait portal add the secret <span className="font-mono">METABASE_API_KEY</span> (Settings → Secrets) and redeploy -- nothing is pulled until it is.
        </div>
      )}
      {data.collection_error && data.configured && <div className="mt-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">Could not read the Last Mile collection: {data.collection_error}</div>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={pullAll} disabled={!data.configured || anyRunning} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {data.pull_all_running ? "Pulling everything…" : "Pull everything now"}
        </button>
        <button onClick={() => load(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Refresh list
        </button>
        <button onClick={runCheck} className="text-sm text-slate-500 underline hover:text-slate-700">
          Check the connection
        </button>
      </div>
      {check && (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">{check.loading ? "Checking…" : check.verdict}</div>
      )}
      {msg && <div className={`mt-2 text-sm ${msg.kind === "ok" ? "text-status-good" : "text-status-critical"}`}>{msg.text}</div>}

      <div className="mt-3 overflow-x-auto rounded-lg ring-1 ring-slate-200">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">File</th>
              <th className="px-3 py-2 font-medium">Metabase question</th>
              <th className="px-3 py-2 font-medium">Schedule (Malaysia time)</th>
              <th className="px-3 py-2 font-medium">Last pull</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {data.feeds.map((f) => (
              <FeedRows key={f.dataset} f={f} data={data} editing={editing === f.dataset} onEdit={() => setEditing(editing === f.dataset ? null : f.dataset)} onPull={() => pullOne(f)} onSaved={() => { setEditing(null); afterChange(); }} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FeedRows({ f, data, editing, onEdit, onPull, onSaved }) {
  return (
    <>
      <tr className="border-t border-slate-100 align-top">
        <td className="px-3 py-2">
          <div className="font-medium text-slate-800">{f.label}</div>
          <FeedStatus f={f} />
        </td>
        <td className="px-3 py-2 text-xs text-slate-600">
          <a href={`${data.base_url}/question/${f.question_id}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sky-700 underline hover:text-sky-900">
            {f.question_id} ↗
          </a>
          {f.question_name && <div className="text-slate-500">{f.question_name}</div>}
          {f.in_collection === false && <div className="mt-0.5 font-medium text-[#92400E]">Not in the Last Mile collection yet</div>}
          {f.question_id !== f.default_question_id && <div className="text-[11px] text-slate-400">built with #{f.default_question_id}</div>}
        </td>
        <td className="px-3 py-2 text-xs text-slate-600">
          <div>{f.schedule}</div>
          {f.next_run_at && f.mode !== "off" && <div className="text-[11px] text-slate-400">Next: {formatTime(f.next_run_at)}</div>}
        </td>
        <td className="px-3 py-2 text-xs text-slate-600">
          {f.last_attempt_at ? (
            <>
              <div>
                {formatTime(f.last_attempt_at)} · {f.last_by || "—"}
                {f.last_seconds != null && ` · ${f.last_seconds}s`}
              </div>
              <div className={f.last_status === "error" ? "text-status-critical" : "text-slate-500"}>{f.last_status === "error" ? f.last_message : f.last_rows != null ? `${f.last_rows.toLocaleString()} rows` : f.last_message}</div>
              {f.last_status === "error" && f.last_ok_at && <div className="text-[11px] text-slate-400">Last good pull: {formatTime(f.last_ok_at)}</div>}
            </>
          ) : (
            <span className="text-slate-400">Never</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right">
          <button onClick={onEdit} className="mr-3 text-xs text-brand hover:underline">
            {editing ? "Close" : "Edit"}
          </button>
          <button onClick={onPull} disabled={f.running || !data.configured} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            {f.running ? "Pulling…" : "Pull now"}
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="border-t border-slate-100">
          <td colSpan={5} className="px-3 py-2">
            <ScheduleEditor feed={f} questions={data.questions} onSaved={onSaved} onClose={onEdit} />
          </td>
        </tr>
      )}
    </>
  );
}

function ManualStatus({ u }) {
  return u.filename ? <Chip tone="mute">Loaded</Chip> : <Chip tone="warn">Nothing uploaded</Chip>;
}

export default function DocumentsPage({ me, driverDetails, onChanged }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () =>
    api
      .kpiUploads()
      .then(setItems)
      .catch((e) => setMsg({ kind: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []);
  const changed = async () => {
    await load();
    onChanged?.();
  };

  const pick = async (dataset, file) => {
    if (!file) return;
    setBusy(dataset);
    setMsg(null);
    try {
      const res = await api.kpiUpload(dataset, file);
      setMsg({ kind: "ok", text: res.detail });
      await changed();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  };
  const remove = async (dataset) => {
    setBusy(dataset);
    setMsg(null);
    try {
      await api.kpiUploadRemove(dataset);
      await changed();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  };

  // what is not a Metabase question is still uploaded by hand
  const manual = (items || []).filter((u) => !u.metabase && u.dataset !== "region_list");

  const docCard = (u) => (
    <Card key={u.dataset} title={u.label} right={<ManualStatus u={u} />}>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{u.hint}</p>
      {u.link && (
        <a href={u.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-sky-700 underline hover:text-sky-900">
          {u.link_label || "Open the source"} ↗
        </a>
      )}
      <div className="mt-2 text-xs text-slate-600">
        {u.filename ? (
          <>
            <span className="font-medium text-ink">{u.filename}</span> · {u.row_count?.toLocaleString()} rows
            <div className="text-[11px] text-slate-400">
              {formatTime(u.uploaded_at)} · {u.uploaded_by}
            </div>
          </>
        ) : (
          <span className="text-slate-400">Nothing uploaded yet</span>
        )}
      </div>
      {u.can_upload && (
        <div className="mt-2 flex items-center gap-3">
          <label className={`inline-flex min-h-[36px] cursor-pointer items-center rounded-lg border border-slate-300 px-3 font-display text-xs font-medium text-ink-2 hover:bg-canvas ${busy ? "pointer-events-none opacity-50" : ""}`}>
            {busy === u.dataset ? "Uploading…" : u.filename ? "Replace file" : "Choose file"}
            <input
              type="file"
              accept=".csv,.xlsx,.xlsm"
              className="sr-only"
              onChange={(e) => {
                pick(u.dataset, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {u.filename && (
            <button onClick={() => remove(u.dataset)} disabled={!!busy} className="text-xs font-medium text-slate-500 underline hover:text-status-critical disabled:opacity-40">
              Remove
            </button>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      <MetabasePulls />

      <div>
        <div className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-subtle">Other documents -- uploaded by hand</div>
        {msg && <div className={`mb-2 text-sm ${msg.kind === "ok" ? "text-status-good" : "text-status-critical"}`}>{msg.text}</div>}
        {items === null ? (
          <div className="text-slate-500">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {manual.map(docCard)}
            {driverDetails && <Card title="Driver / rider details (Route Monitoring tenure)">{driverDetails}</Card>}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-subtle">Station list</div>
        <RegionListPanel me={me} />
      </div>
    </div>
  );
}
