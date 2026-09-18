# Pravah V2 — Development Seed Data Architecture (Phase 1D)

This document describes the initial seed dataset created for local development and testing of Pravah V2.

---

## 1. Demo User Accounts

All seed users are provisioned with **bcrypt-hashed passwords** (`saltRounds: 10`). Plaintext passwords are never stored in the database.

| Role | Email | Default Dev Password | Name |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | `admin@pravah.delhi.gov.in` | `PravahDev@2026` | Municipal Commissioner (Admin) |
| **`ANALYST`** | `analyst@pravah.delhi.gov.in` | `PravahDev@2026` | Hydrological Analyst |
| **`RESPONSE_TEAM`** | `team.central@pravah.delhi.gov.in` | `PravahDev@2026` | Central Control Officer |
| **`CITIZEN`** | `citizen.delhi@example.com` | `PravahDev@2026` | Priya Sharma (Citizen) |

---

## 2. Seed Entities Summary

| Entity | Quantity | Description & Notes |
| :--- | :--- | :--- |
| **`users`** | 4 | One user for each of the 4 RBAC roles. |
| **`wards`** | 250 | All 250 Delhi municipal wards loaded with `MultiPolygon` PostGIS boundaries. |
| **`response_teams`** | 3 | Emergency field units: Central Quick Response, North Heavy Drainage, South Flood Relief. |
| **`infrastructure`** | 4 | Spatial assets: Minto Bridge Pump Station, Barapullah Outfall, Tilak Bridge Underpass, AIIMS Disaster Shelter. |
| **`complaints`** | 2 | Geotagged citizen reports at high-vulnerability waterlogging locations. |
| **`incidents`** | 1 | Active critical flood incident at Minto Bridge underpass. |
| **`assignments`** | 1 | Links North Heavy Drainage squad to the active Minto Bridge incident. |
| **`risk_snapshots`** | 5 | Pre-computed risk calculations with sub-component scores. |
| **`weather_observations`** | 3 | Historical hourly rainfall records for Delhi. |
| **`audit_logs`** | 1 | Initial audit record for system initialization. |

---

## 3. How to Execute the Seed Script

Once the PostgreSQL + PostGIS database is running (`docker compose up -d` and migrations applied):

```bash
cd server
npx prisma db seed
```

The script is idempotent: running it multiple times updates records safely via `ON CONFLICT` and Prisma `upsert`.
