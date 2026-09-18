/**
 * Flood Risk Engine API Routes
 * Pravah V2 - Phase 4
 */

const express = require('express');
const { z } = require('zod');
const {
  getCityRiskSummary,
  getWardRiskDetails,
  evaluateRisk,
} = require('../services/risk-engine.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

const evaluateSchema = z.object({
  drainageCapacity: z.number().min(0).max(500).optional().default(50.0),
  rainfallMm: z.number().min(0).max(300).optional().default(0.0),
  complaintCount: z.number().min(0).max(1000).optional().default(0),
  avgWaterDepthCm: z.number().min(0).max(300).optional().default(0.0),
  weights: z
    .object({
      drainage: z.number().min(0).max(1).optional(),
      rainfall: z.number().min(0).max(1).optional(),
      complaints: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

/**
 * GET /api/risk/summary
 * Public: City-wide flood risk summary statistics & vulnerability distribution.
 */
router.get('/summary', async (req, res, next) => {
  try {
    const summary = await getCityRiskSummary();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risk/ward/:id
 * Public: Detailed explainable risk calculation for a specific ward.
 */
router.get('/ward/:id', async (req, res, next) => {
  try {
    const details = await getWardRiskDetails(req.params.id);
    if (!details) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ward with ID or code '${req.params.id}' not found.`,
      });
    }
    res.status(200).json(details);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risk/evaluate
 * Public: Dynamic scenario evaluation without saving to database.
 */
router.post('/evaluate', (req, res, next) => {
  try {
    const parsed = evaluateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const evaluation = evaluateRisk(parsed.data);
    res.status(200).json({
      status: 'success',
      scenarioInputs: parsed.data,
      evaluation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risk/recalculate
 * Protected: ADMIN or ANALYST can trigger recalculation.
 */
router.post('/recalculate', authenticate, authorize('ADMIN', 'ANALYST'), async (req, res, next) => {
  try {
    const summary = await getCityRiskSummary();
    res.status(200).json({
      status: 'success',
      message: 'Batch risk calculation completed successfully for all municipal wards.',
      actor: req.user.email,
      timestamp: new Date().toISOString(),
      updatedSummary: summary,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
