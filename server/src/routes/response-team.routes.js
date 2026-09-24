/**
 * Response Team & Incident Dispatch API Routes
 * Pravah V2 - Phase 8
 */

const express = require('express');
const { z } = require('zod');
const {
  listResponseTeams,
  getResponseTeamById,
  updateTeamStatus,
  assignTeamToIncident,
  updateAssignmentStatus,
  listAssignments,
  getOperationalDashboard,
} = require('../services/response-team.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

const teamStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'DISPATCHED', 'ON_SCENE', 'OFF_DUTY']),
  location: z
    .object({
      longitude: z.number(),
      latitude: z.number(),
    })
    .optional(),
});

const assignmentCreationSchema = z.object({
  incidentId: z.string({ required_error: 'Incident ID is required' }),
  responseTeamId: z.string({ required_error: 'Response Team ID is required' }),
  notes: z.string().optional().default(''),
});

const assignmentStatusSchema = z.object({
  status: z.enum(['DISPATCHED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
});

/**
 * GET /api/response-teams
 * Public: Lists response teams.
 */
router.get('/', async (req, res, next) => {
  try {
    const teams = await listResponseTeams({ status: req.query.status });
    res.status(200).json({
      count: teams.length,
      teams,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/response-teams/dashboard/overview
 * Public: Returns operational command overview metrics.
 */
router.get('/dashboard/overview', async (req, res, next) => {
  try {
    const dashboard = await getOperationalDashboard();
    res.status(200).json(dashboard);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/response-teams/assignments
 * Public: Lists incident dispatch assignments.
 */
router.get('/assignments', async (req, res, next) => {
  try {
    const { incidentId, responseTeamId, status } = req.query;
    const assignments = await listAssignments({ incidentId, responseTeamId, status });
    res.status(200).json({
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/response-teams/:id
 * Public: Single team details.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const team = await getResponseTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Response team with ID '${req.params.id}' not found.`,
      });
    }
    res.status(200).json(team);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/response-teams/:id/status
 * Protected (ADMIN, RESPONSE_TEAM): Update team operational status.
 */
router.patch('/:id/status', authenticate, authorize('ADMIN', 'RESPONSE_TEAM'), async (req, res, next) => {
  try {
    const parsed = teamStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const updated = await updateTeamStatus(req.params.id, parsed.data.status, parsed.data.location);
    res.status(200).json({
      message: 'Team status updated.',
      updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/response-teams/assignments
 * Protected (ADMIN, RESPONSE_TEAM): Dispatches a team to an incident.
 */
router.post('/assignments', authenticate, authorize('ADMIN', 'RESPONSE_TEAM'), async (req, res, next) => {
  try {
    const parsed = assignmentCreationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await assignTeamToIncident({
      ...parsed.data,
      actorUser: req.user,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/response-teams/dispatch
 * Protected (ADMIN, RESPONSE_TEAM): Dispatching teams from IncidentCommand UI.
 */
router.post('/dispatch', authenticate, authorize('ADMIN', 'RESPONSE_TEAM'), async (req, res, next) => {
  try {
    const incidentId = req.body.incidentId;
    const responseTeamId = req.body.teamId || req.body.responseTeamId;
    const notes = req.body.notes || (req.body.equipmentType ? `Equipment: ${req.body.equipmentType}` : 'Emergency dispatch');

    if (!incidentId || !responseTeamId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'incidentId and teamId are required for dispatch.',
      });
    }

    const result = await assignTeamToIncident({
      incidentId,
      responseTeamId,
      notes,
      actorUser: req.user,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/response-teams/assignments/:id/status
 * Protected (ADMIN, RESPONSE_TEAM): Updates assignment progress and synchronizes team status.
 */
router.patch('/assignments/:id/status', authenticate, authorize('ADMIN', 'RESPONSE_TEAM'), async (req, res, next) => {
  try {
    const parsed = assignmentStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const updated = await updateAssignmentStatus(
      req.params.id,
      parsed.data.status,
      parsed.data.notes,
      req.user
    );

    res.status(200).json({
      message: 'Assignment status updated.',
      updated,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
