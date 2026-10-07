import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { BOARD_COLUMNS } from "./lib/actionMetrics";
import { resolveThreshold } from "./lib/thresholds";
import TabBar from "./components/TabBar";
import FeedbackPanel from "./FeedbackPanel";
import GuideTab from "./GuideTab";
import KpiTargetsPanel from "./KpiTargetsPanel";
import DocumentsPage from "./DocumentsPage";
import DepartmentsPanel from "./DepartmentsPanel";
import KpiUploadPanel from "./kpi/KpiUploadPanel";
import { useWhatsNewUnread } from "./lib/whatsNew";
import MultiSelect from "./components/MultiSelect";
import LaunchTimelinePanel from "./LaunchTimelinePanel";
import { GROUPS, POSITIONS, canManagePosition, isHqTier } from "./lib/roles";

// Route Monitoring's Productivity % isn't a Station Health/Action Board metric (it's
// not summable as a station-level count the way the rest of BOARD_COLUMNS are),
// so it's kept out of BOARD_COLUMNS entirely and only added here for editing.
const ADMIN_METRICS = [...BOARD_COLUMNS, { key: "productivity_pct", label: "Productivity (Route Monitoring)" }];

// Productivity is scored per driver position rather than per region -- reuses
// the exact same (metric_key, scope) mechanism as the region overrides below,
// just with a driver position label as the scope string instead of a region name.
const DRIVER_POSITION_SCOPES = ["Hybrid Driver", "Hybrid Rider", "Independent Driver", "Independent Rider"];

const emptyForm = { email: "", role: "fleet_assistant", scope_type: "station", scope_values: [], department: "Last Mile" };
// Roles are job positions (lib/roles.js): HQ staff, Region staff, Station staff. The old 'region' / 'station' titles are still
// shown for people who have none yet, but no longer offered.
const ROLE_LABELS = Object.fromEntries(Object.entries(POSITIONS).map(([k, v]) => [k, v.label]));
// "Sees: a station/zone/region" -- can be granted more than one, see the
// multi-select in the add/edit form below. "HQ" is for HQ staff, who have no dedicated region / zone / station.
const SCOPE_LABELS = { station: "Sees: station(s)", zone: "Sees: zone(s)", region: "Sees: region(s)", all: "Sees: everything", hq: "HQ (no region / zone / station)" };
const SCOPE_OPTION_ORDER = ["station", "zone", "region", "hq", "all"];

// Only the app owner can grant the Admin role -- mirrors backend/main.py's
// _OWNER_EMAIL/_require_can_grant_role exactly. An admin who isn't the owner
// still can't create more admins.
const OWNER_EMAIL = "fuad.mawardi@ninjavan.co";

// What each acting role is allowed to hand out -- mirrors backend/main.py's
// _validate_grant_limits exactly, so the dropdowns/template never offer
// something the server would reject.
function allowedRoles(me) {
  const all = GROUPS.flatMap((g) => g.positions);
  // The Superadmin role itself is only ever granted by the owner.
  return all.filter((p) => canManagePosition(me, p) && (p !== "admin" || me.email === OWNER_EMAIL));
}
function allowedScopeTypes(actingRole) {
  if (actingRole === "manager") return ["station", "zone", "region", "hq"];
  if (actingRole === "region") return ["station"];
  return SCOPE_OPTION_ORDER; // admin
}

// Edit/delete permission on an existing user -- mirrors backend/main.py's
// _require_can_manage_target exactly (keyed off the TARGET's current position's tier).
function canManageTarget(me, targetRole) {
  return canManagePosition(me, targetRole);
}

// scope_values within one CSV cell is semicolon-separated, e.g. "Southern;Northern".
function bulkTemplateFor(me) {
  const lines = ["email,role,scope_type,scope_values,department"];
  if (me.role === "region") {
    lines.push("name1@ninjavan.co,fleet_assistant,station,Larkin,Last Mile", "name2@ninjavan.co,station_head,station,Segambut;Larkin,Last Mile");
  } else if (me.role === "manager") {
    lines.push("name1@ninjavan.co,fleet_assistant,station,Larkin,Last Mile", "name2@ninjavan.co,rfs,zone,South 1,Last Mile", "name3@ninjavan.co,region_head,region,Southern;Northern,Last Mile", "name4@ninjavan.co,recovery,hq,,Recovery");
  } else {
    lines.push(
      "name1@ninjavan.co,fleet_assistant,station,Larkin,Last Mile",
      "name2@ninjavan.co,rfs,zone,South 1,Last Mile",
      "name3@ninjavan.co,region_head,region,Southern;Northern,Last Mile",
      "name4@ninjavan.co,recovery,hq,,Recovery"
    );
    if (me.email === OWNER_EMAIL) lines.push("name5@ninjavan.co,admin,all,,");
  }
  return lines.join("\n");
}

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTime(iso) {
  if (!iso) return "Never";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

// Each line: email,role,scope_type,scope_values -- scope_values is
// semicolon-separated within its cell (e.g. "Southern;Northern") for more than
// one region/zone/station. A leading header line is skipped so pasting the
// template as-is (with or without editing it) works.
function parseBulkRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^email\s*,\s*role\s*,\s*scope_type/i.test(l));
  return lines.map((line) => {
    const [email, role, scope_type, scopeValuesCell, department] = line.split(",").map((p) => (p ?? "").trim());
    const scope_values =
      !scope_type || scope_type === "all" || scope_type === "hq"
        ? []
        : (scopeValuesCell || "").split(";").map((v) => v.trim()).filter(Boolean);
    return {
      email,
      role: role || "fleet_assistant",
      scope_type: scope_type || "station",
      scope_values,
      department: department || null, // optional 5th column: the department's name, e.g. Last Mile
    };
  });
}

