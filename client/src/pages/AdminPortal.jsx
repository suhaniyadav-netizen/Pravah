import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Shield, Sliders, History, LogOut, AlertTriangle } from 'lucide-react';
import { login, getAdminOverview, updateDrainageCapacity, getAuditLogs } from '../services/api';

export default function AdminPortal() {
  const [token, setToken] = useState(sessionStorage.getItem('token') || '');

  // Login state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState(null);

  // Control state
  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('W001');
  const [newCapacity, setNewCapacity] = useState(65);
  const [auditLogs, setAuditLogs] = useState([]);
  const [actionSuccess, setActionSuccess] = useState(null);

  const loadAdminData = useCallback(() => {
    getAdminOverview()
      .then((data) => setWards(data.wards || []))
      .catch((err) => console.error(err));

    getAuditLogs()
      .then((data) => setAuditLogs(data.auditLogs || data.logs || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token, loadAdminData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const data = await login({ email: username, password });
      sessionStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (err) {
      setLoginError(err.message || 'Authentication failed. Please check credentials.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken('');
    setCurrentUser(null);
  };

  const handleDrainageUpdate = async (e) => {
    e.preventDefault();
    setActionSuccess(null);
    try {
      const res = await updateDrainageCapacity({
        wardId: selectedWardId,
        drainageCapacity: parseInt(newCapacity, 10),
        reason: 'Authorized municipal desilting adjustment',
      });
      setActionSuccess(`Drainage capacity for ${selectedWardId} updated to ${res.drainageCapacity || newCapacity} m³/s! Logged to audit trail.`);
      loadAdminData();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-4 page-enter">
        <div className="w-full max-w-md glass-panel border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white text-center mb-1">MCD Command Authentication</h2>
          <p className="text-xs text-slate-400 text-center mb-6">Restricted administrative access (RBAC Enforced)</p>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/20 transition-all"
            >
              Sign In to Command Center
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Demo Credentials: <span className="text-slate-300 font-mono">admin</span> / <span className="text-slate-300 font-mono">admin123</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4" />
            <span>Administrative Control & Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Security & Infrastructure Console</h1>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 text-xs font-bold flex items-center space-x-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Drainage Update Form */}
        <div className="lg:col-span-5 glass-panel border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Adjust Ward Drainage Capacity</h3>
          </div>

          <form onSubmit={handleDrainageUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Ward
              </label>
              <select
                value={selectedWardId}
                onChange={(e) => setSelectedWardId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
              >
                {wards.map((w) => (
                  <option key={w.id || w.wardCode} value={w.id || w.wardCode}>
                    {w.wardName || w.name} ({w.wardCode || w.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>New Drainage Capacity</span>
                <span className="text-cyan-400 font-bold">{newCapacity} m³/s</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="w-full accent-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              Update Capacity & Record Audit Log
            </button>
          </form>
        </div>

        {/* Security Audit Trail */}
        <div className="lg:col-span-7 glass-panel border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-800">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Immutable Administrative Audit Log</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500">No audit events recorded yet.</td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 6).map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td className="px-3 py-2.5 font-bold text-cyan-400">{log.action}</td>
                      <td className="px-3 py-2.5">{log.resource || log.targetId || 'Ward W001'}</td>
                      <td className="px-3 py-2.5 text-slate-400">{log.userEmail || log.actorEmail || 'Admin'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
