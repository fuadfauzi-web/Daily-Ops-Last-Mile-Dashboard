"""COD RTS RCA -- deep analysis (staging, 2026-09-26).

Which COD parcels went back to the shipper (RTS) and why. The KPI (RTS rate, target under 9%) needs all COD orders as its denominator,
which is not in the file, so this shows COUNTS and shares; the rate stays with the OPEX result.

Data (uploads, or later Metabase): cod_rts_cod (the COD RTS parcels: hub, reason, status, shipper, parent shipper, driver, driver type,
parcel size, FIFO N0, lost flag, days to the first attempt, before-a-first-attempt flag; the date the RTS was triggered is used when the
file has it) and cod_rts_overall (all RTS parcels: reason, delivery attempts, COD value, date).

Speed: an upload becomes a compact list of tuples ONCE; each view is a pass over it, filtered to the viewer's scope, and the answers
are cached per (scope, view, filters).
"""
import logging
import sys

from fastapi import APIRouter, Depends, HTTPException, Query

import kpi_data as kd
from auth import CurrentUser, get_current_user
from kpi_rca import TN_ROWS_CAP, _hub_code_from_code, _hub_meta, _in_scope, _num, _s

log = logging.getLogger("kpi_cod")
router = APIRouter()

# COD parcel tuple layout
CK, REASON, STATUS, BEFORE, DAYS, CTYPE, SHIPPER, PARENT, SIZE, FIFO, LOST, DRIVER, TN, DAY = range(14)
# overall RTS tuple layout
OCK, OREASON, OATT, OCOD, OBEFORE, ODAY = range(6)

NO_DRIVER = "(no driver)"


def _scope_key(user: CurrentUser) -> tuple:
    return (user.scope_type, tuple(sorted(user.scope_values or [])))


def _intern(value: str) -> str:
    return sys.intern(value) if len(value) < 80 else value


# ------------------------------------------------------------------------------------------------ compact structures

def _columns(rows: list[dict]):
    keys = {kd.norm(k): k for k in (rows[0] if rows else {})}

    def g(r: dict, name: str):
        k = keys.get(name)
        return r.get(k) if k else None

    return g


def build_cod(rows: list[dict]) -> dict:
    g = _columns(rows)
    out: list[tuple] = []
    meta: dict[str, dict] = {}
    real: dict[str, str | None] = {}
    has_day = False
    for r in rows:
        if _num(g(r, "rtsflag")) != 1:
            continue
        raw = _s(g(r, "desthubname"))
        code = _hub_code_from_code(raw)
        ck = code or raw
        if ck not in meta:
            meta[ck] = _hub_meta(code, raw)
            real[ck] = code
        days = g(r, "daystofirstvaliddeliveryattempt")
        fifo = g(r, "fifon0met")
        shipper = _intern(_s(g(r, "shippername")) or "(unknown shipper)")
        day = kd.to_iso_day(g(r, "rtstriggerdatetime")) or None
        has_day = has_day or bool(day)
        out.append((
            ck, _intern(_s(g(r, "rtsreasonnew")) or "(no reason)"), _intern(_s(g(r, "granularstatus")) or "(none)"), _num(g(r, "rtsbeforefirstattemptflag")) == 1,
            _num(days) if days not in (None, "") else None, _intern(_s(g(r, "couriertype")) or "(no driver)"), shipper, _intern(_s(g(r, "parentshippername")) or shipper),
            _intern(_s(g(r, "parcelsize")) or "(unknown)"), (_num(fifo) == 1) if fifo not in (None, "") else None, _num(g(r, "orderlostflag")) == 1,
            _intern(_s(g(r, "driversenricheddisplayname")) or NO_DRIVER), _s(g(r, "ordermilestonestrackingid")), day,
        ))
    return {"rows": out, "meta": meta, "real": real, "has_day": has_day, "vis": {}, "cache": {}}


def build_overall(rows: list[dict]) -> dict:
    g = _columns(rows)
    out: list[tuple] = []
    meta: dict[str, dict] = {}
    real: dict[str, str | None] = {}
    for r in rows:
        raw = _s(g(r, "destzone"))
        code = _hub_code_from_code(raw)
        ck = code or raw
        if ck not in meta:
            meta[ck] = _hub_meta(code, raw)
            real[ck] = code
        out.append((ck, _intern(_s(g(r, "rtsreason")) or "(no reason)"), min(int(_num(g(r, "deliveryattempts"))), 3), _num(g(r, "codvalue")),
                    _num(g(r, "rtsbeforefirstattemptflag")) == 1, kd.to_iso_day(g(r, "rtstriggerdatetime")) or None))
    return {"rows": out, "meta": meta, "real": real, "has_day": any(t[ODAY] for t in out), "vis": {}}


