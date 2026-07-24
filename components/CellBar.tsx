// A contributor's accepted work, drawn as unug cells.
//
// The same vocabulary as the brand mark and the identicons: filled cells in
// the text colour, and the first one — the seed — in the accent. Every corpus
// starts from a single cell. Bar length is the ranking, so the list needs no
// podium to say who is ahead.

export default function CellBar({
  value,
  ghost = 0,
  max,
  cells = 28,
  label,
  animate = false,
}: {
  value: number;
  /** Work submitted but not yet through validation — drawn faint. */
  ghost?: number;
  max: number;
  cells?: number;
  label: string;
  animate?: boolean;
}) {
  const scale = Math.max(max, 1);
  // Anyone with work on the board gets at least one cell, so a contribution
  // is never rendered as nothing.
  const step = (n: number) => (n <= 0 ? 0 : Math.max(1, Math.round((n / scale) * cells)));
  const filled = step(value);
  const ghostEnd = Math.min(cells, Math.max(filled, step(value + ghost)));

  const cellClass = (i: number) => {
    if (i >= ghostEnd) return 'lb-cell';
    if (i >= filled) return 'lb-cell lb-cell-ghost';
    // The seed: every corpus starts from one cell.
    return i === 0 ? 'lb-cell lb-cell-seed' : 'lb-cell lb-cell-on';
  };

  return (
    <div className={`lb-cells${animate ? ' lb-cells--animate' : ''}`} role="img" aria-label={label}>
      {Array.from({ length: cells }, (_, i) => (
        <span
          key={i}
          className={cellClass(i)}
          style={animate ? { animationDelay: `${Math.min(i, 24) * 20}ms` } : undefined}
        />
      ))}
    </div>
  );
}
