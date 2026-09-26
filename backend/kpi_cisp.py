"""CISP KPIs -- Prior, Completion D0 / D3, Terminal T7, FIFO D0 (2026-09-26).

The OPEX dashboard's result is the OFFICIAL number (Fleet Manager, 2026-09-26): the KPI page's OPEX Result / the "Official" panels show it. These
modules are the analysis side -- which stations are under target, how a week / month / day moved, where a KPI is slipping -- built from feeder files that
come out of Metabase (station by day counts). Their exclusions are provisional until confirmed with OPEX, so a rate here can differ a little from the
official one. When the Metabase API access exists the app will pull the same numbers itself instead of taking an upload.

Time (Fleet Manager, 2026-09-26): every page is read by WEEK (Monday to Sunday, week numbers like Excel's WEEKNUM(d, 2): last week is week 38), by MONTH or by DAY,
the way Hybrid Productivity is. The feeders hold 26 weeks of days, so the views work on any period: `from` / `to` pick the days, `prev_from` / `prev_to` the period
to compare with (the one before, of the same length, when not given). No range = the last complete Monday-Sunday week of the data. The Daily tab is the station-by-day
grid of a range, and the trend can be drawn per day, per week or per month.

Feeder files (Metabase questions in the Fleet Manager's collection; CSV or Excel):
  cisp_prior       127199  Dest Hub Name, Start Clock: Day, Measured, Met     (PRE-tagged TNs, open PETs excluded; met = completion_met_flag, which is judged on each TN's
                           WORKING start clock date -- but the result and the trend are by START clock date (the day of start_clock), Fleet Manager 2026-09-26)
  cisp_completion  127200  Dest Hub Name, Last Mile Start Clock Date: Day, D0 Measured, D0 Met, D3 Measured, D3 Met
  cisp_terminal    127201  Dest Hub Name, N7 Cutoff Date: Day, T7 Measured, T7 Met  (TNs past their N7 cut-off; dated by the N7 CUT-OFF date, Fleet Manager 2026-09-26 --
                           a T7 week is the week of the cut-off date, so it is final once it is over; the older "Last Mile Start Clock Date: Day" layout is still read)
  cisp_fifo        station by day like Prior (Dest Hub Name, Start Clock: Day, Measured, Met) -- or the older saved "(MY) LM CISP FIFO D0" question 118041, one period per
                   file (Total Orders, Total N0 Met per hub; no days, so no week / month / day views)

Targets are per REGION (kpi_targets.py, the Fleet Manager's "New Target" table): a station, zone or region row is judged against its own region's target; a
total that spans regions is judged against the blend of their targets (weighted by TNs measured) and says so.

Only stations are counted: the real Prior feed (2026-09-26) also carries hubs that are not stations (C-RTM-* return hubs, CC-* cross-dock / cold-chain hubs -- 44 of 187
hubs), so a row whose hub is not on the station reference list is left out of every view and counted instead (`not_counted`, shown to admins / managers on the page).

Speed: an upload becomes a compact {(station, day): [measured, met]} once; every view is a pass over it, limited to the viewer's scope.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query

import kpi_data as kd
import kpi_periods as kp
from auth import CurrentUser, get_current_user
from kpi_rca import _hub_code_from_code, _hub_meta, _in_scope, _monday, _num, _s
import kpi_targets
from kpi_targets import target_for, targets_for

log = logging.getLogger("kpi_cisp")
router = APIRouter()

# key -> label, dataset, measured column, met column, what OPEX calls it (the target: kpi_targets.py, same key)
KPIS: dict[str, dict] = {
    "prior": {"label": "Prior KPI", "dataset": "cisp_prior", "measured": "measured", "met": "met", "opex": "prior"},
    "d0": {"label": "Completion D0", "dataset": "cisp_completion", "measured": "d0measured", "met": "d0met", "opex": "d0_d2"},
    "d3": {"label": "Completion D3", "dataset": "cisp_completion", "measured": "d3measured", "met": "d3met", "opex": "d3"},
    "t7": {"label": "Terminal T7", "dataset": "cisp_terminal", "measured": "t7measured", "met": "t7met", "opex": "d7"},
    "fifo": {"label": "FIFO D0", "dataset": "cisp_fifo", "measured": "measured", "met": "met", "opex": "fifo"},
}
DATASET_KPIS = {"cisp_prior": ["prior"], "cisp_completion": ["d0", "d3"], "cisp_terminal": ["t7"], "cisp_fifo": ["fifo"]}


def _scope_key(user: CurrentUser) -> tuple:
    # the East Malaysia / Sarawak switches are part of the key: switching them changes who sees what, and every cached view is keyed by this
    return (user.scope_type, tuple(sorted(user.scope_values or [])), *kpi_targets.scope_flags())


def _columns(rows: list[dict]):
    keys = {kd.norm(k): k for k in (rows[0] if rows else {})}

    def g(r: dict, name: str):
        k = keys.get(name)
        return r.get(k) if k else None

    return g


def _check_fifo(rows: list[dict]) -> None:
    """The FIFO file is either station by day (Start Clock day + Measured + Met) or the saved question 118041's one-period layout (Total Orders + Total N0 Met)."""
    have = {kd.norm(k) for k in (rows[0] if rows else {})}
    if not ({"startclock", "measured", "met"} <= have or {"totalorders", "totaln0met"} <= have):
        raise kd.UploadError("This doesn't look like the FIFO D0 file -- it needs Dest Hub Name + Start Clock: Day + Measured + Met (station by day), or Dest Hub Name + Total Orders + Total N0 Met (one period)")


