/**
 * Authentication & Authorization Middlewares
 * Pravah V2 - Phase 2
 */

const { verifyToken } = require('../services/auth.service');

/**
 * Middleware: Verifies the JWT Bearer token and attaches authenticated user to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token missing. Please provide a Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message || 'Invalid or expired authentication token.',
    });
  }
}

/**
 * Middleware: Enforces Role-Based Access Control (RBAC).
 * Allows access only if req.user.role matches one of the specified allowedRoles.
 * @param  {...string} allowedRoles - e.g. 'ADMIN', 'ANALYST', 'RESPONSE_TEAM', 'CITIZEN'
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User is not authenticated.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${req.user.role}' does not have permission to access this resource. Required: [${allowedRoles.join(', ')}].`,
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
