import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Waves, ShieldAlert, Activity, Sparkles, Sliders, BarChart3, Lock, Wifi, WifiOff } from 'lucide-react';
import { getSocket } from '../services/socket';
import { getCurrentWeather } from '../services/api';

export default function Navbar() {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Fetch initial weather
    getCurrentWeather()
      .then((data) => setWeather(data))
      .catch(() => {});

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const navItems = [
    { label: 'Citizen Portal', path: '/', icon: Waves },
    { label: 'City Dashboard', path: '/dashboard', icon: Activity },
    { label: 'Decision Support', path: '/incidents', icon: ShieldAlert },
    { label: 'What-If Simulator', path: '/simulator', icon: Sliders },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Admin Center', path: '/admin', icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">Pravah</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">
                  V2
                </span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Delhi Flood Intelligence</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Side Status & Telemetry */}
          <div className="flex items-center space-x-4">
            {weather && (
              <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
                <span className="text-slate-400">Rainfall:</span>
                <span className="font-semibold text-cyan-400">{weather.rainfallMm ?? 0} mm/h</span>
              </div>
            )}

            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Live Sync</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
