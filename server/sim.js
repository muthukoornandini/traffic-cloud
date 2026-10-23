// Traffic simulation engine. Produces live speed / density readings for every road segment,
// reacts to incidents and road closures, and accepts real sensor data via the ingest API.
const D = require('./data');

const ACTIVE = ['Reported', 'Verified', 'In Progress'];
const WEIGHT = { Low: 0.08, Medium: 0.18, High: 0.3, Critical: 0.5 };
let simHour = null; // null = use real clock
const state = { roads: {}, netHistory: [], tickCount: 0, lastTick: null, startedAt: Date.now() };

const g = (h, c, w) => Math.exp(-((h - c) ** 2) / (2 * w * w));
// demand over the day: morning peak ~9, evening peak ~18, small midday bump
const demand = (h) => Math.min(1, 0.18 + 0.62 * g(h, 9, 1.6) + 0.68 * g(h, 18, 1.8) + 0.25 * g(h, 13, 2.5));
const currentHour = () => { if (simHour !== null) return simHour; const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const speedFactor = (ratio) => 1 - 0.8 * Math.pow(Math.min(ratio, 1.1), 1.6);
const levelOf = (speed, limit, closed) => closed ? 'Closed' : speed / limit >= 0.75 ? 'Free' : speed / limit >= 0.5 ? 'Moderate' : speed / limit >= 0.3 ? 'Heavy' : 'Jam';

const incidentsOn = (rid) => D.get().incidents.filter((i) => i.roadId === rid && ACTIVE.includes(i.status));
const incidentLoad = (rid) => Math.min(0.6, incidentsOn(rid).reduce((s, i) => s + WEIGHT[i.severity] * (i.status === 'Reported' ? 0.5 : 1), 0));
const isClosed = (rid) => incidentsOn(rid).some((i) => i.severity === 'Critical' && i.status !== 'Reported');

function tick() {
  const h = currentHour();
  D.ROADS.forEach((road) => {
    const s = state.roads[road.id] || (state.roads[road.id] = { speed: road.limit * 0.7, vehicles: 0, ratio: 0, history: [] });
    const closed = isClosed(road.id);
    const ratio = Math.min(1.15, demand(h) * road.load + (Math.random() - 0.5) * 0.08 + incidentLoad(road.id));
    const target = Math.max(4, road.limit * speedFactor(ratio));
    s.closed = closed;
    if (s.override && s.override.until > Date.now()) {
      s.speed = s.override.speed; s.source = 'sensor';
      s.vehicles = s.override.vehicles ?? Math.round(Math.min(ratio, 1.1) * road.lanes * road.lengthKm * 38);
    } else {
      s.source = 'simulated';
      s.speed = closed ? 0 : state.tickCount < 40 ? target : s.speed * 0.6 + target * 0.4;
      s.vehicles = closed ? 0 : Math.round(Math.min(ratio, 1.1) * road.lanes * road.lengthKm * 38);
    }
    s.ratio = ratio; s.level = levelOf(s.speed, road.limit, closed); s.updatedAt = new Date().toISOString();
    s.history.push(Math.round(s.speed * 10) / 10); if (s.history.length > 60) s.history.shift();
  });
  const sm = summary();
  state.netHistory.push({ avgSpeed: sm.avgSpeed, congestionIndex: sm.congestionIndex }); if (state.netHistory.length > 60) state.netHistory.shift();
  adaptSignals();
  state.tickCount++; state.lastTick = new Date().toISOString();
}

function snapshotRoads() {
  return D.ROADS.map((r) => {
    const s = state.roads[r.id] || {};
    return { ...r, speed: Math.round((s.speed || 0) * 10) / 10, vehicles: s.vehicles || 0, level: s.level || 'Free', closed: !!s.closed,
      source: s.source || 'simulated', incidentCount: incidentsOn(r.id).length, trend: (s.history || []).slice(-15), updatedAt: s.updatedAt };
  });
}

function summary() {
  const roads = D.ROADS.map((r) => ({ r, s: state.roads[r.id] })).filter((x) => x.s);
  const open = roads.filter((x) => !x.s.closed);
  const len = open.reduce((a, x) => a + x.r.lengthKm, 0) || 1;
  const cnt = (lv) => roads.filter((x) => x.s.level === lv).length;
  return {
    avgSpeed: Math.round((open.reduce((a, x) => a + x.s.speed * x.r.lengthKm, 0) / len) * 10) / 10,
    congestionIndex: Math.round((100 * open.reduce((a, x) => a + (1 - Math.min(1, x.s.speed / x.r.limit)), 0)) / (open.length || 1)),
    vehicles: roads.reduce((a, x) => a + (x.s.vehicles || 0), 0),
    free: cnt('Free'), moderate: cnt('Moderate'), heavy: cnt('Heavy'), jam: cnt('Jam'), closed: cnt('Closed'),
    activeIncidents: D.get().incidents.filter((i) => ACTIVE.includes(i.status)).length
  };
}

const demandProfile = () => Array.from({ length: 24 }, (_, h) => Math.round(demand(h) * 100));
const hourlyProfile = (road) => Array.from({ length: 24 }, (_, h) => Math.round(road.limit * speedFactor(demand(h) * road.load)));

// ---- signal optimisation: recommend green split from congestion of vertical vs horizontal approaches
function recommend(sig) {
  const j = D.J[sig.junctionId]; let ns = 0, nsN = 0, ew = 0, ewN = 0;
  D.ROADS.filter((r) => r.from === j.id || r.to === j.id).forEach((r) => {
    const o = D.J[r.from === j.id ? r.to : r.from]; const s = state.roads[r.id];
    const c = s ? (s.closed ? 0.2 : 1 - Math.min(1, s.speed / r.limit)) : 0.3;
    if (Math.abs(o.y - j.y) > Math.abs(o.x - j.x)) { ns += c; nsN++; } else { ew += c; ewN++; }
  });
  const cNS = nsN ? ns / nsN : 0.3, cEW = ewN ? ew / ewN : 0.3, total = sig.greenNS + sig.greenEW;
  const share = (cNS + 0.1) / (cNS + cEW + 0.2);
  const rec = Math.min(total - 15, Math.max(15, Math.round((total * share) / 5) * 5));
  return { greenNS: rec, greenEW: total - rec, congestionNS: Math.round(cNS * 100), congestionEW: Math.round(cEW * 100) };
}
function adaptSignals() {
  D.get().signals.filter((s) => s.mode === 'Adaptive' && s.status === 'Normal').forEach((s) => {
    const r = recommend(s); const step = Math.sign(r.greenNS - s.greenNS) * Math.min(2, Math.abs(r.greenNS - s.greenNS));
    s.greenNS += step; s.greenEW -= step;
  });
}

// ---- routing (Dijkstra on current travel time)
function route(from, to, mode) {
  const cost = (r) => {
    if (mode !== 'freeflow' && state.roads[r.id]?.closed) return Infinity;
    return mode === 'freeflow' ? (r.lengthKm / r.limit) * 60 : (r.lengthKm / Math.max(4, state.roads[r.id]?.speed || r.limit)) * 60;
  };
  const dist = {}, prev = {}, done = {};
  D.JUNCTIONS.forEach((j) => { dist[j.id] = Infinity; }); dist[from] = 0;
  for (;;) {
    let u = null; D.JUNCTIONS.forEach((j) => { if (!done[j.id] && dist[j.id] < Infinity && (u === null || dist[j.id] < dist[u])) u = j.id; });
    if (u === null || u === to) break; done[u] = true;
    D.ROADS.filter((r) => r.from === u || r.to === u).forEach((r) => {
      const v = r.from === u ? r.to : r.from, c = cost(r);
      if (c < Infinity && dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = { u, road: r }; }
    });
  }
  if (dist[to] === Infinity) return null;
  const roads = [], path = [to];
  for (let v = to; v !== from; v = prev[v].u) { roads.unshift(prev[v].road); path.unshift(prev[v].u); }
  return { path, roadIds: roads.map((r) => r.id), distanceKm: Math.round(roads.reduce((a, r) => a + r.lengthKm, 0) * 10) / 10,
    minutes: Math.round(roads.reduce((a, r) => a + (r.lengthKm / Math.max(4, state.roads[r.id]?.speed || r.limit)) * 60, 0)),
    freeFlowMinutes: Math.round(roads.reduce((a, r) => a + (r.lengthKm / r.limit) * 60, 0)) };
}

function ingest(roadId, speed, vehicles) {
  const s = state.roads[roadId]; if (!s) return false;
  s.override = { speed, vehicles, until: Date.now() + 90000 };
  return true;
}
const setHour = (h) => { simHour = h; };
const getHour = () => simHour;

for (let i = 0; i < 45; i++) tick();
setInterval(tick, 5000).unref?.();

module.exports = { state, snapshotRoads, summary, demandProfile, hourlyProfile, recommend, route, ingest, setHour, getHour, currentHour, incidentsOn, ACTIVE };
