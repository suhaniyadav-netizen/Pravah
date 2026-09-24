import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, MapPin, Send } from 'lucide-react';
import { listIncidents, listResponseTeams, getCityTacticalPlan, dispatchResponseTeam } from '../services/api';
import { subscribeToTelemetry } from '../services/socket';

export default function IncidentCommand() {
  const [incidents, setIncidents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tacticalPlan, setTacticalPlan] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState(null);

  const loadData = useCallback(() => {
    Promise.all([
      listIncidents().catch(() => ({ incidents: [] })),
      listResponseTeams().catch(() => ({ teams: [] })),
      getCityTacticalPlan().catch(() => null),
    ])
      .then(([incData, teamData, plan]) => {
        setIncidents(incData.incidents || []);
        setTeams(teamData.teams || []);
        setTacticalPlan(plan?.topActionPlan || plan?.cityTacticalRoadmap?.topInterventions || plan?.cityTacticalRoadmap || null);
      });
  }, []);

  useEffect(() => {
    loadData();

    // Telemetry subscriptions
    const unsubs = [
      subscribeToTelemetry('incident:created', (inc) => setIncidents((prev) => [inc, ...prev])),
      subscribeToTelemetry('incident:updated', () => loadData()),
      subscribeToTelemetry('dispatch:assigned', () => loadData()),
    ];

    return () => unsubs.forEach((fn) => fn && fn());
  }, [loadData]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!selectedIncident || !selectedTeamId) return;

    try {
      await dispatchResponseTeam({
        teamId: selectedTeamId,
        incidentId: selectedIncident.id,
        equipmentType: 'MOBILE_PUMP_150',
      });
      setDispatchStatus('Response team dispatched successfully!');
      setSelectedIncident(null);
      setSelectedTeamId('');
      loadData();
    } catch (err) {
      setDispatchStatus(`Dispatch error: ${err.message}`);
    }
  };

  const roadmapItems = Array.isArray(tacticalPlan)
    ? tacticalPlan
    : (tacticalPlan?.topInterventions || tacticalPlan?.topActionPlan || []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 page-enter">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Emergency Operational Center</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif text-[var(--text-primary)] tracking-tight">Incident Command & Response Dispatch</h1>
        <p className="text-[var(--text-muted)] text-xs mt-1 font-sans">
          Coordinate field response teams, mobile submersible pumps, and road closures across active waterlogging sites.
        </p>
      </div>

      {dispatchStatus && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between">
          <span>{dispatchStatus}</span>
          <button onClick={() => setDispatchStatus(null)} className="text-emerald-400 hover:text-white font-bold">×</button>
        </div>
      )}

      {/* Top Tactical Actions Roadmap */}
      {roadmapItems.length > 0 && (
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Citywide Tactical Roadmap ("What Should the City Do Now?")</h2>
              <p className="text-xs text-slate-400">Ranked by risk reduction impact and resource feasibility</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {roadmapItems.length} Interventions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roadmapItems.slice(0, 3).map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between glass-hover transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-cyan-400">Ward {item.wardCode}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                      Rank #{idx + 1}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 mb-3">{item.description || item.reason}</p>
                </div>
                <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 flex justify-between">
                  <span>Impact: +{item.expectedEffect?.projectedRiskScoreReduction || item.estimatedImpact?.riskReductionPoints || 15} pts</span>
                  <span>Est Cost: ₹{item.feasibility?.estimatedCostRupees || '15,000'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Incidents & Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Active Incidents List */}
        <div className="lg:col-span-7 glass-panel border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Active Operational Incidents</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
              {incidents.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {incidents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">No active flood incidents logged.</div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedIncident?.id === inc.id
                      ? 'bg-slate-800 border-cyan-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => setSelectedIncident(inc)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ward {inc.wardId || inc.ward?.wardCode || 'W001'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">{inc.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Depth: <b>{inc.waterDepthCm || 35} cm</b></span>
                    <span>Status: <b className="text-amber-400">{inc.status || 'ACTIVE'}</b></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dispatch Action Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-2">Emergency Dispatch Console</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select an incident from the left and allocate a certified municipal emergency team.
            </p>

            {selectedIncident ? (
              <form onSubmit={handleDispatch} className="space-y-4">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div className="text-slate-400 mb-1">Target Incident:</div>
                  <div className="font-bold text-white">{selectedIncident.description}</div>
                  <div className="text-cyan-400 mt-1">Ward {selectedIncident.wardId} • Depth {selectedIncident.waterDepthCm || 35} cm</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Available Response Teams
                  </label>
                  <select
                    required
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select Response Team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status || 'AVAILABLE'})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Response Team & Equipment</span>
                </button>
              </form>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                Select an incident above to mobilize dispatch units.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
