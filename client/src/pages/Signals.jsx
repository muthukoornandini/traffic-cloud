import React, { useState } from 'react';
import { api, usePoll } from '../api.js';
import { Modal } from '../components/ui.jsx';

function SignalModal({ s, onClose, onSaved }) {
  const [f, setF] = useState({ mode: s.mode, greenNS: s.greenNS, greenEW: s.greenEW, status: s.status });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try { await api('/signals/' + s.junctionId, 'PUT', f); onSaved(); onClose(); } catch (er) { setErr(er.message); }
  };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={save}>
        <h2>🚦 {s.junction} junction</h2>
        <label>Control mode<select value={f.mode} onChange={set('mode')}><option>Adaptive</option><option>Fixed</option><option>Manual</option></select></label>
        <label>Status<select value={f.status} onChange={set('status')}><option>Normal</option><option>Flashing</option><option>Fault</option></select></label>
        <div className="optrow">
          <label>Green N–S (s)<input type="number" value={f.greenNS} onChange={set('greenNS')} /></label>
          <label>Green E–W (s)<input type="number" value={f.greenEW} onChange={set('greenEW')} /></label>
        </div>
        <button type="button" className="btn sm ghost" onClick={() => setF({ ...f, greenNS: s.recommended.greenNS, greenEW: s.recommended.greenEW })}>
          Use recommended ({s.recommended.greenNS}s / {s.recommended.greenEW}s)
        </button>
        <p className="muted small">Adaptive mode automatically shifts green time towards the busier direction.</p>
        {err && <div className="error">{err}</div>}
        <button className="btn block">Save</button>
      </form>
    </Modal>
  );
}

export default function Signals({ user }) {
  const [list, , reload] = usePoll('/signals', 5000);
  const [edit, setEdit] = useState(null);
  if (!list) return <div className="card skeleton" />;
  const faults = list.filter((s) => s.status === 'Fault').length;
  return (
    <>
      <div className="kpis">
        <div className="kpi" style={{ '--c': '#16a34a' }}><div className="kpi-ic">🚦</div><div><span className="kpi-l">Signals online</span><b>{list.length - faults}/{list.length}</b></div></div>
        <div className="kpi" style={{ '--c': '#dc2626' }}><div className="kpi-ic">⚠️</div><div><span className="kpi-l">Faults</span><b>{faults}</b></div></div>
        <div className="kpi" style={{ '--c': '#2563eb' }}><div className="kpi-ic">🤖</div><div><span className="kpi-l">Adaptive junctions</span><b>{list.filter((s) => s.mode === 'Adaptive').length}</b></div></div>
      </div>
      <div className="card scroll">
        <table>
          <thead><tr><th>Junction</th><th>Mode</th><th>Green split (N–S | E–W)</th><th>Cycle</th><th>Approach load</th><th>Status</th>{user?.role === 'admin' && <th></th>}</tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.junctionId}>
                <td><b>{s.junction}</b></td><td><span className={'tag ' + (s.mode === 'Adaptive' ? '' : 'muted')}>{s.mode}</span></td>
                <td style={{ minWidth: 180 }}><div className="split"><u style={{ width: (s.greenNS / (s.greenNS + s.greenEW)) * 100 + '%' }}>{s.greenNS}s</u><i>{s.greenEW}s</i></div></td>
                <td>{s.cycle}s</td>
                <td className="small">N–S {s.recommended.congestionNS}% · E–W {s.recommended.congestionEW}%</td>
                <td><span className={'badge sg-' + s.status}>{s.status}</span></td>
                {user?.role === 'admin' && <td><button className="btn sm" onClick={() => setEdit(s)}>Configure</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <SignalModal s={edit} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