kd.register_compact("cod_rts_cod", build_cod)
kd.register_compact("cod_rts_overall", build_overall)


# ------------------------------------------------------------------------------------------------ helpers

def _pct(part: float, whole: float) -> float:
    return round(part / whole * 100, 2) if whole else 0.0


def _visible(data: dict, user: CurrentUser) -> dict:
    cache = data["vis"]
    sk = _scope_key(user)
    if sk not in cache:
        cache[sk] = {ck: _in_scope(real, user) for ck, real in data["real"].items()}
    return cache[sk]


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


def _summ(rows: list[tuple]) -> dict:
    n = len(rows)
    before = sum(1 for r in rows if r[BEFORE])
    returned = sum(1 for r in rows if r[STATUS].lower() == "returned to sender")
    days = [r[DAYS] for r in rows if r[DAYS] is not None]
    return {
        "count": n, "before": before, "before_pct": _pct(before, n), "returned": returned, "returned_pct": _pct(returned, n),
        "avg_days": round(sum(days) / len(days), 2) if days else None, "lost": sum(1 for r in rows if r[LOST]),
    }


def _group(rows: list[tuple], keyfn) -> dict:
    out: dict = {}
    for r in rows:
        out.setdefault(keyfn(r), []).append(r)
    return out


def _tally(rows: list[tuple], keyfn, top: int | None = None) -> list[dict]:
    counts: dict = {}
    for r in rows:
        k = keyfn(r)
        counts[k] = counts.get(k, 0) + 1
    total = len(rows)
    items = sorted(counts.items(), key=lambda kv: (-kv[1], str(kv[0])))
    return [{"key": k, "label": k, "value": n, "share": _pct(n, total)} for k, n in (items[:top] if top else items)]


def _top(rows: list[tuple], keyfn) -> tuple[str | None, int]:
    counts: dict = {}
    for r in rows:
        k = keyfn(r)
        counts[k] = counts.get(k, 0) + 1
    if not counts:
        return None, 0
    k = max(counts.items(), key=lambda kv: (kv[1], str(kv[0])))
    return k[0], k[1]


def _options(data: dict, user: CurrentUser) -> dict:
    vis = _visible(data, user)
    hubs = [m for ck, m in data["meta"].items() if vis.get(ck)]
    return {
        "regions": sorted({h["region"] for h in hubs}),
        "zones": sorted({(h["zone"], h["region"]) for h in hubs}),
        "hubs": sorted(({"code": h["code"], "name": h["name"], "zone": h["zone"], "region": h["region"]} for h in hubs), key=lambda h: h["name"]),
    }


# ------------------------------------------------------------------------------------------------ the views

def _overview(data, overall, ok, hub, region, zone, user):
    meta = data["meta"]
    # the station table ignores the picked station (you pick FROM it); every other panel follows it
    area = _picker(data, user, region, zone, None)
    all_area = [r for r in data["rows"] if area(r[CK])]
    picked = [r for r in all_area if not hub or r[CK] == hub]
    by_hub = _group(all_area, lambda r: r[CK])
    total_all = len(all_area)
    hubs = []
    for ck, rows in by_hub.items():
        m = meta[ck]
        hubs.append({"code": ck, "name": m["name"], "zone": m["zone"], "region": m["region"], **_summ(rows), "share": _pct(len(rows), total_all)})
    drivers = []
    for (ck, driver), rows in _group(picked, lambda r: (r[CK], r[DRIVER])).items():
        s = _summ(rows)
        top_reason, top_n = _top(rows, lambda r: r[REASON])
        drivers.append({"driver": driver, "station": meta[ck]["name"], "count": s["count"], "before": s["before"], "before_pct": s["before_pct"], "top_reason": top_reason, "top_reason_pct": _pct(top_n, s["count"])})
    drivers.sort(key=lambda d: (-d["count"], d["driver"]))
    out = {
        "totals": _summ(picked),
        "hubs": hubs,
        "reasons": _tally(picked, lambda r: r[REASON], 12),
        "statuses": _tally(picked, lambda r: r[STATUS], 8),
        "ctypes": _tally(picked, lambda r: r[CTYPE], 8),
        "shippers": _tally(picked, lambda r: r[SHIPPER], 12),
        "drivers": drivers[:20],
        "overall": None,
    }
    if overall is not None:
        ov_ok = _picker(overall, user, region, zone, hub)
        ov = [r for r in overall["rows"] if ov_ok(r[OCK])]
        out["overall"] = {
            "total": len(ov), "cod_value": round(sum(r[OCOD] for r in ov), 2), "before": sum(1 for r in ov if r[OBEFORE]),
            "reasons": _tally(ov, lambda r: r[OREASON], 10),
            "attempts": [{"key": str(n), "label": "3+ attempts" if n == 3 else f"{n} attempt{'' if n == 1 else 's'}", "value": sum(1 for r in ov if r[OATT] == n),
                          "share": _pct(sum(1 for r in ov if r[OATT] == n), len(ov))} for n in range(4)],
        }
    return out


