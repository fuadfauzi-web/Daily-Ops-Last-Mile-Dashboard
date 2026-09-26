"""Invalid POD RCA and the LM POD Performance manager view (staging, 2026-09-26).

Every failed delivery attempt is validated: FAILURE = the proof of delivery attempt was judged invalid, SUCCESS = valid. The KPI is the
invalid share (target under 25%); this shows WHERE it comes from -- station, driver, reason, day -- with the tracking numbers behind it.

Speed: an upload (a whole nationwide week is ~87,000 rows) is turned ONCE into a compact structure -- counts per station / day / driver
and per reason, plus the invalid tracking numbers -- and only that stays in memory. Every view (the page, the drivers' top reasons, the
date trends, the tracking numbers) is then a pass over those counts, filtered to what the viewer's scope allows, instead of a pass over
the raw rows on every request.

Two datasets feed it:
  invalid_pod_raw  the POD validation Raw sheet (Metabase question 69573)  -> the Invalid POD RCA for everyone, limited to their scope
  pod_performance  the LM POD Performance workbook's RAW DATA sheet (adds the audit result, the final result / reason, zone, route
                   type)                                                   -> the LM performance view, managers and admins only
"""
import logging
import sys

from fastapi import APIRouter, Depends, HTTPException, Query

import kpi_data as kd
from auth import CurrentUser, get_current_user
import kpi_targets
from kpi_rca import TN_ROWS_CAP, _hub_meta, _in_scope, _monday, _pod_hub_code, _s, _week_label

log = logging.getLogger("kpi_pod")
router = APIRouter()

UNKNOWN_DAY = "unknown"


def _scope_key(user: CurrentUser) -> tuple:
    # the East Malaysia switch is part of the key: switching it changes who sees what, and every cached view is keyed by this
    return (user.scope_type, tuple(sorted(user.scope_values or [])), kpi_targets.include_east_malaysia())


def _week(day: str) -> str:
    return (_monday(day) or UNKNOWN_DAY) if day != UNKNOWN_DAY else UNKNOWN_DAY


def _visible(data: dict, user: CurrentUser) -> dict:
    """hub key -> may this user see it. Computed once per scope."""
    cache = data["vis"]
    sk = _scope_key(user)
    if sk not in cache:
        cache[sk] = {ck: _in_scope(real, user) for ck, real in data["real"].items()}
    return cache[sk]


def _picker(data: dict, user: CurrentUser, region: str, zone: str, hub: str | None):
    """A function saying whether a hub key passes the viewer's scope and the region / zone / station filters."""
    vis = _visible(data, user)
    meta = data["meta"]
    memo: dict[str, bool] = {}

    def ok(ck: str) -> bool:
        if ck not in memo:
            m = meta[ck]
            memo[ck] = bool(vis.get(ck)) and (not hub or ck == hub) and (region == "all" or m["region"] == region) and (zone == "all" or m["zone"] == zone)
        return memo[ck]

    return ok


# ------------------------------------------------------------------------------------------------ compact structure: POD validation

