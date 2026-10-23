import React, { useEffect, useState } from 'react';
import { api, fmtDT, timeAgo } from '../api.js';
import { Modal, SevBadge, StatusBadge } from './ui.jsx';

export default function IncidentModal({ id, user, meta, onClose, onChanged }) {
  const [inc, setInc] = useState(null);
  const [form, setForm] = useState({ status: '', severity: '', assignedUnit: '', etaMinutes: '', note: '' });
  const [msg, setMsg] = useState(null);
  const load = () => api('/incidents/' + id).then((i) => {
    setInc(i); setForm({ status: i.status, severity: i.severity, assignedUnit: i.assignedUnit || '', etaMinutes: i.etaMinutes ?? '', note: '' });
  });
  useEffect(() => { load(); }, [id]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try { await api('/incidents/' + id, 'PUT', form); setMsg({ ok: true, text: 'Incident updated.' }); await load(); onChanged && onChanged(); }
    catch (er) { setMsg({ ok: false, text: er.message }); }
  };

  return (
    <Modal onClose={onClose} wide>
      {!inc ? <div className="muted">Loading…</div> : (
        <>
          <div className="row"><h2>{inc.type}</h2><span className="muted small">{inc.id}</span></div>
          <div className="meta"><SevBadge s={inc.severity} /><StatusBadge s={inc.status} /><span className="tag">📍 {inc.roadName}</span><span className="tag">Source: {inc.source}</span></div>
          <p>{inc.description}</p>
          <div className="muted small">Reported by {inc.reportedBy} · {timeAgo(inc.createdAt)}{inc.assignedUnit && <> · 🚓 {inc.assignedUnit}</>}{inc.etaMinutes ? <> · ⏱ clearance ~{inc.etaMinutes} min</> : null}</div>
          <h4>Timeline</h4>
          <ul className="tl">{inc.timeline.map((t, i) => (<li key={i}><b>{fmtDT(t.t)}</b> <span>{t.text}</span> <small className="muted">— {t.by}</small></li>))}</ul>
          {user?.role === 'admin' && (
            <form className="adminbox" onSubmit={save}>
              <h4>Control room actions</h4>
              <div className="formgrid">
                <label>Status<select value={form.status} onChange={set('status')}>{meta.statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
                <label>Severity<select value={form.severity} onChange={set('severity')}>{meta.severities.map((s) => <option key={s}>{s}</option>)}</select></label>
                <label>Assigned unit<input placeholder="e.g. Patrol Unit 5" value={form.assignedUnit} onChange={set('assignedUnit')} /></label>
                <label>Clearance ETA (min)<input type="number" min="0" value={form.etaMinutes} onChange={set('etaMinutes')} /></label>
              </div>
              <input placeholder="Add a note to the timeline (optional)" value={form.note} onChange={set('note')} />
              {form.severity === 'Critical' && form.status !== 'Resolved' && form.status !== 'Rejected' && form.status !== 'Reported' && (
                <div className="warnmsg">⚠ A verified Critical incident closes the road to traffic and re-routes the route planner.</div>
              )}
              {msg && <div className={msg.ok ? 'okmsg' : 'error'}>{msg.text}</div>}
              <button className="btn">Save changes</button>
            </form>
          )}
        </>
      )}
    </Modal>
  );
}
