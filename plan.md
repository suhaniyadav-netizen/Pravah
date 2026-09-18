# PRAVAH V2 — MASTER IMPLEMENTATION PLAN

## Project Overview

Pravah V2 is a production-oriented urban flood and waterlogging monitoring, risk assessment, forecasting, incident management, and response-support platform for Delhi municipal wards.

Pravah V1 is an existing prototype and MUST remain untouched.

V2 is being developed independently in the separate worktree:

    Projects/
    ├── Pravah/          # V1 / main — DO NOT TOUCH
    └── Pravah-V2/       # V2 / pravah-v2 — ALL V2 WORK HAPPENS HERE

Current V2 branch:

    pravah-v2

Do not change the Git remote.

The objective is NOT to blindly convert V1. V2 should be a deliberate architectural redesign that preserves useful domain concepts while replacing weak prototype architecture.

---

# 1. FINAL TECHNOLOGY STACK

## Frontend

- React
- Vite
- Tailwind CSS
- Leaflet.js
- Recharts
- Axios or native fetch where appropriate
- React Router

### Why

React is appropriate because V2 will contain multiple complex views:
- citizen portal
- admin dashboard
- ward intelligence
- incident management
- response team dashboard
- analytics
- forecasting
- what-if simulation

Leaflet is required for the geospatial ward map.

Recharts is used for:
- rainfall trends
- risk trends
- historical incidents
- ward analytics
- forecast visualization

Do not introduce unnecessary frontend libraries.

---

# 2. BACKEND

## Primary application backend

- Node.js
- Express.js

Responsibilities:
- REST API
- authentication
- authorization
- user management
- complaints
- incidents
- response teams
- risk engine orchestration
- weather ingestion
- analytics APIs
- WebSocket events
- audit logging

## Realtime

- Socket.IO

Use Socket.IO for:
- risk updates
- new complaints
- incident changes
- response-team changes
- weather updates
- dashboard notifications

Do not introduce Kafka, Redis, RabbitMQ, or other messaging infrastructure unless a real later requirement justifies it.

---

# 3. DATABASE

## PostgreSQL

Use PostgreSQL as the primary persistent database.

Reasons:
- strong relational model
- transactions
- constraints
- reliable persistence
- relationships between wards, complaints, incidents, users, teams, assignments, history, etc.

## Spatial database

- PostGIS

PostGIS is mandatory for the V2 GIS architecture.

Use it for:
- actual ward boundaries
- point-in-polygon queries
- infrastructure locations
- complaint coordinates
- incident locations
- distance/radius queries
- spatial filtering
- ward adjacency where useful

Do NOT replace PostGIS with a simplistic latitude/longitude-only implementation.

---

# 4. ORM / DATABASE ACCESS

## Prisma

Use Prisma for normal database access and schema management.

For advanced PostGIS operations where Prisma does not provide an appropriate abstraction, use carefully controlled raw SQL.

Do not force complex spatial operations into awkward ORM abstractions.

---

# 5. AUTHENTICATION AND SECURITY

## Authentication

- JWT

## Password hashing

- Prefer Argon2id.
- bcrypt is acceptable if dependency compatibility requires it.

## Validation

- Zod

## Security controls

Implement:
- password hashing
- JWT authentication
- role-based authorization
- protected backend routes
- input validation
- rate limiting
- secure CORS
- security headers
- audit logging
- safe error responses
- environment-variable based secrets
- no hardcoded credentials

Potential roles:

- ADMIN
- CITIZEN
- RESPONSE_TEAM
- ANALYST

Do not implement RBAC until its dedicated phase. Phase 1 is database infrastructure/schema only.

---

# 6. EXTERNAL DATA

## Weather

Primary:
- Open-Meteo

Use it for:
- rainfall/precipitation
- forecast information
- weather conditions
- time-series weather observations

External API failures must eventually be handled gracefully through:
- timeout handling
- validation
- caching
- stale-data detection
- fallback behavior

Do not claim live/real-time data when the system is using stale or simulated data.

---

# 7. RISK ENGINE

The V2 risk engine must be explainable.

Potential inputs:

- rainfall
- drainage capacity
- water level
- active complaints
- historical vulnerability
- infrastructure exposure
- recent risk trend

Output:

- risk score: 0–100
- risk level
- risk drivers
- supporting metrics
- recommendation inputs
- data freshness / confidence information where appropriate

Do NOT simply copy the V1 50/30/20 formula without evaluating it.

Do NOT use fake ML.

---

# 8. FORECASTING

Python may be introduced specifically for forecasting/statistical analysis when justified.

