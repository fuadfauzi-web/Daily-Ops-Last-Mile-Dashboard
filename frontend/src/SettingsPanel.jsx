import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { BOARD_COLUMNS } from "./lib/actionMetrics";
import { resolveThreshold } from "./lib/thresholds";
import TabBar from "./components/TabBar";
import FeedbackPanel from "./FeedbackPanel";
import GuideTab from "./GuideTab";
import MultiSelect from "./components/MultiSelect";

// Route Monitoring's Productivity % isn't a Station Health/Action Board metric (it's
// not summable as a station-level count the way the rest of BOARD_COLUMNS are),
// so it's kept out of BOARD_COLUMNS entirely and only added here for editing.
const ADMIN_METRICS = [...BOARD_COLUMNS, { key: "productivity_pct", label: "Productivity (Route Monitoring)" }];

// Productivity is scored per driver position rather than per region -- reuses
// the exact same (metric_key, scope) mechanism as the region overrides below,
// just with a driver position label as the scope string instead of a region name.
const DRIVER_POSITION_SCOPES = ["Hybrid Driver", "Hybrid Rider", "Independent Driver", "Independent Rider"];

const emptyForm = { email: "", role: "station", scope_type: "station", scope_values: [] };
const ROLE_LABELS = { station: "Station staff", region: "Region staff", manager: "Manager", admin: "Admin" };
const ROLE_OPTION_ORDER = ["station", "region", "manager", "admin"];
// "Sees: a station/zone/region" -- can be granted more than one, see the
// multi-select in the add/edit form below.
const SCOPE_LABELS = { station: "Sees: station(s)", zone: "Sees: zone(s)", region: "Sees: region(s)", all: "Sees: everything" };
const SCOPE_OPTION_ORDER = ["station", "zone", "region", "all"];

// Only the app owner can grant the Admin role -- mirrors backend/main.py's
// _OWNER_EMAIL/_require_can_grant_role exactly. An admin who isn't the owner
// still can't create more admins.
const OWNER_EMAIL = "fuad.mawardi@ninjavan.co";

// What each acting role is allowed to hand out -- mirrors backend/main.py's
// _validate_grant_limits exactly, so the dropdowns/template never offer
// something the server would reject.
function allowedRoles(me) {
  if (me.role === "manager") return ["station", "region"];
  if (me.role === "region") return ["station"];
  // admin
  return me.email === OWNER_EMAIL ? ROLE_OPTION_ORDER : ROLE_OPTION_ORDER.filter((r) => r !== "admin");
}
function allowedScopeTypes(actingRole) {
  if (actingRole === "manager") return ["station", "zone", "region"];
  if (actingRole === "region") return ["station"];
  return SCOPE_OPTION_ORDER; // admin
}

// Edit/delete permission on an existing user -- mirrors backend/main.py's
// _require_can_manage_target exactly (keyed off the TARGET's current role).
function canManageTarget(actingRole, targetRole) {
  if (actingRole === "admin") return true;
  if (actingRole === "manager") return targetRole === "station" || targetRole === "region";
  if (actingRole === "region") return targetRole === "station";
  return false;
}

// scope_values within one CSV cell is semicolon-separated, e.g. "Southern;Northern".
function bulkTemplateFor(me) {
  const lines = ["email,role,scope_type,scope_values"];
  if (me.role === "region") {
    lines.push("name1@ninjavan.co,station,station,Larkin", "name2@ninjavan.co,station,station,Segambut;Larkin");
  } else if (me.role === "manager") {
    lines.push("name1@ninjavan.co,station,station,Larkin", "name2@ninjavan.co,region,region,Southern;Northern");
  } else {
    lines.push(
      "name1@ninjavan.co,station,station,Larkin",
      "name2@ninjavan.co,region,region,Southern;Northern",
      "name3@ninjavan.co,manager,zone,South 1"
    );
    if (me.email === OWNER_EMAIL) lines.push("name4@ninjavan.co,admin,all,");
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
    const [email, role, scope_type, scopeValuesCell] = line.split(",").map((p) => (p ?? "").trim());
    const scope_values =
      !scope_type || scope_type === "all"
        ? []
        : (scopeValuesCell || "").split(";").map((v) => v.trim()).filter(Boolean);
    return {
      email,
      role: role || "station",
      scope_type: scope_type || "station",
      scope_values,
    };
  });
}

