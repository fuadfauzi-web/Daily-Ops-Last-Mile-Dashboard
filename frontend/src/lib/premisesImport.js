// Paste-in for Fleet Admin -> Premises (2026-10-02): rows copied from the MY - Fleet Management sheet's 'Address' tab (or a CSV) become premises rows
// ready for POST /api/premises/bulk. The header row decides the columns (Station, Station ID, Address, Latlong, SQFT, Launched Date, Expiring Date,
// Snapshot, Terminate Date, Rental (RM), Deposit (RM), Document, Remarks, URL Link, Contract Lodgement); columns it does not know, such as "Expires In",
// are ignored. A blank, TBA or N/A cell is left out, so pasting never wipes what is already filled in.
import { splitRows } from "./staffImport";

const key = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const BLANK = new Set(["", "tba", "n/a", "na", "-", "none", "nil", "nan"]);
const blank = (s) => BLANK.has(clean(s).toLowerCase());

const HEADERS = {
  station: ["station", "stationname", "hub", "hubname"],
  station_code: ["stationid", "stationcode"],
  address: ["address"],
  latlong: ["latlong", "latlng", "coordinates", "geolocation"],
  sqft: ["sqft", "size", "sizesqft", "area"],
  launched_date: ["launcheddate", "launchdate", "launched", "openingdate"],
  license_expiry: ["expiringdate", "licenseexpiry", "licenceexpiry", "licenseexpiringdate", "businesslicenseexpiry", "licenseexpirydate"],
  license_doc_url: ["snapshot", "licensedoc", "licensesnapshot", "licensedocument"],
  tenancy_end: ["terminatedate", "tenancyend", "tenancyexpiry", "tenancyenddate", "tenancyterminatedate"],
  rental: ["rentalrm", "rental", "rent", "monthlyrental"],
  deposit: ["depositrm", "deposit"],
  tenancy_doc_urls: ["document", "documents", "tenancydocument", "tenancydocuments", "tenancydoc"],
  remarks: ["remarks", "remark", "notes"],
  chat_url: ["urllink", "chat", "chaturl", "googlechat", "gchat", "chatspace"],
  contract_ref: ["contractlodgement", "contractref", "contractreference", "contractno"],
};

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// 31/01/2027, 2027-01-31, 31-Jan-2027 -> 2027-01-31 (null when it is not a real date)
export function parseDate(text) {
  const s = clean(text);
  let y, m, d;
  let hit = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (hit) {
    [d, m, y] = [hit[1], hit[2], hit[3]];
    if (+m > 12 && +d <= 12) [d, m] = [m, d]; // 11/15/2021: the month can only be the first number (the sheet has a few typed that way)
  }
  else if ((hit = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [y, m, d] = [hit[1], hit[2], hit[3]];
  else if ((hit = s.match(/^(\d{1,2})[- ]([A-Za-z]{3})[a-z]*[- ,]+(\d{4})$/)) && MONTHS[hit[2].toLowerCase()]) [d, m, y] = [hit[1], MONTHS[hit[2].toLowerCase()], hit[3]];
  else return null;
  const dt = new Date(Date.UTC(+y, +m - 1, +d));
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +m - 1 || dt.getUTCDate() !== +d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const parseNumber = (text) => {
  const s = clean(text).replace(/rm/i, "").replace(/,/g, "").trim();
  return s !== "" && /^-?\d+(\.\d+)?$/.test(s) ? s : null;
};
const urlsIn = (text) => String(text || "").match(/https?:\/\/[^\s]+/gi) || [];

function mapHeader(cells) {
  const cols = {};
  cells.forEach((c, i) => {
    const k = key(c);
    for (const [field, names] of Object.entries(HEADERS)) if (names.includes(k) && cols[field] === undefined) cols[field] = i;
  });
  return cols;
}

// Names the sheet and the station list spell differently.
const STATION_ALIASES = { "wangsa melawati": "Melawati", kinabatangan: "Kota Kinabatangan" };

function stationLookup(stations) {
  const m = new Map();
  for (const s of stations) {
    const name = s.station_name || s.station; // the stations API and the premises list spell it differently
    m.set(name.toLowerCase(), name);
  }
  for (const [alias, name] of Object.entries(STATION_ALIASES)) if ([...m.values()].includes(name)) m.set(alias, name);
  return m;
}

// -> [{ line, ok, error, status: 'update' | 'error', station, row, label, summary }]
export function parsePremisesPaste(text, { stations = [] } = {}) {
  const grid = splitRows(text);
  if (!grid.length) return [];
  // The sheet has a group-heading row above the real one: use the first of the top rows that has a Station column.
  let at = -1;
  for (let i = 0; i < Math.min(3, grid.length); i++) if (mapHeader(grid[i]).station !== undefined) { at = i; break; }
  if (at < 0) return [{ line: 1, ok: false, error: "No heading row with a Station column found -- copy the rows with the headings", status: "error", label: "Paste", row: null, summary: "" }];
  const cols = mapHeader(grid[at]);
  const look = stationLookup(stations);
  const seen = new Set();
  const rows = [];
  grid.slice(at + 1).forEach((cells, i) => {
    const line = at + 2 + i;
    if (cells.every((c) => blank(c))) return; // empty rows at the end of a copied range
    rows.push(parseRow(cells, line));
  });
  return rows;

  function parseRow(cells, line) {
    const get = (f) => (cols[f] === undefined ? "" : clean(cells[cols[f]]));
    const raw = get("station");
    const out = (error, row) => ({ line, ok: !error, error, status: error ? "error" : "update", station: row?.station || raw, row, label: raw || `row ${line}`, summary: row ? summarise(row) : "" });
    if (blank(raw)) return out("No station");
    const station = look.get(raw.toLowerCase()) || look.get(raw.toLowerCase().replace(/^station\s+/, ""));
    if (!station) return out(`Station not recognised: "${raw}"`);
    if (seen.has(station)) return out("Same station twice in this paste");
    seen.add(station);
    const row = { station };
    const bad = [];
    for (const f of ["launched_date", "license_expiry", "tenancy_end"]) {
      const v = get(f);
      if (blank(v)) continue;
      const iso = parseDate(v);
      if (iso) row[f] = iso; else bad.push(`${f.replace(/_/g, " ")} "${v}"`);
    }
    for (const f of ["sqft", "rental", "deposit"]) {
      const v = get(f);
      if (blank(v)) continue;
      const n = parseNumber(v);
      if (n !== null) row[f] = n; else bad.push(`${f} "${v}"`);
    }
    const ll = get("latlong");
    if (!blank(ll)) {
      const nums = ll.match(/-?\d+\.\d+/g);
      if (nums && nums.length >= 2) { row.latitude = nums[0]; row.longitude = nums[1]; } else bad.push(`latlong "${ll}"`);
    }
    if (!blank(get("station_code"))) row.station_code = get("station_code");
    if (!blank(get("address"))) row.address = get("address");
    if (!blank(get("remarks"))) row.remarks = get("remarks");
    if (!blank(get("contract_ref"))) row.contract_ref = get("contract_ref");
    const lic = urlsIn(get("license_doc_url"))[0];
    if (lic) row.license_doc_url = lic;
    const chat = urlsIn(get("chat_url"))[0];
    if (chat) row.chat_url = chat;
    const docs = urlsIn(cols.tenancy_doc_urls === undefined ? "" : cells[cols.tenancy_doc_urls]);
    if (docs.length) row.tenancy_doc_urls = docs.join("\n");
    if (bad.length) return out(`Could not read: ${bad.join(", ")}`);
    return out(null, row);
  }
}

function summarise(row) {
  const bits = [];
  if (row.license_expiry) bits.push(`licence ${row.license_expiry}`);
  if (row.tenancy_end) bits.push(`tenancy ${row.tenancy_end}`);
  if (row.rental) bits.push(`rent ${row.rental}`);
  const n = Object.keys(row).length - 1;
  return `${n} field${n === 1 ? "" : "s"}${bits.length ? ": " + bits.join(", ") : ""}`;
}
