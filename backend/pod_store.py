"""Invalid POD store (2026-10-09): the app keeps the POD validation history in its OWN tables instead of re-reading one big Metabase file.

Why: nationwide there are ~120,000 validated delivery attempts a week at station hubs -- a year of them cannot travel (or be held in memory) as one file. Now:
  * every day the app pulls only the LAST 7 DAYS from Metabase (two small questions: the invalid attempts row by row, the valid ones counted per hub / courier / day) and REPLACES those
    days in its tables (so a late validation is picked up);
  * a one-time BACKFILL (dated questions, pulled once) fills the current + previous month at day level and the earlier months of the year as weekly / monthly counts;
  * DAY DETAIL (pod_day: hub x courier x day x result x reason, and pod_tn: the invalid tracking numbers) is kept for the current month and DETAIL_MONTHS_BACK months before it;
    a day that falls out of that window is ROLLED UP into pod_roll (hub x courier x week / month x result -- per-driver counts, no reasons, no tracking numbers) and its detail deleted.
Reading (kpi_pod.py): the compact structure is built from pod_day (+ pod_roll); tracking numbers are read from pod_tn on request.
"""
import csv
import io
import logging
import re
import time
from datetime import date, datetime, timedelta, timezone

import db
import kpi_data as kd
from kpi_rca import _hub_meta, _pod_hub_code, _s

log = logging.getLogger("pod_store")
MYT = timezone(timedelta(hours=8))
DETAIL_MONTHS_BACK = 1  # the current month + this many months before it keep their day detail (1 = this month and last month)
_BATCH = 2000
_MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
_NO_REASON = "(no reason given)"


def today_myt() -> date:
    return datetime.now(MYT).date()


def detail_start(today: date | None = None) -> date:
    t = today or today_myt()
    months = t.year * 12 + (t.month - 1) - DETAIL_MONTHS_BACK
    return date(months // 12, months % 12 + 1, 1)


def _window(spec: dict) -> tuple[date, date]:
    """The days a pull of this dataset replaces: the last N full days, or a fixed range."""
    w = spec["ingest"]["window"]
    if w[0] == "recent":
        t = today_myt()
        return t - timedelta(days=w[1]), t - timedelta(days=1)
    return date.fromisoformat(w[1]), date.fromisoformat(w[2])


def _period_day(value) -> str:
    """yyyy-mm-dd of a day / week-start / month-start as Metabase writes it ("September 25, 2026", "2026-09-25T00:00:00+08:00", "September, 2026")."""
    s = str(value or "").strip()
    d = kd.to_iso_day(s)
    if d:
        return d
    m = re.match(r"([A-Za-z]{3,9})\.?,?\s+(\d{4})$", s)
    if m and m.group(1)[:3].lower() in _MONTHS:
        return f"{m.group(2)}-{_MONTHS[m.group(1)[:3].lower()]:02d}-01"
    return ""


def _result(value) -> str:
    v = _s(value).upper()
    return "F" if v == "FAILURE" else "S" if v == "SUCCESS" else ""


def _rows(data: bytes) -> tuple[dict[str, int], list[list[str]]]:
    reader = csv.reader(io.StringIO(data.decode("utf-8-sig")))
    head = next(reader, None)
    if not head:
        raise kd.UploadError("The file is empty")
    return {kd.norm(h): i for i, h in enumerate(head)}, list(reader)


def _need(cols: dict[str, int], names: list[str]) -> None:
    missing = [n for n in names if n not in cols]
    if missing:
        raise kd.UploadError("The Metabase file is missing the column(s): " + ", ".join(missing))


def _cell(row: list[str], cols: dict[str, int], name: str) -> str:
    i = cols.get(name)
    return row[i].strip() if i is not None and i < len(row) else ""


def _count(row: list[str], cols: dict[str, int]) -> int:
    try:
        return max(0, int(float(_cell(row, cols, "count").replace(",", "") or 1)))
    except ValueError:
        return 1


async def _insert(sql: str, params: list[tuple]) -> None:
    for i in range(0, len(params), _BATCH):
        await db.execute_many(sql, params[i : i + _BATCH])


# ------------------------------------------------------------------------------------------------ ingestion

async def ingest(dataset: str, data: bytes) -> str:
    """Store one Metabase file (see kpi_data.DATASETS[dataset]["ingest"]); the confirmation text. Raises kd.UploadError for a file that does not fit."""
    spec = kd.DATASETS[dataset]
    kind = spec["ingest"]["kind"]
    if spec["ingest"].get("once") and await db.fetch_one("SELECT dataset FROM pod_ingest_log WHERE dataset = %s", (dataset,)):
        return f"{spec['label']}: already loaded -- kept as it is (one-time load)"
    cols, rows = _rows(data)
    t0 = time.perf_counter()
    if kind == "tn":
        n = await _ingest_tn(spec, cols, rows)
    elif kind == "valid":
        n = await _ingest_valid(spec, cols, rows)
    else:
        n = await _ingest_roll(kind, cols, rows)
    day_from, day_to = (None, None) if kind.startswith("roll") else _window(spec)
    await db.execute("DELETE FROM pod_ingest_log WHERE dataset = %s", (dataset,))
    await db.execute(
        "INSERT INTO pod_ingest_log (dataset, ingested_at, rows_in, day_from, day_to) VALUES (%s, %s, %s, %s, %s)",
        (dataset, datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None), n, day_from, day_to),
    )
    rolled = await rollup()
    _cache["stamp"] = None  # the pages rebuild from the tables on their next request
    if await db.fetch_one("SELECT 1 FROM kpi_uploads WHERE dataset = 'invalid_pod_raw'"):
        await kd.delete_upload("invalid_pod_raw")  # the old single-file upload (and its big in-memory structure) is not used any more
    log.info("POD store: %s -> %d rows in %.1fs%s", dataset, n, time.perf_counter() - t0, f", rolled {rolled} day rows" if rolled else "")
    return f"{spec['label']}: {n:,} rows loaded"


