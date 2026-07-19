/* The Unkad mark.
   A "U" assembled from seven square cells — unug (cell, unit) building
   unkad (creation from nothing). The single accent-colored cell is the
   seed; when animated, the mark assembles outward from it, bottom-up.
   Cells are ordered by animation sequence: seed first. */

type Props = {
  size?: number;
  className?: string;
  animated?: boolean;
};

const CELLS: Array<{ x: number; y: number; seed?: boolean }> = [
  { x: 38, y: 70, seed: true }, // the seed — bottom center
  { x: 6, y: 70 },
  { x: 70, y: 70 },
  { x: 6, y: 38 },
  { x: 70, y: 38 },
  { x: 6, y: 6 },
  { x: 70, y: 6 },
];

export default function UnkadMark({ size = 20, className = '', animated = false }: Props) {
  return (
    <svg
      className={`mark${animated ? ' mark--animated' : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {CELLS.map((cell, i) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          className={cell.seed ? 'cell seed' : 'cell'}
          x={cell.x}
          y={cell.y}
          width={24}
          height={24}
          rx={6}
          style={animated ? { animationDelay: `${i * 90}ms` } : undefined}
        />
      ))}
    </svg>
  );
}
