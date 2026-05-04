'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Point {
  bucket: number;
  avg_value: number;
  max_value: number;
  min_value: number;
}

export default function MetricChart({ data, color = '#06b6d4' }: { data: Point[]; color?: string }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.7} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="bucket"
            tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            stroke="#64748b"
            fontSize={11}
          />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #1e293b',
              borderRadius: 6,
              color: '#f0f6ff',
            }}
            formatter={(value: number) => value.toFixed(2)}
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
          />
          <Area type="monotone" dataKey="avg_value" stroke={color} fill="url(#colorMetric)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
