import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

/**
 * SmallFooter — Minimal, unobtrusive single-line footer dedicated for internal operational pages.
 */
export default function SmallFooter() {
  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-elevated)] py-3 px-4 sm:px-8 text-xs text-[var(--text-muted)] select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 font-inter">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Pravah"
            className="w-4 h-4 rounded-full object-contain shrink-0"
          />
          <span className="font-limelight text-sm tracking-wider text-[var(--text-primary)] uppercase">
            PRAVAH
          </span>
          <span className="text-[var(--border-strong)]">·</span>
          <span className="text-[11px] text-[var(--text-secondary)]">Delhi Municipal Flood Intelligence</span>
          <span className="hidden md:inline text-[var(--border-strong)]">·</span>
          <span className="hidden md:inline text-[11px] font-mono text-[var(--text-muted)]">28.6139° N 77.2090° E</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Grid Live</span>
          </div>
          <Link
            to="/admin"
            className="text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors inline-flex items-center gap-1 no-underline"
          >
            <Lock size={11} />
            <span>Admin</span>
          </Link>
          <span className="text-[var(--text-muted)]">© {new Date().getFullYear()} MCD</span>
        </div>
      </div>
    </footer>
  );
}
