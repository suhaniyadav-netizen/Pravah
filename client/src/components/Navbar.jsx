import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Waves, ShieldAlert, Activity, Sliders, BarChart3, Lock,
  Home, FileText,
} from 'lucide-react';
import { getSocket } from '../services/socket';
import { getCurrentWeather } from '../services/api';

export default function Navbar() {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [weather, setWeather] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected);

    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);

    getCurrentWeather()
      .then((data) => setWeather(data))
      .catch(() => {});

    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const navItems = [
    { label: 'Report',      path: '/report',     icon: FileText },
    { label: 'Dashboard',   path: '/dashboard',  icon: Activity },
    { label: 'Dispatch',    path: '/incidents',  icon: ShieldAlert },
    { label: 'Simulator',   path: '/simulator',  icon: Sliders },
    { label: 'Analytics',   path: '/analytics',  icon: BarChart3 },
    { label: 'Admin',       path: '/admin',      icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/70 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Left: Home arrow + Brand */}
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Back to Home"
            >
              <Home className="w-4 h-4" />
            </Link>

            <Link to="/dashboard" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-all flex-shrink-0">
                <Waves className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center space-x-1.5">
                  <span
                    className="text-[15px] font-black tracking-tight text-white"
                    style={{ fontFamily: "'Poppins','Inter',sans-serif", letterSpacing: '-0.02em' }}
                  >
                    Pravah
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/25">
                    V2
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium leading-none">
                  MCD Flood Ops
                </p>
              </div>
            </Link>
          </div>

          {/* Center: Nav links */}
          <nav className="hidden lg:flex items-center space-x-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-500/12 text-cyan-300 border border-cyan-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Weather + Connection */}
          <div className="flex items-center space-x-2.5">
            {weather && (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px]">
                <span className="text-slate-500">Precip:</span>
                <span className="font-bold text-cyan-400">{weather.rainfallMm ?? 0} mm/h</span>
              </div>
            )}

            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isConnected
                  ? 'bg-emerald-500/8 text-emerald-300 border-emerald-500/25'
                  : 'bg-rose-500/8 text-rose-300 border-rose-500/25'
              }`}
            >
              {isConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <div className="space-y-1">
                <span className="block w-4 h-0.5 bg-current" />
                <span className="block w-4 h-0.5 bg-current" />
                <span className="block w-3 h-0.5 bg-current" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="lg:hidden pb-3 pt-1 border-t border-slate-800/60">
            <div className="grid grid-cols-3 gap-1 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex flex-col items-center space-y-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold transition-all ${
                      isActive
                        ? 'bg-cyan-500/12 text-cyan-300'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
