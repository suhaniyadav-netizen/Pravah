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
      className="inline-flex items-center justify-center w-9 h-9 rounded-full liquid-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
    >
      {theme === 'dark' ? (
        <Sun size={15} strokeWidth={1.75} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
      ) : (
        <Moon size={15} strokeWidth={1.75} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
      )}
    </button>
  );
}
