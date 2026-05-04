export default function ErrorTrend({ points }: { points: number[] }) {
  const width = 220;
  const height = 40;
  const max = Math.max(...points, 1);
  const d = points
    .map((p, i) => `${(i / Math.max(points.length - 1, 1)) * width},${height - (p / max) * (height - 4)}`)
    .join(' ');

  return (
    <svg width={width} height={height}>
      <polyline points={d} fill="none" stroke="var(--red)" strokeWidth={2} />
    </svg>
  );
}
