/**
 * Complaints & Incidents Lifecycle Service
 * Pravah V2 - Phase 7
 *
 * Manages citizen waterlogging complaint ingestion, automatic GIS ward assignment,
 * and operational flood incident lifecycle state transitions.
 */

const prisma = require('../config/prisma');
const { resolveWardFromPoint } = require('./ward.service');

// In-memory stores for offline resilience (pre-seeded with operational data)
const MEMORY_COMPLAINTS = [
  {
    id: 'comp-seed-01',
    wardId: 'W056',
    address: 'Near Connaught Place Outer Circle, Minto Underpass',
    description: 'Severe waterlogging under railway bridge, water level rising rapidly',
    severity: 'HIGH',
    status: 'SUBMITTED',
    waterDepthCm: 55,
    location: { longitude: 77.2201, latitude: 28.6329 },
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'comp-seed-02',
    wardId: 'W112',
    address: 'MB Road near Pul Prahladpur Subway',
    description: 'Underpass flooded, bus stuck in 4 feet water, traffic halted',
    severity: 'CRITICAL',
    status: 'VERIFIED',
    waterDepthCm: 70,
    location: { longitude: 77.2912, latitude: 28.5144 },
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'comp-seed-03',
    wardId: 'W089',
    address: 'Rohtak Road, Zakhira Flyover descending ramp',
    description: 'Drains choked with plastic bags, 30cm standing water across 2 lanes',
    severity: 'MEDIUM',
    status: 'SUBMITTED',
    waterDepthCm: 32,
    location: { longitude: 77.1602, latitude: 28.6651 },
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'comp-seed-04',
    wardId: 'W001',
    address: 'Main Bawana Road, Sector 1 Narela',
    description: 'Stormwater backflow overflowing into residential sidewalk',
    severity: 'LOW',
    status: 'SUBMITTED',
    waterDepthCm: 18,
    location: { longitude: 77.094594, latitude: 28.840484 },
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
];

const MEMORY_INCIDENTS = [
  {
    id: 'inc-seed-01',
    wardId: 'W056',
    primaryComplaintId: 'comp-seed-01',
    location: { longitude: 77.2201, latitude: 28.6329 },
    severity: 'HIGH',
    status: 'ACTIVE',
    waterDepthCm: 55,
    description: 'Minto Bridge Inundation: Traffic diversion in effect, submersible pump required',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    resolvedAt: null,
    createdBy: 'control.room@pravah.delhi.gov.in',
  },
  {
    id: 'inc-seed-02',
    wardId: 'W112',
    primaryComplaintId: 'comp-seed-02',
    location: { longitude: 77.2912, latitude: 28.5144 },
    severity: 'CRITICAL',
    status: 'ACTIVE',
    waterDepthCm: 70,
    description: 'Pul Prahladpur Emergency: Flash flood submerged underpass, emergency dewatering units dispatched',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    resolvedAt: null,
    createdBy: 'control.room@pravah.delhi.gov.in',
  },
  {
    id: 'inc-seed-03',
    wardId: 'W089',
    primaryComplaintId: 'comp-seed-03',
    location: { longitude: 77.1602, latitude: 28.6651 },
    severity: 'MEDIUM',
    status: 'ACTIVE',
    waterDepthCm: 32,
    description: 'Zakhira Junction Waterlogging: Sump drain blocked, quick response team requested',
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    resolvedAt: null,
    createdBy: 'control.room@pravah.delhi.gov.in',
  },
];

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
    // Use separate queries depending on whether userId is provided, to avoid
    // JS-string-interpolated SQL injection via the nullable UUID cast.
    const rawResult = userId
      ? await prisma.$queryRaw`
          INSERT INTO complaints (
            id, ward_id, reported_by, location, address, description,
            severity, status, water_depth_cm, created_at, updated_at
          )
          VALUES (
            uuid_generate_v4(),
            ${ward.id}::uuid,
            ${userId}::uuid,
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
        `
      : await prisma.$queryRaw`
          INSERT INTO complaints (
            id, ward_id, reported_by, location, address, description,
            severity, status, water_depth_cm, created_at, updated_at
          )
          VALUES (
            uuid_generate_v4(),
            ${ward.id}::uuid,
            NULL,
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
  // Try to get current status from DB first (authoritative source)
  let currentStatus = 'SUBMITTED';
  let memComplaint = MEMORY_COMPLAINTS.find((c) => c.id === id);

  try {
    const dbComplaint = await prisma.complaint.findUnique({ where: { id }, select: { status: true } });
    if (dbComplaint) {
      currentStatus = dbComplaint.status;
    } else if (memComplaint) {
      currentStatus = memComplaint.status;
    }
  } catch {
    if (memComplaint) currentStatus = memComplaint.status;
  }

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
    if (memComplaint) {
      memComplaint.status = newStatus;
      memComplaint.updatedAt = now.toISOString();
      memComplaint.resolvedAt = resolvedAt ? resolvedAt.toISOString() : null;
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
    // Split queries to avoid JS-string-interpolated nullable UUID cast injection
    const rawResult = primaryComplaintId
      ? await prisma.$queryRaw`
          INSERT INTO incidents (
            id, ward_id, primary_complaint_id, location, severity,
            status, water_depth_cm, description, created_at, updated_at
          )
          VALUES (
            uuid_generate_v4(),
            ${wardId}::uuid,
            ${primaryComplaintId}::uuid,
            ST_GeomFromText(${pointGeomText}),
            ${severity}::"Severity",
            'ACTIVE'::"IncidentStatus",
            ${waterDepthCm},
            ${description},
            NOW(),
            NOW()
          )
          RETURNING id, ward_id AS "wardId", severity, status, description, created_at AS "createdAt";
        `
      : await prisma.$queryRaw`
          INSERT INTO incidents (
            id, ward_id, primary_complaint_id, location, severity,
            status, water_depth_cm, description, created_at, updated_at
          )
          VALUES (
            uuid_generate_v4(),
            ${wardId}::uuid,
            NULL,
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
  // Try to get current status from DB first (authoritative source)
  let currentStatus = 'ACTIVE';
  let incidentWardId = 'W056';
  let memIncident = MEMORY_INCIDENTS.find((i) => i.id === id);

  try {
    const dbIncident = await prisma.incident.findUnique({ where: { id }, select: { status: true, wardId: true } });
    if (dbIncident) {
      currentStatus = dbIncident.status;
      incidentWardId = dbIncident.wardId || incidentWardId;
    } else if (memIncident) {
      currentStatus = memIncident.status;
      incidentWardId = memIncident.wardId || incidentWardId;
    }
  } catch {
    if (memIncident) {
      currentStatus = memIncident.status;
      incidentWardId = memIncident.wardId || incidentWardId;
    }
  }

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
    if (memIncident) {
      memIncident.status = newStatus;
      memIncident.updatedAt = now.toISOString();
      memIncident.resolvedAt = resolvedAt ? resolvedAt.toISOString() : null;
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
      wardId: incidentWardId,
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
