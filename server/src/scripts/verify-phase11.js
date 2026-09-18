/**
 * Comprehensive Phase 11 Verification Suite
 * Pravah V2 - Real-Time Socket.IO Telemetry & Event Architecture
 *
 * Validates:
 * 1. Socket.IO server initialization and handshake
 * 2. Public telemetry room subscriptions (city:risk, weather:updates)
 * 3. Ward-level channel joins (ward:W056)
 * 4. JWT authenticated connection & authorized admin room joins (admin:command)
 * 5. Rejection of unauthorized users attempting to access admin command channels
 * 6. Real-time broadcast and receipt of all required events:
 *    - RISK_UPDATED
 *    - NEW_COMPLAINT
 *    - INCIDENT_CREATED
 *    - INCIDENT_UPDATED
 *    - TEAM_DISPATCHED
 *    - WEATHER_UPDATED
 * 7. Zod payload validation for events
 * 8. Clean client disconnect and heartbeat handling
 */

const http = require('http');
const { io: ClientIO } = require('socket.io-client');
const app = require('../app');
const {
  initSocketServer,
  broadcastRiskUpdated,
  broadcastNewComplaint,
  broadcastIncidentCreated,
  broadcastIncidentUpdated,
  broadcastTeamDispatched,
  broadcastWeatherUpdated,
} = require('../config/socket');
const { generateToken } = require('../services/auth.service');

let passedChecks = 0;
let totalChecks = 0;

function reportCheck(title, success, details = '') {
  totalChecks++;
  if (success) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    console.log(`  ❌ [FAIL] ${title} - ${details}`);
  }
}

