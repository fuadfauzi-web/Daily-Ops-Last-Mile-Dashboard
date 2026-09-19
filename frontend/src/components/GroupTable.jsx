import { useState } from "react";
import DataTable from "./DataTable";

// The small region/zone rollup table that sits above every tab's main detail
// table. Renders nothing when there's only one group -- drilling down to a
// single region/zone makes its own rollup redundant.
export default function GroupTable({ title, groupLabel, rows, columns }) {
  const [sortKey, setSortKey] = useState("key");
  const [sortDir, setSortDir] = useState("asc");

  if (rows.length <= 1) return null;

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "key" ? "asc" : "desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const allColumns = [
    { key: "key", label: groupLabel, sticky: true, align: "left" },
    {
      key: "station_count",
      label: "Stations",
      className: () => "text-slate-500",
      render: (r) => r.station_count.toLocaleString(),
    },
    ...columns,
  ];

  return (
    <DataTable
      variant="light"
      title={title}
      columns={allColumns}
      rows={sorted}
      rowKey={(r) => r.key}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={toggleSort}
    />
  );
}
