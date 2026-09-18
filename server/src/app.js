/**
 * Express Application Configuration
 * Pravah V2 - Phase 2
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const rbacRoutes = require('./routes/rbac-test.routes');
const wardRoutes = require('./routes/ward.routes');
const riskRoutes = require('./routes/risk.routes');
const weatherRoutes = require('./routes/weather.routes');
const forecastingRoutes = require('./routes/forecasting.routes');
const complaintRoutes = require('./routes/complaint.routes');
const incidentRoutes = require('./routes/incident.routes');
const responseTeamRoutes = require('./routes/response-team.routes');
const decisionRoutes = require('./routes/decision.routes');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'Pravah V2 Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/test-rbac', rbacRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/forecasting', forecastingRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/response-teams', responseTeamRoutes);
app.use('/api/decision-support', decisionRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  console.error(`[Error] ${statusCode} - ${err.message}`);
  if (!isProd && statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.',
    ...(isProd ? {} : { stack: err.stack }),
  });
});

module.exports = app;
