function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// A table header label can be a React node (text + a little "i" note icon); a CSV header must be plain text or it comes
// out as "[object Object]" (2026-09-26 bug). Components (the note icon) contribute nothing; fragments / elements recurse.
export function headerText(label) {
  if (label == null || label === false) return "";
  if (typeof label === "string" || typeof label === "number") return String(label);
  if (Array.isArray(label)) return label.map(headerText).join("");
  if (typeof label === "object" && label.props) {
    if (typeof label.type === "function") return "";
    return headerText(label.props.children);
  }
  return "";
}

// headers: string[] (or React-node labels). rows: array of arrays of raw values, one per header,
// in the same order. Every tab's CSV export builds these from its own
// already-filtered data and calls this -- one escaping/download
// implementation instead of one per tab.
export function exportCsv(filename, headers, rows) {
  const lines = [headers.map((h) => headerText(h).replace(/\s+/g, " ").trim()).join(",")];
  rows.forEach((values) => {
    lines.push(values.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  });
  downloadCsv(filename, lines.join("\n"));
}

export { downloadCsv };
