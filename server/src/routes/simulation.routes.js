/**
 * What-If Simulation API Routes
 * Pravah V2 - Phase 10
 */

const express = require('express');
const { z } = require('zod');
const {
  getSimulationPresets,
  simulateWardScenario,
  simulateCityScenario,
} = require('../services/simulator.service');

const router = express.Router();

const wardSimulationSchema = z.object({
  wardId: z.string().min(1),
  presetId: z.string().optional().nullable(),
  rainfallMm: z.number().min(0).max(500).optional().nullable(),
  rainfallMultiplier: z.number().min(0.05).max(10.0).optional().nullable(),
  drainageModifierPct: z.number().min(-90).max(200).optional().default(0),
  additionalMobilePumps: z.number().int().min(0).max(20).optional().default(0),
  complaintSpike: z.number().int().min(0).max(500).optional().default(0),
  waterDepthCm: z.number().min(0).max(300).optional().nullable(),
});

const citySimulationSchema = z.object({
  presetId: z.string().optional().nullable(),
  rainfallMultiplier: z.number().min(0.1).max(10.0).optional().default(1.5),
  drainageModifierPct: z.number().min(-90).max(200).optional().default(0),
  additionalPumpsDeployed: z.number().int().min(0).max(50).optional().default(0),
});

/**
 * GET /api/simulation/presets
 * Returns available scenario presets and parameter boundaries.
 */
router.get('/presets', (req, res) => {
  res.status(200).json(getSimulationPresets());
});

/**
 * POST /api/simulation/ward
 * Simulates weather and infrastructure interventions for a specific ward.
 */
router.post('/ward', async (req, res, next) => {
  try {
    const parsed = wardSimulationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.format(),
      });
    }

    const simulation = await simulateWardScenario(parsed.data);
    res.status(200).json(simulation);
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Not Found', message: error.message });
    }
    next(error);
  }
});

/**
 * POST /api/simulation/city
 * Simulates citywide macro emergency scenarios and infrastructure shifts.
 */
router.post('/city', async (req, res, next) => {
  try {
    const parsed = citySimulationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.format(),
      });
    }

    const simulation = await simulateCityScenario(parsed.data);
    res.status(200).json(simulation);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
