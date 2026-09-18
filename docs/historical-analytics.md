# Pravah V2 — Historical Analytics & Telemetry Aggregation (Phase 12)

This document details the historical analytics engine, trend calculations, resolution performance metrics, recurring hotspot registry, and multi-ward comparative benchmarking implemented in Pravah V2.

---

## 1. Architectural Principles & Temporal Data Integrity

A core vulnerability of naive municipal reporting is conflating live sensor telemetry with historical archives, simulation runs, or forecasted models.

Pravah V2 strictly enforces **Temporal Provenance Tagging**:
- **`CURRENT`**: Real-time on-ground observations (last 15 minutes).
- **`HISTORICAL`**: Audited archive records of past monsoon seasons, closed complaints, and verified inundation events.
- **`PREDICTED`**: Hydrological mass-balance forecasts (6h, 12h, 24h horizons).
- **`SIMULATED`**: What-If scenario interventions clearly isolated from real operations.

All Phase 12 responses are stamped with `dataType: "HISTORICAL"` and provenance metadata.

---

## 2. Core Analytics Modules

### 2.1 Multi-Day Risk Score Trends
- Computes daily mean risk score, daily peak risk score, and primary driver shifts.
- Identifies macro trajectory: `RISING`, `STABLE`, or `DECLINING`.
- Correlates daily risk with daily rainfall surge and active incident counts.

### 2.2 Rainfall Accumulation & Rolling Averages
- Computes daily precipitation totals from meteorological archives.
- Computes rolling 7-day moving averages ($\text{SMA}_7$) to detect soil saturation and cumulative drainage fatigue.
- Identifies heavy rain events ($> 35\text{ mm/h}$) and very heavy events ($> 60\text{ mm/h}$).

### 2.3 Citizen Complaint Resolution & MTTR
- **Mean Time to Resolution (MTTR)**: Average elapsed hours from citizen submission to verified on-ground resolution.
- **SLA Compliance**: Percentage of complaints resolved within standard 4-hour and 12-hour municipal service windows.
- **Severity Breakdown**: Distribution across `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` complaints.

### 2.4 Recurring Historical Hotspot Registry
Curates long-term verified Delhi waterlogging hotspots ranked by recurrence score ($0\text{--}100$):
1. **Minto Bridge Underpass** (`W056`, Central Zone): Bowl-shaped topography; gravity outfall submergence during Yamuna swell.
2. **Pul Prahladpur Underpass** (`W112`, South Zone): Ridge runoff exceeding arterial sump throughput.
3. **Zakhira Flyover Underpass** (`W089`, West Zone): Storm drain siltation and pump trash clogging.
4. **Tilak Bridge Underpass** (`W060`, Central Zone): High traffic density restricting prompt pump positioning.
5. **Moolchand Underpass** (`W145`, South Zone): Backflow from Barapullah drain.
6. **Burari Outfall Area** (`W006`, North Zone): Low-lying floodplain with limited paved outfalls.

### 2.5 Multi-Ward Comparative Benchmarking
Enables side-by-side comparison of 2 or more wards across:
- Baseline drainage capacity ($m^3/s$)
- Drainage deficit percentage
- Historical recurrence score
- Mean resolution time (MTTR)
- Overall vulnerability rating (`HIGH_VULNERABILITY`, `MODERATE_VULNERABILITY`, `LOW_VULNERABILITY`)

---

## 3. REST API Endpoints

### 3.1 `GET /api/analytics/trends/risk`
- **Query Parameters**:
  - `wardId` *(optional)*: E.g., `W056`. If omitted, aggregates city-wide.
  - `rangeDays` *(optional, default 14)*: Range between 3 and 90 days.
- **Response**: Array of daily risk metrics, summary trend direction, and peak score.

### 3.2 `GET /api/analytics/trends/rainfall`
- **Query Parameters**:
  - `rangeDays` *(optional, default 30)*: Range between 7 and 120 days.
- **Response**: Cumulative rainfall, rolling 7-day average series, and heavy rain day frequency.

### 3.3 `GET /api/analytics/complaints/resolution-metrics`
- **Query Parameters**:
  - `wardId` *(optional)*: Specific ward scope.
  - `rangeDays` *(optional, default 30)*: Time window.
- **Response**: Total complaints, verified/resolved counts, MTTR in hours, and SLA compliance rate.

### 3.4 `GET /api/analytics/hotspots`
- **Query Parameters**:
  - `limit` *(optional, default 10)*: Number of hotspots to retrieve.
  - `zone` *(optional)*: Filter by municipal zone (e.g. `Central`, `South`, `North`).
- **Response**: Ranked list of historical hotspots with recurrence scores and primary hydraulic factors.

### 3.5 `GET /api/analytics/wards/compare`
- **Query Parameters**:
  - `wardIds`: Comma-separated list of at least 2 ward codes (e.g. `?wardIds=W001,W056,W112`).
- **Response**: Side-by-side benchmarking matrix sorted by drainage deficit.

### 3.6 `GET /api/analytics/infrastructure/vulnerability`
- **Description**: City-wide infrastructure vulnerability audit covering stormwater drains, pumping stations, and sluice outfalls.
