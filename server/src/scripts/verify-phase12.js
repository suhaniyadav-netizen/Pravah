/**
 * Comprehensive Phase 12 Verification Suite
 * Pravah V2 - Historical Analytics & Telemetry Aggregation
 *
 * Validates:
 * 1. Historical risk trends (citywide & ward-specific timelines)
 * 2. Historical rainfall trends & rolling 7-day averages
 * 3. Complaint resolution metrics (MTTR, SLA compliance, severity breakdown)
 * 4. Curated recurring historical waterlogging hotspot registry
 * 5. Multi-ward comparative vulnerability benchmarking
 * 6. Infrastructure vulnerability audit summary
 * 7. Strict temporal labeling (dataType: 'HISTORICAL')
 * 8. Validation and error handling
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

async function runPhase12Verification() {
  console.log('================================================================');
  console.log('       PRAVAH V2 — PHASE 12 HISTORICAL ANALYTICS VERIFICATION    ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // -------------------------------------------------------------------------
    // Check 1: Historical Risk Trends
    // -------------------------------------------------------------------------
    console.log('1. Historical Risk Trends:');
    const cityRiskRes = await fetch(`${baseUrl}/api/analytics/trends/risk?rangeDays=14`);
    const cityRiskData = await cityRiskRes.json();

    reportCheck(
      'GET /api/analytics/trends/risk returns 200 OK with historical timeline',
      cityRiskRes.status === 200 && Array.isArray(cityRiskData.series),
      `Status: ${cityRiskRes.status}, Series items: ${cityRiskData.series?.length}`
    );

    reportCheck(
      'Risk trend payload explicitly declares dataType: HISTORICAL and includes summary',
      cityRiskData.dataType === 'HISTORICAL' &&
        typeof cityRiskData.summary?.averageRiskScore === 'number' &&
        ['RISING', 'STABLE', 'DECLINING'].includes(cityRiskData.summary?.trendDirection),
      `Avg Risk: ${cityRiskData.summary?.averageRiskScore}, Trend: ${cityRiskData.summary?.trendDirection}`
    );

    const wardRiskRes = await fetch(`${baseUrl}/api/analytics/trends/risk?wardId=W056&rangeDays=7`);
    const wardRiskData = await wardRiskRes.json();
    reportCheck(
      'Ward-specific risk trend retrieves timeline for requested ward (W056)',
      wardRiskRes.status === 200 && wardRiskData.series?.length === 7,
      `Scope: ${wardRiskData.scope}`
    );

    // -------------------------------------------------------------------------
    // Check 2: Historical Rainfall Trends
    // -------------------------------------------------------------------------
    console.log('\n2. Historical Rainfall Trends & Rolling Averages:');
    const rainRes = await fetch(`${baseUrl}/api/analytics/trends/rainfall?rangeDays=14`);
    const rainData = await rainRes.json();

    reportCheck(
      'GET /api/analytics/trends/rainfall returns 200 with daily precipitation totals',
      rainRes.status === 200 && rainData.series?.length === 14,
      `Status: ${rainRes.status}`
    );

    reportCheck(
      'Rainfall series computes rolling 7-day averages and heavy rain flags',
      rainData.series?.every((s) => typeof s.rolling7DayAvgMm === 'number') &&
        typeof rainData.summary?.cumulativeRainfallMm === 'number',
      `Cumulative Rain: ${rainData.summary?.cumulativeRainfallMm}mm, Heavy days: ${rainData.summary?.heavyRainDaysCount}`
    );

    // -------------------------------------------------------------------------
    // Check 3: Complaint Resolution & MTTR Metrics
    // -------------------------------------------------------------------------
    console.log('\n3. Complaint Resolution Metrics & MTTR:');
    const mttrRes = await fetch(`${baseUrl}/api/analytics/complaints/resolution-metrics?rangeDays=30`);
    const mttrData = await mttrRes.json();

    reportCheck(
      'GET /api/analytics/complaints/resolution-metrics returns 200 with resolution rate',
      mttrRes.status === 200 && mttrData.complaintMetrics?.resolutionRatePct > 50,
      `Resolution Rate: ${mttrData.complaintMetrics?.resolutionRatePct}%`
    );

    reportCheck(
      'Returns Mean Time to Resolution (MTTR) in hours and SLA compliance rate',
      typeof mttrData.resolutionPerformance?.meanTimeToResolutionHours === 'number' &&
        mttrData.resolutionPerformance?.slaComplianceRatePct >= 80,
      `MTTR: ${mttrData.resolutionPerformance?.meanTimeToResolutionHours}h, SLA Compliance: ${mttrData.resolutionPerformance?.slaComplianceRatePct}%`
    );

    // -------------------------------------------------------------------------
    // Check 4: Historical Hotspots Registry
    // -------------------------------------------------------------------------
    console.log('\n4. Recurring Flood Hotspots Registry:');
    const hotspotRes = await fetch(`${baseUrl}/api/analytics/hotspots?limit=5`);
    const hotspotData = await hotspotRes.json();

    reportCheck(
      'GET /api/analytics/hotspots returns 200 with ranked recurrence registry',
      hotspotRes.status === 200 && Array.isArray(hotspotData.hotspots),
      `Hotspots count: ${hotspotData.hotspots?.length}`
    );

    const topHotspot = hotspotData.hotspots?.[0];
    reportCheck(
      'Top hotspot identifies Minto Bridge with recurrence score and max depth',
      topHotspot &&
        topHotspot.name.includes('Minto Bridge') &&
        topHotspot.recurrenceScore > 90 &&
        topHotspot.maxWaterDepthCm >= 100,
      `Rank 1: ${topHotspot?.name}, Score: ${topHotspot?.recurrenceScore}, Max Depth: ${topHotspot?.maxWaterDepthCm}cm`
    );

    // -------------------------------------------------------------------------
    // Check 5: Multi-Ward Vulnerability Comparison
    // -------------------------------------------------------------------------
    console.log('\n5. Multi-Ward Comparative Benchmarking:');
    const compareRes = await fetch(`${baseUrl}/api/analytics/wards/compare?wardIds=W001,W056,W112`);
    const compareData = await compareRes.json();

    reportCheck(
      'GET /api/analytics/wards/compare compares requested wards side-by-side',
      compareRes.status === 200 && compareData.comparedCount === 3,
      `Compared wards count: ${compareData.comparedCount}`
    );

    reportCheck(
      'Comparative benchmarking ranks wards by drainage deficit and assigns vulnerability ratings',
      compareData.wards?.every((w) => typeof w.drainageDeficitPct === 'number' && w.vulnerabilityRating) &&
        typeof compareData.highestVulnerabilityWard === 'string',
      `Highest vulnerability: ${compareData.highestVulnerabilityWard}`
    );

    // -------------------------------------------------------------------------
    // Check 6: Infrastructure Vulnerability Summary
    // -------------------------------------------------------------------------
    console.log('\n6. Infrastructure Vulnerability Audit:');
    const infraRes = await fetch(`${baseUrl}/api/analytics/infrastructure/vulnerability`);
    const infraData = await infraRes.json();

    reportCheck(
      'GET /api/analytics/infrastructure/vulnerability returns 200 with asset audit breakdown',
      infraRes.status === 200 &&
        infraData.assetsAudited?.pumpingStations > 0 &&
        infraData.vulnerabilityDistribution?.CRITICAL_RISK !== undefined,
      `Pump stations: ${infraData.assetsAudited?.pumpingStations}, Critical assets: ${infraData.vulnerabilityDistribution?.CRITICAL_RISK?.count}`
    );

    // -------------------------------------------------------------------------
    // Check 7: Validation & Error Handling
    // -------------------------------------------------------------------------
    console.log('\n7. Validation & Error Handling:');
    const singleWardCompareRes = await fetch(`${baseUrl}/api/analytics/wards/compare?wardIds=W001`);
    reportCheck(
      'Rejects comparison of fewer than 2 wards with 400 Bad Request',
      singleWardCompareRes.status === 400,
      `Status: ${singleWardCompareRes.status}`
    );

    const invalidWardTrendRes = await fetch(`${baseUrl}/api/analytics/trends/risk?wardId=NON_EXISTENT_WARD_XYZ`);
    reportCheck(
      'Returns 404 Not Found on unresolvable ward ID in risk trends',
      invalidWardTrendRes.status === 404,
      `Status: ${invalidWardTrendRes.status}`
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`    PHASE 12 VERIFICATION RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log('================================================================');

    if (passedChecks === totalChecks) {
      console.log('  🎉 ALL PHASE 12 CHECKS PASSED! Historical Analytics fully operational.\n');
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

runPhase12Verification();
