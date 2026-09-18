# Pravah V2 — Real-Time Socket.IO Telemetry Architecture (Phase 11)

This document specifies the WebSocket pub/sub architecture, room hierarchies, authorization boundaries, and event contracts implemented in Pravah V2.

---

## 1. Architecture Overview

Pravah V2 features a bidirectional real-time event pipeline built on **Socket.IO**. It enables instant telemetry distribution to municipal command dashboards, field response tablets, and public citizen maps without polling.

```
                    ┌──────────────────────────────────────────────┐
                    │          PRAVAH BACKEND SERVICES             │
                    │  (Risk Engine, Incidents, Dispatch, Weather) │
                    └──────────────────────┬───────────────────────┘
                                           │ Broadcasters
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │               SOCKET.IO SERVER               │
                    │  • Handshake JWT Auth Middleware             │
                    │  • Zod Event Schema Validation               │
                    │  • Heartbeats (ping 25s, timeout 20s)        │
                    └──────┬───────────────┬───────────────┬───────┘
                           │               │               │
            ┌──────────────▼────┐   ┌──────▼──────┐   ┌────▼──────────────┐
            │    `city:risk`    │   │ `ward:W056` │   │  `admin:command`  │
            │ (Public Telemetry)│   │ (Hyperlocal)│   │  (RBAC Protected) │
            └───────────────────┘   └─────────────┘   └───────────────────┘
```

---

## 2. Room & Channel Hierarchy

| Room Name | Access Tier | Description | Events Emitted |
| :--- | :--- | :--- | :--- |
| **`city:risk`** | Public (Auto-join) | Citywide flood risk score shifts and meteorological updates. | `RISK_UPDATED`, `WEATHER_UPDATED` |
| **`weather:updates`**| Public (Auto-join) | Safdarjung IMD live observation telemetry. | `WEATHER_UPDATED` |
| **`ward:<wardId>`** | Public (On-Demand) | Specific ward channel subscribed via `join:ward`. | `RISK_UPDATED`, `NEW_COMPLAINT`, `INCIDENT_CREATED`, `INCIDENT_UPDATED`, `TEAM_DISPATCHED` |
| **`admin:command`** | **RBAC Protected** | Restricted to `ADMIN`, `ANALYST`, and `RESPONSE_TEAM`. | `NEW_COMPLAINT`, `INCIDENT_CREATED`, `INCIDENT_UPDATED`, `TEAM_DISPATCHED` |

---

## 3. Real-Time Event Contracts

All event payloads are validated against **Zod schemas** before emission:

### 3.1 `RISK_UPDATED`
```json
{
  "wardId": "W056",
  "wardCode": "W056",
  "riskScore": 78.4,
  "riskLevel": "CRITICAL",
  "primaryDriver": "DRAINAGE_DEFICIT",
  "timestamp": "2026-09-18T06:45:00.000Z"
}
```

### 3.2 `NEW_COMPLAINT`
```json
{
  "id": "comp-realtime-101",
  "wardId": "W056",
  "severity": "HIGH",
  "address": "Minto Bridge Underpass",
  "waterDepthCm": 45.0,
  "status": "SUBMITTED",
  "timestamp": "2026-09-18T06:45:00.000Z"
}
```

### 3.3 `INCIDENT_CREATED`
```json
{
  "id": "inc-realtime-202",
  "wardId": "W056",
  "title": "Waterlogging Inundation at Underpass",
  "severity": "MAJOR",
  "status": "ACTIVE",
  "waterDepthCm": 50.0,
  "timestamp": "2026-09-18T06:45:00.000Z"
}
```

### 3.4 `INCIDENT_UPDATED`
```json
{
  "id": "inc-realtime-202",
  "wardId": "W056",
  "previousStatus": "ACTIVE",
  "newStatus": "CONTAINED",
  "updatedBy": "commissioner@delhi.gov.in",
  "timestamp": "2026-09-18T06:45:00.000Z"
}
```

### 3.5 `TEAM_DISPATCHED`
```json
{
  "assignmentId": "assign-realtime-303",
  "teamId": "team-central-01",
  "teamName": "Central Quick Response Unit",
  "incidentId": "inc-realtime-202",
  "wardId": "W056",
  "status": "DISPATCHED",
  "timestamp": "2026-09-18T06:45:00.000Z"
}
```

### 3.6 `WEATHER_UPDATED`
```json
{
  "station": "Delhi Safdarjung IMD",
  "rainfallMm": 38.5,
  "temperatureC": 26.5,
  "condition": "Heavy Thunderstorm",
  "timestamp": "2026-09-18T06:45:00.000Z"
}
```

---

## 4. Authentication & Security Handshake

1. **Handshake Verification**:
   - Clients supply their JWT token via `socket.handshake.auth.token` or the standard `Authorization: Bearer <token>` header.
   - If a valid token is verified, `socket.user` is populated with `id`, `email`, and `role`.
   - If no token is provided, the client connects as an anonymous viewer with read-only access to public feeds (`city:risk`, `weather:updates`, and `ward:<wardId>`).
2. **Room Access Control**:
   - The `admin:command` room requires `socket.user.role` in `['ADMIN', 'ANALYST', 'RESPONSE_TEAM']`.
   - Unauthorized attempts receive `{ success: false, error: '...' }` or an `error` event with code `FORBIDDEN`.