def _reasons(data, ok, reason, meta):
    rows = [r for r in data["rows"] if ok(r[CK])]
    total = len(rows)
    out = []
    for name, rs in _group(rows, lambda r: r[REASON]).items():
        s = _summ(rs)
        st, st_n = _top(rs, lambda r: r[CK])
        sh, sh_n = _top(rs, lambda r: r[SHIPPER])
        out.append({"reason": name, **s, "share": _pct(len(rs), total), "top_station": meta[st]["name"] if st else None, "top_station_count": st_n, "top_shipper": sh, "top_shipper_count": sh_n})
    out.sort(key=lambda r: (-r["count"], r["reason"]))
    detail = None
    if reason:
        rs = [r for r in rows if r[REASON] == reason]
        station_totals = {ck: len(v) for ck, v in _group(rows, lambda r: r[CK]).items()}
        stations = [
            {"station": meta[ck]["name"], "zone": meta[ck]["zone"], "count": len(v), "share_of_reason": _pct(len(v), len(rs)), "share_of_station": _pct(len(v), station_totals[ck])}
            for ck, v in _group(rs, lambda r: r[CK]).items()
        ]
        stations.sort(key=lambda r: (-r["count"], r["station"]))
        detail = {"reason": reason, "count": len(rs), "stations": stations[:40], "shippers": _tally(rs, lambda r: r[SHIPPER], 10), "ctypes": _tally(rs, lambda r: r[CTYPE], 6), "statuses": _tally(rs, lambda r: r[STATUS], 6)}
    return {"total": total, "rows": out, "detail": detail}


def _shippers(data, ok, shipper, meta):
    rows = [r for r in data["rows"] if ok(r[CK])]
    total = len(rows)
    out = []
    for name, rs in _group(rows, lambda r: r[SHIPPER]).items():
        s = _summ(rs)
        reason, n = _top(rs, lambda r: r[REASON])
        out.append({"shipper": name, "parent": rs[0][PARENT], **s, "share": _pct(len(rs), total), "stations": len({r[CK] for r in rs}), "top_reason": reason, "top_reason_pct": _pct(n, len(rs))})
    out.sort(key=lambda r: (-r["count"], r["shipper"]))
    cum = 0
    for r in out:
        cum += r["count"]
        r["cum_share"] = _pct(cum, total)
    parents = []
    for name, rs in _group(rows, lambda r: r[PARENT]).items():
        reason, n = _top(rs, lambda r: r[REASON])
        parents.append({"parent": name, "count": len(rs), "share": _pct(len(rs), total), "shippers": len({r[SHIPPER] for r in rs}), "before_pct": _pct(sum(1 for r in rs if r[BEFORE]), len(rs)), "top_reason": reason, "top_reason_pct": _pct(n, len(rs))})
    parents.sort(key=lambda r: (-r["count"], r["parent"]))
    detail = None
    if shipper:
        rs = [r for r in rows if r[SHIPPER] == shipper]
        detail = {"shipper": shipper, "count": len(rs), "reasons": _tally(rs, lambda r: r[REASON], 10), "stations": [{"key": ck, "label": meta[ck]["name"], "value": len(v), "share": _pct(len(v), len(rs))} for ck, v in sorted(_group(rs, lambda r: r[CK]).items(), key=lambda kv: -len(kv[1]))[:12]], "statuses": _tally(rs, lambda r: r[STATUS], 6)}
    return {"total": total, "rows": out[:300], "row_count": len(out), "parents": parents[:60], "detail": detail}


def _drivers(data, ok, meta):
    rows = [r for r in data["rows"] if ok(r[CK])]
    out = []
    for (ck, driver), rs in _group(rows, lambda r: (r[CK], r[DRIVER])).items():
        s = _summ(rs)
        reason, n = _top(rs, lambda r: r[REASON])
        ct, _n = _top(rs, lambda r: r[CTYPE])
        out.append({"driver": driver, "code": ck, "station": meta[ck]["name"], "zone": meta[ck]["zone"], "ctype": ct, **s, "top_reason": reason, "top_reason_pct": _pct(n, len(rs))})
    out.sort(key=lambda r: (-r["count"], r["driver"]))
    return {"total": len(rows), "rows": out[:600], "row_count": len(out)}


