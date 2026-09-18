/**
 * Weather Ingestion & Forecast API Routes
 * Pravah V2 - Phase 5
 */

const express = require('express');
const {
  getCurrentWeather,
  getWeatherForecast,
  getWeatherHistory,
} = require('../services/weather.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * GET /api/weather/current
 * Public: Returns current normalized weather observation for Delhi.
 */
router.get('/current', async (req, res, next) => {
  try {
    const weather = await getCurrentWeather();
    res.status(200).json(weather);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/weather/forecast
 * Public: Returns 24-hour hourly precipitation and temperature forecast.
 */
router.get('/forecast', async (req, res, next) => {
  try {
    const forecast = await getWeatherForecast();
    res.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/weather/ingest
 * Protected (ADMIN, ANALYST): Forces immediate re-ingestion from Open-Meteo, bypassing cache.
 */
router.post('/ingest', authenticate, authorize('ADMIN', 'ANALYST'), async (req, res, next) => {
  try {
    const refreshed = await getCurrentWeather(true);
    res.status(200).json({
      message: 'Weather observation refreshed from Open-Meteo.',
      refreshedAt: new Date().toISOString(),
      observation: refreshed,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/weather/history
 * Public: Returns recent persisted weather observations.
 */
router.get('/history', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const history = await getWeatherHistory(limit);
    res.status(200).json({
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
