import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Landing() {
  // Parallax QuoteSection Refs
  const quoteSectionRef = useRef(null);
  const leftCloudRef = useRef(null);
  const rightCloudRef = useRef(null);

  // Animation frame tracker
  const animationFrameId = useRef(null);
  const currentProgress = useRef(0);
  const currentCloudX = useRef(-200);
  const currentCloudY = useRef(0);
  const currentCloudOpacity = useRef(0);

  useEffect(() => {
    // Parallax animation loop with lerp smoothing for clouds
    const lerp = (start, end, factor) => start + (end - start) * factor;

    const updateParallax = () => {
      if (!quoteSectionRef.current) {
        animationFrameId.current = requestAnimationFrame(updateParallax);
        return;
      }

      const rect = quoteSectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || 800;

      const rawProgress = (windowHeight - rect.top) / (windowHeight + rect.height);
      const targetProgress = Math.max(0, Math.min(1, rawProgress));
      currentProgress.current = lerp(currentProgress.current, targetProgress, 0.08);

      const p = currentProgress.current;

      // Clouds: smoothly slide in from -200px / +200px on X when in view (progress 0.10 - 0.95)
      let targetCloudX = -200;
      let targetOpacity = 0;
      if (p >= 0.10 && p <= 0.95) {
        targetCloudX = 0;
        targetOpacity = 0.75;
      }

      const targetCloudY = p * -45;
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

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] transition-colors duration-300 font-inter">

      {/* Global Fixed Navbar */}
      <Navbar />

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: HERO — FULL VIEWPORT LIVE EARTH
          ───────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[100vh] w-full overflow-hidden flex flex-col justify-between pt-20">

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
          {/* Dual-Theme Atmospheric Overlays */}
          <div className="absolute inset-0 bg-black/40 dark:bg-black/50 light:bg-white/20 backdrop-blur-[0.5px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-black/25" />
        </div>

        {/* 2. Center Hero Editorial Content */}
        <div className="relative z-20 max-w-5xl mx-auto w-full text-center my-auto px-6 space-y-6 md:space-y-8 -mt-6 sm:-mt-10">
          {/* Eyebrow */}
          <div className="inline-block">
            <span className="text-xs md:text-sm uppercase tracking-[0.25em] text-[var(--brand)] font-inter font-semibold px-3 py-1 rounded-full liquid-glass-pill shadow-sm">
              DELHI · URBAN FLOOD INTELLIGENCE
            </span>
          </div>

          {/* Heading in Instrument Serif */}
          <h1 className="font-instrument text-white dark:text-white text-[44px] sm:text-7xl md:text-8xl lg:text-[108px] leading-[0.92] tracking-tight text-center text-glow">
            Know the risk.
            <br />
            <span className="italic font-normal text-cyan-200 dark:text-cyan-200">Before the water rises.</span>
          </h1>

          {/* Supporting Description */}
          <p className="text-white/85 dark:text-white/85 text-sm md:text-base text-center max-w-[620px] mx-auto font-inter font-normal leading-relaxed pt-1">
            Unified command for municipal engineers, disaster response officers, and citizens across the National Capital Territory.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/dashboard" className="motionsites-btn-white no-underline text-xs md:text-sm">
              <span>Explore Intelligence</span>
              <ArrowRight size={15} />
            </Link>
            <Link to="/report" className="motionsites-btn-ghost no-underline text-xs md:text-sm">
              <span>Report an Incident</span>
            </Link>
          </div>
        </div>

        {/* 3. Lower Hero Bar: Clean Coordinates + Scroll Cue */}
        <div className="relative z-20 max-w-7xl mx-auto w-full px-6 md:px-12 pb-8 flex items-center justify-between text-xs text-white/70">
          {/* Delhi Geolocation Marker */}
          <div className="text-[11px] font-mono tracking-widest uppercase">
            28.6139° N · 77.2090° E · 250 WARDS
          </div>

          {/* Scroll Cue */}
          <a
            href="#quote-section"
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors no-underline cursor-pointer"
          >
            <span className="text-[10px] uppercase tracking-widest font-semibold">EXPLORE</span>
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
        className="relative h-screen min-h-[100vh] w-full overflow-hidden flex items-center justify-center px-6 md:px-12 border-t border-[var(--border)]"
        style={{
          background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-soft) 40%, var(--bg-subtle) 75%, var(--bg) 100%)',
        }}
      >
        {/* Layer 1: Left Cloud Parallax */}
        <img
          ref={leftCloudRef}
          src="https://soft-zoom-63098134.figma.site/_assets/v11/0d6dfd3f90b930f21726f2ed56a3320d79b7a797.png"
          alt="Atmospheric Cloud"
          className="hidden sm:block absolute left-0 bottom-[10%] z-10 w-[450px] md:w-[600px] pointer-events-none will-change-transform opacity-0"
          style={{ marginLeft: '-12%' }}
        />

        {/* Layer 2: Right Cloud Parallax (scale-x-[-1]) */}
        <img
          ref={rightCloudRef}
          src="https://soft-zoom-63098134.figma.site/_assets/v11/0d6dfd3f90b930f21726f2ed56a3320d79b7a797.png"
          alt="Atmospheric Cloud"
          className="hidden sm:block absolute right-0 bottom-[15%] z-10 w-[450px] md:w-[600px] pointer-events-none will-change-transform opacity-0"
          style={{ marginRight: '-15%' }}
        />

        {/* Layer 3: Central Editorial Statement Content */}
        <div className="relative z-20 max-w-4xl mx-auto text-center space-y-6 md:space-y-8 px-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[var(--brand)] font-inter font-semibold block">
            02 · MUNICIPAL SYSTEM INTELLIGENCE
          </span>

          {/* Main Statement in Instrument Serif */}
          <blockquote className="font-instrument text-[var(--text-primary)] text-2xl sm:text-3xl md:text-5xl lg:text-[54px] leading-[1.3] md:leading-[1.35] tracking-tight">
            &ldquo;When the rain changes, PRAVAH changes with it. We bring drainage network capacity, real-time meteorological precipitation, and geotagged civic dispatches into one live picture of Delhi.&rdquo;
          </blockquote>

          {/* Attribution */}
          <div className="pt-2 text-[var(--text-secondary)] text-sm md:text-base tracking-wide font-inter">
            Municipal Corporation of Delhi · Urban Flood Control
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <Link to="/dashboard" className="motionsites-btn-white no-underline text-xs md:text-sm">
              <span>Enter City Intelligence</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