kd.DATASETS["cisp_fifo"]["check"] = _check_fifo


# ------------------------------------------------------------------------------------------------ compact structures

def _builder(dataset: str):
    keys = DATASET_KPIS[dataset]

    def build(rows: list[dict]) -> dict:
        g = _columns(rows)
        cells: dict[str, dict[tuple, list]] = {k: {} for k in keys}
        meta: dict[str, dict] = {}
        real: dict[str, str | None] = {}
        days: set[str] = set()
        snapshot: dict[str, dict] = {}  # FIFO's older one-period file: one row per hub, no days
        ignored: dict[str, dict[str, float]] = {}  # hubs that are not stations -> {kpi: TNs measured}

        def measured(r, k):
            v = g(r, KPIS[k]["measured"])
            return _num(v if v not in (None, "") else (g(r, "totalorders") if k == "fifo" else None))

        for r in rows:
            raw = _s(g(r, "desthubname"))
            if not raw:
                continue
            code = _hub_code_from_code(raw)
            if code is None:  # not a station (RTM / cross-dock / cold-chain hubs ...): not part of a station KPI, but counted so the page can say so
                ign = ignored.setdefault(raw, {})
                for k in keys:
                    ign[k] = ign.get(k, 0.0) + measured(r, k)
                continue
            ck = code
            if ck not in meta:
                meta[ck] = _hub_meta(code, raw)
                real[ck] = code
            day = kd.to_iso_day(g(r, "startclock") or g(r, "lastmilestartclockdate"))
            if not day:
                if "fifo" in keys and g(r, "totalorders") not in (None, ""):
                    s = snapshot.setdefault(ck, {"measured": 0.0, "met": 0.0})
                    s["measured"] += _num(g(r, "totalorders"))
                    s["met"] += _num(g(r, "totaln0met"))
                continue
            days.add(day)
            for k in keys:
                cell = cells[k].setdefault((ck, day), [0.0, 0.0])
                cell[0] += measured(r, k)
                cell[1] += _num(g(r, KPIS[k]["met"]))
        return {
            "cells": cells, "snapshot": snapshot, "snapshot_mode": bool(snapshot) and not days, "meta": meta, "real": real, "days": sorted(days), "ignored": ignored,
            "vis": {}, "cache": {},
        }

    return build


for _ds in DATASET_KPIS:
    kd.register_compact(_ds, _builder(_ds))


# ------------------------------------------------------------------------------------------------ helpers

def _pct(part: float, whole: float) -> float | None:
    return round(part / whole * 100, 2) if whole else None


def _visible(data: dict, user: CurrentUser) -> dict:
    sk = _scope_key(user)
    if sk not in data["vis"]:
        data["vis"][sk] = {ck: _in_scope(real, user) for ck, real in data["real"].items()}
    return data["vis"][sk]


def _picker(data: dict, user: CurrentUser, region: str, zone: str, hub: str | None):
    vis = _visible(data, user)
    meta = data["meta"]
    memo: dict[str, bool] = {}

    def ok(ck: str) -> bool:
        if ck not in memo:
            m = meta[ck]
            memo[ck] = bool(vis.get(ck)) and (not hub or ck == hub) and (region == "all" or m["region"] == region) and (zone == "all" or m["zone"] == zone)
        return memo[ck]

    return ok


