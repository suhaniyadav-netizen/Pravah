import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, Sparkles, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { runSimulation, getSimulationPresets, getWardsGeoJSON } from '../services/api';

export default function Simulator() {
  const [wards, setWards] = useState([]);
  const [presets, setPresets] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('W001');
  const [additionalPumps, setAdditionalPumps] = useState(2);
  const [rainfallMm, setRainfallMm] = useState(30);
  const [drainageModifier, setDrainageModifier] = useState(20);
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const executeSimulation = useCallback((wardId, pumps, rain, drain) => {
    setLoading(true);
    runSimulation({
      wardId,
      additionalMobilePumps: parseInt(pumps, 10),
      simulatedRainfallMm: parseFloat(rain),
      drainageModifierPct: parseFloat(drain),
    })
      .then((res) => setSimulationResult(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getWardsGeoJSON()
      .then((data) => {
        const sorted = (data.features || []).map((f) => f.properties).sort((a, b) =>
          (a.ward_name || a.name || '').localeCompare(b.ward_name || b.name || '')
        );
        setWards(sorted);
      })
      .catch((err) => console.error(err));

    getSimulationPresets()
      .then((data) => setPresets(data.presets || []))
      .catch((err) => console.error(err));

    // Run initial baseline simulation
    executeSimulation('W001', 2, 30, 20);
  }, [executeSimulation]);

  const handleRun = (e) => {
    e.preventDefault();
    executeSimulation(selectedWardId, additionalPumps, rainfallMm, drainageModifier);
  };

  const applyPreset = (preset) => {
    if (preset.interventions) {
      const p = preset.interventions;
      setAdditionalPumps(p.additionalMobilePumps || 0);
      setRainfallMm(p.simulatedRainfallMm || 30);
      setDrainageModifier(p.drainageModifierPct || 0);
      executeSimulation(selectedWardId, p.additionalMobilePumps || 0, p.simulatedRainfallMm || 30, p.drainageModifierPct || 0);
    }
  };

  const comparisonData = simulationResult?.comparison ? [
    {
      metric: 'Composite Risk',
      Baseline: simulationResult.comparison.baseline?.riskScore || 65,
      Simulated: simulationResult.comparison.simulated?.riskScore || 52,
    },
    {
      metric: 'Drainage Deficit',
      Baseline: simulationResult.comparison.baseline?.components?.drainageDeficitScore || 50,
      Simulated: simulationResult.comparison.simulated?.components?.drainageDeficitScore || 35,
    },
    {
      metric: 'Rainfall Surge',
      Baseline: simulationResult.comparison.baseline?.components?.rainfallSurgeScore || 45,
      Simulated: simulationResult.comparison.simulated?.components?.rainfallSurgeScore || 45,
    }
  ] : [];

  const deltas = simulationResult?.comparison?.deltas || { riskScore: -13.0, drainageDeficit: -15.0 };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 page-enter">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sliders className="w-4 h-4" />
          <span>Hydrological Digital Twin</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">What-If Flood Scenario Simulator</h1>
        <p className="text-slate-400 text-sm">
          Stress-test high-capacity pump deployments, cloudburst precipitation, and desilting modifiers before executing physical municipal interventions.
        </p>
      </div>

      {/* Preset Buttons */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scenario Presets:</span>
          {presets.map((pr) => (
            <button
              key={pr.id}
              onClick={() => applyPreset(pr)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{pr.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Simulation Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 glass-panel border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4 pb-3 border-b border-slate-800">
            Intervention Configuration
          </h2>

          <form onSubmit={handleRun} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Target Catchment Ward
              </label>
              <select
                value={selectedWardId}
                onChange={(e) => setSelectedWardId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
              >
                {wards.map((w) => (
                  <option key={w.ward_code || w.id} value={w.ward_code || w.id}>
                    {w.ward_name || w.name} ({w.ward_code || w.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Deploy Mobile High-Capacity Pumps</span>
                <span className="text-cyan-400 font-bold">+{additionalPumps} Pumps ({(additionalPumps * 15)} m³/s)</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={additionalPumps}
                onChange={(e) => setAdditionalPumps(e.target.value)}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Simulated Cloudburst Rainfall</span>
                <span className="text-cyan-400 font-bold">{rainfallMm} mm/h</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={rainfallMm}
                onChange={(e) => setRainfallMm(e.target.value)}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Desilting & Sump Clearance Modifier</span>
                <span className="text-cyan-400 font-bold">+{drainageModifier}%</span>
              </div>
              <input
                type="range"
                min="-30"
                max="80"
                step="5"
                value={drainageModifier}
                onChange={(e) => setDrainageModifier(e.target.value)}
                className="w-full accent-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Compute Hydrological Delta (Δ Risk)</span>
            </button>
          </form>
        </div>

        {/* Results & Delta Cards Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Delta Metrics Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl shadow-lg">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Risk Reduction (Δ Risk)</div>
              <div className="flex items-center space-x-2">
                <div className="text-3xl font-black text-emerald-400">
                  {deltas.riskScore > 0 ? `+${deltas.riskScore}` : deltas.riskScore}
                </div>
                <span className="text-xs text-emerald-400 font-bold">pts</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Direct result of pump staging</p>
            </div>

            <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl shadow-lg">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Est. Deployment Cost</div>
              <div className="text-3xl font-black text-white">
                ₹{simulationResult?.feasibility?.estimatedCostRupees ? (simulationResult.feasibility.estimatedCostRupees).toLocaleString() : '30,000'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Pumps, fuel, and field personnel</p>
            </div>
          </div>

          {/* Recharts Comparison Chart */}
          <div className="glass-panel border border-slate-800/80 p-6 rounded-2xl shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Baseline vs Simulated Risk Decomposition
            </h3>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Baseline"  fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Simulated" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
