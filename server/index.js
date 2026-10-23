const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const D = require('./data');
const sim = require('./sim');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'trafficcloud-dev-secret-change-me';
const SENSOR_KEY = process.env.SENSOR_KEY || 'sensor-demo-key';

app.use(cors());
app.use(express.json());

// ---------- helpers ----------
const sign = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name }, SECRET, { expiresIn: '8h' });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
function auth(req, res, next) {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); next(); }
  catch { res.status(401).json({ error: 'Please log in to continue.' }); }
}
const adminOnly = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Control room access only.' }));
const roadById = (id) => D.ROADS.find((r) => r.id === id);
const withRoad = (i) => ({ ...i, roadName: roadById(i.roadId)?.name || 'Unknown road' });
const activeAdvisories = () => D.get().advisories.filter((a) => !a.expiresAt || a.expiresAt > new Date().toISOString())
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const nowISO = () => new Date().toISOString();

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'TrafficCloud', uptimeSec: Math.round(process.uptime()) }));

// ---------- auth ----------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email and a password (6+ chars) are required.' });
  const db = D.get();
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'Email already registered.' });
  const user = { id: D.id(), name, email, password: bcrypt.hashSync(password, 10), role: 'citizen' };
  db.users.push(user); D.save();
  res.json({ token: sign(user), user: publicUser(user) });
});
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = D.get().users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password)) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json({ token: sign(user), user: publicUser(user) });
});

// ---------- live network ----------
app.get('/api/meta', (_, res) => res.json({ types: D.TYPES, severities: D.SEVERITIES, statuses: D.STATUSES }));

app.get('/api/network', (_, res) => res.json({
  updatedAt: sim.state.lastTick, hour: Math.round(sim.currentHour() * 100) / 100, simulatedHour: sim.getHour(),
  junctions: D.JUNCTIONS, roads: sim.snapshotRoads(), summary: sim.summary(), advisories: activeAdvisories(),
  demandProfile: sim.demandProfile(), netHistory: sim.state.netHistory
}));

app.get('/api/roads/:id', (req, res) => {
  const road = roadById(req.params.id);
  if (!road) return res.status(404).json({ error: 'Road not found.' });
  const s = sim.state.roads[road.id];
  res.json({
    ...sim.snapshotRoads().find((r) => r.id === road.id), history: s.history, hourlyProfile: sim.hourlyProfile(road),
    incidents: D.get().incidents.filter((i) => i.roadId === road.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(withRoad),
    sensors: [1, 2].map((n) => ({ id: `SN-${road.id}-${n}`, status: (road.id.charCodeAt(2) + n) % 11 === 0 ? 'Offline' : 'Online' }))
  });
});

app.get('/api/route', (req, res) => {
  const { from, to } = req.query;
  if (!D.J[from] || !D.J[to] || from === to) return res.status(400).json({ error: 'Choose two different locations.' });
  const best = sim.route(from, to, 'live');
  if (!best) return res.status(404).json({ error: 'No open route found between these locations.' });
  const usual = sim.route(from, to, 'freeflow');
  const usualClosed = usual ? usual.roadIds.some((id) => sim.state.roads[id]?.closed) : false;
  const differs = usual && usual.roadIds.join() !== best.roadIds.join();
  res.json({ best, usual: differs ? { ...usual, minutes: usualClosed ? null : usual.minutes } : null, usualClosed });
});

// ---------- incidents ----------
app.get('/api/incidents', (req, res) => {
  const { status, severity, type, roadId, active } = req.query;
  let list = D.get().incidents.slice();
  if (status) list = list.filter((i) => i.status === status);
  if (severity) list = list.filter((i) => i.severity === severity);
  if (type) list = list.filter((i) => i.type === type);
  if (roadId) list = list.filter((i) => i.roadId === roadId);
  if (active) list = list.filter((i) => sim.ACTIVE.includes(i.status));
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list.slice(0, 200).map(withRoad));
});
app.get('/api/incidents/:id', (req, res) => {
  const i = D.get().incidents.find((x) => x.id === req.params.id);
  i ? res.json(withRoad(i)) : res.status(404).json({ error: 'Incident not found.' });
});

