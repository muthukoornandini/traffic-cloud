import React, { useEffect, useState } from 'react';
import { api, go, dateTime, timeAgo } from '../api.js';
import { Modal, SevBadge, StatusBadge, TYPE_ICON } from './ui.jsx';

export default function IncidentDetail({ id, user, onClose, onChange }) {
  const [i, setI] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = () => api('/incidents/' + id).then(setI).catch((e) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { load(); }, [id]);

  const confirm = async () => {
    try { setI(await api(`/incidents/${id}/confirm`, 'POST')); setMsg({ ok: true, text: 'Thanks! Your confirmation helps verify this incident.' }); onChange && onChange(); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  const viewMap = () => {
    sessionStorage.setItem('tc_focus', JSON.stringify({ lat: i.lat, lng: i.lng, ts: Date.now() }));
    onClose(); go('/map');
  };

  return (
    <Modal onClose={onClose} wide>
      {!i ? <p>{msg ? msg.text : 'Loading…'}</p> : (
        <>
          <div className="row"><h2>{TYPE_ICON[i.type]} {i.title}</h2></div>
          <div className="row left gap"><SevBadge s={i.severity} /><StatusBadge s={i.status} /><span className="muted small">{i.id} · {i.type}</span></div>
          <p>{i.description || <span className="muted">No description provided.</span>}</p>
          <div className="infogrid">
            <div><small>Location</small><b>{i.location}</b></div>
            <div><small>Reported</small><b>{timeAgo(i.createdAt)} by {i.reportedBy}</b></div>
            <div><small>Response unit</small><b>{i.assignedTo || 'Not assigned yet'}</b></div>
            <div><small>Community confirmations</small><b>👍 {i.confirmCount}</b></div>
          </div>
          <h4>Timeline</h4>
          <ul className="tl">{[...i.timeline].reverse().map((t, k) => (
            <li key={k}><b>{t.text}</b><span className="muted small"> · {t.by} · {dateTime(t.at)}</span></li>
          ))}</ul>
          {msg && <div className={msg.ok ? 'okmsg' : 'error'}>{msg.text}</div>}
          <div className="row left gap">
            <button className="btn" onClick={viewMap}>📍 View on map</button>
            {user?.role === 'citizen' && !['Resolved', 'Rejected'].includes(i.status) && <button className="btn ghost" onClick={confirm}>👍 I can confirm this</button>}
            {user?.role === 'admin' && <a className="btn ghost" href="#/admin" onClick={onClose}>Manage in console</a>}
          </div>
        </>
      )}
    </Modal>
  );
}
