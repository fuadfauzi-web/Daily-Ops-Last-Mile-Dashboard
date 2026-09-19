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
  routedView: () => request("/api/routed-view"),
  shipperWatch: () => request("/api/shipper-watch"),
  shipperDrilldown: (stationCode, metric) =>
    request(
      `/api/shipper-drilldown?station_code=${encodeURIComponent(stationCode)}&metric=${encodeURIComponent(metric)}`
    ),
  agingDetails: (type) => request(`/api/aging-details?type=${encodeURIComponent(type)}`),
  oldRoute: () => request("/api/old-route"),
  users: {
    list: () => request("/api/admin/users"),
    add: (payload) => request("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }),
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
};
