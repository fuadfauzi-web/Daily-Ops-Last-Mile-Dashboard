// Paste-in for Fleet Admin -> Assets -> Fire extinguisher / Weighing scale (2026-10-04): rows copied from the sheets' station tabs (or a CSV) become records ready for
// POST /api/assets/{kind}/bulk. The header row decides the columns; unknown columns are ignored; blank / N/A / #N/A cells are left out so pasting never wipes a value.
// A row is matched to an existing record by station + serial number (updated), otherwise added. The station may be a name or the 3-letter hub code.
import { splitRows } from "./staffImport";
import { parseDate } from "./premisesImport";

const key = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const BLANK = new Set(["", "n/a", "#n/a", "na", "-", "none", "nil"]);
const blank = (s) => BLANK.has(clean(s).toLowerCase());

// field -> predicate on a heading key (first matching column wins)
const MATCHERS = {
  "fire-extinguisher": [
    ["station", (k) => ["hubid", "station", "stationname"].includes(k)],
    ["pic_name", (k) => ["pic", "picname"].includes(k)],
    ["pic_phone", (k) => k.startsWith("phoneno") || k === "phone"],
    ["has_fe", (k) => k === "fireextinguisher"],
    ["quantity", (k) => k === "qty" || k === "quantity"],
    ["expiry_date", (k) => k === "expirydate" || k === "expirationdate"],
    ["serial_numbers", (k) => ["certnumber", "serialnumber", "serialnumbers", "serialno"].includes(k)],
    ["vendor", (k) => k === "vendor"],
    ["remarks", (k) => k === "remarks" || k === "remark"],
  ],
  "weighing-scale": [
    ["station", (k) => ["stationname", "station", "hubid"].includes(k)],
    ["manufacturer", (k) => k === "manufacturer"],
    ["last_calibrated", (k) => k.startsWith("lastcalibrated")],
    ["expiry_date", (k) => k.startsWith("expirationdate") || k === "expirydate"],
    ["reference_no", (k) => k.startsWith("referencenumber") || k === "referenceno"],
    ["serial_no", (k) => k === "serialno" || k === "serialnumber"],
    ["cable", (k) => k === "cable"],
    ["calibrated_by", (k) => k === "calibratedby"],
    ["borang_d", (k) => k === "borangd"],
    ["certificate", (k) => k.startsWith("certificate")],
    ["remarks", (k) => k === "remarks" || k === "remark"],
  ],
};
const DATES = new Set(["expiry_date", "last_calibrated"]);
const INTS = new Set(["quantity"]);

function mapHeader(kind, cells) {
  const cols = {};
  const keys = cells.map(key);
  for (const [field, pred] of MATCHERS[kind]) {
    const i = keys.findIndex(pred);
    if (i >= 0) cols[field] = i;
  }
  // The Klang Valley extinguisher tab repeats "EXPIRY DATE" four times; the last one holds the serial numbers.
  if (kind === "fire-extinguisher" && cols.serial_numbers === undefined) {
    const idx = keys.map((k, i) => (k === "expirydate" ? i : -1)).filter((i) => i >= 0);
    if (idx.length >= 4) cols.serial_numbers = idx[idx.length - 1];
  }
  return cols;
}

// -> { rows: [{ line, ok, error, label, row, summary }], problem?: text }
export function parseRegisterPaste(kind, text) {
  const grid = splitRows(text);
  if (!grid.length) return { rows: [] };
  let at = -1;
  for (let i = 0; i < Math.min(4, grid.length); i++) if (mapHeader(kind, grid[i]).station !== undefined) { at = i; break; }
  if (at < 0) return { rows: [], problem: "No heading row with a station column found -- copy the rows with the headings" };
  const cols = mapHeader(kind, grid[at]);
  const rows = [];
  grid.slice(at + 1).forEach((cells, i) => {
    const line = at + 2 + i;
    if (cells.every((c) => blank(c))) return;
    const get = (f) => (cols[f] === undefined ? "" : clean(cells[cols[f]]));
    const station = get("station");
    const out = (error, row) => ({ line, ok: !error, error, label: station || `row ${line}`, row, summary: row ? Object.keys(row).filter((k) => k !== "station").map((k) => row[k]).slice(0, 3).join(" · ") : "" });
    if (blank(station)) return rows.push(out("No station"));
    const row = { station };
    const bad = [];
    for (const f of Object.keys(cols)) {
      if (f === "station") continue;
      const v = get(f);
      if (blank(v)) continue;
      if (DATES.has(f)) {
        const iso = parseDate(v);
        if (iso) row[f] = iso; else bad.push(`${f.replace(/_/g, " ")} "${v}"`);
      } else if (INTS.has(f)) {
        if (/^\d{1,6}$/.test(v)) row[f] = v; else bad.push(`${f} "${v}"`);
      } else row[f] = v;
    }
    if (bad.length) return rows.push(out(`Could not read: ${bad.join(", ")}`));
    rows.push(out(null, row));
  });
  return { rows };
}
