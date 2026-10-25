import React, { useState, useEffect, useMemo } from 'react';
import {
  Waves, AlertTriangle, ShieldCheck, Gauge, ArrowUpRight,
  TrendingUp, TrendingDown, RefreshCw, Sliders, Droplets,
  Activity, Compass, Radio, ChevronRight, Eye, ShieldAlert,
  ArrowDownCircle, Anchor
} from 'lucide-react';

/**
 * YamunaRiverGauge — High-Fidelity Hydrological River Cross-Section & Dynamic Flood Simulator.
 * Realistic Delhi Old Railway Bridge (ORB) Loha Pul cutaway, graduated staff gauge,
 * storm outfall flap-gate backflow mechanics, and hydrodynamic wave velocity rendering.
 */

export const GAUGE_BENCHMARKS = {
  MIN_BED: 202.50,
  SAFE_BASELINE: 204.00,
  WARNING_MARK: 205.33,
  DANGER_MARK: 205.53,
  RECORD_CREST_2023: 208.66,
};

export default function YamunaRiverGauge({
  initialWaterLevel = 204.85,
  onWaterLevelChange = null,
  showSimulationControls = true,
  className = '',
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedLevel, setSimulatedLevel] = useState(initialWaterLevel);
  const [waveOffset, setWaveOffset] = useState(0);

  // Sync with initialWaterLevel prop
  useEffect(() => {
    if (!isSimulating) {
      setSimulatedLevel(initialWaterLevel);
    }
  }, [initialWaterLevel, isSimulating]);

  useEffect(() => {
    if (onWaterLevelChange) {
      onWaterLevelChange(simulatedLevel);
    }
  }, [simulatedLevel, onWaterLevelChange]);

  // Hydrological physics model
  const metrics = useMemo(() => {
    const level = Number(simulatedLevel);
    const dangerDiff = level - GAUGE_BENCHMARKS.DANGER_MARK;
    const warningDiff = level - GAUGE_BENCHMARKS.WARNING_MARK;

    let stage = 'SAFE';
    let statusText = 'SAFE DISCHARGE';
    let theme = 'safe'; // 'safe' | 'warning' | 'danger' | 'critical'

    if (level >= 207.00) {
      stage = 'CATASTROPHIC';
      statusText = 'RECORD CREST / RING RD BREACH';
      theme = 'critical';
    } else if (level >= GAUGE_BENCHMARKS.DANGER_MARK) {
      stage = 'DANGER';
      statusText = 'DANGER MARK BREACHED';
      theme = 'danger';
    } else if (level >= GAUGE_BENCHMARKS.WARNING_MARK) {
      stage = 'WARNING';
      statusText = 'WARNING STAGE SURGE';
      theme = 'warning';
    } else if (level >= 204.50) {
      stage = 'ELEVATED';
      statusText = 'MONSOON BASELINE SWELL';
      theme = 'elevated';
    }

    // Normalized cross-section water height (20% at bed 202.50m up to 94% at 208.66m)
    const normalizedHeight = Math.min(
      Math.max(
        ((level - GAUGE_BENCHMARKS.MIN_BED) / (GAUGE_BENCHMARKS.RECORD_CREST_2023 - GAUGE_BENCHMARKS.MIN_BED)) * 100,
        18
      ),
      95
    );

    // Flow velocity (m/s) modeled on hydraulic gradient
    const baselineVelocity = 1.35;
    const velocity = (baselineVelocity + Math.max(0, level - GAUGE_BENCHMARKS.SAFE_BASELINE) * 0.65).toFixed(2);

    // Barrage release (cusecs)
    let dischargeCusecs;
    if (level < 204.50) {
      dischargeCusecs = Math.round(24000 + (level - 203.0) * 8000);
    } else if (level < GAUGE_BENCHMARKS.WARNING_MARK) {
      dischargeCusecs = Math.round(48000 + (level - 204.50) * 45000);
    } else if (level < GAUGE_BENCHMARKS.DANGER_MARK) {
      dischargeCusecs = Math.round(145000 + (level - GAUGE_BENCHMARKS.WARNING_MARK) * 280000);
    } else {
      dischargeCusecs = Math.round(210000 + (level - GAUGE_BENCHMARKS.DANGER_MARK) * 115000);
    }

    // River Depth
    const riverDepth = (level - GAUGE_BENCHMARKS.MIN_BED).toFixed(2);

    // Outfall flap gates status
    const isOutfallSubmerged = level >= 205.20;
    const isBackflowActive = level >= GAUGE_BENCHMARKS.WARNING_MARK;

    return {
      level,
      stage,
      statusText,
      theme,
      dangerDiff,
      warningDiff,
      normalizedHeight,
      velocity: Number(velocity),
      dischargeCusecs,
      riverDepth,
      isOutfallSubmerged,
      isBackflowActive,
    };
  }, [simulatedLevel]);

  // Smooth sinusoidal wave phase progression scaled dynamically by river velocity
  useEffect(() => {
    let animId;
    let lastTime = performance.now();
    const loop = (currentTime) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;
      const speedFactor = 0.08 + Math.max(0, (metrics.velocity || 1.35) - 1.2) * 0.05;
      setWaveOffset((prev) => (prev + delta * speedFactor) % 2000);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [metrics.velocity]);

  // Color schemes for water layers
  const colors = useMemo(() => {
    switch (metrics.theme) {
      case 'critical':
      case 'danger':
        return {
          accent: '#ef4444',
          waterTop: 'rgba(239, 68, 68, 0.52)',
          waterMid: 'rgba(220, 38, 38, 0.75)',
          waterDeep: 'rgba(153, 27, 27, 0.95)',
          waterGradient: 'linear-gradient(to bottom, #ef4444 0%, #dc2626 25%, #991b1b 65%, #450a0a 100%)',
          waveStroke: '#fecaca',
          glow: 'rgba(239, 68, 68, 0.40)',
          badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
          speedTag: 'text-rose-600 dark:text-rose-400',
        };
      case 'warning':
        return {
          accent: '#f59e0b',
          waterTop: 'rgba(245, 158, 11, 0.50)',
          waterMid: 'rgba(217, 119, 6, 0.75)',
          waterDeep: 'rgba(146, 64, 14, 0.95)',
          waterGradient: 'linear-gradient(to bottom, #f59e0b 0%, #d97706 25%, #92400e 65%, #451a03 100%)',
          waveStroke: '#fef3c7',
          glow: 'rgba(245, 158, 11, 0.35)',
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
          speedTag: 'text-amber-600 dark:text-amber-400',
        };
      case 'elevated':
        return {
          accent: '#0ea5e9',
          waterTop: 'rgba(14, 165, 233, 0.50)',
          waterMid: 'rgba(2, 132, 199, 0.75)',
          waterDeep: 'rgba(7, 89, 133, 0.95)',
          waterGradient: 'linear-gradient(to bottom, #0ea5e9 0%, #0284c7 25%, #0369a1 65%, #082f49 100%)',
          waveStroke: '#bae6fd',
          glow: 'rgba(14, 165, 233, 0.35)',
          badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400',
          speedTag: 'text-sky-600 dark:text-sky-400',
        };
      case 'safe':
      default:
        return {
          accent: '#06b6d4',
          waterTop: 'rgba(6, 182, 212, 0.52)',
          waterMid: 'rgba(14, 116, 144, 0.75)',
          waterDeep: 'rgba(15, 76, 129, 0.95)',
          waterGradient: 'linear-gradient(to bottom, #06b6d4 0%, #0284c7 25%, #0369a1 60%, #0c4a6e 100%)',
          waveStroke: '#a5f3fc',
          glow: 'rgba(6, 182, 212, 0.35)',
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
          speedTag: 'text-emerald-600 dark:text-emerald-400',
        };
    }
  }, [metrics.theme]);

  // Wave path generator with proper coordinate mapping
  const getWavePath = (amplitude, frequency, phase, baseHeight, width = 1200) => {
    const points = [];
    for (let x = 0; x <= width; x += 15) {
      const y = baseHeight + Math.sin((x * frequency + phase) * 0.015) * amplitude;
      points.push(`${x},${y.toFixed(1)}`);
    }
    return `M0,${baseHeight} L${points.join(' L')} L${width},160 L0,160 Z`;
  };

  return (
    <div className={`surface-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl transition-all duration-300 ${className}`}>
      
      {/* ── Command Header & Real-Time Status ───────────────────────────────── */}
      <div className="p-4 sm:p-5 bg-[var(--surface-elevated)] border-b border-[var(--border)] space-y-4">
        
        {/* Top Title Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-sm shrink-0">
              <Waves className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                  Yamuna River Hydrological Telemetry
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-soft)] text-[var(--text-muted)] border border-[var(--border)]">
                  OLD RAILWAY BRIDGE · CWC #YAM-01
                </span>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${colors.badgeBg} flex items-center gap-1`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  <span>{metrics.statusText}</span>
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Physical cross-section, bridge girder clearance, flow velocity, and municipal drainage backflow.
              </p>
            </div>
          </div>

          {/* Interactive Mode Toggle */}
          {showSimulationControls && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsSimulating(!isSimulating);
                  if (isSimulating) setSimulatedLevel(initialWaterLevel);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border shadow-xs ${
                  isSimulating
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'Simulation Active' : 'What-If Scrubber'}</span>
              </button>

              {isSimulating && (
                <button
                  onClick={() => setSimulatedLevel(initialWaterLevel)}
                  className="p-1.5 rounded-xl text-xs border border-[var(--border)] hover:bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Reset to live CWC baseline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Key Metrics Ribbon (5 Precision KPI Cells) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono">
          
          {/* 1. Water Level */}
          <div className="p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>WATER LEVEL (MSL)</span>
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="my-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-[var(--text-primary)]">
                {metrics.level.toFixed(2)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">m</span>
            </div>
            <div className="text-[10px]">
              {metrics.level >= GAUGE_BENCHMARKS.DANGER_MARK ? (
                <span className="text-rose-400 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{metrics.dangerDiff.toFixed(2)}m above Danger</span>
                </span>
              ) : metrics.level >= GAUGE_BENCHMARKS.WARNING_MARK ? (
                <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{metrics.warningDiff.toFixed(2)}m above Warning</span>
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">
                  {(GAUGE_BENCHMARKS.WARNING_MARK - metrics.level).toFixed(2)}m margin to Warning
                </span>
              )}
            </div>
          </div>

          {/* 2. Flow Speed / Velocity */}
          <div className="p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>FLOW VELOCITY</span>
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="my-1 flex items-baseline gap-1">
              <span className={`text-2xl font-black ${colors.speedTag}`}>
                {metrics.velocity.toFixed(2)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">m/s</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
              <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (metrics.velocity / 4.5) * 100)}%`,
                    backgroundColor: colors.accent,
                  }}
                />
              </div>
              <span className="text-[9px] shrink-0 font-bold">{Math.round((metrics.velocity * 3.6))} km/h</span>
            </div>
          </div>

          {/* 3. Water Depth */}
          <div className="p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>CHANNEL DEPTH</span>
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="my-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-[var(--text-primary)]">
                {metrics.riverDepth}
              </span>
              <span className="text-xs text-[var(--text-muted)]">m</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              Bed Elevation: 202.50m MSL
            </div>
          </div>

          {/* 4. Hathnikund Barrage Discharge */}
          <div className="p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>BARRAGE DISCHARGE</span>
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="my-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-[var(--text-primary)]">
                {metrics.dischargeCusecs.toLocaleString()}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">cfs</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] truncate">
              Transit: Yamunanagar → Delhi (~48h)
            </div>
          </div>

          {/* 5. Outfall Drainage Backflow Status */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-1 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>DRAIN BACKFLOW</span>
              <ArrowDownCircle className={`w-3.5 h-3.5 ${metrics.isBackflowActive ? 'text-rose-400' : 'text-emerald-400'}`} />
            </div>
            <div className="my-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                metrics.isBackflowActive
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : metrics.isOutfallSubmerged
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {metrics.isBackflowActive ? 'Flap Gates Shut' : metrics.isOutfallSubmerged ? 'Gravity Impeded' : 'Normal Gravity'}
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] truncate">
              Kashmere Gate · ITO Drains
            </div>
          </div>

        </div>

        {/* ── Interactive Scrubber Slider Bar (Shown When Active) ── */}
        {isSimulating && (
          <div className="p-4 rounded-xl bg-[var(--surface-soft)] border border-amber-500/30 space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-[var(--text-primary)]">What-If River Stage Scrubber:</span>
                <span className="text-amber-400 font-bold">{metrics.level.toFixed(2)} m</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">
                Drag to simulate river swell, flow velocity, and bridge submergence
              </span>
            </div>

            <input
              type="range"
              min="203.00"
              max="208.66"
              step="0.05"
              value={simulatedLevel}
              onChange={(e) => setSimulatedLevel(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2.5 bg-[var(--border)] rounded-lg appearance-none"
            />

            {/* Quick Benchmark Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
              <span className="text-[var(--text-muted)] mr-1">Bench Targets:</span>
              <button
                type="button"
                onClick={() => setSimulatedLevel(203.80)}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  simulatedLevel === 203.80
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Dry Base (203.80m)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedLevel(204.85)}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  simulatedLevel === 204.85
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Live Gauge (204.85m)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedLevel(GAUGE_BENCHMARKS.WARNING_MARK)}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  simulatedLevel === GAUGE_BENCHMARKS.WARNING_MARK
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                ⚠️ Warning Mark (205.33m)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedLevel(GAUGE_BENCHMARKS.DANGER_MARK)}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  simulatedLevel === GAUGE_BENCHMARKS.DANGER_MARK
                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🚨 Danger Mark (205.53m)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedLevel(GAUGE_BENCHMARKS.RECORD_CREST_2023)}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  simulatedLevel === GAUGE_BENCHMARKS.RECORD_CREST_2023
                    ? 'bg-red-700 text-white border-red-700 shadow-sm'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                💥 2023 Historic Peak (208.66m)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Visual Hydrological Channel Cross-Section Viewport ──────────────── */}
      <div className="relative w-full h-64 sm:h-72 bg-gradient-to-b from-[#e0f2fe] via-[#bae6fd] to-[#93c5fd] dark:from-[#06101E] dark:via-[#09182C] dark:to-[#040A14] overflow-hidden select-none border-t border-[var(--border)] transition-colors duration-500">
        
        {/* Atmospheric Sky Backdrop with Distant Delhi Skyline Silhouette */}
        <div className="absolute inset-0 pointer-events-none opacity-25 dark:opacity-20 transition-opacity">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
            {/* Distant Trees & Ghats */}
            <path d="M0,140 Q150,135 300,138 T600,135 T1000,140 L1000,300 L0,300 Z" className="fill-[#0284c7] dark:fill-[#0f2b48]" />
          </svg>
        </div>

        {/* ── Old Railway Bridge (Loha Pul) Double-Decker Span, Deep Submerged Masonry Piers & Live Traffic ── */}
        <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden opacity-45 dark:opacity-35 transition-opacity duration-500">
          <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
            <defs>
              {/* Linear Gradients for Masonry Pier Lighting & Watermark Wash */}
              <linearGradient id="pierMasonryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="25%" stopColor="#64748b" />
                <stop offset="70%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id="pierSubmergedWash" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(71, 85, 105, 0.15)" />
                <stop offset="50%" stopColor="rgba(51, 65, 85, 0.35)" />
                <stop offset="100%" stopColor="rgba(30, 41, 59, 0.55)" />
              </linearGradient>
              
              {/* Vehicle Headlight & Taillight Beams */}
              <linearGradient id="headlightEast" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(254, 240, 138, 0.95)" />
                <stop offset="35%" stopColor="rgba(254, 240, 138, 0.45)" />
                <stop offset="100%" stopColor="rgba(254, 240, 138, 0)" />
              </linearGradient>
              <linearGradient id="headlightWest" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(254, 240, 138, 0.95)" />
                <stop offset="35%" stopColor="rgba(254, 240, 138, 0.45)" />
                <stop offset="100%" stopColor="rgba(254, 240, 138, 0)" />
              </linearGradient>
            </defs>

            {/* 1. Deep Submerged Stone Masonry Piers (Plunging from y=48 down to y=286 into the riverbed) */}
            {[220, 500, 780, 1020].map((pierX, idx) => (
              <g key={`pier-${idx}`}>
                {/* Caisson Bed Foundation Footing (Embedded in Alluvial Riverbed) */}
                <rect
                  x={pierX - 28}
                  y="256"
                  width="56"
                  height="30"
                  rx="3"
                  className="fill-slate-600/70 dark:fill-slate-800/60 stroke-slate-500/50 dark:stroke-slate-700/50"
                  strokeWidth="1.5"
                />
                {/* Stepped Caisson Base Shelf */}
                <rect
                  x={pierX - 24}
                  y="244"
                  width="48"
                  height="12"
                  rx="2"
                  className="fill-slate-500/60 dark:fill-slate-700/60 stroke-slate-500/50 dark:stroke-slate-700/50"
                  strokeWidth="1"
                />

                {/* Main Pier Column Shaft (Extending from Bridge Deck at y=48 all the way down) */}
                <rect
                  x={pierX - 19}
                  y="48"
                  width="38"
                  height="200"
                  fill="url(#pierMasonryGrad)"
                  className="stroke-slate-500/40 dark:stroke-slate-600/40"
                  strokeWidth="1"
                  rx="2"
                />

                {/* Submerged Silt & Watermark Algae Gradient Overlay */}
                <rect
                  x={pierX - 19}
                  y="100"
                  width="38"
                  height="148"
                  fill="url(#pierSubmergedWash)"
                />

                {/* Cutwater Arch Wedge (Hydrodynamic starling pointed upstream to deflect flood currents) */}
                <path
                  d={`M${pierX - 19},130 L${pierX},158 L${pierX + 19},130 Z`}
                  className="fill-slate-600/60 dark:fill-slate-800/60 stroke-slate-500/40"
                  strokeWidth="1"
                />
                <path
                  d={`M${pierX - 19},205 L${pierX},230 L${pierX + 19},205 Z`}
                  className="fill-slate-600/60 dark:fill-slate-850/60 stroke-slate-600/40"
                  strokeWidth="1"
                />

                {/* Ashlar Stone Masonry Course Seams (Authentic Victorian Loha Pul Stone Architecture) */}
                {[64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240].map((jointY) => (
                  <line
                    key={jointY}
                    x1={pierX - 18}
                    y1={jointY}
                    x2={pierX + 18}
                    y2={jointY}
                    stroke="rgba(203, 213, 225, 0.25)"
                    strokeWidth="1"
                  />
                ))}

                {/* Pier Cap / Truss Bearing Corbel Block */}
                <rect
                  x={pierX - 23}
                  y="44"
                  width="46"
                  height="8"
                  className="fill-slate-500/80 dark:fill-slate-600/80 stroke-slate-600/50"
                  strokeWidth="1.2"
                  rx="1"
                />

                {/* Distress & Flood Clearance Beacon */}
                <circle
                  cx={pierX}
                  cy="48"
                  r="3.5"
                  fill={metrics.stage === 'DANGER' || metrics.stage === 'CATASTROPHIC' ? '#ef4444' : metrics.stage === 'WARNING' ? '#f59e0b' : '#10b981'}
                  className={metrics.stage === 'DANGER' || metrics.stage === 'CATASTROPHIC' ? 'animate-ping' : ''}
                />
              </g>
            ))}

            {/* Central Pier Depth Gauge Markings (Graduated physical flood stage on Pier 2) */}
            <g opacity="0.7" className="font-mono text-[6px]">
              <line x1="517" y1="102" x2="523" y2="102" stroke="#ef4444" strokeWidth="1.5" />
              <text x="525" y="104" fill="#ef4444" fontWeight="bold">DGR</text>
              <line x1="517" y1="138" x2="522" y2="138" stroke="#f59e0b" strokeWidth="1.2" />
              <text x="524" y="140" fill="#f59e0b" fontWeight="bold">WRN</text>
              <line x1="517" y1="195" x2="522" y2="195" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="524" y="197" fill="#38bdf8">BAS</text>
            </g>

            {/* 2. Upper Tier: Heavy Steel Truss Framework (Pratt/Warren Through-Truss) */}
            {/* Top Chord Girder Beam */}
            <rect x="0" y="8" width="1200" height="4" className="fill-slate-700/80 dark:fill-slate-600/70" />
            <rect x="0" y="12" width="1200" height="2" className="fill-slate-600/80 dark:fill-slate-500/70" />
            {/* Mid Girder Divider Beam */}
            <rect x="0" y="32" width="1200" height="3" className="fill-slate-600/80 dark:fill-slate-600/70" />

            {/* Warren Triangular Steel Cross-Bracing across all 24 spans */}
            {Array.from({ length: 24 }).map((_, i) => (
              <g key={`truss-${i}`}>
                <line x1={i * 50} y1="32" x2={i * 50 + 25} y2="12" className="stroke-slate-600/70 dark:stroke-slate-400/60" strokeWidth="1.8" />
                <line x1={i * 50 + 25} y1="12" x2={(i + 1) * 50} y2="32" className="stroke-slate-600/70 dark:stroke-slate-400/60" strokeWidth="1.8" />
                <line x1={i * 50 + 25} y1="12" x2={i * 50 + 25} y2="32" className="stroke-slate-700/60 dark:stroke-slate-500/50" strokeWidth="1.2" />
                {/* Diagonal Counter-Braces */}
                <line x1={i * 50} y1="12" x2={(i + 1) * 50} y2="32" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="0.8" strokeDasharray="3,3" />
              </g>
            ))}

            {/* 3. Lower Tier: Two-Lane Vehicular Roadway Deck */}
            {/* Roadway Base Structural Girder */}
            <rect x="0" y="46" width="1200" height="6" className="fill-slate-700/80 dark:fill-slate-850/80" />
            {/* Roadway Asphalt Surface */}
            <rect x="0" y="42" width="1200" height="4" className="fill-slate-600/80 dark:fill-slate-750/80" />
            {/* Center Dashed Lane Divider Line */}
            <line x1="0" y1="44" x2="1200" y2="44" stroke="#facc15" strokeWidth="0.8" strokeDasharray="5,6" opacity="0.85" />
            {/* Upper Safety Railing / Balustrade */}
            <line x1="0" y1="38" x2="1200" y2="38" className="stroke-slate-400/70 dark:stroke-slate-500/60" strokeWidth="1" />
            {Array.from({ length: 60 }).map((_, rIdx) => (
              <line key={`rail-${rIdx}`} x1={rIdx * 20} y1="38" x2={rIdx * 20} y2="42" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="0.7" />
            ))}

            {/* Bridge Lamp Posts with Warm Atmospheric Cones at each pier */}
            {[220, 500, 780, 1020].map((lampX, lIdx) => (
              <g key={`lamp-${lIdx}`}>
                <line x1={lampX} y1="38" x2={lampX} y2="30" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx={lampX} cy="30" r="1.8" fill="#fef08a" />
                <polygon points={`${lampX - 12},46 ${lampX + 12},46 ${lampX},30`} fill="rgba(254, 240, 138, 0.08)" />
              </g>
            ))}

            {/* 4. Active Moving Vehicular Traffic Across Old Railway Bridge */}
            
            {/* ── Vehicle 1: Delhi Auto-Rickshaw (CNG Yellow & Green) · Eastbound ── */}
            <g className="bridge-vehicle-east-1">
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-50 0"
                to="1250 0"
                dur="26s"
                repeatCount="indefinite"
                begin="0s"
              />
              {/* Headlight Projection Beam */}
              <polygon points="20,41 55,39 55,44 20,43" fill="url(#headlightEast)" opacity="0.8" />
              {/* Auto Canopy (Yellow) */}
              <path d="M4,39 Q8,35 15,35 L19,38 L19,41 L3,41 Z" fill="#eab308" />
              {/* Auto Lower Cabin (Green) */}
              <rect x="3" y="39" width="16" height="3.5" rx="1" fill="#15803d" />
              {/* Front Windshield Glass */}
              <polygon points="15,36 19,38 18,40 14,40" fill="#bae6fd" opacity="0.9" />
              {/* Headlight bulb */}
              <circle cx="19.5" cy="40.5" r="1" fill="#fef08a" />
              {/* Taillight bulb */}
              <circle cx="2.8" cy="40.5" r="0.8" fill="#ef4444" />
              {/* Wheels */}
              <circle cx="6" cy="43.2" r="1.4" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
              <circle cx="16" cy="43.2" r="1.4" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
            </g>

            {/* ── Vehicle 2: White Delhi City Sedan / Taxi · Eastbound (Staggered) ── */}
            <g className="bridge-vehicle-east-2">
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-220 0"
                to="1250 0"
                dur="20s"
                repeatCount="indefinite"
                begin="-8s"
              />
              {/* Headlight Beam */}
              <polygon points="26,41.5 65,39 65,45 26,43.5" fill="url(#headlightEast)" opacity="0.85" />
              {/* Car Body Roof & Hood */}
              <path d="M3,41 L7,38 L18,38 L22,41 L26,41.5 L26,43 L2,43 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
              {/* Windows Glass */}
              <polygon points="8,39 12,39 12,41 7,41" fill="#0284c7" opacity="0.75" />
              <polygon points="13,39 18,39 20,41 13,41" fill="#0284c7" opacity="0.75" />
              {/* Headlight */}
              <rect x="25.5" y="41.2" width="1.5" height="1.6" fill="#fef08a" rx="0.5" />
              {/* Taillight */}
              <rect x="1.8" y="41.2" width="1" height="1.6" fill="#dc2626" rx="0.5" />
              {/* Wheels */}
              <circle cx="7" cy="43.5" r="1.5" fill="#1e293b" />
              <circle cx="21" cy="43.5" r="1.5" fill="#1e293b" />
            </g>

            {/* ── Vehicle 3: Commuter Compact SUV (Navy Blue) · Westbound ── */}
            <g className="bridge-vehicle-west-1">
              <animateTransform
                attributeName="transform"
                type="translate"
                from="1250 0"
                to="-60 0"
                dur="22s"
                repeatCount="indefinite"
                begin="-4s"
              />
              {/* Headlight Beam Westbound */}
              <polygon points="2,42 -40,39 -40,45 2,43.5" fill="url(#headlightWest)" opacity="0.85" />
              {/* SUV Roof Rack & Body */}
              <line x1="8" y1="36" x2="19" y2="36" stroke="#94a3b8" strokeWidth="0.6" />
              <path d="M2,42.5 L6,37 L19,37 L24,39.5 L25,43 L1,43 Z" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="0.5" />
              {/* Glass Windows */}
              <polygon points="7,38 12,38 12,40.5 5,40.5" fill="#93c5fd" opacity="0.8" />
              <polygon points="13,38 18,38 22,40.5 13,40.5" fill="#93c5fd" opacity="0.8" />
              {/* Headlights Westbound */}
              <rect x="0.8" y="41.5" width="1.5" height="1.5" fill="#fef08a" rx="0.4" />
              {/* Taillights Eastbound */}
              <rect x="24.5" y="41.2" width="1" height="1.6" fill="#ef4444" rx="0.4" />
              {/* Wheels */}
              <circle cx="6" cy="43.5" r="1.6" fill="#0f172a" />
              <circle cx="20" cy="43.5" r="1.6" fill="#0f172a" />
            </g>

            {/* ── Vehicle 4: DDMA / Flood Response Patrol Van with Strobe Siren · Westbound ── */}
            <g className="bridge-vehicle-west-2">
              <animateTransform
                attributeName="transform"
                type="translate"
                from="1250 0"
                to="-60 0"
                dur="17s"
                repeatCount="indefinite"
                begin="-12s"
              />
              {/* Headlight Beam Westbound */}
              <polygon points="2,42 -45,39 -45,45 2,43.5" fill="url(#headlightWest)" opacity="0.9" />
              {/* Flashing Roof Emergency Siren Beacon */}
              <circle cx="14" cy="35.5" r="2" fill="#f59e0b" style={{ animation: 'emergencyStrobeBeacon 0.7s infinite alternate' }} />
              <circle cx="14" cy="35.5" r="1" fill="#ef4444" />
              {/* Van Body (White with Emergency High-Vis Orange Stripe) */}
              <path d="M2,42 L5,37.5 L24,37.5 L25,43 L1,43 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.6" />
              <rect x="2" y="40.5" width="22" height="1.2" fill="#ea580c" />
              {/* Cab Windows */}
              <polygon points="5,38.5 10,38.5 10,40.5 4,40.5" fill="#38bdf8" opacity="0.85" />
              <rect x="12" y="38.5" width="5" height="2" fill="#38bdf8" opacity="0.75" />
              {/* Headlight */}
              <rect x="0.8" y="41.2" width="1.5" height="1.5" fill="#fef08a" rx="0.4" />
              {/* Taillight */}
              <rect x="24.5" y="41.2" width="1" height="1.5" fill="#dc2626" rx="0.4" />
              {/* Wheels */}
              <circle cx="6" cy="43.5" r="1.6" fill="#0f172a" stroke="#64748b" strokeWidth="0.5" />
              <circle cx="20" cy="43.5" r="1.6" fill="#0f172a" stroke="#64748b" strokeWidth="0.5" />
            </g>

            {/* 5. Emergency Traffic Suspension Protocol HUD on Bridge Railing */}
            {(metrics.stage === 'DANGER' || metrics.stage === 'CATASTROPHIC') && (
              <g className="animate-pulse">
                <rect x="420" y="24" width="360" height="14" rx="3" fill="rgba(153, 27, 27, 0.95)" stroke="#ef4444" strokeWidth="1.5" />
                <text x="600" y="34" fill="#ffffff" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="0.5">
                  ⚠️ TRAFFIC SUSPENDED · DANGER MARK 205.53m BREACHED
                </text>
              </g>
            )}

          </svg>
        </div>

        {/* ── River Embankment Levee Slopes (West & East) ── */}
        <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-36 bg-gradient-to-r from-slate-200/95 via-slate-100/80 to-transparent dark:from-[#0d1e30] dark:via-[#081524] dark:to-transparent pointer-events-none z-20 border-r border-dashed border-sky-600/30 dark:border-sky-500/20 flex flex-col justify-between p-3 font-mono text-[9px]">
          <div>
            <span className="text-sky-950 dark:text-[var(--brand)] font-bold block">WEST EMBANKMENT</span>
            <span className="text-slate-600 dark:text-[var(--text-muted)] block text-[8px]">Kashmere Gate / Ring Rd</span>
          </div>

          {/* Storm Drain Outfall Pipe Graphic (Kashmere Gate Outfall) */}
          <div className="relative p-2 rounded-xl bg-white/95 dark:bg-[#071320]/95 border border-slate-300 dark:border-sky-500/40 shadow-xs dark:shadow-[0_0_12px_rgba(14,165,233,0.18)] backdrop-blur-md">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2.5 h-2.5 rounded-full border border-sky-500/60 bg-sky-500/20 flex items-center justify-center shrink-0">
                <div className="w-1 h-1 rounded-full bg-cyan-400" />
              </div>
              <span className="text-[8.5px] font-bold text-slate-900 dark:text-cyan-200 block truncate">
                Drain #14 Outfall
              </span>
            </div>
            <span className={`text-[7.5px] font-bold uppercase px-1.5 py-0.5 rounded-md block border tracking-wider text-center ${
              metrics.isBackflowActive
                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-200 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
            }`}>
              {metrics.isBackflowActive ? 'Backflow Flap Shut' : 'Free Outfall'}
            </span>
          </div>

          <span className="text-slate-600 dark:text-sky-300/80 font-mono text-[8px] block">Invert: 204.10m MSL</span>
        </div>

        <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-36 bg-gradient-to-l from-slate-200/95 via-slate-100/80 to-transparent dark:from-[#0d1e30] dark:via-[#081524] dark:to-transparent pointer-events-none z-20 border-l border-dashed border-sky-600/30 dark:border-sky-500/20 flex flex-col justify-between p-3 text-right font-mono text-[9px]">
          <div>
            <span className="text-sky-950 dark:text-[var(--brand)] font-bold block">EAST EMBANKMENT</span>
            <span className="text-slate-600 dark:text-[var(--text-muted)] block text-[8px]">Trans-Yamuna Floodplain</span>
          </div>
          <span className="text-slate-600 dark:text-[var(--text-muted)] text-[8px]">Geeta Colony Bund</span>
        </div>

        {/* ── Calibrated Hydrographic Staff Gauge (Graduated Water Pole) ── */}
        <div className="absolute top-10 bottom-6 left-28 sm:left-40 w-10 sm:w-12 bg-amber-400 text-stone-900 font-mono font-black text-[9px] z-30 shadow-2xl border-2 border-stone-950 flex flex-col justify-between py-1 select-none pointer-events-none">
          {/* Ticks from 208.66m down to 202.50m */}
          <div className="flex items-center justify-between px-1 border-b border-black">
            <span>208.6</span>
            <span className="text-[7px]">MAX</span>
          </div>
          <div className="flex items-center justify-between px-1 border-b border-black text-rose-900 bg-rose-400/40">
            <span>205.5</span>
            <span className="text-[7px]">DGR</span>
          </div>
          <div className="flex items-center justify-between px-1 border-b border-black text-amber-900 bg-amber-200">
            <span>205.3</span>
            <span className="text-[7px]">WRN</span>
          </div>
          <div className="flex items-center justify-between px-1 border-b border-black text-emerald-950 bg-emerald-300/50">
            <span>204.0</span>
            <span className="text-[7px]">BAS</span>
          </div>
          <div className="flex items-center justify-between px-1 text-[8px]">
            <span>202.5</span>
            <span className="text-[7px]">BED</span>
          </div>
        </div>

        {/* ── Official Elevation Benchmark Guide Lines across Channel ── */}
        
        {/* Historic Record 2023 (208.66m) */}
        <div className="absolute top-[10%] left-24 sm:left-36 right-24 sm:right-36 flex items-center gap-2 pointer-events-none z-10">
          <div className="h-px flex-1 border-t border-dashed border-red-500/50" />
          <span className="font-mono text-[9px] font-semibold text-red-700 dark:text-red-400 bg-white/95 dark:bg-[#06101E]/90 px-2 py-0.5 rounded border border-red-500/40 shadow-xs">
            2023 Historic Peak: 208.66m
          </span>
          <div className="h-px flex-1 border-t border-dashed border-red-500/50" />
        </div>

        {/* Official Danger Mark (205.53m) */}
        <div className="absolute top-[34%] left-24 sm:left-36 right-24 sm:right-36 flex items-center gap-2 pointer-events-none z-20">
          <div className="h-px flex-1 border-t-2 border-dashed border-rose-500" />
          <span className="font-mono text-[9px] font-bold text-rose-950 dark:text-rose-200 bg-rose-100/95 dark:bg-rose-950/90 px-2.5 py-0.5 rounded border-2 border-rose-600 dark:border-rose-500 shadow-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>OFFICIAL DANGER MARK · 205.53m</span>
          </span>
          <div className="h-px flex-1 border-t-2 border-dashed border-rose-500" />
        </div>

        {/* Official Warning Mark (205.33m) */}
        <div className="absolute top-[46%] left-24 sm:left-36 right-24 sm:right-36 flex items-center gap-2 pointer-events-none z-20">
          <div className="h-px flex-1 border-t-2 border-dashed border-amber-500" />
          <span className="font-mono text-[9px] font-bold text-amber-950 dark:text-amber-200 bg-amber-100/95 dark:bg-amber-950/90 px-2.5 py-0.5 rounded border-2 border-amber-600 dark:border-amber-500 shadow-xs">
            WARNING MARK · 205.33m
          </span>
          <div className="h-px flex-1 border-t-2 border-dashed border-amber-500" />
        </div>

        {/* ── Actual Real Flowing River Water (Hydrodynamic Wave Layers) ── */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out z-25"
          style={{
            height: `${metrics.normalizedHeight}%`,
            boxShadow: `0 -14px 45px ${colors.glow}`,
          }}
        >
          {/* Hydraulic Cutwater Foam & Wake Eddies at Submerged Bridge Piers */}
          {[18.33, 41.67, 65, 85].map((pierPct, pIdx) => (
            <div
              key={`wake-${pIdx}`}
              className="absolute -top-2.5 -translate-x-1/2 pointer-events-none z-30"
              style={{ left: `${pierPct}%` }}
            >
              {/* V-Bow Churning Wake Wave against Stone Pier */}
              <div className="w-12 h-3 border-b-2 border-white/90 dark:border-cyan-100 rounded-full blur-[0.5px] shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
              <div className="w-6 h-1.5 mx-auto -mt-1 bg-white/60 dark:bg-cyan-200/70 rounded-full blur-[1px]" />
            </div>
          ))}

          {/* Surface Float / Water Level Telemetry Indicator */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 dark:bg-[#08182B]/95 border border-sky-400/50 shadow-xl font-mono text-[11px] text-white">
            <Anchor className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-black text-sky-300">{metrics.level.toFixed(2)} m</span>
            <span className="text-slate-400">|</span>
            <span className="font-semibold text-emerald-400">{metrics.velocity.toFixed(2)} m/s flow</span>
          </div>

          {/* Floating CWC Telemetry Buoy */}
          <div
            className="absolute -top-7 right-44 sm:right-64 z-35 pointer-events-none transition-transform"
            style={{
              transform: `translateY(${Math.sin(waveOffset * 0.05) * 5}px) rotate(${Math.sin(waveOffset * 0.03) * 6}deg)`,
            }}
          >
            <div className="w-5 h-7 flex flex-col items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mb-0.5" />
              <div className="w-4 h-4 rounded-full bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center text-[7px] font-bold text-stone-950">
                CWC
              </div>
              <div className="w-1 h-2 bg-stone-700" />
            </div>
          </div>

          {/* SVG Animated Flowing Wave Streamlines */}
          <div className="relative w-full h-full overflow-hidden">
            
            {/* Wave Layer 1: Deep Backwater Current */}
            <svg
              className="absolute -top-7 left-0 w-full h-24 pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 1200 160"
            >
              <path
                d={getWavePath(10, 1.1, waveOffset * 0.5, 25)}
                fill={colors.waterDeep}
              />
            </svg>

            {/* Wave Layer 2: Mid Silt Turbulence */}
            <svg
              className="absolute -top-8 left-0 w-full h-26 pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 1200 160"
            >
              <path
                d={getWavePath(14, 1.6, waveOffset * 0.9 + 70, 30)}
                fill={colors.waterMid}
              />
            </svg>

            {/* Wave Layer 3: Surface Water Froth & Foam Crests */}
            <svg
              className="absolute -top-9 left-0 w-full h-28 pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 1200 160"
            >
              <path
                d={getWavePath(18, 2.2, waveOffset * 1.4 + 150, 36)}
                fill={colors.waterTop}
                stroke={colors.waveStroke}
                strokeWidth="3.5"
              />
            </svg>

            {/* Deep Water Column Gradient */}
            <div
              className="absolute top-8 bottom-0 left-0 right-0 pointer-events-none"
              style={{
                background: colors.waterGradient,
              }}
            />

            {/* ── High-Visibility Rushing Surface Rapids & Current Streamlines ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90">
              <div
                className="w-[200%] h-full flex"
                style={{
                  animation: `riverStreamContinuous ${Math.max(1.6, 7.5 / (metrics.velocity || 1.35)).toFixed(2)}s linear infinite`,
                }}
              >
                {/* Loop Segment 1 */}
                <div className="w-1/2 h-full relative">
                  {/* Surface Rapid Foaming Streaks */}
                  <div className="absolute top-3 left-6 w-36 sm:w-56 h-1 rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                  <div className="absolute top-6 left-72 w-48 sm:w-80 h-1.5 rounded-full bg-gradient-to-r from-transparent via-white/95 to-transparent shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
                  <div className="absolute top-4 right-20 w-44 sm:w-64 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-100 to-transparent shadow-[0_0_6px_rgba(165,243,252,0.9)]" />

                  {/* Mid-Depth Current Ribbons */}
                  <div className="absolute top-12 left-24 w-60 sm:w-96 h-1 rounded-full bg-gradient-to-r from-transparent via-white/80 dark:via-cyan-200/80 to-transparent shadow-xs" />
                  <div className="absolute top-16 left-80 w-52 sm:w-80 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-200/90 dark:via-cyan-300/80 to-transparent" />
                  <div className="absolute top-20 right-36 w-48 sm:w-72 h-1 rounded-full bg-gradient-to-r from-transparent via-white/75 dark:via-cyan-200/70 to-transparent" />

                  {/* Deeper Channel Current Streaks */}
                  <div className="absolute top-28 left-16 w-72 sm:w-[420px] h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/60 dark:via-cyan-400/60 to-transparent" />
                  <div className="absolute top-36 left-96 w-64 sm:w-[380px] h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/65 dark:via-cyan-300/60 to-transparent" />
                  <div className="absolute top-32 right-10 w-40 sm:w-64 h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/50 dark:via-cyan-400/50 to-transparent" />
                </div>

                {/* Loop Segment 2 (Seamless Infinite Wrap) */}
                <div className="w-1/2 h-full relative">
                  <div className="absolute top-3 left-6 w-36 sm:w-56 h-1 rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                  <div className="absolute top-6 left-72 w-48 sm:w-80 h-1.5 rounded-full bg-gradient-to-r from-transparent via-white/95 to-transparent shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
                  <div className="absolute top-4 right-20 w-44 sm:w-64 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-100 to-transparent shadow-[0_0_6px_rgba(165,243,252,0.9)]" />

                  <div className="absolute top-12 left-24 w-60 sm:w-96 h-1 rounded-full bg-gradient-to-r from-transparent via-white/80 dark:via-cyan-200/80 to-transparent shadow-xs" />
                  <div className="absolute top-16 left-80 w-52 sm:w-80 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-200/90 dark:via-cyan-300/80 to-transparent" />
                  <div className="absolute top-20 right-36 w-48 sm:w-72 h-1 rounded-full bg-gradient-to-r from-transparent via-white/75 dark:via-cyan-200/70 to-transparent" />

                  <div className="absolute top-28 left-16 w-72 sm:w-[420px] h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/60 dark:via-cyan-400/60 to-transparent" />
                  <div className="absolute top-36 left-96 w-64 sm:w-[380px] h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/65 dark:via-cyan-300/60 to-transparent" />
                  <div className="absolute top-32 right-10 w-40 sm:w-64 h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/50 dark:via-cyan-400/50 to-transparent" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* River Bed Alluvial Silt Base Foundation */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#5c442e] dark:bg-[#0a0f18] border-t border-[#78593a] dark:border-stone-800 flex items-center justify-between px-4 text-[8px] font-mono text-amber-100 dark:text-stone-400 select-none z-30 transition-colors">
          <span>YAMUNA ALLUVIAL SILT BED (202.50m MSL)</span>
          <span>DISCHARGE CAPACITY: 4,00,000 CFS</span>
        </div>

      </div>

      {/* ── Tactical River Basin Footer Bar ─────────────────────────────────── */}
      <div className="p-3.5 bg-[var(--surface-elevated)] border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${metrics.level >= GAUGE_BENCHMARKS.DANGER_MARK ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
          <span>Yamuna Stage Gauge Active · Sampling Rate 1 Hz</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>GIRDER CLEARANCE: <strong className="text-[var(--text-primary)]">{(GAUGE_BENCHMARKS.RECORD_CREST_2023 - metrics.level).toFixed(2)}m</strong></span>
          <span>·</span>
          <span>BARRAGE INFLOW: <strong className="text-[var(--text-primary)]">{metrics.dischargeCusecs.toLocaleString()} cfs</strong></span>
        </div>
      </div>

    </div>
  );
}
