import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Waves, ArrowRight, Activity, ShieldCheck, MapPin, Zap,
  CloudRain, Droplets, Gauge, ChevronDown, CheckCircle2,
  Sliders, Users, Clock, AlertTriangle,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { getCityRiskSummary, getCurrentWeather, getWardsGeoJSON } from '../services/api';

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [riskSummary, setRiskSummary] = useState(null);
  const [weather, setWeather] = useState(null);
  const [totalWardsCount, setTotalWardsCount] = useState(250);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Fetch live system telemetry for hero cards
    Promise.allSettled([
      getCityRiskSummary(),
      getCurrentWeather(),
      getWardsGeoJSON(),
    ]).then(([summaryRes, wxRes, wardsRes]) => {
      if (summaryRes.status === 'fulfilled') setRiskSummary(summaryRes.value);
      if (wxRes.status === 'fulfilled') setWeather(wxRes.value);
      if (wardsRes.status === 'fulfilled') {
        const count = wardsRes.value?.features?.length;
        if (count) setTotalWardsCount(count);
      }
    });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const counts = riskSummary?.countsByLevel || { critical: 12, high: 38, moderate: 110, low: 90 };
  const currentRainfall = weather?.rainfallMm ?? 34.5;
  const avgRiskScore = riskSummary?.cityAverageRiskScore ? parseFloat(riskSummary.cityAverageRiskScore).toFixed(1) : '54.2';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] transition-colors duration-300 overflow-x-hidden font-sans">

      {/* ── 1. CINEMATIC LANDING NAVBAR ────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[var(--surface-glass-strong)] backdrop-blur-xl border-b border-[var(--border)] shadow-md shadow-black/10'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-3 group text-decoration-none">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--brand)] to-[var(--brand-deep)] flex items-center justify-center shadow-lg shadow-[var(--brand)]/25 group-hover:scale-105 transition-transform flex-shrink-0 text-white">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-[var(--text-primary)] font-heading">
                    PRAVAH
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--brand)] font-bold border border-[var(--border)] uppercase tracking-wider">
                    V2
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold leading-none">
                  Delhi Urban Flood Intelligence
                </p>
              </div>
            </Link>

            {/* Desktop Nav Anchors */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#city-map" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                City Map
              </a>
              <a href="#risk-engine" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Risk Engine
              </a>
              <a href="#operational-flow" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Response Workflow
              </a>
              <a href="#citizen-network" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Citizen Telemetry
              </a>
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
              >
                <span>Enter Command Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. HERO: CINEMATIC ENVIRONMENTAL COMMAND ──────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Environmental Texture & Depth Canvas */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
          {/* Subtle Grid Canvas */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `linear-gradient(to right, var(--hero-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--hero-grid) 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
          />
          {/* Rainfall Canvas Effect */}
          <div className="absolute inset-0 rain-canvas pointer-events-none opacity-40" />
          {/* Atmospheric Radial Gradients */}
          <div className="absolute top-1/4 -left-48 w-96 h-96 rounded-full bg-[var(--brand)]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 rounded-full bg-[var(--brand-deep)]/15 blur-3xl pointer-events-none" />
          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent opacity-80" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-soft)] border border-[var(--border-strong)] text-[var(--brand)] text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>DELHI · URBAN FLOOD INTELLIGENCE</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[var(--text-primary)] leading-[1.06] font-heading">
              Know the risk.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand)] via-[var(--accent)] to-[var(--brand-strong)]">
                Before the water rises.
              </span>
            </h1>

            {/* Description */}
            <p className="max-w-xl text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              Real-time monitoring and explainable prediction of waterlogging risk across all{' '}
              <strong className="text-[var(--text-primary)] font-semibold">250 municipal wards</strong> of Delhi. Grounded in deterministic hydrological mass-balance modeling, Open-Meteo telemetry, and geotagged citizen dispatches.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link to="/dashboard" className="btn-primary py-3.5 px-7 text-sm font-bold flex items-center justify-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Explore Live Intelligence</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/report" className="btn-secondary py-3.5 px-6 text-sm font-semibold flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--brand)]" />
                <span>Report an Incident</span>
              </Link>
            </div>

            {/* Footnote Metadata */}
            <div className="pt-4 flex items-center gap-6 text-xs text-[var(--text-muted)] font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>PostGIS Polygon Containment</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero-Crash Offline Resilient</span>
              </span>
            </div>
          </div>

          {/* Right Hero Telemetry Stack */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {/* Telemetry Card 1 */}
            <div className="surface-card p-5 space-y-2 border-l-4 border-l-[var(--brand)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                <span>Coverage</span>
                <MapPin className="w-4 h-4 text-[var(--brand)]" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] font-heading">
                {totalWardsCount}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Municipal Wards Monitored</p>
            </div>

            {/* Telemetry Card 2 */}
            <div className="surface-card p-5 space-y-2 border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                <span>High Risk</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-rose-500 font-heading">
                {(counts.critical || 0) + (counts.high || 0)}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Wards Requiring Pump Staging</p>
            </div>

            {/* Telemetry Card 3 */}
            <div className="surface-card p-5 space-y-2 border-l-4 border-l-cyan-500">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                <span>Precipitation</span>
                <CloudRain className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] font-heading">
                {currentRainfall} <span className="text-sm font-normal text-[var(--text-muted)]">mm/h</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Open-Meteo Delhi Weather Feed</p>
            </div>

            {/* Telemetry Card 4 */}
            <div className="surface-card p-5 space-y-2 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                <span>System Status</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-500 font-heading flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">City Risk Index: <b>{avgRiskScore}/100</b></p>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#city-map"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-semibold cursor-pointer"
        >
          <span>EXPLORE PLATFORM</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </a>
      </section>

      {/* ── 3. SECTION: DELHI MAPPED IN REAL TIME ─────────────────────────────── */}
      <section id="city-map" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--brand)] text-xs font-bold uppercase tracking-wider">
              <span>01 · GEOSPATIAL INTELLIGENCE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] font-heading">
              Delhi, mapped in real time.
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              Move from a macro city-wide risk picture straight into the exact vulnerable municipal ward. 
              The interactive map is the operational heart of PRAVAH — rendering all 250 administrative ward boundaries with live mass-balance flood indicators.
            </p>
          </div>

          {/* Centerpiece Map Showcase Grid */}
          <div className="surface-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[var(--brand)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Delhi Municipal Corporation Boundary System (SRID 4326)</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="badge-risk-critical">Critical (75–100)</span>
                <span className="badge-risk-high">High (60–74)</span>
                <span className="badge-risk-moderate">Moderate (40–59)</span>
                <span className="badge-risk-low">Low (&lt;40)</span>
              </div>
            </div>

            {/* Interactive Preview Canvas */}
            <div className="h-96 sm:h-[480px] w-full rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] relative overflow-hidden flex items-center justify-center p-6">
              {/* Styled Mock Topology Map Preview */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'radial-gradient(circle at center, var(--brand) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }} />
              
              <div className="relative z-10 max-w-lg text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--brand)]/15 border border-[var(--brand)]/30 text-[var(--brand)] flex items-center justify-center mx-auto shadow-lg">
                  <MapPin className="w-7 h-7 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Interactive Choropleth Ready in Command Center
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Full vector polygons with click-to-inspect ward telemetry, drainage culvert capacities, and historical rainfall saturation.
                </p>
                <Link to="/dashboard" className="btn-primary text-xs font-bold py-2.5 px-6 inline-flex items-center gap-2">
                  <span>Launch Interactive Map</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SECTION: EXPLAINABLE RISK INTELLIGENCE ───────────────────────────── */}
      <section id="risk-engine" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--brand)] text-xs font-bold uppercase tracking-wider">
              <span>02 · DETERMINISTIC MASS BALANCE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] font-heading">
              Every risk score has a reason.
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              No black-box algorithms or opaque machine learning. PRAVAH computes composite vulnerability using physical mass-balance weights verified against municipal drainage dynamics.
            </p>
          </div>

          {/* Formula Visual Breakdown Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Factor 1: Drainage */}
            <div className="surface-card p-6 sm:p-8 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider">40% Weight</span>
                <Droplets className="w-6 h-6 text-[var(--brand)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Drainage Network Deficit</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Evaluates baseline culvert capacity against catchment area runoff. Sump blockages and desilting deficits increase risk linearly.
              </p>
              <div className="pt-2">
                <div className="w-full bg-[var(--surface-soft)] rounded-full h-2">
                  <div className="bg-[var(--brand)] h-2 rounded-full" style={{ width: '40%' }} />
                </div>
              </div>
            </div>

            {/* Factor 2: Rainfall */}
            <div className="surface-card p-6 sm:p-8 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">35% Weight</span>
                <CloudRain className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Live Rainfall Surge</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Ingests Open-Meteo precipitation feeds, hourly intensity trajectories, and rolling 24-hour storm saturation indices.
              </p>
              <div className="pt-2">
                <div className="w-full bg-[var(--surface-soft)] rounded-full h-2">
                  <div className="bg-cyan-400 h-2 rounded-full" style={{ width: '35%' }} />
                </div>
              </div>
            </div>

            {/* Factor 3: Citizen Reports */}
            <div className="surface-card p-6 sm:p-8 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">25% Weight</span>
                <Users className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Citizen Incident Urgency</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Real-time civic filings weighted by measured water depth (cm), reported trapped vehicles, and rate of incoming reports.
              </p>
              <div className="pt-2">
                <div className="w-full bg-[var(--surface-soft)] rounded-full h-2">
                  <div className="bg-amber-400 h-2 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. SECTION: RESPONSE & EMERGENCY DISPATCH WORKFLOW ─────────────────── */}
      <section id="operational-flow" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--brand)] text-xs font-bold uppercase tracking-wider">
              <span>03 · OPERATIONAL DISPATCH</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] font-heading">
              From signal to rapid field response.
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              Monitoring is only as good as the action it enables. PRAVAH connects live telemetry directly to emergency pumping stations and Quick Response Units.
            </p>
          </div>

          {/* 4-Step Lifecycle Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Detect Hotspot',
                desc: 'Threshold alert triggers when composite risk score exceeds 60 points or rainfall exceeds 30 mm/h.',
                icon: Gauge,
              },
              {
                step: '02',
                title: 'Assess Impact',
                desc: 'Evaluate 6h, 12h, and 24h hydrological projections with automated Decision Support Engine ranking.',
                icon: Clock,
              },
              {
                step: '03',
                title: 'Simulate Response',
                desc: 'What-If Digital Twin calculates delta risk reduction (ΔRisk) and pump staging feasibility prior to deployment.',
                icon: Sliders,
              },
              {
                step: '04',
                title: 'Mobilize Teams',
                desc: 'Dispatch heavy submersible pumps, notify field response officers, and issue road closure advisories.',
                icon: Zap,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.step} className="surface-card p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[var(--brand)]">STEP {card.step}</span>
                      <Icon className="w-5 h-5 text-[var(--brand)]" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{card.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. SECTION: CITIZEN REPORTING NETWORK ──────────────────────────────── */}
      <section id="citizen-network" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--brand)] text-xs font-bold uppercase tracking-wider">
              <span>04 · CIVIC TELEMETRY</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] font-heading">
              Every citizen report feeds the city picture.
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              When waterlogs occur on Ring Road underpasses or residential culverts, citizens can lodge instant geotagged reports. 
              Our PostGIS engine maps the coordinates to the exact containing ward in milliseconds.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Zero registration required for civic submissions</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Instant Socket.IO real-time broadcast to MCD dispatchers</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Point-in-polygon containment with Delhi boundary validation</span>
              </div>
            </div>

            <div className="pt-4">
              <Link to="/report" className="btn-primary py-3 px-6 text-xs font-bold inline-flex items-center gap-2">
                <span>Submit Waterlogging Report</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 surface-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Live Civic Feed Sample</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">LIVE STREAM</span>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] space-y-1">
                <div className="flex justify-between text-[var(--brand)] font-bold">
                  <span>Ward 056 · Connaught Place</span>
                  <span className="text-rose-500 font-sans badge-risk-critical">45 cm Depth</span>
                </div>
                <p className="text-[var(--text-secondary)] font-sans text-xs">Minto Bridge underpass heavy water accumulation, traffic diverted.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] space-y-1">
                <div className="flex justify-between text-[var(--brand)] font-bold">
                  <span>Ward 012 · Burari</span>
                  <span className="text-amber-500 font-sans badge-risk-moderate">25 cm Depth</span>
                </div>
                <p className="text-[var(--text-secondary)] font-sans text-xs">Main drain overflowing near Ring Road exit.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. SECTION: CLOSING CALL TO ACTION ─────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-gradient-to-b from-[var(--surface-elevated)] to-[var(--bg)] text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[var(--brand)] to-[var(--brand-deep)] flex items-center justify-center text-white mx-auto shadow-xl shadow-[var(--brand)]/20">
            <Waves className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] font-heading">
              When the rain changes,
              <br />
              <span className="text-[var(--brand)]">PRAVAH changes with it.</span>
            </h2>
            <p className="max-w-xl mx-auto text-sm sm:text-base text-[var(--text-secondary)]">
              Unified command for municipal engineers, disaster response officers, and citizens across the National Capital Territory.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/dashboard" className="btn-primary py-3.5 px-8 text-sm font-bold flex items-center gap-2">
              <span>Enter City Intelligence</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/incidents" className="btn-secondary py-3.5 px-6 text-sm font-semibold">
              <span>Emergency Dispatch Center</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-8 px-4 sm:px-6 lg:px-8 bg-[var(--surface)] text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>PRAVAH V2 (प्रवाह) · Municipal Corporation of Delhi Urban Flood Intelligence</span>
          <span className="font-mono text-[11px] text-[var(--text-secondary)]">PostGIS · Node.js · React · Leaflet · Recharts · Open-Meteo</span>
        </div>
      </footer>
    </div>
  );
}
