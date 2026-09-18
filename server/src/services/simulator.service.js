/**
 * What-If Flood Scenario Simulator Service
 * Pravah V2 - Phase 10
 *
 * Enables municipal decision-makers, disaster response planners, and analysts
 * to simulate extreme weather shocks, drainage infrastructure failures, and
 * rapid field mitigation interventions (e.g. mobile pump deployments).
 *
 * Strictly labels all outputs with isSimulation: true to prevent operational confusion.
 */

const { getWardById, getAllWardsGeoJSON } = require('./ward.service');
const { evaluateRisk, classifyRiskLevel, determinePrimaryDriver } = require('./risk-engine.service');
const { getCurrentWeather } = require('./weather.service');
const { listResponseTeams } = require('./response-team.service');

// Standard Presets for Scenario Modeling
const SIMULATION_PRESETS = [
  {
    id: 'CLOUDBURST_DELHI_100MM',
    name: 'Cloudburst Shock (100 mm/h)',
    description: 'Catastrophic short-duration convective downpour across Delhi NCR.',
    rainfallMm: 100.0,
    drainageModifierPct: -20, // Storm drains overwhelmed by debris
    complaintSpike: 15,
    avgWaterDepthCm: 75.0,
    tags: ['EXTREME_DISASTER', 'MONSOON'],
  },
  {
    id: 'HEAVY_MONSOON_50MM',
    name: 'Sustained Heavy Downpour (50 mm/h)',
    description: 'Continuous widespread heavy monsoon shower exceeding design capacity.',
    rainfallMm: 50.0,
    drainageModifierPct: 0,
    complaintSpike: 6,
    avgWaterDepthCm: 35.0,
    tags: ['SEVERE_WEATHER', 'SEASONAL'],
  },
  {
    id: 'DRAINAGE_SILTATION_40PCT',
    name: 'Pre-Monsoon Siltation Crisis (-40% Drainage)',
    description: 'Major stormwater drains choked with silt and solid waste prior to desilting.',
    rainfallMm: 25.0,
    drainageModifierPct: -40,
    complaintSpike: 4,
    avgWaterDepthCm: 30.0,
    tags: ['INFRASTRUCTURE_FAILURE', 'MAINTENANCE'],
  },
  {
    id: 'PRE_MONSOON_DRAINAGE_UPGRADE',
    name: 'Desilted Network & Canal Dredging (+25% Capacity)',
    description: 'Impact of municipal desilting and culvert widened across low-lying wards.',
    rainfallMm: 30.0,
    drainageModifierPct: 25,
    complaintSpike: 0,
    avgWaterDepthCm: 15.0,
    tags: ['INFRASTRUCTURE_UPGRADE', 'MITIGATION'],
  },
  {
    id: 'MAX_EMERGENCY_DEWATERING',
    name: 'Max Field Pump Deployment (+3 Mobile Units)',
    description: 'Targeted high-capacity pump mobilization (+1,050 m³/h capacity boost).',
    rainfallMm: 45.0,
    drainageModifierPct: 0,
    additionalMobilePumps: 3,
    complaintSpike: 2,
    avgWaterDepthCm: 25.0,
    tags: ['TACTICAL_DISPATCH', 'MITIGATION'],
  },
];

// Vulnerable Delhi Underpass Hotspots
const KEY_HOTSPOTS = [
  { name: 'Minto Bridge Underpass', wardCode: 'W056' },
  { name: 'Pul Prahladpur Underpass', wardCode: 'W112' },
  { name: 'Zakhira Flyover Underpass', wardCode: 'W089' },
  { name: 'Tilak Bridge Underpass', wardCode: 'W060' },
  { name: 'Moolchand Underpass', wardCode: 'W145' },
];

/**
 * Returns available scenario presets and configurable parameters.
 */
function getSimulationPresets() {
  return {
    presets: SIMULATION_PRESETS,
    configurableParameters: {
      rainfallMm: { min: 0, max: 250, unit: 'mm/h', description: 'Simulated precipitation rate' },
      rainfallMultiplier: { min: 0.1, max: 5.0, description: 'Scaling factor applied to current weather' },
      drainageModifierPct: { min: -80, max: 100, unit: '%', description: 'Capacity shift due to silt or dredging' },
      additionalMobilePumps: { min: 0, max: 10, unit: 'units', description: 'Mobile pumps deployed (each adds 15 m³/s equivalent relief)' },
      complaintSpike: { min: 0, max: 100, unit: 'count', description: 'Simulated distress call surge' },
      waterDepthCm: { min: 0, max: 200, unit: 'cm', description: 'Observed or projected inundation depth' },
    },
    disclaimer: 'All simulations are synthetic projections for emergency planning and stress testing. Not real-time operational observations.',
  };
}

