import React, { useState } from 'react';
import { LEVEL_COLOR, fmtDT, usePoll } from '../api.js';
import { LineChart, Sparkline, BarChart } from '../components/Charts.jsx';
import { LevelBadge, Modal, SevBadge, StatusBadge } from '../components/ui.jsx';

export function RoadModal({ id, onClose }) {
  const [r] = usePoll('/roads/' + id, 5000);
  return (
    <Modal onClose={onClose} wide>
      {!r ? <div className="muted">Loading…</div> : (
        <>
          <div className="row"><h2>{r.name}</h2><LevelBadge level={r.level} /></div>
          <div className="statgrid">
            <div><b>{r.closed ? '—' : r.speed}</b><span>Speed (km/h)</span></div>
            <div><b>{r.limit}</b><span>Speed limit</span></div>
            <div><b>{r.vehicles}</b><span>Vehicles</span></div>
            <div><b>{r.lanes}</b><span>Lanes</span></div>
            <div><b>{r.lengthKm}</b><span>Length (km)</span></div>
            <div><b>{r.source === 'sensor' ? '📡' : '🧮'}</b><span>{r.source === 'sensor' ? 'Live sensor' : 'Simulated'}</span></div>
          </div>
          {r.closed && <div className="error">This road is currently CLOSED due to a critical incident.</div>}
          <h4>Live speed (last updates)</h4>
          <LineChart data={r.history} min={0} max={r.limit} color={LEVEL_COLOR[r.level]} />
          <h4>Typical speed by hour of day</h4>
          <BarChart data={r.hourlyProfile.map((v, h) => ({ label: String(h), value: v }))} highlight={new Date().getHours()} labelEvery={3} height={120} unit=" km/h" />
          <h4>Recent incidents on this road</h4>
          {r.incidents.length === 0 && <p className="muted small">No incidents recorded.</p>}
          {r.incidents.map((i) => (
            <div className="listrow" key={i.id}><div><b>{i.type}</b><div className="muted small">{fmtDT(i.createdAt)} · {i.description}</div></div>
              <div className="right"><SevBadge s={i.severity} /><br /><StatusBadge s={i.status} /></div></div>
          ))}
          <h4>Sensors</h4>
          <div className="meta">{r.sensors.map((s) => <span key={s.id} className={'tag ' + (s.status === 'Offline' ? 'bad' : 'good')}>{s.id} · {s.status}</span>)}</div>
        </>
      )}
    </Modal>
  );
}

export default function Traffic({ net }) {
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('All');
  const [sort, setSort] = useState('worst');
  const [sel, setSel] = useState(null);
  if (!net) return <div className="card skeleton" />;
  const rows = net.roads.filter((r) => (level === 'All' || r.level === level) && r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'worst' ? a.speed / a.limit - b.speed / b.limit : sort === 'speed' ? b.speed - a.speed : a.name.localeCompare(b.name));
  const counts = ['Free', 'Moderate', 'Heavy', 'Jam', 'Closed'].map((l) => [l, net.roads.filter((r) => r.level === l).length]);
  return (
    <>
      <div className="chips">
        <button className={'chip ' + (level === 'All' ? 'active' : '')} onClick={() => setLevel('All')}>All ({net.roads.length})</button>
        {counts.map(([l, n]) => <button key={l} className={'chip ' + (level === l ? 'active' : '')} onClick={() => setLevel(l)}><i className="dotc" style={{ background: LEVEL_COLOR[l] }} />{l === 'Free' ? 'Free flow' : l} ({n})</button>)}
      </div>
      <div className="card">
        <div className="toolbar">
          <input placeholder="🔍 Search road name" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="worst">Most congested first</option><option value="speed">Fastest first</option><option value="name">Name A–Z</option></select>
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Road segment</th><th>Speed</th><th>Limit</th><th>Vehicles</th><th>Status</th><th>Trend</th><th>Incidents</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickrow" onClick={() => setSel(r.id)}>
                  <td><b>{r.name}</b><br /><span className="muted small">{r.id} · {r.lanes} lanes · {r.lengthKm} km{r.source === 'sensor' ? ' · 📡 sensor' : ''}</span></td>
                  <td className="nowrap"><b>{r.closed ? '—' : r.speed}</b> <span className="muted small">km/h</span>
                    <div className="meter"><u style={{ width: Math.min(100, (r.speed / r.limit) * 100) + '%', background: LEVEL_COLOR[r.level] }} /></div></td>
                  <td>{r.limit}</td><td>{r.vehicles}</td><td><LevelBadge level={r.level} /></td>
                  <td><Sparkline data={r.trend} color={LEVEL_COLOR[r.level]} /></td><td>{r.incidentCount || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="muted">No roads match.</p>}
      </div>
      {sel && <RoadModal id={sel} onClose={() => setSel(null)} />}
    </>
  );
}
