/**
 * Security Audit Logging Service
 * Pravah V2 - Phase 13
 *
 * Implements immutable security event tracking for authentication events,
 * authorization rejections, critical infrastructure edits, and emergency dispatches.
 */

const prisma = require('../config/prisma');

// In-memory fallback ring buffer (holds last 500 audit events)
const MEMORY_AUDIT_LOGS = [];
const MAX_MEMORY_LOGS = 500;

/**
 * Records a security or administrative audit log.
 */
async function recordAuditLog({
  action,
  actorId = null,
  actorEmail = null,
  actorRole = null,
  ipAddress = '127.0.0.1',
  userAgent = null,
  targetEntity = null,
  targetId = null,
  details = {},
}) {
  const logEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    action,
    actorId,
    actorEmail,
    actorRole,
    ipAddress,
    userAgent,
    targetEntity,
    targetId,
    details,
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: actorId,
        details: {
          actorEmail,
          actorRole,
          ipAddress,
          userAgent,
          targetEntity,
          targetId,
          ...details,
        },
      },
    });
  } catch {
    // Database offline or query failed - store in ring buffer
    MEMORY_AUDIT_LOGS.unshift(logEntry);
    if (MEMORY_AUDIT_LOGS.length > MAX_MEMORY_LOGS) {
      MEMORY_AUDIT_LOGS.pop();
    }
  }

  return logEntry;
}

/**
 * Lists audit logs with optional filtering.
 */
async function listAuditLogs({ action = null, actorEmail = null, limit = 50 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

  try {
    const where = {};
    if (action) where.action = action;

    const dbLogs = await prisma.auditLog.findMany({
      where,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, role: true } } },
    });

    if (dbLogs && dbLogs.length > 0) {
      return dbLogs.map((l) => ({
        id: l.id,
        action: l.action,
        actorId: l.userId,
        actorEmail: l.user?.email || l.details?.actorEmail,
        actorRole: l.user?.role || l.details?.actorRole,
        details: l.details,
        timestamp: l.createdAt.toISOString(),
      }));
    }
  } catch {
    // Fallback to memory
  }

  let filtered = [...MEMORY_AUDIT_LOGS];
  if (action) {
    filtered = filtered.filter((l) => l.action.toLowerCase() === action.toLowerCase());
  }
  if (actorEmail) {
    filtered = filtered.filter(
      (l) => l.actorEmail && l.actorEmail.toLowerCase() === actorEmail.toLowerCase()
    );
  }

  return filtered.slice(0, safeLimit);
}

module.exports = {
  recordAuditLog,
  listAuditLogs,
};
