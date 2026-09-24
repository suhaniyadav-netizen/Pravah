import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Activity,
  Layers,
  CloudRain,
  Users,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { getCityRiskSummary, getCurrentWeather, getWardsGeoJSON } from '../services/api';

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [riskSummary, setRiskSummary] = useState(null);
  const [weather, setWeather] = useState(null);
  const [wardsCount, setWardsCount] = useState(250);

  // Parallax ref
  const parallaxRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      if (parallaxRef.current) {
        const scrolledY = window.scrollY;
        parallaxRef.current.style.transform = `translate3d(0, ${scrolledY * 0.12}px, 0)`;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // Fetch real live telemetry for floating hero instruments
    Promise.allSettled([
      getCityRiskSummary(),
      getCurrentWeather(),
      getWardsGeoJSON(),
    ]).then(([summaryRes, wxRes, wardsRes]) => {
      if (summaryRes.status === 'fulfilled') setRiskSummary(summaryRes.value);
      if (wxRes.status === 'fulfilled') setWeather(wxRes.value);
      if (wardsRes.status === 'fulfilled') {
        const count = wardsRes.value?.features?.length;
        if (count) setWardsCount(count);
      }
    });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const highRiskCount = (riskSummary?.countsByLevel?.critical || 12) + (riskSummary?.countsByLevel?.high || 38);
  const currentRainfall = weather?.rainfallMm ?? 42.0;

  const navItems = [
    { label: 'City Intelligence', path: '/dashboard' },
    { label: 'Ward Intelligence', path: '/dashboard' },
    { label: 'Incidents', path: '/incidents' },
    { label: 'Analytics', path: '/analytics' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] transition-colors duration-500 overflow-x-hidden selection:bg-[var(--brand)] selection:text-white">

      {/* ── 1. MINIMAL FIXED NAVBAR ────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[var(--surface-glass-strong)] backdrop-blur-xl border-b border-[var(--border)] py-4'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-sans no-underline">
            PRAVAH
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors tracking-wide no-underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-pill text-[11px] font-medium text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-widest">LIVE</span>
            </div>

            <ThemeToggle />

            <Link
              to="/report"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-glass text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand)] transition-all no-underline"
            >
              <span>Report Incident</span>
            </Link>

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
            className="lg:hidden fixed inset-y-0 right-0 w-[85%] max-w-[340px] bg-[var(--surface-glass-strong)] backdrop-blur-2xl border-l border-[var(--border)] p-6 flex flex-col justify-between shadow-2xl z-50"
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
                    className="block py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors no-underline"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-[var(--border)]">
              <Link
                to="/report"
                onClick={() => setMobileOpen(false)}
                className="w-full py-3 rounded-full btn-pill-primary text-xs font-semibold flex items-center justify-center gap-2 no-underline"
              >
                <span>Report Incident</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── 2. HERO: FULL-VIEWPORT CINEMATIC EARTH OBSERVATORY ───────────────────── */}
      <section className="relative min-h-[100vh] h-[100svh] w-full flex flex-col justify-between pt-28 pb-12 px-6 md:px-10 lg:px-12 overflow-hidden select-none">
        
        {/* Layer 1: Atmospheric Deep Space & Starfield */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-deep)] via-[var(--bg)] to-[var(--bg-soft)] opacity-90" />
          {/* Subtle star particles / atmospheric depth */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(1.5px 1.5px at 20px 30px, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 140px 180px, rgba(103,232,249,0.5), transparent), radial-gradient(1.5px 1.5px at 320px 240px, rgba(255,255,255,0.6), transparent)',
              backgroundSize: '400px 400px',
            }}
          />
        </div>

        {/* Layer 2: Live Animated Earth / Planet Atmosphere */}
        <div
          ref={parallaxRef}
          className="absolute right-[-10%] md:right-[-2%] bottom-[-15%] md:bottom-[-20%] w-[115vw] sm:w-[90vw] md:w-[65vw] lg:w-[56vw] max-w-[900px] aspect-square z-0 pointer-events-none will-change-transform"
        >
          {/* Outer Atmosphere Soft Aura */}
          <div className="earth-atmosphere-glow" />

          {/* Earth Body Sphere */}
          <div className="earth-sphere w-full h-full relative">
            {/* Earth High-Res Satellite Relief Texture */}
            <div
              className="absolute inset-0 opacity-85"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #1a5378 0%, #0c2b42 40%, #051422 75%, #02070e 100%)',
              }}
            />
            {/* Continent Landmass Geometry Mask */}
            <div
              className="absolute inset-0 opacity-35 mix-blend-overlay"
              style={{
                backgroundImage: 'radial-gradient(ellipse at 40% 40%, rgba(77,157,184,0.8) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(56,189,248,0.4) 0%, transparent 50%)',
              }}
            />
            {/* Atmosphere Cloud Layer */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: 'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.8) 0%, transparent 45%), radial-gradient(circle at 25% 70%, rgba(255,255,255,0.5) 0%, transparent 50%)',
                animation: 'cloudDrift 90s linear infinite',
              }}
            />

            {/* Subtle Delhi Focus Indicator */}
            <div
              className="absolute left-[44%] top-[38%] z-10 flex items-center gap-2 pointer-events-none"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)] block animate-ping absolute inset-0 opacity-75" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)] block relative shadow-[0_0_12px_#38bdf8]" />
              </div>
              <div className="px-2 py-0.5 rounded-full liquid-glass text-[9px] font-mono font-medium tracking-widest text-cyan-300">
                DELHI · 28.61°N 77.20°E
              </div>
            </div>

            {/* Earth Horizon Crescent Shadow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(125deg, transparent 40%, rgba(2,6,12,0.7) 65%, rgba(2,6,12,0.98) 90%)',
              }}
            />
          </div>
        </div>

        {/* Layer 3: Central Cinematic Editorial Hero Typography */}
        <div className="relative z-10 max-w-4xl mx-auto w-full text-center my-auto space-y-6">
          {/* Eyebrow */}
          <div className="inline-block">
            <span className="text-[11px] md:text-xs font-semibold tracking-[0.25em] text-[var(--text-muted)] uppercase font-sans">
              DELHI · URBAN FLOOD INTELLIGENCE
            </span>
          </div>

          {/* Main Hero Serif Heading (Instrument Serif) */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[104px] font-serif text-[var(--text-primary)] leading-[0.92] tracking-tight hero-glow-text">
            Know the risk.
            <br />
            <span className="italic font-light">Before the water rises.</span>
          </h1>

          {/* Editorial Supporting Description */}
          <p className="max-w-xl mx-auto text-sm md:text-base text-[var(--text-secondary)] leading-relaxed font-sans pt-2">
            Unified command for municipal engineers, disaster response officers, and citizens across the National Capital Territory.
          </p>

          {/* Primary & Secondary Pill CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/dashboard" className="btn-pill-primary text-xs tracking-wide no-underline">
              <span>Explore Intelligence</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/report" className="btn-pill-secondary text-xs tracking-wide no-underline">
              <ShieldCheck size={14} className="text-[var(--brand)]" />
              <span>Report an Incident</span>
            </Link>
          </div>
        </div>

        {/* Layer 4: Minimal Floating Telemetry Instruments (Lower Edge) */}
        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] font-sans">
          <div className="flex items-center gap-8">
            <div>
              <span className="block text-xl md:text-2xl font-semibold text-[var(--text-primary)] font-sans tracking-tight">
                {wardsCount}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium">
                WARDS MONITORED
              </span>
            </div>

            <div className="w-px h-8 bg-[var(--border)]" />

            <div>
              <span className="block text-xl md:text-2xl font-semibold text-rose-500 font-sans tracking-tight">
                {highRiskCount}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium">
                HIGH RISK
              </span>
            </div>

            <div className="w-px h-8 bg-[var(--border)]" />

            <div>
              <span className="block text-xl md:text-2xl font-semibold text-cyan-400 font-sans tracking-tight">
                {currentRainfall} mm
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium">
                RAINFALL
              </span>
            </div>
          </div>

          {/* Scroll cue */}
          <a
            href="#intelligence-statement"
            className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors no-underline cursor-pointer"
          >
            <span className="tracking-widest uppercase text-[10px]">SCROLL TO EXPLORE</span>
            <ChevronDown size={14} className="animate-bounce" />
          </a>
        </div>
      </section>

      {/* ── 3. SECOND FULL-SCREEN SECTION: ATMOSPHERIC STATEMENT ────────────────── */}
      <section
        id="intelligence-statement"
        className="relative min-h-[100vh] flex flex-col justify-between py-28 px-6 md:px-10 lg:px-12 overflow-hidden border-t border-[var(--border)]"
        style={{
          background: 'linear-gradient(180deg, var(--bg) 0%, #07263d 45%, #0b4968 85%, var(--bg) 100%)',
        }}
      >
        {/* Layer 1 & 2: Abstract Flow Lines & Geographic Contour Mask */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 40%, rgba(56,189,248,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 60%, rgba(103,232,249,0.1) 0%, transparent 60%)',
            }}
          />
        </div>

        {/* Section Content Header */}
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <span className="text-[10px] md:text-xs font-semibold tracking-[0.25em] text-cyan-300 uppercase">
            02 · SYSTEM RESPONSIVENESS
          </span>
        </div>

        {/* Second Major Editorial Statement (Instrument Serif) */}
        <div className="relative z-10 max-w-5xl mx-auto w-full text-center space-y-8 my-auto">
          <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-[88px] font-serif text-white leading-[0.95] tracking-tight">
            When the rain changes,
            <br />
            <span className="italic font-light text-cyan-200">PRAVAH changes with it.</span>
          </h2>

          <p className="max-w-2xl mx-auto text-sm md:text-base text-slate-200 leading-relaxed font-sans">
            Deterministic mass-balance physical modeling combining drainage network capacity, real-time meteorological precipitation, and geotagged civic dispatches.
          </p>

          {/* Operational Flow Elements */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-4xl mx-auto">
            {[
              { label: '250 WARDS', desc: 'Polygon Boundary Modeling', icon: Layers },
              { label: 'LIVE RISK', desc: '40 / 35 / 25 Mass Balance', icon: Activity },
              { label: 'REAL-TIME RAINFALL', desc: 'Open-Meteo Weather Feed', icon: CloudRain },
              { label: 'CITIZEN REPORTS', desc: 'Point-in-Polygon Geotagging', icon: Users },
            ].map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div key={idx} className="p-5 rounded-2xl liquid-glass text-left space-y-2">
                  <Icon size={18} className="text-cyan-400" />
                  <div className="text-xs font-bold text-white font-sans tracking-wide">{pillar.label}</div>
                  <div className="text-[11px] text-slate-300 font-sans">{pillar.desc}</div>
                </div>
              );
            })}
          </div>

          <div className="pt-6">
            <Link to="/dashboard" className="btn-pill-primary text-xs font-semibold py-4 px-9 inline-flex items-center gap-2 no-underline">
              <span>Enter City Intelligence</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Footer info in second section */}
        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10 text-xs text-slate-400 font-sans">
          <span>PRAVAH (प्रवाह) · Municipal Corporation of Delhi Urban Flood Intelligence</span>
          <span className="font-mono text-[11px] text-cyan-300">Instrument Serif · Inter · Leaflet · PostGIS</span>
        </div>
      </section>

    </div>
  );
}
