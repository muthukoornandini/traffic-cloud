import { useCallback, useEffect, useState } from 'react';

export async function api(path, method = 'GET', body) {
  const token = localStorage.getItem('tc_token');
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// Fetches a path now and then every `ms` milliseconds (live data)
export function usePoll(path, ms = 5000) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api(path).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message)), [path]);
  useEffect(() => { setData(null); load(); const t = setInterval(load, ms); return () => clearInterval(t); }, [load, ms]);
  return [data, err, load];
}

export const LEVEL_COLOR = { Free: '#16a34a', Moderate: '#eab308', Heavy: '#f97316', Jam: '#dc2626', Closed: '#475569' };
export const SEV_COLOR = { Low: '#16a34a', Medium: '#eab308', High: '#f97316', Critical: '#dc2626' };
export const hhmm = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
export const timeAgo = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`;
};
export const fmtDT = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const get = () => window.location.hash.replace(/^#/, '') || '/';
export function useRoute() {
  const [r, setR] = useState(get);
  useEffect(() => {
    const f = () => { setR(get()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}
export const go = (p) => { window.location.hash = p; };
