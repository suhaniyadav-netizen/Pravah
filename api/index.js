/**
 * Pravah — Vercel Serverless Function Entrypoint
 * Routes /api/* traffic directly into the Express application.
 */
const app = require('../server/src/app');

module.exports = app;
