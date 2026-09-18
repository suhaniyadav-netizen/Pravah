# Pravah V2 — Testing & System Reliability Architecture (Phase 14)

This document details the reliability architecture, fault-tolerance mechanisms, failure drill suite, and disaster recovery procedures implemented and validated for Pravah V2.

---

## 1. Executive Summary & Verification Matrix

Pravah V2 features an autonomous master verification and failure recovery test suite located at [`server/src/scripts/verify-phase14.js`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/server/src/scripts/verify-phase14.js). The suite subjects the platform to 19 critical integration, boundary, degradation, and resilience drills.

| Drill Category | Target Subsystem | Failure Condition Simulated | Expected Recovery Behavior | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. System Health** | `/api/health` | Service initialization | HTTP 200 with runtime metrics & uptime tracking | **PASSED** |
| **2. Database Disconnection** | Wards, Risk, Decision, Analytics, Simulator | PostgreSQL/PostGIS server unreachable (`localhost:5432`) | Graceful fallback to cached GIS GeoJSON, baseline models, in-memory presets | **PASSED** (5/5) |
| **3. Weather Telemetry** | `/api/weather/current`, Risk Engine | IMD/Open-Meteo external network failure / stale data (>12h) | Cached telemetry served; freshness status downgraded to `STALE` with lower confidence score | **PASSED** (2/2) |
| **4. GIS Spatial Boundaries** | `/api/complaints`, `/api/wards/lookup-point` | Out-of-bounds coordinates (e.g. Mumbai, international) & non-numeric types | Enforced Delhi bounding box (`28.35–28.95°N, 76.80–77.45°E`); rejects with HTTP 400 | **PASSED** (2/2) |
| **5. Input Schema Integrity** | `/api/complaints`, `/api/incidents` | Unknown enums, invalid types, payloads below minimum length | Zod schema validation intercept with detailed HTTP 400 field error mappings | **PASSED** (2/2) |
| **6. Security & Auth Defense** | Admin endpoints, drainage controls | Missing JWT, corrupted/forged JWT, CITIZEN role privilege escalation | Centralized auth middleware returns HTTP 401 Unauthorized / HTTP 403 Forbidden | **PASSED** (3/3) |
| **7. E2E Operational Drill** | Complaint $\to$ Incident $\to$ Decision Support $\to$ Simulator | Citizen reports waterlogging $\to$ Admin dispatches $\to$ Engine issues tactical plan $\to$ Pump simulation | Full synchronous and asynchronous pipeline succeeds seamlessly | **PASSED** (4/4) |

**Overall Verification Result**: **19/19 checks passed (100%)**.

---

## 2. Core Failure Scenarios & Resilience Mechanics

### 2.1 Database Disconnection Resilience (Zero-Crash Fallback)
In municipal emergency management, system downtime during severe flood events is unacceptable. If the PostgreSQL/PostGIS database instance experiences a network partition or hardware crash:
1. **Ward GeoJSON Retrieval (`/api/wards`)**: Automatically catches database connection timeouts and falls back to the in-memory cached demo dataset (`server/data/demo-ward-boundaries.json`), serving all 250 municipal wards with computed centroid markers.
2. **Explainable Risk Engine (`/api/risk/summary`)**: Generates baseline vulnerability scores and categorizes wards into Critical, High, Moderate, and Low tiers without throwing unhandled database rejections.
3. **Decision Support & Action Plans (`/api/decision-support/city`)**: Automatically executes tactical prioritization using in-memory response team registries and baseline ward capacities.
4. **Scenario Simulator (`/api/simulation/presets`)**: Serves pre-calibrated flood simulation templates directly from memory.

### 2.2 External Weather Ingestion & Stale Telemetry Degradation
Real-time flood risk calculation requires external weather feeds (IMD, Open-Meteo). When upstream APIs experience timeouts or rate-limiting:
- The system returns cached observations with an explicit `observedAt` timestamp.
- The **Explainable Risk Engine** calculates observation age ($T_{\text{age}}$):
  - $T_{\text{age}} \le 4\text{ hours}$: Marked `REAL_TIME` with $95\%$ confidence score.
  - $4 < T_{\text{age}} \le 12\text{ hours}$: Marked `AGING` with $70\%$ confidence score.
  - $T_{\text{age}} > 12\text{ hours}$: Automatically tagged `STALE` with reduced confidence score ($45\%$), alerting municipal operators to deploy physical field scouts.

### 2.3 GIS Bounding Box Enforcement
To protect the spatial indexing engine and prevent erroneous municipal resource allocations:
- Delhi NCR boundary is strictly bounded:
  $$\text{Latitude} \in [28.35^\circ\text{N}, 28.95^\circ\text{N}], \quad \text{Longitude} \in [76.80^\circ\text{E}, 77.45^\circ\text{E}]$$
- Inbound coordinates outside this bounding box (e.g. Mumbai: $72.87^\circ\text{E}, 19.07^\circ\text{N}$) are rejected immediately with HTTP 400:
  ```json
  {
    "error": "Error",
    "message": "Coordinates do not fall within monitored Delhi municipal boundaries."
  }
  ```
- Non-numeric or NaN coordinates trigger Zod schema validation errors before hitting the database.

### 2.4 End-to-End Operational Lifecycle Drill
The verification suite confirms the end-to-end multi-tier pipeline:
1. **Citizen Ingestion**: Citizen submits a 40 cm waterlogging report in Narela (`W001`). Point-in-polygon logic resolves ward code and broadcasts real-time telemetry over WebSockets.
2. **Incident Creation**: Municipal administrator escalates the complaint into an active operational flood incident (`ACTIVE`).
3. **Decision-Support Engine**: Inspects ward vulnerabilities, pumps, and standing water, recommending immediate mobile pump dispatch (`DISPATCH`).
4. **What-If Simulation**: Municipal planners test deploying 2 additional high-capacity mobile pumps, verifying a quantified reduction in flood risk.

---

## 3. Disaster Recovery & Operator Runbook

### 3.1 Running System Verification
The master test suite can be run at any time from the `server/` directory:
```powershell
cd server
npm test
# or
npm run verify:phase14
```

### 3.2 Running Individual Phase Verifications
Each development phase maintains its own focused verification script:
- Phase 2 (Auth/RBAC): `node src/scripts/verify-phase2.js`
- Phase 3 (Ward GIS): `node src/scripts/verify-phase3.js`
- Phase 4 (Risk Engine): `node src/scripts/verify-phase4.js`
- Phase 5 (Weather Ingestion): `node src/scripts/verify-phase5.js`
- Phase 6 (Forecasting): `node src/scripts/verify-phase6.js`
- Phase 7 (Complaints & Incidents): `node src/scripts/verify-phase7.js`
- Phase 8 (Response Teams): `node src/scripts/verify-phase8.js`
- Phase 9 (Decision Support): `node src/scripts/verify-phase9.js`
- Phase 10 (Simulator): `node src/scripts/verify-phase10.js`
- Phase 11 (Socket.IO): `node src/scripts/verify-phase11.js`
- Phase 12 (Analytics): `node src/scripts/verify-phase12.js`
- Phase 13 (Security): `node src/scripts/verify-phase13.js`
- Phase 14 (Master Reliability): `node src/scripts/verify-phase14.js`

### 3.3 Database Reconnection & Recovery
When PostgreSQL / PostGIS becomes reachable:
1. Prisma connection pool transparently establishes connections on subsequent requests.
2. In-memory buffers synchronize smoothly without requiring node process restarts.
3. Health endpoint (`/api/health`) provides live uptime metrics.