const DIRECTION_LABELS = { "higher-is-worse": "Higher is worse", "lower-is-worse": "Lower is worse" };

// Settings -> SLA Targets: the thresholds behind Station Health's severity
// colouring, editable in the app instead of hardcoded (see lib/thresholds.js
// and backend V13__sla_thresholds.sql). One scope at a time -- Nationwide
// default, or a region override -- edited as a local draft and saved explicitly.
function SlaTargetsPanel({ regions }) {
  const [rows, setRows] = useState(null);
  const [scope, setScope] = useState("nationwide");
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
          <span className="text-xs text-slate-400">Applies at the next 15-minute refresh</span>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save targets"}
          </button>
        </div>
      </div>

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
                      <input type="checkbox" checked={!!d.scored} onChange={(e) => updateField(c.key, "scored", e.target.checked)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <select
                        disabled={!d.scored}
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
                        disabled={!d.scored}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs tabular-nums disabled:bg-slate-100 disabled:text-slate-400"
                        value={d.warning_at}
                        onChange={(e) => updateField(c.key, "warning_at", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        disabled={!d.scored}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs tabular-nums disabled:bg-slate-100 disabled:text-slate-400"
                        value={d.critical_at}
                        onChange={(e) => updateField(c.key, "critical_at", e.target.value)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <select
                        disabled={!d.scored}
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
function RecoverySettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [threshold, setThreshold] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    api.recoverySettings
      .get()
      .then((s) => {
        setSettings(s);
        setThreshold(String(s.high_cod_value_threshold));
        setKeywordsText(s.high_value_item_keywords.join(", "));
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const keywords = keywordsText
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
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
            A missing tracking number is highlighted when its COD value is at or above this amount.
          </p>
          <input
            type="number"
            className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm tabular-nums"
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
            Comma-separated. A missing tracking number is also highlighted when its item description contains any of
            these (case-insensitive) -- e.g. "smartphone, laptop, gold".
          </p>
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            rows={3}
            value={keywordsText}
            onChange={(e) => {
              setKeywordsText(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {settings.changed_by ? `Last changed ${formatTime(settings.changed_at)} · ${settings.changed_by}` : "Never changed"}
            {" · applies at the next 15-minute refresh"}
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
//   Admin    -- only what solely an admin can change (Documents, Data Refresh); the Admin page
//               itself is admin-only.
const SETTINGS_TABS = [
  { key: "users", label: "Users", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" || me.role === "region" },
  { key: "sla", label: "SLA Targets", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" },
  { key: "recovery", label: "Recovery Settings", area: "settings", visible: (me) => me.role === "admin" || me.role === "manager" },
  { key: "feedback", label: "Feedback", area: "settings", visible: () => true },
  { key: "guide", label: "Guide", area: "settings", visible: () => true },
  { key: "documents", label: "Documents", area: "admin", visible: (me) => me.role === "admin" },
  { key: "refresh", label: "Data Refresh", area: "admin", visible: (me) => me.role === "admin" },
];

export default function SettingsPanel({ me, mode = "settings", notifCounts }) {
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
        t.key === "feedback" ? { ...t, badge: notifCounts?.feedback_replies_unread || 0 } : t
      ),
    [me, mode, notifCounts]
  );
  const [adminTab, setAdminTab] = useState(() => SETTINGS_TABS.find((t) => t.area === mode && t.visible(me))?.key);

  const [users, setUsers] = useState(null);
  const [stations, setStations] = useState([]);
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, role: myAllowedRoles[0], scope_type: myAllowedScopeTypes[0] });
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
  const [scopeFilter, setScopeFilter] = useState("all");
  const [neverOpenedOnly, setNeverOpenedOnly] = useState(false);
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
    if (canManageUsers && mode === "settings") loadUsers();
    if (isFullAdmin) {
      loadRefreshStatus();
    }
  }, [isFullAdmin, canManageUsers]);

  const allZones = useMemo(() => regions.flatMap((r) => r.zones).sort(), [regions]);

  // Every distinct region/zone/station value any listed user is scoped to, for the Scope filter.
  const scopeOptions = useMemo(
    () => Array.from(new Set((users || []).flatMap((u) => u.scope_values || []))).sort(),
    [users]
  );

  const scopeText = (u) => (u.scope_type === "all" ? "Everything" : (u.scope_values || []).join(", "));

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    let list = users || [];
    if (q) {
      list = list.filter((u) =>
        [u.email, u.display_name, ROLE_LABELS[u.role] || u.role, u.scope_type, ...(u.scope_values || [])]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      );
    }
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (scopeFilter === "everything") list = list.filter((u) => u.scope_type === "all");
    else if (scopeFilter !== "all") list = list.filter((u) => (u.scope_values || []).includes(scopeFilter));
    if (neverOpenedOnly) list = list.filter((u) => !u.last_seen_at);

    const dir = userSortDir === "asc" ? 1 : -1;
    const value = (u) => {
      if (userSortKey === "role") return ROLE_LABELS[u.role] || u.role;
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
  }, [users, userSearch, roleFilter, scopeFilter, neverOpenedOnly, userSortKey, userSortDir]);

  const toggleUserSort = (key) => {
    if (key === userSortKey) setUserSortDir(userSortDir === "asc" ? "desc" : "asc");
    else {
      setUserSortKey(key);
      setUserSortDir(key === "last_seen_at" ? "asc" : "asc");
    }
  };

  const startEdit = (u) => {
    setEditingEmail(u.email);
    setForm({ email: u.email, role: u.role, scope_type: u.scope_type, scope_values: u.scope_values || [] });
    setError(null);
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      const payload = { ...form, scope_values: form.scope_type === "all" ? [] : form.scope_values };
      if (editingEmail) {
        await api.users.update(editingEmail, payload);
        setEditingEmail(null);
      } else {
        await api.users.add(payload);
      }
      setForm(emptyForm);
      if (canManageUsers && mode === "settings") loadUsers();
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
      if (canManageUsers && mode === "settings") loadUsers();
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

      {adminTab === "sla" && <SlaTargetsPanel regions={regions} />}

      {adminTab === "recovery" && <RecoverySettingsPanel />}

      {adminTab === "feedback" && <FeedbackPanel me={me} />}

      {adminTab === "guide" && <GuideTab me={me} />}

      {adminTab === "documents" && <DocumentsPanel />}

      {adminTab === "refresh" && isFullAdmin && (
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
            <button
              onClick={doRefresh}
              disabled={refreshing}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh now"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Runs automatically every 15 minutes, and now asks Redash to re-run each query first (best-effort — if
            the API key can't trigger that, it falls back to whatever Redash last computed on its own).
          </p>

          {refreshStatus?.queries && (
            <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Redash query</th>
                    <th className="px-3 py-2 font-medium">Feeds</th>
                    <th className="px-3 py-2 font-medium">Last pulled</th>
                  </tr>
                </thead>
                <tbody>
                  {refreshStatus.queries.map((q) => (
                    <tr key={q.query_id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-mono text-xs text-slate-500">{q.query_id}</td>
                      <td className="px-3 py-1.5 text-slate-700">{q.label}</td>
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
          <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {myAllowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
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
                Columns: email, role, scope_type, scope_values (semicolon-separated for more than one, e.g.
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
                ? "You can only grant the Station staff role with station-level access."
                : me.role === "manager"
                  ? "You can grant Station staff or Region staff roles, with any access level except \"sees everything\"."
                  : me.email === OWNER_EMAIL
                    ? "role: station, region, manager, or admin. scope_type: station, zone, region, or all (leave scope_values blank for \"all\")."
                    : "role: station, region, or manager (only the app owner can grant admin). scope_type: station, zone, region, or all (leave scope_values blank for \"all\")."}
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
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                aria-label="Filter by scope"
                className="h-8 max-w-[11rem] rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
              >
                <option value="all">All scopes</option>
                <option value="everything">Everything (nationwide)</option>
                {scopeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
                  <td className="px-4 py-2">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {u.scope_type === "all" ? "Everything" : `${(u.scope_values || []).join(", ")} (${u.scope_type})`}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatTime(u.last_seen_at)}</td>
                  <td className="px-4 py-2 text-right">
                    {canManageTarget(me.role, u.role) && (
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
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    No user matches "{userSearch}".
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
