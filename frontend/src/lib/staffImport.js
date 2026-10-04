// Paste-in for Staff & Org Chart (2026-10-02): rows copied from the Fleet Management sheet (tab-separated) or a CSV become staff rows
// ready for POST /api/staff/bulk. Pure functions, no React, so they can be checked on their own.
//
// The header row decides the columns: email, name, designation / position, station, zone, region, mobile / phone, employee ID (other
// columns such as Station Id are ignored). Without a header the order is: name, email, position, place, phone, employee ID.
import { POSITIONS } from "./roles";

const key = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const BLANK = new Set(["", "tba", "n/a", "na", "-", "none", "nil", "vacant"]);
const isBlank = (s) => BLANK.has(clean(s).toLowerCase());

const HEADERS = {
  email: ["email", "emailaddress", "mail", "workemail"],
  name: ["name", "fullname", "staffname", "employeename"],
  position: ["designation", "position", "role", "title", "jobtitle"],
  station: ["station", "stationname", "hub", "hubname"],
  zone: ["zone", "zonename"],
  region: ["region", "regionname"],
  place: ["place", "location", "postedat", "base", "basedat"],
  phone: ["mobile", "mobileno", "mobilenumber", "phone", "phoneno", "phonenumber", "contact", "contactno", "handphone", "hp"],
  employee_id: ["employeeid", "empid", "employeeno", "employeenumber", "staffid", "employeecode"],
};
const DEFAULT_ORDER = ["name", "email", "position", "place", "phone", "employee_id"];

// A tiny CSV / TSV splitter that understands "quoted, cells" -- including cells with line breaks inside, as Google Sheets quotes them on copy.
export function splitRows(text) {
  const src = String(text || "").replace(/\r\n?/g, "\n");
  const firstLine = src.split("\n").find((l) => l.trim() !== "") || "";
  const delim = firstLine.includes("\t") ? "\t" : ",";
  const rows = [];
  let cells = [];
  let cur = "";
  let quoted = false;
  const endRow = () => {
    cells.push(cur);
    cur = "";
    if (cells.some((c) => c.trim() !== "")) rows.push(cells);
    cells = [];
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"' && cur === "") quoted = true;
    else if (ch === delim) { cells.push(cur); cur = ""; }
    else if (ch === "\n") endRow();
    else cur += ch;
  }
  if (cur !== "" || cells.length) endRow();
  return rows;
}

function mapHeader(cells) {
  const cols = {};
  cells.forEach((c, i) => {
    const k = key(c);
    for (const [field, names] of Object.entries(HEADERS)) if (names.includes(k) && cols[field] === undefined) cols[field] = i;
  });
  return cols;
}

// "Fleet Assistant 2", "Station Head", "RFS", "Regional Fleet Supervisor (RFS)", "Region Head (RH)", "HOD" ... -> position key
export function parsePosition(text) {
  const raw = clean(text);
  if (!raw) return null;
  for (const [k, v] of Object.entries(POSITIONS)) if (k !== "admin" && (key(v.label) === key(raw) || k === key(raw))) return k;
  const t = raw.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\d+/g, " ").replace(/\s+/g, " ").trim();
  const tag = (raw.match(/\(([^)]*)\)/) || [])[1]?.toLowerCase().trim();
  if (t === "rfs" || tag === "rfs" || /fleet supervisor/.test(t)) return "rfs";
  if (t === "rh" || tag === "rh" || /^region(al)? head/.test(t)) return "region_head";
  if (t === "sh" || /^station head/.test(t)) return "station_head";
  if (/fleet admin/.test(t)) return "fleet_admin";
  if (t === "fa" || /assistant/.test(t)) return "fleet_assistant"; // Fleet Assistant 1 / 2 / 3 / 5, WH Assistant
  if (t === "hod" || /head of (dept|department|operations)/.test(t)) return "hod";
  if (/manager/.test(t)) return "manager";
  if (/opex/.test(t)) return "opex";
  if (/recovery/.test(t)) return "recovery";
  if (/restock/.test(t)) return "restock";
  return null;
}

// Names the sheet and the station list spell differently.
const STATION_ALIASES = { "wangsa melawati": "Melawati", kinabatangan: "Kota Kinabatangan" };

