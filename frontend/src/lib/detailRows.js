// Turns a DataTable columns array plus one clicked row into DetailPanel's
// {label, value, className} rows, reusing whatever render/className that
// table's own columns already compute -- so every tab's row-click detail
// view matches its table exactly, for free, with no per-metric duplication.
// Skips the sticky identity column (that becomes the panel's title instead).
export function columnsToDetailRows(columns, row) {
  return columns
    .filter((c) => !c.sticky)
    .map((c) => ({
      label: c.label,
      value: c.render ? c.render(row) : row[c.key],
      className: c.className ? c.className(row) : undefined,
    }));
}
