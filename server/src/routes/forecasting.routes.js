/**
 * Flood Forecasting API Routes
 * Pravah V2 - Phase 6
 */

const express = require('express');
const {
  getWardForecast,
  getCityForecastOverview,
  getModelEvaluation,
} = require('../services/forecasting.service');

const router = express.Router();

/**
 * GET /api/forecasting/ward/:id
 * Public: Returns multi-horizon (6h, 12h, 24h) risk forecast for a specific ward.
 */
router.get('/ward/:id', async (req, res, next) => {
  try {
    const forecast = await getWardForecast(req.params.id);
    if (!forecast) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ward with ID or code '${req.params.id}' not found.`,
      });
    }
    res.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/forecasting/city
 * Public: Returns city-wide 24-hour escalation forecast overview.
 */
router.get('/city', async (req, res, next) => {
  try {
    const overview = await getCityForecastOverview();
    res.status(200).json(overview);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/forecasting/model-evaluation
 * Public: Returns transparent baseline model performance metrics and ML audit.
 */
router.get('/model-evaluation', (req, res) => {
  const evaluation = getModelEvaluation();
  res.status(200).json(evaluation);
});

module.exports = router;
