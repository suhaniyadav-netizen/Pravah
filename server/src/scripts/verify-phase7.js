/**
 * Comprehensive Phase 7 Verification Suite
 * Pravah V2 - Complaints & Incidents Lifecycle
 *
 * Validates:
 * 1. Citizen complaint ingestion with automatic GIS ward assignment
 * 2. Role-based complaint verification and rejection
 * 3. Operational flood incident creation
 * 4. Incident lifecycle state transitions (ACTIVE -> INVESTIGATING -> CONTAINED -> RESOLVED)
 * 5. Invalid transition rejection and access barrier enforcement
 */

const http = require('http');
const app = require('../app');
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

async function runPhase7Verification() {
  console.log('================================================================');
  console.log('     PRAVAH V2 — PHASE 7 COMPLAINTS & INCIDENTS LIFECYCLE       ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminToken = generateToken({
    id: 'admin-p7',
    email: 'admin@delhi.gov.in',
    name: 'Admin Officer',
    role: 'ADMIN',
  });

  const teamToken = generateToken({
    id: 'team-p7',
    email: 'team.north@delhi.gov.in',
    name: 'North Team Leader',
    role: 'RESPONSE_TEAM',
  });

  const citizenToken = generateToken({
    id: 'citizen-p7',
    email: 'citizen.test@example.com',
    name: 'Citizen Tester',
    role: 'CITIZEN',
  });

  try {
    // -------------------------------------------------------------------------
    // Check 1: Citizen Complaint Ingestion & Auto-Ward Assignment
    // -------------------------------------------------------------------------
    console.log('1. Complaint Submission & Automatic GIS Ward Mapping:');
    const submitRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        longitude: 77.094594,
        latitude: 28.840484, // Narela coordinates
        address: 'Narela Mandi Main Road',
        description: 'Severe gutter overflow flooding road with 45cm water.',
        severity: 'HIGH',
        waterDepthCm: 45.0,
      }),
    });
    const submitData = await submitRes.json();

    reportCheck('POST /api/complaints returns HTTP 201 Created', submitRes.status === 201);
    reportCheck('Complaint automatically resolved and assigned to Ward W001',
      submitData.complaint && submitData.complaint.assignedWard && submitData.complaint.assignedWard.wardCode === 'W001'
    );
    reportCheck('Initial complaint status is SUBMITTED', submitData.complaint && submitData.complaint.status === 'SUBMITTED');

    const complaintId = submitData.complaint.id;

    // -------------------------------------------------------------------------
    // Check 2: Complaint Status Updates & RBAC Barriers
    // -------------------------------------------------------------------------
    console.log('\n2. Complaint Verification & Access Control:');

    // Citizen attempts status update -> 403 Forbidden
    const unauthUpdateRes = await fetch(`${baseUrl}/api/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({ status: 'VERIFIED' }),
    });
    reportCheck('Citizen role blocked from updating complaint status (403 Forbidden)', unauthUpdateRes.status === 403);

    // Response Team verifies complaint -> 200 OK
    const verifyRes = await fetch(`${baseUrl}/api/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teamToken}`,
      },
      body: JSON.stringify({ status: 'VERIFIED' }),
    });
    reportCheck('RESPONSE_TEAM role successfully verifies complaint (HTTP 200)', verifyRes.status === 200);

    // -------------------------------------------------------------------------
    // Check 3: Operational Incident Creation
    // -------------------------------------------------------------------------
    console.log('\n3. Operational Flood Incident Creation:');
    const incidentRes = await fetch(`${baseUrl}/api/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teamToken}`,
      },
      body: JSON.stringify({
        wardId: 'W001',
        primaryComplaintId: complaintId,
        longitude: 77.094594,
        latitude: 28.840484,
        description: 'Major stormwater backup at Narela Mandi intersection.',
        severity: 'HIGH',
        waterDepthCm: 50.0,
      }),
    });
    const incidentData = await incidentRes.json();

    reportCheck('POST /api/incidents returns HTTP 201 Created', incidentRes.status === 201);
    reportCheck('Incident initialized with ACTIVE status', incidentData.incident && incidentData.incident.status === 'ACTIVE');

    const incidentId = incidentData.incident.id;

    // -------------------------------------------------------------------------
    // Check 4: Incident Lifecycle Transitions
    // -------------------------------------------------------------------------
    console.log('\n4. Incident Operational Lifecycle Transitions:');

    // ACTIVE -> INVESTIGATING
    const step1 = await fetch(`${baseUrl}/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teamToken}`,
      },
      body: JSON.stringify({ status: 'INVESTIGATING' }),
    });
    reportCheck('Transition ACTIVE -> INVESTIGATING succeeds (HTTP 200)', step1.status === 200);

    // INVESTIGATING -> CONTAINED
    const step2 = await fetch(`${baseUrl}/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teamToken}`,
      },
      body: JSON.stringify({ status: 'CONTAINED' }),
    });
    reportCheck('Transition INVESTIGATING -> CONTAINED succeeds (HTTP 200)', step2.status === 200);

    // CONTAINED -> RESOLVED
    const step3 = await fetch(`${baseUrl}/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });
    reportCheck('Transition CONTAINED -> RESOLVED succeeds (HTTP 200)', step3.status === 200);

    // Invalid transition: RESOLVED -> INVESTIGATING -> 400 Bad Request
    const invalidStep = await fetch(`${baseUrl}/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'INVESTIGATING' }),
    });
    reportCheck('Invalid state transition rejected with HTTP 400 Bad Request', invalidStep.status === 400);

    // -------------------------------------------------------------------------
    // Check 5: Incident and Complaint Queries
    // -------------------------------------------------------------------------
    console.log('\n5. Incident and Complaint Query Endpoints:');
    const listCompRes = await fetch(`${baseUrl}/api/complaints?status=VERIFIED`);
    const listCompData = await listCompRes.json();
    reportCheck('GET /api/complaints returns HTTP 200 and filtered array', listCompRes.status === 200 && Array.isArray(listCompData.complaints));

    const listIncRes = await fetch(`${baseUrl}/api/incidents`);
    const listIncData = await listIncRes.json();
    reportCheck('GET /api/incidents returns HTTP 200 and incident list', listIncRes.status === 200 && Array.isArray(listIncData.incidents));
  } finally {
    server.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 7 VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('================================================================\n');

  if (passedChecks === totalChecks) {
    console.log('🎉 Phase 7 Complaints & Incidents Lifecycle verification succeeded!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some Phase 7 checks failed.\n');
    process.exit(1);
  }
}

runPhase7Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
