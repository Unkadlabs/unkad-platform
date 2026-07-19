// Unug identicon: a deterministic 5×5 cell-grid avatar derived from the
// contributor's id. Columns are mirrored for symmetry; exactly one filled
// cell becomes the teal seed. The brand story — cells building the corpus —
// on every contributor.

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export default function UnugAvatar({ seed, size = 32 }: { seed: string; size?: number }) {
  const h1 = fnv1a(seed);
  const h2 = fnv1a(seed + 'unkad');

  // 15 bits decide the left 3 columns (5 rows × 3 cols); mirror to 5 cols.
  const cells: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const bit = (h1 >> (row * 3 + col)) & 1;
      if (bit) {
        cells.push({ x: col, y: row });
        if (col < 2) cells.push({ x: 4 - col, y: row });
      }
    }
  }
  // Guarantee a non-empty grid.
  if (cells.length === 0) cells.push({ x: 2, y: 2 });

  const seedIndex = h2 % cells.length;
  const unit = 100 / 5;
  const pad = 2.5;
  const cellSize = unit - pad * 2;

  return (
    <svg
      className="avatar"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {cells.map((cell, i) => (
        <rect
          key={`${cell.x}-${cell.y}-${i}`}
          x={cell.x * unit + pad}
          y={cell.y * unit + pad}
          width={cellSize}
          height={cellSize}
          rx={3.5}
          className={i === seedIndex ? 'a-seed' : 'a-cell'}
        />
      ))}
    </svg>
  );
}
