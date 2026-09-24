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

export const api = {
  me: () => request("/api/me"),
  viewAs: { set: setViewAs, get: getViewAs },
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
    removeMany: (ids) => request("/api/urgent-tn/items/bulk-remove", { method: "POST", body: JSON.stringify({ ids }) }),
    suggest: (q) => request(`/api/urgent-tn/pic-suggestions?q=${encodeURIComponent(q)}`),
  },
  notifications: () => request("/api/notifications"),
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