const recentReports = {}; // simple anti-spam: 5 reports per 10 minutes per citizen
app.post('/api/incidents', auth, (req, res) => {
  const { type, roadId, severity, description } = req.body;
  if (!D.TYPES.includes(type)) return res.status(400).json({ error: 'Choose an incident type.' });
  if (!roadById(roadId)) return res.status(400).json({ error: 'Choose the road where it happened.' });
  if (!D.SEVERITIES.includes(severity)) return res.status(400).json({ error: 'Choose a severity.' });
  if ((description || '').trim().length < 10) return res.status(400).json({ error: 'Please describe the incident (at least 10 characters).' });
  if (req.user.role !== 'admin') {
    const t = Date.now(); recentReports[req.user.id] = (recentReports[req.user.id] || []).filter((x) => t - x < 600000);
    if (recentReports[req.user.id].length >= 5) return res.status(429).json({ error: 'Too many reports. Please wait a few minutes.' });
    recentReports[req.user.id].push(t);
  }
  const db = D.get(); const admin = req.user.role === 'admin';
  const inc = {
    id: 'INC-' + (1000 + db.incidents.length), type, roadId, severity, description: description.trim().slice(0, 500),
    reportedBy: req.user.name, source: admin ? 'Officer' : 'Citizen', status: admin ? 'Verified' : 'Reported', assignedUnit: '', etaMinutes: null,
    createdAt: nowISO(), updatedAt: nowISO(), resolvedAt: null,
    timeline: [{ t: nowISO(), by: req.user.name, text: 'Incident reported' }, ...(admin ? [{ t: nowISO(), by: req.user.name, text: 'Verified by control room' }] : [])]
  };
  db.incidents.push(inc); D.save();
  res.json(withRoad(inc));
});

app.put('/api/incidents/:id', auth, adminOnly, (req, res) => {
  const inc = D.get().incidents.find((x) => x.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'Incident not found.' });
  const { status, severity, assignedUnit, etaMinutes, note } = req.body;
  const log = (text) => inc.timeline.push({ t: nowISO(), by: req.user.name, text });
  if (status && status !== inc.status) {
    if (!D.STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    inc.status = status; log(`Status changed to ${status}`);
    if (status === 'Resolved') { inc.resolvedAt = nowISO(); log('Incident cleared. Traffic returning to normal.'); }
  }
  if (severity && severity !== inc.severity) { if (!D.SEVERITIES.includes(severity)) return res.status(400).json({ error: 'Invalid severity.' }); inc.severity = severity; log(`Severity changed to ${severity}`); }
  if (assignedUnit !== undefined && assignedUnit !== inc.assignedUnit) { inc.assignedUnit = String(assignedUnit).slice(0, 60); if (inc.assignedUnit) log(`${inc.assignedUnit} assigned`); }
  if (etaMinutes !== undefined) inc.etaMinutes = etaMinutes === '' || etaMinutes === null ? null : Number(etaMinutes);
  if (note && note.trim()) log(note.trim().slice(0, 300));
  inc.updatedAt = nowISO(); D.save();
  res.json(withRoad(inc));
});

// ---------- advisories ----------
app.get('/api/advisories', (_, res) => res.json(activeAdvisories()));
app.post('/api/advisories', auth, adminOnly, (req, res) => {
  const { title, message, level, hours } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' });
  const a = { id: D.id(), title, message, level: ['info', 'warning', 'critical'].includes(level) ? level : 'info', createdBy: req.user.name, createdAt: nowISO(),
    expiresAt: Number(hours) > 0 ? new Date(Date.now() + Number(hours) * 3600000).toISOString() : null };
  D.get().advisories.push(a); D.save(); res.json(a);
});
app.delete('/api/advisories/:id', auth, adminOnly, (req, res) => {
  D.get().advisories = D.get().advisories.filter((a) => a.id !== req.params.id); D.save(); res.json({ ok: true });
});

// ---------- signals ----------
app.get('/api/signals', (_, res) => res.json(D.get().signals.map((s) => ({
  ...s, junction: D.J[s.junctionId].name, cycle: s.greenNS + s.greenEW + 10, recommended: sim.recommend(s)
}))));
app.put('/api/signals/:junctionId', auth, adminOnly, (req, res) => {
  const s = D.get().signals.find((x) => x.junctionId === req.params.junctionId);
  if (!s) return res.status(404).json({ error: 'Junction not found.' });
  const { mode, greenNS, greenEW, status } = req.body;
  if (mode) { if (!['Adaptive', 'Fixed', 'Manual'].includes(mode)) return res.status(400).json({ error: 'Invalid mode.' }); s.mode = mode; }
  if (status) { if (!['Normal', 'Flashing', 'Fault'].includes(status)) return res.status(400).json({ error: 'Invalid status.' }); s.status = status; }
  for (const [k, v] of [['greenNS', greenNS], ['greenEW', greenEW]]) {
    if (v === undefined) continue;
    const n = parseInt(v); if (!(n >= 10 && n <= 120)) return res.status(400).json({ error: 'Green time must be between 10 and 120 seconds.' });
    s[k] = n;
  }
  D.save(); res.json({ ok: true });
});