def build_pod(rows: list[dict]) -> dict:
    keys = {kd.norm(k): k for k in (rows[0] if rows else {})}

    def g(r: dict, name: str):
        k = keys.get(name)
        return r.get(k) if k else None

    cd: dict[tuple, list] = {}  # (hub key, day, courier) -> [validated, invalid]
    cdr: dict[tuple, int] = {}  # (hub key, day, courier, invalid reason) -> count
    tns: list[tuple] = []  # every invalid attempt, for the tracking-number lists
    meta: dict[str, dict] = {}
    real: dict[str, str | None] = {}
    days: set[str] = set()
    for r in rows:
        result = _s(g(r, "validationresult")).upper()
        if result not in ("FAILURE", "SUCCESS"):
            continue
        raw_hub = _s(g(r, "hubshortname"))
        code = _pod_hub_code(raw_hub)
        ck = code or raw_hub
        if ck not in meta:
            meta[ck] = _hub_meta(code, raw_hub)
            real[ck] = code
        att = _s(g(r, "attempteddatetime"))
        val = _s(g(r, "validationdatetime"))
        day = kd.to_iso_day(att) or kd.to_iso_day(val) or UNKNOWN_DAY
        days.add(day)
        courier = sys.intern(_s(g(r, "couriername")) or "(no courier)")
        k = (ck, day, courier)
        cell = cd.get(k)
        if cell is None:
            cell = cd[k] = [0, 0]
        cell[0] += 1
        if result == "FAILURE":
            cell[1] += 1
            reason = sys.intern(_s(g(r, "invalidpodreason")) or "(no reason given)")
            rk = (ck, day, courier, reason)
            cdr[rk] = cdr.get(rk, 0) + 1
            tns.append((ck, raw_hub, courier, _s(g(r, "trackingid")), sys.intern(_s(g(r, "transactionfailurereason"))), reason, att, val, sys.intern(_s(g(r, "validationusername"))), day))
    return {"cd": cd, "cdr": cdr, "tns": tns, "meta": meta, "real": real, "days": sorted(days), "vis": {}, "main": {}}


async def _pod():
    got = await kd.load_compact("invalid_pod_raw")
    return got  # (meta, data) or None


# ------------------------------------------------------------------------------------------------ the page (Overview tab)

def _main_view(data: dict, user: CurrentUser) -> dict:
    sk = _scope_key(user)
    cached = data["main"].get(sk)
    if cached is not None:
        return cached
    vis = _visible(data, user)
    hubs: dict[tuple, list] = {}
    couriers: dict[tuple, list] = {}
    reasons: dict[tuple, int] = {}
    weeks: set[str] = set()
    for (ck, day, courier), (t, i) in data["cd"].items():
        if not vis.get(ck):
            continue
        w = _week(day)
        weeks.add(w)
        h = hubs.setdefault((ck, w), [0, 0])
        h[0] += t
        h[1] += i
        c = couriers.setdefault((ck, w, courier), [0, 0])
        c[0] += t
        c[1] += i
    for (ck, day, courier, reason), n in data["cdr"].items():
        if vis.get(ck):
            rk = (ck, _week(day), reason)
            reasons[rk] = reasons.get(rk, 0) + n
    out = {
        "weeks": [{"key": w, "label": _week_label(w) if w != UNKNOWN_DAY else "Unknown date"} for w in sorted(weeks)],
        "hubs": [{**data["meta"][ck], "week": w, "total": v[0], "invalid": v[1]} for (ck, w), v in hubs.items()],
        "reasons": [{"code": ck, "week": w, "reason": reason, "count": n} for (ck, w, reason), n in reasons.items()],
        "couriers": [{"code": ck, "week": w, "courier": courier, "total": v[0], "invalid": v[1]} for (ck, w, courier), v in couriers.items() if v[1] > 0],
    }
    if len(data["main"]) > 64:
        data["main"].clear()
    data["main"][sk] = out
    return out


@router.get("/api/kpi/invalid-pod")
async def kpi_invalid_pod(user: CurrentUser = Depends(get_current_user)):
    got = await _pod()
    if got is None:
        return {"has_data": False}
    meta, data = got
    return {"has_data": True, "meta": meta, **_main_view(data, user)}


@router.get("/api/kpi/invalid-pod/tns")
async def kpi_invalid_pod_tns(hub: str | None = None, week: str | None = None, reason: str | None = None, courier: str | None = None, user: CurrentUser = Depends(get_current_user)):
    got = await _pod()
    if got is None:
        raise HTTPException(status_code=404, detail="No POD validation file uploaded yet")
    _meta, data = got
    vis = _visible(data, user)
    out = []
    for ck, raw_hub, cn, tn, failure_reason, rs, att, val, validator, day in data["tns"]:
        if not vis.get(ck) or (hub and ck != hub) or (week and _week(day) != week) or (reason and rs != reason) or (courier and cn != courier):
            continue
        out.append({"tracking_id": tn, "hub": raw_hub, "courier": cn, "failure_reason": failure_reason, "invalid_reason": rs, "attempted": att, "validated": val, "validator": validator})
        if len(out) >= TN_ROWS_CAP:
            break
    return {"rows": out, "capped": len(out) >= TN_ROWS_CAP}


