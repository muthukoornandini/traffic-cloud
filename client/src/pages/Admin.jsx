import React, { useEffect, useState } from 'react';
import { api, usePoll, dateTime, timeAgo } from '../api.js';
import { LevelBadge, SevBadge, StatusBadge, TYPE_ICON } from '../components/ui.jsx';
import ReportModal from '../components/ReportModal.jsx';

function SignalCard({ g, modes, onSave }) {
  const [mode, setMode] = useState(g.mode);
  const [ns, setNs] = useState(g.ns);
  const [ew, setEw] = useState(g.ew);
  useEffect(() => { setMode(g.mode); setNs(g.ns); setEw(g.ew); }, [g.mode, g.ns, g.ew]);
  return (
    <div className="card sigcard">
      <div className="row"><b>🚦 {g.name}</b>{g.level && <LevelBadge level={g.level} />}</div>
      <div className="muted small">Speed on approach: {g.speed ?? '–'} km/h{g.updatedAt && ` · changed ${timeAgo(g.updatedAt)}`}</div>
      {g.suggestion && <div className="suggest">💡 {g.suggestion}</div>}
      <div className="seg">{modes.map((m) => <button type="button" key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>)}</div>
      <div className="formgrid">
        <label>North–South green (s)<input type="number" min="10" max="120" value={ns} onChange={(e) => setNs(e.target.value)} /></label>
        <label>East–West green (s)<input type="number" min="10" max="120" value={ew} onChange={(e) => setEw(e.target.value)} /></label>
      </div>
      <button className="btn sm" onClick={() => onSave(g.id, { mode, ns, ew })}>Apply plan</button>
    </div>
  );
}

export default function Admin({ meta, user }) {
  const [tab, setTab] = useState('incidents');
  const [filter, setFilter] = useState('active');
  const [incidents, , reloadInc] = usePoll(`/incidents?status=${filter}`, 8000);
  const [signals, , reloadSig] = usePoll('/signals', 8000);
  const [sensors] = usePoll('/sensors', 5000);
  const [audit, , reloadAudit] = usePoll('/audit', 10000);
  const [msg, setMsg] = useState(null);
  const [report, setReport] = useState(false);

  const run = async (fn, ok) => {
    try { await fn(); setMsg(ok ? { ok: true, text: ok } : null); reloadInc(); reloadSig(); reloadAudit(); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  const update = (id, body) => run(() => api('/incidents/' + id, 'PUT', body), 'Incident updated.');

  return (
    <>
      <div className="row"><h1>Control Console</h1><button className="btn" onClick={() => setReport(true)}>+ Create incident</button></div>
      <div className="chips">
        {[['incidents', '🚨 Incident management'], ['signals', '🚦 Signal control'], ['sensors', '📡 Sensors'], ['audit', '📜 Audit log']].map(([k, l]) => (
          <button key={k} className={'chip ' + (tab === k ? 'active' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {msg && <div className={msg.ok ? 'okmsg' : 'error'}>{msg.text}</div>}

      {tab === 'incidents' && (
        <div className="card">
          <div className="toolbar">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="active">Active</option><option value="all">All</option>{meta.statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span className="muted small">Changes save instantly and are logged in the audit trail.</span>
          </div>
          <div className="scroll">
            <table>
              <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Response unit</th><th></th></tr></thead>
              <tbody>
                {(incidents || []).map((i) => (
                  <tr key={i.id}>
                    <td><b>{TYPE_ICON[i.type]} {i.title}</b><br /><span className="muted small">{i.id} · {i.location} · {timeAgo(i.createdAt)} · by {i.reportedBy}</span></td>
                    <td><select value={i.severity} onChange={(e) => update(i.id, { severity: e.target.value })}>{meta.severities.map((s) => <option key={s}>{s}</option>)}</select></td>
                    <td><select value={i.status} onChange={(e) => update(i.id, { status: e.target.value })}>{meta.statuses.map((s) => <option key={s}>{s}</option>)}</select></td>
                    <td><select value={i.assignedTo} onChange={(e) => update(i.id, { assignedTo: e.target.value })}><option value="">Unassigned</option>{meta.units.map((u) => <option key={u}>{u}</option>)}</select></td>
                    <td className="nowrap">
                      <button className="btn sm ghost dark" onClick={() => { const n = window.prompt('Add a note to the incident timeline:'); if (n) update(i.id, { note: n }); }}>Note</button>{' '}
                      <button className="btn sm danger" onClick={() => window.confirm('Delete this incident?') && run(() => api('/incidents/' + i.id, 'DELETE'), 'Incident deleted.')}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {incidents && incidents.length === 0 && <p className="muted">No incidents for this filter.</p>}
        </div>
      )}

      {tab === 'signals' && (
        <div className="siggrid">
          {(signals || []).map((g) => <SignalCard key={g.id} g={g} modes={meta.modes} onSave={(id, b) => run(() => api('/signals/' + id, 'PUT', b), `Signal plan applied for ${g.name}.`)} />)}
        </div>
      )}

      {tab === 'sensors' && (
        <div className="card scroll">
          <table>
            <thead><tr><th>Sensor</th><th>Area</th><th>Type</th><th>Speed</th><th>Vehicles/min</th><th>Status</th></tr></thead>
            <tbody>{(sensors || []).map((s) => (
              <tr key={s.id}><td><b>{s.name}</b></td><td>{s.area}</td><td>{s.roadType}</td>
                <td>{s.speed} / {s.limit} km/h</td><td>{s.vehicles}</td><td><LevelBadge level={s.level} /></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card">
          {(audit || []).map((a) => <div className="auditrow" key={a.id}><span className="muted small">{dateTime(a.at)}</span><b>{a.by}</b><span>{a.action}</span></div>)}
        </div>
      )}
      {report && <ReportModal user={user} meta={meta} onClose={() => setReport(false)} onCreated={() => { reloadInc(); reloadAudit(); }} needLogin={() => {}} />}
    </>
  );
}
