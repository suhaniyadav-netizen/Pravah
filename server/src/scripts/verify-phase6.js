/**
 * Comprehensive Phase 6 Verification Suite
 * Pravah V2 - Multi-Horizon Flood Forecasting & ML Audit
 *
 * Validates:
 * 1. 6h, 12h, and 24h hydrological projection modeling
 * 2. Expanding uncertainty bounds (confidence intervals) over horizons
 * 3. Escalation trend detection (ESCALATING, STABLE, RECEDING)
 * 4. Transparent baseline evaluation & ML justification audit
 * 5. Live HTTP API endpoint testing
 */

const http = require('http');
const app = require('../app');
const {
  computeHorizonProjection,
  getModelEvaluation,
} = require('../services/forecasting.service');

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

async function runPhase6Verification() {
  console.log('================================================================');
  console.log('      PRAVAH V2 — PHASE 6 MULTI-HORIZON FORECASTING TEST        ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // Check 1: Multi-Horizon Projection Logic
  // ---------------------------------------------------------------------------
  console.log('1. Multi-Horizon Hydrological Modeling:');
  const mockHourlyForecast = Array.from({ length: 24 }, (_, i) => ({
    time: `2026-09-18T${String(i).padStart(2, '0')}:00`,
    rainfallMm: i < 6 ? 12.0 : 2.0, // heavy rain first 6 hours
  }));

  const proj6 = computeHorizonProjection({
    horizonHours: 6,
    hourlyForecast: mockHourlyForecast,
    drainageCapacity: 40.0,
    baselineRiskScore: 50.0,
  });

  const proj12 = computeHorizonProjection({
    horizonHours: 12,
    hourlyForecast: mockHourlyForecast,
    drainageCapacity: 40.0,
    baselineRiskScore: 50.0,
  });

  const proj24 = computeHorizonProjection({
    horizonHours: 24,
    hourlyForecast: mockHourlyForecast,
    drainageCapacity: 40.0,
    baselineRiskScore: 50.0,
  });

  reportCheck('6-hour horizon calculates cumulative rainfall accurately', proj6.cumulativeRainfallMm === 72.0);
  reportCheck('Projected risk reflects surge from forecasted rain', proj6.projectedRiskScore > 50.0);
  reportCheck('Heavy precipitation triggers ESCALATING trend', proj6.trend === 'ESCALATING');

  // Verify expanding uncertainty intervals
  const margin6 = proj6.confidenceInterval[1] - proj6.confidenceInterval[0];
  const margin12 = proj12.confidenceInterval[1] - proj12.confidenceInterval[0];
  const margin24 = proj24.confidenceInterval[1] - proj24.confidenceInterval[0];
  reportCheck('Uncertainty intervals expand appropriately over time (6h < 12h < 24h)', margin6 <= margin12 && margin12 <= margin24);

  // ---------------------------------------------------------------------------
  // Check 2: Model Evaluation & ML Justification Audit
  // ---------------------------------------------------------------------------
  console.log('\n2. Baseline Performance & ML Justification Audit:');
  const evaluation = getModelEvaluation();
  reportCheck('Model evaluation publishes MAE and RMSE error metrics',
    typeof evaluation.benchmarkMetrics.meanAbsoluteError === 'number' &&
    typeof evaluation.benchmarkMetrics.rootMeanSquareError === 'number'
  );
  reportCheck('ML comparison provides transparent justification and prerequisite criteria',
    Array.isArray(evaluation.mlComparisonAudit.prerequisitesForMLUpgrade) &&
    evaluation.mlComparisonAudit.prerequisitesForMLUpgrade.length >= 3
  );

  // ---------------------------------------------------------------------------
  // Check 3: Live HTTP API Endpoint Testing
  // ---------------------------------------------------------------------------
  console.log('\n3. Live HTTP API Endpoint Testing:');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 3.1 GET /api/forecasting/ward/W001
    const wardForeRes = await fetch(`${baseUrl}/api/forecasting/ward/W001`);
    const wardForeData = await wardForeRes.json();
    reportCheck('GET /api/forecasting/ward/W001 returns HTTP 200 OK', wardForeRes.status === 200);
    reportCheck('Response contains h6, h12, and h24 forecast objects',
      Boolean(wardForeData.horizons && wardForeData.horizons.h6 && wardForeData.horizons.h12 && wardForeData.horizons.h24)
    );
    reportCheck('Each horizon provides confidence intervals and recommendations',
      Array.isArray(wardForeData.horizons.h6.confidenceInterval) &&
      typeof wardForeData.horizons.h6.recommendation === 'string'
    );

    // 3.2 GET /api/forecasting/city
    const cityForeRes = await fetch(`${baseUrl}/api/forecasting/city`);
    const cityForeData = await cityForeRes.json();
    reportCheck('GET /api/forecasting/city returns HTTP 200 OK', cityForeRes.status === 200);
    reportCheck('City forecast identifies high-risk escalation candidates',
      Array.isArray(cityForeData.highRiskWardsNext24h)
    );

    // 3.3 GET /api/forecasting/model-evaluation
    const evalRes = await fetch(`${baseUrl}/api/forecasting/model-evaluation`);
    const evalData = await evalRes.json();
    reportCheck('GET /api/forecasting/model-evaluation returns HTTP 200 OK', evalRes.status === 200);
    reportCheck('Evaluation returns model name and benchmark metrics',
      evalData.modelName && evalData.benchmarkMetrics
    );
  } finally {
    server.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 6 VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('================================================================\n');

  if (passedChecks === totalChecks) {
    console.log('🎉 Phase 6 Multi-Horizon Flood Forecasting verification succeeded!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some Phase 6 checks failed.\n');
    process.exit(1);
  }
}

runPhase6Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
