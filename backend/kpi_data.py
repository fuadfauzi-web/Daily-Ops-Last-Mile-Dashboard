"""KPI Dashboard data uploads (staging, 2026-09-26).

Until the Metabase link works -- and for the KPI data that is still pasted by hand -- a manager / admin downloads the data
(from Metabase or the team's RCA sheets) and uploads it here. One current file per dataset: uploading again replaces it. The file
itself goes to object storage (storage.py); the database keeps who / when / how many rows. Rows are parsed on demand and cached in
memory until the upload changes.

Accepted: .csv, or an .xlsx (the dataset's `sheet` is picked, else the only sheet, else the sheet that has the required columns).
Column names are matched loosely (case, spaces and punctuation ignored), so "Courier Display Name" and "courier_display_name" both work.
"""
import asyncio
import csv
import io
import logging
import re
import uuid
from datetime import date, datetime, timezone

from starlette.concurrency import run_in_threadpool

import db
import storage

log = logging.getLogger("kpi_data")

MAX_UPLOAD_BYTES = 40 * 1024 * 1024
MAX_ROWS = 400_000


# Metabase names a date column that is grouped by a time unit "Route Date: Day" / "Route Week: Month" -- the unit is not part of what the
# column means, so it is dropped before matching (2026-09-26: the Hybrid daily export was refused for "missing routedate").
_UNIT_SUFFIX = re.compile(r":\s*(minute|hour|day|week|month|quarter|year)\s*$", re.I)


def norm(name) -> str:
    return re.sub(r"[^a-z0-9]", "", _UNIT_SUFFIX.sub("", str(name)).lower())


_MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def to_iso_day(value) -> str:
    """A day as yyyy-mm-dd from what an export holds: an ISO date / timestamp (Metabase JSON, Excel cells), "September 25, 2026"
    (Metabase's formatted CSV), "25 Sep 2026" or 25/09/2026 (day first). "" when it is not a date."""
    s = str(value or "").strip()
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.search(r"([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})", s)  # September 25, 2026
    if m and m.group(1)[:3].lower() in _MONTHS:
        return f"{m.group(3)}-{_MONTHS[m.group(1)[:3].lower()]:02d}-{int(m.group(2)):02d}"
    m = re.search(r"(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})", s)  # 25 Sep 2026
    if m and m.group(2)[:3].lower() in _MONTHS:
        return f"{m.group(3)}-{_MONTHS[m.group(2)[:3].lower()]:02d}-{int(m.group(1)):02d}"
    m = re.match(r"(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})", s)  # 25/09/2026 -- day first, like the team's sheets
    if m:
        d, mo = int(m.group(1)), int(m.group(2))
        if mo > 12 >= d:
            d, mo = mo, d
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{m.group(3)}-{mo:02d}-{d:02d}"
    return ""


# dataset -> what it is, which KPI page it feeds, which sheet of a workbook to read, and the columns it must have (normalised).
DATASETS: dict[str, dict] = {
    "hybrid_weekly": {
        "kpi": "hybrid", "label": "Hybrid weekly", "hint": "Metabase question 127194 (Hybrid Weekly Apps - All Regions) -- Download results as .csv",
        "link": "https://metabase.ninjavan.co/question/127194",
        "sheet": "Weekly Raw", "required": ["courierdisplayname", "routeweek"],
    },
    "hybrid_monthly": {
        "kpi": "hybrid", "label": "Hybrid monthly", "hint": "Metabase question 127195 (Hybrid Monthly Apps - All Regions) -- Download results as .csv",
        "link": "https://metabase.ninjavan.co/question/127195",
        "sheet": "Monthly Raw", "required": ["courierdisplayname", "routemonth"],
    },
    "hybrid_daily": {
        "kpi": "hybrid", "label": "Hybrid daily", "hint": "Metabase question 127196 (Hybrid Daily Apps - All Regions, current month) -- Download results as .csv",
        "link": "https://metabase.ninjavan.co/question/127196",
        "sheet": "Daily Raw", "required": ["courierdisplayname", "routedate"],
    },
    "hybrid_data": {
        "kpi": "hybrid", "label": "Hybrid driver list", "hint": "Metabase question 127193 (Hybrid Data Current Year - All Regions) -- Download results as .csv; gives each driver's start date (Service Duration)",
        "link": "https://metabase.ninjavan.co/question/127193",
        "sheet": "Hybrid Data", "required": ["displayname"],
    },
    "invalid_pod_raw": {
        "kpi": "invalid_pod", "label": "POD validation (raw)",
        "hint": "Metabase question 69573 (POP/POD Validation Tasks Raw Data): leave Hub Region empty for all regions, pick Date Type and Start / End date, then Download results as .csv -- or the Raw sheet of the POD Validation Analysis file",
        "link": "https://metabase.ninjavan.co/question/69573?transaction_type=DELIVERY&hub_region=&shipper_id=&date_type=&parent_id_coalesce=&start_date=&end_date=&driver_type=",
        "sheet": "Raw", "required": ["hubshortname", "validationresult"],
    },
    "cod_rts_cod": {
        "kpi": "cod_rts", "label": "COD RTS (raw COD)", "link": "https://metabase.ninjavan.co/question/80865",
        "hint": "Metabase question 80865 (COD RTS Rate Southern) -- Southern hubs and a fixed week for now: change the date filter, then Download results as .csv -- or the RAW COD sheet of the RTS Analysis file",
        "sheet": "RAW COD", "required": ["desthubname", "rtsflag"],
    },
    "cod_rts_overall": {
        "kpi": "cod_rts", "label": "RTS overall (raw)", "link": "https://metabase.ninjavan.co/question/76508",
        "hint": "Metabase question 76508 (RTS Overall Southern) -- Southern hubs and a fixed week for now: change the date filter, then Download results as .csv -- or the RAW Overal sheet; optional",
        "sheet": "RAW Overal", "required": ["trackingid", "rtsreason"],
    },
    "weekly_kpi": {
        "kpi": "weekly", "label": "Weekly KPI results", "hint": "the Station KPI W0W sheet of the Dashboard WoW file (or its CSV)",
        "sheet": "Station KPI W0W", "required": ["week", "station"],
    },
    "opex_result": {
        "kpi": "opex", "label": "OPEX dashboard result", "hint": "the OPEX KPI dashboard result as CSV / Excel (first sheet) -- layout to be confirmed",
        "sheet": None, "required": [],
    },
}
KPI_DATASETS = {k: [d for d, v in DATASETS.items() if v["kpi"] == k] for k in {v["kpi"] for v in DATASETS.values()}}


