/**
 * Comprehensive Phase 10 Verification Suite
 * Pravah V2 - What-If Flood Scenario Simulator
 *
 * Validates:
 * 1. Scenario Presets & parameter boundary definitions
 * 2. Ward-level hazard shock simulation (rainfall surge increases risk)
 * 3. Ward-level mitigation intervention simulation (mobile pump deployment reduces risk)
 * 4. Side-by-side baseline vs simulated comparison metrics
 * 5. Mandatory isSimulation: true labeling & disclaimer
 * 6. Preset application workflow (e.g. CLOUDBURST_DELHI_100MM)
 * 7. Macro city-wide disaster scenario simulation & hotspot projection
 * 8. Validation schema enforcement & error handling
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

async function runPhase10Verification() {
  console.log('================================================================');
  console.log('       PRAVAH V2 — PHASE 10 WHAT-IF SIMULATOR VERIFICATION       ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // -------------------------------------------------------------------------
    // Check 1: Simulation Presets Endpoint
    // -------------------------------------------------------------------------
    console.log('1. Scenario Presets & Configuration Boundaries:');
    const presetsRes = await fetch(`${baseUrl}/api/simulation/presets`);
    const presetsData = await presetsRes.json();

    reportCheck(
      'GET /api/simulation/presets returns 200 OK',
      presetsRes.status === 200,
      `Status: ${presetsRes.status}`
    );

    reportCheck(
      'Returns standard presets including Cloudburst and Drainage Siltation',
      Array.isArray(presetsData.presets) &&
        presetsData.presets.some((p) => p.id === 'CLOUDBURST_DELHI_100MM') &&
        presetsData.presets.some((p) => p.id === 'DRAINAGE_SILTATION_40PCT') &&
        presetsData.presets.some((p) => p.id === 'MAX_EMERGENCY_DEWATERING'),
      `Presets count: ${presetsData.presets?.length}`
    );

    reportCheck(
      'Presets payload contains parameter constraints and simulation disclaimer',
      Boolean(presetsData.configurableParameters?.rainfallMm && presetsData.disclaimer),
      `Disclaimer: ${presetsData.disclaimer?.substring(0, 40)}...`
    );

    // -------------------------------------------------------------------------
    // Check 2: Ward Hazard Shock Simulation
    // -------------------------------------------------------------------------
    console.log('\n2. Ward Hazard Escalation Simulation:');
    const hazardRes = await fetch(`${baseUrl}/api/simulation/ward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardId: 'W056',
        rainfallMm: 95.0,
        complaintSpike: 12,
        waterDepthCm: 70.0,
      }),
    });
    const hazardData = await hazardRes.json();

    reportCheck(
      'POST /api/simulation/ward returns 200 OK with simulation ID',
      hazardRes.status === 200 && typeof hazardData.simulationId === 'string',
      `Status: ${hazardRes.status}`
    );

    reportCheck(
      'Simulated hazard is explicitly labeled with isSimulation: true and disclaimer',
      hazardData.isSimulation === true && typeof hazardData.disclaimer === 'string',
      `isSimulation: ${hazardData.isSimulation}`
    );

    reportCheck(
      'Extreme rainfall surge increases risk score and reflects severe hazard escalation',
      hazardData.comparison?.deltas?.riskScore > 0 &&
        hazardData.comparison?.simulated?.riskScore > hazardData.comparison?.baseline?.riskScore &&
        hazardData.comparison?.deltas?.impactAssessment === 'SEVERE_HAZARD_ESCALATION',
      `Baseline: ${hazardData.comparison?.baseline?.riskScore} -> Simulated: ${hazardData.comparison?.simulated?.riskScore} (Delta: +${hazardData.comparison?.deltas?.riskScore})`
    );

    // -------------------------------------------------------------------------
    // Check 3: Ward Mitigation Intervention Simulation
    // -------------------------------------------------------------------------
    console.log('\n3. Ward Mitigation Intervention Simulation (Pumps + Dredging):');
    const mitigationRes = await fetch(`${baseUrl}/api/simulation/ward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardId: 'W056',
        drainageModifierPct: 25,
        additionalMobilePumps: 3,
      }),
    });
    const mitigationData = await mitigationRes.json();

    reportCheck(
      'Intervention simulation shows lower simulated risk score than baseline',
      mitigationData.comparison?.deltas?.riskScore < 0 &&
        mitigationData.comparison?.deltas?.impactAssessment === 'SIGNIFICANT_MITIGATION',
      `Delta: ${mitigationData.comparison?.deltas?.riskScore} points`
    );

    reportCheck(
      'Simulated pump deployment calculates positive inundation reduction minutes',
      mitigationData.comparison?.simulated?.estimatedInundationMins <
        mitigationData.comparison?.baseline?.estimatedInundationMins,
      `Baseline Inundation: ${mitigationData.comparison?.baseline?.estimatedInundationMins}m -> Sim: ${mitigationData.comparison?.simulated?.estimatedInundationMins}m`
    );

    // -------------------------------------------------------------------------
    // Check 4: Preset-Driven Ward Simulation
    // -------------------------------------------------------------------------
    console.log('\n4. Preset-Driven Ward Scenario Execution:');
    const presetWardRes = await fetch(`${baseUrl}/api/simulation/ward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardId: 'W056',
        presetId: 'CLOUDBURST_DELHI_100MM',
      }),
    });
    const presetWardData = await presetWardRes.json();

    reportCheck(
      'Applying preset CLOUDBURST_DELHI_100MM correctly adopts 100mm/h rainfall parameter',
      presetWardRes.status === 200 &&
        presetWardData.scenarioPresetApplied === 'CLOUDBURST_DELHI_100MM' &&
        presetWardData.interventionsApplied?.simulatedRainfallMm === 100.0,
      `Rainfall: ${presetWardData.interventionsApplied?.simulatedRainfallMm} mm/h`
    );

    // -------------------------------------------------------------------------
    // Check 5: City-Wide Macro Simulation
    // -------------------------------------------------------------------------
    console.log('\n5. City-Wide Macro Scenario Simulation:');
    const citySimRes = await fetch(`${baseUrl}/api/simulation/city`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rainfallMultiplier: 2.2,
        drainageModifierPct: -15,
      }),
    });
    const citySimData = await citySimRes.json();

    reportCheck(
      'POST /api/simulation/city returns 200 with side-by-side citywide distributions',
      citySimRes.status === 200 &&
        citySimData.isSimulation === true &&
        citySimData.citywideImpact?.baselineDistribution !== undefined &&
        citySimData.citywideImpact?.simulatedDistribution !== undefined,
      `Simulated critical wards: ${citySimData.citywideImpact?.simulatedDistribution?.critical}`
    );

    reportCheck(
      'City simulation captures net average risk shift across monitored wards',
      citySimData.citywideImpact?.netShifts?.averageRiskShift > 0,
      `Net average risk shift: +${citySimData.citywideImpact?.netShifts?.averageRiskShift} points`
    );

    reportCheck(
      'City simulation includes projected status for vulnerable Delhi underpasses',
      Array.isArray(citySimData.hotspotProjections) &&
        citySimData.hotspotProjections.some((h) => h.hotspotName.includes('Minto Bridge')),
      `Hotspots evaluated: ${citySimData.hotspotProjections?.map((h) => h.hotspotName).join(', ')}`
    );

    // -------------------------------------------------------------------------
    // Check 6: Validation & Error Handling
    // -------------------------------------------------------------------------
    console.log('\n6. Validation & Error Handling:');
    const invalidParamRes = await fetch(`${baseUrl}/api/simulation/ward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardId: 'W056',
        rainfallMultiplier: -5.0, // Invalid: min 0.05
      }),
    });
    reportCheck(
      'POST /api/simulation/ward rejects out-of-range rainfallMultiplier with 400 Bad Request',
      invalidParamRes.status === 400,
      `Status: ${invalidParamRes.status}`
    );

    const unknownWardRes = await fetch(`${baseUrl}/api/simulation/ward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardId: 'INVALID_WARD_99999',
      }),
    });
    reportCheck(
      'POST /api/simulation/ward returns 404 on unresolvable ward ID',
      unknownWardRes.status === 404,
      `Status: ${unknownWardRes.status}`
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`    PHASE 10 VERIFICATION RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log('================================================================');

    if (passedChecks === totalChecks) {
      console.log('  🎉 ALL PHASE 10 CHECKS PASSED! What-If Simulator fully operational.\n');
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

runPhase10Verification();
