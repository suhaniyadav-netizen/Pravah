/**
 * Ward & Spatial GIS Routes
 * Pravah V2 - Phase 3
 */

const express = require('express');
const { z } = require('zod');
const {
  getAllWardsGeoJSON,
  searchWards,
  resolveWardFromPoint,
  getWardById,
  getWardInfrastructure,
} = require('../services/ward.service');

const router = express.Router();

const pointLookupSchema = z.object({
  longitude: z.number({ required_error: 'Longitude is required' }),
  latitude: z.number({ required_error: 'Latitude is required' }),
});

/**
 * GET /api/wards
 * Public: Returns GeoJSON FeatureCollection of all 250 Delhi municipal wards.
 */
router.get('/', async (req, res, next) => {
  try {
    const geojson = await getAllWardsGeoJSON();
    res.status(200).json(geojson);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/wards/search?q=...
 * Public: Fast search by ward name, code, or administrative zone.
 */
router.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const results = await searchWards(query);
    res.status(200).json({
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/wards/lookup-point
 * Public: Point-in-polygon containment lookup mapping coordinates to containing ward.
 */
router.post('/lookup-point', async (req, res, next) => {
  try {
    const parsed = pointLookupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { longitude, latitude } = parsed.data;
    const match = await resolveWardFromPoint(longitude, latitude);

    if (!match) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No matching municipal ward found for given coordinates.',
      });
    }

    res.status(200).json(match);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/wards/:id
 * Public: Returns detailed information for a single ward.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const ward = await getWardById(req.params.id);
    if (!ward) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ward with ID or code '${req.params.id}' not found.`,
      });
    }
    res.status(200).json(ward);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/wards/:id/infrastructure
 * Public: Lists flood & drainage infrastructure assets located in the ward.
 */
router.get('/:id/infrastructure', async (req, res, next) => {
  try {
    const infrastructure = await getWardInfrastructure(req.params.id);
    res.status(200).json({
      wardId: req.params.id,
      count: infrastructure.length,
      infrastructure,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
