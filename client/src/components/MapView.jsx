import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LEVEL_COLOR, TYPE_ICON } from './ui.jsx';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Live map: coloured circles = traffic sensors, pins = incidents. Map tiles © OpenStreetMap contributors (needs internet).
export default function MapView({ sensors = [], incidents = [], height = 440, showSensors = true, showIncidents = true,
  onSelectIncident, onPick, pick, focus, center = [17.41, 78.45], zoom = 11 }) {
  const el = useRef(null), map = useRef(null), sm = useRef({}), im = useRef({}), pm = useRef(null);
  const cb = useRef({}); cb.current = { onSelectIncident, onPick };

  useEffect(() => {
    const m = L.map(el.current).setView(center, zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
    m.on('click', (e) => cb.current.onPick && cb.current.onPick({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }));
    map.current = m;
    setTimeout(() => m.invalidateSize(), 150);
    return () => { m.remove(); map.current = null; sm.current = {}; im.current = {}; pm.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m) return;
    const seen = new Set();
    if (showSensors) sensors.forEach((s) => {
      seen.add(s.id);
      const html = `<b>${esc(s.name)}</b><br>${esc(s.area)}<br>Speed: <b>${s.speed} km/h</b> (limit ${s.limit})<br>${s.vehicles} vehicles/min · <b style="color:${LEVEL_COLOR[s.level]}">${s.level}</b>`;
      let mk = sm.current[s.id];
      if (!mk) { mk = L.circleMarker([s.lat, s.lng], { radius: 9, weight: 2, color: '#fff', fillOpacity: 0.95 }).addTo(m).bindPopup(html); sm.current[s.id] = mk; }
      mk.setStyle({ fillColor: LEVEL_COLOR[s.level] }); mk.setPopupContent(html);
    });
    Object.keys(sm.current).forEach((id) => { if (!seen.has(id)) { sm.current[id].remove(); delete sm.current[id]; } });
  }, [sensors, showSensors]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    const seen = new Set();
    if (showIncidents) incidents.forEach((i) => {
      seen.add(i.id);
      const sig = i.severity + i.type;
      let mk = im.current[i.id];
      const icon = () => L.divIcon({ className: '', html: `<div class="inc-pin sev-${i.severity.toLowerCase()}">${TYPE_ICON[i.type] || '⚠️'}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
      if (!mk) {
        mk = L.marker([i.lat, i.lng], { icon: icon(), zIndexOffset: 500 }).addTo(m);
        mk.on('click', () => cb.current.onSelectIncident && cb.current.onSelectIncident(i.id));
        mk.bindTooltip(esc(`${i.type}: ${i.title}`)); mk._sig = sig; im.current[i.id] = mk;
      } else if (mk._sig !== sig) { mk.setIcon(icon()); mk._sig = sig; }
    });
    Object.keys(im.current).forEach((id) => { if (!seen.has(id)) { im.current[id].remove(); delete im.current[id]; } });
  }, [incidents, showIncidents]);

  useEffect(() => { if (focus && map.current) map.current.flyTo([focus.lat, focus.lng], focus.zoom || 15); }, [focus && focus.ts]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    if (pm.current) { pm.current.remove(); pm.current = null; }
    if (pick) pm.current = L.marker([pick.lat, pick.lng], { icon: L.divIcon({ className: '', html: '<div class="pick-pin">📍</div>', iconSize: [30, 30], iconAnchor: [15, 28] }) }).addTo(m);
  }, [pick && pick.lat, pick && pick.lng]);

  return <div ref={el} className={'map ' + (onPick ? 'pickable' : '')} style={{ height }} />;
}
