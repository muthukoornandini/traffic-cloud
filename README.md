# 🚦 TrafficCloud – Cloud-Based Traffic Management System

A professional portal to **monitor live traffic information and manage incidents**.
Full-stack and cloud-ready.

| Layer    | Tech                                                       |
|----------|------------------------------------------------------------|
| Frontend | HTML, CSS, JavaScript, **React.js** (Vite), SVG live map   |
| Backend  | **Node.js + Express** REST API, JWT auth, bcrypt           |
| Storage  | JSON-file database (no DB install) – seeded demo data      |
| Cloud    | Docker, health-check, stateless API, sensor-ingestion API  |

> **Important:** all traffic readings are **simulated** (a built-in engine models morning/evening rush hours,
> incidents and closures). Real sensors can push live data through the ingestion API (see below).

## Run on your laptop (Windows / Mac / Linux)
Requires **Node.js 18+** (https://nodejs.org).
```bash
cd traffic-cloud
cd server
npm install
npm start
```
Open **http://localhost:5000** (the React app is already built in `client/dist`).

### Demo logins
- Control room admin: `admin@traffic.gov` / `admin123`
- Citizen: `citizen@traffic.com` / `citizen123`
- Guests can view the live dashboard, traffic, incidents, route planner, signals and analytics without logging in.

### Demo tip
Log in as admin → **Control Room → Simulation & system** → choose *Morning rush 09:00* to watch the whole network turn
orange/red within ~15 seconds. Choose *Night 03:00* and it clears up.

## Features
**Public / citizen portal**
- **Dashboard** – KPIs (average speed, congestion index, active incidents, vehicles), live colour-coded map, most congested roads, active incidents, speed trend, daily demand pattern, public advisories
- **Live Traffic** – all 21 road segments with speed, density, status, trend sparkline; click for live chart, typical speed by hour, incidents and sensor health
- **Incidents** – filter by status / severity / type; citizens can **report incidents** (anti-spam limit); full timeline for each incident
- **Route Planner** – fastest route using live speeds (Dijkstra); automatically avoids closed roads; shows delay vs. free-flow and time saved
- **Signals** – status of 12 junction signals, green-time split and approach load
- **Analytics** – incidents by type / severity / hour / day, hotspots, average resolution time

**Control room (admin)**
- **Incident queue** – verify / reject / start / resolve, assign units, set clearance ETA, add notes. A verified **Critical** incident **closes the road** automatically
- **Advisories** – broadcast public alerts (info / warning / critical, optional expiry)
- **Signals** – configure mode (Adaptive / Fixed / Manual), green times, fault status; *Adaptive* mode automatically shifts green time to the busier direction
- **Simulation & system** – pick the time of day for demos, system health, sensor status

**Cloud features**
- **Sensor ingestion API** – IoT sensors/cameras push readings to the cloud:
  ```
  POST /api/sensors/ingest      header: x-api-key: sensor-demo-key
  { "roadId": "R01", "speed": 18, "vehicles": 120 }
  ```
  Try it: run the server, then in another terminal `cd server && npm run sensor-demo`
  (set `SENSOR_KEY` env var to change the key)
- Stateless JWT API, `/api/health` endpoint, Docker image with health-check, live polling every 5 s

## Development mode (edit React code)
Terminal 1: `cd server && npm install && npm start`
Terminal 2: `cd client && npm install && npm run dev` → http://localhost:5173
Rebuild for production after changes: `cd client && npm run build`
Reset data: stop the server and delete `server/data/`.

## Deploy to the cloud
```bash
docker build -t trafficcloud .
docker run -p 5000:5000 -e JWT_SECRET=your-secret -e SENSOR_KEY=your-key trafficcloud
```
Render.com (free): push to GitHub → New Web Service → Runtime: Docker → set `JWT_SECRET`, `SENSOR_KEY`.
(Free tiers reset local files; use a managed database for permanent data.)

## Project structure
```
traffic-cloud/
├── Dockerfile
├── server/
│   ├── index.js         REST API (auth, network, incidents, advisories, signals, analytics, ingest)
│   ├── sim.js           traffic simulation, signal optimisation, routing
│   ├── data.js          road network, JSON store, seed data
│   └── sensor-demo.js   fake sensors pushing data to the cloud API
└── client/              React portal (src/pages, src/components), dist/ = production build
```

## API summary
`GET /api/network` · `GET /api/roads/:id` · `GET /api/route?from=&to=` · `GET /api/incidents` · `POST /api/incidents` ·
`PUT /api/incidents/:id` (admin) · `GET|POST|DELETE /api/advisories` · `GET /api/signals` · `PUT /api/signals/:id` (admin) ·
`GET /api/analytics` · `POST /api/sensors/ingest` (API key) · `PUT /api/admin/simulation` (admin) · `GET /api/admin/system` (admin) ·
`POST /api/auth/register|login` · `GET /api/health`
