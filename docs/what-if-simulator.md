# Pravah V2 — What-If Flood Scenario Simulator (Phase 10)

This document describes the design, operational parameterization, and API specifications for the What-If Flood Scenario Simulator in Pravah V2.

---

## 1. Overview & Operational Purpose

Urban flood management requires proactive rehearsal of extreme hydrologic shocks and infrastructure intervention testing. The **What-If Simulator** allows municipal commissioners, PWD drainage engineers, and disaster analysts to:
1. Simulate extreme convective rainfall spikes (e.g. cloudburst shocks of 100 mm/h).
2. Model the impact of drainage degradation (e.g. pre-monsoon trash-grate siltation).
3. Evaluate tactical relief interventions, such as deploying mobile dewatering pumps (+350–1,050 $m^3/h$) or dredging culverts (+25% capacity).
4. Inspect side-by-side comparisons of **Baseline Conditions vs. Simulated Scenarios**.
5. Project status changes for critical Delhi transport bottlenecks and underpasses (e.g., Minto Bridge, Pul Prahladpur).

> [!IMPORTANT]
> **Safety & Operational Clarity Rule**: All simulated responses are strictly marked with `isSimulation: true`, a unique `simulationId`, and non-production disclaimers to prevent operational confusion in emergency command centers.

---

## 2. Standard Disaster & Mitigation Presets

| Preset ID | Scenario Name | Rainfall | Drainage Mod | Intervention / Spike |
| :--- | :--- | :--- | :--- | :--- |
| **`CLOUDBURST_DELHI_100MM`** | Cloudburst Shock | $100\text{ mm/h}$ | -20% (Debris clog) | +15 distress calls, 75 cm depth |
| **`HEAVY_MONSOON_50MM`** | Sustained Heavy Downpour | $50\text{ mm/h}$ | Baseline | +6 distress calls, 35 cm depth |
| **`DRAINAGE_SILTATION_40PCT`** | Siltation Crisis | $25\text{ mm/h}$ | -40% (Clogged canals) | +4 distress calls, 30 cm depth |
| **`PRE_MONSOON_DRAINAGE_UPGRADE`** | Desilted Network Upgrade | $30\text{ mm/h}$ | +25% (Dredged drains) | Zero distress calls, 15 cm depth |
| **`MAX_EMERGENCY_DEWATERING`** | Max Field Pump Deployment | $45\text{ mm/h}$ | Baseline | +3 Mobile Pumps (+1,050 $m^3/h$) |

---

## 3. Mathematical Comparison & Metrics

Each simulation outputs a comparative delta across:
1. **Risk Score Delta ($\Delta \text{Risk}$)**:
   $$\Delta \text{Risk} = \text{Score}_{\text{simulated}} - \text{Score}_{\text{baseline}}$$
   Classified into:
   - `SIGNIFICANT_MITIGATION` ($\Delta \text{Risk} \le -10$)
   - `MARGINAL_MITIGATION` ($-10 < \Delta \text{Risk} < 0$)
   - `NEUTRAL` ($\Delta \text{Risk} = 0$)
   - `MODERATE_HAZARD_INCREASE` ($0 < \Delta \text{Risk} \le 15$)
   - `SEVERE_HAZARD_ESCALATION` ($\Delta \text{Risk} > 15$)

2. **Inundation Duration ($\Delta t$)**:
   Calculates the estimated duration in minutes until floodwaters recede. Deploying mobile pumps reduces duration by ~25 minutes per deployed pump unit.

---

## 4. REST API Endpoints

### 4.1 `GET /api/simulation/presets`
- **Access**: Public
- **Description**: Returns all pre-configured scenarios and parameter boundaries.

### 4.2 `POST /api/simulation/ward`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "wardId": "W056",
    "presetId": "CLOUDBURST_DELHI_100MM",
    "rainfallMm": 95.0,
    "drainageModifierPct": -15,
    "additionalMobilePumps": 2,
    "complaintSpike": 10
  }
  ```
- **Response (200 OK)**:
  Side-by-side comparison of baseline vs simulated risk score, risk level, primary driver, inundation duration, and plain-language narrative.

### 4.3 `POST /api/simulation/city`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "rainfallMultiplier": 2.2,
    "drainageModifierPct": -15,
    "additionalPumpsDeployed": 5
  }
  ```
- **Response (200 OK)**:
  Macro citywide shift in critical/high risk ward counts, net average risk shift, and projected status of known vulnerable Delhi underpasses (`IMMINENT_SUBMERGENCE`, `RESTRICTED_FLOW`, `OPERATIONAL`).
