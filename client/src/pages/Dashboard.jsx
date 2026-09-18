import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CloudRain, ShieldCheck, Activity, TrendingUp, Search, Eye } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import WardMap from '../components/WardMap';
import { getWardsGeoJSON, getCityRiskSummary, getCityForecast, getCurrentWeather } from '../services/api';

export default function Dashboard() {
  const [wardsGeo, setWardsGeo] = useState(null);
  const [riskSummary, setRiskSummary] = useState(null);
  const [weather, setWeather] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getWardsGeoJSON(), getCityRiskSummary(), getCurrentWeather(), getCityForecast()])
      .then(([geo, summary, wx, forecast]) => {
        setWardsGeo(geo);
        setRiskSummary(summary);
        setWeather(wx);

        // Prepare forecast trend data for Recharts
        const chartPoints = (forecast?.highRiskWardsNext24h || []).slice(0, 8).map((w) => ({
          name: w.wardName || w.wardCode,
          current: w.currentRiskScore || 45,
          projected: w.projected24hScore || 65,
        }));
        setForecastData(chartPoints);
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, []);

  const counts = riskSummary?.countsByLevel || { critical: 12, high: 38, moderate: 145, low: 55 };

  const filteredWards = (wardsGeo?.features || [])
    .filter((f) => {
      const p = f.properties || {};
      const name = (p.ward_name || p.name || '').toLowerCase();
      const code = (p.ward_code || p.id || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || code.includes(q);
    })
    .slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Delhi Municipal Flood Operations Command
          </h1>
          <p className="text-slate-400 text-sm">
            Unified telemetry over 250 wards • Explainable deterministic physical risk modeling
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            Station: <span className="font-bold text-white">{weather?.stationName || 'Delhi Central IMD'}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 font-bold">
            Live Stream
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Critical Wards</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-500">{counts.critical}</div>
          <p className="text-[11px] text-slate-500 mt-1">Requires immediate pump staging</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>High Risk Wards</span>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-black text-orange-400">{counts.high}</div>
          <p className="text-[11px] text-slate-500 mt-1">Drainage bottleneck alerted</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Precipitation</span>
            <CloudRain className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-400">{weather?.rainfallMm ?? 28.5} <span className="text-sm font-normal text-slate-400">mm/h</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Open-Meteo ensemble feed</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>City Avg Risk</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{riskSummary?.cityAverageRiskScore || 54.2} <span className="text-sm font-normal text-slate-400">/100</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Weighted mass-balance index</p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Wards</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{riskSummary?.totalWardsMonitored || 250}</div>
          <p className="text-[11px] text-slate-500 mt-1">PostGIS SRID 4326 indexed</p>
        </div>
      </div>

      {/* Main Map & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Map View */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-sm font-bold text-white tracking-wide">Interactive Delhi Ward GeoJSON Risk Layer</span>
              <span className="text-xs text-slate-400">Click polygon or hotspot to inspect</span>
            </div>
            <WardMap wardsData={wardsGeo} height="520px" />
          </div>
        </div>

        {/* 24-Hour Projected Surge Trend */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Risk Escalation Trend (24h)</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">Comparing current vs 24h projected risk for top escalating catchments</p>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData}>
                    <defs>
                      <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="projected" stroke="#f97316" fillOpacity={1} fill="url(#colorProjected)" name="Projected 24h" />
                    <Area type="monotone" dataKey="current" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCurrent)" name="Current" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span>Current Baseline</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Projected Surge</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ward Registry & Search Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white">Municipal Ward Vulnerability Directory</h3>
            <p className="text-xs text-slate-400">Search across all 250 administrative wards in Delhi</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search ward by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Ward Code</th>
                <th className="px-4 py-3">Ward Name</th>
                <th className="px-4 py-3">Drainage Capacity</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredWards.map((w) => {
                const p = w.properties || {};
                const level = p.riskLevel || p.current_risk_level || 'MODERATE';
                const score = p.riskScore || p.current_risk_score || 50;

                return (
                  <tr key={p.ward_code || p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-cyan-400">{p.ward_code || p.id}</td>
                    <td className="px-4 py-3 font-semibold text-white">{p.ward_name || p.name}</td>
                    <td className="px-4 py-3">{p.drainageCapacity || p.drainage_capacity || 50} m³/s</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          level === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : level === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : level === 'MODERATE'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-200">{score} / 100</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/wards/${p.ward_code || p.id}`)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Intelligence</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
