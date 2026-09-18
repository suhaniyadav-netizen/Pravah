/**
 * Historical Analytics API Routes
 * Pravah V2 - Phase 12
 */

const express = require('express');
const {
  getHistoricalRiskTrends,
  getHistoricalRainfallTrends,
  getComplaintResolutionMetrics,
  getHistoricalHotspots,
  compareWards,
  getInfrastructureVulnerabilitySummary,
} = require('../services/analytics.service');

const router = express.Router();

/**
 * GET /api/analytics/trends/risk
 * Historical risk score trends per ward or city-wide.
 */
router.get('/trends/risk', async (req, res, next) => {
  try {
    const { wardId, rangeDays } = req.query;
    const trends = await getHistoricalRiskTrends({ wardId, rangeDays });
    res.status(200).json(trends);
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Not Found', message: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/analytics/trends/rainfall
 * Historical daily precipitation totals and rolling averages.
 */
router.get('/trends/rainfall', async (req, res, next) => {
  try {
    const { rangeDays } = req.query;
    const trends = await getHistoricalRainfallTrends({ rangeDays });
    res.status(200).json(trends);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/complaints/resolution-metrics
 * Mean Time to Resolution (MTTR) and complaint resolution SLA analytics.
 */
router.get('/complaints/resolution-metrics', async (req, res, next) => {
  try {
    const { wardId, rangeDays } = req.query;
    const metrics = await getComplaintResolutionMetrics({ wardId, rangeDays });
    res.status(200).json(metrics);
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Not Found', message: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/analytics/hotspots
 * Recurring historical flood and waterlogging hotspots.
 */
router.get('/hotspots', (req, res) => {
  const { limit, zone } = req.query;
  const hotspots = getHistoricalHotspots({ limit, zone });
  res.status(200).json(hotspots);
});

/**
 * GET /api/analytics/wards/compare
 * Comparative multi-ward vulnerability benchmarking.
 */
router.get('/wards/compare', async (req, res, next) => {
  try {
    let wardIds = [];
    if (req.query.wardIds) {
      wardIds = req.query.wardIds.split(',').map((id) => id.trim());
    }

    if (wardIds.length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide at least 2 comma-separated ward IDs to compare (e.g. ?wardIds=W001,W056).',
      });
    }

    const comparison = await compareWards({ wardIds });
    res.status(200).json(comparison);
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({ error: error.name || 'Error', message: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/analytics/infrastructure/vulnerability
 * City-wide infrastructure vulnerability audit.
 */
router.get('/infrastructure/vulnerability', async (req, res, next) => {
  try {
    const summary = await getInfrastructureVulnerabilitySummary();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
