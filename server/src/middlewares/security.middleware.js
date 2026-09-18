/**
 * Security Hardening & Rate Limiting Middlewares
 * Pravah V2 - Phase 13
 *
 * Implements OWASP security best practices:
 * 1. IP rate limiting (DDoS & Brute-force mitigation)
 * 2. Input sanitization (XSS & Injection defense)
 * 3. Security audit event capture
 */

const rateLimit = require('express-rate-limit');
const { recordAuditLog } = require('../services/audit.service');

/**
 * Strict Rate Limiter for Authentication (Brute Force Protection)
 * Max 15 attempts per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    retryAfterMinutes: 15,
  },
  handler: (req, res, next, options) => {
    recordAuditLog({
      action: 'RATE_LIMIT_EXCEEDED',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      details: { path: req.originalUrl, method: req.method },
    }).catch(() => {});

    res.status(429).json(options.message);
  },
});

/**
 * Public Mutation Rate Limiter (Spam / Flood Protection)
 * Max 30 submissions per 15-minute window per IP.
 */
const publicMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Submission threshold exceeded. Please wait before submitting more reports.',
  },
});

/**
 * General API Rate Limiter
 * Max 600 requests per 15-minute window per IP.
 */
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'API rate limit exceeded. Please throttle your requests.',
  },
});

/**
 * Recursive XSS Sanitizer: Strips potentially dangerous HTML tags and script injections
 * from request body strings.
 */
function sanitizeXss(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      // Strip script tags and dangerous HTML attributes
      obj[key] = val
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/onerror=/gi, '')
        .replace(/onload=/gi, '');
    } else if (typeof val === 'object' && val !== null) {
      sanitizeXss(val);
    }
  }
  return obj;
}

function xssSanitizationMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizeXss(req.body);
  }
  next();
}

module.exports = {
  authLimiter,
  publicMutationLimiter,
  generalApiLimiter,
  xssSanitizationMiddleware,
  sanitizeXss,
};
