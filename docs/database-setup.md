# Pravah V2 — Database Infrastructure Setup (Phase 1A)

This document provides setup and verification instructions for the local PostgreSQL + PostGIS database environment.

---

## 1. Overview

Pravah V2 requires **PostgreSQL 16** with the **PostGIS 3.4** spatial database extension. This database stores ward boundaries, spatial geometries, citizen complaints, operational incidents, and flood risk metrics.

---

## 2. Prerequisites

1. **Node.js**: v18.0.0 or higher (`node -v`)
2. **Docker & Docker Compose**: Docker Desktop (Windows/Mac) or Docker Engine with Docker Compose v2 (Linux)

> **Current Environment Status Note**:  
> In the current development environment, Docker Desktop is not yet detected on the system `PATH`. The infrastructure files, configuration loaders, and automated verification scripts are ready. Actual database startup and `SELECT PostGIS_Version()` execution will be performed once Docker Desktop is running.

---

## 3. Configuration

1. Copy `.env.example` to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Verify or update the environment variables:
   - `POSTGRES_DB`: Name of the database (`pravah_v2`)
   - `POSTGRES_USER`: Database user (`pravah_user`)
   - `POSTGRES_PASSWORD`: Secure database password (`pravah_secure_dev_password`)
   - `POSTGRES_PORT`: Port exposed locally (`5432`)
   - `DATABASE_URL`: Full connection string (`postgresql://pravah_user:pravah_secure_dev_password@localhost:5432/pravah_v2?schema=public`)

---

## 4. Starting the Database Container

Start the PostGIS container in detached mode from the project root:

```bash
docker compose up -d
```

### Checking Container Health

```bash
docker compose ps
```

The database container (`pravah-v2-db`) automatically executes [docker/init-db.sql](../docker/init-db.sql) on first initialization, enabling:
- `postgis`
- `postgis_topology`
- `uuid-ossp`

To view logs:
```bash
docker compose logs -f db
```

---

## 5. Verification

Once the container is running, install server dependencies and execute the automated verification script:

```bash
cd server
npm install
npm run verify:db
```

The script executes:
1. `SELECT NOW();` (confirms connectivity)
2. `SELECT PostGIS_Version();` (confirms PostGIS extension is loaded)
3. `SELECT ST_AsText(ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326));` (confirms spatial operations function on Delhi coordinates)

---

## 6. Stopping the Container

To stop the database:
```bash
docker compose down
```

To stop and remove persistent data (reset database):
```bash
docker compose down -v
```