# ------------------------------------------------------------------------------------------------ Drivers tab: top invalid reason per driver

@router.get("/api/kpi/invalid-pod/drivers")
async def kpi_invalid_pod_drivers(
    week: str = "all", region: str = "all", zone: str = "all", hub: str | None = None, min_invalid: int = 1, limit: int = 1000,
    user: CurrentUser = Depends(get_current_user),
):
    """Every driver with invalid POD in view: attempts, invalid, invalid %, and the reasons behind it -- top reason first."""
    got = await _pod()
    if got is None:
        return {"has_data": False, "rows": []}
    _meta, data = got
    ok = _picker(data, user, region, zone, hub)
    agg: dict[tuple, list] = {}
    for (ck, day, courier), (t, i) in data["cd"].items():
        if ok(ck) and (week == "all" or _week(day) == week):
            a = agg.setdefault((ck, courier), [0, 0])
            a[0] += t
            a[1] += i
    reasons: dict[tuple, dict] = {}
    for (ck, day, courier, reason), n in data["cdr"].items():
        if ok(ck) and (week == "all" or _week(day) == week):
            d = reasons.setdefault((ck, courier), {})
            d[reason] = d.get(reason, 0) + n
    rows = []
    for (ck, courier), (t, i) in agg.items():
        if i < max(1, min_invalid):
            continue
        ranked = sorted(reasons.get((ck, courier), {}).items(), key=lambda kv: (-kv[1], kv[0]))
        m = data["meta"][ck]
        rows.append({
            "courier": courier, "code": ck, "station": m["name"], "zone": m["zone"], "region": m["region"], "total": t, "invalid": i,
            "top_reason": ranked[0][0] if ranked else None, "top_count": ranked[0][1] if ranked else 0,
            "reasons": [{"reason": r, "count": n} for r, n in ranked[:8]],
        })
    rows.sort(key=lambda r: (-r["invalid"], r["courier"]))
    return {"has_data": True, "rows": rows[: max(1, min(limit, 3000))], "total_drivers": len(rows), "capped": len(rows) > limit}


# ------------------------------------------------------------------------------------------------ Date trend tab

