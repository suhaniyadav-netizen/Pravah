# AGENTS.md — Pravah-V2

## Project Overview
Delhi municipal flood risk monitoring, explainable risk intelligence, multi-horizon forecasting, emergency dispatch, decision support, what-if simulation, and real-time telemetry platform.

---

## Developer Commands

### Backend (run from `server/`)
```powershell
# Setup
npm install

# Prisma Schema & Database Generation (when PostgreSQL is active)
npx prisma generate
npx prisma db push
npm run prisma:seed

# Run Server (port 5000)
npm run dev

# Run Automated Verification & Test Suites
npm test                  # Phase 14 Master Reliability & Failure Suite (19/19 checks)
npm run verify:phase15    # Phase 15 Client Integration Suite (8/8 checks)
```

### Frontend Clients

#### A. Modern React + Vite Client (`client/`)
```powershell
cd client
npm install
npm run dev        # Launches on http://localhost:5173 (proxies /api to port 5000)
npm run build      # Verifies production build
```

#### B. Legacy Static Files (`frontend/`)
Open `frontend/index.html` via VS Code Live Server or double-click.
`frontend/js/common.js` automatically detects `http://localhost:5000` for local development and falls back to production when hosted.

---

## Architecture Notes
- **Backend Entrypoint:** `server/src/main.js` & `server/src/app.js` — Node.js Express server + Socket.IO on port 5000.
- **Database & Spatial ORM:** PostgreSQL 16 + PostGIS with Prisma (`server/prisma/schema.prisma`).
- **Spatial Geometry:** All 250 Delhi municipal wards modeled as PostGIS `GEOMETRY(Polygon, 4326)` with point-in-polygon containment and distance ranking.
- **Explainable Risk Engine:** `server/src/services/risk-engine.service.js` — Deterministic mass-balance model: `(Drainage * 0.40) + (Rainfall * 0.35) + (Complaints * 0.25)`.
- **Decision Support:** `server/src/services/decision-support.service.js` — "What Should the City Do Now?" tactical action ranking.
- **What-If Simulator:** `server/src/services/simulator.service.js` — Computes delta risk ($\Delta \text{Risk}$) and pump deployment feasibility.
- **Real-Time Telemetry:** Socket.IO broadcasting on `/api/*` mutations (new complaints, status updates, dispatches).
- **Security:** Helmet CSP/HSTS headers, bcrypt hashing, JWT auth, Zod validation, rate limiting (auth: 15/15m, complaints: 30/15m), and immutable audit logs.
- **Resilience:** Resilient zero-crash offline fallbacks (`server/data/demo-ward-boundaries.json` and in-memory caches) if PostgreSQL or external weather APIs are offline.

---

## Key API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | System health check and discovery |
| GET | `/api/wards` | GeoJSON FeatureCollection of 250 wards with risk scores |
| GET | `/api/risk/summary` & `/api/risk-summary` | Aggregate citywide risk and vulnerability stats |
| GET | `/api/risk/ward/:id` | Explainable risk breakdown with mathematical weights |
| GET | `/api/forecasting/ward/:id` | 6h, 12h, and 24h hydrological projections |
| GET | `/api/forecasting/city` & `/api/prediction` | 24-hour citywide risk escalation overview |
| POST | `/api/complaints` & `/api/complaint` | Geotagged waterlogging report with auto-ward mapping |
| GET | `/api/incidents` | Active operational flood incidents |
| POST | `/api/response-teams/dispatch` | Emergency response team & equipment dispatch |
| GET | `/api/decision-support/city` | Ranked citywide tactical action roadmap |
| POST | `/api/simulation/ward` | What-If simulation calculating delta risk |
| POST | `/api/auth/login` | JWT authentication |
| GET | `/api/admin/overview` | Admin vulnerability overview |
| POST | `/api/admin/update-drainage` | Update ward drainage capacity (with audit log) |
| GET | `/api/admin/audit-logs` | Immutable administrative security audit trail |

---

## Quality & Testing
- Automated test suites verify all failure and reliability scenarios:
  - `npm test` (Master Failure Suite: DB disconnection, coordinate rejection, auth defense, E2E drill)
  - `npm run verify:phase15` (Client Integration Suite: legacy endpoints, dual GeoJSON keys, frontend assets)
  - Dedicated verification scripts for Phases 1 through 15 in `server/src/scripts/verify-phase*.js`