/**
 * Operational Incidents API Routes
 * Pravah V2 - Phase 7
 */

const express = require('express');
const { z } = require('zod');
const {
  createIncident,
  listIncidents,
  updateIncidentStatus,
} = require('../services/incident.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

const incidentCreationSchema = z.object({
  wardId: z.string({ required_error: 'Ward ID is required' }),
  primaryComplaintId: z.string().optional(),
  longitude: z.number({ required_error: 'Longitude is required' }),
  latitude: z.number({ required_error: 'Latitude is required' }),
  description: z.string().min(5, 'Description is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('HIGH'),
  waterDepthCm: z.number().min(0).max(300).optional().default(40.0),
});

const incidentStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'INVESTIGATING', 'CONTAINED', 'RESOLVED']),
});

/**
 * POST /api/incidents
 * Protected (ADMIN, RESPONSE_TEAM): Creates a new operational flood incident.
 */
router.post('/', authenticate, authorize('ADMIN', 'RESPONSE_TEAM'), async (req, res, next) => {
  try {
    const parsed = incidentCreationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const incident = await createIncident({
      ...parsed.data,
      actorUser: req.user,
    });

    res.status(201).json({
      message: 'Operational flood incident created successfully.',
      incident,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/incidents
 * Public: Lists operational incidents.
 */
router.get('/', async (req, res, next) => {
  try {
    const { wardId, status, severity, limit } = req.query;
    const incidents = await listIncidents({
      wardId,
      status,
      severity,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.status(200).json({
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/incidents/:id/status
 * Protected (ADMIN, RESPONSE_TEAM): Transitions incident operational lifecycle state.
 */
router.patch('/:id/status', authenticate, authorize('ADMIN', 'RESPONSE_TEAM'), async (req, res, next) => {
  try {
    const parsed = incidentStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const updated = await updateIncidentStatus(req.params.id, parsed.data.status, req.user);
    res.status(200).json({
      message: 'Incident lifecycle status updated.',
      updated,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
