"""Read one sheet of an .xlsx quickly (2026-09-26).

openpyxl needs 40+ seconds for a 23 MB workbook with an 87,000-row sheet (the LM POD Performance file) -- longer than an upload request
should take. This reads the sheet's XML straight out of the zip with a streaming parser and only keeps the columns asked for
(~10 seconds for the same file). Anything unexpected raises, and the caller falls back to openpyxl.
"""
import io
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
_EPOCH = datetime(1899, 12, 30)
_DATE_FORMAT_IDS = set(range(14, 23)) | {45, 46, 47}


def _col_index(ref: str) -> int:
    n = 0
    for ch in ref:
        if not ch.isalpha():
            break
        n = n * 26 + (ord(ch.upper()) - 64)
    return n - 1


def sheet_names(data: bytes) -> list[str]:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        root = ET.fromstring(z.read("xl/workbook.xml"))
    return [s.get("name", "") for s in root.iter(_NS + "sheet")]


def _sheet_path(z: zipfile.ZipFile, name: str) -> str:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid = next((s.get(_RNS + "id") for s in wb.iter(_NS + "sheet") if s.get("name") == name), None)
    if rid is None:
        raise ValueError(f"no sheet {name!r}")
    for r in rels:
        if r.get("Id") == rid:
            t = r.get("Target") or ""
            return t.lstrip("/") if t.startswith("/") else "xl/" + t
    raise ValueError("sheet relationship not found")


def _shared_strings(z: zipfile.ZipFile) -> list[str]:
    out: list[str] = []
    if "xl/sharedStrings.xml" not in z.namelist():
        return out
    with z.open("xl/sharedStrings.xml") as f:
        for _ev, el in ET.iterparse(f, events=("end",)):
            if el.tag == _NS + "si":
                out.append(sys.intern("".join(t.text or "" for t in el.iter(_NS + "t"))))
                el.clear()
    return out


def _date_styles(z: zipfile.ZipFile) -> set[int]:
    """Cell style indexes whose number format is a date / time (so a serial number becomes a datetime)."""
    if "xl/styles.xml" not in z.namelist():
        return set()
    root = ET.fromstring(z.read("xl/styles.xml"))
    custom: dict[int, str] = {}
    formats = root.find(_NS + "numFmts")
    if formats is not None:
        for n in formats:
            custom[int(n.get("numFmtId"))] = n.get("formatCode", "")
    dates: set[int] = set()
    xfs = root.find(_NS + "cellXfs")
    if xfs is not None:
        for i, xf in enumerate(xfs):
            fid = int(xf.get("numFmtId", "0"))
            code = custom.get(fid, "")
            if fid in _DATE_FORMAT_IDS or (code and re.search(r"[ymdhs]", re.sub(r'"[^"]*"|\[[^\]]*\]', "", code).lower())):
                dates.add(i)
    return dates


def read_sheet(data: bytes, sheet_name: str, keep, clean_header, cell, max_rows: int, header_search_rows: int = 30):
    """(header, rows) of a sheet: the first row with at least two filled cells is the header; `keep(header_text)` decides which columns
    are kept (None = all); `cell(value)` normalises a value. Returns None when no header is found near the top."""
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        path = _sheet_path(z, sheet_name)
        sst = _shared_strings(z)
        date_styles = _date_styles(z)
        all_columns = keep is None
        header: dict[int, str] | None = None
        header_cells: dict[int, object] = {}
        rows: list[dict] = []  # with all_columns: {column index: value} rows, widened to the sheet's real width at the end
        seen = 0
        with z.open(path) as f:
            for _ev, row in ET.iterparse(f, events=("end",)):
                if row.tag != _NS + "row":
                    continue
                seen += 1
                cells: dict[int, object] = {}
                for c in row:
                    ref = c.get("r")
                    if ref is None:
                        continue
                    ci = _col_index(ref)
                    if header is not None and not all_columns and ci not in header:
                        continue
                    t = c.get("t")
                    v = c.find(_NS + "v")
                    if t == "inlineStr":
                        node = c.find(_NS + "is")
                        val = "".join(x.text or "" for x in node.iter(_NS + "t")) if node is not None else ""
                    elif v is None or v.text is None:
                        continue
                    elif t == "s":
                        val = sst[int(v.text)]
                    elif t in ("str", "e"):
                        val = v.text
                    elif t == "b":
                        val = bool(int(v.text))
                    else:
                        x = float(v.text)
                        val = _EPOCH + timedelta(days=x) if int(c.get("s", "0")) in date_styles else x
                    cells[ci] = val
                row.clear()
                if header is None:
                    if sum(1 for v in cells.values() if v is not None and str(v).strip()) >= 2:
                        # every column position up to the last filled one, so a blank header cell keeps its place ("_col5") -- some sheets
                        # (the weekly KPI one) are read by position
                        header_cells = dict(cells)
                        full = {ci: clean_header(cells.get(ci), ci) for ci in range(max(cells) + 1)}
                        header = {ci: h for ci, h in full.items() if keep is None or keep(h)}
                    elif seen > header_search_rows:
                        return None
                    continue
                if not cells:
                    continue
                if not any(v is not None and str(v).strip() for v in cells.values()):
                    continue
                if all_columns:
                    rows.append({ci: cell(v) for ci, v in cells.items()})
                else:
                    rows.append({h: cell(cells.get(ci)) for ci, h in header.items()})
                if len(rows) > max_rows:
                    raise ValueError("too many rows")
    if not header:
        return None
    if all_columns:
        # data can run wider than the header row (columns to the right of the last title): give them positions too, like openpyxl does
        width = max([max(header) + 1] + [max(r) + 1 for r in rows if r])
        wide = {ci: clean_header(header_cells.get(ci), ci) for ci in range(width)}
        return list(wide.values()), [{h: r.get(ci) for ci, h in wide.items()} for r in rows]
    return list(header.values()), rows