/**
 * Simulates flood risk and mitigation interventions for a specific ward.
 */
async function simulateWardScenario({
  wardId,
  presetId = null,
  rainfallMm = null,
  rainfallMultiplier = null,
  drainageModifierPct = 0,
  additionalMobilePumps = 0,
  complaintSpike = 0,
  waterDepthCm = null,
}) {
  const ward = await getWardById(wardId);
  if (!ward) {
    const error = new Error(`Ward with ID '${wardId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // If a preset was selected, apply preset defaults as base
  let presetConfig = {};
  if (presetId) {
    const matchedPreset = SIMULATION_PRESETS.find((p) => p.id === presetId);
    if (matchedPreset) {
      presetConfig = matchedPreset;
    }
  }

  // 1. Current Baseline Conditions
  const weather = await getCurrentWeather().catch(() => ({ rainfallMm: 20.0 }));
  const baselineRainfall = weather.rainfallMm || 20.0;
  const baselineDrainage = ward.drainageCapacity || 50.0;
  const baselineComplaints = ward.recentComplaintsCount || 1;
  const baselineWaterDepth = 15.0;

  const baselineEval = evaluateRisk({
    drainageCapacity: baselineDrainage,
    rainfallMm: baselineRainfall,
    complaintCount: baselineComplaints,
    avgWaterDepthCm: baselineWaterDepth,
  });

  // 2. Compute Simulated Conditions
  let simRainfall = baselineRainfall;
  if (rainfallMm !== null && rainfallMm !== undefined) {
    simRainfall = rainfallMm;
  } else if (presetConfig.rainfallMm !== undefined) {
    simRainfall = presetConfig.rainfallMm;
  } else if (rainfallMultiplier !== null && rainfallMultiplier !== undefined) {
    simRainfall = baselineRainfall * rainfallMultiplier;
  }

  const effectiveDrainageMod = drainageModifierPct !== 0 ? drainageModifierPct : (presetConfig.drainageModifierPct || 0);
  const effectivePumps = additionalMobilePumps > 0 ? additionalMobilePumps : (presetConfig.additionalMobilePumps || 0);

  // Each mobile pump provides ~12.5 m³/s equivalent hydraulic capacity relief
  const pumpCapacityBoost = effectivePumps * 12.5;
  const rawSimDrainage = baselineDrainage * (1 + effectiveDrainageMod / 100.0) + pumpCapacityBoost;
  const simDrainage = Math.max(5.0, Math.min(100.0, rawSimDrainage));

  const effectiveComplaintSpike = complaintSpike !== 0 ? complaintSpike : (presetConfig.complaintSpike || 0);
  const simComplaints = Math.max(0, baselineComplaints + effectiveComplaintSpike);

  let simWaterDepth = baselineWaterDepth;
  if (waterDepthCm !== null && waterDepthCm !== undefined) {
    simWaterDepth = waterDepthCm;
  } else if (presetConfig.avgWaterDepthCm !== undefined) {
    simWaterDepth = presetConfig.avgWaterDepthCm;
  } else {
    // Estimate depth shift from rainfall and drainage changes
    const rainFactor = simRainfall / (baselineRainfall || 1);
    const drainageFactor = baselineDrainage / (simDrainage || 1);
    simWaterDepth = Math.max(0, Math.round(baselineWaterDepth * rainFactor * drainageFactor * 0.7));
  }

  const simulatedEval = evaluateRisk({
    drainageCapacity: simDrainage,
    rainfallMm: simRainfall,
    complaintCount: simComplaints,
    avgWaterDepthCm: simWaterDepth,
  });

  // 3. Quantitative Comparison & Narrative Analysis
  const deltaRiskScore = parseFloat((simulatedEval.riskScore - baselineEval.riskScore).toFixed(1));
  const baselineInundationMins = Math.round(baselineWaterDepth * 1.5 + baselineRainfall * 0.8);
  const simInundationMins = Math.max(0, Math.round(simWaterDepth * 1.5 + simRainfall * 0.8 - effectivePumps * 25));
  const deltaInundationMins = simInundationMins - baselineInundationMins;

  let impactAssessment;
  if (deltaRiskScore <= -10) {
    impactAssessment = 'SIGNIFICANT_MITIGATION';
  } else if (deltaRiskScore < 0) {
    impactAssessment = 'MARGINAL_MITIGATION';
  } else if (deltaRiskScore === 0) {
    impactAssessment = 'NEUTRAL';
  } else if (deltaRiskScore <= 15) {
    impactAssessment = 'MODERATE_HAZARD_INCREASE';
  } else {
    impactAssessment = 'SEVERE_HAZARD_ESCALATION';
  }

  return {
    isSimulation: true,
    simulationId: `sim-ward-${ward.wardCode}-${Date.now()}`,
    scenarioPresetApplied: presetConfig.id || null,
    ward: {
      id: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
    },
    interventionsApplied: {
      simulatedRainfallMm: simRainfall,
      rainfallChangeRatio: parseFloat((simRainfall / (baselineRainfall || 1)).toFixed(2)),
      drainageCapacityModifierPct: effectiveDrainageMod,
      additionalMobilePumpsDeployed: effectivePumps,
      simulatedDrainageCapacity: parseFloat(simDrainage.toFixed(1)),
      complaintSpike: effectiveComplaintSpike,
      simulatedWaterDepthCm: simWaterDepth,
    },
    comparison: {
      baseline: {
        riskScore: baselineEval.riskScore,
        riskLevel: baselineEval.riskLevel,
        primaryDriver: baselineEval.primaryDriver,
        drainageCapacity: baselineDrainage,
        rainfallMm: baselineRainfall,
        waterDepthCm: baselineWaterDepth,
        estimatedInundationMins: baselineInundationMins,
      },
      simulated: {
        riskScore: simulatedEval.riskScore,
        riskLevel: simulatedEval.riskLevel,
        primaryDriver: simulatedEval.primaryDriver,
        drainageCapacity: parseFloat(simDrainage.toFixed(1)),
        rainfallMm: simRainfall,
        waterDepthCm: simWaterDepth,
        estimatedInundationMins: simInundationMins,
      },
      deltas: {
        riskScore: deltaRiskScore,
        riskLevelChanged: baselineEval.riskLevel !== simulatedEval.riskLevel,
        inundationMins: deltaInundationMins,
        impactAssessment,
      },
    },
    narrative: `Simulating ${simRainfall} mm/h rainfall with ${effectiveDrainageMod >= 0 ? '+' : ''}${effectiveDrainageMod}% drainage capacity and ${effectivePumps} mobile pumps results in a risk score shift of ${deltaRiskScore >= 0 ? '+' : ''}${deltaRiskScore} points (${baselineEval.riskLevel} -> ${simulatedEval.riskLevel}).`,
    simulatedAt: new Date().toISOString(),
    disclaimer: 'SYNTHETIC SCENARIO: For predictive risk modeling and response rehearsal only.',
  };
}

/**
 * Simulates city-wide flood risk impacts under extreme rainfall or network changes.
 */
async function simulateCityScenario({
  presetId = null,
  rainfallMultiplier = 1.5,
  drainageModifierPct = 0,
  additionalPumpsDeployed = 0,
}) {
  const wardsGeo = await getAllWardsGeoJSON();
  const features = wardsGeo.features || [];
  const weather = await getCurrentWeather().catch(() => ({ rainfallMm: 22.0 }));

  let presetConfig = {};
  if (presetId) {
    const matched = SIMULATION_PRESETS.find((p) => p.id === presetId);
    if (matched) presetConfig = matched;
  }

  const effectiveMultiplier = presetConfig.rainfallMm
    ? presetConfig.rainfallMm / (weather.rainfallMm || 22.0)
    : rainfallMultiplier;
  const effectiveDrainageMod = presetConfig.drainageModifierPct !== undefined
    ? presetConfig.drainageModifierPct
    : drainageModifierPct;
  const effectivePumps = presetConfig.additionalMobilePumps !== undefined
    ? presetConfig.additionalMobilePumps
    : additionalPumpsDeployed;

  let baselineCritical = 0;
  let baselineHigh = 0;
  let baselineModerate = 0;
  let baselineLow = 0;
  let baselineTotalScore = 0;

  let simCritical = 0;
  let simHigh = 0;
  let simModerate = 0;
  let simLow = 0;
  let simTotalScore = 0;

  const newlyCriticalWards = [];
  const newlyContainedWards = [];

  for (const feature of features) {
    const props = feature.properties || {};
    const baseScore = props.current_risk_score || 50.0;
    const baseDrainage = props.drainage_capacity || 50.0;
    const wardCode = props.ward_code || props.id;
    const wardName = props.ward_name || wardCode;

    // Baseline counts
    baselineTotalScore += baseScore;
    if (baseScore >= 75) baselineCritical++;
    else if (baseScore >= 60) baselineHigh++;
    else if (baseScore >= 40) baselineModerate++;
    else baselineLow++;

    // Simulated ward evaluation
    const simDrainage = Math.max(
      5.0,
      Math.min(100.0, baseDrainage * (1 + effectiveDrainageMod / 100.0) + effectivePumps * 2.5)
    );
    const simRain = (weather.rainfallMm || 22.0) * effectiveMultiplier;

    const simEval = evaluateRisk({
      drainageCapacity: simDrainage,
      rainfallMm: simRain,
      complaintCount: Math.round(props.recent_complaints || 1),
      avgWaterDepthCm: 25.0 * effectiveMultiplier,
    });

    const simScore = simEval.riskScore;
    simTotalScore += simScore;
    if (simScore >= 75) {
      simCritical++;
      if (baseScore < 75) newlyCriticalWards.push({ wardCode, wardName, baseScore, simScore });
    } else if (simScore >= 60) {
      simHigh++;
    } else if (simScore >= 40) {
      simModerate++;
    } else {
      simLow++;
      if (baseScore >= 60) newlyContainedWards.push({ wardCode, wardName, baseScore, simScore });
    }
  }

  const wardCount = features.length || 1;
  const baselineAvg = parseFloat((baselineTotalScore / wardCount).toFixed(1));
  const simAvg = parseFloat((simTotalScore / wardCount).toFixed(1));
  const netAvgShift = parseFloat((simAvg - baselineAvg).toFixed(1));

  // Check status of Delhi underpass hotspots under this simulation
  const hotspotAnalysis = KEY_HOTSPOTS.map((h) => {
    const feat = features.find((f) => f.properties?.ward_code === h.wardCode);
    const baseScore = feat?.properties?.current_risk_score || 55.0;
    const simScore = Math.min(100, Math.round(baseScore * effectiveMultiplier * (1 - effectiveDrainageMod * 0.005)));
    return {
      hotspotName: h.name,
      wardCode: h.wardCode,
      baselineRisk: baseScore,
      simulatedRisk: simScore,
      projectedStatus: simScore >= 75 ? 'IMMINENT_SUBMERGENCE' : simScore >= 60 ? 'RESTRICTED_FLOW' : 'OPERATIONAL',
    };
  });

  return {
    isSimulation: true,
    simulationId: `sim-city-${Date.now()}`,
    scenarioPresetApplied: presetConfig.id || null,
    scenarioParameters: {
      rainfallMultiplier: parseFloat(effectiveMultiplier.toFixed(2)),
      drainageCapacityModifierPct: effectiveDrainageMod,
      additionalMobilePumpsDeployed: effectivePumps,
      simulatedRegionalRainfallMm: parseFloat(((weather.rainfallMm || 22.0) * effectiveMultiplier).toFixed(1)),
    },
    citywideImpact: {
      baselineDistribution: {
        critical: baselineCritical,
        high: baselineHigh,
        moderate: baselineModerate,
        low: baselineLow,
        averageRiskScore: baselineAvg,
      },
      simulatedDistribution: {
        critical: simCritical,
        high: simHigh,
        moderate: simModerate,
        low: simLow,
        averageRiskScore: simAvg,
      },
      netShifts: {
        averageRiskShift: netAvgShift,
        newlyCriticalWardsCount: newlyCriticalWards.length,
        newlyContainedWardsCount: newlyContainedWards.length,
      },
    },
    hotspotProjections: hotspotAnalysis,
    newlyCriticalWardsSample: newlyCriticalWards.slice(0, 10),
    simulatedAt: new Date().toISOString(),
    disclaimer: 'SYNTHETIC MACRO SCENARIO: Designed exclusively for municipal disaster response exercises.',
  };
}

module.exports = {
  SIMULATION_PRESETS,
  KEY_HOTSPOTS,
  getSimulationPresets,
  simulateWardScenario,
  simulateCityScenario,
};