Initial approach:
- establish a transparent baseline
- use historical data
- evaluate whether ML actually adds value
- only then introduce scikit-learn or another ML library

Do not create a Python microservice during Phase 1.

Do not claim forecasting exists until a real forecasting implementation exists.

---

# 9. TESTING

Node:
- Jest
- Supertest

Python:
- Pytest

Eventually test:
- authentication
- authorization
- API endpoints
- validation
- database operations
- GIS queries
- risk engine
- forecasting
- incident lifecycle
- security controls

---

# 10. DOCUMENTATION

Use:
- OpenAPI / Swagger
- README
- architecture documentation
- database documentation
- setup documentation

The final project should be understandable by another developer.

---

# 11. CONTAINERIZATION AND DEPLOYMENT

Use Docker primarily for local development.

Initial local infrastructure:

    Docker Compose
        └── PostgreSQL + PostGIS

Deployment target:

    Frontend → Vercel
    Backend  → Render or Railway
    Database  → Managed PostgreSQL + PostGIS

Do not add Kubernetes or unnecessary cloud infrastructure.

---

# IMPLEMENTATION PHASES

The project MUST be implemented incrementally.

Do not attempt to build the entire project in one prompt.

Each phase must:
1. inspect the current implementation
2. make only the required changes
3. test the changes
4. report exactly what changed
5. report any assumptions
6. avoid unrelated refactoring
7. wait for review before moving to the next phase

---

# PHASE 0 — FOUNDATION AND SAFETY

## Goal

Prepare the V2 worktree without implementing major functionality.

Requirements:
- verify branch is `pravah-v2`
- verify V2 worktree path
- verify V1 is separate
- inspect current V2 repository
- preserve Git remote
- establish project structure
- initialize React/Vite frontend if not already initialized
- initialize Node/Express backend if not already initialized
- establish environment-variable conventions
- establish .gitignore
- establish basic README/project documentation
- establish frontend/backend communication

Never:
- modify V1
- change Git remote
- delete V1 files
- reset branches
- force push

---

# PHASE 1 — DATABASE AND DATA ARCHITECTURE

This is the current phase.

Phase 1 is divided into:

## 1A — PostgreSQL + PostGIS infrastructure

## 1B — Core database schema

## 1C — GIS / ward data architecture

## 1D — Seed data

## 1E — Database verification

Do NOT skip directly to application features.

---

# PHASE 1A — POSTGRESQL + POSTGIS INFRASTRUCTURE

## Goal

Create a reliable local PostgreSQL/PostGIS development environment.

### Requirements

1. Inspect the existing V2 repository before making changes.
2. Inspect:
   - package.json
   - server structure
   - existing configuration
   - README
   - AGENTS.md if present
   - .gitignore
   - current Git status
   - current branch
3. Create Docker Compose configuration for PostgreSQL + PostGIS.
4. Use a maintained PostGIS-enabled PostgreSQL image.
5. Use environment variables for:
   - database name
   - database user
   - database password
   - database port
   - database host where appropriate
6. Create .env.example.
7. Never commit real secrets.
8. Add appropriate .env files to .gitignore.
9. Configure the Node backend so database connection configuration can later be consumed cleanly.
10. Do not add Prisma models yet.
11. Do not import ward data yet.
12. Do not build authentication yet.
13. Do not build API features yet.
14. Do not modify frontend functionality.

### Expected local structure

The exact structure may differ if the existing V2 architecture already establishes conventions, but conceptually:

    Pravah-V2/
    ├── client/
    ├── server/
    ├── docs/
    ├── docker-compose.yml
    ├── .env.example
    ├── .gitignore
    └── README.md

Do not restructure unnecessarily.

### Verification

Verify:
- Docker configuration is syntactically valid.
- PostgreSQL/PostGIS container starts.
- Database accepts connections.
- PostGIS extension is available.
- Database can execute a spatial query.

Example verification concept:

    SELECT PostGIS_Version();

Do not expose passwords in logs.

---

# PHASE 1B — CORE DATABASE SCHEMA

After infrastructure works, design the schema.

Potential core entities:

    users
    wards
    complaints
    incidents
    response_teams
    assignments
    risk_snapshots
    weather_observations
    infrastructure
    audit_logs

Important:
Do not create unnecessary fields merely to make the schema look large.

Every field should have a clear purpose.

---

# USER ENTITY

Purpose:
Authentication and ownership/audit relationships.

Likely fields:

- id
- name
- email
- password_hash
- role
- created_at
- updated_at
- is_active

Do not store plaintext passwords.

Do not implement authentication logic in Phase 1.

---

# WARD ENTITY

