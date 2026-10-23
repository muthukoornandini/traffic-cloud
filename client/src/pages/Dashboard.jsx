import React, { useState } from 'react';
import { usePoll, timeAgo } from '../api.js';
import TrafficMap, { Legend } from '../components/TrafficMap.jsx';
import { BarChart, LineChart } from '../components/Charts.jsx';
import { Kpi, LevelBadge, SevBadge, StatusBadge } from '../components/ui.jsx';
import IncidentModal from '../components/IncidentModal.jsx';
import { RoadModal } from './Traffic.jsx';

const ADV_ICON = { critical: '🛑', warning: '⚠️', info: 'ℹ️' };

export default function Dashboard({ net, user, meta }) {
  const [incs, , reloadInc] = usePoll('/incidents?active=1', 8000);
  const [road, setRoad] = useState(null);
  const [incId, setIncId] = useState(null);
  if (!net) return <div className="card skeleton" />;
  const { summary: s, roads, junctions, advisories } = net;
  const worst = roads.filter((r) => !r.closed).sort((a, b) => a.speed / a.limit - b.speed / b.limit).slice(0, 6);
  const active = (incs || []).filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected');
  const ci = s.congestionIndex;

  return (
    <>
      {advisories.map((a) => (
        <div key={a.id} className={'advisory ' + a.level}><span>{ADV_ICON[a.level]}</span><div><b>{a.title}</b> — {a.message}</div></div>
      ))}
      <div className="kpis">
        <Kpi icon="🚗" label="Avg network speed" value={`${s.avgSpeed} km/h`} sub="length-weighted" color="#2563eb" />
        <Kpi icon="🔥" label="Congestion index" value={`${ci}%`} sub={ci < 30 ? 'Smooth traffic' : ci < 50 ? 'Moderate load' : 'Heavy load'} color={ci < 30 ? '#16a34a' : ci < 50 ? '#eab308' : '#dc2626'} />
        <Kpi icon="🚨" label="Active incidents" value={s.activeIncidents} sub={`${s.closed} road(s) closed`} color="#f97316" />
        <Kpi icon="🛑" label="Heavy / jammed roads" value={s.heavy + s.jam} sub={`of ${roads.length} segments`} color="#dc2626" />
        <Kpi icon="🚙" label="Vehicles on network" value={s.vehicles.toLocaleString('en-IN')} sub="estimated" color="#7c3aed" />
      </div>

      <div className="dash-grid">
        <div className="card nopad">
          <div className="cardhead"><h3>Live traffic map</h3><span className="muted small">Click a road for details · updates every 5 s</span></div>
          <TrafficMap junctions={junctions} roads={roads} incidents={active} selected={road} onSelect={setRoad} />
          <Legend />
        </div>
        <div>
          <div className="card">
            <h3>Most congested roads</h3>
            {worst.map((r) => (
              <div className="listrow" key={r.id} onClick={() => setRoad(r.id)}>
                <div><b>{r.name}</b><div className="muted small">{r.vehicles} vehicles · limit {r.limit} km/h</div></div>
                <div className="right"><b>{r.speed}</b> <span className="muted small">km/h</span><br /><LevelBadge level={r.level} /></div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="row"><h3>Active incidents</h3><a href="#/incidents" className="small">View all →</a></div>
            {active.length === 0 && <p className="muted">No active incidents. 🎉</p>}
            {active.slice(0, 5).map((i) => (
              <div className="listrow" key={i.id} onClick={() => setIncId(i.id)}>
                <div><b>{i.type}</b><div className="muted small">{i.roadName} · {timeAgo(i.createdAt)}</div></div>
                <div className="right"><SevBadge s={i.severity} /><br /><StatusBadge s={i.status} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card"><h3>Network speed – last few minutes</h3><LineChart data={net.netHistory.map((h) => h.avgSpeed)} unit="" color="#2563eb" /><div className="muted small">Average speed (km/h)</div></div>
        <div className="card"><h3>Typical daily demand</h3>
          <BarChart data={net.demandProfile.map((v, h) => ({ label: String(h), value: v }))} highlight={Math.floor(net.hour)} labelEvery={3} unit="%" />
          <div className="muted small">Orange bar = current hour. Morning (9) and evening (18) peaks.</div></div>
      </div>
      {road && <RoadModal id={road} onClose={() => setRoad(null)} />}
      {incId && <IncidentModal id={incId} user={user} meta={meta} onClose={() => setIncId(null)} onChanged={reloadInc} />}
    </>
  );
}