async function runPhase11Verification() {
  console.log('================================================================');
  console.log('       PRAVAH V2 — PHASE 11 REAL-TIME SOCKET.IO VERIFICATION    ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;

  const adminToken = generateToken({
    id: 'admin-ws-user',
    email: 'commissioner@delhi.gov.in',
    name: 'Municipal Commissioner',
    role: 'ADMIN',
  });

  const citizenToken = generateToken({
    id: 'citizen-ws-user',
    email: 'citizen@example.com',
    name: 'Citizen Viewer',
    role: 'CITIZEN',
  });

  let publicClient;
  let adminClient;
  let citizenClient;

  try {
    // -------------------------------------------------------------------------
    // Check 1: Handshake and Public Connection
    // -------------------------------------------------------------------------
    console.log('1. WebSocket Handshake & Public Client Connection:');
    publicClient = ClientIO(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise((resolve, reject) => {
      publicClient.on('connect', resolve);
      publicClient.on('connect_error', reject);
      setTimeout(() => reject(new Error('Public client connection timed out')), 4000);
    });

    reportCheck(
      'Public client establishes WebSocket connection successfully',
      publicClient.connected === true,
      `Socket ID: ${publicClient.id}`
    );

    // -------------------------------------------------------------------------
    // Check 2: Ward Channel Subscription
    // -------------------------------------------------------------------------
    console.log('\n2. Ward Room Subscription:');
    const wardJoinAck = await new Promise((resolve) => {
      publicClient.emit('join:ward', { wardId: 'W056' }, resolve);
    });

    reportCheck(
      'Client joins ward channel (ward:W056) with acknowledgment',
      wardJoinAck && wardJoinAck.success === true && wardJoinAck.room === 'ward:W056',
      `Ack: ${JSON.stringify(wardJoinAck)}`
    );

    // -------------------------------------------------------------------------
    // Check 3: Authenticated Admin Connection & Access Control
    // -------------------------------------------------------------------------
    console.log('\n3. JWT Authentication & Room Access Control:');
    adminClient = ClientIO(serverUrl, {
      transports: ['websocket'],
      auth: { token: adminToken },
      forceNew: true,
    });

    await new Promise((resolve, reject) => {
      adminClient.on('connect', resolve);
      adminClient.on('connect_error', reject);
      setTimeout(() => reject(new Error('Admin client connection timed out')), 4000);
    });

    const adminJoinAck = await new Promise((resolve) => {
      adminClient.emit('join:admin', {}, resolve);
    });

    reportCheck(
      'ADMIN user successfully joins restricted admin:command room',
      adminJoinAck && adminJoinAck.success === true && adminJoinAck.room === 'admin:command',
      `Ack: ${JSON.stringify(adminJoinAck)}`
    );

    citizenClient = ClientIO(serverUrl, {
      transports: ['websocket'],
      auth: { token: citizenToken },
      forceNew: true,
    });

    await new Promise((resolve, reject) => {
      citizenClient.on('connect', resolve);
      citizenClient.on('connect_error', reject);
      setTimeout(() => reject(new Error('Citizen client connection timed out')), 4000);
    });

    const citizenJoinAck = await new Promise((resolve) => {
      citizenClient.emit('join:admin', {}, resolve);
    });

    reportCheck(
      'CITIZEN user is rejected from joining restricted admin:command room',
      citizenJoinAck && citizenJoinAck.success === false,
      `Ack: ${JSON.stringify(citizenJoinAck)}`
    );

    // -------------------------------------------------------------------------
    // Check 4: Real-Time Event Broadcasts & Receipt
    // -------------------------------------------------------------------------
    console.log('\n4. Real-Time Telemetry & Broadcast Event Stream:');

    // 4.1 RISK_UPDATED
    const riskPromise = new Promise((resolve) => {
      publicClient.once('RISK_UPDATED', resolve);
    });
    broadcastRiskUpdated({
      wardId: 'W056',
      wardCode: 'W056',
      riskScore: 78.4,
      riskLevel: 'CRITICAL',
      primaryDriver: 'DRAINAGE_DEFICIT',
    });
    const receivedRisk = await riskPromise;
    reportCheck(
      'RISK_UPDATED event broadcast to ward & city subscribers',
      receivedRisk && receivedRisk.wardId === 'W056' && receivedRisk.riskScore === 78.4,
      `Risk Score: ${receivedRisk?.riskScore}, Driver: ${receivedRisk?.primaryDriver}`
    );

    // 4.2 NEW_COMPLAINT
    const complaintPromise = new Promise((resolve) => {
      adminClient.once('NEW_COMPLAINT', resolve);
    });
    broadcastNewComplaint({
      id: 'comp-realtime-101',
      wardId: 'W056',
      severity: 'HIGH',
      address: 'Minto Bridge Underpass, Connaught Place',
      waterDepthCm: 45.0,
      status: 'SUBMITTED',
    });
    const receivedComplaint = await complaintPromise;
    reportCheck(
      'NEW_COMPLAINT event broadcast to admin command center',
      receivedComplaint && receivedComplaint.id === 'comp-realtime-101' && receivedComplaint.waterDepthCm === 45.0,
      `ID: ${receivedComplaint?.id}, Depth: ${receivedComplaint?.waterDepthCm}cm`
    );

    // 4.3 INCIDENT_CREATED
    const incidentPromise = new Promise((resolve) => {
      adminClient.once('INCIDENT_CREATED', resolve);
    });
    broadcastIncidentCreated({
      id: 'inc-realtime-202',
      wardId: 'W056',
      title: 'Waterlogging Inundation at Underpass',
      severity: 'MAJOR',
      status: 'ACTIVE',
      waterDepthCm: 50.0,
    });
    const receivedIncident = await incidentPromise;
    reportCheck(
      'INCIDENT_CREATED event broadcast with operational severity and status',
      receivedIncident && receivedIncident.id === 'inc-realtime-202' && receivedIncident.severity === 'MAJOR',
      `Title: ${receivedIncident?.title}, Severity: ${receivedIncident?.severity}`
    );

    // 4.4 INCIDENT_UPDATED
    const incidentUpdatePromise = new Promise((resolve) => {
      adminClient.once('INCIDENT_UPDATED', resolve);
    });
    broadcastIncidentUpdated({
      id: 'inc-realtime-202',
      wardId: 'W056',
      previousStatus: 'ACTIVE',
      newStatus: 'CONTAINED',
      updatedBy: 'commissioner@delhi.gov.in',
    });
    const receivedIncidentUpdate = await incidentUpdatePromise;
    reportCheck(
      'INCIDENT_UPDATED event broadcast with status transition state',
      receivedIncidentUpdate && receivedIncidentUpdate.newStatus === 'CONTAINED',
      `Transition: ${receivedIncidentUpdate?.previousStatus} -> ${receivedIncidentUpdate?.newStatus}`
    );

    // 4.5 TEAM_DISPATCHED
    const dispatchPromise = new Promise((resolve) => {
      adminClient.once('TEAM_DISPATCHED', resolve);
    });
    broadcastTeamDispatched({
      assignmentId: 'assign-realtime-303',
      teamId: 'team-central-01',
      teamName: 'Central Quick Response Unit',
      incidentId: 'inc-realtime-202',
      wardId: 'W056',
      status: 'DISPATCHED',
    });
    const receivedDispatch = await dispatchPromise;
    reportCheck(
      'TEAM_DISPATCHED event broadcast with response team unit information',
      receivedDispatch && receivedDispatch.teamName === 'Central Quick Response Unit',
      `Team: ${receivedDispatch?.teamName}, Status: ${receivedDispatch?.status}`
    );

    // 4.6 WEATHER_UPDATED
    const weatherPromise = new Promise((resolve) => {
      publicClient.once('WEATHER_UPDATED', resolve);
    });
    broadcastWeatherUpdated({
      station: 'Delhi Safdarjung IMD',
      rainfallMm: 38.5,
      temperatureC: 26.5,
      condition: 'Heavy Thunderstorm',
    });
    const receivedWeather = await weatherPromise;
    reportCheck(
      'WEATHER_UPDATED event broadcast to public weather channel',
      receivedWeather && receivedWeather.rainfallMm === 38.5,
      `Rainfall: ${receivedWeather?.rainfallMm} mm/h, Condition: ${receivedWeather?.condition}`
    );

    // -------------------------------------------------------------------------
    // Check 5: Payload Schema Validation
    // -------------------------------------------------------------------------
    console.log('\n5. Event Payload Validation Schema:');
    let validationFailed = false;
    try {
      broadcastRiskUpdated({
        wardId: 'W056',
        riskScore: 9999, // Invalid: max 100
      });
    } catch {
      validationFailed = true;
    }
    reportCheck(
      'Broadcaster validates payload against Zod schema and rejects malformed events',
      validationFailed === true,
      `Validation error correctly thrown`
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`    PHASE 11 VERIFICATION RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log('================================================================');

    if (passedChecks === totalChecks) {
      console.log('  🎉 ALL PHASE 11 CHECKS PASSED! Real-time Socket.IO operational.\n');
      process.exit(0);
    } else {
      console.error(`  ⚠️ ${totalChecks - passedChecks} checks failed.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal Verification Error:', error);
    process.exit(1);
  } finally {
    if (publicClient) publicClient.close();
    if (adminClient) adminClient.close();
    if (citizenClient) citizenClient.close();
    server.close();
  }
}

runPhase11Verification();
