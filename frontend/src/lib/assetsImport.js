// Paste-in for Fleet Admin -> Assets -> Station inventory (2026-10-03): the item list of ONE station tab of the Fleet Inventory workbook (heading row: SKU, ITEMS / DESCRIPTION,
// OUM, GOOD, DAMAGE, REMARKS) becomes items ready for PUT /api/assets/inventory/{station}. Stops at the "TAGGING DETAILS" line. N/A or text in a count cell is not a number:
// it becomes part of the remark instead (e.g. UNIFI for the WIFI line).
import { splitRows } from "./staffImport";

const key = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const HEADERS = {
  item: ["itemsdescription", "itemdescription", "items", "item", "description"],
  uom: ["oum", "uom", "unit"],
  good: ["good", "qtygood", "quantitygood"],
  damaged: ["damage", "damaged", "qtydamaged"],
  remarks: ["remarks", "remark", "notes"],
};

function mapHeader(cells) {
  const cols = {};
  cells.forEach((c, i) => {
    const k = key(c);
    for (const [f, names] of Object.entries(HEADERS)) if (names.includes(k) && cols[f] === undefined) cols[f] = i;
  });
  return cols;
}

// -> { items: [{ item, uom, good, damaged, remarks }], problems: [text] }
export function parseInventoryPaste(text) {
  const grid = splitRows(text);
  const problems = [];
  if (!grid.length) return { items: [], problems };
  let at = grid.findIndex((r, i) => i < 5 && mapHeader(r).item !== undefined);
  let cols;
  if (at >= 0) cols = mapHeader(grid[at]);
  else if (key(grid[0][0]) === "asset") { cols = { item: 1, uom: 2, good: 3, damaged: 4, remarks: 5 }; at = -1; }
  else return { items: [], problems: ["No heading row with an ITEMS column found -- copy the station tab's item rows with the heading row"] };
  const items = [];
  const seen = new Set();
  for (const cells of grid.slice(at + 1)) {
    const first = clean(cells[0]);
    if (/^tagging/i.test(first)) break;
    const get = (f) => (cols[f] === undefined ? "" : clean(cells[cols[f]]));
    const name = get("item").toUpperCase();
    if (!name) continue;
    if (seen.has(name)) { problems.push(`${name} is listed twice (the first one is used)`); continue; }
    seen.add(name);
    const notes = [];
    const num = (f) => {
      const v = get(f);
      if (/^\d{1,6}$/.test(v)) return v;
      if (v && !/^(n\/a|na|-)$/i.test(v)) notes.push(v);
      return "";
    };
    const good = num("good");
    const damaged = num("damaged");
    const uom = /type/i.test(get("uom")) ? "type" : "unit";
    items.push({ item: name, uom, good, damaged, remarks: [get("remarks"), ...notes].filter(Boolean).join(" · ") });
  }
  return { items, problems };
}
