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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter space-y-10">
      {/* Hero Section */}
      <div className="relative text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider shadow-sm">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Municipal Corporation of Delhi • Citizen Incident Desk</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Report Waterlogging in Your Ward
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Geotagged reports feed directly into the MCD emergency operations center via PostGIS spatial containment, routing mobile pumps and emergency response teams to vulnerable underpasses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Container */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/80">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800/80">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Geotagged Waterlogging Incident Form</h2>
              <p className="text-xs text-slate-400">SRID 4326 Point-in-Polygon mapped to 250 municipal ward polygons</p>
            </div>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:via-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Lodging Incident Telemetry...</span>
                </span>
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
          <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Live Municipal Civic Feed</h3>
                  <p className="text-[11px] text-slate-400">Real-time telemetry stream</p>
                </div>
              </div>
              <span className="flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Socket Live</span>
              </span>
            </div>

            <div className="space-y-3.5">
              {recentComplaints.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">No recent incidents reported.</div>
              ) : (
                recentComplaints.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/60 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Ward {item.wardId || 'W001'}</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.severity === 'HIGH' || item.severity === 'CRITICAL'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : item.severity === 'MEDIUM'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 mb-2.5 leading-relaxed">{item.description || item.address}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/50">
                      <span>Water Depth: <b className="text-cyan-400">{item.waterDepthCm || 0} cm</b></span>
                      <span className="font-mono text-slate-500">{item.createdAt || item.timestamp ? new Date(item.createdAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
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
