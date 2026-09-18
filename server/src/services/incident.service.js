/**
 * Complaints & Incidents Lifecycle Service
 * Pravah V2 - Phase 7
 *
 * Manages citizen waterlogging complaint ingestion, automatic GIS ward assignment,
 * and operational flood incident lifecycle state transitions.
 */

const prisma = require('../config/prisma');
const { resolveWardFromPoint } = require('./ward.service');

// In-memory stores for offline resilience
const MEMORY_COMPLAINTS = [];
const MEMORY_INCIDENTS = [];

// Valid State Transitions
const COMPLAINT_TRANSITIONS = {
  SUBMITTED: ['VERIFIED', 'REJECTED', 'IN_PROGRESS'],
  VERIFIED: ['IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};

const INCIDENT_TRANSITIONS = {
  ACTIVE: ['INVESTIGATING', 'CONTAINED', 'RESOLVED'],
  INVESTIGATING: ['CONTAINED', 'RESOLVED'],
  CONTAINED: ['RESOLVED', 'ACTIVE'],
  RESOLVED: ['ACTIVE'], // Re-opened if flood recurs
};

/**
 * Creates a citizen-reported waterlogging complaint with automatic ward resolution.
 */
async function createComplaint({
  longitude,
  latitude,
  address,
  description,
  severity = 'MEDIUM',
  waterDepthCm = 0.0,
  userId = null,
}) {
  // 1. Resolve containing ward via GIS Point-in-Polygon
  const wardResolution = await resolveWardFromPoint(longitude, latitude);
  if (!wardResolution || !wardResolution.ward) {
    const error = new Error('Coordinates do not fall within monitored Delhi municipal boundaries.');
    error.statusCode = 400;
    throw error;
  }

  const ward = wardResolution.ward;
  const pointGeomText = `SRID=4326;POINT(${longitude} ${latitude})`;

  let createdComplaint;
  try {
    const rawResult = await prisma.$queryRaw`
      INSERT INTO complaints (
        id, ward_id, reported_by, location, address, description,
        severity, status, water_depth_cm, created_at, updated_at
      )
      VALUES (
        uuid_generate_v4(),
        ${ward.id}::uuid,
        ${userId ? `${userId}::uuid` : null},
        ST_GeomFromText(${pointGeomText}),
        ${address || null},
        ${description},
        ${severity}::"Severity",
        'SUBMITTED'::"ComplaintStatus",
        ${waterDepthCm},
        NOW(),
        NOW()
      )
      RETURNING id, ward_id AS "wardId", address, description, severity, status, water_depth_cm AS "waterDepthCm", created_at AS "createdAt";
    `;
    createdComplaint = rawResult[0];
  } catch {
    // Resilient fallback storage
    createdComplaint = {
      id: `complaint-${Date.now()}`,
      wardId: ward.id,
      reportedBy: userId,
      location: { longitude, latitude },
      address,
      description,
      severity,
      status: 'SUBMITTED',
      waterDepthCm,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
    };
    MEMORY_COMPLAINTS.unshift(createdComplaint);
  }

  // Real-time broadcast
  try {
    const { broadcastNewComplaint } = require('../config/socket');
    broadcastNewComplaint({
      id: createdComplaint.id,
      wardId: ward.wardCode || ward.id,
      severity: createdComplaint.severity,
      address: createdComplaint.address || '',
      waterDepthCm: createdComplaint.waterDepthCm || 0,
      status: createdComplaint.status || 'SUBMITTED',
      timestamp: createdComplaint.createdAt,
    });
  } catch {
    // Socket broadcast non-fatal if offline
  }

  return {
    ...createdComplaint,
    assignedWard: {
      id: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      matchType: wardResolution.matchType,
    },
  };
}

/**
 * Lists complaints with optional filtering.
 */
async function listComplaints({ wardId, status, severity, limit = 50 }) {
  try {
    const where = {};
    if (wardId) where.wardId = wardId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const complaints = await prisma.complaint.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { ward: { select: { wardCode: true, wardName: true } } },
    });

    if (complaints && complaints.length > 0) return complaints;
  } catch {
    // Fallback query
  }

  let filtered = [...MEMORY_COMPLAINTS];
  if (wardId) filtered = filtered.filter((c) => c.wardId === wardId);
  if (status) filtered = filtered.filter((c) => c.status === status);
  if (severity) filtered = filtered.filter((c) => c.severity === severity);

  return filtered.slice(0, limit);
}

/**
 * Updates a complaint's verification or resolution status.
 */
