import { useEffect, useState } from "react";
import { api } from "../api";

// KPI targets per region (Admin -> KPI Settings sets them; backend/kpi_targets.py holds the defaults). Loaded once and shared, so a page
// that judges a number against its target reads it here instead of hard-coding it. setKpiTargets() refreshes every page that uses it.
let current = null; // the last /api/kpi/targets response
let inflight = null;
const listeners = new Set();

export function loadKpiTargets(force = false) {
  if (current && !force) return Promise.resolve(current);
  if (!inflight || force) {
    inflight = api
      .kpiTargets()
      .then((d) => {
        current = d;
        listeners.forEach((fn) => fn(d));
        return d;
      })
      .catch(() => current) // a page must still draw without its target
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function setKpiTargets(d) {
  current = d;
  listeners.forEach((fn) => fn(d));
}

// the target of a KPI for a region (the standard one -- Klang Valley -- when the region is unknown); null when not loaded or not set
export function kpiTarget(kpi, region) {
  const k = current?.kpis?.find((x) => x.key === kpi);
  if (!k) return null;
  return k.targets[region] ?? k.targets["Klang Valley"] ?? null;
}

// "25%" when every region shares the target, "9% (East Coast 7%, East Malaysia 12%)" when some differ
export function kpiTargetText(kpi, fmt = (v) => `${v}%`) {
  const k = current?.kpis?.find((x) => x.key === kpi);
  if (!k) return "";
  const std = k.targets["Klang Valley"];
  if (std == null && Object.values(k.targets).every((v) => v == null)) return "";
  const odd = Object.entries(k.targets).filter(([, v]) => v !== std && v != null);
  return odd.length ? `${std == null ? "—" : fmt(std)} (${odd.map(([r, v]) => `${r} ${fmt(v)}`).join(", ")})` : fmt(std);
}

// re-renders the caller when the targets arrive or change
export function useKpiTargets() {
  const [data, setData] = useState(current);
  useEffect(() => {
    listeners.add(setData);
    loadKpiTargets().then(setData);
    return () => listeners.delete(setData);
  }, []);
  return data;
}
