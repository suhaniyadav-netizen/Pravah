/**
 * Emergency Response Team & Dispatch Management Service
 * Pravah V2 - Phase 8
 *
 * Manages field pumping units, drainage quick-response teams,
 * incident dispatch workflows, and operational command metrics.
 */

const prisma = require('../config/prisma');

// In-memory stores for offline resilience
const MEMORY_TEAMS = [
  {
    id: 'team-central-01',
    name: 'Central Quick Response Unit',
    status: 'AVAILABLE',
    contactPhone: '+91-11-2338-0001',
    currentLocation: { longitude: 77.2167, latitude: 28.6139 },
    equipment: ['Heavy Submersible Pump (350 m3/h)', 'Emergency Inflatable Boat'],
  },
  {
    id: 'team-north-02',
    name: 'North Delhi Heavy Drainage Squad',
    status: 'AVAILABLE',
    contactPhone: '+91-11-2338-0002',
    currentLocation: { longitude: 77.1923, latitude: 28.7123 },
    equipment: ['Suction Tanker Unit', 'Hydraulic Trench Digger'],
  },
  {
    id: 'team-south-03',
    name: 'South Delhi Flood Relief Mobile',
    status: 'AVAILABLE',
    contactPhone: '+91-11-2338-0003',
    currentLocation: { longitude: 77.2255, latitude: 28.5672 },
    equipment: ['Mobile Dewatering Pump (500 m3/h)', 'Sandbag Deployer'],
  },
];

const MEMORY_ASSIGNMENTS = [];

