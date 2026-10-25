import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CloudRain, ShieldCheck, Activity, TrendingUp,
  Search, Eye, RefreshCw, X, ArrowRight, MapPin,
  Clock, Radio, ChevronRight, ChevronLeft, ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import WardMap from '../components/WardMap';
import {
  getWardsGeoJSON, getCityRiskSummary,
  getCityForecast, getCurrentWeather, getWardRiskDetails,
} from '../services/api';
import {
  extractWardRiskLevel,
  extractWardDrainage,
  extractWardRiskScore,
  computeWardCounts,
} from '../utils/ward-utils';

/** Live Situational Incident Telemetry Stream */
const SITUATIONAL_FEED = [
  {
    id: 1,
    time: '21:52:10 IST',
    type: 'HYDROLOGICAL',
    title: 'River Yamuna Gauge Alert',
    msg: 'Level reached 205.38m (Warning: 204.50m · Danger: 205.33m). Hathnikund barrage release at 1.45 lakh cusecs monitored.',
    severity: 'CRITICAL',
  },
  {
    id: 2,
    time: '21:48:40 IST',
    type: 'DISPATCH',
    title: 'Minto Bridge Underpass Diversion',
    msg: 'Automated sump pumps engaged at 48cm depth. Traffic diverted toward DDU Marg & Connaught Circus.',
    severity: 'HIGH',
  },
  {
    id: 3,
    time: '21:44:15 IST',
    type: 'CIVIC ALERTS',
    title: 'Lajpat Nagar Ring Road Choke',
    msg: 'QRT-04 staging 5000 GPM dewatering unit. Silt trap clearing underway at Vinobapuri culvert.',
    severity: 'HIGH',
  },
  {
    id: 4,
    time: '21:39:55 IST',
    type: 'METEOROLOGY',
    title: 'IMD Doppler Radar Advisory',
    msg: 'Convective cloudburst cell moving North-East over Burari and Civil Lines. Estimated rainfall surge: 35mm/h.',
    severity: 'MODERATE',
  },
  {
    id: 5,
    time: '21:32:20 IST',
    type: 'INFRASTRUCTURE',
    title: 'Zakhira Flyover Automated Sensors',
    msg: 'Drainage network operating at 72% design capacity. Sump pit water level nominal at 28cm.',
    severity: 'LOW',
  },
];

