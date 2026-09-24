import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Waves, Activity, ShieldAlert, Sliders, BarChart3, Lock,
  Menu, X, CloudRain,
} from 'lucide-react';
import { getSocket } from '../services/socket';
import { getCurrentWeather } from '../services/api';
import ThemeToggle from './ThemeToggle';

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
    { label: 'City Intelligence', path: '/dashboard', icon: Activity },
    { label: 'Incidents & Dispatch', path: '/incidents', icon: ShieldAlert },
    { label: 'Simulator', path: '/simulator', icon: Sliders },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Admin', path: '/admin', icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[var(--surface-glass-strong)] backdrop-blur-xl border-b border-[var(--border)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Brand Identity */}
          <Link to="/" className="flex items-center gap-3 group text-decoration-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--brand)] to-[var(--brand-deep)] flex items-center justify-center shadow-md shadow-[var(--brand)]/20 group-hover:scale-105 transition-transform flex-shrink-0 text-white">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-[var(--text-primary)] font-heading">
                  PRAVAH
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--brand)] font-bold border border-[var(--border)] uppercase tracking-wider">
                  V2
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold leading-none">
                Delhi Flood Intelligence
              </p>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname.startsWith('/wards/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--brand)] border border-[var(--border-strong)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Weather Telemetry, Connection State, Theme Toggle & Report CTA */}
          <div className="flex items-center gap-2.5">
            {weather && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]">
                <CloudRain className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Precip:</span>
                <span className="font-bold text-[var(--text-primary)]">{weather.rainfallMm ?? 0} mm/h</span>
              </div>
            )}

            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/25'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isConnected ? 'Live Telemetry' : 'Offline'}</span>
            </div>

            <ThemeToggle compact />

            <Link
              to="/report"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--brand)] text-white hover:opacity-90 transition-opacity text-xs font-bold shadow-sm"
            >
              <span>Report Incident</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)] border border-[var(--border)] transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden py-3 border-t border-[var(--border)] space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--brand)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Link
              to="/report"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 mt-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold text-center"
            >
              <span>Report Waterlogging Incident</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
