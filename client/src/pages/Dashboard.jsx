import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CloudRain, ShieldCheck, Activity, TrendingUp,
  Search, Eye, RefreshCw, X, ArrowRight, MapPin,
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

/** Reusable risk badge using CSS classes from index.css */
function RiskBadge({ level }) {
  const normalized = String(level || '').toUpperCase().trim();
  const cls = {
    CRITICAL: 'risk-critical',
    HIGH:     'risk-high',
    MODERATE: 'risk-moderate',
    MEDIUM:   'risk-moderate',
    LOW:      'risk-low',
  }[normalized] || 'risk-moderate';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {normalized || 'MODERATE'}
    </span>
  );
}

export default function Dashboard() {
  const [wardsGeo,    setWardsGeo]    = useState(null);
  const [riskSummary, setRiskSummary] = useState(null);
  const [weather,     setWeather]     = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading,     setLoading]     = useState(true);
  const [mapError,    setMapError]    = useState(null);
  const [selectedWard,  setSelectedWard]  = useState(null);
  const [wardDetails,   setWardDetails]   = useState(null);
  const [loadingWard,   setLoadingWard]   = useState(false);
  const navigate = useNavigate();

  /**
   * FIX: Use Promise.allSettled so a failed weather/forecast call
   * does NOT prevent the map and risk summary from loading.
   */
  const loadData = useCallback(() => {
    setLoading(true);
    setMapError(null);

    Promise.allSettled([
      getWardsGeoJSON(),
      getCityRiskSummary(),
      getCurrentWeather(),
      getCityForecast(),
    ]).then(([geoRes, summaryRes, wxRes, forecastRes]) => {

      // Map data — critical; expose error state if unavailable
      if (geoRes.status === 'fulfilled') {
        setWardsGeo(geoRes.value);
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
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /** Fetch ward risk details when a ward is selected from the map */
  const handleSelectWard = useCallback((properties) => {
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

  const counts = riskSummary?.countsByLevel || { critical: 0, high: 0, moderate: 0, low: 0 };

  const filteredWards = (wardsGeo?.features || [])
    .filter((f) => {
      const p = f.properties || {};
      const name = (p.ward_name || p.name || '').toLowerCase();
      const code = (p.ward_code || p.id || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return !q || name.includes(q) || code.includes(q);
    })
    .slice(0, 12);

  const kpiCards = [
    { label: 'Critical Wards',  value: counts.critical ?? 0,
      unit: '', icon: AlertCircle, color: 'rose',    sub: 'Immediate pump staging' },
    { label: 'High Risk',       value: counts.high ?? 0,
      unit: '', icon: AlertCircle, color: 'orange',  sub: 'Drainage bottleneck' },
    { label: 'Precipitation',   value: weather?.rainfallMm != null ? weather.rainfallMm : '—',
      unit: 'mm/h', icon: CloudRain, color: 'cyan', sub: 'Open-Meteo feed' },
    { label: 'City Avg Risk',   value: riskSummary?.cityAverageRiskScore != null
      ? parseFloat(riskSummary.cityAverageRiskScore).toFixed(1) : '—',
      unit: '/100', icon: Activity, color: 'amber',  sub: 'Mass-balance index' },
    { label: 'Total Wards',     value: riskSummary?.totalWardsMonitored ?? 250,
      unit: '', icon: ShieldCheck, color: 'emerald', sub: 'PostGIS SRID 4326' },
  ];

  const palette = {
    rose:    { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    hover: 'hover:border-rose-500/40'    },
    orange:  { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  hover: 'hover:border-orange-500/40'  },
    cyan:    { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    hover: 'hover:border-cyan-500/40'    },
    amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   hover: 'hover:border-amber-500/40'   },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/40' },
  };

  const evalData = wardDetails?.evaluation;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 page-enter">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>MCD Unified Command &amp; Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight"
              style={{ fontFamily: "'Poppins','Inter',sans-serif" }}>
            Delhi Flood Operations Command
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time telemetry · 250 wards · Deterministic mass-balance risk model
          </p>
        </div>
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          {weather && (
            <div className="px-3 py-1.5 rounded-xl glass-panel text-[11px] text-slate-300 flex items-center space-x-1.5">
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-500">Precip:</span>
              <span className="font-bold text-cyan-400">{weather.rainfallMm ?? 0} mm/h</span>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-[11px] text-cyan-300 font-bold flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Telemetry Live</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const c    = palette[card.color];
          return (
            <div
              key={card.label}
              className={`glass-panel glass-hover p-4 sm:p-5 rounded-2xl ${c.hover} transition-all`}
            >
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                <span>{card.label}</span>
                <div className={`p-1.5 rounded-lg ${c.bg} border ${c.border} ${c.text}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className={`text-3xl sm:text-4xl font-black ${c.text} stat-live`}>
                {card.value}
                {card.unit && (
                  <span className="text-sm font-normal text-slate-400 ml-1">{card.unit}</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Map + Ward Panel ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Map */}
        <div className="lg:col-span-8">
          <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[13px] font-bold text-white">Interactive Ward Risk Map</span>
                {loading && !mapError && (
                  <span className="text-[11px] text-slate-500 ml-1">Loading…</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {mapError && (
                  <button
                    onClick={loadData}
                    className="flex items-center space-x-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
                <span className="text-[11px] text-slate-500 hidden sm:inline">Click ward to inspect</span>
              </div>
            </div>

            {mapError ? (
              <div className="flex flex-col items-center justify-center h-[480px] text-slate-400 space-y-4">
                <AlertCircle className="w-9 h-9 text-rose-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-white mb-1">Map data unavailable</p>
                  <p className="text-xs text-slate-500 max-w-xs">{mapError}</p>
                </div>
                <button
                  onClick={loadData}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white text-xs font-bold transition-all border border-cyan-600/30"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Loading Map</span>
                </button>
              </div>
            ) : (
              <WardMap
                wardsData={wardsGeo}
                selectedWardId={selectedWard?.ward_code || selectedWard?.id}
                onSelectWard={handleSelectWard}
                height="480px"
              />
            )}
          </div>
        </div>

        {/* Ward Intelligence Panel */}
        <div className="lg:col-span-4">
          {selectedWard ? (
            <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 h-full flex flex-col">
              {/* Panel header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Ward Intelligence</div>
                  <h3 className="text-base font-black text-white leading-tight">
                    {selectedWard.ward_name || selectedWard.name || `Ward ${selectedWard.ward_code || selectedWard.id}`}
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-400">
                    {selectedWard.ward_code || selectedWard.id}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedWard(null); setWardDetails(null); }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingWard ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {/* Risk Score */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Composite Risk Score</div>
                    <div className="flex items-end justify-between">
                      <div className="text-4xl font-black text-white">
                        {evalData?.riskScore
                          ?? selectedWard.riskScore
                          ?? selectedWard.current_risk_score
                          ?? '—'}
                        <span className="text-sm font-normal text-slate-500 ml-1">/ 100</span>
                      </div>
                      <RiskBadge
                        level={
                          evalData?.riskLevel
                          || selectedWard.riskLevel
                          || selectedWard.current_risk_level
                          || 'MODERATE'
                        }
                      />
                    </div>
                  </div>

                  {/* Risk factor bars */}
                  {evalData?.components && (
                    <div className="space-y-2.5">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">Main Drivers</div>
                      {[
                        { label: 'Drainage Deficit', score: evalData.components.drainageDeficitScore, bar: 'bg-blue-500' },
                        { label: 'Rainfall Surge',   score: evalData.components.rainfallSurgeScore,   bar: 'bg-cyan-500' },
                        { label: 'Citizen Urgency',  score: evalData.components.complaintScore,        bar: 'bg-amber-500' },
                      ].map((f) => (
                        <div key={f.label}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">{f.label}</span>
                            <span className="text-white font-bold">{typeof f.score === 'number' ? f.score.toFixed(1) : '—'}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div
                              className={`${f.bar} h-1.5 rounded-full transition-all`}
                              style={{ width: `${Math.min(f.score || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: 'Drainage',
                        value: `${selectedWard.drainageCapacity ?? selectedWard.drainage_capacity ?? '—'}`,
                        unit: 'm³/s',
                      },
                      {
                        label: 'Rainfall',
                        value: `${selectedWard.rainfall ?? '28.5'}`,
                        unit: 'mm',
                      },
                    ].map((s) => (
                      <div key={s.label} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
                        <div className="text-sm font-black text-white">
                          {s.value}
                          <span className="text-[10px] font-normal text-slate-500 ml-0.5">{s.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommended action */}
                  <div className="p-3 rounded-xl border border-amber-500/18 bg-amber-500/5">
                    <div className="text-[10px] text-amber-400 font-bold mb-1 uppercase tracking-wider">Recommended Action</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {(() => {
                        const lvl = String(evalData?.riskLevel || selectedWard?.riskLevel || 'MODERATE').toUpperCase();
                        if (lvl === 'CRITICAL') return 'Deploy emergency response immediately. Coordinate pump staging and road closures.';
                        if (lvl === 'HIGH')     return 'Inspect drainage network. Dispatch response team and pre-stage mobile pumps.';
                        if (lvl === 'MODERATE') return 'Increase patrol frequency. Monitor drainage and complaint volume.';
                        return 'Continue standard monitoring. No immediate intervention required.';
                      })()}
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => navigate(`/wards/${selectedWard.ward_code || selectedWard.id}`)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600 border border-cyan-600/25 hover:border-cyan-600 text-cyan-400 hover:text-white font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Full Ward Intelligence Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Default: 24h trend chart */
            <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 h-full flex flex-col">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">
                  Risk Escalation Trend (24h)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">
                Click a ward polygon on the map to view its intelligence report.
              </p>

              {forecastData.length > 0 ? (
                <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData}>
                      <defs>
                        <linearGradient id="cgProjected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f97316" stopOpacity={0.75} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="cgCurrent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.75} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#475569" domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Area type="monotone" dataKey="projected" stroke="#f97316" fillOpacity={1} fill="url(#cgProjected)" name="Projected 24h" />
                      <Area type="monotone" dataKey="current"   stroke="#0ea5e9" fillOpacity={1} fill="url(#cgCurrent)"   name="Current" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-slate-600">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-[11px]">Click a ward to view intelligence</p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 mt-4 text-[11px] text-slate-500 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>Current</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Projected 24h</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Ward Directory Table ─────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Municipal Ward Vulnerability Directory</h3>
            <p className="text-[11px] text-slate-500">Search across all 250 administrative wards in Delhi</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search ward name or code…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark pl-10 text-xs py-2.5"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-800/80 text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Ward Name</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Drainage</th>
                <th className="px-4 py-2.5">Risk Level</th>
                <th className="px-4 py-2.5">Score</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredWards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                    {loading ? 'Loading ward data…' : 'No matching wards found.'}
                  </td>
                </tr>
              ) : (
                filteredWards.map((w) => {
                  const p = w.properties || {};
                  const level = String(p.riskLevel || p.current_risk_level || 'MODERATE').toUpperCase();
                  const score = p.riskScore ?? p.current_risk_score ?? 50;
                  return (
                    <tr
                      key={p.ward_code || p.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400 text-[11px]">
                        {p.ward_code || p.id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{p.ward_name || p.name}</td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                        {p.drainageCapacity ?? p.drainage_capacity ?? 50} m³/s
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={level} />
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-200">{score} / 100</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/wards/${p.ward_code || p.id}`)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-600/15 hover:bg-cyan-600 text-cyan-400 hover:text-white transition-colors text-[11px] font-semibold"
                        >
                          <Eye className="w-3 h-3" />
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