async def _ingest_tn(spec: dict, cols: dict[str, int], rows: list[list[str]]) -> int:
    _need(cols, ["hubshortname", "couriername", "trackingid", "validationresult", "attempteddatetime"])
    a, b = _window(spec)
    ia, ib = a.isoformat(), b.isoformat()
    tn_rows: list[tuple] = []
    counts: dict[tuple, int] = {}
    for r in rows:
        if _result(_cell(r, cols, "validationresult")) != "F":
            continue
        day = kd.to_iso_day(_cell(r, cols, "attempteddatetime")) or kd.to_iso_day(_cell(r, cols, "validationdatetime"))
        if not day or not (ia <= day <= ib):
            continue
        hub = _cell(r, cols, "hubshortname")[:32]
        courier = (_cell(r, cols, "couriername") or "(no courier)")[:100]
        reason = (_cell(r, cols, "invalidpodreason") or _NO_REASON)[:100]
        tn_rows.append((day, hub, courier, _cell(r, cols, "trackingid")[:40], _cell(r, cols, "transactionfailurereason")[:200], reason,
                        _cell(r, cols, "attempteddatetime")[:40], _cell(r, cols, "validationdatetime")[:40], _cell(r, cols, "validationusername")[:120]))
        k = (day, hub, courier, reason)
        counts[k] = counts.get(k, 0) + 1
    if not tn_rows:
        raise kd.UploadError("Metabase returned no invalid attempts for these days -- the stored days were kept")
    await db.execute("DELETE FROM pod_tn WHERE day BETWEEN %s AND %s", (a, b))
    await db.execute("DELETE FROM pod_day WHERE result = 'F' AND day BETWEEN %s AND %s", (a, b))
    await _insert("INSERT INTO pod_tn (day, hub, courier, tracking_id, failure_reason, reason, attempted, validated, validator) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", tn_rows)
    await _insert("INSERT INTO pod_day (day, hub, courier, result, reason, n) VALUES (%s, %s, %s, 'F', %s, %s)", [(d, h, c, rs, n) for (d, h, c, rs), n in counts.items()])
    return len(tn_rows)


