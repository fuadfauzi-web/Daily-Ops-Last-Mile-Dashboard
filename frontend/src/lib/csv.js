function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// headers: string[]. rows: array of arrays of raw values, one per header,
// in the same order. Every tab's CSV export builds these from its own
// already-filtered data and calls this -- one escaping/download
// implementation instead of one per tab.
export function exportCsv(filename, headers, rows) {
  const lines = [headers.join(",")];
  rows.forEach((values) => {
    lines.push(values.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  });
  downloadCsv(filename, lines.join("\n"));
}

export { downloadCsv };
