import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Waves, ArrowRight, Activity, Shield, MapPin, Zap, ChevronDown } from 'lucide-react';

const STATS = [
  { value: '250',       label: 'Wards monitored' },
  { value: '24/7',      label: 'Risk monitoring' },
  { value: 'Live',      label: 'Incident reporting' },
  { value: '0–100',     label: 'Risk score index' },
];

const FEATURES = [
  {
    icon: Activity,
    title: 'Live Risk Intelligence',
    desc: 'Deterministic mass-balance model computing ward-level flood risk from drainage capacity, live rainfall, and geotagged citizen complaints — updated in real time.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: MapPin,
    title: 'Spatial Flood Mapping',
    desc: 'Interactive GeoJSON polygon choropleth across all 250 Delhi municipal wards with risk-coded overlays, hover intelligence, and ward drill-down reports.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Shield,
    title: 'Emergency Dispatch',
    desc: 'Coordinate field response teams and mobile submersible pumps across active waterlogging incidents with real-time status and audit trail.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Zap,
    title: 'What-If Simulation',
    desc: 'Stress-test pump deployments and cloudburst rainfall scenarios before committing physical resources. Compute delta risk (ΔRisk) instantly.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050a14] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Animated Background ──────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-[#050a14] via-[#06101e] to-[#020610]" />
        {/* Radial glows */}
        <div className="absolute -top-48 -left-48 w-[720px] h-[720px] rounded-full bg-cyan-950/25 blur-[130px]" />
        <div className="absolute -bottom-64 -right-48 w-[640px] h-[640px] rounded-full bg-blue-950/20 blur-[110px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{
            backgroundImage:
              'linear-gradient(to right,#38bdf8 1px,transparent 1px),linear-gradient(to bottom,#38bdf8 1px,transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* Floating orbs */}
        <div
          className="absolute top-1/4 left-[38%] w-72 h-72 rounded-full opacity-[0.055] blur-3xl bg-cyan-400"
          style={{ animation: 'float 10s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full opacity-[0.04] blur-3xl bg-blue-400"
          style={{ animation: 'float 13s ease-in-out infinite reverse' }}
        />
      </div>

      {/* ── Navbar ───────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#050a14]/92 backdrop-blur-xl border-b border-white/[0.05] shadow-lg shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 flex-shrink-0">
                <Waves style={{ width: 17, height: 17, color: 'white' }} />
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className="text-[17px] font-black tracking-tight text-white"
                  style={{ fontFamily: "'Poppins', 'Inter', sans-serif", letterSpacing: '-0.02em' }}
                >
                  PRAVAH
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/25 uppercase tracking-wider">
                  Beta
                </span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center space-x-8">
              {['Overview', 'Intelligence', 'About'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-[13px] text-slate-400 hover:text-white transition-colors font-medium"
                >
                  {item}
                </a>
              ))}
            </nav>

            {/* CTA */}
            <Link
              to="/dashboard"
              className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.1] text-[13px] font-semibold text-white transition-all backdrop-blur-sm"
            >
              <span>Open Dashboard</span>
              <ArrowRight style={{ width: 13, height: 13 }} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16 pb-12">
        {/* Eyebrow */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/22 text-cyan-400 text-[11px] font-semibold uppercase tracking-widest mb-9 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Delhi Urban Flood Intelligence</span>
        </div>

        {/* Heading */}
        <h1
          className="max-w-4xl text-[2.75rem] sm:text-6xl lg:text-[5rem] font-black tracking-tight leading-[1.04] mb-7"
          style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}
        >
          See the risk.
          <br />
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(90deg, #22d3ee, #38bdf8, #818cf8)' }}
          >
            Before the water rises.
          </span>
        </h1>

        {/* Supporting copy */}
        <p className="max-w-2xl text-[15px] sm:text-[17px] text-slate-400 leading-relaxed mb-10">
          Real-time monitoring and prediction of waterlogging risk across all{' '}
          <span className="text-white font-semibold">250 wards</span>. Report incidents, track
          drainage conditions, and stay informed during monsoon season.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link
            to="/dashboard"
            className="group flex items-center space-x-2.5 px-7 py-3.5 rounded-2xl text-white font-bold text-[14px] transition-all hover:scale-[1.025] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
              boxShadow: '0 8px 30px -8px rgba(14,165,233,0.4)',
            }}
          >
            <span>Open City Dashboard</span>
            <ArrowRight
              className="group-hover:translate-x-0.5 transition-transform"
              style={{ width: 15, height: 15 }}
            />
          </Link>
          <a
            href="#overview"
            className="flex items-center px-7 py-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.09] text-slate-300 hover:text-white font-semibold text-[14px] transition-all backdrop-blur-sm"
          >
            Explore Pravah
          </a>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05] backdrop-blur-sm max-w-3xl w-full">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/[0.025] px-6 py-5 text-center hover:bg-white/[0.05] transition-colors"
            >
              <div
                className="text-2xl sm:text-3xl font-black text-white"
                style={{ fontFamily: "'Poppins','Inter',sans-serif" }}
              >
                {stat.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1 text-slate-600 animate-bounce">
          <span className="text-[10px] uppercase tracking-widest">Explore</span>
          <ChevronDown style={{ width: 15, height: 15 }} />
        </div>
      </section>

      {/* ── Overview ─────────────────────────────────────────── */}
      <section id="overview" className="relative z-10 py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] uppercase tracking-widest text-cyan-400 font-semibold mb-3">
              Overview
            </div>
            <h2
              className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4"
              style={{ fontFamily: "'Poppins','Inter',sans-serif" }}
            >
              Built for municipal operations.
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-[15px] leading-relaxed">
              Pravah translates hydrological data into actionable intelligence — giving municipal
              engineers and emergency coordinators a single command interface.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group p-6 rounded-2xl border hover:border-white/[0.14] transition-all backdrop-blur-sm glass-hover ${f.border}`}
                  style={{ background: 'rgba(255,255,255,0.025)' }}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-4`}
                  >
                    <Icon className={`${f.color}`} style={{ width: 18, height: 18 }} />
                  </div>
                  <h3 className="text-[13px] font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Intelligence Strip ───────────────────────────────── */}
      <section id="intelligence" className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-12 border border-white/[0.07] backdrop-blur-md text-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(14,165,233,0.055) 0%, rgba(2,6,23,0.82) 50%, rgba(59,130,246,0.055) 100%)',
            }}
          >
            <div className="text-[11px] uppercase tracking-widest text-cyan-400 font-semibold mb-5">
              Powered by ward-level risk intelligence
            </div>
            <h2
              className="text-xl sm:text-2xl font-black text-white mb-5 tracking-tight leading-snug"
              style={{ fontFamily: "'Poppins','Inter',sans-serif" }}
            >
              Risk = Drainage × 0.40 + Rainfall × 0.35 + Complaints × 0.25
            </h2>
            <p className="text-slate-400 text-[13px] leading-relaxed max-w-2xl mx-auto mb-10">
              Every ward's risk score is computed deterministically using a mass-balance physical model.
              No black boxes. No approximations. Drainage network capacity, live precipitation data,
              and geotagged citizen complaints are weighted and combined into a single interpretable
              0–100 composite index — updated in real time.
            </p>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Drainage Network', weight: '40%', bar: 'bg-blue-500', desc: 'Sump capacity & deficit' },
                { label: 'Rainfall Surge',   weight: '35%', bar: 'bg-cyan-500',  desc: 'Open-Meteo precipitation' },
                { label: 'Citizen Urgency',  weight: '25%', bar: 'bg-amber-500', desc: 'Geotagged complaints' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.05]"
                >
                  <div className={`w-8 h-1.5 rounded-full ${item.bar} mb-3 mx-auto`} />
                  <div
                    className="text-xl font-black text-white"
                    style={{ fontFamily: "'Poppins','Inter',sans-serif" }}
                  >
                    {item.weight}
                  </div>
                  <div className="text-[12px] font-semibold text-slate-300 mt-1">{item.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section id="about" className="relative z-10 py-28 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4"
            style={{ fontFamily: "'Poppins','Inter',sans-serif" }}
          >
            Monitor Delhi's flood risk now.
          </h2>
          <p className="text-slate-400 text-[15px] mb-10">
            Access the live command dashboard. No login required for public monitoring.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="group flex items-center space-x-2 px-8 py-4 rounded-2xl text-white font-bold text-[14px] transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                boxShadow: '0 8px 30px -8px rgba(14,165,233,0.35)',
              }}
            >
              <span>Open City Dashboard</span>
              <ArrowRight
                className="group-hover:translate-x-0.5 transition-transform"
                style={{ width: 15, height: 15 }}
              />
            </Link>
            <Link
              to="/report"
              className="px-8 py-4 rounded-2xl border border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-[14px] transition-all"
            >
              Submit Waterlogging Report
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
          <span>PRAVAH (प्रवाह) · Municipal Corporation of Delhi Urban Flood Intelligence</span>
          <span className="font-mono">PostGIS · Node.js · React · Leaflet · Recharts</span>
        </div>
      </footer>
    </div>
  );
}