def _timing(data, overall, ok, meta, user, region, zone, hub):
    rows = [r for r in data["rows"] if ok(r[CK])]
    total = len(rows)

    def bucket(d):
        if d is None:
            return "No attempt yet"
        d = int(d)
        return "0 days (same day)" if d <= 0 else "1 day" if d == 1 else "2 days" if d == 2 else "3 days" if d == 3 else "4-5 days" if d <= 5 else "6+ days"

    order = ["0 days (same day)", "1 day", "2 days", "3 days", "4-5 days", "6+ days", "No attempt yet"]
    counts = _group(rows, lambda r: bucket(r[DAYS]))
    stations = []
    for ck, rs in _group(rows, lambda r: r[CK]).items():
        s = _summ(rs)
        slow = sum(1 for r in rs if r[DAYS] is not None and r[DAYS] >= 3)
        stations.append({"station": meta[ck]["name"], "code": ck, "zone": meta[ck]["zone"], "count": s["count"], "before": s["before"], "before_pct": s["before_pct"], "avg_days": s["avg_days"], "slow": slow, "slow_pct": _pct(slow, s["count"])})
    stations.sort(key=lambda r: (-r["count"], r["station"]))
    fifo = {"met": sum(1 for r in rows if r[FIFO] is True), "missed": sum(1 for r in rows if r[FIFO] is False), "unknown": sum(1 for r in rows if r[FIFO] is None)}
    out = {
        "total": total,
        "buckets": [{"key": b, "label": b, "value": len(counts.get(b, [])), "share": _pct(len(counts.get(b, [])), total)} for b in order],
        "before": {"count": sum(1 for r in rows if r[BEFORE]), "share": _pct(sum(1 for r in rows if r[BEFORE]), total)},
        "stations": stations[:60],
        "fifo": {**fifo, "met_pct": _pct(fifo["met"], total), "missed_pct": _pct(fifo["missed"], total)},
        "attempts": None,
    }
    if overall is not None:
        ov_ok = _picker(overall, user, region, zone, hub)
        ov = [r for r in overall["rows"] if ov_ok(r[OCK])]
        out["attempts"] = [{"key": str(n), "label": "3+ attempts" if n == 3 else f"{n} attempt{'' if n == 1 else 's'}", "value": sum(1 for r in ov if r[OATT] == n), "share": _pct(sum(1 for r in ov if r[OATT] == n), len(ov))} for n in range(4)]
        out["attempts_total"] = len(ov)
    return out


def _parcels(data, ok):
    rows = [r for r in data["rows"] if ok(r[CK])]

    def breakdown(keyfn, label=lambda k: k):
        res = []
        for k, rs in _group(rows, keyfn).items():
            s = _summ(rs)
            res.append({"key": str(k), "label": label(k), "value": s["count"], "share": _pct(s["count"], len(rows)), "before_pct": s["before_pct"], "avg_days": s["avg_days"], "returned_pct": s["returned_pct"]})
        return sorted(res, key=lambda r: (-r["value"], r["label"]))

    return {
        "total": len(rows),
        "sizes": breakdown(lambda r: r[SIZE]),
        "ctypes": breakdown(lambda r: r[CTYPE]),
        "statuses": breakdown(lambda r: r[STATUS]),
        "lost": breakdown(lambda r: "Lost" if r[LOST] else "Not lost"),
        "fifo": breakdown(lambda r: "FIFO N0 met" if r[FIFO] is True else "FIFO N0 missed" if r[FIFO] is False else "FIFO not measured"),
    }


