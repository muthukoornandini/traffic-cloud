import React, { useEffect, useMemo, useState } from 'react';
import { usePoll, clock } from '../api.js';
import { LevelBadge, LEVEL_COLOR, TYPE_ICON, SEV_COLOR } from '../components/ui.jsx';
import MapView from '../components/MapView.jsx';
import IncidentDetail from '../components/IncidentDetail.jsx';

export default function LiveMap({ user }) {
  const [sensors] = usePoll('/sensors', 5000);
  const [incidents, , reload] = usePoll('/incidents?status=active', 10000);
  const [showS, setShowS] = useState(true);
  const [showI, setShowI] = useState(true);
  const [lvl, setLvl] = useState('All');
  const [focus, setFocus] = useState(null);
  const [sel, setSel] = useState(null);

  useEffect(() => {  // jump to an incident chosen elsewhere ("View on map")
    const f = sessionStorage.getItem('tc_focus');
    if (f) { setFocus(JSON.parse(f)); sessionStorage.removeItem('tc_focus'); }
  }, []);

  const shown = useMemo(() => (sensors || []).filter((s) => lvl === 'All' || s.level === lvl), [sensors, lvl]);
  const list = [...shown].sort((a, b) => b.ratio - a.ratio);

  return (
    <>
      <div className="row"><h1>Live Map</h1><span className="live"><i /> LIVE{sensors && sensors[0] ? ' · ' + clock(sensors[0].updatedAt) : ''}</span></div>
      <div className="mapgrid">
        <div className="card nopad">
          <MapView sensors={shown} incidents={incidents || []} height={620} showSensors={showS} showIncidents={showI} onSelectIncident={setSel} focus={focus} />
        </div>
        <div className="card side">
          <h3>Layers</h3>
          <label className="inl"><input type="checkbox" checked={showS} onChange={(e) => setShowS(e.target.checked)} /> Traffic sensors</label>
          <label className="inl"><input type="checkbox" checked={showI} onChange={(e) => setShowI(e.target.checked)} /> Active incidents ({(incidents || []).length})</label>
          <h3>Filter by congestion</h3>
          <div className="chips">{['All', 'Free', 'Moderate', 'Heavy', 'Severe'].map((l) => (
            <button key={l} className={'chip ' + (lvl === l ? 'active' : '')} onClick={() => setLvl(l)}>{l}</button>))}</div>
          <h3>Roads ({list.length})</h3>
          <div className="sidelist">
            {list.map((s) => (
              <div className="srow" key={s.id} onClick={() => setFocus({ lat: s.lat, lng: s.lng, zoom: 15, ts: Date.now() })}>
                <i className="dot" style={{ background: LEVEL_COLOR[s.level] }} />
                <div className="grow"><b>{s.name}</b><div className="muted small">{s.speed} km/h · {s.vehicles} veh/min</div></div>
                <LevelBadge level={s.level} />
              </div>
            ))}
          </div>
          <h3>Legend</h3>
          <div className="legend wrap">{Object.entries(SEV_COLOR).map(([k, c]) => <span key={k}><i className="sq" style={{ background: c }} />{k} incident</span>)}</div>
          <div className="muted small">Incident types: {Object.entries(TYPE_ICON).map(([k, v]) => `${v} ${k}`).join(' · ')}</div>
        </div>
      </div>
      {sel && <IncidentDetail id={sel} user={user} onClose={() => setSel(null)} onChange={reload} />}
    </>
  );
}