def _options(data: dict, user: CurrentUser) -> dict:
    vis = _visible(data, user)
    hubs = [m for ck, m in data["meta"].items() if vis.get(ck)]
    return {
        "regions": sorted({h["region"] for h in hubs}),
        "zones": sorted({(h["zone"], h["region"]) for h in hubs}),
        "hubs": sorted(({"code": h["code"], "name": h["name"], "zone": h["zone"], "region": h["region"]} for h in hubs), key=lambda h: h["name"]),
    }


def _sum(cells: dict, ok, dayset: set) -> dict:
    """{station key: [measured, met]} over the days in dayset."""
    out: dict[str, list] = {}
    for (ck, day), (m, s) in cells.items():
        if day in dayset and ok(ck):
            a = out.setdefault(ck, [0.0, 0.0])
            a[0] += m
            a[1] += s
    return out


def _row(m: float, s: float, target: float, pm: float | None = None, ps: float | None = None) -> dict:
    rate = _pct(s, m)
    prev = _pct(ps, pm) if pm else None
    return {
        "measured": int(m), "met": int(s), "rate": rate, "gap": None if rate is None else round(rate - target, 2), "prev_rate": prev,
        "delta": None if rate is None or prev is None else round(rate - prev, 2), "status": None if rate is None else ("met" if rate >= target else "missed"),
    }


def _blend(kpi: str, parts) -> tuple[float, bool]:
    """(target %, whether regions with different targets are mixed) for [(region, TNs measured)] -- the region's own target when there is one region,
    otherwise the TN-weighted blend (an unweighted one when nothing was measured)."""
    parts = list(parts)
    if not parts:
        return target_for(kpi, None), False
    ts = {target_for(kpi, r) for r, _w in parts}
    if len(ts) == 1:
        return ts.pop(), False
    weight = sum(w for _r, w in parts)
    if weight <= 0:
        return round(sum(target_for(kpi, r) for r, _w in parts) / len(parts), 2), True
    return round(sum(target_for(kpi, r) * w for r, w in parts) / weight, 2), True


# ------------------------------------------------------------------------------------------------ views

def _overview(data: dict, kpi: str, ok, rng: tuple[str, str, str, str]) -> dict:
    meta = data["meta"]
    frm, to, pfrom, pto = rng
    if data["snapshot_mode"]:
        per = {ck: [v["measured"], v["met"]] for ck, v in data["snapshot"].items() if ok(ck)}
        prev: dict = {}
        wdays, pdays = [], []
    else:
        cells = data["cells"][kpi]
        wdays = [d for d in data["days"] if frm <= d <= to]
        pdays = [d for d in data["days"] if pfrom <= d <= pto]
        per = _sum(cells, ok, set(wdays))
        prev = _sum(cells, ok, set(pdays)) if pdays else {}
    stations = []
    for ck, (m, s) in per.items():
        pm, ps = prev.get(ck, [0.0, 0.0])
        st = target_for(kpi, meta[ck]["region"])
        stations.append({"code": ck, "name": meta[ck]["name"], "zone": meta[ck]["zone"], "region": meta[ck]["region"], "target": st, **_row(m, s, st, pm, ps)})

    def roll(keyfn):
        acc: dict[str, list] = {}
        pacc: dict[str, list] = {}
        for ck, (m, s) in per.items():
            a = acc.setdefault(keyfn(ck), [0.0, 0.0])
            a[0] += m
            a[1] += s
        for ck, (m, s) in prev.items():
            a = pacc.setdefault(keyfn(ck), [0.0, 0.0])
            a[0] += m
            a[1] += s
        out = []
        for k, (m, s) in acc.items():
            regions_of = {meta[ck]["region"] for ck in per if keyfn(ck) == k}
            t, _mixed = _blend(kpi, [(r, 1.0) for r in regions_of])  # a region / zone sits in one region, so this is that region's target
            out.append({"name": k, "stations": sum(1 for ck in per if keyfn(ck) == k), "target": t, **_row(m, s, t, *pacc.get(k, [0.0, 0.0]))})
        return out

    tm = sum(v[0] for v in per.values())
    ts = sum(v[1] for v in per.values())
    pm = sum(v[0] for v in prev.values())
    ps = sum(v[1] for v in prev.values())
    below = sum(1 for s in stations if s["status"] == "missed")
    target, mixed = _blend(kpi, [(meta[ck]["region"], v[0]) for ck, v in per.items()])
    return {
        "target": target, "target_mixed": mixed,
        "totals": _row(tm, ts, target, pm, ps),
        "regions": roll(lambda ck: meta[ck]["region"]),
        "zones": roll(lambda ck: meta[ck]["zone"]),
        "stations": stations,
        "stations_below_target": below,
        "stations_total": len(stations),
        "window_days": len(wdays), "from": frm, "to": to, "prev_from": pfrom, "prev_to": pto,
        "days_with_data": [wdays[0], wdays[-1]] if wdays else None,
    }


