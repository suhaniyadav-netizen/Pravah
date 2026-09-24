import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return document.documentElement.dataset.theme || localStorage.getItem('pravah-theme') || 'dark';
  });

  useEffect(() => {
    const handleSync = () => {
      const active = document.documentElement.dataset.theme || localStorage.getItem('pravah-theme') || 'dark';
      setTheme(active);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('themechange', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('themechange', handleSync);
    };
  }, []);

  const toggleTheme = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('pravah-theme', next);
    } catch {
      // Ignore storage quota errors
    }
    setTheme(next);
    window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full liquid-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)] transition-all cursor-pointer shadow-sm"
    >
      {theme === 'dark' ? (
        <Sun size={16} strokeWidth={1.8} className="text-amber-300 hover:text-amber-200 transition-colors" />
      ) : (
        <Moon size={16} strokeWidth={1.8} className="text-sky-700 hover:text-sky-900 transition-colors" />
      )}
    </button>
  );
}
