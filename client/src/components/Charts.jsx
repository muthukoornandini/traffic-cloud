import React from 'react';

export function LineChart({ data, height = 150, color = '#2563eb', min, max, unit = '', fill = true }) {
  if (!data || data.length < 2) return <div className="muted small">Collecting data…</div>;
  const W = 600, H = height, P = { l: 36, r: 8, t: 8, b: 8 };
  const lo = min ?? Math.floor(Math.min(...data)), hi = max ?? Math.ceil(Math.max(...data)), rg = hi - lo || 1;
  const x = (i) => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / rg) * (H - P.t - P.b);
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
      {[0, 0.5, 1].map((f) => (
        <g key={f}><line x1={P.l} x2={W - P.r} y1={y(lo + rg * f)} y2={y(lo + rg * f)} stroke="#e5e9f2" />
          <text x={P.l - 6} y={y(lo + rg * f) + 4} fontSize="11" textAnchor="end" fill="#94a3b8">{Math.round(lo + rg * f)}{unit}</text></g>
      ))}
      {fill && <path d={`${d} L${x(data.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`} fill={color} opacity=".1" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="4.5" fill={color} />
    </svg>
  );
}

export function Sparkline({ data = [], color = '#2563eb', w = 90, h = 26 }) {
  if (data.length < 2) return null;
  const lo = Math.min(...data), hi = Math.max(...data), rg = hi - lo || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - lo) / rg) * (h - 6)}`).join(' ');
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" /></svg>;
}

// vertical bars (e.g. 24 hours); `highlight` = index to colour differently
export function BarChart({ data, height = 150, color = '#2563eb', highlight = -1, labelEvery = 1, unit = '' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bars-v" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="bv" title={`${d.label}: ${d.value}${unit}`}>
          <i style={{ height: `${(d.value / max) * (height - 34)}px`, background: i === highlight ? '#f59e0b' : color }} />
          <span>{i % labelEvery === 0 ? d.label : ''}</span>
        </div>
      ))}
    </div>
  );
}

export function HBars({ data, color = '#2563eb', colors }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d, i) => (
        <div className="hb" key={d.label}>
          <span className="hbl">{d.label}</span>
          <i><u style={{ width: `${(d.value / max) * 100}%`, background: colors ? colors[d.label] : color }} /></i>
          <b>{d.value}</b>
        </div>
      ))}
    </div>
  );
}