def _daily(data: dict, kpi: str, ok, rng: tuple[str, str, str, str]) -> dict:
    """The station-by-day grid of a range: per station the measured / met of every day of the data inside it."""
    meta = data["meta"]
    frm, to = rng[0], rng[1]
    days = [d for d in data["days"] if frm <= d <= to]
    at = {d: i for i, d in enumerate(days)}
    per: dict[str, list] = {}
    allm = [0.0] * len(days)
    alls = [0.0] * len(days)
    for (ck, day), (m, s) in data["cells"][kpi].items():
        i = at.get(day)
        if i is None or not ok(ck):
            continue
        a = per.setdefault(ck, [[0.0] * len(days), [0.0] * len(days)])
        a[0][i] += m
        a[1][i] += s
        allm[i] += m
        alls[i] += s
    stations = []
    for ck, (ms, ss) in per.items():
        stations.append({
            "code": ck, "name": meta[ck]["name"], "zone": meta[ck]["zone"], "region": meta[ck]["region"], "target": target_for(kpi, meta[ck]["region"]),
            "measured": [int(x) for x in ms], "met": [int(x) for x in ss], "total_measured": int(sum(ms)), "total_met": int(sum(ss)),
        })
    stations.sort(key=lambda s: s["name"])
    target, mixed = _blend(kpi, [(meta[ck]["region"], sum(v[0])) for ck, v in per.items()])
    return {
        "target": target, "target_mixed": mixed, "from": frm, "to": to, "daily_days": days,
        "stations": stations, "all": {"measured": [int(x) for x in allm], "met": [int(x) for x in alls]},
    }


def _trend(data: dict, kpi: str, ok, level: str, grain: str, keys: list[str], top: int, rng: tuple[str, str, str, str]) -> dict:
    """% per day / week / month. Days are the days of the picked period (a week, a month); weeks and months run over every day of the data."""
    meta = data["meta"]
    cells = data["cells"][kpi]

    def bucket(day: str) -> str:
        if grain == "week":
            return _monday(day) or day
        return day[:7] if grain == "month" else day

    def ent(ck: str) -> tuple[str, str]:
        m = meta[ck]
        return (m["region"], m["region"]) if level == "region" else (m["zone"], m["zone"]) if level == "zone" else (ck, m["name"])

    per: dict[str, dict[str, list]] = {}
    tot: dict[str, list] = {}
    labels: dict[str, str] = {}
    region_of: dict[str, str] = {}
    allb: dict[str, list] = {}
    for (ck, day), (m, s) in cells.items():
        if not ok(ck) or (grain == "day" and not rng[0] <= day <= rng[1]):
            continue
        b = bucket(day)
        key, label = ent(ck)
        labels[key] = label
        region_of[key] = meta[ck]["region"]
        c = per.setdefault(key, {}).setdefault(b, [0.0, 0.0])
        c[0] += m
        c[1] += s
        t = tot.setdefault(key, [0.0, 0.0])
        t[0] += m
        t[1] += s
        a = allb.setdefault(b, [0.0, 0.0])
        a[0] += m
        a[1] += s
    buckets = sorted(allb)
    short, names = kp.trend_labels(grain, buckets, data["days"])
    # default picks: the entities furthest under target first (lowest rate, with enough volume to mean something)
    ranked = sorted(((k, v) for k, v in tot.items() if v[0] > 0), key=lambda kv: (kv[1][1] / kv[1][0], -kv[1][0]))
    chosen = [k for k in keys if k in tot] or [k for k, _v in ranked[: max(1, min(top, 10))]]

    target, mixed = _blend(kpi, [(region_of[k], v[0]) for k, v in tot.items()])

    def series(key, label, by, t):
        return {"key": key, "label": label, "target": t, "measured": [by.get(b, [0, 0])[0] for b in buckets], "met": [by.get(b, [0, 0])[1] for b in buckets]}

    return {
        "has_days": bool(buckets), "level": level, "grain": grain, "days": buckets, "labels": short, "names": names, "target": target, "target_mixed": mixed,
        "all": series("__all__", "Everything in view", allb, target),
        "series": [series(k, labels[k], per[k], target_for(kpi, region_of[k])) for k in chosen],
        "options": [{"key": k, "label": labels[k], "measured": int(v[0]), "rate": _pct(v[1], v[0])} for k, v in ranked[:400]],
    }


