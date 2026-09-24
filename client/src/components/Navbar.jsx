import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, ShieldAlert } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: 'City Overview', path: '/dashboard' },
    { label: 'Incident Command', path: '/incidents' },
    { label: 'Scenario Simulator', path: '/simulator' },
    { label: 'Historical Analytics', path: '/analytics' },
    { label: 'Admin Console', path: '/admin' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--surface-glass-strong)] backdrop-blur-xl border-b border-[var(--border)] shadow-md'
          : 'bg-[var(--surface-glass)] backdrop-blur-lg border-b border-[var(--border)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12">
        <div className="flex items-center justify-between h-20">

          {/* Left: PRAVAH Brand Wordmark */}
          <Link to="/" className="flex items-center gap-3 text-decoration-none group">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
              PRAVAH
            </span>
            <span className="hidden md:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              V2.0
            </span>
          </Link>

          {/* Center: Clean Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={`text-xs font-medium transition-all tracking-wide py-1 px-2 rounded-md ${
                    isActive
                      ? 'text-[var(--brand)] font-semibold bg-cyan-500/10'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Live Pulse, Theme Toggle, Report Incident Pill */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Live Telemetry Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-pill text-[11px] font-semibold text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="tracking-wider">250 WARDS LIVE</span>
            </div>

            {/* Sun/Moon Icon Theme Toggle */}
            <ThemeToggle />

            {/* Report Incident CTA */}
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-glass text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all shadow-sm"
            >
              <ShieldAlert size={14} className="text-amber-400" />
              <span>Report Incident</span>
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              className="lg:hidden p-2 rounded-full liquid-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-in Drawer */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-y-0 right-0 w-[85%] max-w-[340px] bg-[var(--surface-glass-strong)] backdrop-blur-2xl border-l border-[var(--border)] p-6 flex flex-col justify-between shadow-2xl z-50 transition-transform duration-300"
            style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <span className="text-lg font-bold text-[var(--text-primary)]">PRAVAH</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-full liquid-glass text-[var(--text-secondary)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                {navItems.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 px-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Theme</span>
                <ThemeToggle />
              </div>
              <Link
                to="/report"
                onClick={() => setMobileOpen(false)}
                className="w-full py-3 rounded-full motionsites-btn-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>Report Incident</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
