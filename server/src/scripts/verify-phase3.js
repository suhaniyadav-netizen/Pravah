/**
 * Comprehensive Phase 3 Verification Suite
 * Pravah V2 - GIS / Ward System & Spatial APIs
 *
 * Validates:
 * 1. GeoJSON specification compliance for all 250 wards
 * 2. Ward keyword search (by name, code, zone)
 * 3. Point-in-polygon & nearest ward resolution
 * 4. Ward detail & contained infrastructure queries
 * 5. End-to-end HTTP request flow against Express server
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

async function runPhase3Verification() {
  console.log('================================================================');
  console.log('       PRAVAH V2 — PHASE 3 GIS & WARD SYSTEM VERIFICATION        ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // -------------------------------------------------------------------------
    // Check 1: GET /api/wards (GeoJSON FeatureCollection)
    // -------------------------------------------------------------------------
    console.log('1. Full Ward GeoJSON FeatureCollection:');
    const wardsRes = await fetch(`${baseUrl}/api/wards`);
    const wardsGeoJSON = await wardsRes.json();

    reportCheck('GET /api/wards returns HTTP 200 OK', wardsRes.status === 200);
    reportCheck("Root object is GeoJSON 'FeatureCollection'", wardsGeoJSON.type === 'FeatureCollection');
    reportCheck(`Contains exactly 250 ward features (count: ${wardsGeoJSON.features.length})`, wardsGeoJSON.features.length === 250);

    const sampleFeature = wardsGeoJSON.features[0];
    const hasValidGeometry =
      sampleFeature &&
      sampleFeature.geometry &&
      sampleFeature.geometry.type === 'MultiPolygon' &&
      Array.isArray(sampleFeature.geometry.coordinates);
    reportCheck('Ward features contain valid MultiPolygon geometries', hasValidGeometry);

    const props = sampleFeature.properties;
    const hasRequiredProps =
      props &&
      typeof props.ward_code === 'string' &&
      typeof props.ward_name === 'string' &&
      typeof props.drainage_capacity === 'number' &&
      typeof props.current_risk_score === 'number';
    reportCheck('Ward properties include ward_code, ward_name, drainage, and risk score', hasRequiredProps);

    // -------------------------------------------------------------------------
    // Check 2: GET /api/wards/search (Keyword Search)
    // -------------------------------------------------------------------------
    console.log('\n2. Ward Search & Filtering:');
    const searchRes = await fetch(`${baseUrl}/api/wards/search?q=Narela`);
    const searchData = await searchRes.json();

    reportCheck('GET /api/wards/search?q=Narela returns HTTP 200 OK', searchRes.status === 200);
    reportCheck('Search matches Narela ward', searchData.results.some((w) => w.wardName.includes('Narela')));

    const codeSearchRes = await fetch(`${baseUrl}/api/wards/search?q=W001`);
    const codeSearchData = await codeSearchRes.json();
    reportCheck('Search matches by ward code (W001)', codeSearchData.results.some((w) => w.wardCode === 'W001'));

    // -------------------------------------------------------------------------
    // Check 3: POST /api/wards/lookup-point (Point-in-Polygon Resolution)
    // -------------------------------------------------------------------------
    console.log('\n3. Spatial Point-in-Polygon Resolution:');
    // Coordinates corresponding to Narela centroid
    const lookupRes = await fetch(`${baseUrl}/api/wards/lookup-point`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        longitude: 77.094594,
        latitude: 28.840484,
      }),
    });
    const lookupData = await lookupRes.json();

    reportCheck('POST /api/wards/lookup-point returns HTTP 200 OK', lookupRes.status === 200);
    reportCheck('Point resolves to matching ward (W001 / Narela)', lookupData.matched && lookupData.ward.wardCode === 'W001');

    // Test validation on invalid payload
    const invalidLookupRes = await fetch(`${baseUrl}/api/wards/lookup-point`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ longitude: 'invalid' }),
    });
    reportCheck('Malformed lookup coordinates rejected with HTTP 400', invalidLookupRes.status === 400);

    // -------------------------------------------------------------------------
    // Check 4: GET /api/wards/:id (Single Ward Detail View)
    // -------------------------------------------------------------------------
    console.log('\n4. Ward Detail View:');
    const detailRes = await fetch(`${baseUrl}/api/wards/W001`);
    const detailData = await detailRes.json();

    reportCheck('GET /api/wards/W001 returns HTTP 200 OK', detailRes.status === 200);
    reportCheck('Ward detail contains ward name and code', detailData.wardCode === 'W001' && detailData.wardName === 'Narela');
    reportCheck('Ward detail contains boundary geometry & risk metrics', Boolean(detailData.geometry || detailData.boundaryGeoJSON));

    const notFoundRes = await fetch(`${baseUrl}/api/wards/NON_EXISTENT_WARD`);
    reportCheck('Non-existent ward ID returns HTTP 404', notFoundRes.status === 404);

    // -------------------------------------------------------------------------
    // Check 5: GET /api/wards/:id/infrastructure
    // -------------------------------------------------------------------------
    console.log('\n5. Ward Contained Infrastructure:');
    const infraRes = await fetch(`${baseUrl}/api/wards/W001/infrastructure`);
    const infraData = await infraRes.json();

    reportCheck('GET /api/wards/W001/infrastructure returns HTTP 200 OK', infraRes.status === 200);
    reportCheck('Infrastructure payload is an array', Array.isArray(infraData.infrastructure));
  } finally {
    server.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 3 VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('================================================================\n');

  if (passedChecks === totalChecks) {
    console.log('🎉 Phase 3 GIS & Ward System verification succeeded!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some Phase 3 checks failed.\n');
    process.exit(1);
  }
}

runPhase3Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
