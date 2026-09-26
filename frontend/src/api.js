// Always same-origin relative paths — the ingress routes /api to the backend.
async function request(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
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
  dod: () => request("/api/dod"), // DoD Dashboard: Station Health per day, this week + last week
  kpiHybrid: (view, refresh = false) => request(`/api/kpi/hybrid?view=${view}${refresh ? "&refresh=true" : ""}`),
  kpiUploads: () => request("/api/kpi/uploads"),
  kpiUpload: async (dataset, file) => {
    const formData = new FormData();
    formData.append("file", file);
    // No Content-Type header -- the browser sets the multipart boundary itself.
    const res = await fetch(`/api/kpi/uploads/${dataset}`, { method: "POST", body: formData });
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
  kpiCodRtsView: (q) => request(`/api/kpi/cod-rts/view?${qs(q)}`),
  kpiCodRtsTns: (q) => request(`/api/kpi/cod-rts/tns?${qs(q)}`),
  kpiTable: (name) => request(`/api/kpi/table/${name}`),
  me: () => request("/api/me"),
  dashboard: () => request("/api/dashboard"),
  stations: (opts) => request("/api/stations", opts),
  regions: (opts) => request("/api/regions", opts),
  drilldown: (stationCode, metric) =>
    request(`/api/drilldown?station_code=${encodeURIComponent(stationCode)}&metric=${encodeURIComponent(metric)}`),
  shipmentDetails: () => request("/api/shipment-details"),
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
  oldRoute: () => request("/api/old-route"),
  b2bCompliance: (documentTypes) =>
    request(`/api/b2b-compliance?document_type=${encodeURIComponent(documentTypes?.length ? documentTypes.join(",") : "rdo")}`),
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
      const res = await fetch("/api/feedback", { method: "POST", body: formData });
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
  reminders: { ack: (kind, id) => request("/api/reminders/ack", { method: "POST", body: JSON.stringify({ kind, id }) }) },
  // Task List (backend/tasklist.py)
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
  b2bComplianceTns: (stationCode, status) =>
    request(`/api/b2b-compliance/tns?station_code=${encodeURIComponent(stationCode)}&status=${encodeURIComponent(status || "all")}`),
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
