/**
 * Real-Time WebSocket Infrastructure with Socket.IO
 * Pravah V2 - Phase 11
 *
 * Implements real-time telemetry, flood risk alerts, incident broadcasts,
 * and field response synchronization across ward and administrative rooms.
 */

const { Server } = require('socket.io');
const { z } = require('zod');
const { verifyToken } = require('../services/auth.service');

let io = null;

// =============================================================================
// Event Payload Validation Schemas
// =============================================================================

const riskUpdatedSchema = z.object({
  wardId: z.string().min(1),
  wardCode: z.string().min(1),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  primaryDriver: z.enum(['DRAINAGE_DEFICIT', 'RAINFALL_SURGE', 'CITIZEN_URGENCY']),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

const newComplaintSchema = z.object({
  id: z.string().min(1),
  wardId: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  address: z.string().optional().default(''),
  waterDepthCm: z.number().min(0).default(0),
  status: z.string().default('SUBMITTED'),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

const incidentCreatedSchema = z.object({
  id: z.string().min(1),
  wardId: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL']),
  status: z.enum(['ACTIVE', 'INVESTIGATING', 'CONTAINED', 'RESOLVED']),
  waterDepthCm: z.number().min(0).default(0),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

const incidentUpdatedSchema = z.object({
  id: z.string().min(1),
  wardId: z.string().min(1),
  previousStatus: z.string().min(1),
  newStatus: z.string().min(1),
  updatedBy: z.string().optional().default('system'),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

const teamDispatchedSchema = z.object({
  assignmentId: z.string().min(1),
  teamId: z.string().min(1),
  teamName: z.string().min(1),
  incidentId: z.string().min(1),
  wardId: z.string().min(1),
  status: z.string().default('DISPATCHED'),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

const weatherUpdatedSchema = z.object({
  station: z.string().default('Delhi Safdarjung IMD'),
  rainfallMm: z.number().min(0),
  temperatureC: z.number().optional().default(28.0),
  condition: z.string().optional().default('Monsoon Shower'),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

// =============================================================================
// Socket.IO Server Initialization
// =============================================================================

/**
 * Initializes Socket.IO on the provided HTTP server.
 */
function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Authentication Handshake Middleware
  io.use((socket, next) => {
    const authHeader = socket.handshake.headers?.authorization;
    let token = socket.handshake.auth?.token;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        socket.user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          name: decoded.name,
        };
      } catch (err) {
        // Token invalid - allow connection as anonymous citizen viewer
        socket.user = null;
      }
    } else {
      socket.user = null;
    }

    next();
  });

  // Client Connection Handler
  io.on('connection', (socket) => {
    // Automatically join default public telemetry channel
    socket.join('city:risk');
    socket.join('weather:updates');

    // Ward Channel Subscription: allows clients to monitor specific ward
    socket.on('join:ward', ({ wardId }, callback) => {
      if (wardId) {
        const room = `ward:${wardId}`;
        socket.join(room);
        if (typeof callback === 'function') {
          callback({ success: true, room, joinedAt: new Date().toISOString() });
        }
      }
    });

    socket.on('leave:ward', ({ wardId }) => {
      if (wardId) {
        socket.leave(`ward:${wardId}`);
      }
    });

    // Administrative Command Channel: restricted to staff roles
    socket.on('join:admin', (data, callback) => {
      const allowedRoles = ['ADMIN', 'ANALYST', 'RESPONSE_TEAM'];
      if (socket.user && allowedRoles.includes(socket.user.role)) {
        socket.join('admin:command');
        if (typeof callback === 'function') {
          callback({
            success: true,
            room: 'admin:command',
            authorizedRole: socket.user.role,
            joinedAt: new Date().toISOString(),
          });
        }
      } else {
        if (typeof callback === 'function') {
          callback({
            success: false,
            error: 'Unauthorized: Admin or operational role required to access command channel.',
          });
        } else {
          socket.emit('error', {
            code: 'FORBIDDEN',
            message: 'Unauthorized to join administrative command room.',
          });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      // Clean disconnect
    });
  });

  return io;
}

/**
 * Returns the active Socket.IO server instance.
 */
function getIO() {
  return io;
}

// =============================================================================
// Broadcast Utilities
// =============================================================================

function broadcastRiskUpdated(payload) {
  if (!io) return false;
  const validated = riskUpdatedSchema.parse(payload);
  io.to(`ward:${validated.wardId}`).to('city:risk').emit('RISK_UPDATED', validated);
  return true;
}

function broadcastNewComplaint(payload) {
  if (!io) return false;
  const validated = newComplaintSchema.parse(payload);
  io.to(`ward:${validated.wardId}`).to('admin:command').emit('NEW_COMPLAINT', validated);
  return true;
}

function broadcastIncidentCreated(payload) {
  if (!io) return false;
  const validated = incidentCreatedSchema.parse(payload);
  io.to(`ward:${validated.wardId}`).to('admin:command').emit('INCIDENT_CREATED', validated);
  return true;
}

function broadcastIncidentUpdated(payload) {
  if (!io) return false;
  const validated = incidentUpdatedSchema.parse(payload);
  io.to(`ward:${validated.wardId}`).to('admin:command').emit('INCIDENT_UPDATED', validated);
  return true;
}

function broadcastTeamDispatched(payload) {
  if (!io) return false;
  const validated = teamDispatchedSchema.parse(payload);
  io.to('admin:command').to(`ward:${validated.wardId}`).emit('TEAM_DISPATCHED', validated);
  return true;
}

function broadcastWeatherUpdated(payload) {
  if (!io) return false;
  const validated = weatherUpdatedSchema.parse(payload);
  io.to('city:risk').to('weather:updates').emit('WEATHER_UPDATED', validated);
  return true;
}

module.exports = {
  initSocketServer,
  getIO,
  broadcastRiskUpdated,
  broadcastNewComplaint,
  broadcastIncidentCreated,
  broadcastIncidentUpdated,
  broadcastTeamDispatched,
  broadcastWeatherUpdated,
  schemas: {
    riskUpdatedSchema,
    newComplaintSchema,
    incidentCreatedSchema,
    incidentUpdatedSchema,
    teamDispatchedSchema,
    weatherUpdatedSchema,
  },
};
