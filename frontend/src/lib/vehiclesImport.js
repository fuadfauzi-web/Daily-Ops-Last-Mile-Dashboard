// Paste-in for Fleet Admin -> Vehicles (2026-10-03): rows copied from the 'Master' tab of the Master Vehicle Inventory sheet (or a CSV) become vehicle rows ready
// for POST /api/vehicles/bulk. The header row decides the columns; unknown columns (Replace, the second VRN ...) are ignored. A blank, N/A or TBA cell is left out, so
// pasting never wipes what is already filled in. The sheet's status column has no heading (it sits right after TMS): that one is picked up by position.
import { splitRows } from "./staffImport";
import { parseDate } from "./premisesImport";

const key = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const BLANK = new Set(["", "n/a", "na", "-", "none", "nil", "tba"]);
const blank = (s) => BLANK.has(clean(s).toLowerCase());

const HEADERS = {
  plate: ["vrn", "plate", "platenumber", "plateno", "vehicleregistration"],
  vehicle_function: ["function"],
  state: ["state"],
  station_code: ["station", "stationcode"],
  location_ns: ["locationns", "location"],
  tms_route: ["tms", "tmsroute"],
  status: ["status"],
  vehicle_type: ["vehicletype", "type"],
  ownership: ["ownership", "owner"],
  driver: ["driver"],
  hiring_label: ["hiringreplacement"],
  returned_van: ["returnedvan"],
  license_doc_url: ["driverslicense", "driverlicense", "licensedoc"],
  gdl_expiry: ["gdlexpirydate", "gdlexpiry"],
  license_expiry: ["licenseexpirydate", "licenceexpirydate", "licenseexpiry", "licenceexpiry"],
  old_fuel_card: ["oldfuelcardno"],
  old_fuel_status: ["oldfuelcardstatus"],
  new_fuel_card: ["newfuelcardno"],
  new_fuel_status: ["newfuelcardstatusstation", "newfuelcardstatus"],
  fuel_limit: ["fuelcardlimit", "fuellimit"],
  petronas_card: ["fuelcardnopetronas", "petronascardno"],
  fuel_type: ["fueltype"],
  fuel_card_id: ["fuelcardid"],
  tng_card: ["tngcardno", "tngcard"],
  tng_serial: ["tngserialno"],
  tng_id: ["tngid"],
  remarks: ["remarksadminfornewshellcard", "remarks"],
  admin_note: ["alifremarks", "adminnote"],
};
const TEXT_FIELDS = ["vehicle_function", "state", "station_code", "location_ns", "tms_route", "status", "vehicle_type", "ownership", "driver", "hiring_label", "returned_van",
  "old_fuel_card", "old_fuel_status", "new_fuel_card", "new_fuel_status", "petronas_card", "fuel_type", "fuel_card_id", "tng_card", "tng_serial", "tng_id", "remarks", "admin_note"];
const PLATE = /^[A-Z0-9]{2,12}$/;

function mapHeader(cells) {
  const cols = {};
  cells.forEach((c, i) => {
    const k = key(c);
    for (const [field, names] of Object.entries(HEADERS)) if (names.includes(k) && cols[field] === undefined) cols[field] = i;
  });
  if (cols.status === undefined && cols.tms_route !== undefined && key(cells[cols.tms_route + 1]) === "") cols.status = cols.tms_route + 1;
  return cols;
}

// -> [{ line, ok, error, status: 'save' | 'error', plate, row, label, summary }]
export function parseVehiclesPaste(text) {
  const grid = splitRows(text);
  if (!grid.length) return [];
  let at = -1;
  for (let i = 0; i < Math.min(3, grid.length); i++) if (mapHeader(grid[i]).plate !== undefined) { at = i; break; }
  if (at < 0) return [{ line: 1, ok: false, error: "No heading row with a VRN / Plate column found -- copy the rows with the headings", status: "error", label: "Paste", row: null, summary: "" }];
  const cols = mapHeader(grid[at]);
  const seen = new Set();
  const rows = [];
  grid.slice(at + 1).forEach((cells, i) => {
    const line = at + 2 + i;
    if (cells.every((c) => blank(c))) return;
    const get = (f) => (cols[f] === undefined ? "" : clean(cells[cols[f]]));
    const raw = get("plate");
    const out = (error, row) => ({ line, ok: !error, error, status: error ? "error" : "save", plate: row?.plate || raw, row, label: raw || `row ${line}`, summary: row ? summarise(row) : "" });
    const plate = raw.toUpperCase().replace(/\s+/g, "");
    if (!plate) return rows.push(out("No plate number"));
    if (!PLATE.test(plate)) return rows.push(out(`Not a plate number: "${raw}"`));
    if (seen.has(plate)) return rows.push(out("Same plate twice in this paste"));
    seen.add(plate);
    const row = { plate };
    const bad = [];
    for (const f of TEXT_FIELDS) if (!blank(get(f))) row[f] = get(f);
    for (const f of ["gdl_expiry", "license_expiry"]) {
      const v = get(f);
      if (blank(v)) continue;
      const iso = parseDate(v);
      if (iso) row[f] = iso; else bad.push(`${f.replace(/_/g, " ")} "${v}"`);
    }
    const lim = get("fuel_limit");
    if (!blank(lim)) {
      const n = lim.replace(/,/g, "");
      if (/^\d+(\.\d+)?$/.test(n)) row.fuel_limit = n; else bad.push(`fuel limit "${lim}"`);
    }
    const doc = get("license_doc_url");
    if (/^https?:\/\//i.test(doc)) row.license_doc_url = doc.split(/\s/)[0];
    if (bad.length) return rows.push(out(`Could not read: ${bad.join(", ")}`));
    rows.push(out(null, row));
  });
  return rows;
}

function summarise(row) {
  const n = Object.keys(row).length - 1;
  const bits = [row.driver, row.station_code].filter(Boolean);
  return `${n} field${n === 1 ? "" : "s"}${bits.length ? ": " + bits.join(", ") : ""}`;
}
