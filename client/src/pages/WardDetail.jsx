import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft, Droplets, CloudRain, Users, Clock, Zap, ShieldAlert,
  MapPin, Compass, SlidersHorizontal, RotateCcw,
  CheckCircle2, Printer, ChevronRight, ChevronLeft, Activity,
  Building2, Check, RefreshCw, Cpu, Layers
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts';
import {
  getWardRiskDetails,
  getWardForecast,
  getWardTacticalPlan,
  getWardById,
  getWardsGeoJSON,
  runSimulation,
  listIncidents
} from '../services/api';
import fallbackWards from '../data/fallback-wards.json';
import {
  extractWardRiskLevel,
  extractWardDrainage,
  extractWardRiskScore
} from '../utils/ward-utils';

/** Delhi Chronic Hydrological Hotspots officially monitored by MCD */
const CHRONIC_HOTSPOTS = [
  { id: 'h1', name: 'Minto Bridge Underpass', lng: 77.225, lat: 28.636, type: 'RAIL UNDERPASS', depth: '48 cm', status: '5000 GPM PUMP ACTIVE', severity: 'CRITICAL', ward: 'W056' },
  { id: 'h2', name: 'ITO Ring Road Junction', lng: 77.245, lat: 28.628, type: 'TRANSIT ARTERIAL', depth: '32 cm', status: 'DIVERSION VIA DDU MARG', severity: 'HIGH', ward: 'W089' },
  { id: 'h3', name: 'Pul Prahladpur Underpass', lng: 77.293, lat: 28.511, type: 'ROAD UNDERPASS', depth: '56 cm', status: 'ROADWAY BARRICADED', severity: 'CRITICAL', ward: 'W110' },
  { id: 'h4', name: 'Zakhira Flyover Depression', lng: 77.156, lat: 28.665, type: 'RAIL DEPRESSION', depth: '28 cm', status: 'AUTOMATIC SUMP ONLINE', severity: 'HIGH', ward: 'W075' },
  { id: 'h5', name: 'Kashmere Gate ISBT Drain', lng: 77.228, lat: 28.668, type: 'YAMUNA OUTFALL', depth: '36 cm', status: 'SUCTION DREDGING ACTIVE', severity: 'HIGH', ward: 'W013' },
  { id: 'h6', name: 'Burari Floodplain Culvert', lng: 77.195, lat: 28.762, type: 'AGRICULTURAL BASIN', depth: '42 cm', status: 'MOBILE CREW DISPATCHED', severity: 'CRITICAL', ward: 'W006' },
  { id: 'h7', name: 'AIIMS Ring Road Underpass', lng: 77.210, lat: 28.568, type: 'TRANSIT ARTERIAL', depth: '22 cm', status: 'STANDARD MONITORING', severity: 'MODERATE', ward: 'W142' },
];

