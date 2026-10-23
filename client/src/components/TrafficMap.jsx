import React, { useMemo } from 'react';
import { LEVEL_COLOR, SEV_COLOR } from '../api.js';

// Schematic live traffic map – roads are coloured by current congestion level.
export default function TrafficMap({ junctions, roads, incidents = [], selected, onSelect, route, from, to }) {
  const J = useMemo(() => Object.fromEntries(junctions.map((j) => [j.id, j])), [junctions]);
  const routeSet = new Set(route ? route.roadIds : []);
  const R = Object.fromEntries(roads.map((r) => [r.id, r]));
  return (
    <svg viewBox="0 0 1000 620" className="map" role="img" aria-label="Live traffic map">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#dde3ec" strokeWidth="1" /></pattern>
      </defs>
      <rect width="1000" height="620" fill="#eef2f7" />
      <rect width="1000" height="620" fill="url(#grid)" />
      <rect x="560" y="185" width="130" height="85" rx="14" fill="#d9efd8" />
      <rect x="40" y="190" width="70" height="60" rx="10" fill="#d9efd8" />
      <path d="M620 430 q40 -30 90 -5 q40 25 70 55 q-40 55 -110 40 q-60 -15 -50 -90z" fill="#cfe6f7" />
      <text x="640" y="490" fontSize="13" fill="#7aa5c4">Hussain Sagar (sim)</text>
      {roads.map((r) => {
        const a = J[r.from], b = J[r.to], w = 5 + r.lanes * 2;
        const on = routeSet.has(r.id), sel = selected === r.id;
        return (
          <g key={r.id} className="road" onClick={() => onSelect && onSelect(r.id)}>
            {(on || sel) && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? '#2563eb' : '#0f172a'} strokeWidth={w + 14} strokeLinecap="round" opacity={on ? 0.28 : 0.18} />}
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={w + 5} strokeLinecap="round" />
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LEVEL_COLOR[r.level]} strokeWidth={w} strokeLinecap="round"
              strokeDasharray={r.closed ? '12 9' : undefined} className={r.level === 'Jam' ? 'blink' : ''} />
            {on && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth="3" strokeDasharray="1 12" strokeLinecap="round" className="flow" />}
            <title>{r.name} · {r.closed ? 'CLOSED' : `${r.speed} km/h (${r.level})`}</title>
          </g>
        );
      })}
      {junctions.map((j) => (
        <g key={j.id}>
          <circle cx={j.x} cy={j.y} r="10" fill="#fff" stroke="#0f172a" strokeWidth="3" />
          <text x={j.x} y={j.y + 27} textAnchor="middle" fontSize="14" fontWeight="600" className="jlabel">{j.name}</text>
        </g>
      ))}
      {incidents.map((i, k) => {
        const r = R[i.roadId]; if (!r) return null;
        const a = J[r.from], b = J[r.to];
        const t = 0.5 + ((k % 3) - 1) * 0.14;
        const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t - 18;
        return (
          <g key={i.id} className="imark" onClick={() => onSelect && onSelect(r.id)}>
            <circle cx={cx} cy={cy} r="12" fill={SEV_COLOR[i.severity]} stroke="#fff" strokeWidth="3" />
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">!</text>
            <title>{i.type} – {i.severity} – {i.roadName}</title>
          </g>
        );
      })}
      {[[from, 'A'], [to, 'B']].map(([id, l]) => id && J[id] && (
        <g key={l}><circle cx={J[id].x} cy={J[id].y - 28} r="14" fill="#2563eb" stroke="#fff" strokeWidth="3" />
          <text x={J[id].x} y={J[id].y - 23} textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">{l}</text></g>
      ))}
    </svg>
  );
}

export function Legend() {
  return (
    <div className="legend">
      {[['Free', 'Free flow'], ['Moderate', 'Moderate'], ['Heavy', 'Heavy'], ['Jam', 'Jam'], ['Closed', 'Closed']].map(([k, l]) => (
        <span key={k}><i style={{ background: LEVEL_COLOR[k] }} />{l}</span>
      ))}
      <span><i className="dot">!</i>Incident</span>
    </div>
  );
}
