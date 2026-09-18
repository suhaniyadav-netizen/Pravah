/**
 * Citizen Complaints API Routes
 * Pravah V2 - Phase 7
 */

const express = require('express');
const { z } = require('zod');
const {
  createComplaint,
  listComplaints,
  updateComplaintStatus,
} = require('../services/incident.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

const complaintSubmissionSchema = z.object({
  longitude: z.number({ required_error: 'Longitude is required' }),
  latitude: z.number({ required_error: 'Latitude is required' }),
  address: z.string().optional(),
  description: z.string().min(5, 'Description must be at least 5 characters long'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  waterDepthCm: z.number().min(0).max(300).optional().default(0.0),
});

const statusUpdateSchema = z.object({
  status: z.enum(['SUBMITTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']),
});

/**
 * POST /api/complaints
 * Public: Submits a geotagged waterlogging complaint with automatic ward assignment.
 */
router.post('/', async (req, res, next) => {
  try {
    const parsed = complaintSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const complaint = await createComplaint(parsed.data);
    res.status(201).json({
      message: 'Complaint submitted successfully and mapped to ward.',
      complaint,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/complaints
 * Public: Lists complaints with filtering.
 */
router.get('/', async (req, res, next) => {
  try {
    const { wardId, status, severity, limit } = req.query;
    const complaints = await listComplaints({
      wardId,
      status,
      severity,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.status(200).json({
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/complaints/:id/status
 * Protected (ADMIN, RESPONSE_TEAM): Updates verification or resolution status.
 */
router.patch('/:id/status', authenticate, authorize('ADMIN', 'RESPONSE_TEAM'), async (req, res, next) => {
  try {
    const parsed = statusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const updated = await updateComplaintStatus(req.params.id, parsed.data.status, req.user);
    res.status(200).json({
      message: 'Complaint status updated.',
      updated,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