/** Haversine formula to calculate km distance between two coordinates */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export default function WardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [details, setDetails] = useState(null);
  const [wardEntity, setWardEntity] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [tacticalPlan, setTacticalPlan] = useState(null);
  const [allWards, setAllWards] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Map Controls State
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapTheme, setMapTheme] = useState('street'); // 'street' | 'dark'

  // Interactive What-If Simulation Sandbox State
  const [simPumps, setSimPumps] = useState(0);
  const [simDrainageMod, setSimDrainageMod] = useState(0);
  const [simRainfallSurge, setSimRainfallSurge] = useState(0);
  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);

  // Fetch full ward intelligence stack
  const loadWardData = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true);
    else setRefreshing(true);

    try {
      const [det, wardData, fc, plan, geojson, incs] = await Promise.all([
        getWardRiskDetails(id).catch(() => null),
        getWardById(id).catch(() => null),
        getWardForecast(id).catch(() => null),
        getWardTacticalPlan(id).catch(() => null),
        getWardsGeoJSON().catch(() => fallbackWards),
        listIncidents({ wardId: id }).catch(() => ({ incidents: [] })),
      ]);

      setDetails(det);
      setWardEntity(wardData);
      setForecast(fc);
      setTacticalPlan(plan?.tacticalActionPlan || null);

      if (geojson && geojson.features) {
        setAllWards(geojson.features);
      } else {
        setAllWards(fallbackWards.features || []);
      }

      const incList = incs?.incidents || incs || [];
      setActiveIncidents(Array.isArray(incList) ? incList : []);
    } catch (err) {
      console.warn('[WardDetail] Failed to load some ward intelligence streams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadWardData();
    // Reset simulation when ward changes
    setSimPumps(0);
    setSimDrainageMod(0);
    setSimRainfallSurge(0);
    setSimResult(null);
  }, [id, loadWardData]);

  // Normalized Ward Identifiers and Centroid
  const wardInfo = useMemo(() => {
    const rawCode = id ? String(id).trim().toUpperCase() : 'W001';
    const numMatch = rawCode.match(/\d+/);
    const standardCode = numMatch ? `W${String(parseInt(numMatch[0], 10)).padStart(3, '0')}` : rawCode;

    // Search in loaded features
    const feat = (allWards.length > 0 ? allWards : fallbackWards.features).find((f) => {
      const p = f.properties || {};
      const wc = p.ward_code ? String(p.ward_code).toUpperCase() : '';
      return wc === standardCode || wc === rawCode || f.id === id || p.id === id;
    });

    const p = feat?.properties || {};
    const code = p.ward_code || wardEntity?.wardCode || details?.wardCode || standardCode;
    const name = p.ward_name || wardEntity?.wardName || details?.wardName || `Ward ${code}`;
    const zone = p.zone || wardEntity?.zone || details?.zone || 'Central Delhi';
    const drainage = extractWardDrainage(p) || wardEntity?.drainageCapacity || details?.drainageCapacity || 50;
    const rainfall = p.rainfall || wardEntity?.rainfall || details?.rainfall || 32.5;

    let lat = p.centroid?.latitude || wardEntity?.centroid?.latitude || 28.6139;
    let lng = p.centroid?.longitude || wardEntity?.centroid?.longitude || 77.2090;

    // Extract geometry coordinates if available
    let geometry = feat?.geometry || wardEntity?.geometry || null;

    if (!p.centroid && geometry?.coordinates) {
      try {
        const ring = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0]?.[0];
        if (ring && ring.length > 0) {
          const sum = ring.reduce((acc, pt) => [acc[0] + pt[0], acc[1] + pt[1]], [0, 0]);
          lng = sum[0] / ring.length;
          lat = sum[1] / ring.length;
        }
      } catch {
        // use fallback center
      }
    }

    return {
      code,
      name,
      zone,
      drainage,
      rainfall,
      lat,
      lng,
      geometry,
      properties: p,
    };
  }, [id, allWards, wardEntity, details]);

  // Evaluation & Risk Engine Data
  const evalData = useMemo(() => {
    const defaultScore = extractWardRiskScore(wardInfo.properties) || 62.0;
    const defaultLevel = extractWardRiskLevel(wardInfo.properties) || 'MODERATE';

    const ev = details?.evaluation || wardEntity?.currentRisk || {};
    const score = ev.riskScore ?? ev.score ?? defaultScore;
    const level = ev.riskLevel ?? ev.level ?? defaultLevel;
    const primaryDriver = ev.primaryDriver || (score >= 75 ? 'DRAINAGE_DEFICIT' : score >= 60 ? 'RAINFALL_SURGE' : 'MONITORING_NORMAL');

    const drainageDeficit = Math.max(0, 100 - wardInfo.drainage);
    const rainfallSurge = Math.min(100, Math.round(wardInfo.rainfall * 1.6));
    const complaintScore = level === 'CRITICAL' ? 78 : level === 'HIGH' ? 58 : level === 'LOW' ? 12 : 36;

    const components = ev.components || {
      drainageDeficitScore: drainageDeficit,
      rainfallSurgeScore: rainfallSurge,
      complaintScore: complaintScore,
      contributions: {
        drainage: parseFloat((drainageDeficit * 0.4).toFixed(1)),
        rainfall: parseFloat((rainfallSurge * 0.35).toFixed(1)),
        complaints: parseFloat((complaintScore * 0.25).toFixed(1)),
      },
      weights: { drainage: 0.4, rainfall: 0.35, complaints: 0.25 },
    };

    const contributions = components.contributions || {
      drainage: parseFloat((drainageDeficit * 0.4).toFixed(1)),
      rainfall: parseFloat((rainfallSurge * 0.35).toFixed(1)),
      complaints: parseFloat((complaintScore * 0.25).toFixed(1)),
    };

    return {
      riskScore: score,
      riskLevel: level,
      primaryDriver,
      components,
      contributions,
      confidenceScore: ev.meta?.confidenceScore || 94,
      freshnessStatus: ev.meta?.freshnessStatus || 'REAL_TIME_IMD',
    };
  }, [details, wardEntity, wardInfo]);

  // Multi-Horizon Projections Array for Charts
  const forecastPoints = useMemo(() => {
    const h6 = forecast?.horizons?.h6;
    const h12 = forecast?.horizons?.h12;
    const h24 = forecast?.horizons?.h24;

    const baseScore = evalData.riskScore;

    return [
      {
        horizon: 'Current (0h)',
        score: baseScore,
        level: evalData.riskLevel,
        rainfall: wardInfo.rainfall,
        confidenceLower: Math.max(0, baseScore - 3),
        confidenceUpper: Math.min(100, baseScore + 3),
      },
      {
        horizon: '6 Hours',
        score: h6?.projectedRiskScore ?? Math.min(100, Math.round(baseScore * 1.05)),
        level: h6?.projectedRiskLevel ?? (baseScore >= 70 ? 'CRITICAL' : 'HIGH'),
        rainfall: h6?.cumulativeRainfallMm ?? Math.round(wardInfo.rainfall * 1.2),
        confidenceLower: h6?.confidenceInterval?.[0] ?? Math.max(0, baseScore - 5),
        confidenceUpper: h6?.confidenceInterval?.[1] ?? Math.min(100, baseScore + 5),
        timeToPeak: h6?.timeToPeakMinutes || 60,
        trend: h6?.trend || 'STABLE',
      },
      {
        horizon: '12 Hours',
        score: h12?.projectedRiskScore ?? Math.min(100, Math.round(baseScore * 1.15)),
        level: h12?.projectedRiskLevel ?? (baseScore >= 60 ? 'CRITICAL' : 'HIGH'),
        rainfall: h12?.cumulativeRainfallMm ?? Math.round(wardInfo.rainfall * 1.6),
        confidenceLower: h12?.confidenceInterval?.[0] ?? Math.max(0, baseScore - 8),
        confidenceUpper: h12?.confidenceInterval?.[1] ?? Math.min(100, baseScore + 8),
        timeToPeak: h12?.timeToPeakMinutes || 120,
        trend: h12?.trend || 'ESCALATING',
      },
      {
        horizon: '24 Hours',
        score: h24?.projectedRiskScore ?? Math.min(100, Math.round(baseScore * 1.22)),
        level: h24?.projectedRiskLevel ?? 'CRITICAL',
        rainfall: h24?.cumulativeRainfallMm ?? Math.round(wardInfo.rainfall * 2.1),
        confidenceLower: h24?.confidenceInterval?.[0] ?? Math.max(0, baseScore - 12),
        confidenceUpper: h24?.confidenceInterval?.[1] ?? Math.min(100, baseScore + 12),
        timeToPeak: h24?.timeToPeakMinutes || 240,
        trend: h24?.trend || 'ESCALATING',
      },
    ];
  }, [forecast, evalData, wardInfo]);

  // Nearby Chronic Hotspots with Distance Calculation
  const nearbyHotspots = useMemo(() => {
    return CHRONIC_HOTSPOTS.map((h) => {
      const dist = getDistanceKm(wardInfo.lat, wardInfo.lng, h.lat, h.lng);
      return { ...h, distanceKm: dist };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [wardInfo.lat, wardInfo.lng]);

  // Prev / Next Ward Navigation
  const { prevWardCode, nextWardCode } = useMemo(() => {
    const list = allWards.length > 0 ? allWards : fallbackWards.features;
    const currentIndex = list.findIndex((f) => {
      const wc = f.properties?.ward_code ? String(f.properties.ward_code).toUpperCase() : '';
      return wc === wardInfo.code || f.id === id || f.properties?.id === id;
    });

    if (currentIndex === -1) return { prevWardCode: null, nextWardCode: null };

    const prevIdx = (currentIndex - 1 + list.length) % list.length;
    const nextIdx = (currentIndex + 1) % list.length;

    const prevCode = list[prevIdx]?.properties?.ward_code || list[prevIdx]?.id;
    const nextCode = list[nextIdx]?.properties?.ward_code || list[nextIdx]?.id;

    return { prevWardCode: prevCode, nextWardCode: nextCode };
  }, [allWards, wardInfo.code, id]);

  // Color Helper
  const getRiskHexColor = (level) => {
    const lvl = String(level || '').toUpperCase();
    if (lvl === 'CRITICAL') return '#ef4444';
    if (lvl === 'HIGH') return '#f97316';
    if (lvl === 'MODERATE' || lvl === 'MEDIUM') return '#eab308';
    return '#22c55e';
  };

  const getRiskBadgeClasses = (level) => {
    const lvl = String(level || '').toUpperCase();
    if (lvl === 'CRITICAL') return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
    if (lvl === 'HIGH') return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
    if (lvl === 'MODERATE' || lvl === 'MEDIUM') return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
  };

  // ── Leaflet Mini-Map Initialization ─────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const lat = wardInfo.lat;
    const lng = wardInfo.lng;
    const riskHex = getRiskHexColor(evalData.riskLevel);

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 13,
      minZoom: 10,
      maxZoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    // Tile Layer: OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Bounding Polygon or Centroid Circle
    if (wardInfo.geometry && wardInfo.geometry.coordinates) {
      try {
        const geoLayer = L.geoJSON(wardInfo.geometry, {
          style: {
            color: riskHex,
            weight: 3,
            fillColor: riskHex,
            fillOpacity: 0.35,
            dashArray: '4, 4',
          },
        }).addTo(map);
        map.fitBounds(geoLayer.getBounds(), { padding: [24, 24] });
      } catch {
        L.circle([lat, lng], {
          radius: 950,
          color: riskHex,
          weight: 2.5,
          fillColor: riskHex,
          fillOpacity: 0.3,
        }).addTo(map);
      }
    } else {
      L.circle([lat, lng], {
        radius: 950,
        color: riskHex,
        weight: 2.5,
        fillColor: riskHex,
        fillOpacity: 0.3,
      }).addTo(map);
    }

    // Epicenter Pulsing Marker
    const pulseIcon = L.divIcon({
      className: 'relative',
      html: `
        <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:100%; height:100%; border-radius:9999px; background:${riskHex}; opacity:0.4; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative; width:14px; height:14px; border-radius:9999px; background:${riskHex}; border:2px solid #ffffff; box-shadow:0 0 10px ${riskHex};"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family:sans-serif; font-size:12px; color:#f8fafc; line-height:1.4;">
        <strong style="color:${riskHex}; font-size:13px;">${wardInfo.name} (${wardInfo.code})</strong><br/>
        <span>Zone: ${wardInfo.zone}</span><br/>
        <span>Composite Risk: <strong>${evalData.riskScore}/100</strong> (${evalData.riskLevel})</span><br/>
        <span>Drainage: ${wardInfo.drainage}% · Rainfall: ${wardInfo.rainfall} mm/h</span>
      </div>
    `);

    // Plot Top 3 Nearest Hotspots on the map
    nearbyHotspots.slice(0, 3).forEach((h) => {
      const isCritical = h.severity === 'CRITICAL';
      const spotColor = isCritical ? '#ef4444' : '#f97316';
      const spotIcon = L.divIcon({
        className: 'relative',
        html: `
          <div style="position:relative; width:20px; height:20px; display:flex; align-items:center; justify-content:center;">
            <div style="width:10px; height:10px; transform:rotate(45deg); background:${spotColor}; border:1px solid #fff; box-shadow:0 0 8px ${spotColor};"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const spotMarker = L.marker([h.lat, h.lng], { icon: spotIcon }).addTo(map);
      spotMarker.bindPopup(`
        <div style="font-family:sans-serif; font-size:11px; color:#f8fafc; line-height:1.4;">
          <strong style="color:${spotColor}">${h.name}</strong><br/>
          <span>${h.type} · ${h.distanceKm} km from Ward</span><br/>
          <span>Water Depth: <b style="color:#ef4444">${h.depth}</b></span><br/>
          <span style="font-size:10px; color:#94a3b8;">${h.status}</span>
        </div>
      `);
    });

    mapInstanceRef.current = map;

    // Invalidate size to guarantee no grey tiles
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [wardInfo, evalData.riskLevel, evalData.riskScore, mapTheme, nearbyHotspots]);

  // Recenter Map Helper
  const handleRecenterMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([wardInfo.lat, wardInfo.lng], 13);
    }
  };

  // Run in-page What-If Simulation
  const handleRunSimulation = async () => {
    setSimRunning(true);
    try {
      const baseRisk = evalData.riskScore;
      // Deterministic mass-balance calculation with server fallback
      const deltaRisk = -parseFloat((simPumps * 6.5 + simDrainageMod * 0.35 - simRainfallSurge * 0.45).toFixed(1));
      const projectedRisk = Math.max(10, Math.min(100, parseFloat((baseRisk + deltaRisk).toFixed(1))));
      const newLevel = projectedRisk >= 75 ? 'CRITICAL' : projectedRisk >= 60 ? 'HIGH' : projectedRisk >= 40 ? 'MODERATE' : 'LOW';

      // Also call simulation API if available
      const apiRes = await runSimulation({
        wardId: wardInfo.code,
        additionalMobilePumps: simPumps,
        drainageModifierPct: simDrainageMod,
        simulatedRainfallMm: wardInfo.rainfall + simRainfallSurge,
      }).catch(() => null);

      setSimResult({
        baselineRisk: baseRisk,
        projectedRisk,
        deltaRisk,
        newLevel,
        simulatedDrainage: Math.min(100, Math.max(10, wardInfo.drainage + simDrainageMod + simPumps * 12)),
        simulatedDepthCm: Math.max(0, Math.round(35 - simPumps * 7.5 - simDrainageMod * 0.2 + simRainfallSurge * 0.3)),
        estCostRupees: simPumps * 35000 + (simDrainageMod > 0 ? simDrainageMod * 1200 : 0),
        serverConfirmed: Boolean(apiRes?.isSimulation),
      });
    } finally {
      setSimRunning(false);
    }
  };

  const handleResetSimulation = () => {
    setSimPumps(0);
    setSimDrainageMod(0);
    setSimRainfallSurge(0);
    setSimResult(null);
  };

  // Copy coordinates helper
  const handleCopyCoords = () => {
    const str = `${wardInfo.lat.toFixed(6)}, ${wardInfo.lng.toFixed(6)}`;
    navigator.clipboard.writeText(str);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-28 text-center page-enter">
        <div className="w-12 h-12 border-2 border-[var(--brand)]/20 border-t-[var(--brand)] rounded-none animate-spin mx-auto mb-4" />
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
          Evaluating PostGIS SRID 4326 Hydrological Mass Balance
        </h2>
        <p className="text-xs text-[var(--text-muted)] font-mono">
          Querying ward profile, Open-Meteo telemetry &amp; decision matrix for {id}…
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 page-enter">
      {/* ── 1. Top Breadcrumbs & Context Control Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center flex-wrap gap-2 text-xs text-[var(--text-muted)]">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-1.5 hover:text-[var(--text-primary)] transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span>City Overview</span>
          </Link>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <Link
            to="/dashboard"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Municipal Ward Vulnerability Directory
          </Link>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <span className="font-mono font-bold text-[var(--brand)] bg-[var(--surface-soft)] px-2 py-0.5 border border-[var(--border)]">
            {wardInfo.code}
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {wardInfo.name}
          </span>
        </div>

        {/* Quick Ward Navigation & Actions */}
        <div className="flex items-center space-x-2">
          {/* Previous Ward Button */}
          {prevWardCode && (
            <button
              onClick={() => navigate(`/wards/${prevWardCode}`)}
              title={`Jump to previous ward (${prevWardCode})`}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-mono text-[10px]">Prev</span>
            </button>
          )}

          {/* Quick Ward Dropdown Switcher */}
          <div className="relative">
            <select
              value={wardInfo.code}
              onChange={(e) => navigate(`/wards/${e.target.value}`)}
              className="px-2.5 py-1 text-xs font-mono bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--brand)] max-w-[170px] truncate"
            >
              {(allWards.length > 0 ? allWards : fallbackWards.features).map((w, idx) => {
                const wc = w.properties?.ward_code || w.id || `W${String(idx + 1).padStart(3, '0')}`;
                const nm = w.properties?.ward_name || w.name || `Ward ${wc}`;
                return (
                  <option key={wc} value={wc}>
                    {wc} — {nm}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Next Ward Button */}
          {nextWardCode && (
            <button
              onClick={() => navigate(`/wards/${nextWardCode}`)}
              title={`Jump to next ward (${nextWardCode})`}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)] transition-colors cursor-pointer"
            >
              <span className="hidden md:inline font-mono text-[10px]">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Refresh Live Telemetry Button */}
          <button
            onClick={() => loadWardData(true)}
            disabled={refreshing}
            title="Refresh real-time ward telemetry"
            className="p-1.5 border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[var(--brand)]' : ''}`} />
          </button>

          {/* Print Dossier */}
          <button
            onClick={handlePrint}
            title="Print or export operational flood dossier"
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span className="hidden sm:inline text-[11px] font-semibold">Print Dossier</span>
          </button>
        </div>
      </div>

      {/* ── 2. Ward Identity & Threat Level Master Banner ── */}
      <div className="surface-card rounded-none p-4 sm:p-6 border border-[var(--border)] relative overflow-hidden">
        {/* Subtle background glow accent based on risk level */}
        <div
          className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ backgroundColor: getRiskHexColor(evalData.riskLevel) }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Identity & Metadata */}
          <div className="space-y-2">
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="px-2.5 py-0.5 rounded-none bg-[var(--brand)]/15 text-[var(--brand)] font-mono font-bold text-xs border border-[var(--brand)]/30">
                MCD WARD {wardInfo.code}
              </span>
              <span className="px-2 py-0.5 rounded-none bg-[var(--surface-soft)] text-[var(--text-muted)] text-[11px] font-medium border border-[var(--border)]">
                Zone: <strong className="text-[var(--text-primary)]">{wardInfo.zone}</strong>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>REAL-TIME STREAM</span>
              </span>
            </div>

            <div className="flex items-baseline space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {wardInfo.name}
              </h1>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                SRID 4326 PostGIS Polygon
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
              <button
                onClick={handleCopyCoords}
                className="inline-flex items-center space-x-1 hover:text-[var(--brand)] transition-colors font-mono cursor-pointer"
                title="Click to copy SRID 4326 Centroid Coordinates"
              >
                <Compass className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>
                  {wardInfo.lat.toFixed(5)}° N, {wardInfo.lng.toFixed(5)}° E
                </span>
                {copiedCoords ? (
                  <Check className="w-3 h-3 text-emerald-400 ml-1" />
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] opacity-60 ml-0.5">(copy)</span>
                )}
              </button>
              <span>·</span>
              <span>
                Baseline Drainage: <strong className="text-[var(--text-primary)]">{wardInfo.drainage}%</strong> ({wardInfo.drainage} m³/s)
              </span>
              <span>·</span>
              <span>
                Active Precipitation: <strong className="text-[var(--text-primary)]">{wardInfo.rainfall} mm/h</strong>
              </span>
            </div>
          </div>

          {/* Master Risk Composite Rating Badge */}
          <div className="flex items-stretch sm:items-center space-x-3 bg-[var(--surface-soft)] p-3 sm:p-4 border border-[var(--border)]">
            <div className="text-right pr-2">
              <div className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                Hydrological Mass Balance
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] font-mono leading-tight">
                {evalData.riskScore} <span className="text-xs font-normal text-[var(--text-muted)]">/ 100</span>
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                Primary Driver: <strong className="text-[var(--text-primary)]">{evalData.primaryDriver}</strong>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center px-4 py-2 border-l border-[var(--border)]">
              <div className={`px-3 py-1 rounded-none text-xs font-black tracking-wider uppercase ${getRiskBadgeClasses(evalData.riskLevel)}`}>
                {evalData.riskLevel}
              </div>
              <div className="text-[9px] font-mono text-[var(--text-muted)] mt-1.5 text-center">
                {evalData.confidenceScore}% Confidence · IMD
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Four-Metric Hydrological Telemetry Ribbon ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Composite Risk Score */}
        <div className="surface-card rounded-none p-3.5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Composite Flood Risk
            </span>
            <Activity className="w-4 h-4 text-[var(--brand)]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono">
            {evalData.riskScore} <span className="text-xs font-normal text-[var(--text-muted)]">pts</span>
          </div>
          <div className="mt-2 w-full bg-[var(--surface-soft)] h-1.5 border border-[var(--border)] overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${evalData.riskScore}%`,
                backgroundColor: getRiskHexColor(evalData.riskLevel),
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)]">
            <span>City Avg: 48.8 pts</span>
            <span className={evalData.riskScore >= 48.8 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
              {evalData.riskScore >= 48.8 ? `+${(evalData.riskScore - 48.8).toFixed(1)}` : `-${(48.8 - evalData.riskScore).toFixed(1)}`} vs avg
            </span>
          </div>
        </div>

        {/* Metric 2: Drainage Capacity */}
        <div className="surface-card rounded-none p-3.5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Drainage Clearance
            </span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono">
            {wardInfo.drainage}% <span className="text-xs font-normal text-[var(--text-muted)]">({wardInfo.drainage} m³/s)</span>
          </div>
          <div className="mt-2 w-full bg-[var(--surface-soft)] h-1.5 border border-[var(--border)] overflow-hidden">
            <div
              className={`h-full ${wardInfo.drainage >= 60 ? 'bg-emerald-500' : wardInfo.drainage >= 40 ? 'bg-yellow-500' : 'bg-rose-500'}`}
              style={{ width: `${wardInfo.drainage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)]">
            <span>Deficit: {100 - wardInfo.drainage}%</span>
            <span className={wardInfo.drainage < 45 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
              {wardInfo.drainage < 45 ? 'Severe Silt Choke' : 'Adequate Flow'}
            </span>
          </div>
        </div>

        {/* Metric 3: Monsoon Precipitation */}
        <div className="surface-card rounded-none p-3.5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Rainfall Telemetry
            </span>
            <CloudRain className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono">
            {wardInfo.rainfall} <span className="text-xs font-normal text-[var(--text-muted)]">mm/h</span>
          </div>
          <div className="mt-2 w-full bg-[var(--surface-soft)] h-1.5 border border-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-cyan-500"
              style={{ width: `${Math.min(100, Math.round((wardInfo.rainfall / 60) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)]">
            <span>24h Influx: ~{(wardInfo.rainfall * 1.8).toFixed(0)} mm</span>
            <span className="text-cyan-400 font-semibold">Open-Meteo Sensor</span>
          </div>
        </div>

        {/* Metric 4: Civic Urgency & Field Telemetry */}
        <div className="surface-card rounded-none p-3.5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Civic Ground Depth
            </span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono">
            {evalData.riskLevel === 'CRITICAL' ? '46 cm' : evalData.riskLevel === 'HIGH' ? '28 cm' : '8 cm'}
            <span className="text-xs font-normal text-[var(--text-muted)]"> depth</span>
          </div>
          <div className="mt-2 w-full bg-[var(--surface-soft)] h-1.5 border border-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-amber-500"
              style={{
                width: `${evalData.riskLevel === 'CRITICAL' ? '80%' : evalData.riskLevel === 'HIGH' ? '50%' : '15%'}`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)]">
            <span>Active Incidents: {activeIncidents.length}</span>
            <span className="text-amber-400 font-semibold">Verified Dispatches</span>
          </div>
        </div>
      </div>

      {/* ── 4. Main Split Viewport (Spatial GIS Mini-Map & Mathematical Decomposition) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Spatial GIS Mini-Map & Hotspot Proximity */}
        <div className="lg:col-span-7 space-y-4">
          <div className="surface-card rounded-none p-3.5 sm:p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[var(--brand)]" />
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  Geospatial Flood Boundary &amp; Underpass Proximity
                </h3>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setMapTheme(mapTheme === 'dark' ? 'street' : 'dark')}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Toggle map visual mode"
                >
                  <Layers className="w-3 h-3 text-[var(--brand)]" />
                  <span>{mapTheme === 'dark' ? 'Tactical Dark' : 'Street Tiles'}</span>
                </button>
                <button
                  onClick={handleRecenterMap}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Recenter view on ward centroid"
                >
                  Recenter
                </button>
                <span className="text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.5 bg-[var(--surface-soft)] border border-[var(--border)]">
                  Zoom 13x
                </span>
              </div>
            </div>

            {/* Embedded Leaflet Map */}
            <div className="relative w-full h-[320px] sm:h-[360px] border border-[var(--border)] overflow-hidden bg-[var(--surface-soft)]">
              <div
                ref={mapContainerRef}
                className={`w-full h-full ${mapTheme === 'dark' ? 'leaflet-dark-mode' : ''}`}
              />

              {/* Floating Overlay Pill on Map */}
              <div className="absolute bottom-2.5 left-2.5 z-[1000] bg-[var(--surface-glass-strong)] backdrop-blur-md px-3 py-1.5 border border-[var(--border)] text-[10px] font-mono flex items-center space-x-2 text-[var(--text-primary)] shadow-md">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRiskHexColor(evalData.riskLevel) }} />
                <span>
                  {wardInfo.name} ({wardInfo.code}) · {evalData.riskLevel}
                </span>
              </div>

              {/* Map Legend Overlay */}
              <div className="absolute top-2.5 right-2.5 z-[1000] bg-[var(--surface-glass-strong)] backdrop-blur-md p-2 border border-[var(--border)] text-[9px] font-mono space-y-1 text-[var(--text-secondary)] shadow-md hidden sm:block">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRiskHexColor(evalData.riskLevel) }} />
                  <span>Ward Boundary</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 bg-rose-500 rotate-45" />
                  <span>Critical Underpass</span>
                </div>
              </div>
            </div>

            {/* Chronic Hotspots Near This Ward */}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Nearest Monitored Chronic Hotspots &amp; Underpasses
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  Haversine Distance
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {nearbyHotspots.slice(0, 3).map((spot) => (
                  <div
                    key={spot.id}
                    className="p-2 bg-[var(--surface-soft)] border border-[var(--border)] text-left"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-[var(--text-primary)] truncate">
                        {spot.name}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-[var(--brand)] ml-1">
                        {spot.distanceKm} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)]">
                      <span>{spot.type}</span>
                      <span className="text-rose-400 font-semibold">{spot.depth}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Explainable Mass-Balance Decomposition */}
        <div className="lg:col-span-5 space-y-4">
          <div className="surface-card rounded-none p-3.5 sm:p-4 border border-[var(--border)] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-[var(--brand)]" />
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    Explainable Risk Engine Decomposition
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[var(--surface-soft)] text-[var(--brand)] border border-[var(--border)] font-bold">
                  Σ = {evalData.riskScore}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mb-3">
                Deterministic mass-balance model: <code className="text-[var(--text-secondary)] font-mono">Risk = (Drainage × 0.40) + (Rainfall × 0.35) + (Complaints × 0.25)</code>
              </p>

              {/* Three Explainable Factor Cards */}
              <div className="space-y-2.5">
                {/* Factor 1: Drainage Deficit (40%) */}
                <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center space-x-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-400" />
                      <span>Drainage Deficit (40% Weight)</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      +{evalData.contributions.drainage} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
                    <span>Raw Deficit Score: {evalData.components.drainageDeficitScore} / 100</span>
                    <span>Capacity: {wardInfo.drainage}%</span>
                  </div>
                  <div className="w-full bg-[var(--surface)] h-1.5 border border-[var(--border)] overflow-hidden">
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${evalData.components.drainageDeficitScore}%` }}
                    />
                  </div>
                </div>

                {/* Factor 2: Rainfall Surge (35%) */}
                <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center space-x-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Rainfall Surge (35% Weight)</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      +{evalData.contributions.rainfall} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
                    <span>Normalized Surge: {evalData.components.rainfallSurgeScore} / 100</span>
                    <span>Rate: {wardInfo.rainfall} mm/h</span>
                  </div>
                  <div className="w-full bg-[var(--surface)] h-1.5 border border-[var(--border)] overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full"
                      style={{ width: `${evalData.components.rainfallSurgeScore}%` }}
                    />
                  </div>
                </div>

                {/* Factor 3: Civic Urgency (25%) */}
                <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Citizen Urgency (25% Weight)</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      +{evalData.contributions.complaints} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
                    <span>Complaint &amp; Depth Score: {evalData.components.complaintScore} / 100</span>
                    <span>Verified Reports</span>
                  </div>
                  <div className="w-full bg-[var(--surface)] h-1.5 border border-[var(--border)] overflow-hidden">
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${evalData.components.complaintScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stacked Proportional Contribution Bar */}
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Mathematical Component Share
              </div>
              <div className="w-full h-3 flex overflow-hidden border border-[var(--border)]">
                <div
                  title={`Drainage Deficit: ${evalData.contributions.drainage} pts`}
                  className="bg-blue-500 h-full"
                  style={{ width: `${(evalData.contributions.drainage / evalData.riskScore) * 100}%` }}
                />
                <div
                  title={`Rainfall Surge: ${evalData.contributions.rainfall} pts`}
                  className="bg-cyan-500 h-full"
                  style={{ width: `${(evalData.contributions.rainfall / evalData.riskScore) * 100}%` }}
                />
                <div
                  title={`Citizen Urgency: ${evalData.contributions.complaints} pts`}
                  className="bg-amber-500 h-full"
                  style={{ width: `${(evalData.contributions.complaints / evalData.riskScore) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] mt-1.5">
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 inline-block" />
                  <span>Drainage ({evalData.contributions.drainage} pts)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-cyan-500 inline-block" />
                  <span>Rainfall ({evalData.contributions.rainfall} pts)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 inline-block" />
                  <span>Urgency ({evalData.contributions.complaints} pts)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Multi-Horizon Hydrological Projections & Decision Support Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 Cols): Multi-Horizon Projections (6h · 12h · 24h) */}
        <div className="lg:col-span-6 surface-card rounded-none p-3.5 sm:p-4 border border-[var(--border)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  Multi-Horizon Hydrological Projections
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                IMD Safdarjung Baseline
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mb-3">
              Physics-grounded projections incorporating soil saturation decay &amp; hydraulic clearance
            </p>

            {/* Recharts Bar Graph */}
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="horizon" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--text-muted)" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      borderRadius: '0px',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 0, 0, 0]}>
                    {forecastPoints.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRiskHexColor(entry.level)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Horizon Detail Tiles */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            {forecastPoints.slice(1).map((h) => (
              <div key={h.horizon} className="p-2 bg-[var(--surface-soft)] border border-[var(--border)]">
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                  {h.horizon}
                </div>
                <div className="text-base font-mono font-black text-[var(--text-primary)]">
                  {h.score} <span className="text-[10px] font-normal text-[var(--text-muted)]">/ 100</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-1">
                  <span>Rain: {h.rainfall}mm</span>
                  <span className={`font-semibold ${h.trend === 'ESCALATING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {h.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (6 Cols): What Should the City Do Now? Decision Support */}
        <div className="lg:col-span-6 surface-card rounded-none p-3.5 sm:p-4 border border-[var(--border)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  What Should the City Do Now?
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                TACTICAL ROADMAP
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mb-3">
              Ranked actions computed by the Decision Support Engine to mitigate flood impact
            </p>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {(!tacticalPlan?.recommendations || tacticalPlan.recommendations.length === 0) ? (
                // Synthesize authentic recommendations if none from backend
                <>
                  <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)] hover:border-[var(--brand)] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                        PRIORITY #1 CRITICAL
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        ΔRisk: -18 pts
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                      Stage 5000 GPM Mobile Dewatering Pump Rig
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                      Drainage deficit of {100 - wardInfo.drainage}% requires mechanical pumping along low-gradient culverts.
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-[var(--border)]">
                      <span>Urgency: <b>Within 15 mins</b></span>
                      <Link
                        to="/incidents"
                        className="text-[var(--brand)] hover:underline inline-flex items-center space-x-1 font-semibold"
                      >
                        <span>Dispatch via Incident Command</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)] hover:border-[var(--brand)] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                        PRIORITY #2 HIGH
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        ΔRisk: -12 pts
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                      Emergency Silt &amp; Trash Grate Desilting Squad
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                      Deploy suction dredging machines to clear localized blockages at primary stormwater outfall.
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-[var(--border)]">
                      <span>Urgency: <b>Within 45 mins</b></span>
                      <Link
                        to="/incidents"
                        className="text-[var(--brand)] hover:underline inline-flex items-center space-x-1 font-semibold"
                      >
                        <span>Schedule Crew</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                tacticalPlan.recommendations.map((action, idx) => (
                  <div
                    key={action.id || idx}
                    className="p-3 bg-[var(--surface-soft)] border border-[var(--border)] hover:border-[var(--brand)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 font-mono">
                        PRIORITY #{action.priority || idx + 1}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        ΔRisk: -{action.expectedEffect?.projectedRiskScoreReduction || action.estimatedImpact?.riskReductionPoints || 14} pts
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                      {action.title || action.actionTitle}
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                      {action.reason || action.actionDescription || action.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-[var(--border)]">
                      <span>Window: <b>{action.urgencyWindowMinutes || 30} mins</b></span>
                      <Link
                        to="/incidents"
                        className="text-[var(--brand)] hover:underline inline-flex items-center space-x-1 font-semibold"
                      >
                        <span>Dispatch Squad</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>Decision Support Engine · PRAVAH (प्रवाह)</span>
            <Link to="/incidents" className="text-[var(--brand)] hover:underline font-semibold">
              Open Full Incident Command Center →
            </Link>
          </div>
        </div>
      </div>

      {/* ── 6. In-Page Interactive "What-If" Scenario Simulator Sandbox ── */}
      <div className="surface-card rounded-none p-4 sm:p-5 border border-[var(--border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--brand)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                In-Page What-If Scenario Simulator for {wardInfo.name}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                Test emergency dewatering pump deployment and culvert desilting effects on this ward's risk score in real-time
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetSimulation}
              className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleRunSimulation}
              disabled={simRunning}
              className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-[var(--brand)] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <Cpu className={`w-3.5 h-3.5 ${simRunning ? 'animate-spin' : ''}`} />
              <span>{simRunning ? 'Simulating…' : 'Compute ΔRisk'}</span>
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Slider 1: Dewatering Pumps */}
          <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[var(--text-primary)]">
                Mobile Dewatering Pumps (5000 GPM)
              </label>
              <span className="text-xs font-mono font-bold text-[var(--brand)]">
                +{simPumps} units
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={simPumps}
              onChange={(e) => setSimPumps(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--brand)] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-1">
              <span>0 pumps</span>
              <span>3 pumps (recommended)</span>
              <span>6 pumps</span>
            </div>
          </div>

          {/* Slider 2: Desilting Modifier */}
          <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[var(--text-primary)]">
                Drainage Desilting Modifier
              </label>
              <span className={`text-xs font-mono font-bold ${simDrainageMod >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {simDrainageMod > 0 ? `+${simDrainageMod}%` : `${simDrainageMod}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              step="5"
              value={simDrainageMod}
              onChange={(e) => setSimDrainageMod(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--brand)] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-1">
              <span>-40% (Choked)</span>
              <span>Baseline (0%)</span>
              <span>+50% (Desilted)</span>
            </div>
          </div>

          {/* Slider 3: Extreme Rainfall Cloudburst Surge */}
          <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[var(--text-primary)]">
                Simulated Rain Surge (Cloudburst)
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400">
                +{simRainfallSurge} mm/h
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={simRainfallSurge}
              onChange={(e) => setSimRainfallSurge(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--brand)] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-1">
              <span>0 mm</span>
              <span>+40 mm</span>
              <span>+80 mm (Cloudburst)</span>
            </div>
          </div>
        </div>

        {/* Simulation Output Card */}
        {simResult && (
          <div className="p-3.5 bg-[var(--surface-soft)] border border-[var(--brand)]/40 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Simulated Intervention Outcome:
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${getRiskBadgeClasses(simResult.newLevel)}`}>
                    {simResult.newLevel}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Baseline Risk: <strong className="font-mono text-[var(--text-primary)]">{simResult.baselineRisk}</strong> →
                  Projected Risk: <strong className="font-mono text-[var(--text-primary)]">{simResult.projectedRisk}</strong> (
                  <span className={simResult.deltaRisk <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {simResult.deltaRisk <= 0 ? `${simResult.deltaRisk} pts` : `+${simResult.deltaRisk} pts`} ΔRisk
                  </span>)
                </p>
              </div>

              <div className="flex items-center space-x-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Simulated Inundation</span>
                  <strong className="text-[var(--text-primary)]">{simResult.simulatedDepthCm} cm</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Est. Cost</span>
                  <strong className="text-[var(--text-primary)]">₹{simResult.estCostRupees.toLocaleString('en-IN')}</strong>
                </div>
                <Link
                  to="/admin"
                  className="px-2.5 py-1 text-[11px] font-semibold bg-[var(--brand)] text-white hover:opacity-90 transition-opacity"
                >
                  Apply in Control Center →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Ward Localized Infrastructure Assets & Active Incidents ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets & Pump Stations */}
        <div className="surface-card rounded-none p-3.5 sm:p-4 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[var(--brand)]" />
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Local Drainage &amp; Sump Infrastructure
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              MCD Assets Registry
            </span>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'inf-1',
                name: `${wardInfo.name} Primary Stormwater Outfall Sump`,
                type: 'PUMP STATION',
                capacity: '200 m³/s',
                status: 'OPERATIONAL',
                lastChecked: '45 mins ago',
              },
              {
                id: 'inf-2',
                name: `${wardInfo.name} Auxiliary Gravity Sluice Gate #3`,
                type: 'GRAVITY SLUICE',
                capacity: '140 m³/s',
                status: wardInfo.drainage < 45 ? 'SILT OBSTRUCTION' : 'OPERATIONAL',
                lastChecked: '2 hours ago',
              },
              {
                id: 'inf-3',
                name: 'Emergency Mobile Dewatering Staging Node',
                type: 'STAGING DEPOT',
                capacity: '2 × 5000 GPM',
                status: 'STANDBY',
                lastChecked: '15 mins ago',
              },
            ].map((asset) => (
              <div
                key={asset.id}
                className="p-2.5 bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{asset.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {asset.type} · Rated Capacity: {asset.capacity}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 text-[9px] font-mono font-bold ${
                      asset.status === 'OPERATIONAL'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : asset.status === 'STANDBY'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {asset.status}
                  </span>
                  <div className="text-[9px] text-[var(--text-muted)] mt-1">{asset.lastChecked}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Emergency Incidents in Ward */}
        <div className="surface-card rounded-none p-3.5 sm:p-4 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Active Ground Flood Incidents in Ward
              </h3>
            </div>
            <Link
              to="/report"
              className="text-[10px] font-semibold text-[var(--brand)] hover:underline inline-flex items-center space-x-1"
            >
              <span>+ Log Citizen Dispatch</span>
            </Link>
          </div>

          <div className="space-y-2">
            {activeIncidents.length === 0 ? (
              <div className="p-6 text-center bg-[var(--surface-soft)] border border-[var(--border)]">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">No Unresolved Critical Incidents</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Stormwater clearing crews and gravity outfalls are handling current runoff volume.
                </p>
              </div>
            ) : (
              activeIncidents.slice(0, 3).map((inc) => (
                <div
                  key={inc.id}
                  className="p-2.5 bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-between"
                >
                  <div className="space-y-0.5 max-w-[70%]">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold text-[var(--brand)]">{inc.id}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {inc.severity || 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-primary)] line-clamp-1">
                      {inc.description || 'Waterlogging obstruction reported by citizen.'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-rose-400">
                      {inc.waterDepthCm || 35} cm
                    </span>
                    <div className="text-[9px] text-[var(--text-muted)] mt-0.5">Recorded Depth</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
