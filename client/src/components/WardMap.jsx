import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

export default function WardMap({ wardsData, selectedWardId, onSelectWard, height = '600px' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const navigate = useNavigate();

  const getRiskColor = (level) => {
    switch (String(level || '').toUpperCase()) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f97316';
      case 'MODERATE':
      case 'MEDIUM':
        return '#eab308';
      case 'LOW':
      default:
        return '#22c55e';
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const delhiBounds = [
      [28.38, 76.80],
      [28.92, 77.40],
    ];

    const map = L.map(mapContainerRef.current, {
      center: [28.6139, 77.2090],
      zoom: 11,
      minZoom: 10,
      maxZoom: 16,
      maxBounds: delhiBounds,
      attributionControl: false,
    });

    // Dark Matter Tiles
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

  // Update GeoJSON Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !wardsData || !wardsData.features) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    // Render Polygons
    geoJsonLayerRef.current = L.geoJSON(wardsData, {
      style: (feature) => {
        const p = feature.properties || {};
        const isSelected = p.ward_code === selectedWardId || p.id === selectedWardId;
        const color = getRiskColor(p.riskLevel || p.current_risk_level);

        return {
          fillColor: color,
          weight: isSelected ? 3 : 1,
          opacity: 0.8,
          color: isSelected ? '#38bdf8' : '#334155',
          fillOpacity: isSelected ? 0.6 : 0.3,
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const name = p.ward_name || p.name || 'Delhi Ward';
        const code = p.ward_code || p.id || '';
        const level = p.riskLevel || p.current_risk_level || 'MODERATE';
        const score = p.riskScore || p.current_risk_score || 50;
        const color = getRiskColor(level);

        const popupContent = `
          <div style="min-width: 190px; color: #f8fafc; font-family: sans-serif;">
            <div style="font-weight: 700; font-size: 14px; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 6px;">
              ${name} <span style="color: #94a3b8; font-size: 11px;">(${code})</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #94a3b8;">Risk Level:</span>
              <span style="font-weight: 700; font-size: 12px; color: ${color};">${level} (${score})</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px;">
              <div>Drainage: <b style="color: #cbd5e1;">${p.drainageCapacity || p.drainage_capacity || 50}%</b></div>
              <div>Rain: <b style="color: #cbd5e1;">${p.rainfall || 28.5} mm</b></div>
            </div>
            <button 
              id="view-ward-${code}" 
              style="width: 100%; padding: 6px 10px; background: #0284c7; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;"
            >
              View Ward Intelligence →
            </button>
          </div>
        `;

        layer.bindPopup(popupContent, { className: 'dark-leaflet-popup' });

        layer.on('popupopen', () => {
          const btn = document.getElementById(`view-ward-${code}`);
          if (btn) {
            btn.onclick = () => {
              navigate(`/wards/${code}`);
            };
          }
        });

        layer.on('click', () => {
          if (onSelectWard) onSelectWard(p);
        });

        // Centroid marker for High & Critical
        const centroid = p.centroid;
        if (centroid && (level === 'CRITICAL' || level === 'HIGH')) {
          const pulseIcon = L.divIcon({
            className: 'ward-pulse-marker',
            html: `<div style="width: 14px; height: 14px; background: ${color}; border: 2px solid white; border-radius: 50%;"></div>`,
            iconSize: [14, 14],
          });

          const marker = L.marker([centroid.latitude, centroid.longitude], { icon: pulseIcon });
          marker.bindTooltip(`${name}: ${level} Risk`, { direction: 'top' });
          marker.on('click', () => {
            if (onSelectWard) onSelectWard(p);
          });
          markersLayerRef.current.addLayer(marker);
        }
      },
    }).addTo(map);
  }, [wardsData, selectedWardId, onSelectWard, navigate]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs shadow-lg">
        <div className="font-semibold text-slate-200 mb-2">Ward Flood Risk Index</div>
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-slate-300">Critical (75 - 100)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-slate-300">High (60 - 74)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-300">Moderate (40 - 59)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Low (&lt; 40)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