Purpose:
Delhi municipal ward identity and geography.

Likely fields:

- id
- ward_code
- ward_name
- geometry
- drainage_capacity
- created_at
- updated_at

Geometry must support PostGIS.

Do not store only a centroid as the primary ward geometry.

Ward code must be unique.

Do not invent official ward data.

---

# COMPLAINT ENTITY

Purpose:
Citizen-reported waterlogging.

Likely concepts:

- id
- ward_id
- reported_by where applicable
- location
- description
- severity
- status
- created_at
- updated_at
- resolved_at where applicable

Location should be spatially queryable.

Do not overdesign the complaint schema before the incident workflow phase.

---

# INCIDENT ENTITY

Purpose:
Operational flood/waterlogging event.

Potential fields:

- id
- ward_id
- complaint_id where applicable
- location
- severity
- status
- description
- created_at
- updated_at
- resolved_at

Lifecycle will be finalized in the incident phase.

---

# RESPONSE TEAM ENTITY

Purpose:
Teams that respond to incidents.

Potential fields:

- id
- name
- status
- current_location
- created_at
- updated_at

Do not build dispatch logic yet.

---

# ASSIGNMENT ENTITY

Purpose:
Connect response teams to incidents.

Potential fields:

- id
- incident_id
- response_team_id
- assigned_at
- started_at
- completed_at
- status

Use relational constraints.

---

# RISK SNAPSHOT ENTITY

Purpose:
Store historical risk calculations.

Potential fields:

- id
- ward_id
- risk_score
- risk_level
- rainfall_component
- drainage_component
- water_level_component
- complaint_component
- historical_component where justified
- calculated_at

The exact scoring components should be finalized in Phase 4.

Schema design must allow evolution.

---

# WEATHER OBSERVATION ENTITY

Purpose:
Persist normalized weather observations.

Potential concepts:

- timestamp
- source
- rainfall
- precipitation
- relevant weather fields
- location/area reference where needed
- fetched_at

Do not tightly couple the schema to one external provider if avoidable.

---

# INFRASTRUCTURE ENTITY

Purpose:
Represent flood-relevant infrastructure.

Examples:
- drainage infrastructure
- pumps
- hospitals
- schools
- major roads
- emergency facilities

Likely concepts:

- id
- type
- name
- location
- ward_id where applicable
- status
- metadata
- created_at
- updated_at

Use spatial data.

Do not invent infrastructure records without marking them as demo/synthetic data.

---

# AUDIT LOG ENTITY

Purpose:
Record sensitive administrative/system actions.

Potential fields:

- id
- actor_user_id
- action
- entity_type
- entity_id
- metadata
- timestamp
- ip_address where appropriate and legally/operationally justified

Do not store unnecessary sensitive information.

---

# RELATIONSHIPS

At minimum, design the following logical relationships:

    Ward
      ├── Complaints
      ├── Incidents
      ├── Risk Snapshots
      └── Infrastructure

    User
      ├── Complaints
      └── Audit Logs

    Incident
      └── Assignments

    Response Team
      └── Assignments

Use foreign keys and appropriate indexes.

---

# DATABASE CONSTRAINTS

Use database-level constraints where appropriate.

Examples:
- unique ward code
- unique user email
- valid non-negative values where applicable
- foreign-key integrity
- required timestamps
- appropriate enum/check constraints where supported

Do not rely exclusively on frontend validation.

---

# DATABASE INDEXING

Add indexes based on actual access patterns.

Likely:
- user email
- ward code
- complaint ward/status
- incident ward/status
- risk snapshot ward + timestamp
- weather timestamp
- assignment incident/team
- spatial indexes for PostGIS geometry fields

Do not create indexes for every column.

---

# PHASE 1C — GIS / WARD DATA ARCHITECTURE

## Goal

Replace V1 centroid-only ward representation with actual ward geometries.

Requirements:
- identify the appropriate Delhi municipal ward boundary dataset
- verify source/licensing/availability
- do not fabricate boundaries
- store boundaries as PostGIS geometry
- use a consistent coordinate reference system
- create spatial indexes
- support point-in-polygon lookup

The system must eventually support:

    complaint coordinates
           ↓
    spatial lookup
           ↓
    containing ward

And:

    infrastructure point
           ↓
    spatial lookup
           ↓
    containing ward

If official MCD boundary data is not available or cannot be verified, use clearly labelled demo geometry only and document the limitation.

Do not silently present synthetic geometry as official boundaries.

---

# PHASE 1D — SEED DATA

Create controlled development seed data.

Seed only what is necessary.

Possible seed categories:

- demo users
- sample wards
- sample complaints
- sample incidents
- sample response teams
- sample infrastructure
- sample historical risk snapshots
- sample weather observations

Every synthetic record must be clearly identifiable as development/demo data where appropriate.

Do not copy V1 CSVs blindly.

Instead:
1. inspect V1 data structure
2. identify useful fields
3. map them into the new schema
4. preserve data meaning
5. document transformations
6. keep synthetic/demo data distinguishable

Do not modify V1 files during this process.

---

# PHASE 1E — DATABASE VERIFICATION

Before declaring Phase 1 complete, verify:

## Infrastructure

- Docker Compose works
- PostgreSQL starts
- PostGIS extension exists
- database connection works

## Schema

- migrations work
- tables exist
- relationships work
- constraints work
- indexes exist

## GIS

- geometry can be stored
- spatial index exists
- point-in-polygon query works
- coordinate system is consistent

## Data

- seed script works
- seeded records satisfy constraints
- no plaintext passwords
- no real secrets

## Backend

- Node backend can connect to DB
- connection failure is handled cleanly
- no credentials are hardcoded

---

# PHASE 1 DEFINITION OF DONE

Phase 1 is complete only when:

- PostgreSQL + PostGIS runs locally
- Prisma is configured
- schema is versioned through migrations
- core entities exist
- relationships and constraints exist
- spatial data architecture exists
- appropriate spatial indexes exist
- seed data can be loaded
- Node backend can connect to the database
- a basic database health check succeeds
- a basic PostGIS spatial query succeeds
- documentation explains setup
- no V1 files were modified
- no Git remote was changed
- no unrelated dependencies were added
- tests/checks pass
- changes are reviewed before commit

---

# PHASE 2 — AUTHENTICATION + RBAC

Only begin after Phase 1 is reviewed.

Implement:
- registration/login as required
- JWT
- Argon2id/bcrypt
- auth middleware
- role authorization
- protected admin routes
- protected response-team routes
- protected analyst routes
- citizen permissions
- secure error handling

This phase directly addresses V1's weak backend authorization.

---

# PHASE 3 — GIS / WARD SYSTEM

Build:
- real ward polygons
- map integration
- ward lookup
- ward search
- spatial complaint-to-ward mapping
- infrastructure-to-ward mapping
- risk visualization
- ward detail views

---

# PHASE 4 — RISK ENGINE V2

Replace the V1 simplistic calculation with an explainable risk engine.

Requirements:
- normalized inputs
- configurable weights
- risk score 0–100
- risk levels
- individual driver contributions
- missing-data handling
- freshness indicators
- unit tests

Do not pretend that a deterministic formula is ML.

---

# PHASE 5 — WEATHER / DATA INGESTION

Integrate Open-Meteo.

Implement:
- scheduled/manual ingestion
- normalization
- persistence
- validation
- caching
- timestamps
- stale-data handling
- failure handling

---

# PHASE 6 — FORECASTING

Build actual forecasting.

Potential horizons:
- 6h
- 12h
- 24h

Start with a transparent baseline.

Evaluate:
- historical data availability
- prediction quality
- error metrics
- baseline vs ML

Only add ML if justified.

---

# PHASE 7 — COMPLAINTS + INCIDENTS

Build:
- citizen complaint creation
- geolocation
- optional media
- severity
- status
- verification
- incident creation
- incident lifecycle
- resolution

Suggested lifecycle:

    REPORTED
       ↓
    VERIFIED
       ↓
    ASSIGNED
       ↓
    IN_PROGRESS
       ↓
    RESOLVED
       ↓
    CLOSED

Final statuses should be reviewed before implementation.

---

# PHASE 8 — RESPONSE TEAM MANAGEMENT

Build:
- teams
- team status
- equipment/resources
- incident assignments
- assignment status
- operational dashboard

Do not implement advanced routing until basic dispatch works.

---

# PHASE 9 — SIGNATURE FEATURE

## "What Should the City Do Now?"

Build an explainable decision-support system.

Inputs:
- risk score
- risk drivers
- incident severity
- location
- available resources
- infrastructure
- current conditions

Output:
- recommended actions
- reason for recommendation
- priority
- expected effect where it can be calculated defensibly

Do not use an LLM as the core decision engine.

---

# PHASE 10 — WHAT-IF SIMULATOR

Allow authorized users to modify scenario variables:

- rainfall
- drainage capacity
- complaints
- water level
- pump deployment
- other justified intervention variables

Show:

    Current scenario
    vs
    Simulated scenario

Clearly label simulations as simulations.

---

# PHASE 11 — REAL-TIME SOCKET.IO

