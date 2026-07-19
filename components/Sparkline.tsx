// Hand-drawn SVG bar sparkline — no chart library.

export default function Sparkline({
  data,
  width = 280,
  height = 56,
}: {
  data: { day: string; n: number }[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const gap = 3;
  const barW = (width - gap * (data.length - 1)) / data.length;

  return (
    <svg
      className="sparkline"
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Contributions over the last 14 days"
    >
      {data.map((d, i) => {
        const h = d.n === 0 ? 2 : Math.max(3, (d.n / max) * (height - 4));
        return (
          <rect
            key={d.day}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            rx={2}
            className={d.n === 0 ? 'spark-empty' : 'spark-bar'}
          />
        );
      })}
    </svg>
  );
}
