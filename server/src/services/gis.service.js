/**
 * PostGIS Geospatial Service
 * Pravah V2 - Phase 1C
 *
 * Handles spatial queries, point-in-polygon containment, proximity calculations,
 * and GeoJSON formatting using PostGIS functions.
 */

const prisma = require('../config/prisma');

// Delhi NCR Geographic Bounding Box for Coordinate Validation
const DELHI_BBOX = {
  minLat: 28.35,
  maxLat: 28.95,
  minLon: 76.80,
  maxLon: 77.45,
};

/**
 * Validates whether coordinates fall within reasonable Delhi NCR bounds.
 * @param {number} lon - Longitude (e.g. 77.2090)
 * @param {number} lat - Latitude (e.g. 28.6139)
 */
function validateCoordinates(lon, lat) {
  if (typeof lon !== 'number' || typeof lat !== 'number' || isNaN(lon) || isNaN(lat)) {
    throw new Error('Coordinates must be valid numbers.');
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Coordinates out of global WGS84 range.');
  }
  const isWithinDelhi =
    lat >= DELHI_BBOX.minLat &&
    lat <= DELHI_BBOX.maxLat &&
    lon >= DELHI_BBOX.minLon &&
    lon <= DELHI_BBOX.maxLon;

  return { isValid: true, isWithinDelhi };
}

/**
 * Finds the containing ward for given longitude and latitude using PostGIS ST_Contains.
 * @param {number} lon
 * @param {number} lat
 * @returns {Promise<Object|null>} Ward object or null if outside all polygons
 */
async function findWardByPoint(lon, lat) {
  validateCoordinates(lon, lat);

  const result = await prisma.$queryRaw`
    SELECT 
      id,
      ward_code AS "wardCode",
      ward_name AS "wardName",
      drainage_capacity AS "drainageCapacity",
      population_density AS "populationDensity",
      ST_AsGeoJSON(boundary) AS "boundaryGeoJSON"
    FROM wards
    WHERE boundary IS NOT NULL
      AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))
    LIMIT 1;
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Fallback query: Finds the closest ward to a given point if point-in-polygon fails.
 * @param {number} lon
 * @param {number} lat
 * @returns {Promise<Object|null>}
 */
async function findNearestWard(lon, lat) {
  validateCoordinates(lon, lat);

  const result = await prisma.$queryRaw`
    SELECT 
      id,
      ward_code AS "wardCode",
      ward_name AS "wardName",
      drainage_capacity AS "drainageCapacity",
      ST_Distance(boundary::geography, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography) AS "distanceMeters"
    FROM wards
    WHERE boundary IS NOT NULL
    ORDER BY boundary <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
    LIMIT 1;
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Searches for nearby infrastructure within a given radius in meters using ST_DWithin.
 * @param {number} lon
 * @param {number} lat
 * @param {number} radiusMeters - Search radius in meters (default 2000m)
 * @param {string} [type] - Optional InfrastructureType filter (e.g. 'PUMP_STATION')
 */
async function findInfrastructureNearby(lon, lat, radiusMeters = 2000, type = null) {
  validateCoordinates(lon, lat);

  const pointGeom = `SRID=4326;POINT(${lon} ${lat})`;

  if (type) {
    return prisma.$queryRaw`
      SELECT 
        id,
        ward_id AS "wardId",
        type,
        name,
        capacity_value AS "capacityValue",
        status,
        ST_Distance(location::geography, ST_GeomFromText(${pointGeom})::geography) AS "distanceMeters",
        ST_AsGeoJSON(location) AS "locationGeoJSON"
      FROM infrastructure
      WHERE type = ${type}::"InfrastructureType"
        AND ST_DWithin(location::geography, ST_GeomFromText(${pointGeom})::geography, ${radiusMeters})
      ORDER BY "distanceMeters" ASC;
    `;
  }

  return prisma.$queryRaw`
    SELECT 
      id,
      ward_id AS "wardId",
      type,
      name,
      capacity_value AS "capacityValue",
      status,
      ST_Distance(location::geography, ST_GeomFromText(${pointGeom})::geography) AS "distanceMeters",
      ST_AsGeoJSON(location) AS "locationGeoJSON"
    FROM infrastructure
    WHERE ST_DWithin(location::geography, ST_GeomFromText(${pointGeom})::geography, ${radiusMeters})
    ORDER BY "distanceMeters" ASC;
  `;
}

/**
 * Retrieves a ward by ID formatted with full GeoJSON geometry.
 * @param {string} wardId - UUID
 */
async function getWardWithGeoJSON(wardId) {
  const result = await prisma.$queryRaw`
    SELECT 
      id,
      ward_code AS "wardCode",
      ward_name AS "wardName",
      drainage_capacity AS "drainageCapacity",
      population_density AS "populationDensity",
      ST_AsGeoJSON(boundary) AS "boundaryGeoJSON"
    FROM wards
    WHERE id = ${wardId}::uuid
    LIMIT 1;
  `;

  if (!result.length) return null;

  const ward = result[0];
  return {
    ...ward,
    boundaryGeoJSON: ward.boundaryGeoJSON ? JSON.parse(ward.boundaryGeoJSON) : null,
  };
}

module.exports = {
  DELHI_BBOX,
  validateCoordinates,
  findWardByPoint,
  findNearestWard,
  findInfrastructureNearby,
  getWardWithGeoJSON,
};
