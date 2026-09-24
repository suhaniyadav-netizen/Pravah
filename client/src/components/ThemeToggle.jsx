import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return document.documentElement.dataset.theme || 'dark';
  });

  useEffect(() => {
    const active = document.documentElement.dataset.theme || 'dark';
    setTheme(active);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('pravah-theme', next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] backdrop-blur-md transition-all text-xs font-medium cursor-pointer"
    >
      <span className="w-5 h-5 grid place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--brand)]">
        {theme === 'dark' ? <Moon size={13} strokeWidth={2.2} /> : <Sun size={13} strokeWidth={2.2} />}
      </span>
      {!compact && <span className="capitalize">{theme}</span>}
    </button>
  );
}
