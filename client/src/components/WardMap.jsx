import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

/**
 * WardMap — Interactive Leaflet choropleth of Delhi municipal ward flood risk.
 * Renders GeoJSON polygons + centroid markers for HIGH/CRITICAL wards.
 * Normalizes riskLevel to uppercase so offline fallback data ('Moderate') maps correctly.
 */
export default function WardMap({ wardsData, selectedWardId, onSelectWard, height = '600px' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const navigate = useNavigate();

  /** Normalize risk level string to uppercase for consistent matching */
  const normalizeLevel = (level) => String(level || '').toUpperCase().trim();

  const getRiskColor = (level) => {
    switch (normalizeLevel(level)) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH':     return '#f97316';
      case 'MODERATE':
      case 'MEDIUM':   return '#eab308';
      case 'LOW':
      default:         return '#22c55e';
    }
  };

  // Initialize Leaflet Map — runs once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const delhiBounds = [[28.38, 76.80], [28.92, 77.40]];

    const map = L.map(mapContainerRef.current, {
      center: [28.6139, 77.2090],
      zoom: 11,
      minZoom: 10,
      maxZoom: 16,
      maxBounds: delhiBounds,
      attributionControl: false,
    });

    // Dark Matter CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update GeoJSON layers when ward data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous layers
    if (geoJsonLayerRef.current) map.removeLayer(geoJsonLayerRef.current);
    if (markersLayerRef.current) markersLayerRef.current.clearLayers();

    // Show empty state if no features
    if (!wardsData || !wardsData.features || wardsData.features.length === 0) return;

    geoJsonLayerRef.current = L.geoJSON(wardsData, {
      style: (feature) => {
        const p = feature.properties || {};
        const level = normalizeLevel(p.riskLevel || p.current_risk_level);
        const isSelected =
          p.ward_code === selectedWardId ||
          p.id === selectedWardId ||
          String(p.ward_code) === String(selectedWardId);
        const color = getRiskColor(level);

        return {
          fillColor: color,
          weight: isSelected ? 2.5 : 0.8,
          opacity: 1,
          color: isSelected ? '#38bdf8' : 'rgba(51,65,85,0.8)',
          fillOpacity: isSelected ? 0.65 : 0.32,
        };
      },

      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const name = p.ward_name || p.name || 'Delhi Ward';
        const code = p.ward_code || p.id || '';
        const level = normalizeLevel(p.riskLevel || p.current_risk_level) || 'MODERATE';
        const score = p.riskScore ?? p.current_risk_score ?? 50;
        const color = getRiskColor(level);
        const drainage = p.drainageCapacity ?? p.drainage_capacity ?? 50;
        const rainfall = p.rainfall ?? 28.5;

        const riskLabelColor = {
          CRITICAL: '#f87171',
          HIGH: '#fb923c',
          MODERATE: '#fbbf24',
          LOW: '#4ade80',
        }[level] || '#fbbf24';

        const popupContent = `
          <div style="min-width:200px;font-family:'Inter',sans-serif;color:#f8fafc;">
            <div style="font-weight:800;font-size:13px;margin-bottom:8px;letter-spacing:-0.01em;">
              ${name}
              <span style="color:#94a3b8;font-size:10px;font-weight:500;margin-left:6px;">${code}</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:22px;font-weight:900;color:#fff;">${score}</span>
              <span style="font-size:10px;font-weight:700;color:${riskLabelColor};background:${color}22;padding:3px 8px;border-radius:6px;border:1px solid ${color}44;text-transform:uppercase;letter-spacing:0.06em;">${level}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;font-size:11px;color:#94a3b8;">
              <div>Drainage: <b style="color:#cbd5e1;">${drainage} m³/s</b></div>
              <div>Rainfall: <b style="color:#cbd5e1;">${rainfall} mm</b></div>
            </div>
            <button
              id="view-ward-${code}"
              style="width:100%;padding:7px;background:linear-gradient(90deg,#0284c7,#0369a1);color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:0.02em;"
            >
              View Ward Intelligence →
            </button>
          </div>
        `;

        layer.bindPopup(popupContent, { className: 'dark-leaflet-popup', maxWidth: 240 });

        layer.on('popupopen', () => {
          const btn = document.getElementById(`view-ward-${code}`);
          if (btn) btn.onclick = () => navigate(`/wards/${code}`);
        });

        layer.on('click', () => {
          if (onSelectWard) onSelectWard(p);
        });

        layer.on('mouseover', function () {
          this.setStyle({ fillOpacity: 0.55, weight: 1.5 });
        });
        layer.on('mouseout', function () {
          const isSelected =
            p.ward_code === selectedWardId || p.id === selectedWardId;
          this.setStyle({ fillOpacity: isSelected ? 0.65 : 0.32, weight: isSelected ? 2.5 : 0.8 });
        });

        // Centroid pulse marker for HIGH / CRITICAL wards
        const centroid = p.centroid;
        if (centroid && (level === 'CRITICAL' || level === 'HIGH')) {
          const pulseIcon = L.divIcon({
            className: 'ward-pulse-marker',
            html: `<div style="width:12px;height:12px;background:${color};border:2px solid rgba(255,255,255,0.8);border-radius:50%;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });
          const marker = L.marker([centroid.latitude, centroid.longitude], { icon: pulseIcon });
          marker.bindTooltip(`${name} — ${level} Risk`, { direction: 'top', className: 'leaflet-tooltip-dark' });
          marker.on('click', () => { if (onSelectWard) onSelectWard(p); });
          markersLayerRef.current.addLayer(marker);
        }
      },
    }).addTo(map);
  }, [wardsData, selectedWardId, onSelectWard, navigate]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#090d16]">
      {/* Loading skeleton */}
      {!wardsData && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#090d16]/90">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Loading ward boundaries…</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {wardsData && wardsData.features && wardsData.features.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#090d16]/90">
          <p className="text-xs text-slate-500">No ward data available.</p>
        </div>
      )}

      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Risk Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800/80 text-xs shadow-xl">
        <div className="font-bold text-slate-200 mb-2.5 text-[11px] uppercase tracking-wider">Ward Flood Risk Index</div>
        <div className="space-y-1.5">
          {[
            { color: 'bg-red-500', label: 'Critical', range: '75 – 100' },
            { color: 'bg-orange-500', label: 'High', range: '60 – 74' },
            { color: 'bg-yellow-500', label: 'Moderate', range: '40 – 59' },
            { color: 'bg-emerald-500', label: 'Low', range: '< 40' },
          ].map((item) => (
            <div key={item.label} className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${item.color} ${item.label === 'Critical' ? 'animate-pulse' : ''}`} />
              <span className="text-slate-300">{item.label}</span>
              <span className="text-slate-600 text-[10px]">{item.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