class UploadError(ValueError):
    pass


# ------------------------------------------------------------------------------------------------ parsing

def _clean_header(value, idx: int) -> str:
    s = " ".join(str(value).split()) if value is not None else ""
    return s or f"_col{idx}"


def _cell(v):
    if isinstance(v, datetime):
        return v.isoformat(sep=" ")
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, float) and v.is_integer() and abs(v) < 1e15:
        return int(v)
    return v


def _parse_csv(data: bytes) -> tuple[list[str], list[dict]]:
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("latin-1")
    reader = csv.reader(io.StringIO(text))
    header = None
    rows: list[dict] = []
    for raw in reader:
        if header is None:
            if sum(1 for c in raw if str(c).strip()) >= 2 or len(raw) == 1 and str(raw[0]).strip():
                header = [_clean_header(c, i) for i, c in enumerate(raw)]
            continue
        if not any(str(c).strip() for c in raw):
            continue
        rows.append({h: (raw[i] if i < len(raw) else "") for i, h in enumerate(header)})
        if len(rows) > MAX_ROWS:
            raise UploadError(f"More than {MAX_ROWS:,} rows -- split the file")
    if header is None:
        raise UploadError("The file is empty")
    return header, rows


def _pick_sheet(names: list[str], wanted: str | None, has_required) -> str | None:
    if wanted:
        for n in names:
            if n.strip().lower() == wanted.lower():
                return n
        for n in names:
            if n.strip().lower().startswith(wanted.lower()[:8]):
                return n
    if len(names) == 1:
        return names[0]
    return None


def _parse_xlsx(data: bytes, sheet: str | None, required: list[str]) -> tuple[list[str], list[dict]]:
    import openpyxl  # heavy import, only when an Excel file is uploaded

    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    try:
        names = wb.sheetnames

        def read(name: str) -> tuple[list[str], list[dict]] | None:
            it = wb[name].iter_rows(values_only=True)
            header = None
            rows: list[dict] = []
            for i, raw in enumerate(it):
                if header is None:
                    if sum(1 for c in raw if c is not None and str(c).strip()) >= 2:
                        header = [_clean_header(c, j) for j, c in enumerate(raw)]
                    elif i > 30:
                        return None
                    continue
                if not any(c is not None and str(c).strip() for c in raw):
                    continue
                rows.append({h: _cell(raw[j]) if j < len(raw) else None for j, h in enumerate(header)})
                if len(rows) > MAX_ROWS:
                    raise UploadError(f"More than {MAX_ROWS:,} rows -- split the file")
            return (header, rows) if header else None

        chosen = _pick_sheet(names, sheet, None)
        candidates = [chosen] if chosen else names
        for name in candidates:
            got = read(name)
            if got and all(r in {norm(h) for h in got[0]} for r in required):
                return got
        if chosen is None and required:
            raise UploadError(f"Couldn't find a sheet with the columns this needs. Sheets in the file: {', '.join(names)}")
        got = read(chosen) if chosen else None
        if got:
            return got
        raise UploadError("The sheet is empty")
    finally:
        wb.close()


