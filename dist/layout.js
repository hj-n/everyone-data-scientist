// Fit the two one-axis groups with one shared square card size.
export function fitCardGroups({ counts, width, height, headers, cardGap, sectionGap, portrait, minWidths = [0, 0] }) {
  let best = null;
  for (let a = 1; a <= counts[0]; a++) {
    for (let b = 1; b <= counts[1]; b++) {
      const columns = [a, b];
      // Share row tracks, allowing empty slots in the shorter group. Requiring
      // identical filled rows discards larger-card layouts for uneven counts.
      const sharedRows = Math.max(...counts.map((count, i) => Math.ceil(count / columns[i])));
      const rows = counts.map(() => sharedRows);
      const widthCap = portrait
        ? Math.min(...columns.map(column => (width - (column - 1) * cardGap) / column))
        : (width - sectionGap - (a + b - 2) * cardGap) / (a + b);
      const heightCap = portrait
        ? (height - headers[0] - headers[1] - sectionGap - (rows[0] + rows[1] - 2) * cardGap) / (rows[0] + rows[1])
        : Math.min(...rows.map((row, i) => (height - headers[i] - (row - 1) * cardGap) / row));
      const size = Math.floor(Math.min(widthCap, heightCap) + .00001);
      if (size < 1 || (!portrait && columns.some((column, i) => column * size + (column - 1) * cardGap < minWidths[i]))) continue;
      const area = (counts[0] + counts[1]) * size * size;
      const occupancy = (counts[0] + counts[1]) / (a * rows[0] + b * rows[1]);
      const score = area * (.98 + .02 * occupancy);
      if (!best || score > best.score) best = { columns, rows, sizes: [size, size], score, area };
    }
  }
  return best;
}

// Explore the inner column count of every big-grid column. All cards stay square.
export function fitFacetGrid({ counts, width, height, cardGap, cellGap, cellPadding, equalRowTracks = false, minHeights = [], minSize = 1 }) {
  const rowCount = counts.length;
  const columnCount = counts[0].length;
  const maximums = Array.from({ length: columnCount }, (_, c) => Math.max(1, ...counts.map(row => row[c])));
  let best = null;
  function visit(columns) {
    if (columns.length < columnCount) {
      for (let count = 1; count <= maximums[columns.length]; count++) visit([...columns, count]);
      return;
    }
    const rows = counts.map(row => Math.max(1, ...row.map((count, c) => Math.ceil(count / columns[c]))));
    if (equalRowTracks) rows.fill(Math.max(...rows));
    const totalColumns = columns.reduce((a, b) => a + b, 0);
    const totalRows = rows.reduce((a, b) => a + b, 0);
    const widthCap = (width - (columnCount - 1) * cellGap - columnCount * cellPadding * 2 - (totalColumns - columnCount) * cardGap) / totalColumns;
    const heightCap = (height - (rowCount - 1) * cellGap - rowCount * cellPadding * 2 - (totalRows - rowCount) * cardGap) / totalRows;
    let size = Math.floor(Math.min(widthCap, heightCap) + .00001);
    if (size < minSize) return;
    if (minHeights.length) {
      const fitsHeight = candidate => rows.reduce((sum, count, r) => sum + Math.max(count * candidate + (count - 1) * cardGap + 2 * cellPadding, minHeights[r] || 0), 0) + (rowCount - 1) * cellGap <= height;
      let low = minSize, high = size, fitted = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (fitsHeight(middle)) { fitted = middle; low = middle + 1; }
        else high = middle - 1;
      }
      size = fitted;
      if (size < minSize) return;
    }
    const totalPapers = counts.flat().reduce((a, b) => a + b, 0);
    const slots = totalColumns * totalRows;
    const score = size * size * totalPapers * (.98 + .02 * totalPapers / slots);
    if (!best || score > best.score) best = { size, columns, rows, score };
  }
  visit([]);
  if (!best) return null;
  return {
    ...best,
    widths: best.columns.map(count => count * best.size + (count - 1) * cardGap + 2 * cellPadding),
    heights: best.rows.map((count, r) => Math.max(count * best.size + (count - 1) * cardGap + 2 * cellPadding, minHeights[r] || 0)),
  };
}
