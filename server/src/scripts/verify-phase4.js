/**
 * Comprehensive Phase 4 Verification Suite
 * Pravah V2 - Explainable Risk Engine V2
 *
 * Validates:
 * 1. Mathematical normalization and boundary constraints (0 - 100 score bounds)
 * 2. Risk level classification (LOW, MODERATE, HIGH, CRITICAL)
 * 3. Primary driver detection (RAINFALL_SURGE, DRAINAGE_DEFICIT, CITIZEN_URGENCY)
 * 4. Custom configurable weights application
 * 5. Data confidence / freshness estimation
 * 6. Live HTTP endpoint testing against Express router
 */

const http = require('http');
const app = require('../app');
const {
  evaluateRisk,
  classifyRiskLevel,
  DEFAULT_WEIGHTS,
} = require('../services/risk-engine.service');
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

async function runPhase4Verification() {
  console.log('================================================================');
  console.log('      PRAVAH V2 — PHASE 4 EXPLAINABLE RISK ENGINE VERIFICATION     ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // Check 1: Unit Mathematical & Boundary Calculations
  // ---------------------------------------------------------------------------
  console.log('1. Mathematical Normalization & Bounds:');

  // Ideal scenario: Max drainage (100 m3/s), Zero rain, Zero complaints
  const idealRes = evaluateRisk({
    drainageCapacity: 100.0,
    rainfallMm: 0.0,
    complaintCount: 0,
    avgWaterDepthCm: 0.0,
  });
  reportCheck('Ideal conditions yield zero risk score (0.0)', idealRes.riskScore === 0.0 && idealRes.riskLevel === 'LOW');

  // Extreme disaster scenario: Zero drainage, 80mm rain (> benchmark 60), 15 complaints, 80cm depth
  const extremeRes = evaluateRisk({
    drainageCapacity: 0.0,
    rainfallMm: 80.0,
    complaintCount: 15,
    avgWaterDepthCm: 80.0,
  });
  reportCheck('Extreme disaster conditions capped at max 100.0', extremeRes.riskScore === 100.0 && extremeRes.riskLevel === 'CRITICAL');

  // Negative inputs handled defensively
  const defensiveRes = evaluateRisk({
    drainageCapacity: -50.0,
    rainfallMm: -20.0,
    complaintCount: -5,
  });
  reportCheck('Defensive handling of negative inputs produces valid bounded score', defensiveRes.riskScore >= 0 && defensiveRes.riskScore <= 100);

  // ---------------------------------------------------------------------------
  // Check 2: Operational Classification & Primary Driver Detection
  // ---------------------------------------------------------------------------
  console.log('\n2. Risk Classification & Primary Driver Detection:');

  reportCheck('Classification thresholds verify (35=LOW, 50=MODERATE, 65=HIGH, 80=CRITICAL)',
    classifyRiskLevel(35) === 'LOW' &&
    classifyRiskLevel(50) === 'MODERATE' &&
    classifyRiskLevel(65) === 'HIGH' &&
    classifyRiskLevel(80) === 'CRITICAL'
  );

  // Scenario driven primarily by flash rainfall
  const rainDrivenRes = evaluateRisk({
    drainageCapacity: 90.0, // strong drainage (low deficit)
    rainfallMm: 55.0,        // heavy rain (high surge)
    complaintCount: 0,
  });
  reportCheck('Flash rain surge correctly identified as primary driver', rainDrivenRes.primaryDriver === 'RAINFALL_SURGE');

  // Scenario driven by clogged drainage
  const drainageDrivenRes = evaluateRisk({
    drainageCapacity: 5.0,  // very poor drainage (high deficit)
    rainfallMm: 5.0,         // light rain
    complaintCount: 0,
  });
  reportCheck('Drainage deficit correctly identified as primary driver', drainageDrivenRes.primaryDriver === 'DRAINAGE_DEFICIT');

  // ---------------------------------------------------------------------------
  // Check 3: Configurable Custom Weights
  // ---------------------------------------------------------------------------
  console.log('\n3. Configurable Weights Support:');
  const customWeights = { drainage: 0.10, rainfall: 0.80, complaints: 0.10 };
  const customWeightRes = evaluateRisk({
    drainageCapacity: 0.0, // 100 deficit * 0.1 = 10
    rainfallMm: 60.0,       // 100 surge * 0.8 = 80
    complaintCount: 0,     // 0 * 0.1 = 0
    weights: customWeights,
  });
  reportCheck('Custom weights applied accurately (80% rainfall weight produces 90.0 score)', customWeightRes.riskScore === 90.0);

  // ---------------------------------------------------------------------------
  // Check 4: Data Freshness Indicators
  // ---------------------------------------------------------------------------
  console.log('\n4. Data Freshness & Confidence Estimation:');
  const freshRes = evaluateRisk({ observedAt: new Date() });
  reportCheck('Recent observation tagged REAL_TIME with 95% confidence', freshRes.meta.freshnessStatus === 'REAL_TIME' && freshRes.meta.confidenceScore === 95);

  const staleTime = new Date(Date.now() - 36 * 3600 * 1000); // 36 hours ago
  const staleRes = evaluateRisk({ observedAt: staleTime });
  reportCheck('Old observation tagged STALE with reduced confidence', staleRes.meta.freshnessStatus === 'STALE' && staleRes.meta.confidenceScore < 60);

  // ---------------------------------------------------------------------------
  // Check 5: Live HTTP Endpoint Testing
  // ---------------------------------------------------------------------------
  console.log('\n5. Live HTTP API Endpoint Testing:');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 5.1 GET /api/risk/summary
    const summaryRes = await fetch(`${baseUrl}/api/risk/summary`);
    const summaryData = await summaryRes.json();
    reportCheck('GET /api/risk/summary returns HTTP 200 OK', summaryRes.status === 200);
    reportCheck('Summary contains total wards and vulnerability counts', Boolean(summaryData.totalWardsMonitored && summaryData.countsByLevel));

    // 5.2 GET /api/risk/ward/:id
    const wardRiskRes = await fetch(`${baseUrl}/api/risk/ward/W001`);
    const wardRiskData = await wardRiskRes.json();
    reportCheck('GET /api/risk/ward/W001 returns HTTP 200 and evaluation details', wardRiskRes.status === 200 && Boolean(wardRiskData.evaluation.riskScore));

    // 5.3 POST /api/risk/evaluate (Dynamic Scenario)
    const evalRes = await fetch(`${baseUrl}/api/risk/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drainageCapacity: 40.0,
        rainfallMm: 45.0,
        complaintCount: 3,
        avgWaterDepthCm: 30.0,
      }),
    });
    const evalData = await evalRes.json();
    reportCheck('POST /api/risk/evaluate returns 200 with scenario calculation', evalRes.status === 200 && evalData.evaluation.riskLevel !== undefined);

    // 5.4 POST /api/risk/recalculate without auth -> 401
    const unauthRecalcRes = await fetch(`${baseUrl}/api/risk/recalculate`, { method: 'POST' });
    reportCheck('POST /api/risk/recalculate without token rejected with HTTP 401', unauthRecalcRes.status === 401);

    // 5.5 POST /api/risk/recalculate with ADMIN token -> 200
    const adminToken = generateToken({
      id: 'admin-test-id',
      email: 'admin@pravah.delhi.gov.in',
      name: 'Commissioner',
      role: 'ADMIN',
    });
    const authRecalcRes = await fetch(`${baseUrl}/api/risk/recalculate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    reportCheck('POST /api/risk/recalculate with ADMIN token returns HTTP 200', authRecalcRes.status === 200);
  } finally {
    server.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 4 VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('================================================================\n');

  if (passedChecks === totalChecks) {
    console.log('🎉 Phase 4 Explainable Risk Engine verification succeeded!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some Phase 4 checks failed.\n');
    process.exit(1);
  }
}

runPhase4Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
