/**
 * Demo Ward Boundary Generator
 * Pravah V2 - Phase 1C
 *
 * Reads 250 Delhi municipal ward centroids from backend/data/wards.csv
 * and creates standardized MultiPolygon GeoJSON boundaries for development & testing.
 *
 * NOTE: Per plan.md rules, synthetic/demo boundaries are explicitly flagged
 * as synthetic to prevent confusing mock geometry with official delimitations.
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../../backend/data/wards.csv');
const OUTPUT_DIR = path.resolve(__dirname, '../../data');
const OUTPUT_FILE = path.resolve(OUTPUT_DIR, 'demo-ward-boundaries.json');

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((item) => item.trim());
    if (row.length >= 5) {
      records.push({
        ward_id: row[0],
        ward_name: row[1],
        zone: row[2],
        latitude: parseFloat(row[3]),
        longitude: parseFloat(row[4]),
      });
    }
  }
  return records;
}

/**
 * Creates a hexagonal polygon around a center point with a given radius in degrees.
 * ~0.008 degrees corresponds roughly to 800-900 meters.
 */
function createHexagonPolygon(centerLon, centerLat, radiusDeg = 0.008) {
  const coordinates = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const lon = centerLon + radiusDeg * Math.cos(angle);
    const lat = centerLat + radiusDeg * Math.sin(angle);
    coordinates.push([parseFloat(lon.toFixed(6)), parseFloat(lat.toFixed(6))]);
  }
  // Close the polygon ring
  coordinates.push(coordinates[0]);
  return [[[...coordinates]]]; // MultiPolygon format: [ [ [ [lon, lat], ... ] ] ]
}

function generateDemoBoundaries() {
  console.log('Reading source ward centroids from:', CSV_PATH);
  if (!fs.existsSync(CSV_PATH)) {
    console.error('Error: Source CSV not found at:', CSV_PATH);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const wards = parseCSV(csvContent);
  console.log(`Parsed ${wards.length} wards from CSV.`);

  const features = wards.map((ward) => {
    const coordinates = createHexagonPolygon(ward.longitude, ward.latitude);

    return {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates,
      },
      properties: {
        ward_code: ward.ward_id,
        ward_name: ward.ward_name,
        zone: ward.zone,
        centroid: {
          latitude: ward.latitude,
          longitude: ward.longitude,
        },
        drainage_capacity: 50.0, // baseline default
        is_synthetic: true,
        source: 'derived-hexagon-demo-v2',
        provenance: 'Generated from MCD centroid coordinates for local development',
      },
    };
  });

  const featureCollection = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      ward_count: features.length,
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      is_synthetic: true,
      note: 'Demo geometries for development. Ready to be replaced by official MCD boundary GeoJSON.',
    },
    features,
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(featureCollection, null, 2), 'utf-8');
  console.log(`✅ Successfully generated demo boundaries for ${features.length} wards.`);
  console.log(`Output written to: ${OUTPUT_FILE}`);
}

generateDemoBoundaries();
