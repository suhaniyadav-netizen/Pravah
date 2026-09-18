# Pravah V2 — Master System Architecture & Technical Specifications

Pravah V2 is a production-grade urban flood monitoring, explainable risk intelligence, multi-horizon hydrological forecasting, incident dispatch, tactical decision-support, what-if scenario simulation, and real-time telemetry platform engineered for Delhi's 250 municipal wards.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        CP["Citizen Portal (HTML5/Tailwind/Leaflet)"]
        CD["City Command Dashboard (Recharts/Leaflet)"]
        AC["Admin Control Center (Audit/Drainage/Teams)"]
        RT["Field Response Mobile Webview"]
    end

    subgraph Gateway["Edge & Gateway Layer"]
        direction TB
        RL["Rate Limiters (Auth: 15/15m, Complaints: 30/15m)"]
        SEC["Helmet Security Headers (CSP, HSTS, NoSniff)"]
        CORS["CORS & Sanitize Middleware (XSS Cleaner)"]
    end

    subgraph Core["Pravah V2 Core Backend (Node.js/Express)"]
        direction TB
        AUTH["Auth & RBAC Service (JWT + Bcrypt)"]
        GIS["GIS & Spatial Service (PostGIS SRID 4326)"]
        RISK["Explainable Risk Engine V2 (Deterministic)"]
        WEATHER["Weather Ingestion & Ensemble Cache (Open-Meteo)"]
        FORECAST["Hydrological Forecasting Service (6h, 12h, 24h)"]
        INCIDENTS["Complaints & Incidents Lifecycle Engine"]
        DISPATCH["Response Team Management & Dispatch Engine"]
        DECISION["Decision-Support Engine ('What To Do Now?')"]
        SIM["What-If Scenario Simulator"]
        ANALYTICS["Historical Analytics & Hotspot Telemetry"]
        AUDIT["Security & Administrative Audit Logger"]
    end

    subgraph Realtime["Real-Time Transport Layer"]
        SIO["Socket.IO WebSocket Server (Port 5000)"]
    end

    subgraph Storage["Persistent & Spatial Storage"]
        PG[("PostgreSQL 16 + PostGIS")]
        PRISMA["Prisma ORM Client & Raw Spatial Queries"]
        CACHE["In-Memory Resilient Cache & Fallback Store"]
    end

    Clients --> Gateway
    Gateway --> Core
    Core <--> SIO
    SIO -.->|"Real-Time Push"| Clients
    Core <--> PRISMA
    PRISMA <--> PG
    Core -.->|"Zero-Crash Fallback"| CACHE
```

---

## 2. Explainable Risk Engine Pipeline

Unlike opaque machine learning models, Pravah V2's risk engine is 100% deterministic, explainable, and legally defensible for municipal authorities.

$$\text{Risk Score} = (S_{\text{drainage}} \times W_d) + (S_{\text{rainfall}} \times W_r) + (S_{\text{urgency}} \times W_c)$$

Where:
- $W_d = 0.40$ (Drainage Deficit Weight)
- $W_r = 0.35$ (Precipitation Surge Weight)
- $W_c = 0.25$ (Citizen Urgency & Inundation Depth Weight)

```mermaid
flowchart LR
    subgraph Inputs["Telemetry Inputs"]
        D["Ward Drainage Capacity (m³/s)"]
        R["Hourly Precipitation (mm/h)"]
        C["Active Complaints & Water Depth (cm)"]
        T["Observation Age (Hours)"]
    end

    subgraph Normalization["Normalization Stage"]
        ND["Drainage Deficit (0–100)"]
        NR["Rainfall Surge (0–100 vs 60mm Benchmark)"]
        NC["Complaint & Depth Urgency (0–100)"]
    end

    subgraph Weighting["Weighted Synthesis"]
        WD["Deficit x 0.40"]
        WR["Surge x 0.35"]
        WC["Urgency x 0.25"]
    end

    subgraph Classification["Explainable Output"]
        SCORE["Composite Risk Score (0.0–100.0)"]
        LEVEL{"Threshold Classification"}
        CRIT["CRITICAL (>= 75.0)"]
        HIGH["HIGH (60.0 – 74.9)"]
        MOD["MODERATE (40.0 – 59.9)"]
        LOW["LOW (< 40.0)"]
        DRV["Primary Driver Identification"]
        CONF["Confidence & Freshness Score"]
    end

    D --> ND --> WD
    R --> NR --> WR
    C --> NC --> WC
    WD & WR & WC --> SCORE
    SCORE --> LEVEL
    LEVEL --> CRIT & HIGH & MOD & LOW
    WD & WR & WC --> DRV
    T --> CONF
