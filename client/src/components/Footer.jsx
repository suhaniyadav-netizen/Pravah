import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition-colors duration-300 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Left Side: Pravah with Name and Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-decoration-none group select-none">
          <img
            src="/logo.png"
            alt="Pravah"
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-contain shrink-0 ring-1 ring-black/10 dark:ring-white/20 transition-transform group-hover:scale-105"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-limelight text-base sm:text-lg tracking-wider uppercase text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              PRAVAH
            </span>
            <span className="font-heading text-xs font-semibold text-[var(--brand)] opacity-85">
              (प्रवाह)
            </span>
          </div>
        </Link>

        {/* Right Side: Dynamic Yearly Copyright & Author Attribution with Repo Link */}
        <div className="text-[var(--text-muted)] text-[11px] sm:text-xs font-normal tracking-wide text-center sm:text-right">
          © {currentYear} Designed and Engineered by{' '}
          <a
            href="https://github.com/suhaniyadav-netizen/Pravah"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors no-underline"
          >
            Suhani Yadav
          </a>
        </div>

      </div>
    </footer>
  );
}
