import React, { useState } from 'react';
import { api, hhmm, timeAgo, usePoll } from '../api.js';
import { Kpi, SevBadge, StatusBadge } from '../components/ui.jsx';
import IncidentModal from '../components/IncidentModal.jsx';

function Queue({ user, meta }) {
  const [list, , reload] = usePoll('/incidents?active=1', 5000);
  const [open, setOpen] = useState(null);
  const act = async (id, status) => { await api('/incidents/' + id, 'PUT', { status }); reload(); };
  const order = { Reported: 0, Verified: 1, 'In Progress': 2 };
  const rows = (list || []).slice().sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="card scroll">
      <table>
        <thead><tr><th>ID</th><th>Incident</th><th>Road</th><th>Severity</th><th>Status</th><th>Age</th><th>Quick actions</th></tr></thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id}>
              <td>{i.id}</td><td><b>{i.type}</b><br /><span className="muted small">{i.reportedBy} ({i.source})</span></td><td>{i.roadName}</td>
              <td><SevBadge s={i.severity} /></td><td><StatusBadge s={i.status} /></td><td className="nowrap">{timeAgo(i.createdAt)}</td>
              <td className="nowrap">
                {i.status === 'Reported' && <><button className="btn sm" onClick={() => act(i.id, 'Verified')}>Verify</button>{' '}<button className="btn sm danger" onClick={() => act(i.id, 'Rejected')}>Reject</button>{' '}</>}
                {i.status === 'Verified' && <><button className="btn sm" onClick={() => act(i.id, 'In Progress')}>Start</button>{' '}</>}
                {(i.status === 'Verified' || i.status === 'In Progress') && <><button className="btn sm good" onClick={() => act(i.id, 'Resolved')}>Resolve</button>{' '}</>}
                <button className="btn sm ghost" onClick={() => setOpen(i.id)}>Open</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list && rows.length === 0 && <p className="muted">The queue is empty. 🎉</p>}
      {open && <IncidentModal id={open} user={user} meta={meta} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

function Advisories() {
  const [list, , reload] = usePoll('/advisories', 15000);
  const [f, setF] = useState({ title: '', message: '', level: 'info', hours: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async (e) => {
    e.preventDefault(); setErr('');
    try { await api('/advisories', 'POST', f); setF({ title: '', message: '', level: 'info', hours: '' }); reload(); } catch (er) { setErr(er.message); }
  };
  return (
    <>
      <form className="card" onSubmit={add}>
        <h3>Broadcast a public advisory</h3>
        <div className="optrow"><input placeholder="Title" value={f.title} onChange={set('title')} required />
          <select value={f.level} onChange={set('level')}><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></div>
        <textarea rows="2" placeholder="Message shown on every citizen's dashboard" value={f.message} onChange={set('message')} required />
        <input type="number" min="0" placeholder="Auto-expire after hours (leave empty = until removed)" value={f.hours} onChange={set('hours')} />
        {err && <div className="error">{err}</div>}
        <button className="btn">Publish advisory</button>
      </form>
      <div className="card">
        <h3>Active advisories</h3>
        {(list || []).map((a) => (
          <div className={'advisory ' + a.level} key={a.id}><div><b>{a.title}</b> — {a.message}<div className="muted small">{timeAgo(a.createdAt)} · {a.createdBy}{a.expiresAt ? ' · expires ' + new Date(a.expiresAt).toLocaleString('en-IN') : ''}</div></div>
            <button className="btn sm danger" onClick={async () => { await api('/advisories/' + a.id, 'DELETE'); reload(); }}>Remove</button></div>
        ))}
        {list && list.length === 0 && <p className="muted">No active advisories.</p>}
      </div>
    </>
  );
}

function System({ net }) {
  const [sys] = usePoll('/admin/system', 5000);
  const [msg, setMsg] = useState('');
  const setHour = async (hour) => { await api('/admin/simulation', 'PUT', { hour }); setMsg(hour === null ? 'Using the real clock.' : `Simulating ${hhmm(hour)}. Traffic adjusts within ~15 seconds.`); };
  const presets = [['Real clock', null], ['Night 03:00', 3], ['Morning rush 09:00', 9], ['Midday 13:00', 13], ['Evening rush 18:00', 18], ['Late night 22:00', 22]];
  return (
    <>
      <div className="card">
        <h3>⏱ Traffic simulation (demo control)</h3>
        <p className="muted small">Traffic data is simulated. Choose a time of day to see how the network behaves at rush hour or at night.</p>
        <div className="chips">{presets.map(([l, h]) => <button key={l} className={'chip ' + ((net?.simulatedHour ?? null) === h ? 'active' : '')} onClick={() => setHour(h)}>{l}</button>)}</div>
        {msg && <div className="okmsg">{msg}</div>}
      </div>
      {sys && (
        <>
          <div className="kpis">
            <Kpi icon="🟢" label="System status" value={sys.status} color="#16a34a" />
            <Kpi icon="⏳" label="Uptime" value={`${Math.floor(sys.uptimeSec / 60)} min`} sub={`Node ${sys.node}`} />
            <Kpi icon="💾" label="Memory" value={`${sys.memoryMB} MB`} color="#7c3aed" />
            <Kpi icon="📡" label="Sensors online" value={`${sys.sensors.online}/${sys.sensors.total}`} color={sys.sensors.offline.length ? '#f97316' : '#16a34a'} />
            <Kpi icon="🔄" label="Data updates" value={sys.ticks} sub="every 5 s" color="#2563eb" />
          </div>
          <div className="two-col">
            <div className="card"><h3>☁️ Cloud sensor ingestion API</h3>
              <p className="muted small">Real IoT sensors / cameras can push live readings to the cloud. A reading overrides the simulation for that road for 90 seconds.</p>
              <pre className="code">{`POST /api/sensors/ingest
x-api-key: <your key>

{ "roadId": "R01", "speed": 18, "vehicles": 120 }`}</pre>
              <div className="muted small">Key: {sys.apiKeyHint}. Try it: <code>npm run sensor-demo</code></div></div>
            <div className="card"><h3>Offline sensors</h3>
              {sys.sensors.offline.length === 0 ? <p className="muted">All sensors online.</p> : sys.sensors.offline.map((s) => <div className="listrow" key={s.id}><div><b>{s.id}</b><div className="muted small">{s.road}</div></div><span className="badge sev-High">Offline</span></div>)}
              <div className="muted small">Records: {sys.incidents} incidents · {sys.users} users · {sys.advisories} advisories</div></div>
          </div>
        </>
      )}
    </>
  );
}

export default function Control({ net, user, meta }) {
  const [tab, setTab] = useState('queue');
  return (
    <>
      {net && (
        <div className="kpis">
          <Kpi icon="🚨" label="Open incidents" value={net.summary.activeIncidents} color="#f97316" />
          <Kpi icon="🛑" label="Roads closed" value={net.summary.closed} color="#475569" />
          <Kpi icon="🔥" label="Congestion index" value={net.summary.congestionIndex + '%'} color="#dc2626" />
        </div>
      )}
      <div className="chips">{[['queue', '🚨 Incident queue'], ['adv', '📢 Advisories'], ['sys', '🛰️ Simulation & system']].map(([k, l]) => (
        <button key={k} className={'chip ' + (tab === k ? 'active' : '')} onClick={() => setTab(k)}>{l}</button>))}</div>
      {tab === 'queue' && <Queue user={user} meta={meta} />}
      {tab === 'adv' && <Advisories />}
      {tab === 'sys' && <System net={net} />}
    </>
  );
}
