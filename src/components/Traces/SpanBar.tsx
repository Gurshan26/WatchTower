interface SpanBarProps {
  color: string;
  width: number;
  x: number;
  y: number;
  height: number;
  selected?: boolean;
  onClick?: () => void;
}

export default function SpanBar({ color, width, x, y, height, selected, onClick }: SpanBarProps) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={3}
      fill={color}
      fillOpacity={selected ? 1 : 0.8}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
}
