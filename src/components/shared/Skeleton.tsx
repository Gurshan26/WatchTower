export default function Skeleton({ height = 16 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        width: '100%',
        borderRadius: 4,
        background: 'linear-gradient(90deg, #111827, #1c2333, #111827)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.2s linear infinite',
      }}
    />
  );
}