async def _ingest_valid(spec: dict, cols: dict[str, int], rows: list[list[str]]) -> int:
    _need(cols, ["hubshortname", "couriername", "attempteddatetime", "count"])
    a, b = _window(spec)
    ia, ib = a.isoformat(), b.isoformat()
    counts: dict[tuple, int] = {}
    for r in rows:
        day = kd.to_iso_day(_cell(r, cols, "attempteddatetime"))
        if not day or not (ia <= day <= ib):
            continue
        k = (day, _cell(r, cols, "hubshortname")[:32], (_cell(r, cols, "couriername") or "(no courier)")[:100])
        counts[k] = counts.get(k, 0) + _count(r, cols)
    if not counts:
        raise kd.UploadError("Metabase returned no valid attempts for these days -- the stored days were kept")
    await db.execute("DELETE FROM pod_day WHERE result = 'S' AND day BETWEEN %s AND %s", (a, b))
    await _insert("INSERT INTO pod_day (day, hub, courier, result, reason, n) VALUES (%s, %s, %s, 'S', '', %s)", [(d, h, c, n) for (d, h, c), n in counts.items()])
    return len(counts)


async def _ingest_roll(kind: str, cols: dict[str, int], rows: list[list[str]]) -> int:
    """The one-time weekly / monthly counts for the months before the day-detail window (added to what is there, so it is only ever loaded once)."""
    _need(cols, ["hubshortname", "couriername", "attempteddatetime", "validationresult", "count"])
    grain = "W" if kind == "roll_w" else "M"
    counts: dict[tuple, int] = {}
    for r in rows:
        res = _result(_cell(r, cols, "validationresult"))
        period = _period_day(_cell(r, cols, "attempteddatetime"))
        if not res or not period:
            continue
        k = (period, _cell(r, cols, "hubshortname")[:32], (_cell(r, cols, "couriername") or "(no courier)")[:100], res)
        counts[k] = counts.get(k, 0) + _count(r, cols)
    if not counts:
        raise kd.UploadError("Metabase returned no rows")
    await _insert(
        "INSERT INTO pod_roll (grain, period, hub, courier, result, n) VALUES (%s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE n = n + VALUES(n)",
        [(grain, p, h, c, res, n) for (p, h, c, res), n in counts.items()],
    )
    return len(counts)


async def rollup() -> int:
    """Days older than the detail window move into pod_roll (weekly + monthly per-driver counts) and their detail is deleted. Returns how many day rows moved."""
    start = detail_start()
    old = await db.fetch_all("SELECT day, hub, courier, result, SUM(n) FROM pod_day WHERE day < %s GROUP BY day, hub, courier, result", (start,))
    if not old:
        await db.execute("DELETE FROM pod_tn WHERE day < %s", (start,))
        return 0
    agg: dict[tuple, int] = {}
    for day, hub, courier, res, n in old:
        d = day if isinstance(day, date) else date.fromisoformat(str(day)[:10])
        week = d - timedelta(days=d.weekday())
        for grain, period in (("W", week), ("M", d.replace(day=1))):
            k = (grain, period, hub, courier, res)
            agg[k] = agg.get(k, 0) + int(n)
    await _insert(
        "INSERT INTO pod_roll (grain, period, hub, courier, result, n) VALUES (%s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE n = n + VALUES(n)",
        [(g, p, h, c, res, n) for (g, p, h, c, res), n in agg.items()],
    )
    await db.execute("DELETE FROM pod_day WHERE day < %s", (start,))
    await db.execute("DELETE FROM pod_tn WHERE day < %s", (start,))
    return len(old)


# ------------------------------------------------------------------------------------------------ the compact structure kpi_pod.py reads

_cache: dict = {"stamp": None, "built_at": 0.0, "data": None}


async def get():
    """(meta, data) -- data has the same shape build_pod used to make (cd, cdr, meta, real, days, vis, main) plus roll = {"W": {period: {(hub key, courier): [total, invalid]}}, "M": ...}
    and raw = {raw hub name: hub key} for the tracking-number query; None while nothing is stored."""
    stamp = await db.fetch_one("SELECT MAX(ingested_at), COUNT(*) FROM pod_ingest_log")
    key = (str(stamp[0]), stamp[1]) if stamp else None
    if _cache["data"] is not None and _cache["stamp"] == key and key is not None:
        return _cache["data"]
    if not stamp or not stamp[1]:
        return None
    got = await _build(stamp[0])
    if got is not None:
        _cache.update(stamp=key, data=got)
    return got


