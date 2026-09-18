/**
 * Decision-Support Engine API Routes
 * Pravah V2 - Phase 9 Signature Feature: "What Should the City Do Now?"
 */

const express = require('express');
const { z } = require('zod');
const {
  getDecisionMetadata,
  evaluateWardDecision,
  evaluateCityDecision,
  evaluateCustomEmergency,
} = require('../services/decision-support.service');

const router = express.Router();

const customEvaluationSchema = z.object({
  wardId: z.string().min(1).default('WARD-056'),
  riskScore: z.number().min(0).max(100).default(80.0),
  primaryDriver: z.enum(['DRAINAGE_DEFICIT', 'RAINFALL_SURGE', 'CITIZEN_URGENCY']).default('DRAINAGE_DEFICIT'),
  rainfallMm: z.number().min(0).max(500).default(45.0),
  avgWaterDepthCm: z.number().min(0).max(300).default(40.0),
  activeIncidentsCount: z.number().min(0).default(1),
});

/**
 * GET /api/decision-support/metadata
 * Returns decision categories, priorities, and action types.
 */
router.get('/metadata', (req, res) => {
  res.status(200).json(getDecisionMetadata());
});

/**
 * GET /api/decision-support/city
 * Executive City Action Plan: Prioritized recommendations across all wards.
 */
router.get('/city', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 15;
    const minPriority = req.query.minPriority || null;

    const plan = await evaluateCityDecision({ limit, minPriority });
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/decision-support/ward/:id
 * Tactical Action Plan for a specific municipal ward.
 */
router.get('/ward/:id', async (req, res, next) => {
  try {
    const wardId = req.params.id;
    const overrides = {};

    if (req.query.riskScore !== undefined) {
      overrides.riskScore = parseFloat(req.query.riskScore);
    }
    if (req.query.rainfallMm !== undefined) {
      overrides.rainfallMm = parseFloat(req.query.rainfallMm);
    }
    if (req.query.avgWaterDepthCm !== undefined) {
      overrides.avgWaterDepthCm = parseFloat(req.query.avgWaterDepthCm);
    }

    const plan = await evaluateWardDecision(wardId, overrides);
    res.status(200).json(plan);
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Not Found', message: error.message });
    }
    next(error);
  }
});

/**
 * POST /api/decision-support/evaluate
 * Evaluates custom emergency conditions for tactical planning & simulation.
 */
router.post('/evaluate', async (req, res, next) => {
  try {
    const parsed = customEvaluationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.format(),
      });
    }

    const plan = await evaluateCustomEmergency(parsed.data);
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
