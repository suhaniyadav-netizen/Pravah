-- ==============================================================================
-- Migration: 0_init
-- Pravah V2 - Phase 1B Core Database Schema
-- ==============================================================================

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create Enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CITIZEN', 'RESPONSE_TEAM', 'ANALYST');
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ComplaintStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');
CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'INVESTIGATING', 'CONTAINED', 'RESOLVED');
CREATE TYPE "TeamStatus" AS ENUM ('AVAILABLE', 'DISPATCHED', 'ON_SCENE', 'OFF_DUTY');
CREATE TYPE "AssignmentStatus" AS ENUM ('DISPATCHED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
CREATE TYPE "InfrastructureType" AS ENUM ('PUMP_STATION', 'DRAIN_OUTFALL', 'HOSPITAL', 'EMERGENCY_SHELTER', 'UNDERPASS');
CREATE TYPE "InfrastructureStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'OFFLINE');

-- 3. Create Tables

-- Users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Wards
CREATE TABLE "wards" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ward_code" TEXT NOT NULL,
    "ward_name" TEXT NOT NULL,
    "boundary" geometry(MultiPolygon, 4326),
    "drainage_capacity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "population_density" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- Complaints
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ward_id" UUID NOT NULL,
    "reported_by" UUID,
    "location" geometry(Point, 4326) NOT NULL,
    "address" TEXT,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
    "water_depth_cm" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- Incidents
CREATE TABLE "incidents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ward_id" UUID NOT NULL,
    "primary_complaint_id" UUID,
    "location" geometry(Point, 4326) NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "water_depth_cm" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- Response Teams
CREATE TABLE "response_teams" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "status" "TeamStatus" NOT NULL DEFAULT 'AVAILABLE',
    "contact_phone" TEXT,
    "current_location" geometry(Point, 4326),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "response_teams_pkey" PRIMARY KEY ("id")
);

-- Assignments
CREATE TABLE "assignments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "incident_id" UUID NOT NULL,
    "response_team_id" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DISPATCHED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- Risk Snapshots
CREATE TABLE "risk_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ward_id" UUID NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "drainage_component" DOUBLE PRECISION NOT NULL,
    "rainfall_component" DOUBLE PRECISION NOT NULL,
    "complaint_component" DOUBLE PRECISION NOT NULL,
    "water_level_component" DOUBLE PRECISION,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_snapshots_pkey" PRIMARY KEY ("id")
);

-- Weather Observations
CREATE TABLE "weather_observations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "source" TEXT NOT NULL DEFAULT 'Open-Meteo',
    "station_name" TEXT,
    "rainfall_mm" DOUBLE PRECISION NOT NULL,
    "precipitation_probability" DOUBLE PRECISION,
    "temperature_c" DOUBLE PRECISION,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weather_observations_pkey" PRIMARY KEY ("id")
);

-- Infrastructure
CREATE TABLE "infrastructure" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ward_id" UUID,
    "type" "InfrastructureType" NOT NULL,
    "name" TEXT NOT NULL,
    "location" geometry(Point, 4326) NOT NULL,
    "capacity_value" DOUBLE PRECISION,
    "status" "InfrastructureStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "infrastructure_pkey" PRIMARY KEY ("id")
);

-- Audit Logs
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- 4. Unique Constraints
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "wards_ward_code_key" ON "wards"("ward_code");

-- 5. Standard B-Tree Indexes
CREATE INDEX "complaints_ward_id_status_idx" ON "complaints"("ward_id", "status");
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at");
CREATE INDEX "incidents_ward_id_status_idx" ON "incidents"("ward_id", "status");
CREATE INDEX "incidents_created_at_idx" ON "incidents"("created_at");
CREATE INDEX "assignments_incident_id_response_team_id_idx" ON "assignments"("incident_id", "response_team_id");
CREATE INDEX "assignments_status_idx" ON "assignments"("status");
CREATE INDEX "risk_snapshots_ward_id_calculated_at_idx" ON "risk_snapshots"("ward_id", "calculated_at" DESC);
CREATE INDEX "weather_observations_observed_at_idx" ON "weather_observations"("observed_at" DESC);
CREATE INDEX "infrastructure_ward_id_type_idx" ON "infrastructure"("ward_id", "type");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- 6. Spatial GiST Indexes (PostGIS)
CREATE INDEX "idx_wards_boundary" ON "wards" USING GIST ("boundary");
CREATE INDEX "idx_complaints_location" ON "complaints" USING GIST ("location");
CREATE INDEX "idx_incidents_location" ON "incidents" USING GIST ("location");
CREATE INDEX "idx_infrastructure_location" ON "infrastructure" USING GIST ("location");
CREATE INDEX "idx_response_teams_location" ON "response_teams" USING GIST ("current_location");

-- 7. Foreign Key Constraints
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents" ADD CONSTRAINT "incidents_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_primary_complaint_id_fkey" FOREIGN KEY ("primary_complaint_id") REFERENCES "complaints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assignments" ADD CONSTRAINT "assignments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_response_team_id_fkey" FOREIGN KEY ("response_team_id") REFERENCES "response_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "risk_snapshots" ADD CONSTRAINT "risk_snapshots_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "infrastructure" ADD CONSTRAINT "infrastructure_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
