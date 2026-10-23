import React, { useEffect } from 'react';

export const LevelBadge = ({ level }) => <span className={'badge lv-' + level}>{level === 'Free' ? 'Free flow' : level}</span>;
export const SevBadge = ({ s }) => <span className={'badge sev-' + s}>{s}</span>;
export const StatusBadge = ({ s }) => <span className={'badge st-' + s.replace(' ', '')}>{s}</span>;

export function Kpi({ icon, label, value, sub, color = '#2563eb' }) {
  return (
    <div className="kpi" style={{ '--c': color }}>
      <div className="kpi-ic">{icon}</div>
      <div><span className="kpi-l">{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>
    </div>
  );
}

export function Modal({ onClose, children, wide }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={'modal ' + (wide ? 'wide' : '')} onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
}
