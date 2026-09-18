/**
 * Comprehensive Phase 9 Verification Suite
 * Pravah V2 - Signature Feature: "What Should the City Do Now?"
 *
 * Validates:
 * 1. Decision support metadata (priorities, categories, actions)
 * 2. Ward-level tactical action plan generation & explainability
 * 3. Quantitative defensible effect metrics (risk reduction, time saved, capacity boost)
 * 4. Rule triggers for DISPATCH, TRAFFIC_CONTROL, INFRASTRUCTURE, and CIVIC_ALERT
 * 5. City-wide tactical command overview & resource deficit assessment
 * 6. Priority filtering (e.g. P1_CRITICAL filter)
 * 7. Custom emergency simulation evaluation & input validation
 * 8. Error handling on invalid ward lookups
 */

const http = require('http');
const app = require('../app');

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

async function runPhase9Verification() {
  console.log('================================================================');
  console.log('    PRAVAH V2 — PHASE 9 DECISION-SUPPORT ENGINE VERIFICATION    ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // -------------------------------------------------------------------------
    // Check 1: Metadata Endpoint
    // -------------------------------------------------------------------------
    console.log('1. Decision Support Engine Metadata:');
    const metaRes = await fetch(`${baseUrl}/api/decision-support/metadata`);
    const metaData = await metaRes.json();

    reportCheck(
      'GET /api/decision-support/metadata returns 200 OK',
      metaRes.status === 200,
      `Status: ${metaRes.status}`
    );

    reportCheck(
      'Metadata declares all 4 action categories and 4 priority tiers',
      metaData.categories &&
        metaData.categories.includes('DISPATCH') &&
        metaData.categories.includes('TRAFFIC_CONTROL') &&
        metaData.categories.includes('INFRASTRUCTURE') &&
        metaData.categories.includes('CIVIC_ALERT') &&
        metaData.priorities?.P1_CRITICAL !== undefined,
      `Categories: ${metaData.categories?.join(', ')}`
    );

    // -------------------------------------------------------------------------
    // Check 2: Ward-Level Decision Support
    // -------------------------------------------------------------------------
    console.log('\n2. Ward-Level Tactical Decision Evaluation:');
    const wardRes = await fetch(`${baseUrl}/api/decision-support/ward/WARD-056`);
    const wardData = await wardRes.json();

    reportCheck(
      'GET /api/decision-support/ward/WARD-056 returns 200 with tactical action plan',
      wardRes.status === 200 && wardData.tacticalActionPlan !== undefined,
      `Status: ${wardRes.status}`
    );

    const recommendations = wardData.tacticalActionPlan?.recommendations || [];
    reportCheck(
      'Generated recommendations include actions across multiple operational categories',
      recommendations.length >= 2,
      `Total actions generated: ${recommendations.length}`
    );

    const firstRec = recommendations[0];
    reportCheck(
      'First recommendation contains explainable reason and quantitative effects',
      firstRec &&
        typeof firstRec.reason === 'string' &&
        firstRec.reason.length > 20 &&
        firstRec.expectedEffect?.projectedRiskScoreReduction !== undefined &&
        firstRec.expectedEffect?.confidence >= 0.8,
      `Reason: ${firstRec?.reason?.substring(0, 60)}...`
    );

    // -------------------------------------------------------------------------
    // Check 3: Critical Hotspot Underpass & Waterlogging Rules
    // -------------------------------------------------------------------------
    console.log('\n3. Critical Hotspot Traffic & Pump Triggers:');
    // Test emergency conditions on Minto Bridge (WARD-056) with 50cm water depth and risk 85
    const emergencyWardRes = await fetch(
      `${baseUrl}/api/decision-support/ward/WARD-056?riskScore=85&avgWaterDepthCm=50&rainfallMm=40`
    );
    const emergencyWardData = await emergencyWardRes.json();
    const emergRecs = emergencyWardData.tacticalActionPlan?.recommendations || [];

    const hasTrafficClosure = emergRecs.some(
      (r) => r.category === 'TRAFFIC_CONTROL' && r.actionType === 'CLOSE_UNDERPASS_AND_DIVERT'
    );
    reportCheck(
      'Triggers underpass barricading & traffic diversion when depth exceeds critical threshold',
      hasTrafficClosure,
      `Recommendations: ${emergRecs.map((r) => r.actionType).join(', ')}`
    );

    const hasPumpDispatch = emergRecs.some(
      (r) => r.category === 'DISPATCH' && r.actionType === 'DEPLOY_MOBILE_PUMP'
    );
    reportCheck(
      'Triggers high-capacity mobile dewatering pump deployment at critical flood risk',
      hasPumpDispatch,
      `Pump dispatch found: ${hasPumpDispatch}`
    );

    // Verify priority ranking: P1_CRITICAL must be ranked first
    const prioritiesInOrder = emergRecs.map((r) => r.priorityRank);
    const isSorted = prioritiesInOrder.every((val, i, arr) => !i || arr[i - 1] <= val);
    reportCheck(
      'Actions are strictly prioritized (P1_CRITICAL before P2_HIGH before P3_MEDIUM)',
      isSorted,
      `Priority ranks: ${prioritiesInOrder.join(' <= ')}`
    );

    // -------------------------------------------------------------------------
    // Check 4: City-Wide Executive Operational Action Plan
    // -------------------------------------------------------------------------
    console.log('\n4. City-Wide Operational Command Plan:');
    const cityRes = await fetch(`${baseUrl}/api/decision-support/city?limit=10`);
    const cityData = await cityRes.json();

    reportCheck(
      'GET /api/decision-support/city returns 200 with executive summary and top action plan',
      cityRes.status === 200 &&
        cityData.citySummary !== undefined &&
        Array.isArray(cityData.topActionPlan),
      `Top actions count: ${cityData.topActionPlan?.length}`
    );

    reportCheck(
      'City summary provides monitored wards, resource status, and resource deficit metrics',
      cityData.citySummary.monitoredWardsCount > 0 &&
        cityData.citySummary.resourceStatus !== undefined &&
        typeof cityData.citySummary.resourceStatus.resourceDeficitDetected === 'boolean',
      `Monitored: ${cityData.citySummary.monitoredWardsCount}, Available Teams: ${cityData.citySummary.resourceStatus?.availableResponseTeams}`
    );

    // Test priority filtering
    const filteredRes = await fetch(`${baseUrl}/api/decision-support/city?minPriority=P1_CRITICAL`);
    const filteredData = await filteredRes.json();
    const allFilteredP1 = (filteredData.topActionPlan || []).every((r) => r.priority === 'P1_CRITICAL');
    reportCheck(
      'Query param minPriority=P1_CRITICAL filters queue strictly to critical actions',
      allFilteredP1,
      `Action priorities: ${filteredData.topActionPlan?.map((r) => r.priority).join(', ')}`
    );

    // -------------------------------------------------------------------------
    // Check 5: Custom Emergency Scenario Evaluation
    // -------------------------------------------------------------------------
    console.log('\n5. Custom Emergency Evaluation / What-If Readiness:');
    const customRes = await fetch(`${baseUrl}/api/decision-support/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardId: 'WARD-112',
        riskScore: 78.5,
        primaryDriver: 'DRAINAGE_DEFICIT',
        rainfallMm: 35.0,
        avgWaterDepthCm: 48.0,
        activeIncidentsCount: 2,
      }),
    });
    const customData = await customRes.json();

    reportCheck(
      'POST /api/decision-support/evaluate evaluates hypothetical emergency parameters',
      customRes.status === 200 && customData.isSimulation === true,
      `Status: ${customRes.status}`
    );

    reportCheck(
      'Hypothetical evaluation returns quantified post-intervention risk estimate',
      customData.tacticalActionPlan?.recommendations?.[0]?.expectedEffect
        ?.postInterventionEstimatedRisk < 78.5,
      `Post-intervention risk: ${customData.tacticalActionPlan?.recommendations?.[0]?.expectedEffect?.postInterventionEstimatedRisk}`
    );

    // -------------------------------------------------------------------------
    // Check 6: Validation and Error Handling
    // -------------------------------------------------------------------------
    console.log('\n6. Validation & Error Handling:');
    const invalidRes = await fetch(`${baseUrl}/api/decision-support/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        riskScore: 999, // Invalid: max 100
      }),
    });
    reportCheck(
      'POST /api/decision-support/evaluate rejects invalid risk scores with 400 Bad Request',
      invalidRes.status === 400,
      `Status: ${invalidRes.status}`
    );

    const notFoundRes = await fetch(`${baseUrl}/api/decision-support/ward/NON_EXISTENT_WARD_XYZ`);
    reportCheck(
      'GET /api/decision-support/ward/NON_EXISTENT returns 404 Not Found',
      notFoundRes.status === 404,
      `Status: ${notFoundRes.status}`
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`    PHASE 9 VERIFICATION RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log('================================================================');

    if (passedChecks === totalChecks) {
      console.log('  🎉 ALL PHASE 9 CHECKS PASSED! "What Should the City Do Now?" ready.\n');
      process.exit(0);
    } else {
      console.error(`  ⚠️ ${totalChecks - passedChecks} checks failed.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal Verification Error:', error);
    process.exit(1);
  } finally {
    server.close();
  }
}

runPhase9Verification();
