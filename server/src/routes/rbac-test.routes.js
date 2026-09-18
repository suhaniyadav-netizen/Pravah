/**
 * Role-Based Access Control (RBAC) Verification Routes
 * Pravah V2 - Phase 2
 *
 * Demonstrates and verifies route protection across all 4 system roles:
 * - ADMIN
 * - ANALYST
 * - RESPONSE_TEAM
 * - CITIZEN
 */

const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply authentication middleware to all RBAC test routes
router.use(authenticate);

/**
 * GET /api/test-rbac/admin
 * Requires: ADMIN role
 */
router.get('/admin', authorize('ADMIN'), (req, res) => {
  res.status(200).json({
    status: 'success',
    access: 'granted',
    role: req.user.role,
    message: 'Welcome Municipal Administrator. Full administrative privileges confirmed.',
  });
});

/**
 * GET /api/test-rbac/analyst
 * Requires: ADMIN or ANALYST role
 */
router.get('/analyst', authorize('ADMIN', 'ANALYST'), (req, res) => {
  res.status(200).json({
    status: 'success',
    access: 'granted',
    role: req.user.role,
    message: 'Welcome Hydrological Analyst. Access to flood risk models and simulations confirmed.',
  });
});

/**
 * GET /api/test-rbac/team
 * Requires: ADMIN or RESPONSE_TEAM role
 */
router.get('/team', authorize('ADMIN', 'RESPONSE_TEAM'), (req, res) => {
  res.status(200).json({
    status: 'success',
    access: 'granted',
    role: req.user.role,
    message: 'Welcome Field Response Officer. Access to incident dispatch confirmed.',
  });
});

/**
 * GET /api/test-rbac/citizen
 * Requires: ADMIN or CITIZEN role
 */
router.get('/citizen', authorize('ADMIN', 'CITIZEN'), (req, res) => {
  res.status(200).json({
    status: 'success',
    access: 'granted',
    role: req.user.role,
    message: 'Welcome Citizen. Access to citizen report tracking confirmed.',
  });
});

module.exports = router;
