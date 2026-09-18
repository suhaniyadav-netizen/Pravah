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
const simulationRoutes = require('./routes/simulation.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adminRoutes = require('./routes/admin.routes');

const {
  authLimiter,
  publicMutationLimiter,
  generalApiLimiter,
  xssSanitizationMiddleware,
} = require('./middlewares/security.middleware');

const app = express();

// OWASP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://unpkg.com'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://api.open-meteo.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers & Input Sanitization
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(xssSanitizationMiddleware);

// Rate Limiting
app.use('/api/', generalApiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/complaints', publicMutationLimiter);

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
app.use('/api/simulation', simulationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Legacy V1 Frontend Compatibility Endpoints
const { getCityRiskSummary } = require('./services/risk-engine.service');
const { getCityForecastOverview } = require('./services/forecasting.service');
const { createComplaint } = require('./services/incident.service');
const { getWardById } = require('./services/ward.service');

app.get('/api/risk-summary', async (req, res, next) => {
  try {
    const summary = await getCityRiskSummary();
    res.status(200).json({
      ...summary,
      highRiskCount: (summary.countsByLevel?.critical || 0) + (summary.countsByLevel?.high || 0),
      mediumRiskCount: summary.countsByLevel?.moderate || 0,
      lowRiskCount: summary.countsByLevel?.low || 0,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/prediction', async (req, res, next) => {
  try {
    const overview = await getCityForecastOverview();
    res.status(200).json({
      ...overview,
      predictedFloods: overview.escalatingWardsCount || 6,
      horizons: [6, 12, 24],
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/complaint', async (req, res, next) => {
  try {
    const { ward_id, wardId, severity, description, longitude, latitude } = req.body;
    let lon = typeof longitude === 'number' ? longitude : null;
    let lat = typeof latitude === 'number' ? latitude : null;

    const targetWardId = ward_id || wardId;
    if ((lon === null || lat === null) && targetWardId) {
      const ward = await getWardById(targetWardId);
      if (ward && ward.centroid) {
        lon = ward.centroid.longitude;
        lat = ward.centroid.latitude;
      } else {
        lon = 77.094594;
        lat = 28.840484;
      }
    }

    const complaint = await createComplaint({
      longitude: parseFloat(lon),
      latitude: parseFloat(lat),
      description: description || 'Citizen reported waterlogging',
      severity: (severity || 'MEDIUM').toUpperCase(),
    });

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint,
    });
  } catch (err) {
    next(err);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware (Leakage Protected)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Sanitize internal database/password strings from error message
  let cleanMessage = err.message || 'An unexpected error occurred.';
  if (cleanMessage.includes('password') || cleanMessage.includes('postgresql://')) {
    cleanMessage = 'Database service error. Please contact system administrator.';
  }

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: cleanMessage,
  });
});

module.exports = app;
