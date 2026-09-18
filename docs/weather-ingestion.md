# Pravah V2 — Weather Ingestion & Open-Meteo Integration (Phase 5)

This document details the weather ingestion pipeline, API schema normalization, in-memory caching, and endpoints implemented in Pravah V2.

---

## 1. Architecture Overview

Pravah V2 integrates with the **Open-Meteo Weather API** to retrieve real-time precipitation, temperature, and hourly forecast metrics for Delhi NCR:
- **Reference Location**: Delhi Safdarjung Regional Meteorological Center (`28.6139° N, 77.2090° E`).
- **In-Memory Caching (15 min TTL)**: Requests within 15 minutes are served instantly from memory, preventing external API throttling and latency.
- **Timeout & Resilience**: HTTP requests timeout after 5 seconds via `AbortController`. If Open-Meteo is unreachable, cached data is served with an `isStale: true` flag, or realistic baseline data is provided without crashing.
- **No False Real-Time Claims**: Fallback or stale data is explicitly flagged with source notes.

---

## 2. WMO Weather Code Normalization

Open-Meteo returns numeric WMO weather codes. Pravah V2 normalizes these into human-readable conditions:

| WMO Code | Normalized Condition | Urban Flood Relevancy |
| :---: | :--- | :--- |
| `0` | Clear sky | Dry base condition |
| `1 - 3` | Mainly clear / Overcast | Minimal flood risk |
| `51 - 55` | Light / Dense Drizzle | Low accumulation |
| `61 - 65` | Slight / Moderate / Heavy Rain | Primary risk surge trigger |
| `80 - 82` | Violent Rain Showers | Flash flood risk |
| `95 - 99` | Thunderstorm / Hail | High severity emergency alert |

---

## 3. Endpoints Specification

### 3.1 `GET /api/weather/current`
- **Access**: Public
- **Response**:
  ```json
  {
    "source": "Open-Meteo",
    "stationName": "Delhi Central (IMD Reference)",
    "rainfallMm": 14.5,
    "precipitationProbability": 0.95,
    "temperatureC": 31.2,
    "relativeHumidity": 78,
    "windSpeedKmh": 15.2,
    "weatherCode": 63,
    "condition": "Moderate rain",
    "observedAt": "2026-09-18T11:00:00.000Z",
    "fetchedAt": "2026-09-18T11:05:00.000Z",
    "isStale": false,
    "fromCache": false
  }
  ```

---

### 3.2 `GET /api/weather/forecast`
- **Access**: Public
- **Response**:
  ```json
  {
    "stationName": "Delhi Central (IMD Reference)",
    "observedAt": "2026-09-18T11:00:00.000Z",
    "forecastHours": [
      {
        "time": "2026-09-18T12:00",
        "rainfallMm": 18.0,
        "precipitationProbability": 0.90,
        "temperatureC": 29.5
      }
    ]
  }
  ```

---

### 3.3 `POST /api/weather/ingest`
- **Access**: Protected (`ADMIN`, `ANALYST`)
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Forces immediate cache invalidation and re-fetches latest observations from Open-Meteo.

---

### 3.4 `GET /api/weather/history?limit=10`
- **Access**: Public
- **Description**: Retrieves recent historical weather observations recorded in the database.
