import React, { useState, useEffect } from 'react';
import { Waves, AlertTriangle, Send, MapPin, CheckCircle, Clock, Shield } from 'lucide-react';
import { submitComplaint, listComplaints, getWardsGeoJSON } from '../services/api';
import { subscribeToTelemetry } from '../services/socket';

export default function CitizenPortal() {
  const [wards, setWards] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [formData, setFormData] = useState({
    wardId: 'W001',
    address: '',
    description: '',
    severity: 'MEDIUM',
    waterDepthCm: 30,
    latitude: 28.840484,
    longitude: 77.094594,
  });

  useEffect(() => {
    // Load wards for dropdown
    getWardsGeoJSON()
      .then((data) => {
        const sorted = (data.features || []).map((f) => f.properties).sort((a, b) =>
          (a.ward_name || a.name || '').localeCompare(b.ward_name || b.name || '')
        );
        setWards(sorted);
      })
      .catch((err) => console.error(err));

    // Load recent complaints
    listComplaints({ limit: 6 })
      .then((data) => setRecentComplaints(data.complaints || []))
      .catch((err) => console.error(err));

    // Subscribe to live complaints via Socket.IO
    const unsubscribe = subscribeToTelemetry('complaint:new', (newComplaint) => {
      setRecentComplaints((prev) => [newComplaint, ...prev.slice(0, 5)]);
    });

    return () => unsubscribe();
  }, []);

  const handleWardChange = (e) => {
    const code = e.target.value;
    const selected = wards.find((w) => w.ward_code === code || w.id === code);
    if (selected && selected.centroid) {
      setFormData((prev) => ({
        ...prev,
        wardId: code,
        latitude: selected.centroid.latitude,
        longitude: selected.centroid.longitude,
      }));
    } else {
      setFormData((prev) => ({ ...prev, wardId: code }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await submitComplaint({
        longitude: formData.longitude,
        latitude: formData.latitude,
        address: formData.address,
        description: formData.description,
        severity: formData.severity,
        waterDepthCm: parseFloat(formData.waterDepthCm),
      });

      setSuccessMsg(`Waterlogging report lodged successfully! Tracked under Ward ${res.complaint?.assignedWard?.wardCode || formData.wardId}.`);
      setFormData({
        wardId: formData.wardId,
        address: '',
        description: '',
        severity: 'MEDIUM',
        waterDepthCm: 30,
        latitude: formData.latitude,
        longitude: formData.longitude,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Shield className="w-4 h-4" />
          <span>Delhi Municipal Citizen Portal</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Report Waterlogging in Your Ward
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Direct civic telemetry feeds instantly into MCD emergency dispatch pipelines, triggering physical pump deployments and alert broadcasts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Container */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Geotagged Waterlogging Incident Form</h2>
              <p className="text-xs text-slate-400">Mapped via PostGIS Point-in-Polygon directly to municipal teams</p>
            </div>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Select Municipal Ward
              </label>
              <select
                value={formData.wardId}
                onChange={handleWardChange}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                {wards.map((w) => (
                  <option key={w.ward_code || w.id} value={w.ward_code || w.id}>
                    {w.ward_name || w.name} ({w.ward_code || w.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Specific Location / Landmark
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Near Metro Gate 3, Ring Road Underpass"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Severity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setFormData({ ...formData, severity: lvl })}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        formData.severity === lvl
                          ? lvl === 'HIGH'
                            ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                            : lvl === 'MEDIUM'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex justify-between">
                  <span>Estimated Water Depth</span>
                  <span className="text-cyan-400 font-bold">{formData.waterDepthCm} cm</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={formData.waterDepthCm}
                  onChange={(e) => setFormData({ ...formData, waterDepthCm: e.target.value })}
                  className="w-full accent-cyan-500 mt-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Problem Description
              </label>
              <textarea
                rows="3"
                required
                minLength="5"
                placeholder="Describe standing water, blocked drains, or trapped vehicles..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Lodging Incident...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Waterlogging Report</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Feed Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Municipal Feed</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold animate-pulse">
                Socket Active
              </span>
            </div>

            <div className="space-y-3">
              {recentComplaints.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No recent incidents reported.</div>
              ) : (
                recentComplaints.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Ward {item.wardId || 'W001'}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.severity === 'HIGH' || item.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400'
                            : item.severity === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 mb-2">{item.description || item.address}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Depth: {item.waterDepthCm || 0} cm</span>
                      <span>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Just now'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
