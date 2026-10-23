import React, { useEffect, useState } from 'react';
import { api, go, hhmm, usePoll, useRoute } from './api.js';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Traffic from './pages/Traffic.jsx';
import Incidents from './pages/Incidents.jsx';
import RoutePlanner from './pages/RoutePlanner.jsx';
import Signals from './pages/Signals.jsx';
import Analytics from './pages/Analytics.jsx';
import Control from './pages/Control.jsx';

const NAV = [
  ['/', '📊', 'Dashboard'], ['/traffic', '🛣️', 'Live Traffic'], ['/incidents', '🚨', 'Incidents'],
  ['/route', '🧭', 'Route Planner'], ['/signals', '🚦', 'Signals'], ['/analytics', '📈', 'Analytics']
];

export default function App() {
  const route = useRoute();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('tc_user') || 'null'));
  const [meta, setMeta] = useState({ types: [], severities: [], statuses: [] });
  const [net, netErr] = usePoll('/network', 5000); // one shared live feed for the whole portal
  const [now, setNow] = useState(new Date());
  useEffect(() => { api('/meta').then(setMeta); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const login = ({ token, user }) => {
    localStorage.setItem('tc_token', token); localStorage.setItem('tc_user', JSON.stringify(user)); setUser(user);
    const next = sessionStorage.getItem('tc_next'); sessionStorage.removeItem('tc_next');
    go(user.role === 'admin' ? '/control' : next || '/');
  };
  const logout = () => { localStorage.removeItem('tc_token'); localStorage.removeItem('tc_user'); setUser(null); go('/'); };
  const needLogin = () => { sessionStorage.setItem('tc_next', route); go('/login'); };

  if (route === '/login') return <Auth onLogin={login} />;

  const nav = user?.role === 'admin' ? [...NAV, ['/control', '🛰️', 'Control Room']] : NAV;
  const title = (nav.find((n) => n[0] === route) || nav[0])[2];
  const common = { net, user, meta, needLogin };
  let page;
  if (route === '/traffic') page = <Traffic {...common} />;
  else if (route === '/incidents') page = <Incidents {...common} />;
  else if (route === '/route') page = <RoutePlanner {...common} />;
  else if (route === '/signals') page = <Signals {...common} />;
  else if (route === '/analytics') page = <Analytics {...common} />;
  else if (route === '/control') page = user?.role === 'admin' ? <Control {...common} /> : <Gate onLogin={needLogin} />;
  else page = <Dashboard {...common} />;

  return (
    <div className="shell">
      <aside className="side no-print">
        <a className="logo" href="#/"><span>🚦</span><div>Traffic<b>Cloud</b><small>Smart Traffic Management</small></div></a>
        <nav>
          {nav.map(([p, ic, l]) => (
            <a key={p} href={'#' + p} className={route === p || (p === '/' && !nav.some((n) => n[0] === route)) ? 'active' : ''}>
              <span>{ic}</span>{l}
              {p === '/incidents' && net && net.summary.activeIncidents > 0 && <em>{net.summary.activeIncidents}</em>}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          {user ? (
            <>
              <div className="uc"><div className="av">{user.name[0]}</div><div><b>{user.name}</b><small>{user.role === 'admin' ? 'Control room' : 'Citizen'}</small></div></div>
              <button className="btn sm ghost light" onClick={logout}>Logout</button>
            </>
          ) : <a className="btn sm block" href="#/login">Login / Sign up</a>}
        </div>
      </aside>
      <div className="main">
        <header className="top no-print">
          <h1>{title}</h1>
          <div className="top-r">
            {net?.simulatedHour !== null && net?.simulatedHour !== undefined && <span className="simbadge">⏱ Simulating {hhmm(net.simulatedHour)}</span>}
            <span className={'live ' + (netErr ? 'off' : '')}><i />{netErr ? 'OFFLINE' : 'LIVE'}</span>
            <span className="clock">{now.toLocaleTimeString('en-IN')} · {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </header>
        <main className="content">
          {netErr && !net && <div className="error">Cannot reach the server. Make sure the backend is running (npm start).</div>}
          {page}
        </main>
        <footer className="footer no-print">TrafficCloud · Cloud-Based Traffic Management System · All traffic data shown is simulated for demonstration.</footer>
      </div>
    </div>
  );
}

function Gate({ onLogin }) {
  return (
    <div className="card center gate"><h2>Control room access only</h2><p className="muted">Log in with an administrator account.</p><button className="btn" onClick={onLogin}>Login</button></div>
  );
}