def _trend(data, overall, ok, meta, level, keys, top, user, region, zone, hub):
    """RTS parcels per day. The COD file's own dates when it has them, otherwise the overall RTS file's."""
    source = "cod"
    if data["has_day"]:
        rows = [(r[CK], r[REASON], r[DAY]) for r in data["rows"] if r[DAY] and ok(r[CK])]
    elif overall is not None and overall["has_day"]:
        source = "overall"
        ov_ok = _picker(overall, user, region, zone, hub)
        rows = [(r[OCK], r[OREASON], r[ODAY]) for r in overall["rows"] if r[ODAY] and ov_ok(r[OCK])]
        meta = overall["meta"]
    else:
        return {"has_dates": False}
    per: dict[str, dict[str, int]] = {}
    totals: dict[str, int] = {}
    labels: dict[str, str] = {}
    all_day: dict[str, int] = {}
    for ck, reason, day in rows:
        m = meta[ck]
        key, label = (m["region"], m["region"]) if level == "region" else (m["zone"], m["zone"]) if level == "zone" else (reason, reason) if level == "reason" else (ck, m["name"])
        labels[key] = label
        per.setdefault(key, {})[day] = per.get(key, {}).get(day, 0) + 1
        totals[key] = totals.get(key, 0) + 1
        all_day[day] = all_day.get(day, 0) + 1
    days = sorted(all_day)
    ranked = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
    chosen = [k for k in keys if k in totals] or [k for k, _n in ranked[: max(1, min(top, 12))]]
    return {
        "has_dates": True, "source": source, "level": level, "days": days,
        "all": {"key": "__all__", "label": "Everything in view", "count": [all_day.get(d, 0) for d in days]},
        "series": [{"key": k, "label": labels[k], "count": [per[k].get(d, 0) for d in days]} for k in chosen],
        "options": [{"key": k, "label": labels[k], "count": n} for k, n in ranked[:400]],
    }


# ------------------------------------------------------------------------------------------------ endpoints

@router.get("/api/kpi/cod-rts/view")
async def kpi_cod_rts_view(
    tab: str = "overview", region: str = "all", zone: str = "all", hub: str | None = None, reason: str | None = None, shipper: str | None = None,
    level: str = "station", keys: list[str] = Query(default=[]), top: int = 5, user: CurrentUser = Depends(get_current_user),
):
    if tab not in ("overview", "reasons", "shippers", "drivers", "timing", "parcels", "trend"):
        raise HTTPException(status_code=422, detail="Unknown tab")
    if level not in ("region", "zone", "station", "reason"):
        raise HTTPException(status_code=422, detail="level must be region, zone, station or reason")
    got = await kd.load_compact("cod_rts_cod")
    if got is None:
        return {"has_data": False}
    meta_file, data = got
    og = await kd.load_compact("cod_rts_overall")
    overall = og[1] if og else None
    ckey = (_scope_key(user), tab, region, zone, hub, reason, shipper, level, tuple(keys), top)
    cache = data["cache"]
    if ckey not in cache:
        ok = _picker(data, user, region, zone, hub)
        meta = data["meta"]
        if tab == "overview":
            view = _overview(data, overall, ok, hub, region, zone, user)
        elif tab == "reasons":
            view = _reasons(data, ok, reason, meta)
        elif tab == "shippers":
            view = _shippers(data, ok, shipper, meta)
        elif tab == "drivers":
            view = _drivers(data, ok, meta)
        elif tab == "timing":
            view = _timing(data, overall, ok, meta, user, region, zone, hub)
        elif tab == "parcels":
            view = _parcels(data, ok)
        else:
            view = _trend(data, overall, ok, meta, level, keys, top, user, region, zone, hub)
        if len(cache) > 300:
            cache.clear()
        cache[ckey] = view
    return {"has_data": True, "meta": meta_file, "has_overall": overall is not None, "options": _options(data, user), "tab": tab, **cache[ckey]}


@router.get("/api/kpi/cod-rts/tns")
async def kpi_cod_rts_tns(
    hub: str | None = None, reason: str | None = None, shipper: str | None = None, driver: str | None = None, region: str = "all", zone: str = "all",
    user: CurrentUser = Depends(get_current_user),
):
    got = await kd.load_compact("cod_rts_cod")
    if got is None:
        raise HTTPException(status_code=404, detail="No RTS file uploaded yet")
    _meta, data = got
    ok = _picker(data, user, region, zone, hub)
    meta = data["meta"]
    out = []
    for r in data["rows"]:
        if not ok(r[CK]) or (reason and r[REASON] != reason) or (shipper and r[SHIPPER] != shipper) or (driver and r[DRIVER] != driver):
            continue
        out.append({
            "tracking_id": r[TN], "hub": meta[r[CK]]["name"], "reason": r[REASON], "status": r[STATUS], "shipper": r[SHIPPER], "parent": r[PARENT], "driver": r[DRIVER],
            "courier_type": r[CTYPE], "before_first_attempt": r[BEFORE], "days_to_first_attempt": r[DAYS], "parcel_size": r[SIZE], "date": r[DAY],
        })
        if len(out) >= TN_ROWS_CAP:
            break
    return {"rows": out, "capped": len(out) >= TN_ROWS_CAP}
