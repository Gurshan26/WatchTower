interface Point {
  bucket: number;
  avg_value: number;
}

export default function Heatmap({ data }: { data: Point[] }) {
  const max = Math.max(...data.map((d) => d.avg_value), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, minmax(0, 1fr))', gap: 4 }}>
      {data.slice(-120).map((d) => {
        const intensity = d.avg_value / max;
        return (
          <div
            key={d.bucket}
            title={`${new Date(d.bucket).toLocaleTimeString()} - ${d.avg_value.toFixed(1)}ms`}
            style={{
              height: 14,
              borderRadius: 2,
              background: `rgba(245, 158, 11, ${0.12 + intensity * 0.7})`,
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          />
        );
      })}
    </div>
  );
}
