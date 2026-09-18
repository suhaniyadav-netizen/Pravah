/**
 * PostGIS & Database Verification Script
 * Pravah V2 - Phase 1A
 *
 * Verifies:
 * 1. Database connectivity
 * 2. PostGIS extension installation and version
 * 3. Execution of basic spatial SQL function (ST_MakePoint / ST_AsText)
 */

const { Pool } = require('pg');
const { dbConfig, getSanitizedConfig } = require('../config/db');

async function verifyDatabase() {
  console.log('--- Pravah V2: Database Connectivity & PostGIS Verification ---');
  console.log('Target Configuration (sanitized):', getSanitizedConfig());

  // Use connection string if provided, else individual credentials
  const poolConfig = dbConfig.connectionString
    ? {
        connectionString: dbConfig.connectionString,
        connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
      }
    : {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
      };

  const pool = new Pool(poolConfig);

  try {
    console.log('\nAttempting connection to PostgreSQL...');
    const client = await pool.connect();

    try {
      // 1. Check basic DB response
      const timeResult = await client.query('SELECT NOW() AS current_time;');
      console.log('✅ PostgreSQL connection successful. Server time:', timeResult.rows[0].current_time);

      // 2. Check PostGIS extension
      const postgisVersionResult = await client.query('SELECT PostGIS_Version();');
      const postgisVersion = postgisVersionResult.rows[0].postgis_version;
      console.log('✅ PostGIS extension detected. Version:', postgisVersion);

      // 3. Test basic spatial query (Coordinates for Delhi: 77.2090 E, 28.6139 N)
      const spatialResult = await client.query(
        'SELECT ST_AsText(ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)) AS sample_geom;'
      );
      console.log('✅ Spatial query executed successfully. Sample Point (WGS84):', spatialResult.rows[0].sample_geom);

      console.log('\nAll Phase 1A database & PostGIS checks passed successfully!');
      process.exit(0);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('\n❌ Database connection or PostGIS check failed.');
    console.error('Error code:', error.code || 'UNKNOWN');
    console.error('Message:', error.message);

    if (error.code === 'ECONNREFUSED' || error.message.includes('timeout')) {
      console.log('\n[Note]: Database container appears to be stopped or unreachable.');
      console.log('Ensure Docker Desktop is running and start the container with:');
      console.log('  docker compose up -d\n');
    }

    await pool.end().catch(() => {});
    process.exit(1);
  }
}

verifyDatabase();
