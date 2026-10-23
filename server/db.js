// JSON-file database (no MongoDB/MySQL install needed). Seeds realistic sample data on first run.
// Sample city: Hyderabad (coordinates are approximate and for demonstration only).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const FILE = path.join(__dirname, 'data', 'db.json');
let db = { users: [], sensors: [], incidents: [], signals: [], audit: [] };
const id = () => crypto.randomBytes(6).toString('hex');

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

const TYPES = ['Accident', 'Breakdown', 'Road Work', 'Waterlogging', 'Signal Failure', 'Procession/Event', 'Road Hazard', 'Heavy Congestion'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Reported', 'Verified', 'In Progress', 'Resolved', 'Rejected'];
const UNITS = ['Traffic Police', 'Ambulance', 'Tow Truck', 'Municipal Corp', 'Fire Service'];

// [name, area, lat, lng, speed limit km/h, capacity vehicles/min, busy factor, road type]
const SENSORS = [
  ['Hitech City Junction', 'Madhapur', 17.4435, 78.3772, 50, 90, 1.2, 'Arterial'],
  ['Cyber Towers Circle', 'Madhapur', 17.4510, 78.3811, 40, 80, 1.15, 'Arterial'],
  ['Gachibowli Flyover', 'Gachibowli', 17.4401, 78.3489, 60, 110, 1.05, 'Flyover'],
  ['Kondapur Main Road', 'Kondapur', 17.4600, 78.3640, 50, 70, 0.95, 'Arterial'],
  ['Miyapur X Roads', 'Miyapur', 17.4968, 78.3547, 50, 85, 1.0, 'Junction'],
  ['KPHB Colony Road', 'Kukatpally', 17.4948, 78.3996, 40, 75, 1.0, 'Arterial'],
  ['Jubilee Hills Check Post', 'Jubilee Hills', 17.4326, 78.4071, 40, 70, 1.1, 'Junction'],
  ['Ameerpet Junction', 'Ameerpet', 17.4375, 78.4483, 40, 95, 1.25, 'Junction'],
  ['Punjagutta Circle', 'Punjagutta', 17.4256, 78.4510, 40, 90, 1.2, 'Junction'],
  ['Banjara Hills Road 12', 'Banjara Hills', 17.4180, 78.4380, 40, 65, 1.0, 'Arterial'],
  ['Begumpet Flyover', 'Begumpet', 17.4440, 78.4676, 60, 100, 1.0, 'Flyover'],
  ['Paradise Circle', 'Secunderabad', 17.4417, 78.4863, 40, 85, 1.1, 'Junction'],
  ['Secunderabad Station Road', 'Secunderabad', 17.4344, 78.5013, 40, 80, 1.05, 'Arterial'],
  ['Tarnaka Junction', 'Tarnaka', 17.4287, 78.5316, 40, 70, 0.95, 'Junction'],
  ['Uppal X Roads', 'Uppal', 17.4018, 78.5590, 50, 90, 1.1, 'Junction'],
  ['LB Nagar Circle', 'LB Nagar', 17.3457, 78.5522, 40, 90, 1.15, 'Junction'],
  ['Dilsukhnagar Junction', 'Dilsukhnagar', 17.3688, 78.5247, 40, 85, 1.2, 'Junction'],
  ['Charminar Road', 'Old City', 17.3616, 78.4747, 30, 60, 1.25, 'Local'],
  ['Nampally Station Road', 'Nampally', 17.3913, 78.4690, 40, 70, 1.1, 'Arterial'],
  ['Koti Crossroads', 'Koti', 17.3850, 78.4800, 40, 80, 1.2, 'Junction'],
  ['Lakdikapul Bridge', 'Lakdikapul', 17.4046, 78.4640, 40, 75, 1.1, 'Arterial'],
  ['Mehdipatnam Flyover', 'Mehdipatnam', 17.3948, 78.4400, 50, 95, 1.2, 'Flyover'],
  ['Tolichowki Junction', 'Tolichowki', 17.4035, 78.4140, 50, 80, 1.0, 'Junction'],
  ['ORR Narsingi Exit', 'Narsingi', 17.3860, 78.3590, 80, 120, 0.85, 'Expressway'],
  ['Airport Road, Shamshabad', 'Shamshabad', 17.2403, 78.4294, 80, 110, 0.7, 'Expressway'],
  ['Khairatabad Flyover', 'Khairatabad', 17.4125, 78.4614, 50, 90, 1.1, 'Flyover']
];

function seed() {
  const pw = (p) => bcrypt.hashSync(p, 10);
  db.users.push(
    { id: id(), name: 'Traffic Control Admin', email: 'admin@traffic.com', password: pw('admin123'), role: 'admin' },
    { id: id(), name: 'Demo Citizen', email: 'citizen@traffic.com', password: pw('citizen123'), role: 'citizen' }
  );
  SENSORS.forEach(([name, area, lat, lng, limit, capacity, busy, roadType], i) =>
    db.sensors.push({ id: 's' + String(i + 1).padStart(2, '0'), name, area, lat, lng, limit, capacity, busy, roadType }));

  const byName = (n) => db.sensors.find((s) => s.name.startsWith(n));
  const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
  let n = 1001;
  const I = (type, severity, title, description, sensor, dLat, dLng, status, minsAgo, assignedTo, source, reporter) => {
    const s = byName(sensor);
    const created = ago(minsAgo);
    const tl = [{ at: created, by: reporter, text: `Reported via ${source.toLowerCase()}` }];
    const step = (m, text, by) => tl.push({ at: ago(Math.max(minsAgo - m, 0)), by, text });
    if (['Verified', 'In Progress', 'Resolved'].includes(status)) step(4, 'Verified by traffic control', 'Traffic Control Admin');
    if (assignedTo) step(6, `Assigned to ${assignedTo}`, 'Traffic Control Admin');
    if (status === 'In Progress') step(10, 'Response team on site', assignedTo || 'Traffic Control Admin');
    if (status === 'Resolved') step(45, 'Incident cleared, traffic normal', 'Traffic Control Admin');
    db.incidents.push({
      id: 'INC-' + n++, type, severity, title, description, location: `Near ${s.name}, ${s.area}`,
      lat: +(s.lat + dLat).toFixed(5), lng: +(s.lng + dLng).toFixed(5), status, reportedBy: reporter, reporterId: null,
      source, createdAt: created, updatedAt: tl[tl.length - 1].at, assignedTo: assignedTo || '',
      resolvedAt: status === 'Resolved' ? tl[tl.length - 1].at : null, confirmations: [], confirmCount: status === 'Reported' ? 1 : 3, timeline: tl
    });
  };
  I('Accident', 'Critical', 'Multi-vehicle collision near Hitech City flyover', 'Three vehicles involved, two lanes blocked. Ambulance dispatched.', 'Hitech City', 0.0007, 0.0012, 'In Progress', 25, 'Ambulance', 'Citizen', 'Ravi K.');
  I('Road Work', 'Medium', 'Metro pillar work narrows carriageway', 'One lane closed for barricading. Expect slow movement towards Punjagutta.', 'Ameerpet', 0.0009, -0.0006, 'Verified', 300, 'Municipal Corp', 'Operator', 'Traffic Control');
  I('Waterlogging', 'High', 'Knee-deep water under Mehdipatnam flyover', 'Water stagnation after heavy rain; small vehicles advised to avoid.', 'Mehdipatnam', -0.0008, 0.0005, 'Verified', 70, 'Municipal Corp', 'Citizen', 'Sana M.');
  I('Signal Failure', 'Medium', 'Traffic signal not working at Punjagutta', 'All four arms blinking amber. Manual control by traffic police.', 'Punjagutta', 0.0002, -0.0003, 'In Progress', 40, 'Traffic Police', 'Operator', 'Traffic Control');
  I('Breakdown', 'Low', 'Bus broken down in the left lane', 'City bus stalled near the bus stop. Right lane free.', 'Uppal', -0.0010, 0.0008, 'Reported', 12, '', 'Citizen', 'Arjun R.');
  I('Procession/Event', 'Medium', 'Rally near Secunderabad Station, diversions in place', 'Procession moving towards the station. Use Paradise–Tarnaka route.', 'Secunderabad Station', 0.0006, 0.0010, 'Verified', 90, 'Traffic Police', 'Operator', 'Traffic Control');
  I('Road Hazard', 'Medium', 'Large pothole causing slowdowns', 'Deep pothole in the middle lane. Vehicles are swerving.', 'Tarnaka', -0.0005, -0.0009, 'Reported', 35, '', 'Citizen', 'Meera J.');
  I('Accident', 'Medium', 'Two-wheeler skid on ORR near Narsingi', 'Rider injured, shifted to hospital. Road cleared.', 'ORR Narsingi', 0.0010, 0.0007, 'Resolved', 180, 'Ambulance', 'Citizen', 'Karthik N.');
  I('Breakdown', 'Medium', 'Truck breakdown blocking a lane at LB Nagar', 'Heavy truck with a snapped axle. Tow truck requested.', 'LB Nagar', 0.0006, -0.0006, 'Verified', 55, 'Tow Truck', 'Citizen', 'Divya M.');
  I('Road Work', 'Low', 'Night resurfacing work on Kondapur stretch', 'Resurfacing between 10 PM and 5 AM. Minor delays.', 'Kondapur', -0.0007, 0.0004, 'Verified', 600, 'Municipal Corp', 'Operator', 'Traffic Control');
  I('Accident', 'Low', 'Minor fender-bender at Begumpet', 'No injuries. Vehicles moved to the side.', 'Begumpet', 0.0005, 0.0003, 'Resolved', 240, 'Traffic Police', 'Citizen', 'Vikram S.');
  I('Waterlogging', 'Medium', 'Water stagnation near KPHB', 'Cleared by the municipal team.', 'KPHB', -0.0004, 0.0009, 'Resolved', 500, 'Municipal Corp', 'Citizen', 'Priya R.');
  I('Road Hazard', 'High', 'Fallen tree branch on Road No. 12', 'Branch blocking the left lane. Please slow down.', 'Banjara Hills', 0.0006, 0.0005, 'Reported', 18, '', 'Citizen', 'Ananya I.');
  I('Heavy Congestion', 'High', 'Heavy congestion near Airport Road due to VIP movement', 'Temporary traffic hold. Expect 15 to 20 minute delays.', 'Airport Road', 0.0030, 0.0020, 'Verified', 20, 'Traffic Police', 'Operator', 'Traffic Control');

  ['Hitech City', 'Ameerpet', 'Punjagutta', 'Paradise', 'Begumpet', 'Uppal', 'LB Nagar', 'Koti', 'Mehdipatnam', 'Tarnaka'].forEach((n, i) => {
    const s = byName(n);
    db.signals.push({ id: 'sig-' + (i + 1), sensorId: s.id, name: s.name.replace(/ (Flyover|Road)$/, '') + ' Signal', mode: 'Auto', ns: 60, ew: 45, updatedAt: null });
  });
  db.audit.push({ id: id(), at: new Date().toISOString(), by: 'System', action: 'Sample data loaded' });
}

if (fs.existsSync(FILE)) db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
else { seed(); save(); }

module.exports = { get: () => db, save, id, TYPES, SEVERITIES, STATUSES, UNITS };