const DIRECTION_LABELS = { "higher-is-worse": "Higher is worse", "lower-is-worse": "Lower is worse" };

// Settings -> SLA Targets: the thresholds behind Station Health's severity
// colouring, editable in the app instead of hardcoded (see lib/thresholds.js
// and backend V13__sla_thresholds.sql). One scope at a time -- Nationwide
// default, or a region override -- edited as a local draft and saved explicitly.
function SlaTargetsPanel({ regions, me }) {
  const [rows, setRows] = useState(null);
  // 2026-10-04: the HOD sets the nationwide numbers (and the per-driver-type ones), a Manager sets their own region's, the Superadmin sets any. The server checks it too.
  const mayEdit = (sc) =>
    me.role === "admin" ||
    (me.position === "hod" && (sc === "nationwide" || DRIVER_POSITION_SCOPES.includes(sc))) ||
    (me.role === "manager" && me.position !== "hod" && regions.some((r) => r.region === sc));
  const [scope, setScope] = useState(me.position === "manager" && regions[0] ? regions[0].region : "nationwide");
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Braces matter here: an expression-bodied arrow returns the promise chain,
  // and useEffect treats whatever its callback returns as the cleanup
  // function -- React would later try to call that leftover promise as a
  // function on unmount ("n is not a function"), crashing on every tab switch.
  const load = () => {
    api.thresholds.list().then(setRows).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  useEffect(() => {
    if (!rows) return;
    const next = {};
    ADMIN_METRICS.forEach((c) => {
      next[c.key] = { ...resolveThreshold(rows, c.key, scope === "nationwide" ? null : scope) };
    });
    setDraft(next);
    setSaved(false);
  }, [rows, scope]);

  if (!rows) return <div className="text-slate-500">Loading…</div>;

  const updateField = (key, field, value) => {
    setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = ADMIN_METRICS.map((c) => ({
        metric_key: c.key,
        scope,
        scored: !!draft[c.key].scored,
        direction: draft[c.key].direction,
        warning_at: Number(draft[c.key].warning_at) || 0,
        critical_at: Number(draft[c.key].critical_at) || 0,
        percent_of: draft[c.key].percent_of || null,
        min_count_warning: draft[c.key].min_count_warning === "" || draft[c.key].min_count_warning == null ? null : Number(draft[c.key].min_count_warning),
        min_count_critical: draft[c.key].min_count_critical === "" || draft[c.key].min_count_critical == null ? null : Number(draft[c.key].min_count_critical),
      }));
      await api.thresholds.save(payload);
      setSaved(true);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-lg border border-slate-300 text-xs font-medium">
          <button
            onClick={() => setScope("nationwide")}
            className={`px-3 py-1.5 ${scope === "nationwide" ? "bg-ink text-white" : "bg-white text-slate-600"}`}
          >
            Nationwide default
          </button>
          {regions.map((r) => (
            <button
              key={r.region}
              onClick={() => setScope(r.region)}
              className={`border-l border-slate-300 px-3 py-1.5 ${scope === r.region ? "bg-ink text-white" : "bg-white text-slate-600"}`}
            >
              {r.region}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">Driver type (Productivity only):</span>
          <div className="flex flex-wrap overflow-hidden rounded-lg border border-slate-300 text-xs font-medium">
            {DRIVER_POSITION_SCOPES.map((p, i) => (
              <button
                key={p}
                onClick={() => setScope(p)}
                className={`px-3 py-1.5 ${i > 0 ? "border-l border-slate-300" : ""} ${scope === p ? "bg-ink text-white" : "bg-white text-slate-600"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">Applies at the next refresh</span>
          <button
            onClick={save}
            disabled={saving || !mayEdit(scope)}
            title={mayEdit(scope) ? undefined : "You can't change this scope"}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save targets"}
          </button>
        </div>
      </div>

      {!mayEdit(scope) && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
          You can look at this scope but not change it. The HOD sets the nationwide numbers, a Manager sets their own region, and the Superadmin sets any.
        </p>
      )}
      {scope !== "nationwide" && (
        <p className="text-xs text-slate-400">
          Rows here fall back to the Nationwide default until you change a value and save — that only overrides{" "}
          {scope}.
        </p>
      )}

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink text-left text-white">
              <tr>
                <th className="whitespace-nowrap px-4 py-2 font-display font-medium">Metric</th>
                <th className="whitespace-nowrap px-4 py-2 text-center font-display font-medium">Scored</th>
                <th className="whitespace-nowrap px-4 py-2 font-display font-medium">Direction</th>
                <th className="whitespace-nowrap px-4 py-2 text-right font-display font-medium">Warning at</th>
                <th className="whitespace-nowrap px-4 py-2 text-right font-display font-medium">Critical at</th>
                <th className="whitespace-nowrap px-4 py-2 font-display font-medium">Score as % of</th>
                <th className="whitespace-nowrap px-4 py-2 text-right font-display font-medium" title="Optional: a warning / critical also needs at least this many parcels">Warning also needs ≥ parcels</th>
                <th className="whitespace-nowrap px-4 py-2 text-right font-display font-medium" title="Optional: a warning / critical also needs at least this many parcels">Critical also needs ≥ parcels</th>
                <th className="whitespace-nowrap px-4 py-2 font-display font-medium">Last changed</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_METRICS.map((c, i) => {
                const d = draft[c.key];
                if (!d) return null;
                return (
                  <tr key={c.key} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/50" : ""}`}>
                    <td className={`whitespace-nowrap px-4 py-2 font-medium ${d.scored ? "text-ink" : "text-slate-400"}`}>
                      {c.label}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" disabled={!mayEdit(scope)} checked={!!d.scored} onChange={(e) => updateField(c.key, "scored", e.target.checked)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <select
                        disabled={!d.scored || !mayEdit(scope)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                        value={d.direction}
                        onChange={(e) => updateField(c.key, "direction", e.target.value)}
                      >
                        {Object.entries(DIRECTION_LABELS).map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        disabled={!d.scored || !mayEdit(scope)}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs tabular-nums disabled:bg-slate-100 disabled:text-slate-400"
                        value={d.warning_at}
                        onChange={(e) => updateField(c.key, "warning_at", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        disabled={!d.scored || !mayEdit(scope)}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs tabular-nums disabled:bg-slate-100 disabled:text-slate-400"
                        value={d.critical_at}
                        onChange={(e) => updateField(c.key, "critical_at", e.target.value)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <select
                        disabled={!d.scored || !mayEdit(scope)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                        value={d.percent_of || ""}
                        onChange={(e) => updateField(c.key, "percent_of", e.target.value || null)}
                      >
                        <option value="">Raw count</option>
                        {ADMIN_METRICS.filter((m) => m.key !== c.key).map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    {["min_count_warning", "min_count_critical"].map((f) => (
                      <td key={f} className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          placeholder="—"
                          disabled={!d.scored || !mayEdit(scope)}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs tabular-nums disabled:bg-slate-100 disabled:text-slate-400"
                          value={d[f] ?? ""}
                          onChange={(e) => updateField(c.key, f, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                      {d.changed_by ? `${formatTime(d.changed_at)} · ${d.changed_by}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          Turn Scored off and the metric becomes reference-only everywhere at once: grey column header, never
          coloured. Direction/Warning/Critical are disabled while a metric is unscored. "Score as % of" evaluates
          Warning/Critical against this metric's value as a percentage of the chosen field on the same row (e.g. Age
          &gt;3 as % of Total In Hub) instead of its raw count -- leave as Raw count for everything else.
        </div>
      </div>
    </div>
  );
}

// Settings -> Recovery Settings: the "high value" highlighting rule behind
// Recovery -> Missing Details' TN list (see backend V19__recovery_settings.sql
// and aggregate.py's build_missing_details). A single nationwide row, no
// per-region override -- much simpler than SlaTargetsPanel above.
function RecoverySettingsPanel({ me }) {
  const canEditCod = me.role === "admin"; // 2026-10-04: the COD value is the Superadmin's; the item keywords are the HOD's / Manager's / Recovery's
  const [settings, setSettings] = useState(null);
  const [threshold, setThreshold] = useState("");
  const [keywords, setKeywords] = useState([]); // one item per keyword
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    api.recoverySettings
      .get()
      .then((s) => {
        setSettings(s);
        setThreshold(String(s.high_cod_value_threshold));
        setKeywords(s.high_value_item_keywords);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.recoverySettings.save({ high_cod_value_threshold: Number(threshold) || 0, high_value_item_keywords: keywords });
      setSaved(true);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">
          {error}
        </div>
      )}
      <div className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div>
          <div className="font-display text-sm font-semibold text-slate-700">High COD value threshold</div>
          <p className="mb-2 text-xs text-slate-400">
            A missing tracking number is highlighted when its COD value is at or above this amount. {canEditCod ? "" : "Only the Superadmin can change it."}
          </p>
          <input
            type="number"
            disabled={!canEditCod}
            className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm tabular-nums disabled:bg-slate-100 disabled:text-slate-500"
            value={threshold}
            onChange={(e) => {
              setThreshold(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div>
          <div className="font-display text-sm font-semibold text-slate-700">High-value item keywords</div>
          <p className="mb-2 text-xs text-slate-400">
            A missing tracking number is also highlighted when its item description contains any of these words (case-insensitive) -- e.g. smartphone, laptop,
            gold. Add one at a time; remove one with its ×.
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {keywords.length === 0 && <span className="text-xs text-slate-400">No keywords yet.</span>}
            {keywords.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 font-display text-xs font-semibold text-white">
                {k}
                <button
                  type="button"
                  aria-label={`Remove ${k}`}
                  onClick={() => {
                    setKeywords(keywords.filter((x) => x !== k));
                    setSaved(false);
                  }}
                  className="text-white/70 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const k = newKeyword.trim().toLowerCase();
              if (!k || keywords.includes(k)) return;
              setKeywords([...keywords, k]);
              setNewKeyword("");
              setSaved(false);
            }}
          >
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Add a keyword and press Enter"
              className="min-h-[44px] w-72 rounded-lg border border-slate-300 px-3 text-sm"
            />
            <button type="submit" disabled={!newKeyword.trim()} className="min-h-[44px] rounded-lg border border-slate-300 px-4 font-display text-xs font-semibold text-ink-2 disabled:opacity-40">
              Add
            </button>
          </form>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {settings.changed_by ? `Last changed ${formatTime(settings.changed_at)} · ${settings.changed_by}` : "Never changed"}
            {" · applies at the next refresh"}
          </span>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Settings -> Documents: upload the driver/rider list details CSV that Routed
// View's Tenure column is joined from (see backend/main.py's
// upload_driver_details -- "Display Name" must match the driver_name
// convention, e.g. "KEP - ID - NOR IKHWAN"). Only one document type for now;
// the whole table is replaced on each upload, so re-upload whenever there's a
// new export rather than trying to patch it in the app.
function DocumentsPanel() {
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  // Braces matter here -- see SlaTargetsPanel's note above: an expression-bodied
  // arrow would return the promise chain, and useEffect would try to call that
  // as its cleanup function on unmount ("n is not a function").
  const load = () => {
    api.driverDetails.status().then(setStatus).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setResult(null);
    if (!/\.csv$/i.test(file.name)) {
      setError("Please upload a .csv file.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const res = await api.driverDetails.upload(file);
      setResult(res.detail || "Upload complete");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">
          {error}
        </div>
      )}
      <div className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div>
          <div className="font-display text-sm font-semibold text-slate-700">Driver / rider list details</div>
          <p className="mb-3 text-xs text-slate-400">
            Powers Route Monitoring's driver Tenure column. Upload the driver/rider details export as-is (columns: ID,
            Display Name, Hub Name, Hub Region, Zone, Driver Type, Employment Start Date, Employment End Date) — Display
            Name must match the driver name format used elsewhere in the app (e.g. "KEP - ID - NOR IKHWAN"). Upload
            daily or whenever there's a new export; each upload fully replaces the previous one.
          </p>
          <div className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-sky-200">
            <a
              href="https://metabase.ninjavan.co/question/126968-active-driver-details"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-700 underline hover:text-sky-900"
            >
              Open the active driver / rider list in Metabase ↗
            </a>{" "}
            -- download the results as a .csv, then upload it below. (Temporary: this link and the manual upload go away once the Metabase API access is in place.)
          </div>
          <label className="inline-block cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
            {uploading ? "Uploading…" : "Upload CSV"}
            <input type="file" accept=".csv" onChange={onFileChange} disabled={uploading} className="hidden" />
          </label>
          {fileName && <span className="ml-2 text-xs text-slate-500">{fileName}</span>}
        </div>

        {result && (
          <div className="rounded-lg bg-status-good/10 px-3 py-2 text-xs font-medium text-status-good">{result}</div>
        )}

        <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
          {status?.uploaded_at ? (
            <>
              Last uploaded: <span className="font-medium text-slate-700">{formatTime(status.uploaded_at)}</span> by{" "}
              {status.uploaded_by} · {status.filename} · {status.row_count?.toLocaleString()} rows
            </>
          ) : (
            "No file uploaded yet."
          )}
        </div>
      </div>
    </div>
  );
}

// Two areas share this file (2026-09-25 feedback):
//   Settings -- what any role may reach: Users (admin/manager/region), SLA Targets and Recovery
//               Settings (admin/manager), plus Feedback and Guide (everyone).
//   Admin    -- only what solely an admin can change (Documents, Station List, KPI Settings, Data Refresh); the Admin page
//               itself is admin-only.
const SETTINGS_TABS = [
  { key: "users", label: "Users", area: "users", visible: (me) => me.role === "admin" || me.role === "manager" || me.role === "region" },
  // Settings (2026-10-04): Station Metric Targets (HOD nationwide, Manager their region, Superadmin any), KPI Targets (HOD / OPEX), KPI Settings (HOD / OPEX / Manager),
  // Recovery Settings (COD value: Superadmin; item keywords: HOD / Manager / Recovery) and Data Refresh (look: HOD / Manager / OPEX / Region staff; press: Superadmin).
  { key: "stationmetrics", label: "Station Metric Targets", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" },
  { key: "kpitargets", label: "KPI Targets", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" || me.position === "opex" },
  { key: "kpisettings", label: "KPI Settings", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" || me.position === "opex" },
  { key: "recovery", label: "Recovery Settings", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" || me.position === "recovery" },
  { key: "refresh", label: "Data Refresh", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" || me.role === "region" || me.position === "opex" },
  { key: "launch", label: "Launch Timeline", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" }, // Superadmin / HOD / Manager: Attendance goes live by batch
  { key: "whatsnew", label: "What's new", area: "help", visible: () => true },
  { key: "guide", label: "Guide", area: "help", visible: () => true },
  { key: "faq", label: "Common Questions", area: "help", visible: () => true },
  { key: "feedback", label: "Feedback", area: "help", visible: () => true },
  { key: "documents", label: "Documents", area: "admin", visible: (me) => me.role === "admin" },
  { key: "departments", label: "Departments", area: "admin", visible: (me) => me.role === "admin" },
];

export default function SettingsPanel({ me, mode = "settings", notifCounts }) {
  const whatsNewUnread = useWhatsNewUnread(me); // bell on the Guide tab until What's new is opened
  const isFullAdmin = me.role === "admin";
  // 2026-09-21 feedback: Manager/Region staff can now edit/remove the users
  // they're allowed to manage (not just add), so they see the (backend-filtered,
  // see api.users.list) team list too -- previously admin-only.
  const canManageUsers = me.role === "admin" || me.role === "manager" || me.role === "region";
  const myAllowedRoles = useMemo(() => allowedRoles(me), [me]);
  const myAllowedScopeTypes = useMemo(() => allowedScopeTypes(me.role), [me.role]);
  const visibleSettingsTabs = useMemo(
    () =>
      SETTINGS_TABS.filter((t) => t.area === mode && t.visible(me)).map((t) =>
        t.key === "documents"
          ? { ...t, badge: notifCounts?.documents_stale || 0 }
          : t.key === "feedback"
          ? { ...t, badge: notifCounts?.feedback_replies_unread || 0 }
          : t.key === "whatsnew"
            ? { ...t, badge: whatsNewUnread }
            : t
      ),
    [me, mode, notifCounts, whatsNewUnread]
  );
  // The tab you were on (e.g. Help -> Guide) comes back after a refresh / reopen, per person and page.
  const tabKey = `settings-tab:${me.email}:${mode}`;
  const [adminTab, setAdminTabRaw] = useState(() => {
    const first = SETTINGS_TABS.find((t) => t.area === mode && t.visible(me))?.key;
    try {
      const saved = localStorage.getItem(tabKey);
      if (saved && SETTINGS_TABS.some((t) => t.key === saved && t.area === mode && t.visible(me))) return saved;
    } catch {
      /* storage blocked */
    }
    return first;
  });
  const setAdminTab = (k) => {
    setAdminTabRaw(k);
    try {
      localStorage.setItem(tabKey, k);
    } catch {
      /* storage blocked */
    }
  };

  const [users, setUsers] = useState(null);
  const [stations, setStations] = useState([]);
  const [regions, setRegions] = useState([]);
  const [departments, setDepartments] = useState([]); // [{name, roles, users}] -- Superadmin -> Departments
  const [form, setForm] = useState({ ...emptyForm, role: myAllowedRoles.includes("fleet_assistant") ? "fleet_assistant" : myAllowedRoles[0], scope_type: myAllowedScopeTypes[0] });
  const [editingEmail, setEditingEmail] = useState(null);
  // 2026-09-25 feedback: Edit jumps up to the form (it sits above a long list), and
  // the list has a find box.
  const formCardRef = useRef(null);
  const [userSearch, setUserSearch] = useState("");
  // 2026-09-25 feedback: sortable headers (e.g. Last opened, to spot who never opens the
  // app) and Role / Scope / Never-opened filters on the user list.
  const [userSortKey, setUserSortKey] = useState("email");
  const [userSortDir, setUserSortDir] = useState("asc");
  const [roleFilter, setRoleFilter] = useState("all");
  const [scopeTypeFilter, setScopeTypeFilter] = useState("all"); // all | all-scope ("Everything") | region | zone | station
  const [scopeValuesFilter, setScopeValuesFilter] = useState([]); // searchable pick of specific regions / zones / stations
  const [neverOpenedOnly, setNeverOpenedOnly] = useState(false);
  const [deptFilter, setDeptFilter] = useState("all");
  // 2026-10-08: region / zone filter on the user list -- picking East Coast lists everyone whose access covers any station of East Coast (a region user, one of its zones, one of its stations).
  const [placeRegion, setPlaceRegion] = useState("all");
  const [placeZone, setPlaceZone] = useState("all");
  const [includeHq, setIncludeHq] = useState(false); // HQ / nationwide people cover every region -- left out of a region / zone filter unless asked for
  const [error, setError] = useState(null);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addMode, setAddMode] = useState("one"); // "one" | "bulk"
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkFileName, setBulkFileName] = useState(null);

  const loadUsers = () => api.users.list().then(setUsers).catch((e) => setError(e.message));
  const loadRefreshStatus = () => api.refresh.status().then(setRefreshStatus).catch(() => {});

  useEffect(() => {
    api.stations().then(setStations).catch(() => {});
    api.regions().then(setRegions).catch(() => {});
    api.departments.list().then(setDepartments).catch(() => {});
    if (canManageUsers && mode === "users") loadUsers();
    if (isFullAdmin) {
      loadRefreshStatus();
    }
  }, [isFullAdmin, canManageUsers]);
  useEffect(() => {
    if (adminTab === "refresh") loadRefreshStatus(); // Data Refresh is in Settings now, readable by more roles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab]);

  const allZones = useMemo(() => regions.flatMap((r) => r.zones).sort(), [regions]);

  // Every distinct region/zone/station any listed user is scoped to (narrowed to the chosen
  // scope type), for the searchable Scope filter.
  const scopeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (users || [])
            .filter((u) => scopeTypeFilter === "all" || u.scope_type === scopeTypeFilter)
            .flatMap((u) => u.scope_values || [])
        )
      )
        .sort()
        .map((v) => ({ value: v, label: v })),
    [users, scopeTypeFilter]
  );

  // Which regions / zones a user's access covers (a region user covers all its zones; a station user covers that station's zone and region).
  const placesOf = useMemo(() => {
    const stationByName = new Map(stations.map((s) => [s.station_name, s]));
    const regionOfZone = new Map(regions.flatMap((r) => r.zones.map((z) => [z, r.region])));
    const zonesOfRegion = new Map(regions.map((r) => [r.region, r.zones]));
    return (u) => {
      const regs = new Set();
      const zs = new Set();
      for (const v of u.scope_values || []) {
        if (u.scope_type === "region") {
          regs.add(v);
          (zonesOfRegion.get(v) || []).forEach((z) => zs.add(z));
        } else if (u.scope_type === "zone") {
          zs.add(v);
          if (regionOfZone.get(v)) regs.add(regionOfZone.get(v));
        } else if (u.scope_type === "station") {
          const s = stationByName.get(v);
          if (s) {
            zs.add(s.zone);
            regs.add(s.region);
          }
        }
      }
      return { regs, zs };
    };
  }, [stations, regions]);
  const zoneChoices = useMemo(
    () => (placeRegion === "all" ? regions.flatMap((r) => r.zones).sort() : regions.find((r) => r.region === placeRegion)?.zones || []),
    [regions, placeRegion]
  );

  const scopeText = (u) => (u.scope_type === "all" ? "Everything" : u.scope_type === "hq" ? "HQ" : (u.scope_values || []).join(", "));

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    let list = users || [];
    if (q) {
      list = list.filter((u) =>
        [u.email, u.display_name, u.department, ROLE_LABELS[u.role] || u.role, u.scope_type, ...(u.scope_values || [])]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      );
    }
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (deptFilter !== "all") list = list.filter((u) => (deptFilter === "none" ? !u.department : u.department === deptFilter));
    if (placeRegion !== "all" || placeZone !== "all") {
      list = list.filter((u) => {
        if (u.scope_type === "all" || u.scope_type === "hq") return includeHq;
        const { regs, zs } = placesOf(u);
        return (placeRegion === "all" || regs.has(placeRegion)) && (placeZone === "all" || zs.has(placeZone));
      });
    }
    if (scopeTypeFilter === "everything") list = list.filter((u) => u.scope_type === "all" || u.scope_type === "hq");
    else if (scopeTypeFilter !== "all") list = list.filter((u) => u.scope_type === scopeTypeFilter);
    if (scopeValuesFilter.length) list = list.filter((u) => (u.scope_values || []).some((v) => scopeValuesFilter.includes(v)));
    if (neverOpenedOnly) list = list.filter((u) => !u.last_seen_at);

    const dir = userSortDir === "asc" ? 1 : -1;
    const value = (u) => {
      if (userSortKey === "role") return ROLE_LABELS[u.role] || u.role;
      if (userSortKey === "department") return u.department || "";
      if (userSortKey === "scope") return scopeText(u);
      if (userSortKey === "last_seen_at") return u.last_seen_at ? new Date(u.last_seen_at.endsWith("Z") ? u.last_seen_at : u.last_seen_at + "Z").getTime() : -1;
      return u.email;
    };
    // A user who has never opened the app sorts as the oldest possible "last opened".
    return [...list].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return cmp * dir || a.email.localeCompare(b.email);
    });
  }, [users, userSearch, roleFilter, deptFilter, placeRegion, placeZone, includeHq, placesOf, scopeTypeFilter, scopeValuesFilter, neverOpenedOnly, userSortKey, userSortDir]);

  const toggleUserSort = (key) => {
    if (key === userSortKey) setUserSortDir(userSortDir === "asc" ? "desc" : "asc");
    else {
      setUserSortKey(key);
      setUserSortDir(key === "last_seen_at" ? "asc" : "asc");
    }
  };

  const startEdit = (u) => {
    setEditingEmail(u.email);
    setForm({ email: u.email, role: u.role, scope_type: u.scope_type, scope_values: u.scope_values || [], department: u.department || "" });
    setError(null);
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // A new role moves the scope with it: HQ staff have no dedicated place (scope HQ); everyone else needs a station / zone / region.
  const applyRole = (f, role) => {
    const hq = isHqTier(role);
    const placeless = ["all", "hq"].includes(f.scope_type);
    return {
      ...f,
      role,
      ...(hq && !placeless
        ? { scope_type: "hq", scope_values: [] }
        : !hq && placeless && myAllowedScopeTypes.includes("station")
          ? { scope_type: "station", scope_values: [] }
          : {}),
    };
  };
  const deptRoles = (name) => departments.find((d) => d.name === name)?.roles || [];
  // Picking a department narrows the role list; the current role is swapped for the department's first role you may grant when it does not belong.
  const changeDepartment = (name) => {
    const roles = deptRoles(name);
    let next = { ...form, department: name };
    if (roles.length && !roles.includes(form.role)) {
      const pick = roles.find((r) => myAllowedRoles.includes(r));
      if (pick) next = applyRole(next, pick);
    }
    setForm(next);
  };

  const cancelEdit = () => {
    setEditingEmail(null);
    setForm(emptyForm);
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form, scope_values: form.scope_type === "all" || form.scope_type === "hq" ? [] : form.scope_values };
      if (editingEmail) {
        await api.users.update(editingEmail, payload);
        setEditingEmail(null);
      } else {
        await api.users.add(payload);
      }
      setForm(emptyForm);
      if (canManageUsers && mode === "users") loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const runBulkAdd = async (rows) => {
    setError(null);
    setBulkResult(null);
    if (!rows.length) {
      setError("No rows to add — check the file/text has at least one email,role,scope_type,scope_values line.");
      return;
    }
    try {
      const result = await api.users.bulkAdd({ users: rows });
      setBulkResult(result);
      setBulkText("");
      setBulkFileName(null);
      if (canManageUsers && mode === "users") loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const bulkSubmit = async (e) => {
    e.preventDefault();
    await runBulkAdd(parseBulkRows(bulkText));
  };

  const bulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setError('Please upload a .csv file — in Excel, use "Save As → CSV UTF-8 (.csv)" after editing the template.');
      return;
    }
    const text = await file.text();
    await runBulkAdd(parseBulkRows(text));
    e.target.value = "";
  };

  const remove = async (email) => {
    if (!confirm(`Remove access for ${email}?`)) return;
    try {
      await api.users.remove(email);
      if (editingEmail === email) cancelEdit();
      loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const status = await api.refresh.trigger();
      setRefreshStatus(status);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-status-critical/5 px-4 py-2 text-sm text-status-critical ring-1 ring-status-critical/20">
          {error}
        </div>
      )}

      {visibleSettingsTabs.length > 1 && <TabBar tabs={visibleSettingsTabs} activeKey={adminTab} onSelect={setAdminTab} />}

      {adminTab === "stationmetrics" && <SlaTargetsPanel regions={regions} me={me} />}

      {adminTab === "kpitargets" && <KpiTargetsPanel part="targets" />}

      {adminTab === "kpisettings" && <KpiTargetsPanel part="scope" />}

      {adminTab === "recovery" && <RecoverySettingsPanel me={me} />}

      {adminTab === "launch" && <LaunchTimelinePanel />}

      {adminTab === "feedback" && <FeedbackPanel me={me} />}

      {adminTab === "guide" && <GuideTab me={me} only="guide" />}
      {adminTab === "whatsnew" && <GuideTab me={me} only="new" />}
      {adminTab === "faq" && <GuideTab me={me} only="faq" />}

      {adminTab === "documents" && <DocumentsPage me={me} driverDetails={<DocumentsPanel />} />}

      {adminTab === "departments" && <DepartmentsPanel />}

      {adminTab === "refresh" && (
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800">Data refresh</div>
              {refreshStatus ? (
                <div className="mt-1 text-sm text-slate-500">
                  Last: {refreshStatus.status}
                  {refreshStatus.stations_count != null && ` · ${refreshStatus.stations_count} stations`}
                  {refreshStatus.error_message && ` · ${refreshStatus.error_message}`}
                  {" · "}
                  {refreshStatus.triggered_by || "scheduler"}
                </div>
              ) : (
                <div className="mt-1 text-sm text-slate-500">No refresh has run yet.</div>
              )}
            </div>
            {isFullAdmin ? (
              <button
                onClick={doRefresh}
                disabled={refreshing}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {refreshing ? "Refreshing…" : "Refresh now"}
              </button>
            ) : (
              <span className="text-xs text-slate-400">Only the Superadmin can refresh by hand</span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Runs automatically every {Math.round((refreshStatus?.interval_seconds || 600) / 60)} minutes, and asks Redash to re-run each query first (best-effort — if
            the API key can't trigger that, it falls back to whatever Redash last computed on its own).
          </p>

          {refreshStatus?.queries && (
            <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Redash query</th>
                    <th className="px-3 py-2 font-medium">Feeds</th>
                    <th className="px-3 py-2 font-medium">Redash computed</th>
                    <th className="px-3 py-2 font-medium">Last pulled</th>
                  </tr>
                </thead>
                <tbody>
                  {refreshStatus.queries.map((q) => (
                    <tr key={q.query_id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-mono text-xs text-slate-500">
                        {q.url ? (
                          <a href={q.url} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-brand" title="Open this query in Redash">
                            {q.query_id} ↗
                          </a>
                        ) : (
                          q.query_id
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-slate-700">{q.label}</td>
                      <td className="px-3 py-1.5 text-slate-600">{q.redash_at ? formatTime(q.redash_at) : "—"}</td>
                      <td className="px-3 py-1.5 text-slate-600">{formatTime(q.fetched_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Each query is pulled one at a time during a refresh -- if one of these looks stuck on an old time while
            the others are fresh, that specific query is what's worth checking in Redash first.
          </p>
        </div>
      )}

      {adminTab === "users" && !isFullAdmin && (
        <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          You can add, edit, or remove teammates within your own access level below. Viewing the full team list and
          triggering a data refresh are admin-only.
        </div>
      )}

      {adminTab === "users" && (
      <>
      <div ref={formCardRef} className="scroll-mt-24 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <div className="font-medium text-slate-800">{editingEmail ? `Edit access — ${editingEmail}` : "Add teammate"}</div>
          {editingEmail ? (
            <button onClick={cancelEdit} className="text-xs text-slate-500 hover:underline">
              Cancel edit
            </button>
          ) : (
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              <button
                onClick={() => setAddMode("one")}
                className={`rounded px-2 py-1 font-medium ${addMode === "one" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                Add one
              </button>
              <button
                onClick={() => setAddMode("bulk")}
                className={`rounded px-2 py-1 font-medium ${addMode === "bulk" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                Bulk add
              </button>
            </div>
          )}
        </div>

        {(editingEmail || addMode === "one") && (
          <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              required
              type="email"
              disabled={!!editingEmail}
              placeholder="name@ninjavan.co"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              value={form.department || ""}
              onChange={(e) => changeDepartment(e.target.value)}
              aria-label="Department"
            >
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
              {form.department && !departments.some((d) => d.name === form.department) && <option value={form.department}>{form.department}</option>}
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              value={form.role}
              onChange={(e) => setForm(applyRole(form, e.target.value))}
              disabled={editingEmail === OWNER_EMAIL}
              title={editingEmail === OWNER_EMAIL ? "The app owner's role can't be changed" : undefined}
            >
              {GROUPS.map((g) => {
                const inDept = deptRoles(form.department);
                const opts = g.positions.filter((p) => (myAllowedRoles.includes(p) && (!inDept.length || inDept.includes(p))) || p === form.role);
                return opts.length === 0 ? null : (
                  <optgroup key={g.key} label={g.label}>
                    {opts.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
              {!GROUPS.some((g) => g.positions.includes(form.role)) && <option value={form.role}>{ROLE_LABELS[form.role] || form.role}</option>}
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              value={form.scope_type}
              onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_values: [] })}
            >
              {myAllowedScopeTypes.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </option>
              ))}
            </select>
            {form.scope_type === "station" && (
              <MultiSelect
                placeholder="Pick station(s)…"
                options={stations.map((s) => ({ value: s.station_name, label: `${s.station_name} (${s.zone})` }))}
                value={form.scope_values}
                onChange={(vals) => setForm({ ...form, scope_values: vals })}
              />
            )}
            {form.scope_type === "zone" && (
              <MultiSelect
                placeholder="Pick zone(s)…"
                options={allZones.map((z) => ({ value: z, label: z }))}
                value={form.scope_values}
                onChange={(vals) => setForm({ ...form, scope_values: vals })}
              />
            )}
            {form.scope_type === "region" && (
              <MultiSelect
                placeholder="Pick region(s)…"
                options={regions.map((r) => ({ value: r.region, label: r.region }))}
                value={form.scope_values}
                onChange={(vals) => setForm({ ...form, scope_values: vals })}
              />
            )}
            <div className="flex items-start sm:col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white"
              >
                {editingEmail ? "Save changes" : "Add"}
              </button>
            </div>
          </form>
        )}

        {!editingEmail && addMode === "bulk" && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
              <button
                type="button"
                onClick={() => downloadCsv("bulk-add-template.csv", bulkTemplateFor(me))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Download template (.csv)
              </button>
              <label className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 cursor-pointer">
                Upload filled-in CSV
                <input type="file" accept=".csv" onChange={bulkFileChange} className="hidden" />
              </label>
              {bulkFileName && <span className="text-xs text-slate-500">{bulkFileName}</span>}
              <span className="text-xs text-slate-400">
                Columns: email, role, scope_type, scope_values, department (optional; semicolon-separated scope values for more than one, e.g.
                "Southern;Northern"). Edit the downloaded file in Excel/Sheets, then upload it back (Save As → CSV if
                your editor changes the format).
              </span>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Or paste rows directly</summary>
              <form onSubmit={bulkSubmit} className="mt-2 space-y-2">
                <textarea
                  rows={5}
                  placeholder={bulkTemplateFor(me)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <button type="submit" className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white">
                  Add all
                </button>
              </form>
            </details>

            <p className="text-xs text-slate-400">
              {me.role === "region"
                ? "You can grant Station Head (SH) or Fleet Assistant (FA), with station-level access."
                : me.role === "manager"
                  ? `You can grant any position except the Superadmin${me.position === "hod" ? "" : " and the HOD"}: HQ staff (scope hq), Region Head / RFS, Station Head / Fleet Assistant.`
                  : "role: hod, manager, fleet_admin, opex, recovery, restock (HQ staff), region_head, rfs (region staff), station_head, fleet_assistant (station staff)" +
                    (me.email === OWNER_EMAIL ? ", or admin (Superadmin)" : " (only the app owner can grant admin)") +
                    ". scope_type: station, zone, region, hq (HQ staff) or all (leave scope_values blank for hq / all)."}
            </p>

            {bulkResult && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-status-good">{bulkResult.added.length} added</span>
                {bulkResult.added.length > 0 && `: ${bulkResult.added.join(", ")}`}
                {bulkResult.skipped.length > 0 && <> · Already set up (skipped): {bulkResult.skipped.join(", ")}</>}
                {bulkResult.errors.length > 0 && (
                  <div className="mt-1 font-semibold text-status-critical">
                    {bulkResult.errors.length} error{bulkResult.errors.length === 1 ? "" : "s"}: {bulkResult.errors.join("; ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {canManageUsers && (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Find a user by email, name, role or scope…"
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
              >
                <option value="all">All roles</option>
                {GROUPS.map((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {g.positions.map((value) => (
                      <option key={value} value={value}>
                        {ROLE_LABELS[value]}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Position not set yet">
                  <option value="region">Region staff</option>
                  <option value="station">Station staff</option>
                </optgroup>
              </select>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} aria-label="Filter by department" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
                <option value="all">All departments</option>
                {departments.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
                <option value="none">No department</option>
              </select>
              <select
                value={placeRegion}
                onChange={(e) => {
                  setPlaceRegion(e.target.value);
                  setPlaceZone("all");
                }}
                aria-label="Filter by region"
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
              >
                <option value="all">All regions</option>
                {regions.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.region}
                  </option>
                ))}
              </select>
              <select value={placeZone} onChange={(e) => setPlaceZone(e.target.value)} aria-label="Filter by zone" className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700">
                <option value="all">All zones</option>
                {zoneChoices.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              {(placeRegion !== "all" || placeZone !== "all") && (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600" title="HQ and nationwide staff cover every region and zone">
                  <input type="checkbox" checked={includeHq} onChange={(e) => setIncludeHq(e.target.checked)} />
                  Include HQ / nationwide
                </label>
              )}
              <select
                value={scopeTypeFilter}
                onChange={(e) => {
                  setScopeTypeFilter(e.target.value);
                  setScopeValuesFilter([]);
                }}
                aria-label="Filter by scope type"
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
              >
                <option value="all">All scope types</option>
                <option value="everything">Everything / HQ (nationwide)</option>
                <option value="region">Region</option>
                <option value="zone">Zone</option>
                <option value="station">Station</option>
              </select>
              {scopeTypeFilter !== "everything" && (
                <div className="w-52">
                  <MultiSelect
                    options={scopeOptions}
                    value={scopeValuesFilter}
                    onChange={setScopeValuesFilter}
                    placeholder="Search scope…"
                  />
                </div>
              )}
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={neverOpenedOnly} onChange={(e) => setNeverOpenedOnly(e.target.checked)} />
                Never opened
              </label>
            </div>
            <span className="text-xs text-slate-400">
              {filteredUsers.length === (users || []).length
                ? `${(users || []).length} users`
                : `Showing ${filteredUsers.length} of ${(users || []).length}`}
            </span>
          </div>
          <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500">
              <tr>
                {[
                  { key: "email", label: "Email" },
                  { key: "department", label: "Department" },
                  { key: "role", label: "Role" },
                  { key: "scope", label: "Scope" },
                  { key: "last_seen_at", label: "Last opened" },
                ].map((c) => (
                  <th key={c.key} className="px-4 py-2 font-medium">
                    <button
                      onClick={() => toggleUserSort(c.key)}
                      className={`flex items-center gap-1 font-medium hover:text-brand ${userSortKey === c.key ? "text-ink" : ""}`}
                    >
                      {c.label}
                      <span className="text-[10px]">{userSortKey === c.key ? (userSortDir === "asc" ? "▲" : "▼") : ""}</span>
                    </button>
                  </th>
                ))}
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.email} className={`border-t border-slate-100 ${editingEmail === u.email ? "bg-blue-50/50" : ""}`}>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2 text-slate-600">{u.department || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {u.scope_type === "all" ? "Everything" : u.scope_type === "hq" ? "HQ" : `${(u.scope_values || []).join(", ")} (${u.scope_type})`}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatTime(u.last_seen_at)}</td>
                  <td className="px-4 py-2 text-right">
                    {canManageTarget(me, u.role) && (
                      <>
                        <button onClick={() => startEdit(u)} className="mr-3 text-xs text-brand hover:underline">
                          Edit
                        </button>
                        <button onClick={() => remove(u.email)} className="text-xs text-status-critical hover:underline">
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {(users || []).length > 0 && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                    No user matches{userSearch ? ` "${userSearch}"` : " these filters"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
