// "View As" (Settings -> Role Tester, admin-only): once set, every request
// carries the override so the whole app -- not just /api/me -- renders as
// that role/scope would see it. The backend only honours this for a real
// admin (checked server-side from the SSO email, see auth.get_current_user),
// so setting it client-side can't itself grant access to anything.
let viewAs = null; // { role, scopeType, scopeValues } | { email } | null
function setViewAs(next) {
  viewAs = next;
}
function getViewAs() {
  return viewAs;
}

// Always same-origin relative paths — the ingress routes /api to the backend.
// "View as a specific user" sends just the email -- the backend takes that user's
// real role and scope from the users table (2026-09-25).
function viewAsHeaders() {
  if (!viewAs) return {};
  if (viewAs.email) return { "X-View-As-Email": viewAs.email };
  return {
    "X-View-As-Role": viewAs.role,
    "X-View-As-Scope-Type": viewAs.scopeType || "all",
    "X-View-As-Scope-Values": (viewAs.scopeValues || []).join(","),
  };
}

// opts.noViewAs: send this one request as the real signed-in admin even while a View As
// is active (the Role Tester's own pickers must always list everything).
async function request(path, opts = {}) {
  const { noViewAs, ...fetchOpts } = opts;
  opts = fetchOpts;
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(noViewAs ? {} : viewAsHeaders()), ...(opts.headers || {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// Query string from an object: empty / null values are left out, an array becomes a repeated parameter (?keys=a&keys=b).
function qs(obj) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return;
    (Array.isArray(v) ? v : [v]).forEach((x) => p.append(k, x));
  });
  return p.toString();
}