function lookups(stations, regions) {
  const station = new Map();
  for (const s of stations) {
    station.set(s.station_name.toLowerCase(), s.station_name);
    if (s.station_code) station.set(String(s.station_code).toLowerCase(), s.station_name);
  }
  for (const [a, b] of Object.entries(STATION_ALIASES)) if ([...station.values()].includes(b)) station.set(a, b);
  const zone = new Map(regions.flatMap((r) => r.zones).map((z) => [z.toLowerCase(), z]));
  const region = new Map(regions.map((r) => [r.region.toLowerCase(), r.region]));
  return { station, zone, region };
}

const splitList = (s) => clean(s).split(/\s*[;&/]\s*|\s+and\s+/i).filter(Boolean);
const pickAll = (text, map, strip) => {
  const found = [];
  const bad = [];
  for (const part of splitList(text)) {
    const k = part.toLowerCase();
    const hit = map.get(k) || (strip && map.get(k.replace(strip, "").trim()));
    if (hit) found.push(hit);
    else bad.push(part);
  }
  return { found, bad };
};

// -> [{ line, ok, error, status: 'add' | 'update' | 'error', row: {email,name,role,scope_type,scope_values,phone?,employee_id?}, label }]
export function parseStaffPaste(text, { stations = [], regions = [], existing = [] } = {}) {
  const grid = splitRows(text);
  if (!grid.length) return [];
  let cols = mapHeader(grid[0]);
  let body = grid.slice(1);
  let first = 2;
  if (cols.email === undefined) { // no header row: the default order, and the first row is data
    cols = Object.fromEntries(DEFAULT_ORDER.map((f, i) => [f, i]));
    body = grid;
    first = 1;
  }
  const look = lookups(stations, regions);
  const have = new Set(existing.map((e) => e.toLowerCase()));
  const seen = new Set();
  const get = (cells, f) => (cols[f] === undefined ? "" : clean(cells[cols[f]]));
  return body.map((cells, i) => {
    const line = first + i;
    const email = get(cells, "email").toLowerCase();
    const name = get(cells, "name");
    const out = (error, row) => ({ line, ok: !error, error, status: error ? "error" : have.has(email) ? "update" : "add", row, label: name || email || `row ${line}` });
    if (isBlank(name)) return out(name ? "Vacant seat" : "No name");
    if (!email.includes("@")) return out("No email yet (put it in Headcount as a TBA seat)");
    if (seen.has(email)) return out("Same email twice in this paste");
    seen.add(email);
    const role = parsePosition(get(cells, "position"));
    if (!role) return out(`Position not recognised: "${get(cells, "position")}"`);
    const tier = POSITIONS[role].tier;
    const row = { email, name, role, scope_type: "hq", scope_values: [] };
    const station = get(cells, "station") || (tier === "station" ? get(cells, "place") : "");
    const zone = get(cells, "zone") || (tier === "region" ? get(cells, "place") : "");
    const region = get(cells, "region") || (tier !== "station" && tier !== "region" ? get(cells, "place") : "");
    if (tier === "station") {
      const { found, bad } = pickAll(station, look.station, /^station\s+/);
      if (!found.length || bad.length) return out(`Station not recognised: "${bad.join(", ") || station || "(none)"}"`);
      Object.assign(row, { scope_type: "station", scope_values: [...new Set(found)] });
    } else if (tier === "region") {
      if (zone && !isBlank(zone)) {
        const { found, bad } = pickAll(zone, look.zone);
        if (!found.length || bad.length) return out(`Zone not recognised: "${bad.join(", ") || zone}"`);
        Object.assign(row, { scope_type: "zone", scope_values: [...new Set(found)] });
      } else {
        const { found, bad } = pickAll(region, look.region);
        if (!found.length || bad.length) return out(`Zone or region needed for a ${POSITIONS[role].label}`);
        Object.assign(row, { scope_type: "region", scope_values: [...new Set(found)] });
      }
    } else if (region && !isBlank(region) && key(region) !== "hq") {
      const { found, bad } = pickAll(region, look.region);
      if (!found.length || bad.length) return out(`Region not recognised: "${bad.join(", ") || region}"`);
      Object.assign(row, { scope_type: "region", scope_values: [...new Set(found)] });
    }
    // Contact details: blank / TBA cells are left out, so a pasted TBA never wipes a number that is already on file.
    const phone = get(cells, "phone");
    const emp = get(cells, "employee_id");
    if (!isBlank(phone)) row.phone = phone;
    if (!isBlank(emp)) row.employee_id = emp;
    return out(null, row);
  });
}
