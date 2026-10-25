import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Shield, Activity, Radio, Droplets, MapPin, Compass } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition-colors duration-300">
      {/* ── Main Institutional Header & Links Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">

          {/* Col 1: Brand & Municipal Jurisdiction (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="font-limelight text-2xl tracking-wider text-[var(--text-primary)] uppercase select-none">
                PRAVAH
              </span>
              <span className="font-serif text-sm font-semibold text-[var(--brand)] px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 select-none">
                (प्रवाह)
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md">
              Delhi Municipal Urban Flood Risk Intelligence & Hydrological Decision Support System. Developed for the Municipal Corporation of Delhi (MCD) and Delhi Disaster Management Authority (DDMA), Govt. of NCT of Delhi.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)]">
                <MapPin className="w-3 h-3 text-[var(--brand)]" />
                <span>28.6139° N, 77.2090° E</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)]">
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>SRID 4326 PostGIS</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>250 Wards Monitored</span>
              </span>
            </div>
          </div>

          {/* Col 2: Operational Command Links (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Operational Command
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/report"
                  className="text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors no-underline flex items-center gap-1.5"
                >
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span>Citizen Waterlogging Report</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors no-underline flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Real-Time Risk Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/incidents"
                  className="text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors no-underline flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>Incident Command & Dispatch</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/analytics"
                  className="text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors no-underline flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Vulnerability Analytics</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors no-underline flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Municipal Admin Command</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: 24/7 Hotlines & Disaster Support (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                24/7 Emergency Hotlines
              </h4>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Official municipal flood control centers and emergency dispatch for the National Capital Territory of Delhi:
            </p>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <a
                href="tel:1916"
                className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-soft)] border border-[var(--border)] transition-colors no-underline block"
              >
                <div className="text-[10px] text-[var(--text-muted)] uppercase">MCD Flood Desk</div>
                <div className="text-amber-500 font-bold text-sm mt-0.5">1916</div>
              </a>

              <a
                href="tel:1077"
                className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-soft)] border border-[var(--border)] transition-colors no-underline block"
              >
                <div className="text-[10px] text-[var(--text-muted)] uppercase">DDMA Disaster</div>
                <div className="text-rose-500 font-bold text-sm mt-0.5">1077</div>
              </a>

              <a
                href="tel:112"
                className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-soft)] border border-[var(--border)] transition-colors no-underline block"
              >
                <div className="text-[10px] text-[var(--text-muted)] uppercase">National Emergency</div>
                <div className="text-sky-400 font-bold text-sm mt-0.5">112</div>
              </a>

              <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] block">
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Yamuna Gauge</div>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">CWC Live</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Institutional Bottom Legal & Attribution Strip ── */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-center sm:text-left">
            <span>© 2026 Suhani Yadav</span>
            <span className="opacity-50">·</span>
            <span className="font-semibold text-[var(--text-primary)]">PRAVAH (प्रवाह)</span>
            <span className="opacity-50">·</span>
            <span>Municipal Corporation of Delhi (MCD) & DDMA NCT of Delhi</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="hidden md:inline text-[var(--text-muted)]">TLS 256-Bit Encrypted</span>
            <span className="hidden md:inline opacity-50">·</span>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors no-underline"
            >
              <Shield className="w-3 h-3 text-[var(--brand)]" />
              <span>Municipal Admin</span>
            </Link>
          </div>

        </div>
      </div>
    </footer>
  );
}
