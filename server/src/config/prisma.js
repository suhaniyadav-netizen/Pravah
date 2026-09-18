/**
 * Prisma Client Singleton Instance
 * Pravah V2 - Phase 1B
 */

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, avoid exhausting connection pool across hot reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: process.env.PRISMA_LOG === 'true' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
