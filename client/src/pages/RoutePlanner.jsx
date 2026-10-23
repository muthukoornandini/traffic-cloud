import React, { useState } from 'react';
import { api } from '../api.js';
import TrafficMap, { Legend } from '../components/TrafficMap.jsx';

export default function RoutePlanner({ net }) {
  const [from, setFrom] = useState('kukatpally');
  const [to, setTo] = useState('uppal');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  if (!net) return <div className="card skeleton" />;
  const J = Object.fromEntries(net.junctions.map((j) => [j.id, j.name]));
  const find = async () => {
    setErr(''); setRes(null);
    try { setRes(await api(`/route?from=${from}&to=${to}`)); } catch (e) { setErr(e.message); }
  };
  const swap = () => { setFrom(to); setTo(from); setRes(null); };
  const delay = res ? res.best.minutes - res.best.freeFlowMinutes : 0;

  return (
    <div className="dash-grid">
      <div className="card nopad">
        <div className="cardhead"><h3>Route on live map</h3></div>
        <TrafficMap junctions={net.junctions} roads={net.roads} route={res && res.best} from={res ? from : null} to={res ? to : null} />
        <Legend />
      </div>
      <div>
        <div className="card">
          <h3>Smart route planner</h3>
          <p className="muted small">Finds the fastest route using the live speed of every road. Closed roads are avoided automatically.</p>
          <label>From<select value={from} onChange={(e) => setFrom(e.target.value)}>{net.junctions.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></label>
          <button className="btn sm ghost swap" onClick={swap}>⇅ Swap</button>
          <label>To<select value={to} onChange={(e) => setTo(e.target.value)}>{net.junctions.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></label>
          <button className="btn block" onClick={find}>Find best route</button>
          {err && <div className="error">{err}</div>}
        </div>
        {res && (
          <div className="card">
            <div className="routebig"><div><b>{res.best.minutes}</b><span>min</span></div><div><b>{res.best.distanceKm}</b><span>km</span></div>
              <div className={delay > 3 ? 'late' : 'ok'}><b>{delay > 0 ? '+' + delay : '0'}</b><span>min delay</span></div></div>
            <div className="muted small">Free-flow time would be {res.best.freeFlowMinutes} min</div>
            <ol className="steps">{res.best.path.map((id, i) => <li key={id + i}>{J[id]}</li>)}</ol>
            {res.usualClosed && <div className="warnmsg">⚠ The usual shortest route is closed. This is the best open alternative.</div>}
            {res.usual && !res.usualClosed && <div className="okmsg">The usual route would take {res.usual.minutes} min right now. You save {Math.max(0, res.usual.minutes - res.best.minutes)} min.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
