// "View As" (Settings -> Role Tester, admin-only): once set, every request
// carries the override so the whole app -- not just /api/me -- renders as
// that role/scope would see it. The backend only honours this for a real
// admin (checked server-side from the SSO email, see auth.get_current_user),
// so setting it client-side can't itself grant access to anything.
let viewAs = null; // { role, scopeType, scopeValues } | null
function setViewAs(next) {
  viewAs = next;
}
function getViewAs() {
  return viewAs;
}

// Always same-origin relative paths — the ingress routes /api to the backend.
async function request(path, opts = {}) {
  const viewAsHeaders = viewAs
    ? {
        "X-View-As-Role": viewAs.role,
        "X-View-As-Scope-Type": viewAs.scopeType || "all",
        "X-View-As-Scope-Values": (viewAs.scopeValues || []).join(","),
      }
    : {};
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...viewAsHeaders, ...(opts.headers || {}) },
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
  stations: () => request("/api/stations"),
  regions: () => request("/api/regions"),
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
    list: () => request("/api/admin/users"),
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
    submit: (message) => request("/api/feedback", { method: "POST", body: JSON.stringify({ message }) }),
    list: () => request("/api/feedback"),
  },
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
