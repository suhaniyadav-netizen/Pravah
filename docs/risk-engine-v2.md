# Pravah V2 — Explainable Flood Risk Engine V2 (Phase 4)

This document details the mathematical formulation, driver attribution, and API endpoints of the Explainable Flood Risk Engine in Pravah V2.

---

## 1. Principles & Design

In Pravah V1, the risk engine used a simple formula without normalization, bounds, explainability, or data confidence. Pravah V2 replaces this with a **transparent, deterministic, explainable multi-factor model**:
- **Strict Bounded Range**: Risk scores are strictly bounded between `0.0` and `100.0`.
- **Explainable Driver Attribution**: Directly calculates the exact mathematical point contribution of each input and identifies the primary risk driver (e.g. `RAINFALL_SURGE` vs `DRAINAGE_DEFICIT`).
- **Data Confidence & Freshness**: Every risk evaluation includes a timestamp-derived confidence score (0–100%) and freshness indicator (`REAL_TIME`, `AGING`, `STALE`).
- **No Fake ML**: The engine does not falsely present rule-based hydrological indices as machine learning.

---

## 2. Mathematical Formulation

$$\text{Risk Score} = \min\Big(100, \max\big(0, (D_{\text{deficit}} \times W_d) + (R_{\text{surge}} \times W_r) + (C_{\text{urgency}} \times W_c)\big)\Big)$$

### Component Indices

1. **Drainage Deficit Index ($D_{\text{deficit}}$)**:
   $$D_{\text{deficit}} = \max\Big(0, \min\big(100, \big(1 - \frac{\text{DrainageCapacity}}{100}\big) \times 100\big)\Big)$$
   - Represents hydraulic vulnerability where lower drainage capacity produces higher risk deficit.

2. **Rainfall Surge Index ($R_{\text{surge}}$)**:
   $$R_{\text{surge}} = \min\Big(100, \big(\frac{\text{Rainfall}_{\text{mm/hr}}}{60}\big) \times 100\Big)$$
   - Calibrated to Delhi IMD flash flood threshold of ~60 mm/hr.

3. **Citizen Urgency & Inundation Index ($C_{\text{urgency}}$)**:
   $$C_{\text{urgency}} = \min\Big(100, (\text{Complaints} \times 12.0) + (\text{WaterDepth}_{\text{cm}} \times 0.7)\Big)$$
   - Factors in verified ground reports and standing water depth.

### Configurable Weights
| Factor | Default Weight | Description |
| :--- | :---: | :--- |
| **Drainage Deficit** | `0.40` | Ward baseline hydraulic vulnerability |
| **Rainfall Surge** | `0.35` | Real-time and forecasted precipitation intensity |
| **Citizen Reports** | `0.25` | Ground-level complaint density and water depth |

---

## 3. Standardized Risk Levels

| Score Range | Risk Level | Operational Meaning | Suggested Action |
| :--- | :---: | :--- | :--- |
| **0.0 – 39.9** | **`LOW`** | Normal urban conditions | Standard maintenance |
| **40.0 – 59.9** | **`MODERATE`** | Heightened vigilance | Inspect vulnerable sumps, check outfall gates |
| **60.0 – 74.9** | **`HIGH`** | Localized waterlogging | Alert regional response teams, stage mobile pumps |
| **75.0 – 100.0** | **`CRITICAL`** | Severe flash flood / road inundation | Dispatch emergency pumping crews, route traffic diversions |

---

## 4. API Endpoints

### 4.1 `GET /api/risk/summary`
Returns city-wide vulnerability counts and top 5 vulnerable wards.
```json
{
  "totalWardsMonitored": 250,
  "cityAverageRiskScore": 54.2,
  "countsByLevel": {
    "critical": 12,
    "high": 38,
    "moderate": 145,
    "low": 55
  },
  "topVulnerableWards": [
    { "wardCode": "W001", "wardName": "Narela", "riskScore": 78.5, "riskLevel": "CRITICAL" }
  ]
}
```

### 4.2 `POST /api/risk/evaluate`
Dynamically evaluates scenario inputs without saving to the database.
```json
// Request
{
  "drainageCapacity": 40.0,
  "rainfallMm": 45.0,
  "complaintCount": 3,
  "avgWaterDepthCm": 30.0
}

// Response (200 OK)
{
  "status": "success",
  "evaluation": {
    "riskScore": 61.0,
    "riskLevel": "HIGH",
    "primaryDriver": "RAINFALL_SURGE",
    "components": {
      "drainageDeficitScore": 60.0,
      "rainfallSurgeScore": 75.0,
      "complaintScore": 57.0,
      "contributions": {
        "drainage": 24.0,
        "rainfall": 26.25,
        "complaints": 14.25
      }
    },
    "meta": {
      "confidenceScore": 95,
      "freshnessStatus": "REAL_TIME"
    }
  }
}
```

### 4.3 `POST /api/risk/recalculate`
Protected (`ADMIN`, `ANALYST`). Triggers recalculation of risk scores across all 250 wards.
