import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import CitizenPortal from './pages/CitizenPortal';
import Dashboard from './pages/Dashboard';
import WardDetail from './pages/WardDetail';
import IncidentCommand from './pages/IncidentCommand';
import Simulator from './pages/Simulator';
import Analytics from './pages/Analytics';
import AdminPortal from './pages/AdminPortal';

/**
 * Initializes and syncs the theme preference with localStorage and system setting.
 */
function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem('pravah-theme');
    const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const activeTheme = saved || system;
    document.documentElement.dataset.theme = activeTheme;
  }, []);

  return null;
}

/**
 * AppLayout renders the unified Navbar and operational footer for internal intelligence pages.
 */
function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[var(--bg)] text-[var(--text-primary)] transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/report" element={<CitizenPortal />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wards/:id" element={<WardDetail />} />
          <Route path="/incidents" element={<IncidentCommand />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<AdminPortal />} />
        </Routes>
      </main>
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-6 text-center text-xs text-[var(--text-muted)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PRAVAH V2 (प्रवाह) · Municipal Corporation of Delhi (MCD) Urban Flood Intelligence</span>
          <span className="font-mono text-[11px] text-[var(--text-secondary)]">PostGIS SRID 4326 · Node.js · React · Leaflet · Recharts</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ThemeInit />
      <BrowserRouter>
        <Routes>
          {/* Cinematic Landing Page */}
          <Route path="/" element={<Landing />} />
          {/* Application Layout & Core Command Routes */}
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