@router.get("/api/kpi/invalid-pod/trend")
async def kpi_invalid_pod_trend(
    level: str = "station", week: str = "all", region: str = "all", zone: str = "all", hub: str | None = None,
    keys: list[str] = Query(default=[]), top: int = 5, user: CurrentUser = Depends(get_current_user),
):
    """Attempts and invalid POD per day for a region, zone, station or driver (level). Without `keys` the `top` entities with the most
    invalid POD are drawn; `options` lists what can be picked. `__all__` is everything in view."""
    if level not in ("region", "zone", "station", "driver"):
        raise HTTPException(status_code=422, detail="level must be region, zone, station or driver")
    got = await _pod()
    if got is None:
        return {"has_data": False}
    _meta, data = got
    ok = _picker(data, user, region, zone, hub)
    meta = data["meta"]

    def entity(ck: str, courier: str) -> tuple[str, str]:
        m = meta[ck]
        if level == "region":
            return m["region"], m["region"]
        if level == "zone":
            return m["zone"], m["zone"]
        if level == "station":
            return ck, m["name"]
        return f"{ck}|{courier}", f"{courier} ({m['name']})"

    per_day: dict[str, dict[str, list]] = {}
    totals: dict[str, list] = {}
    labels: dict[str, str] = {}
    all_day: dict[str, list] = {}
    for (ck, day, courier), (t, i) in data["cd"].items():
        if day == UNKNOWN_DAY or not ok(ck) or (week != "all" and _week(day) != week):
            continue
        key, label = entity(ck, courier)
        labels[key] = label
        d = per_day.setdefault(key, {}).setdefault(day, [0, 0])
        d[0] += t
        d[1] += i
        tt = totals.setdefault(key, [0, 0])
        tt[0] += t
        tt[1] += i
        a = all_day.setdefault(day, [0, 0])
        a[0] += t
        a[1] += i
    days = sorted(all_day)
    ranked = sorted(totals.items(), key=lambda kv: (-kv[1][1], -kv[1][0], kv[0]))
    chosen = [k for k in keys if k in totals] or [k for k, _v in ranked[: max(1, min(top, 12))]]

    def series(key: str, label: str, by_day: dict) -> dict:
        return {"key": key, "label": label, "total": [by_day.get(d, [0, 0])[0] for d in days], "invalid": [by_day.get(d, [0, 0])[1] for d in days]}

    return {
        "has_data": True, "level": level, "days": days,
        "all": series("__all__", "Everything in view", all_day),
        "series": [series(k, labels[k], per_day[k]) for k in chosen],
        "options": [{"key": k, "label": labels[k], "total": v[0], "invalid": v[1]} for k, v in ranked[:400]],
        "option_count": len(ranked),
    }


# ------------------------------------------------------------------------------------------------ LM POD Performance (managers + admins)

def build_perf(rows: list[dict]) -> dict:
    keys = {kd.norm(k): k for k in (rows[0] if rows else {})}

    def g(r: dict, name: str):
        k = keys.get(name)
        return r.get(k) if k else None

    agg: dict[tuple, int] = {}
    meta: dict[str, dict] = {}
    real: dict[str, str | None] = {}
    weeks: set[str] = set()
    days: set[str] = set()
    for r in rows:
        raw_hub = _s(g(r, "hubshortname"))
        first = _s(g(r, "validationresult")).upper()
        final = (_s(g(r, "result")) or first).upper()
        if not raw_hub or final not in ("FAILURE", "SUCCESS"):
            continue
        code = _pod_hub_code(raw_hub)
        ck = code or raw_hub
        if ck not in meta:
            meta[ck] = _hub_meta(code, raw_hub)
            real[ck] = code
        audit = _s(g(r, "auditresult")).upper()
        reason = sys.intern((_s(g(r, "finalreason")) or _s(g(r, "invalidpodreason")) or "(no reason given)")) if final == "FAILURE" else ""
        day = kd.to_iso_day(g(r, "validationdatetime")) or UNKNOWN_DAY
        days.add(day)
        wk = g(r, "week")
        if wk not in (None, ""):
            weeks.add(str(int(wk)) if isinstance(wk, (int, float)) else str(wk))
        key = (
            ck, sys.intern(_s(g(r, "hubzone")) or "(none)"), sys.intern(_s(g(r, "routetype")) or "(unknown)"), sys.intern(_s(g(r, "couriername")) or "(no courier)"),
            sys.intern(_s(g(r, "transactionfailurereason")) or "(no reason)"), final, reason, 1 if audit else 0, 1 if audit and audit != first else 0, day,
        )
        agg[key] = agg.get(key, 0) + 1
    return {"agg": agg, "meta": meta, "real": real, "weeks": sorted(weeks), "days": sorted(d for d in days if d != UNKNOWN_DAY), "vis": {}, "view": {}}


