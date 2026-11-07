// Where the cards of a table go. The biggest 5:7 card for which all of them fit in the free area (the screen minus
// `edge`), in rows of equal size that are centered one by one. Pure math, no DOM: scripts/grid.test.mjs checks it.
export const ASPECT = 5 / 7; // card width / height
export const GAP = 14;
export const MAX_W = 300; // widest a card gets on a big screen

// Returns one { x, y, w, h } per card, in reading order (left to right, then the next row).
export function fitGrid(n, W, H, edge) {
  const areaW = W - 2 * edge.side;
  const areaH = H - edge.top - edge.bottom;
  let best = { w: 0, cols: 1 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const w = Math.min((areaW - GAP * (cols - 1)) / cols, ((areaH - GAP * (rows - 1)) / rows) * ASPECT, MAX_W);
    if (w > best.w + 0.5) best = { w, cols };
  }
  const { w, cols } = best;
  const h = w / ASPECT;
  const rows = Math.ceil(n / cols);
  const top = edge.top + (areaH - (rows * h + (rows - 1) * GAP)) / 2;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const rowW = inRow * w + (inRow - 1) * GAP;
    return { x: (W - rowW) / 2 + (i % cols) * (w + GAP), y: top + r * (h + GAP), w, h };
  });
}
