# Pravah V2 — Signature Feature: "What Should the City Do Now?" (Phase 9)

This document details the deterministic, explainable decision-support system implemented in Pravah V2.

---

## 1. Architectural Philosophy

Municipal flood emergency decision support must never rely on probabilistic, hallucination-prone black-box LLMs as the core operational engine. Pravah V2 implements a **100% transparent, rule-grounded tactical optimization engine** translating multi-factor risk scores, primary drivers, live incidents, infrastructure statuses, and response team availability into prioritized, auditable actions.

```
                  ┌────────────────────────────────────────────────┐
                  │              MULTI-SOURCE INPUTS               │
                  │  • Risk Engine Score (0-100) & Primary Driver │
                  │  • Active Incidents & Inundation Depth (cm)   │
                  │  • Open-Meteo Rainfall Rate (mm/h)            │
                  │  • Infrastructure Capacity & Status           │
                  │  • Response Team Status & Equipment Roster    │
                  └───────────────────────┬────────────────────────┘
                                          │
                                          ▼
                  ┌────────────────────────────────────────────────┐
                  │    DETERMINISTIC TACTICAL DECISION ENGINE     │
                  │  • Prioritization: P1 (15m) -> P4 (6h)         │
                  │  • Multi-category rule matching                │
                  │  • Defensible quantitative impact estimation   │
                  │  • Resource gap & deficit detection            │
                  └───────────────────────┬────────────────────────┘
                                          │
                                          ▼
                  ┌────────────────────────────────────────────────┐
                  │             EXPLAINABLE OUTPUTS                │
                  │  • Prioritized Tactical Action Plan            │
                  │  • Clear Reasoning & Trigger Audits            │
                  │  • Projected Risk Score Reduction              │
                  │  • Estimated Inundation Time Reduction (mins)  │
                  │  • Matched Field Crews & Traffic Measures     │
                  └────────────────────────────────────────────────┘
```

---

## 2. Action Categories & Priority Hierarchy

### 2.1 Priority Tiers
| Tier | Urgency Label | Response Window | Description |
| :--- | :--- | :--- | :--- |
| **`P1_CRITICAL`** | Critical Emergency | **15 minutes** | Immediate threat to life, submerged major underpass, or active major incident rescue. |
| **`P2_HIGH`** | Tactical Containment | **45 minutes** | Rapidly accumulating waterlogging, auxiliary pumping station engagement, traffic throttling. |
| **`P3_MEDIUM`** | Preemptive Mitigation | **120 minutes** | De-silting stormwater grates, culvert clearance, sewer suction before forecasted surge. |
| **`P4_ROUTINE`** | Monitoring & Advisory | **360 minutes** | Continuous monitoring, RWA basement sump advisories, post-recession silt check. |

### 2.2 Operational Categories
1. **`DISPATCH`**: Mobilizes heavy mobile dewatering pumps (350–500 $m^3/h$) or emergency field rescue squads.
2. **`TRAFFIC_CONTROL`**: Emergency underpass barricading, traffic diversions, and PWD traffic marshal deployment at waterlogged bottlenecks.
3. **`INFRASTRUCTURE`**: Dual-diesel generator activation at municipal sumps, stormwater grate jetting, outfall regulator adjustment.
4. **`CIVIC_ALERT`**: Hyper-local emergency broadcast notices (via DDMA push gateway) to divert commuters and advise residents.

---

## 3. Quantitative Defensible Calculations

Every recommendation produces mathematical estimates grounded in physical hydrology:

1. **Projected Risk Score Reduction**:
   $$\Delta \text{Risk} = \min\left(25, \text{round}\left(\text{Risk Score} \times C_{\text{action}}\right)\right)$$
2. **Estimated Inundation Reduction (minutes)**:
   $$\Delta t = \text{round}\left(h_{\text{water}} \times 1.6 + 30\right)$$
3. **Capacity Boost**:
   Quantitative addition in $m^3/h$ (e.g. $+350\text{--}500\ m^3/h$ for mobile submersible pumps).
4. **Data Confidence**:
   Scored between $0.80$ and $0.98$ based on sensor freshness and database verification.

---

## 4. REST API Endpoints

### 4.1 `GET /api/decision-support/metadata`
- **Access**: Public
- **Description**: Returns all supported priorities, categories, and standardized action types.

### 4.2 `GET /api/decision-support/city`
- **Access**: Public
- **Query Parameters**:
  - `limit` *(optional, default 15)*: Maximum top prioritized actions to return.
  - `minPriority` *(optional)*: E.g., `P1_CRITICAL`, `P2_HIGH`.
- **Response**: Executive city command summary, total critical/high-risk wards, and city-wide prioritized tactical action queue.

### 4.3 `GET /api/decision-support/ward/:id`
- **Access**: Public
- **Parameters**: Ward code (e.g. `W056`, `WARD-056`, `W112`).
- **Query Overrides**: `riskScore`, `rainfallMm`, `avgWaterDepthCm` for scenario testing.
- **Response**: Ward conditions, primary drivers, and prioritized action plan with assigned response teams.

### 4.4 `POST /api/decision-support/evaluate`
- **Access**: Public
- **Body**:
  ```json
  {
    "wardId": "W056",
    "riskScore": 82.0,
    "primaryDriver": "DRAINAGE_DEFICIT",
    "rainfallMm": 45.0,
    "avgWaterDepthCm": 50.0,
    "activeIncidentsCount": 2
  }
  ```
- **Response**: Marked simulation plan with projected risk reduction and immediate recommendations.
