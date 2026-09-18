/**
 * Pravah V2 — API Client Service
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function fetchApi(endpoint, options = {}) {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.message || `Request failed with status ${response.status}`);
    err.status = response.status;
    err.data = errorData;
    throw err;
  }

  return response.json();
}

// System Endpoints
export const getHealth = () => fetchApi('/api/health');
export const getWardsGeoJSON = () => fetchApi('/api/wards');
export const getWardById = (id) => fetchApi(`/api/wards/${id}`);
export const searchWards = (query) => fetchApi(`/api/wards/search?q=${encodeURIComponent(query)}`);

// Risk & Weather
export const getCityRiskSummary = () => fetchApi('/api/risk/summary');
export const getWardRiskDetails = (wardId) => fetchApi(`/api/risk/ward/${wardId}`);
export const getCurrentWeather = () => fetchApi('/api/weather/current');
export const getWardForecast = (wardId) => fetchApi(`/api/forecasting/ward/${wardId}`);
export const getCityForecast = () => fetchApi('/api/forecasting/city');

// Complaints & Incidents
export const submitComplaint = (payload) => fetchApi('/api/complaints', { method: 'POST', body: JSON.stringify(payload) });
export const listComplaints = (params = {}) => fetchApi(`/api/complaints?${new URLSearchParams(params)}`);
export const listIncidents = (params = {}) => fetchApi(`/api/incidents?${new URLSearchParams(params)}`);
export const createIncident = (payload) => fetchApi('/api/incidents', { method: 'POST', body: JSON.stringify(payload) });

// Decision Support & Response Teams
export const getCityTacticalPlan = () => fetchApi('/api/decision-support/city');
export const getWardTacticalPlan = (wardId) => fetchApi(`/api/decision-support/ward/${wardId}`);
export const listResponseTeams = () => fetchApi('/api/response-teams');
export const dispatchResponseTeam = (payload) => fetchApi('/api/response-teams/dispatch', { method: 'POST', body: JSON.stringify(payload) });

// What-If Simulation
export const runSimulation = (payload) => fetchApi('/api/simulation/ward', { method: 'POST', body: JSON.stringify(payload) });
export const getSimulationPresets = () => fetchApi('/api/simulation/presets');

// Historical Analytics
export const getAnalyticsHotspots = () => fetchApi('/api/analytics/hotspots');
export const getAnalyticsTrends = () => fetchApi('/api/analytics/trends');

// Auth & Admin
export const login = (credentials) => fetchApi('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const getAdminOverview = () => fetchApi('/api/admin/overview');
export const updateDrainageCapacity = (payload) => fetchApi('/api/admin/update-drainage', { method: 'POST', body: JSON.stringify(payload) });
export const getAuditLogs = () => fetchApi('/api/admin/audit-logs');