```

---

## 3. Decision-Support & Emergency Dispatch Sequence

The signature feature **"What Should the City Do Now?"** synthesizes ward risk, standing water, and pump inventory to generate ranked tactical action plans.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Municipal Controller
    participant API as /api/decision-support/ward/:id
    participant Engine as Decision Support Engine
    participant Ward as Ward & Infrastructure Service
    participant Dispatch as Response Team Service
    participant Socket as Socket.IO Broadcaster
    actor Team as Field Response Team

    Admin->>API: GET Tactical Recommendations for Ward W001
    API->>Engine: evaluateWardTacticalActions(W001)
    Engine->>Ward: Fetch drainage capacity, active incidents, standing water
    Ward-->>Engine: Drainage: 40 m³/s, Water Depth: 45 cm, Incidents: 2
    Engine->>Dispatch: Find nearest available response teams & pumps
    Dispatch-->>Engine: Team ND-01 (150 m³/s pump) at 2.4 km distance
    Engine->>Engine: Compute Priority Score = (Urgency x 0.5) + (Impact x 0.3) + (Proximity x 0.2)
    Engine-->>API: Return Ranked Tactical Action Plan (Priority 1: Deploy Mobile Pump)
    API-->>Admin: Render Action Card with 1-Click Dispatch

    Admin->>API: POST /api/response-teams/dispatch
    API->>Dispatch: assignTeamToIncident(teamId, incidentId)
    Dispatch->>Socket: broadcastTeamDispatched(payload)
    Socket-->>Team: Push Dispatch Alert with Turn-by-Turn GPS
    Socket-->>Admin: Update Live Operational Map
```

---

## 4. What-If Flood Scenario Simulator

Municipal engineers can stress-test interventions prior to deploying expensive physical infrastructure.

```mermaid
flowchart TD
    A["Operator Selects Intervention Parameters"] --> B["Baseline Extraction (W001 Current State)"]
    B --> C{"Simulation Type"}
    C -->|"Pump Intervention"| D["Augment Baseline Drainage by Pump Capacity (+30 m³/s)"]
    C -->|"Rainfall Surge"| E["Inject Scenario Rainfall (e.g. 75 mm/h Cloudburst)"]
    C -->|"Drainage Desilting"| F["Modify Drainage Modifier (+25%)"]
    D & E & F --> G["Run Explainable Risk Engine Simulation Pass"]
    G --> H["Compute Delta Risk (Δ Risk = SimScore - BaselineScore)"]
    H --> I["Evaluate Feasibility & Operational Cost Estimation"]
    I --> J["Output Simulated GeoJSON & Comparative Delta Report"]
```

---

## 5. Security & OWASP Hardening Specifications

Pravah V2 incorporates multi-layered defensive controls:

1. **Role-Based Access Control (RBAC)**:
   - `ADMIN`: Full operational authority, drainage adjustments, dispatching, audit review.
   - `ANALYST`: Predictive forecasting, telemetry exports, historical hotspot review.
   - `RESPONSE_TEAM`: Status updates on dispatched incidents, mobile status toggles.
   - `CITIZEN`: Public waterlogging reporting, ward risk lookup.
2. **Cryptographic Integrity**:
   - Passwords hashed using bcrypt (cost factor 10).
   - Signed JSON Web Tokens with 24-hour TTL and secret validation.
3. **Rate Limiting**:
   - Auth endpoints: 15 attempts / 15 minutes.
   - Public complaints: 30 submissions / 15 minutes.
   - General API: 600 requests / 15 minutes.
4. **Input Sanitization**:
   - Recursive XSS stripping middleware neutralizes `<script>` and `<iframe>` injection attempts.
   - Strict Zod schema boundaries enforce coordinate bounds, enum values, and string constraints.
5. **Audit Logging**:
   - Immutable security audit logs capture administrator ID, action type, IP address, and timestamp on all state modifications.
