/**
 * Comprehensive Phase 8 Verification Suite
 * Pravah V2 - Response Team Management & Dispatch
 *
 * Validates:
 * 1. Response team directory and GPS status tracking
 * 2. Operational command dashboard overview
 * 3. Incident dispatch workflow and team status synchronization
 * 4. Assignment progression (DISPATCHED -> ON_SITE -> COMPLETED)
 * 5. Automatic team status restoration (ON_SCENE -> AVAILABLE)
 * 6. Role-based access control on dispatch operations
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

async function runPhase8Verification() {
  console.log('================================================================');
  console.log('    PRAVAH V2 — PHASE 8 RESPONSE TEAM & DISPATCH VERIFICATION   ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminToken = generateToken({
    id: 'admin-p8',
    email: 'admin@delhi.gov.in',
    name: 'Commissioner',
    role: 'ADMIN',
  });

  const citizenToken = generateToken({
    id: 'citizen-p8',
    email: 'citizen.p8@example.com',
    name: 'Citizen User',
    role: 'CITIZEN',
  });

  try {
    // -------------------------------------------------------------------------
    // Check 1: Response Teams Directory & Command Dashboard
    // -------------------------------------------------------------------------
    console.log('1. Response Team Directory & Command Dashboard:');
    const teamsRes = await fetch(`${baseUrl}/api/response-teams`);
    const teamsData = await teamsRes.json();
    reportCheck('GET /api/response-teams returns HTTP 200 OK', teamsRes.status === 200);
    reportCheck('Response teams array populated with equipment details', Array.isArray(teamsData.teams) && teamsData.teams.length >= 3);

    const targetTeam = teamsData.teams[0];

    const dashRes = await fetch(`${baseUrl}/api/response-teams/dashboard/overview`);
    const dashData = await dashRes.json();
    reportCheck('GET /api/response-teams/dashboard/overview returns HTTP 200', dashRes.status === 200);
    reportCheck('Dashboard reports team availability breakdown and readiness rating',
      typeof dashData.teams.available === 'number' && typeof dashData.readinessRating === 'string'
    );

    // -------------------------------------------------------------------------
    // Check 2: Incident Dispatch Workflow & RBAC Barriers
    // -------------------------------------------------------------------------
    console.log('\n2. Incident Dispatch Workflow & RBAC Barriers:');

    // Citizen attempts dispatch -> 403 Forbidden
    const unauthDispatch = await fetch(`${baseUrl}/api/response-teams/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        incidentId: 'incident-minto-01',
        responseTeamId: targetTeam.id,
        notes: 'Citizen attempting unauthorized team dispatch',
      }),
    });
    reportCheck('Citizen role blocked from dispatching teams (403 Forbidden)', unauthDispatch.status === 403);

    // Admin executes dispatch -> 201 Created
    const authDispatch = await fetch(`${baseUrl}/api/response-teams/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        incidentId: 'incident-minto-01',
        responseTeamId: targetTeam.id,
        notes: 'Deploy heavy submersible dewatering pump to Minto Bridge underpass',
      }),
    });
    const dispatchData = await authDispatch.json();
    reportCheck('ADMIN successfully dispatches team to incident (HTTP 201)', authDispatch.status === 201);
    reportCheck('Team status automatically synchronized to DISPATCHED', dispatchData.teamStatus === 'DISPATCHED');

    const assignmentId = dispatchData.assignment.id;

    // -------------------------------------------------------------------------
    // Check 3: Assignment Progression & Status Synchronization
    // -------------------------------------------------------------------------
    console.log('\n3. Assignment Progression & Team Status Synchronization:');

    // Step 1: Advance assignment to ON_SITE
    const onSiteRes = await fetch(`${baseUrl}/api/response-teams/assignments/${assignmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'ON_SITE',
        notes: 'Crews arrived on scene. Sump pumps powered on.',
      }),
    });
    reportCheck('Assignment advanced to ON_SITE (HTTP 200)', onSiteRes.status === 200);

    // Verify team is now marked ON_SCENE
    const checkOnScene = await fetch(`${baseUrl}/api/response-teams/${targetTeam.id}`);
    const checkOnSceneData = await checkOnScene.json();
    reportCheck('Response team status synchronized to ON_SCENE', checkOnSceneData.status === 'ON_SCENE');

    // Step 2: Complete assignment
    const completeRes = await fetch(`${baseUrl}/api/response-teams/assignments/${assignmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'COMPLETED',
        notes: 'Waterlogging cleared. Road reopened to traffic.',
      }),
    });
    reportCheck('Assignment marked COMPLETED (HTTP 200)', completeRes.status === 200);

    // Verify team is restored to AVAILABLE
    const checkAvailable = await fetch(`${baseUrl}/api/response-teams/${targetTeam.id}`);
    const checkAvailableData = await checkAvailable.json();
    reportCheck('Response team status automatically restored to AVAILABLE', checkAvailableData.status === 'AVAILABLE');

    // -------------------------------------------------------------------------
    // Check 4: Assignments Query
    // -------------------------------------------------------------------------
    console.log('\n4. Assignments Query Endpoint:');
    const listAssignRes = await fetch(`${baseUrl}/api/response-teams/assignments`);
    const listAssignData = await listAssignRes.json();
    reportCheck('GET /api/response-teams/assignments returns HTTP 200 and assignments list',
      listAssignRes.status === 200 && Array.isArray(listAssignData.assignments)
    );
  } finally {
    server.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 8 VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('================================================================\n');

  if (passedChecks === totalChecks) {
    console.log('🎉 Phase 8 Response Team Management & Dispatch verification succeeded!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some Phase 8 checks failed.\n');
    process.exit(1);
  }
}

runPhase8Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
