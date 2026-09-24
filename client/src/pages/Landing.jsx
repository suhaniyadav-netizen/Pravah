import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Volume2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Parallax QuoteSection Refs
  const quoteSectionRef = useRef(null);
  const rainbowRef = useRef(null);
  const leftCloudRef = useRef(null);
  const rightCloudRef = useRef(null);

  // Animation frame tracker
  const animationFrameId = useRef(null);
  const currentProgress = useRef(0);
  const currentRainbowY = useRef(120);
  const currentCloudX = useRef(-200);
  const currentCloudY = useRef(0);
  const currentCloudOpacity = useRef(0);

  useEffect(() => {
    // Parallax animation loop with lerp smoothing exactly as in MotionSites specification
    const lerp = (start, end, factor) => start + (end - start) * factor;

    const updateParallax = () => {
      if (!quoteSectionRef.current) {
        animationFrameId.current = requestAnimationFrame(updateParallax);
        return;
      }

      const rect = quoteSectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || 800;

      // progress = clamp(0, 1, (windowHeight - rect.top) / (windowHeight + rect.height))
      const rawProgress = (windowHeight - rect.top) / (windowHeight + rect.height);
      const targetProgress = Math.max(0, Math.min(1, rawProgress));
      currentProgress.current = lerp(currentProgress.current, targetProgress, 0.08);

      const p = currentProgress.current;

      // 1. Rainbow parallax: moves vertically from +120px to -160px based on scroll progress. Lerp factor: 0.06
      const targetRainbowY = 120 - p * 280;
      currentRainbowY.current = lerp(currentRainbowY.current, targetRainbowY, 0.06);
      if (rainbowRef.current) {
        rainbowRef.current.style.transform = `translate3d(0, ${currentRainbowY.current.toFixed(2)}px, 0)`;
      }

      // 2. Clouds: slide in from -200px / +200px on X when in view (progress 0.12 - 0.92)
      let targetCloudX = -200;
      let targetOpacity = 0;
      if (p >= 0.12 && p <= 0.92) {
        targetCloudX = 0;
        targetOpacity = 0.85;
      }

      const targetCloudY = p * -50;
      currentCloudX.current = lerp(currentCloudX.current, targetCloudX, 0.04);
      currentCloudY.current = lerp(currentCloudY.current, targetCloudY, 0.04);
      currentCloudOpacity.current = lerp(currentCloudOpacity.current, targetOpacity, 0.04);

      if (leftCloudRef.current) {
        leftCloudRef.current.style.transform = `translate3d(${currentCloudX.current.toFixed(2)}px, ${currentCloudY.current.toFixed(2)}px, 0)`;
        leftCloudRef.current.style.opacity = currentCloudOpacity.current.toFixed(3);
      }

      if (rightCloudRef.current) {
        rightCloudRef.current.style.transform = `scaleX(-1) translate3d(${(-currentCloudX.current).toFixed(2)}px, ${currentCloudY.current.toFixed(2)}px, 0)`;
        rightCloudRef.current.style.opacity = currentCloudOpacity.current.toFixed(3);
      }

      animationFrameId.current = requestAnimationFrame(updateParallax);
    };

    animationFrameId.current = requestAnimationFrame(updateParallax);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const navLinks = [
    { label: 'City Intelligence', path: '/dashboard' },
    { label: 'Ward Intelligence', path: '/dashboard' },
    { label: 'Incidents', path: '/incidents' },
    { label: 'Analytics', path: '/analytics' },
  ];

  return (
    <div className="min-h-screen bg-[#050B14] text-white selection:bg-cyan-500 selection:text-white font-inter">

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: HERO — FULL VIEWPORT LIVE EARTH
          ───────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[100vh] w-full overflow-hidden flex flex-col justify-between">

        {/* 1. Cinematic Live Earth / Atmospheric Video Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover object-center scale-[1.03]"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4"
          />
          {/* Dark / Light Atmospheric Overlay */}
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[0.5px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-transparent to-black/30" />
        </div>

        {/* 2. Fixed Navbar */}
        <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-5 flex items-center justify-between transition-all">
          {/* Brand */}
          <Link to="/" className="text-xl md:text-2xl font-bold tracking-tight text-white font-inter no-underline hover:opacity-90">
            PRAVAH
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-12">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className="text-white/80 hover:text-white text-sm tracking-wide transition-colors font-inter no-underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Controls: Live Pulse, Sun/Moon Theme Toggle, Pill CTA */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full liquid-glass text-[11px] font-medium text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="tracking-widest">LIVE</span>
            </div>

            <ThemeToggle />

            <Link
              to="/report"
              className="hidden sm:inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full liquid-glass text-xs font-medium text-white hover:bg-white/10 transition-all no-underline"
            >
              <span>Report Incident</span>
            </Link>

            {/* Mobile Hamburger Button with cubic-bezier easing */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden w-10 h-10 rounded-full liquid-glass flex flex-col items-center justify-center gap-1.5 p-2.5 z-50 text-white"
              aria-label="Toggle navigation"
            >
              <span
                className={`w-5 h-[1.5px] bg-white transition-all duration-300 ${
                  mobileOpen ? 'rotate-45 translate-y-[4.5px]' : ''
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
              <span
                className={`w-5 h-[1.5px] bg-white transition-all duration-300 ${
                  mobileOpen ? 'opacity-0 scale-0' : ''
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
              <span
                className={`w-5 h-[1.5px] bg-white transition-all duration-300 ${
                  mobileOpen ? '-rotate-45 -translate-y-[4.5px]' : ''
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </button>
          </div>
        </header>

        {/* Mobile Slide-in Drawer */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-y-0 right-0 w-[85%] max-w-[340px] bg-[#050B14]/95 backdrop-blur-xl border-l border-white/10 p-8 flex flex-col justify-between shadow-2xl z-40 transition-transform duration-300"
            style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            <div className="space-y-8 pt-12">
              <span className="text-xl font-bold tracking-tight text-white font-inter block">
                PRAVAH
              </span>

              <div className="space-y-3">
                {navLinks.map((item, idx) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-base font-medium text-white/80 hover:text-white transition-colors no-underline"
                    style={{ transitionDelay: `${150 + idx * 75}ms` }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-4">
              <Link
                to="/report"
                onClick={() => setMobileOpen(false)}
                className="motionsites-btn-white w-full text-center no-underline text-xs"
              >
                <span>Report Incident</span>
              </Link>
            </div>
          </div>
        )}

        {/* 3. Center Hero Editorial Content */}
        <div className="relative z-20 max-w-5xl mx-auto w-full text-center my-auto px-6 pt-16 space-y-6 md:space-y-8 -mt-8 sm:-mt-12">
          {/* Eyebrow */}
          <div className="inline-block">
            <span className="text-xs md:text-sm uppercase tracking-[0.2em] text-white/70 font-inter font-medium">
              DELHI · URBAN FLOOD INTELLIGENCE
            </span>
          </div>

          {/* Heading in Instrument Serif */}
          <h1 className="font-instrument text-white text-[42px] sm:text-7xl md:text-8xl lg:text-[110px] leading-[0.9] tracking-tight text-center text-glow">
            Know the risk.
            <br />
            <span className="italic font-normal">Before the water rises.</span>
          </h1>

          {/* Supporting Description */}
          <p className="text-white/75 text-sm md:text-base text-center max-w-[600px] mx-auto font-inter font-normal leading-relaxed pt-1">
            Unified command for municipal engineers, disaster response officers, and citizens across the National Capital Territory.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/dashboard" className="motionsites-btn-white no-underline">
              <span>Explore Intelligence</span>
              <ArrowRight size={15} />
            </Link>
            <Link to="/report" className="motionsites-btn-ghost no-underline">
              <span>Report an Incident</span>
            </Link>
          </div>
        </div>

        {/* 4. Lower Hero Bar: Sound Indicator + Scroll Cue */}
        <div className="relative z-20 max-w-7xl mx-auto w-full px-6 md:px-12 pb-8 flex items-center justify-between text-xs text-white/60">
          {/* Sound / Atmosphere Indicator */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/80 liquid-glass">
              <Volume2 size={16} />
            </div>
            <div className="leading-tight text-[11px]">
              <span className="block text-white/80 font-medium">Earth Observatory</span>
              <span className="text-white/50">Live Satellite Telemetry</span>
            </div>
          </div>

          {/* Environmental Tag */}
          <div className="hidden md:block text-[11px] font-mono text-white/50 tracking-widest uppercase">
            28.6139° N · 77.2090° E · 250 WARDS
          </div>

          {/* Scroll Cue */}
          <a
            href="#quote-section"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors no-underline cursor-pointer"
          >
            <span className="text-[10px] uppercase tracking-widest font-medium">EXPLORE</span>
            <ChevronDown size={14} className="animate-bounce" />
          </a>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: QUOTE / PARALLAX STATEMENT SECTION
          ───────────────────────────────────────────────────────────── */}
      <section
        id="quote-section"
        ref={quoteSectionRef}
        className="relative h-screen min-h-[100vh] w-full overflow-hidden flex items-center justify-center px-6 md:px-12"
        style={{
          background: 'linear-gradient(180deg, #010A17 0%, #0A4267 30%, #20658E 60%, #6BADC4 100%)',
        }}
      >
        {/* Layer 1: Rainbow Image with Parallax (+120px to -160px) */}
        <img
          ref={rainbowRef}
          src="https://soft-zoom-63098134.figma.site/_assets/v11/8d520a7515d06cbfc403d0125e3d05b1a7ccd29c.png"
          alt="Atmospheric Prism Arc"
          className="absolute inset-x-0 top-0 w-full object-cover z-30 pointer-events-none opacity-85 will-change-transform"
        />

        {/* Layer 2: Left Cloud Parallax */}
        <img
          ref={leftCloudRef}
          src="https://soft-zoom-63098134.figma.site/_assets/v11/0d6dfd3f90b930f21726f2ed56a3320d79b7a797.png"
          alt="Atmospheric Cloud"
          className="hidden sm:block absolute left-0 bottom-[10%] z-10 w-[500px] md:w-[650px] pointer-events-none will-change-transform"
          style={{ marginLeft: '-15%' }}
        />

        {/* Layer 3: Right Cloud Parallax (scale-x-[-1]) */}
        <img
          ref={rightCloudRef}
          src="https://soft-zoom-63098134.figma.site/_assets/v11/0d6dfd3f90b930f21726f2ed56a3320d79b7a797.png"
          alt="Atmospheric Cloud"
          className="hidden sm:block absolute right-0 bottom-[15%] z-10 w-[500px] md:w-[650px] pointer-events-none will-change-transform"
          style={{ marginRight: '-20%' }}
        />

        {/* Layer 4: Central Editorial Statement Content */}
        <div className="relative z-20 max-w-4xl mx-auto text-center space-y-6 md:space-y-8 px-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-200 font-inter font-semibold block">
            02 · MUNICIPAL SYSTEM INTELLIGENCE
          </span>

          {/* Main Statement in Instrument Serif */}
          <blockquote className="font-instrument text-white text-2xl sm:text-3xl md:text-5xl lg:text-[54px] leading-[1.3] md:leading-[1.35] tracking-tight text-glow">
            &ldquo;When the rain changes, PRAVAH changes with it. We bring drainage network capacity, real-time meteorological precipitation, and geotagged civic dispatches into one live picture of Delhi.&rdquo;
          </blockquote>

          {/* Attribution */}
          <div className="pt-2 text-white/85 text-sm md:text-base tracking-wide font-inter">
            Municipal Corporation of Delhi · Urban Flood Control
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <Link to="/dashboard" className="motionsites-btn-white no-underline text-xs">
              <span>Enter City Intelligence</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
