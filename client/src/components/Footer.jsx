import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        
        {/* Top Tier: Brand Identity, Mission & Quick Navigation Links */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]/60">
          
          {/* Brand Identity */}
          <div className="space-y-1.5 max-w-md">
            <Link to="/" className="flex items-center gap-2.5 text-decoration-none group select-none">
              <img
                src="/logo.png"
                alt="Pravah"
                className="w-7 h-7 rounded-full object-contain shrink-0 ring-1 ring-white/20"
              />
              <span className="font-limelight text-lg tracking-wider uppercase text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                PRAVAH
              </span>
              <span className="font-serif text-xs font-semibold text-[var(--brand)] opacity-85">
                (प्रवाह)
              </span>
            </Link>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Delhi Municipal Corporation (MCD) & DDMA Unified Flood Monitoring, Risk Intelligence & Operational Early Warning System.
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--text-secondary)]">
            <Link to="/dashboard" className="hover:text-[var(--brand)] transition-colors no-underline">
              Risk Map
            </Link>
            <Link to="/report" className="hover:text-[var(--brand)] transition-colors no-underline">
              Citizen Portal
            </Link>
            <Link to="/incidents" className="hover:text-[var(--brand)] transition-colors no-underline">
              Incident Command
            </Link>
            <Link to="/analytics" className="hover:text-[var(--brand)] transition-colors no-underline">
              Hydrology Analytics
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-[var(--brand)] hover:underline no-underline font-medium"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Municipal Admin</span>
            </Link>
          </div>

        </div>

        {/* Bottom Tier: Copyright, Security & Coordinates */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] font-mono text-[11px]">
          <div>
            <span>© 2026 Suhani Yadav · Municipal Corporation of Delhi & DDMA NCT of Delhi</span>
          </div>

          <div className="flex items-center gap-3">
            <span>28.6139° N, 77.2090° E</span>
            <span className="opacity-40">·</span>
            <span>TLS 256-Bit Encrypted</span>
            <span className="opacity-40">·</span>
            <span className="text-emerald-500 font-semibold">PostGIS Grid Online</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
