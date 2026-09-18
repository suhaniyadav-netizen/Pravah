/**
 * Database Configuration & Connection Utility
 * Pravah V2 - Phase 1A
 */

const path = require('path');
const dotenv = require('dotenv');

// Attempt to load .env from server directory first, then root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'pravah_v2',
  user: process.env.POSTGRES_USER || 'pravah_user',
  password: process.env.POSTGRES_PASSWORD || 'pravah_secure_dev_password',
  connectionString: process.env.DATABASE_URL || undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

/**
 * Returns a sanitized configuration object safe for logging
 * (strips sensitive credentials like password and connection string credentials).
 */
function getSanitizedConfig() {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    hasPassword: Boolean(dbConfig.password),
    hasConnectionString: Boolean(dbConfig.connectionString),
  };
}

module.exports = {
  dbConfig,
  getSanitizedConfig,
};