const ASSIGNMENT_TRANSITIONS = {
  DISPATCHED: ['EN_ROUTE', 'ON_SITE', 'CANCELLED'],
  EN_ROUTE: ['ON_SITE', 'CANCELLED'],
  ON_SITE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Lists all response teams with optional status filter.
 */
async function listResponseTeams({ status } = {}) {
  try {
    const where = status ? { status } : {};
    const teams = await prisma.responseTeam.findMany({
      where,
      include: {
        assignments: {
          where: { status: { in: ['DISPATCHED', 'EN_ROUTE', 'ON_SITE'] } },
        },
      },
    });
    if (teams && teams.length > 0) return teams;
  } catch {
    // Fallback
  }

  let filtered = [...MEMORY_TEAMS];
  if (status) filtered = filtered.filter((t) => t.status === status);
  return filtered;
}

/**
 * Retrieves a single response team by ID.
 */
async function getResponseTeamById(id) {
  try {
    const team = await prisma.responseTeam.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (team) return team;
  } catch {
    // Fallback
  }

  return MEMORY_TEAMS.find((t) => t.id === id) || null;
}

/**
 * Updates a response team's operational status and current GPS location.
 */
async function updateTeamStatus(id, newStatus, location = null) {
  const allowedStatuses = ['AVAILABLE', 'DISPATCHED', 'ON_SCENE', 'OFF_DUTY'];
  if (!allowedStatuses.includes(newStatus)) {
    const err = new Error(`Invalid team status: '${newStatus}'. Allowed: [${allowedStatuses.join(', ')}]`);
    err.statusCode = 400;
    throw err;
  }

  try {
    await prisma.responseTeam.update({
      where: { id },
      data: { status: newStatus },
    });
  } catch {
    const team = MEMORY_TEAMS.find((t) => t.id === id);
    if (team) {
      team.status = newStatus;
      if (location) team.currentLocation = location;
    }
  }

  return { id, newStatus, location, updatedAt: new Date().toISOString() };
}

/**
 * Dispatches an available response team to an active flood incident.
 */
async function assignTeamToIncident({ incidentId, responseTeamId, notes = '', actorUser }) {
  const team = await getResponseTeamById(responseTeamId);
  if (!team) {
    const err = new Error(`Response team with ID '${responseTeamId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  if (team.status === 'OFF_DUTY') {
    const err = new Error(`Cannot assign team '${team.name}': Team is currently OFF_DUTY.`);
    err.statusCode = 400;
    throw err;
  }

  let assignment;
  try {
    assignment = await prisma.assignment.create({
      data: {
        incidentId,
        responseTeamId,
        status: 'DISPATCHED',
        notes,
      },
    });

    // Synchronize team status to DISPATCHED
    await prisma.responseTeam.update({
      where: { id: responseTeamId },
      data: { status: 'DISPATCHED' },
    });
  } catch {
    // Fallback storage
    assignment = {
      id: `assign-${Date.now()}`,
      incidentId,
      responseTeamId,
      status: 'DISPATCHED',
      assignedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      notes,
      dispatchedBy: actorUser.email,
    };
    MEMORY_ASSIGNMENTS.unshift(assignment);

    // Update memory team status
    const memTeam = MEMORY_TEAMS.find((t) => t.id === responseTeamId);
    if (memTeam) memTeam.status = 'DISPATCHED';
  }

  // Real-time broadcast
  try {
    const { broadcastTeamDispatched } = require('../config/socket');
    // Resolve the actual ward from the assignment or memory store
    const assignedIncident = MEMORY_ASSIGNMENTS.find((a) => a.incidentId === incidentId);
    const broadcastWardId = assignedIncident?.wardId || 'CITY';
    broadcastTeamDispatched({
      assignmentId: assignment.id,
      teamId: team.id,
      teamName: team.name,
      incidentId,
      wardId: broadcastWardId,
      status: 'DISPATCHED',
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Socket broadcast non-fatal
  }

  return {
    assignment,
    teamStatus: 'DISPATCHED',
    message: `Team '${team.name}' dispatched to incident.`,
  };
}

/**
 * Updates the operational progress of an incident response assignment.
 */
async function updateAssignmentStatus(id, newStatus, notes = null, actorUser) {
  const assignment = MEMORY_ASSIGNMENTS.find((a) => a.id === id);
  const currentStatus = assignment ? assignment.status : 'DISPATCHED';
  const allowed = ASSIGNMENT_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid assignment state transition: Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowed.join(', ')}]`
    );
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const startedAt = newStatus === 'ON_SITE' ? now : undefined;
  const completedAt = ['COMPLETED', 'CANCELLED'].includes(newStatus) ? now : undefined;

  try {
    await prisma.assignment.update({
      where: { id },
      data: { status: newStatus, startedAt, completedAt, notes: notes || undefined },
    });

    // Synchronize team status
    const teamId = assignment ? assignment.responseTeamId : null;
    if (teamId) {
      if (newStatus === 'ON_SITE') {
        await prisma.responseTeam.update({ where: { id: teamId }, data: { status: 'ON_SCENE' } });
      } else if (['COMPLETED', 'CANCELLED'].includes(newStatus)) {
        await prisma.responseTeam.update({ where: { id: teamId }, data: { status: 'AVAILABLE' } });
      }
    }
  } catch {
    if (assignment) {
      assignment.status = newStatus;
      if (notes) assignment.notes = notes;
      if (startedAt) assignment.startedAt = startedAt.toISOString();
      if (completedAt) assignment.completedAt = completedAt.toISOString();

      const memTeam = MEMORY_TEAMS.find((t) => t.id === assignment.responseTeamId);
      if (memTeam) {
        if (newStatus === 'ON_SITE') memTeam.status = 'ON_SCENE';
        else if (['COMPLETED', 'CANCELLED'].includes(newStatus)) memTeam.status = 'AVAILABLE';
      }
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
 * Lists assignments with optional filtering.
 */
async function listAssignments({ incidentId, responseTeamId, status } = {}) {
  try {
    const where = {};
    if (incidentId) where.incidentId = incidentId;
    if (responseTeamId) where.responseTeamId = responseTeamId;
    if (status) where.status = status;

    const items = await prisma.assignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      include: {
        incident: true,
        responseTeam: true,
      },
    });
    if (items && items.length > 0) return items;
  } catch {
    // Fallback
  }

  let filtered = [...MEMORY_ASSIGNMENTS];
  if (incidentId) filtered = filtered.filter((a) => a.incidentId === incidentId);
  if (responseTeamId) filtered = filtered.filter((a) => a.responseTeamId === responseTeamId);
  if (status) filtered = filtered.filter((a) => a.status === status);

  return filtered;
}

/**
 * Returns city-wide operational emergency response command metrics.
 */
async function getOperationalDashboard() {
  const teams = await listResponseTeams();
  const assignments = await listAssignments();

  const availableTeams = teams.filter((t) => t.status === 'AVAILABLE').length;
  const dispatchedTeams = teams.filter((t) => t.status === 'DISPATCHED').length;
  const onSceneTeams = teams.filter((t) => t.status === 'ON_SCENE').length;
  const offDutyTeams = teams.filter((t) => t.status === 'OFF_DUTY').length;

  const activeAssignments = assignments.filter((a) =>
    ['DISPATCHED', 'EN_ROUTE', 'ON_SITE'].includes(a.status)
  ).length;

  return {
    overviewTitle: 'Delhi Flood Emergency Response Command Overview',
    teams: {
      total: teams.length,
      available: availableTeams,
      dispatched: dispatchedTeams,
      onScene: onSceneTeams,
      offDuty: offDutyTeams,
    },
    activeDeploymentsCount: activeAssignments,
    readinessRating: availableTeams >= 2 ? 'HIGH_READINESS' : 'DEPLOYED_NEAR_CAPACITY',
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  listResponseTeams,
  getResponseTeamById,
  updateTeamStatus,
  assignTeamToIncident,
  updateAssignmentStatus,
  listAssignments,
  getOperationalDashboard,
};
