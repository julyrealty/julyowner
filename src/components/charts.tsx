"use client";
// Tiny dependency-free SVG charts — fast, crisp, mobile-friendly.
import React from "react";

export function Donut({ a, b, size = 150, stroke = 22, colorA = "var(--teal)", colorB = "#9fd6d5" }: {
  a: number; b: number; size?: number; stroke?: number; colorA?: string; colorB?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = a + b || 1;
  const fracA = a / total;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Breakdown chart">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorB} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorA} strokeWidth={stroke}
        strokeDasharray={`${c * fracA} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function Sparkline({ data, width = 320, height = 84, color = "var(--teal)", fill = true }: {
  data: number[]; width?: number; height?: number; color?: string; fill?: boolean;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const nx = (i: number) => (i / (data.length - 1)) * (width - 8) + 4;
  const ny = (v: number) => height - 6 - ((v - min) / (max - min || 1)) * (height - 16);
  const d = data.map((v, i) => `${i ? "L" : "M"}${nx(i).toFixed(1)},${ny(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Trend chart">
      {fill && (
        <path d={`${d} L${nx(data.length - 1)},${height} L${nx(0)},${height} Z`} fill={color} opacity={0.09} />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={nx(data.length - 1)} cy={ny(data[data.length - 1])} r={3.4} fill={color} />
    </svg>
  );
}

export function CompareBars({ current, potential, height = 96 }: { current: number; potential: number; height?: number }) {
  const max = Math.max(current, potential) || 1;
  const h1 = (current / max) * (height - 8);
  const h2 = (potential / max) * (height - 8);
  return (
    <svg viewBox={`0 0 96 ${height}`} className="h-full" style={{ height }} role="img" aria-label="Current vs potential value">
      <defs>
        <linearGradient id="gbar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34b3a0" /><stop offset="100%" stopColor="#bfe8e0" />
        </linearGradient>
      </defs>
      <rect x={12} y={height - h1} width={28} height={h1} rx={5} fill="url(#gbar)" opacity={0.65} />
      <rect x={56} y={height - h2} width={28} height={h2} rx={5} fill="url(#gbar)" />
    </svg>
  );
}

export function Gauge({ value, max = 10, size = 120 }: { value: number; max?: number; size?: number }) {
  const frac = Math.min(1, Math.max(0, value / max));
  const angle = -180 + frac * 180;
  const color = frac < 0.4 ? "#22a06b" : frac < 0.7 ? "#d9a441" : "#e8604c";
  const r = size / 2 - 10;
  const cx = size / 2, cy = size / 2;
  const arc = (start: number, end: number, col: string, w: number) => {
    const s = (Math.PI / 180) * start, e = (Math.PI / 180) * end;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    return <path d={`M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}`} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} role="img" aria-label={`Risk gauge ${value}`}>
      {arc(-180, -120, "#22a06b", 9)}
      {arc(-114, -66, "#d9a441", 9)}
      {arc(-60, 0, "#e8604c", 9)}
      <line
        x1={cx} y1={cy} x2={cx + (r - 14) * Math.cos((Math.PI / 180) * angle)} y2={cy + (r - 14) * Math.sin((Math.PI / 180) * angle)}
        stroke="#10201f" strokeWidth={3} strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={4.5} fill="#10201f" />
      <text x={cx} y={cy - r + 2} textAnchor="middle" fontSize={11} fill="#6b7280"></text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontWeight={800} fontSize={20} fill={color} className="tabular">{value.toFixed(1)}</text>
    </svg>
  );
}

export function RangeSlider({ low, high, value }: { low: number; high: number; value: number }) {
  const f = Math.min(1, Math.max(0, (value - low) / (high - low || 1)));
  return (
    <div className="relative mt-2 h-6">
      <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-gray-200" />
      <div className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-[3px] border-teal bg-white shadow" style={{ left: `calc(${f * 100}% - 7px)` }} />
    </div>
  );
}
