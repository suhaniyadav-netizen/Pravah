/**
 * Authentication Routes
 * Pravah V2 - Phase 2
 */

const express = require('express');
const { registerSchema, loginSchema, googleLoginSchema } = require('../schemas/auth.schema');
const { registerUser, loginUser, loginWithGoogle } = require('../services/auth.service');
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
 * POST /api/auth/google
 * Public: Authenticates via Google Identity Services (GIS) ID Token.
 * Verifies token cryptographically, auto-provisions or retrieves Admin, returns JWT.
 */
router.post('/google', async (req, res, next) => {
  try {
    const parseResult = googleLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Google Web Client';

    const { user, token } = await loginWithGoogle({
      credential: parseResult.data.credential,
      clientId: parseResult.data.clientId,
      ipAddress,
      userAgent,
    });

    return res.status(200).json({
      message: 'Google authentication successful.',
      user,
      token,
    });
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
        email: error.email || null,
        isAccessDenied: true,
      });
    }
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