export const api = {
  me: () => request("/api/me"),
  viewAs: { set: setViewAs, get: getViewAs },
  dashboard: () => request("/api/dashboard"),
  stations: (opts) => request("/api/stations", opts),
  regions: (opts) => request("/api/regions", opts),
  drilldown: (stationCode, metric) =>
    request(`/api/drilldown?station_code=${encodeURIComponent(stationCode)}&metric=${encodeURIComponent(metric)}`),
  shipmentDetails: () => request("/api/shipment-details"),
  dailyKpi: () => request("/api/daily-kpi"),
  processingTime: () => request("/api/processing-time"),
  shipmentDrilldown: (stationCode, metric) =>
    request(
      `/api/shipment-drilldown?station_code=${encodeURIComponent(stationCode)}&metric=${encodeURIComponent(metric)}`
    ),
  routedView: (driverTypes) =>
    request(`/api/routed-view${driverTypes?.length ? `?driver_type=${encodeURIComponent(driverTypes.join(","))}` : ""}`),
  shipperWatch: () => request("/api/shipper-watch"),
  shipperDrilldown: (stationCode, metric) =>
    request(
      `/api/shipper-drilldown?station_code=${encodeURIComponent(stationCode)}&metric=${encodeURIComponent(metric)}`
    ),
  agingDetails: (type) => request(`/api/aging-details?type=${encodeURIComponent(type)}`),
  agingSummary: (type) => request(`/api/aging-details?type=${encodeURIComponent(type)}&summary=true`),
  oldRoute: () => request("/api/old-route"),
  b2bCompliance: (documentTypes) =>
    request(`/api/b2b-compliance?document_type=${encodeURIComponent(documentTypes?.length ? documentTypes.join(",") : "")}`),
  missingDetails: () => request("/api/recovery/missing-details"),
  recoverySettings: {
    get: () => request("/api/recovery/settings"),
    save: (payload) => request("/api/recovery/settings", { method: "PUT", body: JSON.stringify(payload) }),
  },
  urgentTnLookup: (trackingNumbers) =>
    request("/api/urgent-tn-lookup", { method: "POST", body: JSON.stringify({ tracking_numbers: trackingNumbers }) }),
  pendingYesterdayRoute: () => request("/api/pending-yesterday-route"),
  rpu: (stages, shippers) =>
    request(
      `/api/rpu?stage=${encodeURIComponent(stages?.length ? stages.join(",") : "all")}${
        shippers?.length ? `&shipper=${encodeURIComponent(shippers.join(","))}` : ""
      }`
    ),
  rpuAging: (type, shippers, statuses) =>
    request(
      `/api/rpu-aging?type=${encodeURIComponent(type)}${
        shippers?.length ? `&shipper=${encodeURIComponent(shippers.join(","))}` : ""
      }${statuses?.length ? `&status=${encodeURIComponent(statuses.join(","))}` : ""}`
    ),
  orgChart: (opts) => request("/api/org-chart", opts),
  headcount: {
    get: (opts) => request("/api/headcount", opts),
    add: (payload) => request("/api/headcount/seats", { method: "POST", body: JSON.stringify(payload) }),
    remove: (id) => request(`/api/headcount/seats/${id}`, { method: "DELETE" }),
    approve: (id) => request(`/api/headcount/seats/${id}/approve`, { method: "POST" }),
    reject: (id) => request(`/api/headcount/seats/${id}/reject`, { method: "POST" }),
  },
  // Staff & Org Chart (staff.py): the Fleet Admin team's list of who is posted where -- separate from access (users above).
  // Fleet Admin -> Assets -> fire extinguisher / weighing scale registers (asset_lists.py)
  assetLists: {
    list: (kind, opts) => request(`/api/assets/${kind}`, opts),
    create: (kind, payload) => request(`/api/assets/${kind}`, { method: "POST", body: JSON.stringify(payload) }),
    update: (kind, id, payload) => request(`/api/assets/${kind}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (kind, id) => request(`/api/assets/${kind}/${id}`, { method: "DELETE" }),
    bulk: (kind, payload) => request(`/api/assets/${kind}/bulk`, { method: "POST", body: JSON.stringify(payload) }),
  },
  // Fleet Admin -> Assets (assets.py)
  assets: {
    inventory: (opts) => request("/api/assets/inventory", opts),
    save: (station, payload) => request(`/api/assets/inventory/${encodeURIComponent(station)}`, { method: "PUT", body: JSON.stringify(payload) }),
    removeItem: (station, item) => request(`/api/assets/inventory/${encodeURIComponent(station)}?item=${encodeURIComponent(item)}`, { method: "DELETE" }),
  },
  // Fleet Admin -> Vehicles (vehicles.py)
  vehicles: {
    list: (opts) => request("/api/vehicles", opts),
    save: (plate, payload) => request(`/api/vehicles/${encodeURIComponent(plate)}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (plate) => request(`/api/vehicles/${encodeURIComponent(plate)}`, { method: "DELETE" }),
    bulk: (payload) => request("/api/vehicles/bulk", { method: "POST", body: JSON.stringify(payload) }),
  },
  // Fleet Admin -> Premises (premises.py)
  premises: {
    list: (opts) => request("/api/premises", opts),
    save: (station, payload) => request(`/api/premises/${encodeURIComponent(station)}`, { method: "PUT", body: JSON.stringify(payload) }),
    bulk: (payload) => request("/api/premises/bulk", { method: "POST", body: JSON.stringify(payload) }),
  },
  staff: {
    list: (opts) => request("/api/staff", opts),
    add: (payload) => request("/api/staff", { method: "POST", body: JSON.stringify(payload) }),
    bulk: (payload) => request("/api/staff/bulk", { method: "POST", body: JSON.stringify(payload) }),
    update: (email, payload) => request(`/api/staff/${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (email) => request(`/api/staff/${encodeURIComponent(email)}`, { method: "DELETE" }),
  },
  users: {
    list: (opts) => request("/api/admin/users", opts),
    add: (payload) => request("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }),
    bulkAdd: (payload) => request("/api/admin/users/bulk", { method: "POST", body: JSON.stringify(payload) }),
    update: (email, payload) =>
      request(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    remove: (email) =>
      request(`/api/admin/users/${encodeURIComponent(email)}`, { method: "DELETE" }),
  },
  refresh: {
    trigger: () => request("/api/admin/refresh", { method: "POST" }),
    status: () => request("/api/admin/refresh-status"),
  },
  thresholds: {
    list: () => request("/api/thresholds"),
    save: (rows) => request("/api/thresholds", { method: "PUT", body: JSON.stringify({ rows }) }),
  },
  feedback: {
    // Multipart (message + optional attachment) -- no Content-Type header, the
    // browser sets the boundary itself (same as driverDetails.upload below).
    submit: async (message, file) => {
      const formData = new FormData();
      formData.append("message", message);
      if (file) formData.append("file", file);
      const res = await fetch("/api/feedback", { method: "POST", body: formData, headers: viewAsHeaders() });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          detail = (await res.json()).detail || detail;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      return res.json();
    },
    list: () => request("/api/feedback"),
    update: (id, payload) => request(`/api/feedback/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    attachmentUrl: (id) => `/api/feedback/${id}/attachment`,
    remove: (id) => request(`/api/feedback/${id}`, { method: "DELETE" }),
  },
  // Urgent TN items live on the server now (assignable to a PIC) -- see backend
  // main.py's /api/urgent-tn/items.
  urgentTn: {
    items: () => request("/api/urgent-tn/items"),
    create: (payload) => request("/api/urgent-tn/items", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/api/urgent-tn/items/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id) => request(`/api/urgent-tn/items/${id}`, { method: "DELETE" }),
    markSeen: () => request("/api/urgent-tn/mark-seen", { method: "POST" }),
    reminderAck: () => request("/api/urgent-tn/reminder-ack", { method: "POST" }),
    removeMany: (ids) => request("/api/urgent-tn/items/bulk-remove", { method: "POST", body: JSON.stringify({ ids }) }),
    suggest: (q) => request(`/api/urgent-tn/pic-suggestions?q=${encodeURIComponent(q)}`),
  },
  notifications: () => request("/api/notifications"),
  dod: () => request("/api/dod"), // DoD Dashboard: Station Health per day, this week + last week
  // KPI Dashboard -> Hybrid Productivity (Metabase): view "weekly" | "monthly"; refresh re-runs the questions (admin / manager only)
  kpiHybrid: (view, refresh = false) => request(`/api/kpi/hybrid?view=${view}${refresh ? "&refresh=true" : ""}`),
  kpiUploads: () => request("/api/kpi/uploads"),
  kpiUpload: async (dataset, file) => {
    const formData = new FormData();
    formData.append("file", file);
    // No Content-Type header -- the browser sets the multipart boundary itself.
    const res = await fetch(`/api/kpi/uploads/${dataset}`, { method: "POST", body: formData, headers: viewAsHeaders() });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = (await res.json()).detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json();
  },
  // Several downloaded files at once (2026-10-03): the server matches each to its dataset by its columns -> [{filename, dataset, label, ok, detail}]
  kpiUploadMany: async (files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch("/api/kpi/upload-many", { method: "POST", body: formData, headers: viewAsHeaders() });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = (await res.json()).detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json();
  },
  kpiUploadRemove: (dataset) => request(`/api/kpi/uploads/${dataset}`, { method: "DELETE" }),
  // Management View (2026-10-01): managers/admins only
  managementCapacity: () => request("/api/management-view/capacity"),
  managementCapacitySave: (payload) => request("/api/management-view/capacity", { method: "PUT", body: JSON.stringify(payload) }),
  managementLhTrips: () => request("/api/management-view/lh-trips"),
  // Attendance -> PTWH (staging): roster, clock in / out, month sheet.
  ptwhWorkers: () => request("/api/attendance/ptwh/workers"),
  ptwhWorkerAdd: (payload) => request("/api/attendance/ptwh/workers", { method: "POST", body: JSON.stringify(payload) }),
  ptwhWorkerSave: (id, payload) => request(`/api/attendance/ptwh/workers/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  ptwhDecision: (id, decision, note) => request(`/api/attendance/ptwh/workers/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, note }) }),
  ptwhDay: (date) => request(`/api/attendance/ptwh/day${date ? `?date_=${encodeURIComponent(date)}` : ""}`),
  ptwhClockIn: (workerId, category) => request("/api/attendance/ptwh/clock-in", { method: "POST", body: JSON.stringify({ worker_id: workerId, category }) }),
  // Roster import: the PTWH DETAILS tab downloaded as CSV. dryRun = just report what would be added.
  ptwhImport: async (file, dryRun) => {
    const formData = new FormData();
    formData.append("file", file);
    // No Content-Type header -- the browser sets the multipart boundary itself.
    const res = await fetch(`/api/attendance/ptwh/import?dry_run=${dryRun ? "true" : "false"}`, { method: "POST", body: formData, headers: viewAsHeaders() });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = (await res.json()).detail || detail;
      } catch {
        /* ignore */
      }
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    return res.json();
  },
  ptwhClockOut: (workerId) => request("/api/attendance/ptwh/clock-out", { method: "POST", body: JSON.stringify({ worker_id: workerId }) }),
  // Controlled changes to clock records: a request with a reason (nothing is edited or deleted directly), approved by a Region Head / RFS / Manager when it is big.
  ptwhCorrect: (payload) => request("/api/attendance/ptwh/corrections", { method: "POST", body: JSON.stringify(payload) }),
  ptwhCorrections: (status) => request(`/api/attendance/ptwh/corrections${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  ptwhCorrectionDecision: (id, decision, note) => request(`/api/attendance/ptwh/corrections/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, note }) }),
  // Attendance -> Staff: Station Heads / Fleet Assistants clock in by location (signed in with their Google account).
  staffMe: () => request("/api/attendance/staff/me"),
  staffClock: (payload) => request("/api/attendance/staff/clock", { method: "POST", body: JSON.stringify(payload) }),
  staffDay: (date) => request(`/api/attendance/staff/day?date=${encodeURIComponent(date)}`),
  staffMonth: (month) => request(`/api/attendance/staff/month?month=${encodeURIComponent(month)}`),
  staffFix: (payload) => request("/api/attendance/staff/fix", { method: "POST", body: JSON.stringify(payload) }),
  ptwhRehire: (id, station) => request(`/api/attendance/ptwh/workers/${id}/rehire`, { method: "POST", body: JSON.stringify({ station }) }),
  ptwhQr: (station, workerId) => request(`/api/attendance/ptwh/station/${encodeURIComponent(station)}/qr`, { method: "POST", body: JSON.stringify({ worker_id: workerId }) }),
  // The month in the HR sheet's layout (text, not JSON) -- csv to download, tsv to copy into the sheet.
  ptwhExport: async ({ month, region, zone, station, fmt, header }) => {
    const qsx = new URLSearchParams({ ...(month ? { month } : {}), ...(region ? { region } : {}), ...(zone ? { zone } : {}), ...(station ? { station } : {}), fmt, header: header ? "true" : "false" });
  staffFlags: () => request("/api/attendance/staff/flags"),
  staffFlagAction: (payload) => request("/api/attendance/staff/flags/action", { method: "POST", body: JSON.stringify(payload) }),
    const res = await fetch(`/api/attendance/ptwh/export?${qsx}`, { headers: viewAsHeaders() });
    if (!res.ok) {
      let detail = res.statusText;
      try { detail = (await res.json()).detail || detail; } catch { /* not JSON */ }
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    return { text: await res.text(), rows: Number(res.headers.get("X-Rows") || 0) };
  },
  // Attendance -> PTWH -> the PTWH app: logins, the station's hourly QR + location, selfie audit.
  ptwhLogins: () => request("/api/attendance/ptwh/logins"),
  ptwhLoginCreate: (workerId, username) => request(`/api/attendance/ptwh/workers/${workerId}/login`, { method: "POST", body: JSON.stringify({ username }) }),
  ptwhLoginReset: (workerId) => request(`/api/attendance/ptwh/workers/${workerId}/login/reset`, { method: "POST" }),
  ptwhLoginDisable: (workerId, disabled) => request(`/api/attendance/ptwh/workers/${workerId}/login/disable`, { method: "POST", body: JSON.stringify({ disabled }) }),
  ptwhStation: (station) => request(`/api/attendance/ptwh/station/${encodeURIComponent(station)}`),
  ptwhAudit: (from, to, station) => request(`/api/attendance/ptwh/audit?${new URLSearchParams({ ...(from ? { from_: from } : {}), ...(to ? { to } : {}), ...(station ? { station } : {}) })}`),
  ptwhFlag: (recordId, status, note) => request(`/api/attendance/ptwh/audit/${recordId}/flag`, { method: "POST", body: JSON.stringify({ status, note }) }),
  ptwhPhotoUrl: (recordId, which) => `/api/attendance/ptwh/photo/${recordId}/${which}`,
  schedule: (station, weekStart) => request(`/api/attendance/schedule?${new URLSearchParams({ ...(station ? { station } : {}), ...(weekStart ? { week_start: weekStart } : {}) })}`),
  // Settings -> Launch Timeline: Attendance goes live by batch (region / zone / station dates).
  launchList: () => request("/api/attendance/launch"),
  launchSet: (payload) => request("/api/attendance/launch", { method: "PUT", body: JSON.stringify(payload) }),
  launchMe: () => request("/api/attendance/launch/me"),
  // Attendance -> Hybrid (manual for now).
  hybridDrivers: () => request("/api/attendance/hybrid/drivers"),
  hybridDriverAdd: (payload) => request("/api/attendance/hybrid/drivers", { method: "POST", body: JSON.stringify(payload) }),
  hybridDriverEdit: (id, payload) => request(`/api/attendance/hybrid/drivers/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  hybridDay: (date) => request(`/api/attendance/hybrid/day?date=${encodeURIComponent(date)}`),
  hybridMonth: (month) => request(`/api/attendance/hybrid/month?month=${encodeURIComponent(month)}`),
  hybridSave: (payload) => request("/api/attendance/hybrid/record", { method: "PUT", body: JSON.stringify(payload) }),
  hybridClear: (driverId, date) => request(`/api/attendance/hybrid/record?driver_id=${driverId}&work_date=${encodeURIComponent(date)}`, { method: "DELETE" }),
  scheduleShiftTime: (payload) => request("/api/attendance/schedule/shift-times", { method: "PUT", body: JSON.stringify(payload) }),
  scheduleCell: (payload) => request("/api/attendance/schedule/cell", { method: "PUT", body: JSON.stringify(payload) }),
  scheduleCopy: (payload) => request("/api/attendance/schedule/copy-week", { method: "POST", body: JSON.stringify(payload) }),
  ptwhMonth: (month) => request(`/api/attendance/ptwh/month?month=${encodeURIComponent(month)}`),
  managementNotes: () => request("/api/management-view/notes"),
  managementNoteSave: (stationCode, payload) =>
    request(`/api/management-view/notes/${encodeURIComponent(stationCode)}`, { method: "PUT", body: JSON.stringify(payload) }),
  kpiMetabaseCheck: () => request("/api/kpi/metabase-check"),
  kpiWeekly: () => request("/api/kpi/weekly"),
  kpiInvalidPod: (q = {}) => request(`/api/kpi/invalid-pod?${qs(q)}`),
  kpiInvalidPodTns: (q) => request(`/api/kpi/invalid-pod/tns?${qs(q)}`),
  kpiInvalidPodDrivers: (q) => request(`/api/kpi/invalid-pod/drivers?${qs(q)}`),
  kpiInvalidPodTrend: (q) => request(`/api/kpi/invalid-pod/trend?${qs(q)}`),
  kpiPodPerformance: () => request("/api/kpi/pod-performance"),
  kpiCispView: (kpi, q) => request(`/api/kpi/cisp/${kpi}/view?${qs(q)}`),
  kpiTargets: () => request("/api/kpi/targets"),
  kpiTargetsSave: (rows) => request("/api/kpi/targets", { method: "PUT", body: JSON.stringify({ rows }) }),
  kpiSettingsSave: (settings) => request("/api/kpi/settings", { method: "PUT", body: JSON.stringify(settings) }),
  regionListStatus: () => request("/api/admin/region-list"),
  regionListSetUrl: (url) => request("/api/admin/region-list/url", { method: "PUT", body: JSON.stringify({ url }) }),
  regionListSync: () => request("/api/admin/region-list/sync", { method: "POST" }),
  // Recovery -> Active Missing / Lost Declared This Week / Lost Declared Summary (backend/recovery_lost.py)
  activeMissing: (kind = "parcel") => request(`/api/recovery/active-missing?kind=${kind}`),
  activeMissingSave: (tn, body) => request(`/api/recovery/active-missing/${encodeURIComponent(tn)}`, { method: "PUT", body: JSON.stringify(body) }),
  lostDeclared: (view, week) => request(`/api/recovery/lost-declared?view=${view}${week ? `&week=${encodeURIComponent(week)}` : ""}`),
  lostDeclaredSave: (tn, body) => request(`/api/recovery/lost-declared/${encodeURIComponent(tn)}`, { method: "PUT", body: JSON.stringify(body) }),
  lostDeclaredMove: () => request("/api/recovery/lost-declared/move", { method: "POST" }),
  // Recovery -> PDCNR / Damage / No Label from Hub (backend/recovery_cases.py): type = pdcnr | damage | nolabel
  recoveryCases: (type) => request(`/api/recovery-cases/${type}`),
  recoveryCasesAdd: (type, body) => request(`/api/recovery-cases/${type}`, { method: "POST", body: JSON.stringify(body) }),
  recoveryCaseSave: (type, id, body) => request(`/api/recovery-cases/${type}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  recoveryCaseDelete: (type, id) => request(`/api/recovery-cases/${type}/${id}`, { method: "DELETE" }),
  recoveryCasesImport: (type, csv) => request(`/api/recovery-cases/${type}/import`, { method: "POST", body: JSON.stringify({ csv }) }),
  // A photo for one column of one row; recoveryCaseFileUrl is what <img src> / a download link points at (same origin, so the sign-in comes along).
  recoveryCaseUpload: async (type, id, field, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/recovery-cases/${type}/${id}/file/${field}`, { method: "POST", body: formData, headers: viewAsHeaders() });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = (await res.json()).detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json();
  },
  recoveryCaseFileUrl: (type, id, field, download = false) => `/api/recovery-cases/${type}/${id}/file/${field}${download ? "?download=true" : ""}`,
  kpiCodRtsView: (q) => request(`/api/kpi/cod-rts/view?${qs(q)}`),
  kpiCodRtsTns: (q) => request(`/api/kpi/cod-rts/tns?${qs(q)}`),
  kpiTable: (name) => request(`/api/kpi/table/${name}`),
  // Task List (backend/tasklist.py)
  reminders: { ack: (kind, id) => request("/api/reminders/ack", { method: "POST", body: JSON.stringify({ kind, id }) }) },
  followups: {
    list: () => request("/api/followups"),
    create: (payload) => request("/api/followups", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/api/followups/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id) => request(`/api/followups/${id}`, { method: "DELETE" }),
    markSeen: () => request("/api/followups/mark-seen", { method: "POST" }),
  },
  todos: {
    list: () => request("/api/todos"),
    create: (payload) => request("/api/todos", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/api/todos/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id) => request(`/api/todos/${id}`, { method: "DELETE" }),
  },
  tasks: {
    list: () => request("/api/tasks"),
    create: (payload) => request("/api/tasks", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id) => request(`/api/tasks/${id}`, { method: "DELETE" }),
    markSeen: () => request("/api/tasks/mark-seen", { method: "POST" }),
  },
  coldChain: () => request("/api/cold-chain"),
  restockBundles: (view) => request(`/api/restock-bundles?view=${encodeURIComponent(view || "all")}`),
  b2bComplianceTns: (stationCode, status, documentTypes) =>
    request(
      `/api/b2b-compliance/tns?station_code=${encodeURIComponent(stationCode)}&status=${encodeURIComponent(status || "all")}` +
        `&document_type=${encodeURIComponent(documentTypes?.length ? documentTypes.join(",") : "")}`
    ),
  driverDetails: {
    status: () => request("/api/admin/driver-details/status"),
    upload: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      // No Content-Type header -- the browser sets the multipart boundary itself.
      const res = await fetch("/api/admin/driver-details/upload", { method: "POST", body: formData });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          detail = (await res.json()).detail || detail;
        } catch {
          /* ignore */
        }
        const err = new Error(detail);
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
  },
};
