import React, { useState } from 'react';
import { api } from '../api.js';
import { Modal, TYPE_ICON } from './ui.jsx';
import MapView from './MapView.jsx';

export default function ReportModal({ user, meta, onClose, onCreated, needLogin }) {
  const [form, setForm] = useState({ type: 'Accident', severity: 'Medium', title: '', description: '' });
  const [pick, setPick] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!user) return (
    <Modal onClose={onClose}>
      <h2>Report an incident</h2><p className="muted">Please log in to report an incident.</p>
      <button className="btn" onClick={() => { onClose(); needLogin(); }}>Login / Sign up</button>
    </Modal>
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!pick) { setErr('Click on the map to mark where it happened.'); return; }
    setBusy(true); setErr('');
    try { await api('/incidents', 'POST', { ...form, ...pick }); onCreated(); onClose(); }
    catch (er) { setErr(er.message); } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} wide>
      <h2>🚨 Report an incident</h2>
      <form onSubmit={submit}>
        <div className="formgrid">
          <label>Type<select value={form.type} onChange={set('type')}>{meta.types.map((t) => <option key={t} value={t}>{TYPE_ICON[t]} {t}</option>)}</select></label>
          <label>Severity<select value={form.severity} onChange={set('severity')}>{meta.severities.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        <input placeholder="Short title (e.g. Car broken down in right lane)" value={form.title} onChange={set('title')} required />
        <input placeholder="More details (optional)" value={form.description} onChange={set('description')} />
        <label>Location – click the map to drop a pin {pick && <b className="okmsg inline">✓ selected</b>}</label>
        <MapView height={260} onPick={setPick} pick={pick} showSensors={false} showIncidents={false} />
        {err && <div className="error">{err}</div>}
        <div className="row left gap">
          <button className="btn" disabled={busy}>{busy ? 'Submitting…' : 'Submit report'}</button>
          <span className="muted small">{user.role === 'admin' ? 'Reports from control staff are verified instantly.' : 'Citizen reports are verified by traffic control or by community confirmations.'}</span>
        </div>
      </form>
    </Modal>
  );
}