def _perf_view(data: dict, user: CurrentUser) -> dict:
    sk = _scope_key(user)
    cached = data["view"].get(sk)
    if cached is not None:
        return cached
    vis = _visible(data, user)
    meta = data["meta"]
    head = {"validated": 0, "invalid": 0, "audited": 0, "audit_changed": 0}
    routes: dict[str, list] = {}
    zones: dict[str, list] = {}
    stations: dict[str, list] = {}
    drivers: dict[tuple, dict] = {}  # (route, hub, courier) -> {validated, invalid, reasons}
    invalid_reasons: dict[str, int] = {}
    failure: dict[str, list] = {}
    per_day: dict[str, list] = {}
    for (ck, zone, route, courier, fail, final, reason, audited, changed, day), n in data["agg"].items():
        if not vis.get(ck):
            continue
        bad = final == "FAILURE"
        head["validated"] += n
        head["audited"] += n * audited
        head["audit_changed"] += n * changed
        for bucket, k in ((routes, route), (zones, zone), (stations, ck), (failure, fail)):
            b = bucket.setdefault(k, [0, 0])
            b[0] += n
        d = per_day.setdefault(day, [0, 0])
        d[0] += n
        dr = drivers.setdefault((route, ck, courier), {"validated": 0, "invalid": 0, "reasons": {}})
        dr["validated"] += n
        if bad:
            head["invalid"] += n
            for bucket, k in ((routes, route), (zones, zone), (stations, ck), (failure, fail)):
                bucket[k][1] += n
            d[1] += n
            dr["invalid"] += n
            dr["reasons"][reason] = dr["reasons"].get(reason, 0) + n
            invalid_reasons[reason] = invalid_reasons.get(reason, 0) + n

    def driver_rows(route_name: str, cap: int) -> list[dict]:
        rows = []
        for (route, ck, courier), v in drivers.items():
            if route != route_name or v["invalid"] <= 0:
                continue
            ranked = sorted(v["reasons"].items(), key=lambda kv: (-kv[1], kv[0]))
            m = meta[ck]
            rows.append({"courier": courier, "code": ck, "station": m["name"], "zone": m["zone"], "validated": v["validated"], "invalid": v["invalid"],
                         "top_reason": ranked[0][0] if ranked else None, "top_count": ranked[0][1] if ranked else 0})
        rows.sort(key=lambda r: (-r["invalid"], r["courier"]))
        return rows[:cap]

    out = {
        "weeks": data["weeks"], "from": data["days"][0] if data["days"] else None, "to": data["days"][-1] if data["days"] else None,
        "headline": head,
        "routes": [{"route": k, "validated": v[0], "invalid": v[1]} for k, v in sorted(routes.items())],
        "zones": [{"zone": k, "validated": v[0], "invalid": v[1]} for k, v in zones.items()],
        "stations": [{"code": k, "station": meta[k]["name"], "zone": meta[k]["zone"], "region": meta[k]["region"], "validated": v[0], "invalid": v[1]} for k, v in stations.items()],
        "drivers": driver_rows("Driver", 600),
        "ops_routes": driver_rows("OPS", 300),
        "invalid_reasons": sorted(({"reason": k, "count": v} for k, v in invalid_reasons.items()), key=lambda r: -r["count"]),
        "failure_reasons": sorted(({"reason": k, "validated": v[0], "invalid": v[1]} for k, v in failure.items()), key=lambda r: -r["validated"]),
        "days": [{"day": d, "validated": v[0], "invalid": v[1]} for d, v in sorted(per_day.items()) if d != UNKNOWN_DAY],
    }
    if len(data["view"]) > 32:
        data["view"].clear()
    data["view"][sk] = out
    return out


@router.get("/api/kpi/pod-performance")
async def kpi_pod_performance(user: CurrentUser = Depends(get_current_user)):
    if user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="The LM POD performance view is for managers and admins")
    got = await kd.load_compact("pod_performance")
    if got is None:
        return {"has_data": False}
    meta, data = got
    return {"has_data": True, "meta": meta, **_perf_view(data, user)}


kd.register_compact("invalid_pod_raw", build_pod)
kd.register_compact("pod_performance", build_perf)