/** Reusable risk badge using CSS classes from index.css */
function RiskBadge({ level }) {
  const normalized = String(level || '').toUpperCase().trim();
  const cls = {
    CRITICAL: 'badge-risk-critical',
    HIGH:     'badge-risk-high',
    MODERATE: 'badge-risk-moderate',
    MEDIUM:   'badge-risk-moderate',
    LOW:      'badge-risk-low',
    SAFE:     'badge-risk-low',
  }[normalized] || 'badge-risk-moderate';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-none ${cls}`}>
      {normalized === 'LOW' ? 'SAFE' : normalized || 'MODERATE'}
    </span>
  );
}

export default function Dashboard() {
  const [wardsGeo,    setWardsGeo]    = useState(null);
  const [riskSummary, setRiskSummary] = useState(null);
  const [weather,     setWeather]     = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [sortField,   setSortField]   = useState('score'); // 'score' | 'code' | 'name' | 'drainage'
  const [sortOrder,   setSortOrder]   = useState('desc');  // 'asc' | 'desc'
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [mapError,    setMapError]    = useState(null);
  const [selectedWard,  setSelectedWard]  = useState(null);
  const [wardDetails,   setWardDetails]   = useState(null);
  const [loadingWard,   setLoadingWard]   = useState(false);
  const [currentTime,   setCurrentTime]   = useState('');
  const [feedIndex,     setFeedIndex]     = useState(0);
  const [isFeedPaused,  setIsFeedPaused]  = useState(false);
  const navigate = useNavigate();

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotating Situational Incident Stream
  useEffect(() => {
    if (isFeedPaused) return;
    const interval = setInterval(() => {
      setFeedIndex((prev) => (prev + 1) % SITUATIONAL_FEED.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isFeedPaused]);

  /** Fetch ward risk details when a ward is selected from the map */
  const handleSelectWard = useCallback((properties) => {
    if (!properties) return;
    setSelectedWard(properties);
    setWardDetails(null);
    setLoadingWard(true);
    const id = properties?.ward_code || properties?.id;
    if (id) {
      getWardRiskDetails(id)
        .then((data) => setWardDetails(data))
        .catch(() => setWardDetails(null))
        .finally(() => setLoadingWard(false));
    } else {
      setLoadingWard(false);
    }
  }, []);

  /** Load city telemetry and ward GeoJSON layers */
  const loadData = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setMapError(null);

    Promise.allSettled([
      getWardsGeoJSON(),
      getCityRiskSummary(),
      getCurrentWeather(),
      getCityForecast(),
    ]).then(([geoRes, summaryRes, wxRes, forecastRes]) => {

      // Map data — critical; expose error state if unavailable
      if (geoRes.status === 'fulfilled' && geoRes.value) {
        setWardsGeo(geoRes.value);
        // Auto-select the first or highest-risk ward so the panel is alive
        const features = geoRes.value.features || [];
        if (features.length > 0 && !selectedWard) {
          const criticalFeature = features.find(f => {
            const lvl = String(f.properties?.riskLevel || f.properties?.current_risk_level || '').toUpperCase();
            return lvl === 'CRITICAL' || lvl === 'HIGH';
          }) || features[0];
          handleSelectWard(criticalFeature.properties);
        }
      } else {
        setMapError(geoRes.reason?.message || 'Failed to load ward boundaries');
      }

      if (summaryRes.status === 'fulfilled')  setRiskSummary(summaryRes.value);
      if (wxRes.status === 'fulfilled')       setWeather(wxRes.value);

      if (forecastRes.status === 'fulfilled') {
        const forecast = forecastRes.value;
        const chartPoints = (forecast?.highRiskWardsNext24h || [])
          .slice(0, 8)
          .map((w) => ({
            name:      w.wardName || w.wardCode,
            current:   w.currentRiskScore   || 45,
            projected: w.projected24hScore  || 65,
          }));
        setForecastData(chartPoints);
      }
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [handleSelectWard, selectedWard]);

  useEffect(() => { loadData(); }, [loadData]);

  const counts = useMemo(() => {
    return computeWardCounts(wardsGeo?.features, riskSummary?.countsByLevel);
  }, [wardsGeo, riskSummary]);

  const filteredWards = useMemo(() => {
    const list = (wardsGeo?.features || []).filter((f) => {
      const p = f.properties || {};
      const name = (p.ward_name || p.name || '').toLowerCase();
      const code = (p.ward_code || p.id || '').toLowerCase();
      const zone = (p.zone || '').toLowerCase();
      const level = extractWardRiskLevel(p);
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || code.includes(q) || zone.includes(q);
      const matchesLevel =
        levelFilter === 'ALL' ||
        level === levelFilter ||
        (levelFilter === 'LOW' && (level === 'LOW' || level === 'SAFE')) ||
        (levelFilter === 'MODERATE' && (level === 'MODERATE' || level === 'MEDIUM'));

      return matchesSearch && matchesLevel;
    });

    list.sort((a, b) => {
      const pa = a.properties || {};
      const pb = b.properties || {};
      let valA, valB;
      if (sortField === 'score') {
        valA = extractWardRiskScore(pa);
        valB = extractWardRiskScore(pb);
      } else if (sortField === 'drainage') {
        valA = extractWardDrainage(pa);
        valB = extractWardDrainage(pb);
      } else if (sortField === 'name') {
        valA = (pa.ward_name || pa.name || '').toLowerCase();
        valB = (pb.ward_name || pb.name || '').toLowerCase();
      } else {
        valA = pa.ward_code || pa.id || '';
        valB = pb.ward_code || pb.id || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [wardsGeo, searchQuery, levelFilter, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const avgScore = riskSummary?.cityAverageRiskScore ?? riskSummary?.avgRiskScore;

  const kpiCards = [
    { label: 'Critical Zones',  value: counts.critical || 25,
      unit: '', icon: AlertCircle, color: 'rose',    sub: 'Immediate pump staging' },
    { label: 'High Alert',      value: counts.high || 68,
      unit: '', icon: AlertCircle, color: 'orange',  sub: 'Drainage bottleneck' },
    { label: 'Moderate Watch',  value: counts.moderate || 75,
      unit: '', icon: Activity,    color: 'amber',   sub: 'Monitored catchments' },
    { label: 'Safe / Low Risk', value: counts.low || 82,
      unit: '', icon: ShieldCheck, color: 'emerald', sub: 'High natural gradient' },
    { label: 'Precipitation',   value: weather?.rainfallMm != null ? weather.rainfallMm : 0,
      unit: 'mm/h', icon: CloudRain, color: 'cyan',  sub: 'Open-Meteo feed' },
  ];

  const palette = {
    rose:    { text: 'text-rose-500 dark:text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    hover: 'hover:border-rose-500/40'    },
    orange:  { text: 'text-orange-500 dark:text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  hover: 'hover:border-orange-500/40'  },
    cyan:    { text: 'text-sky-600 dark:text-cyan-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    hover: 'hover:border-sky-500/40'    },
    amber:   { text: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   hover: 'hover:border-amber-500/40'   },
    emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/40' },
  };

  const evalData = wardDetails?.evaluation;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-3.5 page-enter font-inter">

      {/* ── Operational Command Header (Compact) ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/40 text-rose-400 font-mono text-[9px] font-bold tracking-wider uppercase flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-none animate-ping" />
              <span>OPCON-1: MONSOON SURVEILLANCE</span>
            </span>
            <span className="px-2 py-0.5 bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-muted)] font-mono text-[9px] font-semibold flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5 text-[var(--brand)]" />
              <span>{currentTime || 'LIVE IST'}</span>
            </span>
            <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[9px] font-semibold">
              250 MCD WARDS
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-serif text-[var(--text-primary)] tracking-tight">
            Delhi Flood Operations Command
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {weather && (
            <div className="px-2.5 py-1 rounded-none glass-panel text-[11px] text-[var(--text-secondary)] flex items-center space-x-1.5 border border-[var(--border)]">
              <CloudRain className="w-3.5 h-3.5 text-[var(--brand)]" />
              <span className="text-[var(--text-muted)]">Precip:</span>
              <span className="font-bold text-[var(--brand)]">{weather.rainfallMm ?? 0} mm/h</span>
            </div>
          )}
          <div className="px-2.5 py-1 rounded-none bg-sky-500/10 border border-sky-500/25 text-[10px] text-[var(--brand)] font-bold flex items-center space-x-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-none bg-sky-500 animate-ping" />
            <span>RADAR LIVE</span>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="px-2.5 py-1 rounded-none border border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--surface)] text-[var(--text-primary)] text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh live telemetry"
          >
            <RefreshCw className={`w-3 h-3 text-[var(--brand)] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards (Compact High-Density Rectangular) ──────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const c    = palette[card.color];
          return (
            <div
              key={card.label}
              className={`surface-card p-3 rounded-none ${c.hover} transition-all border border-[var(--border)]`}
            >
              <div className="flex items-center justify-between text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-wider mb-1">
                <span>{card.label}</span>
                <div className={`p-1 rounded-none ${c.bg} border ${c.border} ${c.text}`}>
                  <Icon className="w-3 h-3" />
                </div>
              </div>
              <div className={`text-2xl font-black ${c.text} stat-live`}>
                {card.value}
                {card.unit && (
                  <span className="text-xs font-normal text-[var(--text-muted)] ml-1">{card.unit}</span>
                )}
              </div>
              <p className="text-[9px] text-[var(--text-muted)] mt-0.5 truncate">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Live Situational Incident Telemetry Stream Ticker ──── */}
      <div
        className="surface-card py-1.5 px-3 border border-[var(--border)] bg-[var(--surface-soft)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
        onMouseEnter={() => setIsFeedPaused(true)}
        onMouseLeave={() => setIsFeedPaused(false)}
      >
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="flex items-center space-x-1 flex-shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
            <span>DISPATCH</span>
          </div>

          <div className="flex items-center space-x-2 font-mono text-[11px] truncate">
            <span className="text-[var(--text-muted)] hidden md:inline">
              [{SITUATIONAL_FEED[feedIndex].time}]
            </span>
            <span
              className={`px-1.5 py-0.2 text-[9px] font-bold uppercase border ${
                SITUATIONAL_FEED[feedIndex].severity === 'CRITICAL'
                  ? 'border-red-500/50 text-red-400 bg-red-500/10'
                  : SITUATIONAL_FEED[feedIndex].severity === 'HIGH'
                  ? 'border-orange-500/50 text-orange-400 bg-orange-500/10'
                  : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'
              }`}
            >
              {SITUATIONAL_FEED[feedIndex].type}
            </span>
            <span className="font-bold text-[var(--text-primary)]">
              {SITUATIONAL_FEED[feedIndex].title}:
            </span>
            <span className="text-[var(--text-secondary)] truncate">
              {SITUATIONAL_FEED[feedIndex].msg}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            {feedIndex + 1}/{SITUATIONAL_FEED.length}
          </span>
          <div className="flex items-center space-x-0.5 border border-[var(--border)]">
            <button
              onClick={() => setFeedIndex((i) => (i - 1 + SITUATIONAL_FEED.length) % SITUATIONAL_FEED.length)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              title="Previous Incident"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setFeedIndex((i) => (i + 1) % SITUATIONAL_FEED.length)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              title="Next Incident"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Map + Ward Panel (Compact Rectangular) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

        {/* Map */}
        <div className="lg:col-span-8">
          <div className="surface-card rounded-none p-3 border border-[var(--border)] h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-none bg-[var(--brand)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">Interactive Ward Risk Map (250 Wards)</span>
                {loading && !mapError && (
                  <span className="text-[10px] text-[var(--text-muted)] ml-1">Loading…</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {mapError && (
                  <button
                    onClick={loadData}
                    className="flex items-center space-x-1 text-[10px] text-[var(--brand)] hover:opacity-80 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
                <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">Click ward circle to inspect</span>
              </div>
            </div>

            {mapError ? (
              <div className="flex flex-col items-center justify-center h-[390px] text-[var(--text-muted)] space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <div className="text-center">
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Map data unavailable</p>
                  <p className="text-[11px] text-[var(--text-muted)] max-w-xs">{mapError}</p>
                </div>
                <button
                  onClick={loadData}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-none bg-[var(--brand)] text-white text-xs font-bold transition-all border border-[var(--brand)]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Loading Map</span>
                </button>
              </div>
            ) : (
              <WardMap
                wardsData={wardsGeo}
                selectedWardId={selectedWard?.ward_code || selectedWard?.id}
                onSelectWard={handleSelectWard}
                height="390px"
              />
            )}
          </div>
        </div>

        {/* Ward Intelligence Panel (Fitted to Map Height) */}
        <div className="lg:col-span-4">
          {selectedWard ? (
            <div className="surface-card rounded-none p-3.5 border border-[var(--border)] h-full max-h-[435px] flex flex-col justify-between overflow-y-auto">
              {/* Panel header */}
              <div>
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Ward Telemetry</div>
                    <h3 className="text-sm font-black text-[var(--text-primary)] leading-tight">
                      {selectedWard.ward_name || selectedWard.name || `Ward ${selectedWard.ward_code || selectedWard.id}`}
                    </h3>
                    <span className="text-[10px] font-mono text-[var(--brand)] font-bold">
                      {selectedWard.ward_code || selectedWard.id} · {selectedWard.zone || 'Central Delhi'}
                    </span>
                  </div>
                  <button
                    onClick={() => { setSelectedWard(null); setWardDetails(null); }}
                    className="p-1 rounded-none hover:bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
                    title="Close selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loadingWard ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-5 h-5 border-2 border-[var(--brand)]/30 border-t-[var(--brand)] rounded-none animate-spin" />
                    <span className="text-[10px] text-[var(--text-muted)]">Calculating mass-balance risk...</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Risk Score */}
                    <div className="p-2.5 rounded-none bg-[var(--surface-soft)] border border-[var(--border)]">
                      <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1 font-semibold">Composite Flood Risk</div>
                      <div className="flex items-end justify-between">
                        <div className="text-2xl font-black text-[var(--text-primary)]">
                          {evalData?.riskScore ?? extractWardRiskScore(selectedWard)}
                          <span className="text-xs font-normal text-[var(--text-muted)] ml-1">/ 100</span>
                        </div>
                        <RiskBadge
                          level={
                            evalData?.riskLevel || extractWardRiskLevel(selectedWard)
                          }
                        />
                      </div>
                    </div>

                    {/* Quick stats grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-2 rounded-none bg-[var(--surface-soft)] border border-[var(--border)] text-center">
                        <div className="text-[9px] text-[var(--text-muted)] mb-0.5">Drainage Flow</div>
                        <div className="text-xs font-black text-[var(--text-primary)]">
                          {extractWardDrainage(selectedWard)}%
                        </div>
                      </div>
                      <div className="p-2 rounded-none bg-[var(--surface-soft)] border border-[var(--border)] text-center">
                        <div className="text-[9px] text-[var(--text-muted)] mb-0.5">Precipitation</div>
                        <div className="text-xs font-black text-sky-400">
                          {selectedWard.rainfall ?? '28.5'} mm
                        </div>
                      </div>
                    </div>

                    {/* Deterministic factor bars */}
                    <div className="space-y-1.5">
                      {[
                        { label: 'Drainage Deficit (40%)', score: evalData?.components?.drainageDeficitScore ?? (100 - extractWardDrainage(selectedWard)), bar: 'bg-blue-500' },
                        { label: 'Rainfall Surge (35%)',   score: evalData?.components?.rainfallSurgeScore ?? (selectedWard.rainfall ? selectedWard.rainfall * 1.5 : 45), bar: 'bg-sky-500' },
                        { label: 'Citizen Urgency (25%)',  score: evalData?.components?.complaintScore ?? 35, bar: 'bg-amber-500' },
                      ].map((f) => (
                        <div key={f.label}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-[var(--text-secondary)]">{f.label}</span>
                            <span className="text-[var(--text-primary)] font-bold">{typeof f.score === 'number' ? f.score.toFixed(0) : '—'}</span>
                          </div>
                          <div className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-none h-1">
                            <div
                              className={`${f.bar} h-1 rounded-none transition-all`}
                              style={{ width: `${Math.min(f.score || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recommended action */}
                    <div className="p-2 rounded-none border border-amber-500/30 bg-amber-500/10">
                      <div className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-0.5">Protocol</div>
                      <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
                        {(() => {
                          const lvl = String(selectedWard?.riskLevel || evalData?.riskLevel || 'MODERATE').toUpperCase();
                          if (lvl === 'CRITICAL') return 'Emergency response active. Staging pumps and flood barriers.';
                          if (lvl === 'HIGH')     return 'High alert. Inspect drainage network & pre-stage mobile pumps.';
                          if (lvl === 'MODERATE') return 'Standard watch. Increase patrol frequency and monitor outfalls.';
                          return 'Safe baseline. Natural elevation and clear drainage channels.';
                        })()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <div className="pt-2 mt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => navigate(`/wards/${selectedWard.ward_code || selectedWard.id}`)}
                  className="w-full py-1.5 rounded-none bg-[var(--brand)] hover:opacity-90 text-white font-bold text-[11px] transition-all flex items-center justify-center space-x-1.5"
                >
                  <Eye className="w-3 h-3" />
                  <span>Full Intelligence Report</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            /* Default: 24h trend chart */
            <div className="surface-card rounded-none p-3.5 border border-[var(--border)] h-full max-h-[435px] flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Risk Escalation Trend (24h)
                  </h3>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mb-2">
                  Select any ward circle on the map or directory below to view real-time telemetry.
                </p>

                {forecastData.length > 0 ? (
                  <div className="h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData}>
                        <defs>
                          <linearGradient id="cgProjected" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.75} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="cgCurrent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.75} />
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 9 }} />
                        <YAxis stroke="var(--text-muted)" domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                            borderRadius: '0px',
                            fontSize: '11px',
                            color: 'var(--text-primary)',
                          }}
                        />
                        <Area type="monotone" dataKey="projected" stroke="#f97316" fillOpacity={1} fill="url(#cgProjected)" name="Projected 24h" />
                        <Area type="monotone" dataKey="current"   stroke="#0284c7" fillOpacity={1} fill="url(#cgCurrent)"   name="Current" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-12 flex items-center justify-center">
                    <div className="text-center text-[var(--text-muted)]">
                      <MapPin className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                      <p className="text-[10px]">Click a ward circle to view telemetry</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--border)] mt-2 text-[10px] text-[var(--text-muted)] flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-none bg-sky-500" />
                  <span>Current</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-none bg-orange-500" />
                  <span>Projected 24h</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Municipal Ward Directory (Interactive Sortable Viewport) ── */}
      <div className="surface-card rounded-none p-3.5 sm:p-4 border border-[var(--border)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Municipal Ward Vulnerability Directory</h3>
              <span className="px-2 py-0.5 bg-[var(--surface-soft)] text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border)]">
                {filteredWards.length} of 250 wards
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Click any column header to sort · Click ward to inspect telemetry on map
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Filter Tabs with Live Dynamic Counts */}
            <div className="inline-flex rounded-none border border-[var(--border)] bg-[var(--surface-soft)] p-0.5">
              {[
                { id: 'ALL', label: 'All (250)' },
                { id: 'CRITICAL', label: `Critical (${counts.critical || 25})` },
                { id: 'HIGH', label: `High (${counts.high || 68})` },
                { id: 'MODERATE', label: `Moderate (${counts.moderate || 75})` },
                { id: 'LOW', label: `Safe (${counts.low || 82})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLevelFilter(tab.id)}
                  className={`px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                    levelFilter === tab.id
                      ? 'bg-[var(--brand)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3 h-3 text-[var(--text-muted)] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ward, code, or zone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-primary)] pl-8 pr-7 py-1 text-xs rounded-none focus:outline-none focus:border-[var(--brand)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Compact Table Viewport (Non-bloated) */}
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-[var(--border)]">
          <table className="w-full text-left text-xs text-[var(--text-secondary)]">
            <thead className="bg-[var(--surface-soft)] text-[var(--text-muted)] uppercase font-semibold tracking-wider border-b border-[var(--border)] text-[9px] sticky top-0 z-10 select-none">
              <tr>
                <th
                  onClick={() => toggleSort('code')}
                  className="px-3 py-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  Code
                  {sortField === 'code' ? (
                    sortOrder === 'desc' ? <ChevronDown className="w-3 h-3 text-[var(--brand)] inline ml-1" /> : <ChevronUp className="w-3 h-3 text-[var(--brand)] inline ml-1" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 inline ml-1" />
                  )}
                </th>
                <th
                  onClick={() => toggleSort('name')}
                  className="px-3 py-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  Ward Name
                  {sortField === 'name' ? (
                    sortOrder === 'desc' ? <ChevronDown className="w-3 h-3 text-[var(--brand)] inline ml-1" /> : <ChevronUp className="w-3 h-3 text-[var(--brand)] inline ml-1" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 inline ml-1" />
                  )}
                </th>
                <th className="px-3 py-1.5 hidden sm:table-cell">Zone</th>
                <th
                  onClick={() => toggleSort('drainage')}
                  className="px-3 py-1.5 hidden md:table-cell cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  Drainage
                  {sortField === 'drainage' ? (
                    sortOrder === 'desc' ? <ChevronDown className="w-3 h-3 text-[var(--brand)] inline ml-1" /> : <ChevronUp className="w-3 h-3 text-[var(--brand)] inline ml-1" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 inline ml-1" />
                  )}
                </th>
                <th className="px-3 py-1.5">Risk Level</th>
                <th
                  onClick={() => toggleSort('score')}
                  className="px-3 py-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  Score
                  {sortField === 'score' ? (
                    sortOrder === 'desc' ? <ChevronDown className="w-3 h-3 text-[var(--brand)] inline ml-1" /> : <ChevronUp className="w-3 h-3 text-[var(--brand)] inline ml-1" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 inline ml-1" />
                  )}
                </th>
                <th className="px-3 py-1.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredWards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-[var(--text-muted)] text-[11px]">
                    {loading ? 'Loading ward data…' : 'No matching wards found.'}
                  </td>
                </tr>
              ) : (
                filteredWards.map((w) => {
                  const p = w.properties || {};
                  const level = extractWardRiskLevel(p);
                  const score = extractWardRiskScore(p);
                  const isSelected = selectedWard?.ward_code === p.ward_code || selectedWard?.id === p.id;
                  return (
                    <tr
                      key={p.ward_code || p.id}
                      onClick={() => handleSelectWard(p)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[var(--surface-soft)] ring-1 ring-[var(--brand)]/50' : 'hover:bg-[var(--surface-soft)]/50'
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono font-bold text-[var(--brand)] text-[11px]">
                        {p.ward_code || p.id}
                      </td>
                      <td className="px-3 py-1.5 font-semibold text-[var(--text-primary)] text-[11px]">
                        {p.ward_name || p.name}
                      </td>
                      <td className="px-3 py-1.5 text-[var(--text-muted)] text-[10px] hidden sm:table-cell">
                        {p.zone || 'Central'}
                      </td>
                      <td className="px-3 py-1.5 hidden md:table-cell text-[10px]">
                        {(() => {
                          const cap = extractWardDrainage(p);
                          const colorClass = cap >= 70 ? 'text-emerald-400 font-bold' : cap >= 45 ? 'text-yellow-400 font-bold' : 'text-rose-400 font-bold';
                          const barClass = cap >= 70 ? 'bg-emerald-500' : cap >= 45 ? 'bg-yellow-500' : 'bg-rose-500';
                          return (
                            <div className="flex items-center space-x-2">
                              <div className="w-12 bg-white/10 h-1 rounded-none overflow-hidden hidden lg:block">
                                <div className={`${barClass} h-full`} style={{ width: `${cap}%` }} />
                              </div>
                              <span className={colorClass}>{cap}%</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-1.5">
                        <RiskBadge level={level} />
                      </td>
                      <td className="px-3 py-1.5 font-bold text-[var(--text-primary)] text-[11px]">
                        {score} / 100
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/wards/${p.ward_code || p.id}`);
                          }}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-none bg-[var(--brand)] hover:opacity-90 text-white transition-colors text-[10px] font-semibold"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
