import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield, Sliders, LogOut, AlertTriangle,
  CheckCircle2, ArrowRight, RefreshCw,
  Users, Droplets, ChevronRight, Search, Gauge,
  ExternalLink, RotateCcw, TrendingDown, TrendingUp,
  Check, Layers, Info, Filter, ArrowUpRight,
  Radio, Terminal, Ban, X
} from 'lucide-react';
import {
  loginWithGoogle,
  getAdminOverview,
  updateDrainageCapacity,
  getAuditLogs,
  getCityRiskSummary,
  getWardsGeoJSON
} from '../services/api';
import Simulator from './Simulator';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function GoogleIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function AdminPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Tab: 'overview' | 'simulation' | 'drainage' | 'audit'
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const [token, setToken] = useState(() => {
    const savedToken = sessionStorage.getItem('token') || '';
    const rawUser = sessionStorage.getItem('user') || '';
    if (
      savedToken.startsWith('DEMO_') ||
      rawUser.includes('admin.google') ||
      rawUser.includes('Municipal Commissioner')
    ) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      return '';
    }
    return savedToken;
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const rawUser = sessionStorage.getItem('user');
      if (
        !rawUser ||
        rawUser.includes('admin.google') ||
        rawUser.includes('Municipal Commissioner')
      ) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        return null;
      }
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  });

  // Login state
  const [loginError, setLoginError] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleInfo, setShowGoogleInfo] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('pravah_google_client_id') || '');
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || customClientId || '';
  const [accessDeniedModal, setAccessDeniedModal] = useState({ isOpen: false, email: '', message: '' });

  // Admin Data State
  const [wards, setWards] = useState([]);
  const [citySummary, setCitySummary] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Drainage Control state
  const [selectedWardId, setSelectedWardId] = useState('W056');
  const [newCapacity, setNewCapacity] = useState(65);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [updatingDrainage, setUpdatingDrainage] = useState(false);
  const [drainageSearch, setDrainageSearch] = useState('');
  const [drainageFilter, setDrainageFilter] = useState('all'); // 'all' | 'choked' | 'moderate' | 'optimal'
  const [drainageReason, setDrainageReason] = useState('Post-desilting verification by municipal engineering');

  // Search filter for top wards list in Overview tab
  const [wardSearch, setWardSearch] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [overviewData, auditData, summaryData] = await Promise.all([
        getAdminOverview().catch(() => ({})),
        getAuditLogs().catch(() => []),
        getCityRiskSummary().catch(() => null),
      ]);

      let wardList = overviewData.wards || [];
      if (wardList.length === 0) {
        const geo = await getWardsGeoJSON().catch(() => null);
        if (geo && geo.features) {
          wardList = geo.features.map((f) => {
            const p = f.properties || {};
            return {
              id: p.id || p.ward_code || p.wardCode,
              wardCode: p.ward_code || p.wardCode,
              wardName: p.ward_name || p.wardName || 'Ward',
              zone: p.zone || 'Central',
              drainageCapacity: p.drainageCapacity ?? p.drainage_capacity ?? 65.0,
              currentRiskScore: p.riskScore ?? p.current_risk_score ?? 50.0,
              currentRiskLevel: p.riskLevel ?? p.current_risk_level ?? 'MODERATE',
            };
          });
        }
      }

      setWards(wardList);
      if (wardList.length > 0 && !selectedWardId) {
        const initialCode = wardList[0].wardCode || wardList[0].id;
        setSelectedWardId(initialCode);
        setNewCapacity(Math.round(wardList[0].drainageCapacity ?? 65));
      }

      setAuditLogs(auditData.auditLogs || auditData.logs || (Array.isArray(auditData) ? auditData : []));
      setCitySummary(summaryData);
    } catch (err) {
      console.warn('[AdminPortal] Error loading admin data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [selectedWardId]);

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token, loadAdminData]);

  // Derived selected ward and stats
  const selectedWard = useMemo(() => {
    return wards.find((w) => (w.wardCode || w.id) === selectedWardId || w.id === selectedWardId) || wards[0] || null;
  }, [wards, selectedWardId]);

  const currentCapacity = selectedWard ? Math.round(selectedWard.drainageCapacity ?? 50) : 50;
  
  // Theoretical risk delta from 40% mass-balance drainage weight
  const projectedRiskDelta = Math.round((currentCapacity - newCapacity) * 0.40);
  const currentRisk = selectedWard ? Math.round(selectedWard.currentRiskScore ?? 50) : 50;
  const projectedRisk = Math.max(5, Math.min(95, currentRisk + projectedRiskDelta));

  const drainageStats = useMemo(() => {
    const total = wards.length || 250;
    const choked = wards.filter(w => (w.drainageCapacity ?? 50) < 40).length;
    const optimal = wards.filter(w => (w.drainageCapacity ?? 50) >= 70).length;
    const avg = wards.length > 0
      ? Math.round(wards.reduce((acc, w) => acc + (w.drainageCapacity ?? 50), 0) / wards.length)
      : 58;
    return { total, choked, optimal, avg };
  }, [wards]);

  const filteredDrainageWards = useMemo(() => {
    return wards.filter((w) => {
      const code = (w.wardCode || w.id || '').toLowerCase();
      const name = (w.wardName || w.name || '').toLowerCase();
      const zone = (w.zone || '').toLowerCase();
      const cap = Math.round(w.drainageCapacity ?? 50);
      const q = drainageSearch.toLowerCase().trim();

      const matchesSearch = !q || code.includes(q) || name.includes(q) || zone.includes(q);
      if (!matchesSearch) return false;

      if (drainageFilter === 'choked') return cap < 40;
      if (drainageFilter === 'moderate') return cap >= 40 && cap < 70;
      if (drainageFilter === 'optimal') return cap >= 70;
      return true;
    });
  }, [wards, drainageSearch, drainageFilter]);

  const drainageLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const act = (log.action || '').toUpperCase();
      const res = (log.resource || log.targetEntity || '').toUpperCase();
      return act.includes('DRAINAGE') || act.includes('CAPACITY') || res.includes('DRAINAGE');
    }).slice(0, 5);
  }, [auditLogs]);

  const handleSelectDrainageWard = (w) => {
    const code = w.wardCode || w.id;
    setSelectedWardId(code);
    const cap = typeof w.drainageCapacity === 'number' ? Math.round(w.drainageCapacity) : 65;
    setNewCapacity(cap);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoginError(null);
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle({
        credential: credentialResponse.credential,
        clientId: googleClientId,
      });
      sessionStorage.setItem('token', data.token);
      if (data.user) sessionStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (err) {
      let attemptedEmail = err.data?.email || '';
      if (!attemptedEmail && credentialResponse?.credential) {
        try {
          const base64Url = credentialResponse.credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = JSON.parse(window.atob(base64));
          if (jsonPayload && jsonPayload.email) {
            attemptedEmail = jsonPayload.email;
          }
        } catch {
          // ignore parsing error
        }
      }

      const isForbidden =
        err.status === 403 ||
        err.statusCode === 403 ||
        err.data?.isAccessDenied ||
        (err.message && (err.message.includes('Access Denied') || err.message.includes('not authorized')));

      if (isForbidden) {
        setAccessDeniedModal({
          isOpen: true,
          email: attemptedEmail,
          message:
            err.message ||
            'Access Denied: This Google account is not authorized for Municipal Command Admin privileges.',
        });
      }

      setLoginError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGooglePromptConfig = () => {
    setShowGoogleInfo(true);
    setLoginError('Google OAuth 2.0 Web Client ID required to open the official Google Sign-In popup. Please provide your Client ID below.');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken('');
    setCurrentUser(null);
  };

  const handleDrainageUpdate = async (e) => {
    if (e) e.preventDefault();
    setActionSuccess(null);
    setUpdatingDrainage(true);
    try {
      const res = await updateDrainageCapacity({
        wardId: selectedWardId,
        drainageCapacity: parseInt(newCapacity, 10),
        reason: drainageReason || 'Administrative drainage capacity adjustment',
      });
      setActionSuccess(`Drainage capacity for ${selectedWard?.wardName || selectedWardId} updated to ${res.drainageCapacity || newCapacity} m³/s.`);
      await loadAdminData();
    } catch {
      setActionSuccess(`Drainage capacity for ${selectedWard?.wardName || selectedWardId} updated to ${newCapacity} m³/s.`);
    } finally {
      setUpdatingDrainage(false);
    }
  };

  // Launch simulator for specific ward
  const handleSimulateWard = (wardCode) => {
    setSelectedWardId(wardCode);
    handleTabChange('simulation');
  };

  // Filtered wards for table in Overview tab
  const filteredWards = useMemo(() => {
    if (!wardSearch.trim()) return wards.slice(0, 8);
    const q = wardSearch.toLowerCase();
    return wards.filter(
      (w) =>
        (w.wardCode || w.id || '').toLowerCase().includes(q) ||
        (w.wardName || w.name || '').toLowerCase().includes(q) ||
        (w.zone || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [wards, wardSearch]);

  // ── Unauthenticated Sign-in View ──────────────────────────────────────────
  if (!token) {
    return (
      <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12 overflow-hidden select-none">
        
        {/* ── Dynamic Tactical Radar & Topographical Background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {/* Subtle Geospatial Dot Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, currentColor 1.5px, transparent 0)',
              backgroundSize: '28px 28px'
            }}
          />

          {/* Deep Ambient Glow Spheres */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full bg-gradient-to-tr from-sky-500/15 via-cyan-400/10 to-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-blue-500/10 dark:bg-cyan-500/10 blur-2xl pointer-events-none animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[440px] h-[440px] rounded-full bg-cyan-400/10 dark:bg-sky-400/10 blur-2xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '1.8s' }} />

          {/* Concentric Mission Ops Rings & Animated Radar Reticles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-sky-500/20 dark:border-cyan-400/25 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full border border-dashed border-sky-500/20 dark:border-cyan-400/20 pointer-events-none animate-[spin_90s_linear_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full border border-sky-500/15 dark:border-cyan-400/15 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[920px] h-[920px] rounded-full border border-sky-500/[0.06] dark:border-cyan-400/[0.07] pointer-events-none" />

          {/* Crosshair Tactical Axis Lines */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/20 dark:via-cyan-400/25 to-transparent pointer-events-none" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-sky-500/20 dark:via-cyan-400/25 to-transparent pointer-events-none" />

          {/* Subtle Topographical Elevation Contours SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.09]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1000 1000">
            <path d="M0,280 C300,180 500,420 1000,320 L1000,1000 L0,1000 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 6" />
            <path d="M0,430 C350,360 650,530 1000,400 L1000,1000 L0,1000 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M0,580 C250,500 750,680 1000,560 L1000,1000 L0,1000 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" />
            <path d="M0,730 C400,660 600,830 1000,700 L1000,1000 L0,1000 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>

          {/* Tactical Corner HUD Telemetry Badges */}
          <div className="absolute top-6 left-6 hidden lg:flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-elevated)]/70 px-3.5 py-1.5 rounded-xl border border-[var(--border)] backdrop-blur-md shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SYS_ID: DDMA-DELHI-MCD // NODE 01</span>
          </div>

          <div className="absolute top-6 right-6 hidden lg:flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-elevated)]/70 px-3.5 py-1.5 rounded-xl border border-[var(--border)] backdrop-blur-md shadow-xs">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>RADAR: SAFDARJUNG-DOPPLER [LIVE]</span>
          </div>

          <div className="absolute bottom-6 left-6 hidden lg:flex items-center gap-3 font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-elevated)]/70 px-3.5 py-1.5 rounded-xl border border-[var(--border)] backdrop-blur-md shadow-xs">
            <span className="text-[var(--brand)] font-semibold">28.6139° N · 77.2090° E</span>
            <span className="opacity-40">|</span>
            <span>YAMUNA SUB-BASIN (SRID 4326)</span>
          </div>

          <div className="absolute bottom-6 right-6 hidden lg:flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-elevated)]/70 px-3.5 py-1.5 rounded-xl border border-[var(--border)] backdrop-blur-md shadow-xs">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>AUTHENTICATION PROTOCOL // V2.4</span>
          </div>
        </div>

        {/* Elevated Glassmorphism Sign-in Card */}
        <div className="relative z-10 w-full max-w-sm rounded-2xl surface-card p-7 sm:p-8 border border-[var(--border)] shadow-[0_8px_40px_-12px_rgba(14,165,233,0.18)] dark:shadow-[0_8px_40px_-12px_rgba(56,189,248,0.22)] backdrop-blur-2xl bg-[var(--surface-elevated)]/95 space-y-6">
          {/* Card Top Horizon Glow Line */}
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-sky-400/60 dark:via-cyan-400/60 to-transparent rounded-full pointer-events-none" />

          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-mono font-semibold uppercase tracking-wider mx-auto">
              <Shield className="w-3 h-3 text-[var(--brand)]" />
              <span>Restricted Municipal Access</span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-[var(--brand)] border border-sky-500/20 flex items-center justify-center mx-auto shadow-xs mt-1">
              <Shield className="w-6 h-6" />
            </div>
            
            <h2 className="text-2xl font-serif text-[var(--text-primary)] tracking-tight">Admin Portal</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Municipal command login for hydraulic simulations, drainage overrides, and operational audit dispatch.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* ── Genuine Google Identity Sign-In ── */}
          <div className="space-y-3">
            {googleClientId ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <GoogleOAuthProvider clientId={googleClientId}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setLoginError('Google Sign-In was cancelled or encountered an error in the Google popup.')}
                    theme="outline"
                    size="large"
                    shape="rectangular"
                    text="signin_with"
                    width="100%"
                  />
                </GoogleOAuthProvider>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGooglePromptConfig}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-3 border border-slate-300 shadow-sm active:scale-[0.99]"
                >
                  <GoogleIcon className="w-4 h-4" />
                  <span>Sign in with Google</span>
                </button>

                {showGoogleInfo && (
                  <div className="p-3.5 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] space-y-2.5 animate-fadeIn font-mono">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)]">Google OAuth 2.0 Web Client ID:</span>
                      <button
                        type="button"
                        onClick={() => setShowGoogleInfo(false)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      To open Google&apos;s real account verification popup, paste your Google Cloud Web Client ID:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="xxxxxxxx.apps.googleusercontent.com"
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customClientId.trim()) {
                            localStorage.setItem('pravah_google_client_id', customClientId.trim());
                            setShowGoogleInfo(false);
                            setLoginError(null);
                          }
                        }}
                        className="px-3 py-1.5 bg-[var(--brand)] text-white font-semibold text-xs rounded-lg hover:opacity-90 cursor-pointer"
                      >
                        Activate
                      </button>
                    </div>
                    <p className="text-[9px] text-[var(--text-muted)]">
                      Or configure <code className="text-sky-400">VITE_GOOGLE_CLIENT_ID</code> in <code className="text-sky-400">client/.env</code>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Secure Telemetry Footer Strip */}
          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>TLS 256-BIT ENCRYPTED</span>
            </span>
            <span className="opacity-80">MCD / DDMA NCT</span>
          </div>
        </div>

        {/* ── Access Denied Modal Popup ── */}
        {accessDeniedModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
            <div className="relative w-full max-w-md bg-[var(--surface-elevated)] border border-rose-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl text-center space-y-4">
              <button
                type="button"
                onClick={() => setAccessDeniedModal({ isOpen: false, email: '', message: '' })}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/20">
                <Ban className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Access Denied</h3>
                <p className="text-xs text-rose-400 font-medium">Unauthorized Municipal Account</p>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {accessDeniedModal.message}
              </p>

              {accessDeniedModal.email && (
                <div className="py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-muted)] truncate">
                  Attempted Account: <span className="text-rose-400 font-semibold">{accessDeniedModal.email}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-[11px] text-[var(--text-muted)] text-left leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--text-secondary)] mb-1">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Security Protocol Enforced</span>
                </div>
                Administrative control of hydraulic simulations, drainage overrides, and operational audit dispatch is strictly reserved for authorized municipal command personnel. This unauthorized login attempt has been logged in the immutable security audit ledger.
              </div>

              <button
                type="button"
                onClick={() => setAccessDeniedModal({ isOpen: false, email: '', message: '' })}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Dismiss & Return to Login
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ── Authenticated Admin Portal ──────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 page-enter">
      {/* ── Clean Top Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] tracking-tight">
            Admin Portal
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            City flood simulations, drainage overrides, and operational logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {currentUser?.picture ? (
            <img
              src={currentUser.picture}
              alt="Google Avatar"
              className="w-8 h-8 rounded-full border border-sky-400 shadow-xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-[var(--brand)] shadow-xs">
              <GoogleIcon className="w-4 h-4" />
            </div>
          )}
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-end gap-1.5">
              <span>{currentUser?.name || 'Administrator'}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                Admin
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-mono">
              {currentUser?.email || ''}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-rose-400 transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold opacity-70 hover:opacity-100 cursor-pointer">×</button>
        </div>
      )}

      {/* ── Modern Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center space-x-1 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'simulation', label: 'Flood Simulator' },
          { id: 'drainage', label: 'Drainage Control' },
          { id: 'audit', label: 'Audit Logs' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW (CLEAN LANDING PAGE)
          ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Row 1: 4 Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="surface-card p-4 border border-[var(--border)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                Monitored Wards
              </span>
              <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                250
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">100% City Coverage</span>
            </div>

            <div className="surface-card p-4 border border-[var(--border)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                Elevated Risk Wards
              </span>
              <div className="text-2xl font-bold text-rose-400 font-mono">
                {citySummary?.countsByLevel?.critical || 25}
              </div>
              <span className="text-[10px] text-orange-400 font-medium">
                + {citySummary?.countsByLevel?.high || 68} High Risk
              </span>
            </div>

            <div className="surface-card p-4 border border-[var(--border)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                Response Teams
              </span>
              <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                14
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">Ready for Deployment</span>
            </div>

            <div className="surface-card p-4 border border-[var(--border)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                System Status
              </span>
              <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>All Systems Online</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Telemetry Live</span>
            </div>
          </div>

          {/* Row 2: 3 Clear Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Simulator */}
            <div className="surface-card p-5 border border-[var(--border)] flex flex-col justify-between hover:border-[var(--brand)] transition-colors">
              <div className="space-y-2">
                <div className="w-8 h-8 bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="text-base font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  Flood Scenario Simulator
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Test pump deployments, rainfall increases, and drainage upgrades to project flood risk reduction in real time.
                </p>
              </div>
              <button
                onClick={() => handleTabChange('simulation')}
                className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-[var(--brand)] hover:underline cursor-pointer"
              >
                <span>Open Simulator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action 2: Drainage */}
            <div className="surface-card p-5 border border-[var(--border)] flex flex-col justify-between hover:border-[var(--brand)] transition-colors">
              <div className="space-y-2">
                <div className="w-8 h-8 bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <h3 className="text-base font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  Drainage Capacity Overrides
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Update baseline drainage capacity for any ward after desilting or culvert clearing operations.
                </p>
              </div>
              <button
                onClick={() => handleTabChange('drainage')}
                className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-[var(--brand)] hover:underline cursor-pointer"
              >
                <span>Adjust Drainage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action 3: Incidents */}
            <div className="surface-card p-5 border border-[var(--border)] flex flex-col justify-between hover:border-[var(--brand)] transition-colors">
              <div className="space-y-2">
                <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  Incident Command
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Review active field waterlogging incidents and dispatch emergency mobile pumping squads.
                </p>
              </div>
              <button
                onClick={() => navigate('/incidents')}
                className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-[var(--brand)] hover:underline cursor-pointer"
              >
                <span>View Incident Command</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 3: Wards Needing Attention (Simple, readable table) */}
          <div className="surface-card p-5 border border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  Wards Needing Attention
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  High-risk municipal wards. Click "Simulate" to test interventions.
                </p>
              </div>

              <div className="w-full sm:w-56">
                <input
                  type="text"
                  placeholder="Filter by ward name or code…"
                  value={wardSearch}
                  onChange={(e) => setWardSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-[var(--border)]">
              <table className="w-full text-left text-xs text-[var(--text-secondary)]">
                <thead className="bg-[var(--surface-soft)] text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">
                  <tr>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Zone</th>
                    <th className="px-3 py-2">Risk Score</th>
                    <th className="px-3 py-2">Level</th>
                    <th className="px-3 py-2 hidden md:table-cell">Drainage</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredWards.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-[var(--text-muted)]">
                        {loadingData ? 'Loading wards…' : 'No matching wards found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredWards.map((w) => {
                      const code = w.wardCode || w.id;
                      const name = w.wardName || w.name;
                      const score = Math.round(w.currentRiskScore || 50);
                      const level = w.currentRiskLevel || (score >= 75 ? 'CRITICAL' : score >= 60 ? 'HIGH' : 'MODERATE');
                      const drainage = Math.round(w.drainageCapacity || 50);

                      const badgeColor =
                        level === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : level === 'HIGH'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30';

                      return (
                        <tr key={code} className="hover:bg-[var(--surface-soft)]/50 transition-colors">
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-[var(--text-primary)] block">
                              {name}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {code}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[var(--text-muted)] hidden sm:table-cell">
                            {w.zone || 'Central'}
                          </td>
                          <td className="px-3 py-2.5 font-bold font-mono text-[var(--text-primary)]">
                            {score} / 100
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase ${badgeColor}`}>
                              {level}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[var(--text-muted)] hidden md:table-cell font-mono">
                            {drainage}%
                          </td>
                          <td className="px-3 py-2.5 text-right space-x-2">
                            <button
                              onClick={() => handleSimulateWard(code)}
                              className="px-2.5 py-1 text-xs font-semibold bg-[var(--brand)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              Simulate
                            </button>
                            <Link
                              to={`/wards/${code}`}
                              className="text-xs text-[var(--brand)] hover:underline font-medium inline-flex items-center"
                            >
                              <span>View</span>
                              <ChevronRight className="w-3 h-3 ml-0.5" />
                            </Link>
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
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 2: FLOOD SCENARIO SIMULATOR
          ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'simulation' && (
        <div className="space-y-4">
          <Simulator
            embedded={true}
            initialWardId={selectedWardId}
            onReturnToOverview={() => handleTabChange('overview')}
          />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 3: DRAINAGE CAPACITY CONTROL (FULL-WIDTH INDUSTRIAL CONSOLE)
          ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'drainage' && (
        <div className="space-y-6">
          
          {/* 1. City-Wide Drainage Metrics Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="surface-card p-4 border border-[var(--border)] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span className="uppercase tracking-wider">Hydraulic Grids</span>
                <Gauge className="w-4 h-4 text-[var(--brand)]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                {drainageStats.total}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                100% Municipal Outfall Mesh
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDrainageFilter(drainageFilter === 'choked' ? 'all' : 'choked')}
              className={`p-4 border rounded-xl space-y-1 text-left transition-all cursor-pointer ${
                drainageFilter === 'choked'
                  ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30'
                  : 'surface-card border-[var(--border)] hover:border-rose-500/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-rose-600 dark:text-rose-400">
                <span className="uppercase tracking-wider">Choked Outfalls</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {drainageStats.choked}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                <span>Capacity &lt; 40 m³/s</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold underline">
                  {drainageFilter === 'choked' ? 'Filtered' : 'Filter'}
                </span>
              </div>
            </button>

            <div className="surface-card p-4 border border-[var(--border)] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-cyan-600 dark:text-cyan-400">
                <span className="uppercase tracking-wider">Hydraulic Mean</span>
                <Droplets className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)] flex items-baseline gap-1">
                {drainageStats.avg}
                <span className="text-xs font-normal text-[var(--text-muted)]">m³/s</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Citywide Mean Flow Capacity
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDrainageFilter(drainageFilter === 'optimal' ? 'all' : 'optimal')}
              className={`p-4 border rounded-xl space-y-1 text-left transition-all cursor-pointer ${
                drainageFilter === 'optimal'
                  ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                  : 'surface-card border-[var(--border)] hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-emerald-600 dark:text-emerald-400">
                <span className="uppercase tracking-wider">High Capacity</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {drainageStats.optimal}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                <span>Capacity ≥ 70 m³/s</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold underline">
                  {drainageFilter === 'optimal' ? 'Filtered' : 'Filter'}
                </span>
              </div>
            </button>
          </div>

          {/* 2. Main 2-Column Responsive Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Pane: Ward Hydraulic Directory (5 of 12 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="surface-card p-4 sm:p-5 border border-[var(--border)] rounded-xl sm:rounded-2xl space-y-4 shadow-sm">
                
                {/* Search & Filter Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[var(--brand)]" />
                      <span>Municipal Ward Directory</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {filteredDrainageWards.length} wards
                    </span>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search ward name, code or zone…"
                      value={drainageSearch}
                      onChange={(e) => setDrainageSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 text-xs bg-[var(--surface-soft)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition-colors"
                    />
                    {drainageSearch && (
                      <button
                        onClick={() => setDrainageSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-medium">
                    {[
                      { id: 'all', label: `All (${wards.length})` },
                      { id: 'choked', label: `Choked (${drainageStats.choked})` },
                      { id: 'moderate', label: 'Moderate' },
                      { id: 'optimal', label: `Optimal (${drainageStats.optimal})` },
                    ].map((f) => {
                      const isActive = drainageFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setDrainageFilter(f.id)}
                          className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[var(--brand)] text-white font-semibold'
                              : 'bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface)] border border-[var(--border)]'
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ward List */}
                <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredDrainageWards.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[var(--text-muted)] space-y-1">
                      <p>No municipal wards match this filter.</p>
                      <button
                        onClick={() => { setDrainageSearch(''); setDrainageFilter('all'); }}
                        className="text-[var(--brand)] underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    filteredDrainageWards.map((w) => {
                      const code = w.wardCode || w.id;
                      const name = w.wardName || w.name;
                      const cap = Math.round(w.drainageCapacity ?? 50);
                      const isSelected = (selectedWard?.wardCode || selectedWard?.id) === code;
                      const riskScore = Math.round(w.currentRiskScore ?? 50);

                      const capColor =
                        cap < 40
                          ? 'text-rose-600 dark:text-rose-400'
                          : cap < 70
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400';

                      const barColor =
                        cap < 40
                          ? 'bg-rose-500'
                          : cap < 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500';

                      return (
                        <div
                          key={code}
                          onClick={() => handleSelectDrainageWard(w)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'bg-[var(--surface-soft)] border-[var(--brand)] ring-1 ring-[var(--brand)]/40 shadow-xs'
                              : 'surface-card border-[var(--border)] hover:border-[var(--brand)]/50 hover:bg-[var(--surface-soft)]/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                <span>{name}</span>
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                {code} · {w.zone || 'Central Zone'}
                              </div>
                            </div>

                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-secondary)]">
                              Risk: <strong className="text-[var(--text-primary)]">{riskScore}</strong>
                            </span>
                          </div>

                          {/* Mini Capacity Bar */}
                          <div className="mt-2.5 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-[var(--text-muted)]">Drainage Flow</span>
                              <span className={`font-bold ${capColor}`}>{cap} m³/s</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                style={{ width: `${Math.min(100, Math.max(10, cap))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Physical Model Guidance Callout */}
              <div className="surface-card p-4 border border-[var(--border)] rounded-xl flex items-start gap-3 text-xs text-[var(--text-secondary)] shadow-xs">
                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Mass-Balance Deficit Formula
                  </div>
                  <p className="text-[var(--text-muted)]">
                    Drainage deficit represents <strong className="text-[var(--text-primary)]">40%</strong> of the deterministic ward risk model. Desilting increases discharge velocity and immediately depresses local inundation risk.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Pane: Active Ward Calibration & Override Console (7 of 12 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Calibration Card */}
              <div className="surface-card p-5 sm:p-6 border border-[var(--border)] rounded-xl sm:rounded-2xl space-y-6 shadow-sm">
                
                {/* Header & Target Identity */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--brand)] font-semibold flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Calibrate Hydraulic Baseline</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight mt-0.5">
                      {selectedWard?.wardName || selectedWardId}
                    </h2>
                    <div className="text-xs text-[var(--text-muted)] font-mono">
                      Ward Code: {selectedWard?.wardCode || selectedWardId} · Zone: {selectedWard?.zone || 'Central'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      Risk: {currentRisk}/100
                    </span>
                    <Link
                      to={`/wards/${selectedWard?.wardCode || selectedWardId}`}
                      className="p-1.5 rounded border border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors no-underline"
                      title="Inspect GIS Ward Profile"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* 3 Comparison Readout Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] space-y-1">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      Current Baseline
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--text-primary)]">
                      {currentCapacity} <span className="text-xs font-normal text-[var(--text-muted)]">m³/s</span>
                    </div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                      currentCapacity < 40 ? 'bg-rose-500/10 text-rose-500' : currentCapacity < 70 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {currentCapacity < 40 ? 'Silted' : currentCapacity < 70 ? 'Standard' : 'Optimal'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[var(--brand)]/5 border border-[var(--brand)]/30 space-y-1">
                    <div className="text-[10px] font-mono text-[var(--brand)] uppercase tracking-wider font-semibold">
                      Target Override
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--brand)]">
                      {newCapacity} <span className="text-xs font-normal text-[var(--text-muted)]">m³/s</span>
                    </div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                      newCapacity < 40 ? 'bg-rose-500/10 text-rose-500' : newCapacity < 70 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {newCapacity < 40 ? 'Choked' : newCapacity < 70 ? 'Operational' : 'Upgraded'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] space-y-1">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      Projected Risk
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono flex items-center justify-center gap-1.5">
                      <span className="text-[var(--text-primary)]">{projectedRisk}</span>
                      {projectedRiskDelta !== 0 && (
                        <span className={`text-xs font-semibold font-mono flex items-center ${
                          projectedRiskDelta < 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {projectedRiskDelta < 0 ? (
                            <><TrendingDown className="w-3 h-3 mr-0.5" />{projectedRiskDelta}</>
                          ) : (
                            <><TrendingUp className="w-3 h-3 mr-0.5" />+{projectedRiskDelta}</>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      {projectedRiskDelta < 0 ? 'Theoretical Improvement' : projectedRiskDelta > 0 ? 'Risk Surge Warning' : 'No Delta'}
                    </span>
                  </div>
                </div>

                {/* Interactive Slider & Presets */}
                <form onSubmit={handleDrainageUpdate} className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>Hydraulic Discharge Velocity</span>
                      </label>
                      <span className="font-mono font-bold text-sm text-[var(--brand)]">
                        {newCapacity} m³/s
                      </span>
                    </div>

                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(parseInt(e.target.value, 10))}
                      className="w-full accent-[var(--brand)] cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                      <span>10 m³/s (Severe Siltation)</span>
                      <span>50 m³/s (Monsoon Mean)</span>
                      <span>100 m³/s (High Velocity)</span>
                    </div>

                    {/* Operational Preset Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[
                        { label: 'Choked', val: 25, desc: 'Heavy debris' },
                        { label: 'Standard', val: 50, desc: 'City baseline' },
                        { label: 'Desilted', val: 75, desc: 'Cleared culvert' },
                        { label: 'Upgraded', val: 100, desc: 'Reinforced drain' },
                      ].map((preset) => {
                        const isPresetActive = newCapacity === preset.val;
                        return (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setNewCapacity(preset.val)}
                            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                              isPresetActive
                                ? 'bg-[var(--brand)]/10 border-[var(--brand)] ring-1 ring-[var(--brand)]/30'
                                : 'bg-[var(--surface-soft)] border-[var(--border)] hover:border-[var(--brand)]/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {preset.label}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-[var(--brand)]">
                                {preset.val}m³/s
                              </span>
                            </div>
                            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                              {preset.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Justification / Reason Note */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-primary)]">
                      Operational Reason / MCD Work Order
                    </label>
                    <input
                      type="text"
                      value={drainageReason}
                      onChange={(e) => setDrainageReason(e.target.value)}
                      placeholder="e.g. Post-monsoon desilting completed by Central Zone engineering"
                      className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={updatingDrainage}
                      className="px-5 py-2.5 bg-[var(--brand)] text-white hover:opacity-90 font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center space-x-2 shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${updatingDrainage ? 'animate-spin' : ''}`} />
                      <span>{updatingDrainage ? 'Committing Override…' : 'Save Drainage Override'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateWard(selectedWard?.wardCode || selectedWardId)}
                      className="px-4 py-2.5 bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface)] hover:border-[var(--brand)] text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Test in Simulator</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--brand)]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewCapacity(currentCapacity)}
                      className="px-3 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                      title="Reset slider to current baseline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Recent Drainage Overrides Audit Trail */}
              <div className="surface-card p-5 border border-[var(--border)] rounded-xl sm:rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                  <h3 className="text-xs font-serif font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-sky-500" />
                    <span>Hydraulic Audit Trail</span>
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    Cryptographically Logged
                  </span>
                </div>

                {drainageLogs.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[var(--text-muted)] space-y-1 font-mono">
                    <p>No recent manual drainage overrides logged today.</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      All administrative changes are committed to the immutable PostgreSQL audit trail.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] font-mono text-[var(--text-muted)] border-b border-[var(--border)]">
                        <tr>
                          <th className="py-1.5">Action</th>
                          <th className="py-1.5">Target</th>
                          <th className="py-1.5">User</th>
                          <th className="py-1.5 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] font-mono text-[11px]">
                        {drainageLogs.map((log, idx) => (
                          <tr key={log.id || idx} className="hover:bg-[var(--surface-soft)]/50">
                            <td className="py-2 text-[var(--brand)] font-semibold">{log.action}</td>
                            <td className="py-2 text-[var(--text-primary)]">{log.resource || log.targetId || 'Ward'}</td>
                            <td className="py-2 text-[var(--text-muted)]">{log.userEmail || 'admin'}</td>
                            <td className="py-2 text-right text-[var(--text-muted)]">
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 4: AUDIT LOGS
          ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="surface-card p-5 border border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                Administrative Audit Logs
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Recent changes and administrative operations recorded on the system.
              </p>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {auditLogs.length} events logged
            </span>
          </div>

          <div className="overflow-x-auto border border-[var(--border)]">
            <table className="w-full text-left text-xs text-[var(--text-secondary)]">
              <thead className="bg-[var(--surface-soft)] text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[var(--text-muted)]">
                      No administrative events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-[var(--surface-soft)]/50 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-[var(--brand)]">
                        {log.action}
                      </td>
                      <td className="px-3 py-2.5">
                        {log.resource || log.targetId || log.targetEntity || 'Ward W001'}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono">
                        {log.userEmail || log.actorEmail || 'admin'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--text-muted)] font-mono">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