async def _build(latest) -> tuple[dict, dict] | None:
    start = detail_start()
    cd: dict[tuple, list] = {}
    cdr: dict[tuple, int] = {}
    meta: dict[str, dict] = {}
    real: dict[str, str | None] = {}
    raw: dict[str, str] = {}
    days: set[str] = set()

    def hub_key(raw_hub: str) -> str:
        ck = raw.get(raw_hub)
        if ck is None:
            code = _pod_hub_code(raw_hub)
            ck = code or raw_hub
            raw[raw_hub] = ck
            if ck not in meta:
                meta[ck] = _hub_meta(code, raw_hub)
                real[ck] = code
        return ck

    last = await db.fetch_one("SELECT MAX(day) FROM pod_day")
    d0 = start
    end = (last[0] if last and last[0] else today_myt()) + timedelta(days=1)
    n_detail = 0
    while d0 < end:  # a week at a time, so the rows in flight stay small
        d1 = d0 + timedelta(days=7)
        for day, hub, courier, res, reason, n in await db.fetch_all("SELECT day, hub, courier, result, reason, n FROM pod_day WHERE day >= %s AND day < %s", (d0, d1)):
            n_detail += 1
            ck = hub_key(hub)
            dd = day.isoformat() if hasattr(day, "isoformat") else str(day)[:10]
            days.add(dd)
            cell = cd.setdefault((ck, dd, courier), [0, 0])
            cell[0] += n
            if res == "F":
                cell[1] += n
                rk = (ck, dd, courier, reason or _NO_REASON)
                cdr[rk] = cdr.get(rk, 0) + n
        d0 = d1
    roll: dict[str, dict[str, dict[tuple, list]]] = {"W": {}, "M": {}}
    for grain, period, hub, courier, res, n in await db.fetch_all("SELECT grain, period, hub, courier, result, n FROM pod_roll"):
        ck = hub_key(hub)
        p = period.isoformat() if hasattr(period, "isoformat") else str(period)[:10]
        cell = roll[grain].setdefault(p, {}).setdefault((ck, courier), [0, 0])
        cell[0] += n
        if res == "F":
            cell[1] += n
        days.add(p)
    if not cd and not roll["W"] and not roll["M"]:
        return None
    count = await db.fetch_one("SELECT COALESCE(SUM(rows_in), 0) FROM pod_ingest_log")
    info = {"filename": "Metabase (stored history)", "row_count": int(count[0]) if count else 0, "uploaded_by": "Metabase API", "uploaded_at": latest.isoformat() if hasattr(latest, "isoformat") else str(latest)}
    log.info("POD store built: %d day cells, %d detail rows, %d weekly + %d monthly periods", len(cd), n_detail, len(roll["W"]), len(roll["M"]))
    return info, {"cd": cd, "cdr": cdr, "tns": [], "meta": meta, "real": real, "raw": raw, "days": sorted(days), "vis": {}, "main": {}, "roll": roll}


async def tracking_numbers(raw_hubs: list[str], day_from: str | None, day_to: str | None, reason: str | None, courier: str | None, limit: int) -> list[tuple]:
    """Invalid attempts (day detail window only) for the hubs given: rows of pod_tn, newest attempt first."""
    if not raw_hubs:
        return []
    sql = "SELECT hub, courier, tracking_id, failure_reason, reason, attempted, validated, validator, day FROM pod_tn WHERE hub IN (" + ",".join(["%s"] * len(raw_hubs)) + ")"
    params: list = list(raw_hubs)
    if day_from:
        sql += " AND day BETWEEN %s AND %s"
        params += [day_from, day_to or day_from]
    if reason:
        sql += " AND reason = %s"
        params.append(reason)
    if courier:
        sql += " AND courier = %s"
        params.append(courier)
    sql += " ORDER BY day DESC, id DESC LIMIT %s"
    params.append(int(limit))
    return await db.fetch_all(sql, tuple(params))
