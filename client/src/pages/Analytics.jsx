import React from 'react';
import { usePoll, SEV_COLOR } from '../api.js';
import { BarChart, HBars } from '../components/Charts.jsx';
import { Kpi } from '../components/ui.jsx';

export default function Analytics() {
  const [a] = usePoll('/analytics', 30000);
  if (!a) return <div className="card skeleton" />;
  const h = Math.floor(a.byHour.reduce((m, d, i) => (d.value > a.byHour[m].value ? i : m), 0));
  return (
    <>
      <div className="kpis">
        <Kpi icon="🗂️" label="Total incidents" value={a.total} sub="all time (30-day history)" />
        <Kpi icon="🚨" label="Active now" value={a.active} color="#f97316" />
        <Kpi icon="✅" label="Resolved" value={a.resolved} color="#16a34a" />
        <Kpi icon="⏱️" label="Avg resolution time" value={`${a.avgResolutionMinutes} min`} color="#7c3aed" />
        <Kpi icon="🕒" label="Peak incident hour" value={`${String(h).padStart(2, '0')}:00`} color="#dc2626" />
      </div>
      <div className="two-col">
        <div className="card"><h3>Incidents by type</h3><HBars data={a.byType} /></div>
        <div className="card"><h3>Incidents by severity</h3><HBars data={a.bySeverity} colors={SEV_COLOR} />
          <h3>Incident hotspots</h3><HBars data={a.hotspots.map((x) => ({ label: x.name.replace(' Road', ''), value: x.value }))} color="#f97316" /></div>
      </div>
      <div className="two-col">
        <div className="card"><h3>Incidents by hour of day</h3><BarChart data={a.byHour} highlight={h} labelEvery={3} color="#2563eb" /><div className="muted small">Most incidents occur during the morning and evening rush.</div></div>
        <div className="card"><h3>Incidents – last 14 days</h3><BarChart data={a.daily} labelEvery={2} color="#7c3aed" /></div>
      </div>
    </>
  );
}
