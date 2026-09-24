import React from 'react';
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
 * AppLayout renders the shared Navbar + footer shell for all non-landing routes.
 * The Landing page at "/" manages its own header and layout.
 */
function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/report"     element={<CitizenPortal />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/wards/:id"  element={<WardDetail />} />
          <Route path="/incidents"  element={<IncidentCommand />} />
          <Route path="/simulator"  element={<Simulator />} />
          <Route path="/analytics"  element={<Analytics />} />
          <Route path="/admin"      element={<AdminPortal />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Pravah V2 (प्रवाह) · Municipal Corporation of Delhi (MCD) Urban Flood Intelligence</span>
          <span className="font-mono text-[11px] text-slate-400">PostGIS · Node.js · React · Leaflet · Recharts</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page has its own full-screen layout */}
        <Route path="/" element={<Landing />} />
        {/* All other routes use the shared app shell */}
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
