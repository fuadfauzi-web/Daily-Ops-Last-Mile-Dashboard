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

export const api = {
  me: () => request("/api/me"),
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
  routedView: (driverType) =>
    request(`/api/routed-view${driverType ? `?driver_type=${encodeURIComponent(driverType)}` : ""}`),
  shipperWatch: () => request("/api/shipper-watch"),
  shipperDrilldown: (stationCode, metric) =>
    request(
      `/api/shipper-drilldown?station_code=${encodeURIComponent(stationCode)}&metric=${encodeURIComponent(metric)}`
    ),
  agingDetails: (type) => request(`/api/aging-details?type=${encodeURIComponent(type)}`),
  oldRoute: () => request("/api/old-route"),
  missingDetails: () => request("/api/recovery/missing-details"),
  recoverySettings: {
    get: () => request("/api/recovery/settings"),
    save: (payload) => request("/api/recovery/settings", { method: "PUT", body: JSON.stringify(payload) }),
  },
  urgentTnLookup: (trackingNumbers) =>
    request("/api/urgent-tn-lookup", { method: "POST", body: JSON.stringify({ tracking_numbers: trackingNumbers }) }),
  pendingYesterdayRoute: () => request("/api/pending-yesterday-route"),
  rpu: (stage, shipper) =>
    request(`/api/rpu?stage=${encodeURIComponent(stage)}${shipper ? `&shipper=${encodeURIComponent(shipper)}` : ""}`),
  rpuAging: (type, shipper) =>
    request(`/api/rpu-aging?type=${encodeURIComponent(type)}${shipper ? `&shipper=${encodeURIComponent(shipper)}` : ""}`),
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
};
