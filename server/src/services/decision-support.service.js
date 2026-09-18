/**
 * Deterministic Explainable Decision-Support Engine
 * Pravah V2 - Phase 9 Signature Feature: "What Should the City Do Now?"
 *
 * Translates multi-factor risk scores, primary drivers, live incidents,
 * infrastructure states, and available response teams into prioritized,
 * quantitative tactical action recommendations without black-box LLMs.
 */

const { getWardById, getWardInfrastructure, getAllWardsGeoJSON } = require('./ward.service');
const { getWardRiskDetails, evaluateRisk, classifyRiskLevel } = require('./risk-engine.service');
const { listIncidents } = require('./incident.service');
const { listResponseTeams } = require('./response-team.service');
const { getCurrentWeather } = require('./weather.service');

// Standard Action Priorities
const PRIORITIES = {
  P1_CRITICAL: {
    level: 'P1_CRITICAL',
    label: 'Critical - Immediate Dispatch / Life Safety',
    urgencyWindowMinutes: 15,
    rank: 1,
  },
  P2_HIGH: {
    level: 'P2_HIGH',
    label: 'High - Tactical Containment & Diversion',
    urgencyWindowMinutes: 45,
    rank: 2,
  },
  P3_MEDIUM: {
    level: 'P3_MEDIUM',
    label: 'Medium - Preemptive Infrastructure Surge',
    urgencyWindowMinutes: 120,
    rank: 3,
  },
  P4_ROUTINE: {
    level: 'P4_ROUTINE',
    label: 'Routine - Monitoring & Advisory',
    urgencyWindowMinutes: 360,
    rank: 4,
  },
};

// Standard Action Categories
const CATEGORIES = {
  DISPATCH: 'DISPATCH',
  TRAFFIC_CONTROL: 'TRAFFIC_CONTROL',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  CIVIC_ALERT: 'CIVIC_ALERT',
};

// Known high-risk Delhi underpass corridors
const DELIMITED_HOTSPOTS = [
  { name: 'Minto Bridge Underpass', wardCode: 'W056', aliases: ['WARD-056', 'W056'], criticalDepthThresholdCm: 40 },
  { name: 'Pul Prahladpur Underpass', wardCode: 'W112', aliases: ['WARD-112', 'W112'], criticalDepthThresholdCm: 45 },
  { name: 'Zakhira Flyover Underpass', wardCode: 'W089', aliases: ['WARD-089', 'W089'], criticalDepthThresholdCm: 35 },
  { name: 'Tilak Bridge Underpass', wardCode: 'W060', aliases: ['WARD-060', 'W060'], criticalDepthThresholdCm: 40 },
  { name: 'Moolchand Underpass', wardCode: 'W145', aliases: ['WARD-145', 'W145'], criticalDepthThresholdCm: 30 },
];

/**
 * Returns available metadata for action priorities, categories, and decision rules.
 */
function getDecisionMetadata() {
  return {
    engine: 'Pravah Deterministic Tactical Optimization Engine v2.0',
    corePrinciple: 'Fully Explainable, Non-LLM Mathematical Rule & Resource Optimization',
    priorities: PRIORITIES,
    categories: Object.values(CATEGORIES),
    actionTypes: [
      'DEPLOY_MOBILE_PUMP',
      'DISPATCH_FIELD_RESCUE_SQUAD',
      'CLOSE_UNDERPASS_AND_DIVERT',
      'DEPLOY_TRAFFIC_MARSHALS',
      'ACTIVATE_AUXILIARY_PUMPS',
      'CLEAR_STORMWATER_INLETS',
      'BROADCAST_EMERGENCY_ALERT',
      'ISSUE_LOCAL_ADVISORY',
    ],
  };
}

/**
 * Evaluates candidate response teams and selects the most suitable match.
 */
