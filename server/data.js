// Road network definition + JSON-file persistence + realistic seed data.
// NOTE: all traffic data in this project is SIMULATED (demo purposes).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const FILE = path.join(__dirname, 'data', 'db.json');
let db = { users: [], incidents: [], advisories: [], signals: [] };
const id = () => crypto.randomBytes(5).toString('hex');
const save = () => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); };

// x,y are positions on the schematic map (1000 x 620)
const JUNCTIONS = [
  ['kukatpally', 'Kukatpally', 110, 110], ['begumpet', 'Begumpet', 400, 100], ['secunderabad', 'Secunderabad', 650, 90],
  ['uppal', 'Uppal', 900, 150], ['madhapur', 'Madhapur', 170, 290], ['ameerpet', 'Ameerpet', 400, 270],
  ['jubilee-hills', 'Jubilee Hills', 290, 400], ['banjara-hills', 'Banjara Hills', 520, 390], ['charminar', 'Charminar', 760, 380],
  ['lb-nagar', 'LB Nagar', 900, 510], ['gachibowli', 'Gachibowli', 110, 500], ['mehdipatnam', 'Mehdipatnam', 400, 520]
].map(([id, name, x, y]) => ({ id, name, x, y }));
const J = Object.fromEntries(JUNCTIONS.map((j) => [j.id, j]));

// from, to, name, speed limit km/h, lanes, load factor (how busy it gets)
const ROAD_DEFS = [
  ['kukatpally', 'begumpet', 'Kukatpally–Begumpet Road', 60, 3, 1.0], ['begumpet', 'secunderabad', 'Begumpet–Secunderabad Road', 50, 3, 1.1],
  ['secunderabad', 'uppal', 'Secunderabad–Uppal Road', 60, 3, 0.9], ['kukatpally', 'madhapur', 'Kukatpally–Madhapur Road', 60, 3, 1.15],
  ['begumpet', 'ameerpet', 'Begumpet–Ameerpet Road', 50, 3, 1.1], ['secunderabad', 'charminar', 'Secunderabad–Charminar Road', 50, 2, 1.0],
  ['madhapur', 'ameerpet', 'Madhapur–Ameerpet Road', 50, 3, 1.2], ['ameerpet', 'banjara-hills', 'Ameerpet–Banjara Hills Road', 40, 2, 1.1],
  ['madhapur', 'jubilee-hills', 'Madhapur–Jubilee Hills Road', 40, 2, 0.95], ['jubilee-hills', 'banjara-hills', 'Jubilee Hills–Banjara Hills Road', 40, 2, 1.0],
  ['ameerpet', 'jubilee-hills', 'Ameerpet–Jubilee Hills Link', 40, 2, 0.8], ['banjara-hills', 'charminar', 'Banjara Hills–Charminar Road', 40, 2, 1.1],
  ['charminar', 'uppal', 'Charminar–Uppal Road', 50, 3, 0.9], ['charminar', 'lb-nagar', 'Charminar–LB Nagar Road', 60, 3, 1.0],
  ['uppal', 'lb-nagar', 'Uppal–LB Nagar Ring Road', 80, 4, 0.85], ['madhapur', 'gachibowli', 'Madhapur–Gachibowli Road', 60, 4, 1.25],
  ['jubilee-hills', 'gachibowli', 'Jubilee Hills–Gachibowli Road', 50, 3, 0.9], ['jubilee-hills', 'mehdipatnam', 'Jubilee Hills–Mehdipatnam Road', 50, 3, 1.0],
  ['banjara-hills', 'mehdipatnam', 'Banjara Hills–Mehdipatnam Road', 40, 2, 1.0], ['mehdipatnam', 'charminar', 'Mehdipatnam–Charminar Road', 50, 3, 1.05],
  ['gachibowli', 'mehdipatnam', 'Gachibowli–Mehdipatnam Road', 60, 3, 0.95]
];
const ROADS = ROAD_DEFS.map(([a, b, name, limit, lanes, load], i) => ({
  id: 'R' + String(i + 1).padStart(2, '0'), from: a, to: b, name, limit, lanes, load,
  lengthKm: Math.max(1.5, Math.round(Math.hypot(J[a].x - J[b].x, J[a].y - J[b].y) * 0.011 * 10) / 10)
}));

