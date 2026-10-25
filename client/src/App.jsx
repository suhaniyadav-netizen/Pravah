import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import CitizenPortal from './pages/CitizenPortal';
import Dashboard from './pages/Dashboard';
import WardDetail from './pages/WardDetail';
import IncidentCommand from './pages/IncidentCommand';
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
      <main className="flex-1 pt-20">
        <Routes>
          <Route path="/report" element={<CitizenPortal />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wards/:id" element={<WardDetail />} />
          <Route path="/incidents" element={<IncidentCommand />} />
          <Route path="/simulator" element={<Navigate to="/admin?tab=simulation" replace />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<AdminPortal />} />
        </Routes>
      </main>
      <Footer />
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