async function updateComplaintStatus(id, newStatus, actorUser) {
  const complaint = MEMORY_COMPLAINTS.find((c) => c.id === id);

  const currentStatus = complaint ? complaint.status : 'SUBMITTED';
  const allowed = COMPLAINT_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid state transition: Cannot change status from '${currentStatus}' to '${newStatus}'. Allowed: [${allowed.join(', ')}]`
    );
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const resolvedAt = newStatus === 'RESOLVED' ? now : null;

  try {
    await prisma.complaint.update({
      where: { id },
      data: { status: newStatus, resolvedAt, updatedAt: now },
    });
  } catch {
    // Fallback update
    if (complaint) {
      complaint.status = newStatus;
      complaint.updatedAt = now.toISOString();
      complaint.resolvedAt = resolvedAt ? resolvedAt.toISOString() : null;
    }
  }

  return {
    id,
    previousStatus: currentStatus,
    newStatus,
    updatedBy: actorUser.email,
    updatedAt: now.toISOString(),
  };
}

/**
 * Creates an operational flood incident from a verified complaint or field patrol.
 */
async function createIncident({
  wardId,
  primaryComplaintId = null,
  longitude,
  latitude,
  description,
  severity = 'HIGH',
  waterDepthCm = 40.0,
  actorUser,
}) {
  const pointGeomText = `SRID=4326;POINT(${longitude} ${latitude})`;
  let incident;

  try {
    const rawResult = await prisma.$queryRaw`
      INSERT INTO incidents (
        id, ward_id, primary_complaint_id, location, severity,
        status, water_depth_cm, description, created_at, updated_at
      )
      VALUES (
        uuid_generate_v4(),
        ${wardId}::uuid,
        ${primaryComplaintId ? `${primaryComplaintId}::uuid` : null},
        ST_GeomFromText(${pointGeomText}),
        ${severity}::"Severity",
        'ACTIVE'::"IncidentStatus",
        ${waterDepthCm},
        ${description},
        NOW(),
        NOW()
      )
      RETURNING id, ward_id AS "wardId", severity, status, description, created_at AS "createdAt";
    `;
    incident = rawResult[0];
  } catch {
    // Fallback storage
    incident = {
      id: `incident-${Date.now()}`,
      wardId,
      primaryComplaintId,
      location: { longitude, latitude },
      severity,
      status: 'ACTIVE',
      waterDepthCm,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      createdBy: actorUser.email,
    };
    MEMORY_INCIDENTS.unshift(incident);
  }

  // Real-time broadcast
  try {
    const { broadcastIncidentCreated } = require('../config/socket');
    broadcastIncidentCreated({
      id: incident.id,
      wardId: incident.wardId || 'W056',
      title: description || 'Severe Waterlogging Incident',
      severity: incident.severity,
      status: incident.status,
      waterDepthCm: incident.waterDepthCm || 0,
      timestamp: incident.createdAt,
    });
  } catch {
    // Socket broadcast non-fatal
  }

  return incident;
}

/**
 * Lists operational incidents.
 */
async function listIncidents({ wardId, status, severity, limit = 50 }) {
  try {
    const where = {};
    if (wardId) where.wardId = wardId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const incidents = await prisma.incident.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        ward: { select: { wardCode: true, wardName: true } },
        assignments: { include: { responseTeam: true } },
      },
    });

    if (incidents && incidents.length > 0) return incidents;
  } catch {
    // Fallback query
  }

  let filtered = [...MEMORY_INCIDENTS];
  if (wardId) filtered = filtered.filter((i) => i.wardId === wardId);
  if (status) filtered = filtered.filter((i) => i.status === status);
  if (severity) filtered = filtered.filter((i) => i.severity === severity);

  return filtered.slice(0, limit);
}

/**
 * Updates an operational incident's status.
 */
async function updateIncidentStatus(id, newStatus, actorUser) {
  const incident = MEMORY_INCIDENTS.find((i) => i.id === id);
  const currentStatus = incident ? incident.status : 'ACTIVE';
  const allowed = INCIDENT_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid incident transition: Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowed.join(', ')}]`
    );
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const resolvedAt = newStatus === 'RESOLVED' ? now : null;

  try {
    await prisma.incident.update({
      where: { id },
      data: { status: newStatus, resolvedAt, updatedAt: now },
    });
  } catch {
    if (incident) {
      incident.status = newStatus;
      incident.updatedAt = now.toISOString();
      incident.resolvedAt = resolvedAt ? resolvedAt.toISOString() : null;
    }
  }

  const result = {
    id,
    previousStatus: currentStatus,
    newStatus,
    updatedBy: actorUser.email,
    updatedAt: now.toISOString(),
  };

  try {
    const { broadcastIncidentUpdated } = require('../config/socket');
    broadcastIncidentUpdated({
      id,
      wardId: (incident && incident.wardId) || 'W056',
      previousStatus: currentStatus,
      newStatus,
      updatedBy: actorUser.email,
      timestamp: now.toISOString(),
    });
  } catch {
    // Socket broadcast non-fatal
  }

  return result;
}

module.exports = {
  createComplaint,
  listComplaints,
  updateComplaintStatus,
  createIncident,
  listIncidents,
  updateIncidentStatus,
};