def parse_table(filename: str, data: bytes, sheet: str | None, required: list[str]) -> tuple[list[str], list[dict]]:
    name = (filename or "").lower()
    if name.endswith(".csv"):
        header, rows = _parse_csv(data)
    elif name.endswith((".xlsx", ".xlsm")):
        header, rows = _parse_xlsx(data, sheet, required)
    else:
        raise UploadError("Upload a .csv or .xlsx file")
    have = {norm(h) for h in header}
    missing = [r for r in required if r not in have]
    if missing:
        raise UploadError(f"This doesn't look like the right file -- these columns are missing: {', '.join(missing)}. Found: {', '.join(header[:12])}")
    if not rows:
        raise UploadError("The file has a header but no data rows")
    return header, rows


# ------------------------------------------------------------------------------------------------ storage + cache

_cache: dict[str, dict] = {}  # dataset -> {"stamp": "yyyy-mm-dd hh:mm:ss", "rows": [...], "header": [...]}


def _stamp(value) -> str:
    """Upload time as a comparable string (DB values are naive UTC, ours are aware UTC -- the digits are the same)."""
    return str(value)[:19].replace("T", " ")
_locks: dict[str, asyncio.Lock] = {}


def _lock(dataset: str) -> asyncio.Lock:
    return _locks.setdefault(dataset, asyncio.Lock())


async def list_uploads() -> dict[str, dict]:
    rows = await db.fetch_all("SELECT dataset, filename, row_count, uploaded_by, uploaded_at FROM kpi_uploads")
    return {
        r[0]: {"filename": r[1], "row_count": r[2], "uploaded_by": r[3], "uploaded_at": r[4].isoformat() if hasattr(r[4], "isoformat") else str(r[4])}
        for r in rows
    }


async def save_upload(dataset: str, filename: str, data: bytes, user_email: str) -> dict:
    spec = DATASETS.get(dataset)
    if spec is None:
        raise UploadError("Unknown dataset")
    if not data:
        raise UploadError("The file is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise UploadError(f"The file is too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)")
    header, rows = await run_in_threadpool(parse_table, filename, data, spec["sheet"], spec["required"])
    ext = ".xlsx" if filename.lower().endswith((".xlsx", ".xlsm")) else ".csv"
    key = storage.safe_key("kpi", f"{dataset}-{uuid.uuid4().hex}{ext}")
    content_type = "application/octet-stream" if ext == ".xlsx" else "text/csv"
    await run_in_threadpool(storage.put_bytes, key, data, content_type=content_type)
    old = await db.fetch_one("SELECT storage_key FROM kpi_uploads WHERE dataset = %s", (dataset,))
    now = datetime.now(timezone.utc).replace(microsecond=0)
    await db.execute("DELETE FROM kpi_uploads WHERE dataset = %s", (dataset,))
    await db.execute(
        "INSERT INTO kpi_uploads (dataset, storage_key, filename, row_count, uploaded_by, uploaded_at) VALUES (%s, %s, %s, %s, %s, %s)",
        (dataset, key, filename[:255], len(rows), user_email, now),
    )
    if old and old[0]:
        try:
            await run_in_threadpool(storage.delete, old[0])
        except Exception:  # noqa: BLE001 - a leftover blob is harmless
            log.warning("Could not delete the previous %s upload", dataset)
    async with _lock(dataset):
        _cache[dataset] = {"stamp": _stamp(now), "rows": rows, "header": header}
    return {"row_count": len(rows), "columns": header}


async def delete_upload(dataset: str) -> None:
    old = await db.fetch_one("SELECT storage_key FROM kpi_uploads WHERE dataset = %s", (dataset,))
    await db.execute("DELETE FROM kpi_uploads WHERE dataset = %s", (dataset,))
    _cache.pop(dataset, None)
    if old and old[0]:
        try:
            await run_in_threadpool(storage.delete, old[0])
        except Exception:  # noqa: BLE001
            log.warning("Could not delete the %s upload file", dataset)


async def load_rows(dataset: str) -> tuple[dict, list[dict]] | None:
    """(meta, rows) of the current upload for a dataset, or None if nothing was uploaded."""
    meta_row = await db.fetch_one("SELECT storage_key, filename, row_count, uploaded_by, uploaded_at FROM kpi_uploads WHERE dataset = %s", (dataset,))
    if meta_row is None:
        _cache.pop(dataset, None)
        return None
    key, filename, row_count, uploaded_by, uploaded_at = meta_row
    stamp = _stamp(uploaded_at)
    meta = {"filename": filename, "row_count": row_count, "uploaded_by": uploaded_by, "uploaded_at": uploaded_at.isoformat() if hasattr(uploaded_at, "isoformat") else str(uploaded_at)}
    async with _lock(dataset):
        hit = _cache.get(dataset)
        if hit and hit["stamp"] == stamp:
            return meta, hit["rows"]
        spec = DATASETS[dataset]
        data = await run_in_threadpool(storage.get_bytes, key)
        header, rows = await run_in_threadpool(parse_table, filename, data, spec["sheet"], spec["required"])
        _cache[dataset] = {"stamp": stamp, "rows": rows, "header": header}
        return meta, rows
