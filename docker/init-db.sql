-- ==============================================================================
-- Pravah V2 - Database Initialization Script
-- Automatically executed on initial container startup by /docker-entrypoint-initdb.d
-- ==============================================================================

-- Enable PostGIS spatial database extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable PostGIS topology support (optional, useful for boundary topology)
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Enable UUID generator extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log installed PostGIS version to server logs for verification
DO $$
BEGIN
    RAISE NOTICE 'PostGIS Extension initialized successfully. Version: %', PostGIS_Full_Version();
END $$;
