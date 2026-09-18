/**
 * JWT Configuration
 * Pravah V2 - Phase 2
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'pravah-v2-dev-secret-key-change-in-production-min32chars',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  issuer: 'pravah-v2-api',
};

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be defined in production environment.');
}

module.exports = jwtConfig;
