import React, { useState } from 'react';
import { api } from '../api.js';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { onLogin(await api(`/auth/${mode}`, 'POST', form)); } catch (err) { setError(err.message); }
  };
  const fill = (email, password) => { setMode('login'); setForm({ ...form, email, password }); };
  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <div className="logo big"><span>🚦</span><div>Traffic<b>Cloud</b></div></div>
        <h2>Smart traffic management, in the cloud.</h2>
        <p>Monitor live road conditions, report incidents and plan the fastest route – all in one portal.</p>
        <ul><li>✔ Live congestion map with real-time updates</li><li>✔ Incident reporting &amp; control-room workflow</li><li>✔ Smart route planner &amp; adaptive signals</li><li>✔ Cloud sensor ingestion API</li></ul>
      </div>
      <form className="auth card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Sign in to the portal' : 'Create a citizen account'}</h2>
        {mode === 'register' && <input placeholder="Full name" value={form.name} onChange={set('name')} required />}
        <input type="email" placeholder="Email address" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={set('password')} required />
        {error && <div className="error">{error}</div>}
        <button className="btn block">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="muted center small">
          {mode === 'login' ? 'New citizen? ' : 'Already registered? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); }}>{mode === 'login' ? 'Register' : 'Sign in'}</a>
          {' · '}<a href="#/">Continue as guest</a>
        </p>
        <div className="hint"><b>Demo accounts</b> (click to fill)<br />
          <a href="#" onClick={(e) => { e.preventDefault(); fill('admin@traffic.gov', 'admin123'); }}>Control room admin</a> · admin@traffic.gov / admin123<br />
          <a href="#" onClick={(e) => { e.preventDefault(); fill('citizen@traffic.com', 'citizen123'); }}>Citizen</a> · citizen@traffic.com / citizen123</div>
      </form>
    </div>
  );
}