# ------------------------------------------------------------------------------------------------ endpoints

@router.get("/api/kpi/cisp/{kpi}/view")
async def cisp_view(
    kpi: str, tab: str = "overview", view: str = "weekly", period: str | None = None, frm: str | None = Query(default=None, alias="from"), to: str | None = None,
    prev_from: str | None = None, prev_to: str | None = None, region: str = "all", zone: str = "all", hub: str | None = None,
    level: str = "station", grain: str = "day", keys: list[str] = Query(default=[]), top: int = 5, user: CurrentUser = Depends(get_current_user),
):
    """Prior / Completion D0 / D3 / Terminal T7 / FIFO D0 from the uploaded feeder file. The period is view (weekly / monthly / daily) + period (a week's Monday or a
    month, YYYY-MM; default the last complete week / month, the current month for daily) or an explicit from..to. tab=overview: the result of the period against the one
    before (or prev_from..prev_to), with the regions / zones / stations; tab=daily: the station-by-day grid of the period; tab=trend: the % per day (of the period) /
    week / month (grain) for the picked regions / zones / stations. Limited to the caller's scope."""
    spec = KPIS.get(kpi)
    if spec is None:
        raise HTTPException(status_code=404, detail="Unknown KPI")
    if tab not in ("overview", "trend", "daily"):
        raise HTTPException(status_code=422, detail="tab must be overview, daily or trend")
    if level not in ("region", "zone", "station") or grain not in ("day", "week", "month") or view not in kp.VIEWS:
        raise HTTPException(status_code=422, detail="level must be region / zone / station, grain day / week / month, view weekly / monthly / daily")
    await kpi_targets.ensure_fresh()
    got = await kd.load_compact(spec["dataset"])
    if got is None:
        return {"has_data": False, "kpi": kpi, "label": spec["label"], "snapshot": False}
    meta_file, data = got
    snapshot = data["snapshot_mode"]
    picked = kp.resolve(data["days"], view, period, frm, to, prev_from, prev_to)
    rng = (picked["from"], picked["to"], picked["prev_from"], picked["prev_to"])
    ckey = (kpi_targets.version(), kpi, _scope_key(user), tab, rng, region, zone, hub, level, grain, tuple(keys), top)
    cache = data["cache"]
    if ckey not in cache:
        ok = _picker(data, user, region, zone, hub)
        if tab == "overview" or snapshot:
            body = _overview(data, kpi, ok, rng)
        elif tab == "daily":
            body = _daily(data, kpi, ok, rng)
        else:
            body = _trend(data, kpi, ok, level, grain, keys, top, rng)
        if len(cache) > 300:
            cache.clear()
        cache[ckey] = body
    ign = data.get("ignored") or {}
    not_counted = None
    if user.scope_type == "all" and ign:  # only someone who sees everything is told what was left out
        by_hub = sorted(((h, v.get(kpi, 0.0)) for h, v in ign.items()), key=lambda kv: -kv[1])
        not_counted = {"hubs": len(by_hub), "measured": int(sum(m for _h, m in by_hub)), "examples": [h for h, _m in by_hub[:5]]}
    return {
        "not_counted": not_counted,
        "has_data": True, "kpi": kpi, "label": spec["label"], "snapshot": snapshot, "targets": targets_for(kpi), "opex_key": spec["opex"], "meta": meta_file,
        "options": _options(data, user), "range": {"from": data["days"][0], "to": data["days"][-1]} if data["days"] else None, "days": data["days"], "tab": tab,
        "view": picked["view"], "period": picked["period"], "periods": kp.options(data["days"]), **cache[ckey],
    }
