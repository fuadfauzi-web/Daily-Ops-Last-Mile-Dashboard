// Draws a small table onto a canvas and copies it to the clipboard as a PNG, so a board someone has just arranged can be pasted straight
// into a chat (Action Board "Copy image"). Drawn from the data rather than screenshotting the page: no library, and the image is exactly
// as wide as its columns need.
//
// columns: [{ label, sub?, align? ("left" | "center") }]; rows: [{ cells: [{ text, sev? ("critical" | "warning" | "good") }] }]
const FONT = "Montserrat, 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif";
const SEV = {
  critical: { bg: "#FBEAE8", fg: "#8C1D18", bold: true },
  warning: { bg: "#FEF3E2", fg: "#B45309", bold: true },
  good: { bg: null, fg: "#475569", bold: false },
};

export function drawTableCanvas({ title, columns, rows, scale = 2 }) {
  const padX = 12;
  const rowH = 30;
  const headH = columns.some((c) => c.sub) ? 46 : 34;
  const titleH = title ? 32 : 0;
  const measure = document.createElement("canvas").getContext("2d");
  const widthOf = (text, font) => {
    measure.font = font;
    return measure.measureText(text).width;
  };
  const colW = columns.map((c, i) => {
    let w = Math.max(widthOf(c.label, `600 12px ${FONT}`), c.sub ? widthOf(c.sub, `400 10px ${FONT}`) : 0);
    rows.forEach((r) => {
      const cell = r.cells[i];
      w = Math.max(w, widthOf(cell?.text ?? "", `${cell?.sev === "critical" || cell?.sev === "warning" ? 700 : 400} 13px ${FONT}`));
    });
    return Math.ceil(w) + padX * 2;
  });
  const width = colW.reduce((a, b) => a + b, 0);
  const titleW = title ? Math.ceil(widthOf(title, `600 13px ${FONT}`)) + padX * 2 : 0;
  const totalW = Math.max(width, titleW);
  const height = titleH + headH + rows.length * rowH + 1;
  const canvas = document.createElement("canvas");
  canvas.width = totalW * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, totalW, height);
  ctx.textBaseline = "middle";

  if (title) {
    ctx.fillStyle = "#231F20";
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(title, padX, titleH / 2);
  }
  // header
  ctx.fillStyle = "#231F20";
  ctx.fillRect(0, titleH, totalW, headH);
  let x = 0;
  columns.forEach((c, i) => {
    const left = c.align === "left";
    const tx = left ? x + padX : x + colW[i] / 2;
    ctx.textAlign = left ? "left" : "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(c.label, tx, titleH + (c.sub ? 16 : headH / 2));
    if (c.sub) {
      ctx.fillStyle = "#9AA1AA";
      ctx.font = `400 10px ${FONT}`;
      ctx.fillText(c.sub, tx, titleH + 33);
    }
    x += colW[i];
  });
  // body
  rows.forEach((r, ri) => {
    const y = titleH + headH + ri * rowH;
    ctx.fillStyle = "#E6E8EB";
    ctx.fillRect(0, y, totalW, 1);
    let cx = 0;
    columns.forEach((c, i) => {
      const cell = r.cells[i] || { text: "" };
      const style = SEV[cell.sev] || { bg: null, fg: "#334155", bold: false };
      const left = c.align === "left";
      if (style.bg) {
        ctx.fillStyle = style.bg;
        ctx.fillRect(cx + 1, y + 2, colW[i] - 2, rowH - 3);
      }
      ctx.fillStyle = style.fg;
      ctx.font = `${style.bold ? 700 : left ? 600 : 400} 13px ${FONT}`;
      ctx.textAlign = left ? "left" : "center";
      ctx.fillText(cell.text, left ? cx + padX : cx + colW[i] / 2, y + rowH / 2 + 1);
      cx += colW[i];
    });
  });
  return canvas;
}

// Resolves true when the PNG is on the clipboard; false when the browser can't do it (the caller then offers a download instead).
export async function copyTableImage(spec) {
  const canvas = drawTableCanvas(spec);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return true;
    } catch {
      /* permission denied / not a secure context -- fall through to the download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(spec.filename || "table").replace(/[^a-z0-9-]+/gi, "-")}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return false;
}