function findBestTeamForAction(teams, requiredEquipmentKeyword) {
  const available = teams.filter((t) => t.status === 'AVAILABLE');
  if (available.length === 0) return null;

  // Search for equipment keyword match
  if (requiredEquipmentKeyword) {
    const specialized = available.find((t) =>
      (t.equipment || []).some((eq) =>
        eq.toLowerCase().includes(requiredEquipmentKeyword.toLowerCase())
      )
    );
    if (specialized) return specialized;
  }

  // Otherwise return first available team
  return available[0];
}

/**
 * Evaluates deterministic tactical recommendations for a given ward.
 */
async function evaluateWardDecision(wardId, overrides = {}) {
  // 1. Fetch ward profile and risk
  const ward =
    overrides.ward ||
    (await getWardById(wardId));
  if (!ward) {
    const error = new Error(`Ward with ID '${wardId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  let riskDetails = overrides.riskDetails;
  if (!riskDetails) {
    try {
      riskDetails = await getWardRiskDetails(wardId);
    } catch {
      riskDetails = {
        evaluation: evaluateRisk({
          drainageCapacity: ward.drainageCapacity || 50,
          rainfallMm: overrides.rainfallMm || 25,
          complaintCount: ward.recentComplaintsCount || 1,
          avgWaterDepthCm: overrides.avgWaterDepthCm || 20,
        }),
      };
    }
  }

  // 2. Fetch active incidents, infrastructure, and response teams (reuse if provided in overrides)
  const incidents =
    overrides.incidents ||
    (await listIncidents({ wardId, status: 'ACTIVE' }).catch(() => []));
  const infrastructure =
    overrides.infrastructure ||
    (await getWardInfrastructure(wardId).catch(() => []));
  const teams =
    overrides.teams ||
    (await listResponseTeams().catch(() => []));
  const weather =
    overrides.weather ||
    (await getCurrentWeather().catch(() => ({ rainfallMm: 15.0 })));

  const riskScore =
    overrides.riskScore !== undefined
      ? overrides.riskScore
      : riskDetails.evaluation?.riskScore || 50;
  const riskLevel = classifyRiskLevel(riskScore);
  const primaryDriver =
    overrides.primaryDriver ||
    riskDetails.evaluation?.primaryDriver ||
    'DRAINAGE_DEFICIT';
  const rainfallMm =
    overrides.rainfallMm !== undefined
      ? overrides.rainfallMm
      : weather.rainfallMm || 0.0;
  const maxWaterDepthCm = Math.max(
    overrides.avgWaterDepthCm || 0,
    ...incidents.map((i) => i.waterDepthCm || 0),
    0
  );

  const recommendations = [];

  // -------------------------------------------------------------
  // RULE 1: DISPATCH - Heavy Mobile Dewatering Pump
  // Trigger: Risk is CRITICAL, OR (Risk >= 60 AND primary driver is DRAINAGE_DEFICIT), OR maxWaterDepth >= 40cm
  // -------------------------------------------------------------
  if (riskScore >= 75 || (riskScore >= 60 && primaryDriver === 'DRAINAGE_DEFICIT') || maxWaterDepthCm >= 40) {
    const matchedTeam = findBestTeamForAction(teams, 'Pump');
    const projectedReduction = Math.min(25, Math.max(14, Math.round(riskScore * 0.24)));
    const inundationReductionMin = Math.round(maxWaterDepthCm * 1.6 + 30);

    recommendations.push({
      id: `act-${wardId}-dispatch-pump`,
      priority: PRIORITIES.P1_CRITICAL.level,
      priorityRank: PRIORITIES.P1_CRITICAL.rank,
      category: CATEGORIES.DISPATCH,
      actionType: 'DEPLOY_MOBILE_PUMP',
      title: `Deploy High-Capacity Mobile Dewatering Pump to ${ward.wardName}`,
      wardId: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      urgencyWindowMinutes: PRIORITIES.P1_CRITICAL.urgencyWindowMinutes,
      reason: `Ward risk is ${riskLevel} (${riskScore}/100) with primary driver '${primaryDriver}'. Localized water depth reached ${maxWaterDepthCm} cm, exceeding municipal drainage threshold.`,
      expectedEffect: {
        projectedRiskScoreReduction: projectedReduction,
        postInterventionEstimatedRisk: Math.max(0, riskScore - projectedReduction),
        estimatedInundationReductionMinutes: inundationReductionMin,
        estimatedCapacityBoostM3h: 350.0,
        confidence: 0.92,
      },
      resourceRequirements: ['Heavy Submersible Pump (350+ m3/h)', 'Quick Response Crew (4-person)'],
      suggestedTeam: matchedTeam
        ? { id: matchedTeam.id, name: matchedTeam.name, contactPhone: matchedTeam.contactPhone }
        : null,
      teamAvailabilityStatus: matchedTeam ? 'ALLOCATED' : 'WAITING_RESOURCE_POOL',
    });
  }

  // -------------------------------------------------------------
  // RULE 2: DISPATCH - Field Incident Rescue Squad
  // Trigger: Any active incident with CRITICAL or MAJOR severity
  // -------------------------------------------------------------
  const criticalIncidents = incidents.filter((i) => i.severity === 'CRITICAL' || i.severity === 'MAJOR');
  if (criticalIncidents.length > 0) {
    const matchedTeam = findBestTeamForAction(teams, 'Rescue');
    const projectedReduction = Math.min(18, 8 + criticalIncidents.length * 4);

    recommendations.push({
      id: `act-${wardId}-dispatch-rescue`,
      priority: PRIORITIES.P1_CRITICAL.level,
      priorityRank: PRIORITIES.P1_CRITICAL.rank,
      category: CATEGORIES.DISPATCH,
      actionType: 'DISPATCH_FIELD_RESCUE_SQUAD',
      title: `Dispatch Emergency Field Rescue Squad for ${criticalIncidents.length} Active Major Incidents`,
      wardId: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      urgencyWindowMinutes: PRIORITIES.P1_CRITICAL.urgencyWindowMinutes,
      reason: `${criticalIncidents.length} verified MAJOR/CRITICAL incident(s) active on ground with maximum recorded depth ${maxWaterDepthCm} cm.`,
      expectedEffect: {
        projectedRiskScoreReduction: projectedReduction,
        postInterventionEstimatedRisk: Math.max(0, riskScore - projectedReduction),
        estimatedInundationReductionMinutes: 45,
        confidence: 0.95,
      },
      resourceRequirements: ['Multi-utility Emergency Response Vehicle', 'Traffic Cordons', 'Emergency Floatation Gear'],
      suggestedTeam: matchedTeam
        ? { id: matchedTeam.id, name: matchedTeam.name, contactPhone: matchedTeam.contactPhone }
        : null,
      teamAvailabilityStatus: matchedTeam ? 'ALLOCATED' : 'WAITING_RESOURCE_POOL',
    });
  }

  // -------------------------------------------------------------
  // RULE 3: TRAFFIC CONTROL - Underpass Closure & Diversion
  // Trigger: Ward contains known vulnerable underpass with water depth >= 35cm OR risk >= 75
  // -------------------------------------------------------------
  const hotspot = DELIMITED_HOTSPOTS.find(
    (h) =>
      (h.aliases && (h.aliases.includes(ward.wardCode) || h.aliases.includes(ward.id))) ||
      h.wardCode === ward.wardCode ||
      h.wardCode === ward.id ||
      (ward.wardName && ward.wardName.toLowerCase().includes(h.name.split(' ')[0].toLowerCase()))
  );

  if ((hotspot && maxWaterDepthCm >= hotspot.criticalDepthThresholdCm) || (maxWaterDepthCm >= 45)) {
    recommendations.push({
      id: `act-${wardId}-traffic-closure`,
      priority: PRIORITIES.P1_CRITICAL.level,
      priorityRank: PRIORITIES.P1_CRITICAL.rank,
      category: CATEGORIES.TRAFFIC_CONTROL,
      actionType: 'CLOSE_UNDERPASS_AND_DIVERT',
      title: `Emergency Barricading & Traffic Diversion at ${hotspot ? hotspot.name : ward.wardName + ' Underpass'}`,
      wardId: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      urgencyWindowMinutes: 15,
      reason: `Water accumulation depth (${maxWaterDepthCm} cm) exceeds dangerous submersion threshold (${hotspot ? hotspot.criticalDepthThresholdCm : 40} cm). Total vehicular stoppage required to prevent passenger trapping.`,
      expectedEffect: {
        projectedRiskScoreReduction: 10,
        postInterventionEstimatedRisk: Math.max(0, riskScore - 10),
        estimatedInundationReductionMinutes: 0,
        estimatedVehiclesDivertedPerHour: 2400,
        confidence: 0.96,
      },
      resourceRequirements: ['Delhi Traffic Police Unit', 'High-visibility Variable Message Signs', 'Physical Barricades'],
      suggestedTeam: null,
      teamAvailabilityStatus: 'CIVIC_POLICE_COORDINATION',
    });
  } else if (riskScore >= 60 || maxWaterDepthCm >= 20) {
    // Moderate traffic restriction
    recommendations.push({
      id: `act-${wardId}-traffic-marshals`,
      priority: PRIORITIES.P2_HIGH.level,
      priorityRank: PRIORITIES.P2_HIGH.rank,
      category: CATEGORIES.TRAFFIC_CONTROL,
      actionType: 'DEPLOY_TRAFFIC_MARSHALS',
      title: `Deploy PWD Traffic Marshals to Restrict Inundated Slow Lanes in ${ward.wardName}`,
      wardId: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      urgencyWindowMinutes: PRIORITIES.P2_HIGH.urgencyWindowMinutes,
      reason: `Waterlogging accumulating in curb and bus lanes; partial roadway throttling needed to prevent gridlock.`,
      expectedEffect: {
        projectedRiskScoreReduction: 6,
        postInterventionEstimatedRisk: Math.max(0, riskScore - 6),
        estimatedInundationReductionMinutes: 15,
        confidence: 0.88,
      },
      resourceRequirements: ['PWD Traffic Marshals (4 staff)', 'LED Warning Baton Cones'],
      suggestedTeam: null,
      teamAvailabilityStatus: 'PWD_FIELD_FORCE',
    });
  }

  // -------------------------------------------------------------
  // RULE 4: INFRASTRUCTURE - Auxiliary Stormwater Pump Activation
  // Trigger: Risk >= 50 and rainfall >= 10 mm/h OR pump station available
  // -------------------------------------------------------------
  const pumpStation = infrastructure.find((inf) => inf.type === 'PUMP_STATION') || {
    id: `infra-${ward.id}-aux-pump`,
    name: `${ward.wardName} Municipal Sump Station`,
    capacityValue: 250.0,
  };

  if (riskScore >= 50 && rainfallMm >= 10.0) {
    recommendations.push({
      id: `act-${wardId}-infra-aux-pump`,
      priority: PRIORITIES.P2_HIGH.level,
      priorityRank: PRIORITIES.P2_HIGH.rank,
      category: CATEGORIES.INFRASTRUCTURE,
      actionType: 'ACTIVATE_AUXILIARY_PUMPS',
      title: `Engage Auxiliary Pumps at ${pumpStation.name}`,
      wardId: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      urgencyWindowMinutes: PRIORITIES.P2_HIGH.urgencyWindowMinutes,
      reason: `Inflow rate (${rainfallMm} mm/h) approaching gravity drainage limits. Pumping must be switched to dual auxiliary diesel generator backup.`,
      expectedEffect: {
        projectedRiskScoreReduction: 15,
        postInterventionEstimatedRisk: Math.max(0, riskScore - 15),
        estimatedCapacityBoostM3h: pumpStation.capacityValue || 250.0,
        estimatedInundationReductionMinutes: 40,
        confidence: 0.90,
      },
      resourceRequirements: ['Station Operator Verification', 'Auxiliary Generator Fuel Reserves'],
      suggestedTeam: null,
      teamAvailabilityStatus: 'STATION_STAFF_DISPATCHED',
    });
  }

  // -------------------------------------------------------------
  // RULE 5: INFRASTRUCTURE - Stormwater Drain De-silting & Trash Grate Clearance
  // Trigger: Ward drainage capacity < 55 m3/s or primary driver is DRAINAGE_DEFICIT
  // -------------------------------------------------------------
  if ((ward.drainageCapacity && ward.drainageCapacity < 55) || primaryDriver === 'DRAINAGE_DEFICIT') {
    recommendations.push({
      id: `act-${wardId}-infra-grates`,
      priority: riskScore >= 70 ? PRIORITIES.P2_HIGH.level : PRIORITIES.P3_MEDIUM.level,
      priorityRank: riskScore >= 70 ? PRIORITIES.P2_HIGH.rank : PRIORITIES.P3_MEDIUM.rank,
      category: CATEGORIES.INFRASTRUCTURE,
      actionType: 'CLEAR_STORMWATER_INLETS',
      title: `Mobilize Jetting & Suction Crews to Clear Inlets in ${ward.wardName}`,
      wardId: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      urgencyWindowMinutes: PRIORITIES.P3_MEDIUM.urgencyWindowMinutes,
      reason: `Drainage capacity (${ward.drainageCapacity || 45} m³/s) constrained by localized silt and trash grate obstructions.`,
      expectedEffect: {
        projectedRiskScoreReduction: 12,
        postInterventionEstimatedRisk: Math.max(0, riskScore - 12),
        estimatedInundationReductionMinutes: 25,
        confidence: 0.85,
      },
      resourceRequirements: ['Super-sucker Jetting Machine', 'Sanitation De-silting Squad'],
      suggestedTeam: findBestTeamForAction(teams, 'Drainage'),
      teamAvailabilityStatus: 'MAINTENANCE_ALLOCATED',
    });
  }

  // -------------------------------------------------------------
  // RULE 6: CIVIC ALERT - Public Warnings & Commuter Alerts
  // -------------------------------------------------------------
  if (riskScore >= 65) {
    recommendations.push({
      id: `act-${wardId}-civic-alert`,
      priority: riskScore >= 75 ? PRIORITIES.P1_CRITICAL.level : PRIORITIES.P2_HIGH.level,
      priorityRank: riskScore >= 75 ? PRIORITIES.P1_CRITICAL.rank : PRIORITIES.P2_HIGH.rank,
      category: CATEGORIES.CIVIC_ALERT,
      actionType: 'BROADCAST_EMERGENCY_ALERT',
      title: `Broadcast Flash Flood & Avoidance Notice for ${ward.wardName}`,
      wardId: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      urgencyWindowMinutes: 15,
      reason: `Flood risk at ${riskLevel} (${riskScore}/100) creates commuter hazards. Proactive mobile notification reduces stranded vehicles.`,
      expectedEffect: {
        projectedRiskScoreReduction: 4,
        postInterventionEstimatedRisk: Math.max(0, riskScore - 4),
        estimatedInundationReductionMinutes: 0,
        estimatedCitizensAlerted: 18000,
        confidence: 0.98,
      },
      resourceRequirements: ['Delhi Disaster Management Authority (DDMA) Push Gateway'],
      suggestedTeam: null,
      teamAvailabilityStatus: 'AUTOMATED_SMS_READY',
    });
  } else if (riskScore >= 35) {
    recommendations.push({
      id: `act-${wardId}-civic-advisory`,
      priority: PRIORITIES.P4_ROUTINE.level,
      priorityRank: PRIORITIES.P4_ROUTINE.rank,
      category: CATEGORIES.CIVIC_ALERT,
      actionType: 'ISSUE_LOCAL_ADVISORY',
      title: `Issue Precautionary Waterlogging Watch Advisory for ${ward.wardName}`,
      wardId: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      urgencyWindowMinutes: PRIORITIES.P4_ROUTINE.urgencyWindowMinutes,
      reason: `Current conditions indicate moderate surface runoff. RWAs advised to keep local basement sump pumps ready.`,
      expectedEffect: {
        projectedRiskScoreReduction: 2,
        postInterventionEstimatedRisk: Math.max(0, riskScore - 2),
        estimatedInundationReductionMinutes: 0,
        estimatedCitizensAlerted: 8500,
        confidence: 0.89,
      },
      resourceRequirements: ['Municipal Portal Broadcast'],
      suggestedTeam: null,
      teamAvailabilityStatus: 'AUTOMATED_SMS_READY',
    });
  }

  // Sort recommendations by Priority Rank (1 -> 4), then by projected risk reduction descending
  recommendations.sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }
    return (b.expectedEffect?.projectedRiskScoreReduction || 0) - (a.expectedEffect?.projectedRiskScoreReduction || 0);
  });

  return {
    ward: {
      id: ward.id,
      wardCode: ward.wardCode,
      wardName: ward.wardName,
      zone: ward.zone || 'Central',
      drainageCapacity: ward.drainageCapacity,
    },
    currentConditions: {
      riskScore,
      riskLevel,
      primaryDriver,
      rainfallMm,
      maxWaterDepthCm,
      activeIncidentsCount: incidents.length,
      criticalIncidentsCount: criticalIncidents.length,
    },
    tacticalActionPlan: {
      totalActions: recommendations.length,
      criticalCount: recommendations.filter((r) => r.priority === 'P1_CRITICAL').length,
      highCount: recommendations.filter((r) => r.priority === 'P2_HIGH').length,
      mediumCount: recommendations.filter((r) => r.priority === 'P3_MEDIUM').length,
      routineCount: recommendations.filter((r) => r.priority === 'P4_ROUTINE').length,
      recommendations,
    },
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * City-Wide Decision Engine: Analyzes all monitored wards and compiles
 * an executive prioritized operational action plan for city commanders.
 */
async function evaluateCityDecision({ limit = 15, minPriority = null } = {}) {
  // 1. Fetch all wards, available response resources, and active incidents citywide once
  const [wardsGeo, teams, weather, allIncidents] = await Promise.all([
    getAllWardsGeoJSON(),
    listResponseTeams().catch(() => []),
    getCurrentWeather().catch(() => ({ rainfallMm: 22.0 })),
    listIncidents({ status: 'ACTIVE' }).catch(() => []),
  ]);

  const features = wardsGeo.features || [];
  const cityRecommendations = [];
  let criticalWardsCount = 0;
  let highRiskWardsCount = 0;

  // Scan all wards for macro city metrics
  for (const feature of features) {
    const props = feature.properties || {};
    const riskScore = props.current_risk_score || 50.0;
    if (riskScore >= 75) criticalWardsCount++;
    else if (riskScore >= 60) highRiskWardsCount++;
  }

  // Sort candidate features by risk descending and select top candidates + underpass hotspots
  const candidateFeatures = [...features].sort(
    (a, b) => (b.properties?.current_risk_score || 0) - (a.properties?.current_risk_score || 0)
  );

  const selectedFeatures = candidateFeatures.slice(0, 10);
  for (const hotspot of DELIMITED_HOTSPOTS) {
    const match = features.find(
      (f) =>
        f.properties?.ward_code === hotspot.wardCode ||
        (hotspot.aliases && hotspot.aliases.includes(f.properties?.ward_code))
    );
    if (match && !selectedFeatures.some((sf) => sf.properties?.ward_code === match.properties?.ward_code)) {
      selectedFeatures.push(match);
    }
  }

  // Evaluate tactical actions with shared resources in memory
  for (const feature of selectedFeatures) {
    const props = feature.properties || {};
    const riskScore = props.current_risk_score || 50.0;
    const wardId = props.ward_code || props.id;

    const wardObj = {
      id: props.ward_code || props.id,
      wardCode: props.ward_code,
      wardName: props.ward_name,
      zone: props.zone || 'Central',
      drainageCapacity: props.drainage_capacity || 50.0,
    };

    const wardIncidents = allIncidents.filter(
      (inc) => inc.wardId === wardId || inc.wardId === props.ward_code
    );

    const riskDetails = {
      evaluation: evaluateRisk({
        drainageCapacity: wardObj.drainageCapacity,
        rainfallMm: weather.rainfallMm || 22.0,
        complaintCount: wardIncidents.length || 1,
        avgWaterDepthCm: 25.0,
      }),
    };

    try {
      const wardDecision = await evaluateWardDecision(wardId, {
        ward: wardObj,
        riskDetails,
        riskScore,
        rainfallMm: weather.rainfallMm,
        incidents: wardIncidents,
        infrastructure: [],
        teams,
        weather,
      });

      if (wardDecision.tacticalActionPlan?.recommendations) {
        cityRecommendations.push(...wardDecision.tacticalActionPlan.recommendations);
      }
    } catch {
      // Skip unresolvable ward
    }
  }

  // Sort city-wide queue: Priority Rank (P1 -> P4) -> projectedRiskScoreReduction descending
  cityRecommendations.sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }
    return (b.expectedEffect?.projectedRiskScoreReduction || 0) - (a.expectedEffect?.projectedRiskScoreReduction || 0);
  });

  // Filter by minPriority if requested
  let filteredRecommendations = cityRecommendations;
  if (minPriority) {
    const targetRank = PRIORITIES[minPriority]?.rank || 4;
    filteredRecommendations = cityRecommendations.filter((r) => r.priorityRank <= targetRank);
  }

  const prioritizedActions = filteredRecommendations.slice(0, limit);

  // Resource gap calculation
  const mobilePumpsNeeded = prioritizedActions.filter((a) => a.actionType === 'DEPLOY_MOBILE_PUMP').length;
  const availableTeams = teams.filter((t) => t.status === 'AVAILABLE').length;

  return {
    citySummary: {
      headline: criticalWardsCount > 0
        ? `CRITICAL FLOOD ALERT: ${criticalWardsCount} ward(s) in emergency status requiring immediate dispatch.`
        : `ELEVATED ALERT: ${highRiskWardsCount} ward(s) at High Risk requiring tactical waterlogging containment.`,
      monitoredWardsCount: features.length,
      criticalWardsCount,
      highRiskWardsCount,
      rainfallAverageMm: weather.rainfallMm || 22.0,
      resourceStatus: {
        availableResponseTeams: availableTeams,
        totalResponseTeams: teams.length,
        mobilePumpsNeeded,
        resourceDeficitDetected: mobilePumpsNeeded > availableTeams,
      },
    },
    topActionPlan: prioritizedActions,
    actionDistribution: {
      p1Critical: prioritizedActions.filter((r) => r.priority === 'P1_CRITICAL').length,
      p2High: prioritizedActions.filter((r) => r.priority === 'P2_HIGH').length,
      p3Medium: prioritizedActions.filter((r) => r.priority === 'P3_MEDIUM').length,
      p4Routine: prioritizedActions.filter((r) => r.priority === 'P4_ROUTINE').length,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Custom Emergency Evaluator: Allows operators / simulators to test
 * tactical decision recommendations under hypothetical conditions.
 */
async function evaluateCustomEmergency({
  wardId = 'WARD-056',
  riskScore = 82.0,
  primaryDriver = 'DRAINAGE_DEFICIT',
  rainfallMm = 45.0,
  avgWaterDepthCm = 50.0,
  activeIncidentsCount = 2,
}) {
  const result = await evaluateWardDecision(wardId, {
    riskScore,
    primaryDriver,
    rainfallMm,
    avgWaterDepthCm,
  });

  return {
    isSimulation: true,
    scenarioInputs: {
      wardId,
      riskScore,
      primaryDriver,
      rainfallMm,
      avgWaterDepthCm,
      activeIncidentsCount,
    },
    ...result,
  };
}

module.exports = {
  PRIORITIES,
  CATEGORIES,
  getDecisionMetadata,
  evaluateWardDecision,
  evaluateCityDecision,
  evaluateCustomEmergency,
};
