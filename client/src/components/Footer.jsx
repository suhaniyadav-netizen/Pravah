import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        
        {/* Left Side: Copyright, Brand (with Hindi), and Authority */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-center sm:text-left">
          <span>© 2026 Suhani Yadav</span>
          <span className="opacity-50">·</span>
          <span className="font-semibold text-[var(--text-primary)]">PRAVAH (प्रवाह)</span>
          <span className="opacity-50">·</span>
          <span>Municipal Corporation of Delhi (MCD) & DDMA NCT of Delhi</span>
        </div>

        {/* Right Side: Security & Admin Link */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-[var(--text-muted)]">TLS 256-Bit Encrypted</span>
          <span className="opacity-50">·</span>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors no-underline font-sans font-medium"
          >
            <Shield className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span>Municipal Admin</span>
          </Link>
        </div>

      </div>
    </footer>
  );
}
