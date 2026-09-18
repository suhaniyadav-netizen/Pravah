/**
 * Authentication Routes
 * Pravah V2 - Phase 2
 */

const express = require('express');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');
const { registerUser, loginUser } = require('../services/auth.service');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * POST /api/auth/register
 * Public: Registers a new user account.
 */
router.post('/register', async (req, res, next) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { user, token } = await registerUser(parseResult.data);
    return res.status(201).json({
      message: 'User registered successfully.',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Public: Authenticates user credentials and returns a JWT.
 */
router.post('/login', async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { user, token } = await loginUser(parseResult.data);
    return res.status(200).json({
      message: 'Login successful.',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Protected: Returns profile of current authenticated user.
 */
router.get('/me', authenticate, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

module.exports = router;
