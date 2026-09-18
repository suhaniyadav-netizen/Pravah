/**
 * Pravah V2 - Database Seed Script
 * Phase 1D
 *
 * Populates:
 * 1. Demo users with bcrypt-hashed passwords (never plaintext)
 * 2. 250 Delhi municipal wards with PostGIS boundaries
 * 3. Dedicated emergency response teams
 * 4. Critical drainage & flood infrastructure
 * 5. Realistic citizen complaints with spatial coordinates
 * 6. Operational flood incidents
 * 7. Incident response team assignments
 * 8. Pre-computed historical risk snapshots
 * 9. Weather observations
 * 10. Initial system audit logs
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

const BOUNDARIES_PATH = path.resolve(__dirname, '../data/demo-ward-boundaries.json');

// Default development password for all demo accounts
const DEMO_PASSWORD_PLAIN = 'PravahDev@2026';
const DEMO_PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD_PLAIN, 10);

async function main() {
  console.log('--- Pravah V2: Seeding Database ---');

  // Test connection
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error('❌ Could not connect to PostgreSQL. Is the database container running?');
    console.error('Message:', err.message);
    process.exit(1);
  }

  // 1. Seed Demo Users
  console.log('\n[1/10] Seeding Demo Users...');
  const demoUsers = [
    {
      email: 'admin@pravah.delhi.gov.in',
      name: 'Municipal Commissioner (Admin)',
      role: 'ADMIN',
      passwordHash: DEMO_PASSWORD_HASH,
    },
    {
      email: 'analyst@pravah.delhi.gov.in',
      name: 'Hydrological Analyst',
      role: 'ANALYST',
      passwordHash: DEMO_PASSWORD_HASH,
    },
    {
      email: 'team.central@pravah.delhi.gov.in',
      name: 'Central Control Officer',
      role: 'RESPONSE_TEAM',
      passwordHash: DEMO_PASSWORD_HASH,
    },
    {
      email: 'citizen.delhi@example.com',
      name: 'Priya Sharma (Citizen)',
      role: 'CITIZEN',
      passwordHash: DEMO_PASSWORD_HASH,
    },
  ];

  const userMap = {};
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash: u.passwordHash },
      create: u,
    });
    userMap[u.role] = user;
    console.log(`  - User [${u.role}]: ${u.email}`);
  }

  // 2. Seed Wards
  console.log('\n[2/10] Seeding 250 Delhi Municipal Wards with PostGIS boundaries...');
  if (!fs.existsSync(BOUNDARIES_PATH)) {
    throw new Error(`Demo boundaries file not found at: ${BOUNDARIES_PATH}`);
  }

  const boundaryData = JSON.parse(fs.readFileSync(BOUNDARIES_PATH, 'utf-8'));
  console.log(`  Loading ${boundaryData.features.length} ward boundaries...`);

  for (const feature of boundaryData.features) {
    const { ward_code, ward_name, drainage_capacity } = feature.properties;
    const geomJSON = JSON.stringify(feature.geometry);

    await prisma.$executeRaw`
      INSERT INTO wards (id, ward_code, ward_name, drainage_capacity, boundary, created_at, updated_at)
      VALUES (
        uuid_generate_v4(),
        ${ward_code},
        ${ward_name},
        ${drainage_capacity || 50.0},
        ST_SetSRID(ST_GeomFromGeoJSON(${geomJSON}), 4326),
        NOW(),
        NOW()
      )
      ON CONFLICT (ward_code) DO UPDATE
      SET 
        ward_name = EXCLUDED.ward_name,
        drainage_capacity = EXCLUDED.drainage_capacity,
        boundary = EXCLUDED.boundary,
        updated_at = NOW();
    `;
  }
  console.log(`  ✅ 250 Wards seeded with PostGIS MultiPolygon boundaries.`);

  // Fetch sample ward IDs for relational linking
  const sampleWards = await prisma.ward.findMany({ take: 5 });
  const ward1 = sampleWards[0];
  const ward2 = sampleWards[1];

  // 3. Seed Response Teams
  console.log('\n[3/10] Seeding Emergency Response Teams...');
  const teams = [
    {
      name: 'Central Quick Response Unit',
      status: 'AVAILABLE',
      contactPhone: '+91-11-2338-0001',
      lon: 77.2167,
      lat: 28.6139,
    },
    {
      name: 'North Delhi Heavy Drainage Squad',
      status: 'DISPATCHED',
      contactPhone: '+91-11-2338-0002',
      lon: 77.1923,
      lat: 28.7123,
    },
    {
      name: 'South Delhi Flood Relief Mobile',
      status: 'AVAILABLE',
      contactPhone: '+91-11-2338-0003',
      lon: 77.2255,
      lat: 28.5672,
    },
  ];

  const createdTeams = [];
  for (const t of teams) {
    const res = await prisma.$queryRaw`
      INSERT INTO response_teams (id, name, status, contact_phone, current_location, created_at, updated_at)
      VALUES (
        uuid_generate_v4(),
        ${t.name},
        ${t.status}::"TeamStatus",
        ${t.contactPhone},
        ST_SetSRID(ST_MakePoint(${t.lon}, ${t.lat}), 4326),
        NOW(),
        NOW()
      )
      RETURNING id, name;
    `;
    createdTeams.push(res[0]);
    console.log(`  - Team: ${t.name}`);
  }

  // 4. Seed Critical Infrastructure
  console.log('\n[4/10] Seeding Critical Infrastructure Assets...');
  const infraItems = [
    {
      name: 'Minto Bridge High-Capacity Pump Station',
      type: 'PUMP_STATION',
      capacity: 350.0,
      status: 'OPERATIONAL',
      lon: 77.2255,
      lat: 28.6328,
      wardId: ward1.id,
    },
    {
      name: 'Barapullah Main Drain Outfall',
      type: 'DRAIN_OUTFALL',
      capacity: 1200.0,
      status: 'OPERATIONAL',
      lon: 77.2512,
      lat: 28.5834,
      wardId: ward2.id,
    },
    {
      name: 'Tilak Bridge Underpass Sump',
      type: 'UNDERPASS',
      capacity: 150.0,
      status: 'DEGRADED',
      lon: 77.241,
      lat: 28.625,
      wardId: ward1.id,
    },
    {
      name: 'AIIMS Central Trauma Disaster Shelter',
      type: 'EMERGENCY_SHELTER',
      capacity: 500.0,
      status: 'OPERATIONAL',
      lon: 77.209,
      lat: 28.5672,
      wardId: ward2.id,
    },
  ];

  for (const item of infraItems) {
    await prisma.$executeRaw`
      INSERT INTO infrastructure (id, ward_id, type, name, location, capacity_value, status, created_at, updated_at)
      VALUES (
        uuid_generate_v4(),
        ${item.wardId}::uuid,
        ${item.type}::"InfrastructureType",
        ${item.name},
        ST_SetSRID(ST_MakePoint(${item.lon}, ${item.lat}), 4326),
        ${item.capacity},
        ${item.status}::"InfrastructureStatus",
        NOW(),
        NOW()
      );
    `;
    console.log(`  - Infrastructure: ${item.name} (${item.type})`);
  }

  // 5. Seed Sample Citizen Complaints
  console.log('\n[5/10] Seeding Sample Complaints...');
  const complaintsData = [
    {
      wardId: ward1.id,
      userId: userMap.CITIZEN.id,
      lon: 77.2251,
      lat: 28.6325,
      address: 'Near Minto Bridge Underpass',
      description: 'Severe water accumulation up to 60cm blocking vehicular traffic.',
      severity: 'CRITICAL',
      status: 'IN_PROGRESS',
      waterDepth: 60.0,
    },
    {
      wardId: ward2.id,
      userId: userMap.CITIZEN.id,
      lon: 77.2112,
      lat: 28.6982,
      address: 'Main Market Road, Timarpur',
      description: 'Clogged roadside drain causing localized street inundation.',
      severity: 'HIGH',
      status: 'VERIFIED',
      waterDepth: 35.0,
    },
  ];

  const createdComplaints = [];
  for (const c of complaintsData) {
    const res = await prisma.$queryRaw`
      INSERT INTO complaints (id, ward_id, reported_by, location, address, description, severity, status, water_depth_cm, created_at, updated_at)
      VALUES (
        uuid_generate_v4(),
        ${c.wardId}::uuid,
        ${c.userId}::uuid,
        ST_SetSRID(ST_MakePoint(${c.lon}, ${c.lat}), 4326),
        ${c.address},
        ${c.description},
        ${c.severity}::"Severity",
        ${c.status}::"ComplaintStatus",
        ${c.waterDepth},
        NOW(),
        NOW()
      )
      RETURNING id, description;
    `;
    createdComplaints.push(res[0]);
    console.log(`  - Complaint: "${c.description.slice(0, 45)}..."`);
  }

  // 6. Seed Operational Incidents
  console.log('\n[6/10] Seeding Operational Incidents...');
  const incidentRes = await prisma.$queryRaw`
    INSERT INTO incidents (id, ward_id, primary_complaint_id, location, severity, status, water_depth_cm, description, created_at, updated_at)
    VALUES (
      uuid_generate_v4(),
      ${ward1.id}::uuid,
      ${createdComplaints[0].id}::uuid,
      ST_SetSRID(ST_MakePoint(77.2251, 28.6325), 4326),
      'CRITICAL'::"Severity",
      'ACTIVE'::"IncidentStatus",
      65.0,
      'Flash flooding under Minto Bridge. Immediate mobile pump deployment required.',
      NOW(),
      NOW()
    )
    RETURNING id, description;
  `;
  const primaryIncident = incidentRes[0];
  console.log(`  - Incident created: "${primaryIncident.description.slice(0, 50)}..."`);

  // 7. Seed Team Assignment
  console.log('\n[7/10] Seeding Response Assignment...');
  await prisma.assignment.create({
    data: {
      incidentId: primaryIncident.id,
      responseTeamId: createdTeams[1].id,
      status: 'DISPATCHED',
      notes: 'Dispatched North Heavy Pumping unit to clear underpass sumps.',
    },
  });
  console.log(`  - Assigned team "${createdTeams[1].name}" to incident.`);

  // 8. Seed Risk Snapshots
  console.log('\n[8/10] Seeding Historical Risk Snapshots...');
  for (const ward of sampleWards) {
    const riskScore = Math.floor(Math.random() * 55) + 30; // 30 - 85
    const riskLevel = riskScore >= 75 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 40 ? 'MODERATE' : 'LOW';

    await prisma.riskSnapshot.create({
      data: {
        wardId: ward.id,
        riskScore,
        riskLevel,
        drainageComponent: 45.0,
        rainfallComponent: 65.0,
        complaintComponent: 50.0,
        waterLevelComponent: 40.0,
      },
    });
  }
  console.log(`  - Created baseline risk snapshots for sample wards.`);

  // 9. Seed Weather Observations
  console.log('\n[9/10] Seeding Weather Observations...');
  const weatherPoints = [
    { rainfallMm: 12.5, precipProb: 0.85, tempC: 29.4, hoursAgo: 2 },
    { rainfallMm: 38.0, precipProb: 0.95, tempC: 27.8, hoursAgo: 1 },
    { rainfallMm: 45.2, precipProb: 0.98, tempC: 26.5, hoursAgo: 0 },
  ];

  for (const wp of weatherPoints) {
    const timestamp = new Date(Date.now() - wp.hoursAgo * 3600 * 1000);
    await prisma.weatherObservation.create({
      data: {
        source: 'Open-Meteo Demo Feed',
        stationName: 'Delhi Safdarjung IMD',
        rainfallMm: wp.rainfallMm,
        precipitationProbability: wp.precipProb,
        temperatureC: wp.tempC,
        observedAt: timestamp,
      },
    });
  }
  console.log(`  - Created ${weatherPoints.length} recent weather observations.`);

  // 10. Seed System Audit Logs
  console.log('\n[10/10] Seeding System Audit Logs...');
  await prisma.auditLog.create({
    data: {
      actorUserId: userMap.ADMIN.id,
      action: 'SYSTEM_SEED_INITIALIZE',
      entityType: 'SYSTEM',
      entityId: 'pravah_v2_init',
      details: {
        environment: 'development',
        seed_version: '2.0.0',
        wards_seeded: boundaryData.features.length,
      },
    },
  });
  console.log(`  - Audit log recorded.`);

  console.log('\n✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
