// Simulates field sensors pushing live readings to the cloud API.
//   npm run sensor-demo            (server must be running)
const API = process.env.API || 'http://localhost:5000';
const KEY = process.env.SENSOR_KEY || 'sensor-demo-key';
const roads = ['R01', 'R04', 'R07', 'R16'];
async function push() {
  const roadId = roads[Math.floor(Math.random() * roads.length)];
  const speed = Math.round(8 + Math.random() * 45), vehicles = Math.round(20 + Math.random() * 120);
  try {
    const r = await fetch(API + '/api/sensors/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': KEY }, body: JSON.stringify({ roadId, speed, vehicles }) });
    console.log(`Sensor ${roadId}: ${speed} km/h, ${vehicles} vehicles ->`, (await r.json()).message || 'error');
  } catch (e) { console.log('Cannot reach server:', e.message); }
}
console.log('Sending sensor readings every 5 seconds. Press Ctrl+C to stop.');
setInterval(push, 5000); push();