Implement events:

    RISK_UPDATED
    NEW_COMPLAINT
    INCIDENT_CREATED
    INCIDENT_UPDATED
    TEAM_DISPATCHED
    WEATHER_UPDATED

Handle:
- reconnects
- authorization
- stale clients
- event validation

---

# PHASE 12 — ANALYTICS

Build:
- historical risk trends
- rainfall trends
- complaint trends
- incident frequency
- resolution time
- ward comparisons
- infrastructure vulnerability
- historical hotspots

Do not create misleading statistics from insufficient data.

Always distinguish:
- current
- historical
- simulated
- predicted

---

# PHASE 13 — SECURITY HARDENING

Perform security review covering:

- authentication
- authorization
- IDOR
- injection
- validation
- rate limits
- CORS
- security headers
- token handling
- secrets
- audit logs
- file uploads if implemented
- API abuse
- error leakage

Use OWASP concepts where applicable.

---

# PHASE 14 — TESTING + RELIABILITY

Implement:
- unit tests
- integration tests
- API tests
- database tests
- GIS tests
- risk-engine tests
- auth tests
- authorization tests
- forecasting tests

Test failure scenarios:
- database unavailable
- external weather API unavailable
- malformed requests
- stale data
- invalid coordinates
- unauthorized access
- duplicate submissions

---

# PHASE 15 — DEPLOYMENT + PRODUCTION POLISH

Final deployment:

    React/Vite → Vercel
    Node/Express → Render/Railway
    PostgreSQL/PostGIS → Managed DB

Final checklist:
- production env vars
- CORS
- HTTPS
- logging
- health checks
- database migrations
- backups
- monitoring
- API docs
- README
- architecture diagram
- setup guide
- security notes
- demo account/data documentation
- screenshots
- final project demo

---

# GLOBAL DEVELOPMENT RULES

## Rule 1 — V1 is sacred

Never modify:

    Projects/Pravah/

All V2 work stays inside:

    Projects/Pravah-V2/

---

## Rule 2 — No giant implementation

Never implement multiple major phases in one task.

Complete one phase/subphase, verify it, review it, then proceed.

---

## Rule 3 — Inspect before modifying

Before every major task:
- inspect relevant existing files
- understand current architecture
- state intended changes
- avoid assumptions

---

## Rule 4 — Minimal dependencies

Do not install a library unless:
- it solves a real requirement
- the requirement cannot reasonably be handled by existing tools
- its maintenance/compatibility is reasonable

---

## Rule 5 — No fake functionality

Never label:
- current data as real-time if it is not
- current risk as prediction
- synthetic data as official
- a rule-based score as ML
- simulated interventions as real-world effects

---

## Rule 6 — Security by design

Do not build insecure functionality first and "secure it later" when the security boundary is obvious.

Especially:
- backend authorization
- secrets
- passwords
- input validation
- database access

---

## Rule 7 — Explainability

Important risk and operational decisions should have explainable reasons.

---

## Rule 8 — Preserve maintainability

Prefer:
- modular monolith
- clear folder structure
- reusable services
- typed/validated boundaries
- documented APIs

Avoid premature microservices.

---

## Rule 9 — Test incrementally

Every phase should leave the application in a working state.

---

## Rule 10 — Git discipline

Before any destructive Git command:
STOP and ask for explicit confirmation.

Do not:
- reset
- clean
- force push
- rewrite history
- change remotes

without explicit approval.

Normal commits should be made only after the relevant phase is reviewed.

---

# ANTIGRAVITY WORKFLOW

Antigravity is the implementation agent.

For every phase:

1. Read this PLAN.md.
2. Inspect the repository.
3. Identify the current phase.
4. Explain the intended changes.
5. Implement only that phase.
6. Run appropriate checks/tests.
7. Show changed files.
8. Report assumptions.
9. Report anything that remains unresolved.
10. STOP and wait for human review.

Never automatically continue into the next major phase.

---

# CURRENT TASK

The current task is:

## PHASE 1A — POSTGRESQL + POSTGIS INFRASTRUCTURE

Before changing anything:

1. Inspect the V2 repository.
2. Confirm current branch and worktree.
3. Confirm the V1 worktree is separate.
4. Inspect existing package/configuration files.
5. Show a concise implementation plan.
6. Identify exactly which files will be created/modified.

Then wait for approval before making changes.

After implementation:
- validate Docker Compose
- start PostgreSQL/PostGIS if Docker is available
- verify DB connectivity
- verify PostGIS
- verify a basic spatial query
- show changed files
- do not commit
- do not push
- do not modify V1

END OF PLAN
