import React, { useState } from 'react';
import { api, timeAgo, usePoll } from '../api.js';
import { Modal, SevBadge, StatusBadge } from '../components/ui.jsx';
import IncidentModal from '../components/IncidentModal.jsx';

function ReportForm({ net, meta, onClose, onDone }) {
  const [f, setF] = useState({ type: meta.types[0] || '', roadId: net.roads[0].id, severity: 'Medium', description: '' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await api('/incidents', 'POST', f); setOk(true); onDone(); } catch (er) { setErr(er.message); }
  };
  return (
    <Modal onClose={onClose}>
      {ok ? (
        <div className="center"><h2>✅ Report submitted</h2><p className="muted">Thank you! The control room will verify it shortly.</p><button className="btn" onClick={onClose}>Close</button></div>
      ) : (
        <form onSubmit={submit}>
          <h2>Report an incident</h2>
          <label>Incident type<select value={f.type} onChange={set('type')}>{meta.types.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Road<select value={f.roadId} onChange={set('roadId')}>{net.roads.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label>Severity<select value={f.severity} onChange={set('severity')}>{meta.severities.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>What happened?<textarea rows="3" placeholder="Describe the incident and exact location (landmark, direction)…" value={f.description} onChange={set('description')} required /></label>
          {err && <div className="error">{err}</div>}
          <button className="btn block">Submit report</button>
        </form>
      )}
    </Modal>
  );
}

export default function Incidents({ net, user, meta, needLogin }) {
  const [f, setF] = useState({ status: 'Active', severity: '', type: '' });
  const qs = new URLSearchParams({ ...(f.status === 'Active' ? { active: 1 } : f.status ? { status: f.status } : {}), ...(f.severity ? { severity: f.severity } : {}), ...(f.type ? { type: f.type } : {}) }).toString();
  const [list, , reload] = usePoll('/incidents?' + qs, 10000);
  const [open, setOpen] = useState(null);
  const [report, setReport] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  if (!net) return <div className="card skeleton" />;
  return (
    <>
      <div className="card row">
        <div><b>See something on the road?</b><div className="muted small">Citizens can report incidents. Reports are verified by the traffic control room.</div></div>
        <button className="btn" onClick={() => (user ? setReport(true) : needLogin())}>🚨 Report an incident</button>
      </div>
      <div className="card">
        <div className="toolbar">
          <select value={f.status} onChange={set('status')}><option value="Active">Active (open)</option><option value="">All statuses</option>{meta.statuses.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={f.severity} onChange={set('severity')}><option value="">Any severity</option>{meta.severities.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={f.type} onChange={set('type')}><option value="">Any type</option>{meta.types.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>ID</th><th>Incident</th><th>Road</th><th>Severity</th><th>Status</th><th>Reported</th></tr></thead>
            <tbody>
              {(list || []).map((i) => (
                <tr key={i.id} className="clickrow" onClick={() => setOpen(i.id)}>
                  <td className="nowrap">{i.id}</td><td><b>{i.type}</b><br /><span className="muted small">{i.description.slice(0, 70)}{i.description.length > 70 ? '…' : ''}</span></td>
                  <td>{i.roadName}</td><td><SevBadge s={i.severity} /></td><td><StatusBadge s={i.status} /></td><td className="nowrap">{timeAgo(i.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list && list.length === 0 && <p className="muted">No incidents match these filters.</p>}
        {list && list.length >= 200 && <p className="muted small">Showing the latest 200 incidents.</p>}
      </div>
      {open && <IncidentModal id={open} user={user} meta={meta} onClose={() => setOpen(null)} onChanged={reload} />}
      {report && <ReportForm net={net} meta={meta} onClose={() => setReport(false)} onDone={reload} />}
    </>
  );
}