const TYPES = ['Accident', 'Vehicle Breakdown', 'Road Work', 'Heavy Congestion', 'Waterlogging', 'Signal Failure', 'Procession / Event', 'Road Hazard'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Reported', 'Verified', 'In Progress', 'Resolved', 'Rejected'];

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const DESC = {
  'Accident': ['Two-vehicle collision blocking the left lane.', 'Bike skid reported, ambulance requested.', 'Minor collision, vehicles being moved to the roadside.'],
  'Vehicle Breakdown': ['Goods vehicle broken down in the middle lane.', 'Bus engine failure near the junction.', 'Car stalled on the carriageway.'],
  'Road Work': ['Pipeline repair work, one lane closed.', 'Resurfacing work in progress, expect slow traffic.', 'Metro pillar work, barricades in place.'],
  'Heavy Congestion': ['Slow-moving traffic due to heavy volume.', 'Long queue approaching the flyover.', 'Bottleneck at the merge point.'],
  'Waterlogging': ['Water accumulation after rain, vehicles moving slowly.', 'Drain overflow on the service road.'],
  'Signal Failure': ['Traffic signal not working, manual control needed.', 'Signal stuck on red for one direction.'],
  'Procession / Event': ['Public procession causing partial diversion.', 'Event traffic near the venue.'],
  'Road Hazard': ['Fallen tree branch on the road.', 'Large pothole causing slow-down.', 'Debris on the carriageway.']
};

function seed() {
  const rand = rng(7);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const hash = (p) => bcrypt.hashSync(p, 10);
  const now = Date.now(), MIN = 60000;

  db.users.push(
    { id: id(), name: 'Traffic Control Admin', email: 'admin@traffic.gov', password: hash('admin123'), role: 'admin' },
    { id: id(), name: 'Demo Citizen', email: 'citizen@traffic.com', password: hash('citizen123'), role: 'citizen' }
  );
  const citizens = ['Ravi Kumar', 'Lakshmi Devi', 'Suresh Babu', 'Anita Rao', 'Imran Khan', 'Pooja Sharma'];
  const reporters = citizens.concat(['Patrol Unit 7', 'Patrol Unit 12', 'Sensor Network']);

  // historical incidents for analytics (last 30 days)
  const hourPool = [7, 8, 8, 9, 9, 9, 10, 12, 13, 15, 16, 17, 17, 18, 18, 18, 19, 19, 20, 21, 22, 2, 5, 11, 14];
  for (let i = 0; i < 70; i++) {
    const type = pick(TYPES), road = pick(ROADS);
    const r = rand(); const severity = r < 0.35 ? 'Low' : r < 0.75 ? 'Medium' : r < 0.95 ? 'High' : 'Critical';
    const d = new Date(now - (1 + Math.floor(rand() * 30)) * 864e5); d.setHours(pick(hourPool), Math.floor(rand() * 60), 0, 0);
    const created = d.getTime(), mins = 20 + Math.floor(rand() * 220);
    const status = rand() < 0.07 ? 'Rejected' : 'Resolved';
    const who = pick(reporters);
    db.incidents.push({
      id: 'INC-' + (1000 + i), type, roadId: road.id, severity, description: pick(DESC[type]), reportedBy: who,
      source: who.startsWith('Patrol') ? 'Officer' : who === 'Sensor Network' ? 'Sensor' : 'Citizen', status,
      assignedUnit: status === 'Resolved' ? 'Patrol Unit ' + (1 + Math.floor(rand() * 15)) : '', etaMinutes: null,
      createdAt: new Date(created).toISOString(), updatedAt: new Date(created + mins * MIN).toISOString(),
      resolvedAt: status === 'Resolved' ? new Date(created + mins * MIN).toISOString() : null,
      timeline: [
        { t: new Date(created).toISOString(), by: who, text: 'Incident reported' },
        { t: new Date(created + 5 * MIN).toISOString(), by: 'Control Room', text: status === 'Rejected' ? 'Report could not be verified. Rejected.' : 'Verified and unit dispatched' },
        ...(status === 'Resolved' ? [{ t: new Date(created + mins * MIN).toISOString(), by: 'Control Room', text: 'Incident cleared. Traffic normal.' }] : [])
      ]
    });
  }
  // live / active incidents (what the dashboard shows right now)
  const roadId = (name) => ROADS.find((r) => r.name === name).id;
  const live = [
    ['Accident', 'Madhapur–Gachibowli Road', 'High', 'In Progress', 'Patrol Unit 12', 35, 'Three-vehicle pile-up, two lanes blocked. Tow truck on the way.', 'Patrol Unit 12', 42],
    ['Accident', 'Secunderabad–Uppal Road', 'Critical', 'In Progress', 'Patrol Unit 7', 60, 'Overturned goods truck. Road fully closed, diversion via Charminar.', 'Patrol Unit 7', 75],
    ['Road Work', 'Jubilee Hills–Mehdipatnam Road', 'Medium', 'Verified', 'GHMC Works Team', 240, 'Pipeline repair work, one lane closed until evening.', 'Control Room', 150],
    ['Waterlogging', 'Charminar–LB Nagar Road', 'High', 'Verified', 'Patrol Unit 3', 90, 'Water accumulation near the underpass. Avoid if possible.', 'Anita Rao', 25],
    ['Vehicle Breakdown', 'Begumpet–Ameerpet Road', 'Low', 'Reported', '', null, 'Bus broken down in the left lane near the metro station.', 'Ravi Kumar', 8],
    ['Signal Failure', 'Ameerpet–Banjara Hills Road', 'Medium', 'Reported', '', null, 'Signal not working at the Ameerpet junction, traffic is confused.', 'Suresh Babu', 4]
  ];
  live.forEach(([type, rname, severity, status, unit, eta, description, who, ago], i) => {
    const created = now - ago * MIN;
    db.incidents.push({
      id: 'INC-' + (1100 + i), type, roadId: roadId(rname), severity, description, reportedBy: who,
      source: who.startsWith('Patrol') || who === 'Control Room' ? 'Officer' : 'Citizen', status, assignedUnit: unit, etaMinutes: eta,
      createdAt: new Date(created).toISOString(), updatedAt: new Date(now - 2 * MIN).toISOString(), resolvedAt: null,
      timeline: [
        { t: new Date(created).toISOString(), by: who, text: 'Incident reported' },
        ...(status !== 'Reported' ? [{ t: new Date(created + 3 * MIN).toISOString(), by: 'Control Room', text: 'Verified by control room' }] : []),
        ...(status === 'In Progress' ? [{ t: new Date(created + 8 * MIN).toISOString(), by: 'Control Room', text: `${unit} dispatched to the location` }] : [])
      ]
    });
  });

  db.advisories.push(
    { id: id(), title: 'Diversion in force: Secunderabad–Uppal', message: 'Road closed due to an overturned truck. Use Charminar–Uppal Road as an alternative.', level: 'critical', createdBy: 'Traffic Control Admin', createdAt: new Date(now - 50 * MIN).toISOString(), expiresAt: null },
    { id: id(), title: 'Heavy rain forecast this evening', message: 'Expect waterlogging at low-lying areas. Plan your evening commute early.', level: 'warning', createdBy: 'Traffic Control Admin', createdAt: new Date(now - 120 * MIN).toISOString(), expiresAt: null },
    { id: id(), title: 'Metro work – night closures', message: 'Partial lane closures on Madhapur–Ameerpet Road between 11 PM and 5 AM this week.', level: 'info', createdBy: 'Traffic Control Admin', createdAt: new Date(now - 24 * 60 * MIN).toISOString(), expiresAt: null }
  );

  JUNCTIONS.forEach((j) => db.signals.push({
    junctionId: j.id, mode: rand() < 0.6 ? 'Adaptive' : 'Fixed', greenNS: 30 + Math.floor(rand() * 5) * 5, greenEW: 30 + Math.floor(rand() * 5) * 5, status: 'Normal'
  }));
  db.signals.find((s) => s.junctionId === 'ameerpet').status = 'Fault';
}

if (fs.existsSync(FILE)) db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
else { seed(); save(); }

module.exports = { get: () => db, save, id, JUNCTIONS, ROADS, J, TYPES, SEVERITIES, STATUSES };
