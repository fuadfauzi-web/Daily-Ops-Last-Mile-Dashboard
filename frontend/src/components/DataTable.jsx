// Shared shell for every sortable, sticky-header table in the app. Callers own
// their data/sort state and hand over a fully resolved column list -- this
// component only renders the chrome (header theme, sticky column, hover,
// empty state, footer), so every table gets it identically instead of by
// copy-paste.
//
// variant "dark" (default): ink header, sticky top, hover rows -- the main
// per-station/driver/shipper detail tables.
// variant "light": pale header, no sticky top, no row hover -- the small
// region/zone rollup tables (see GroupTable.jsx).
export default function DataTable({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir,
  onSort,
  variant = "dark",
  maxHeight,
  title,
  titleExtra,
  subHeader,
  emptyMessage = "No rows match.",
  footer,
}) {
  const dark = variant === "dark";
  const headBg = dark ? "bg-ink text-white" : "bg-slate-50 text-slate-500";
  const headHover = dark ? "hover:bg-brand" : "hover:bg-slate-200";
  const rowHover = dark ? "hover:bg-slate-50/60" : "";
  const stickyHeadBg = dark ? "bg-ink" : "bg-slate-50";

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="font-display text-sm font-medium text-slate-700">{title}</div>
          {titleExtra}
        </div>
      )}
      <div className={maxHeight ? "overflow-auto" : "overflow-x-auto"} style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full text-sm">
          <thead className={`${dark ? "sticky top-0 z-20" : ""} text-left ${headBg}`}>
            <tr>
              {columns.map((c) => {
                const sortable = c.sortable !== false && !!onSort;
                const align = c.align || (c.sticky ? "left" : "center");
                return (
                  <th
                    key={c.key}
                    className={[
                      "whitespace-nowrap px-4 py-2 font-display font-medium",
                      align === "center" ? "text-center" : "text-left",
                      sortable ? `cursor-pointer select-none ${headHover}` : "",
                      c.sticky ? `sticky left-0 z-30 ${stickyHeadBg}` : "",
                    ].join(" ")}
                    onClick={sortable ? () => onSort(c.key) : undefined}
                  >
                    {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                );
              })}
            </tr>
            {subHeader && (
              <tr className="bg-slate-800 text-[11px] font-normal normal-case text-slate-300">
                <th className="bg-slate-800 px-4 py-1" colSpan={columns.length}>
                  {subHeader}
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey(row, i)} className={`border-t border-slate-100 ${rowHover}`}>
                {columns.map((c) => {
                  const align = c.align || (c.sticky ? "left" : "center");
                  const content = c.render ? c.render(row) : row[c.key];
                  // No per-column className means "plain data cell" -- default to the
                  // same muted grey every table used before this was unified. Columns
                  // that need severity/emphasis colouring always supply their own.
                  const extraClass = c.className ? c.className(row) : "text-slate-700";
                  const isClickable = !!c.onClick && (c.clickable ? c.clickable(row) : true);
                  return (
                    <td
                      key={c.key}
                      className={[
                        "px-4 py-2 whitespace-nowrap",
                        align === "center" ? "text-center tabular-nums" : "",
                        c.sticky ? "sticky left-0 z-10 bg-white font-medium text-slate-800" : "",
                        extraClass,
                      ].join(" ")}
                    >
                      {isClickable ? (
                        <button
                          onClick={() => c.onClick(row)}
                          className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                        >
                          {content}
                        </button>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">{footer}</div>}
    </div>
  );
}