// ---------- analytics ----------
app.get('/api/analytics', (_, res) => {
  const inc = D.get().incidents;
  const countBy = (keys, fn) => keys.map((k) => ({ label: k, value: inc.filter((i) => fn(i) === k).length }));
  const resolved = inc.filter((i) => i.resolvedAt);
  const avgRes = resolved.length ? Math.round(resolved.reduce((s, i) => s + (Date.parse(i.resolvedAt) - Date.parse(i.createdAt)) / 60000, 0) / resolved.length) : 0;
  const byRoad = {}; inc.forEach((i) => { byRoad[i.roadId] = (byRoad[i.roadId] || 0) + 1; });
  const daily = Array.from({ length: 14 }, (_, k) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - k)); const key = d.toISOString().slice(0, 10);
    return { label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: inc.filter((i) => new Date(i.createdAt).toISOString().slice(0, 10) === key).length };
  });
  res.json({
    total: inc.length, active: inc.filter((i) => sim.ACTIVE.includes(i.status)).length, resolved: resolved.length, avgResolutionMinutes: avgRes,
    byType: countBy(D.TYPES, (i) => i.type), bySeverity: countBy(D.SEVERITIES, (i) => i.severity),
    byHour: Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: inc.filter((i) => new Date(i.createdAt).getHours() === h).length })),
    daily, hotspots: Object.entries(byRoad).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => ({ name: roadById(id).name, value: n })),
    demandProfile: sim.demandProfile()
  });
});

// ---------- cloud sensor ingestion + admin ----------
app.post('/api/sensors/ingest', (req, res) => {
  if (req.headers['x-api-key'] !== SENSOR_KEY) return res.status(401).json({ error: 'Invalid sensor API key.' });
  const { roadId, speed, vehicles } = req.body;
  if (!(Number(speed) >= 0 && Number(speed) <= 200)) return res.status(400).json({ error: 'speed must be between 0 and 200 km/h.' });
  if (!sim.ingest(roadId, Number(speed), vehicles === undefined ? undefined : Number(vehicles))) return res.status(404).json({ error: 'Unknown roadId.' });
  res.json({ ok: true, message: 'Reading accepted. Live for 90 seconds.' });
});

app.put('/api/admin/simulation', auth, adminOnly, (req, res) => {
  const { hour } = req.body;
  if (hour === null || hour === 'auto') sim.setHour(null);
  else { const h = Number(hour); if (!(h >= 0 && h < 24)) return res.status(400).json({ error: 'Hour must be between 0 and 23.' }); sim.setHour(h); }
  res.json({ ok: true, simulatedHour: sim.getHour() });
});

app.get('/api/admin/system', auth, adminOnly, (_, res) => {
  const db = D.get();
  const sensors = D.ROADS.flatMap((r) => [1, 2].map((n) => ({ id: `SN-${r.id}-${n}`, road: r.name, status: (r.id.charCodeAt(2) + n) % 11 === 0 ? 'Offline' : 'Online' })));
  res.json({
    status: 'Operational', node: process.version, uptimeSec: Math.round(process.uptime()), memoryMB: Math.round(process.memoryUsage().rss / 1048576),
    lastTick: sim.state.lastTick, ticks: sim.state.tickCount, users: db.users.length, incidents: db.incidents.length, advisories: db.advisories.length,
    sensors: { total: sensors.length, online: sensors.filter((s) => s.status === 'Online').length, offline: sensors.filter((s) => s.status === 'Offline') },
    ingestEndpoint: 'POST /api/sensors/ingest', apiKeyHint: SENSOR_KEY === 'sensor-demo-key' ? 'sensor-demo-key (default – change via SENSOR_KEY)' : 'custom key set'
  });
});

// ---------- serve React build ----------
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_, res) => res.sendFile(path.join(dist, 'index.html')));
} else app.get('/', (_, res) => res.send('API running. Build the client first: npm run build --prefix client'));

app.listen(PORT, () => console.log(`TrafficCloud running at http://localhost:${PORT}`));
