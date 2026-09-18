# Pravah V2 — Ward Intelligence & GIS API (Phase 3)

This document details the GIS and Ward Intelligence API endpoints implemented in Pravah V2.

---

## 1. Overview

The Ward Intelligence API serves geospatial boundaries, search queries, point-in-polygon resolution, and asset containment for all **250 Delhi municipal wards**. It is optimized for map renderers like **Leaflet.js** and operational dashboards.

---

## 2. API Endpoints Specification

### 2.1 `GET /api/wards`
- **Purpose**: Returns all 250 Delhi municipal wards as a standard GeoJSON `FeatureCollection`.
- **Access**: Public
- **Response Format**:
  ```json
  {
    "type": "FeatureCollection",
    "metadata": {
      "count": 250,
      "source": "PostgreSQL/PostGIS live database"
    },
    "features": [
      {
        "type": "Feature",
        "id": "W001",
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [[[[77.102594, 28.840484], ...]]]
        },
        "properties": {
          "ward_code": "W001",
          "ward_name": "Narela",
          "drainage_capacity": 50.0,
          "current_risk_score": 52.5,
          "current_risk_level": "MODERATE"
        }
      }
    ]
  }
  ```

---

### 2.2 `GET /api/wards/search?q=:keyword`
- **Purpose**: Fast keyword search across ward name, ward code (e.g. `W001`), and administrative zone (e.g. `Narela`, `Civil Lines`).
- **Access**: Public
- **Sample Request**:
  ```
  GET /api/wards/search?q=Narela
  ```
- **Response (200 OK)**:
  ```json
  {
    "query": "Narela",
    "count": 1,
    "results": [
      {
        "id": "W001",
        "wardCode": "W001",
        "wardName": "Narela",
        "zone": "Narela",
        "drainageCapacity": 50.0
      }
    ]
  }
  ```

---

### 2.3 `POST /api/wards/lookup-point`
- **Purpose**: Resolves GPS coordinates (longitude, latitude) to the containing Delhi municipal ward using PostGIS `ST_Contains` (with automatic nearest-ward fallback).
- **Access**: Public
- **Request Body**:
  ```json
  {
    "longitude": 77.094594,
    "latitude": 28.840484
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "matched": true,
    "matchType": "CONTAINMENT",
    "ward": {
      "id": "W001",
      "wardCode": "W001",
      "wardName": "Narela",
      "drainageCapacity": 50.0
    }
  }
  ```

---

### 2.4 `GET /api/wards/:id`
- **Purpose**: Retrieves complete intelligence for a single ward, including boundary geometry, risk breakdown, contained infrastructure, active incidents, and recent complaints.
- **Access**: Public
- **Sample Request**:
  ```
  GET /api/wards/W001
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "W001",
    "wardCode": "W001",
    "wardName": "Narela",
    "drainageCapacity": 50.0,
    "currentRisk": {
      "score": 55.0,
      "level": "MODERATE",
      "components": {
        "drainage": 45.0,
        "rainfall": 60.0,
        "complaints": 50.0
      }
    },
    "infrastructure": [
      {
        "id": "infra-demo-1",
        "name": "Narela Auxiliary Drainage Sump",
        "type": "PUMP_STATION",
        "status": "OPERATIONAL",
        "capacityValue": 200.0
      }
    ]
  }
  ```

---

### 2.5 `GET /api/wards/:id/infrastructure`
- **Purpose**: Lists all flood pumps, drain outfalls, emergency shelters, and underpass sumps located within or nearest to the specified ward.
- **Access**: Public
- **Response (200 OK)**:
  ```json
  {
    "wardId": "W001",
    "count": 1,
    "infrastructure": [
      {
        "id": "infra-W001-pump",
        "wardId": "W001",
        "name": "Ward W001 Emergency Submersible Pump",
        "type": "PUMP_STATION",
        "capacityValue": 250.0,
        "status": "OPERATIONAL"
      }
    ]
  }
  ```

---

## 3. Verification

Execute the automated GIS test suite:
```bash
cd server
npm run verify:phase3
```
Validates GeoJSON compliance, spatial lookups, keyword searching, and boundary outputs.
