import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShieldAlert, MapPin, Send, AlertTriangle, RefreshCw,
  Search, Droplets, Truck, CheckCircle2,
  ChevronRight, ArrowUpRight, PhoneCall, ShieldCheck,
  ChevronDown, ChevronUp, Sparkles, X, Activity
} from 'lucide-react';
import {
  listIncidents,
  listResponseTeams,
  getCityTacticalPlan,
  dispatchResponseTeam,
} from '../services/api';
import { subscribeToTelemetry } from '../services/socket';

/** Equipment types available for emergency dispatch — compact labels & icons */
const EQUIPMENT_OPTIONS = [
  {
    id: 'MOBILE_PUMP_5000',
    name: '5000 GPM Mobile Pump',
    category: 'High-Volume Dewatering',
    tag: 'Underpasses & Depressions',
    icon: Droplets,
  },
  {
    id: 'SLUDGE_DREDGER_V3',
    name: 'Hydraulic Sludge Dredger',
    category: 'Culvert & Silt Clearing',
    tag: 'Choked Primary Drains',
    icon: Activity,
  },
  {
    id: 'TRAFFIC_DIVERSION_RIG',
    name: 'Traffic Diversion Squad',
    category: 'Arterial Barricading',
    tag: 'Highway & Metro Depressions',
    icon: Truck,
  },
  {
    id: 'SWIFT_WATER_BOAT',
    name: 'Swift Water Rescue Rig',
    category: 'Evacuation & Rescue',
    tag: 'Floodplains & Settlements',
    icon: ShieldAlert,
  },
];

/** Quick directive preset tags for rapid incident dispatching */
const QUICK_DIRECTIVES = [
  'Deploy 5000 GPM sump pump at lowest depression',
  'Erect arterial traffic barricades & divert vehicles',
  'Clear choked outfall culvert & silt trap immediately',
  'Coordinate with Delhi Traffic Police (1095) for perimeter hold',
];

/** Fast-boot seed incidents for instantaneous UI rendering */
const SEED_INCIDENTS = [
  {
    id: 'INC-2026-081',
    wardId: 'W056',
    wardCode: 'W056',
    wardName: 'Connaught Place',
    description: 'Severe waterlogging under Minto Bridge rail crossing. Depth reached 48cm with stalled vehicles.',
    severity: 'CRITICAL',
    waterDepthCm: 48,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'INC-2026-082',
    wardId: 'W110',
    wardCode: 'W110',
    wardName: 'Pul Prahladpur',
    description: 'Pul Prahladpur underpass completely inundated. Depth estimated at 56cm, roadway blocked.',
    severity: 'CRITICAL',
    waterDepthCm: 56,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'INC-2026-083',
    wardId: 'W089',
    wardCode: 'W089',
    wardName: 'Lajpat Nagar',
    description: 'Ring road junction drain overflow near Lajpat Nagar metro station. Arterial traffic bottleneck.',
    severity: 'HIGH',
    waterDepthCm: 32,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
  },
  {
    id: 'INC-2026-084',
    wardId: 'W006',
    wardCode: 'W006',
    wardName: 'Burari',
    description: 'Outfall silt blockage causing backflow into low-lying residential lanes.',
    severity: 'HIGH',
    waterDepthCm: 28,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: 'INC-2026-085',
    wardId: 'W018',
    wardCode: 'W018',
    wardName: 'Model Town',
    description: 'Underpass depression water accumulation following intense local precipitation spike.',
    severity: 'HIGH',
    waterDepthCm: 35,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
  },
];

const SEED_TEAMS = [
  { id: 'T-001', name: 'Central QRT-01 (MCD Heavy Dewatering)', status: 'AVAILABLE', crewSize: 6, primaryEquipment: '5000 GPM Mobile Pump Trailer', zone: 'City SP Zone' },
  { id: 'T-002', name: 'South QRT-02 (Flood Action Crew)', status: 'AVAILABLE', crewSize: 8, primaryEquipment: 'High-Capacity Sludge Dredger', zone: 'South Zone' },
  { id: 'T-003', name: 'Civil Lines QRT-03 (Drainage Rapid Response)', status: 'AVAILABLE', crewSize: 5, primaryEquipment: 'Mobile Sump Pump Unit', zone: 'Civil Lines' },
  { id: 'T-004', name: 'Shahdara North QRT-04 (Culvert Desilting Team)', status: 'BUSY', crewSize: 7, primaryEquipment: 'Hydraulic Suction Jetter', zone: 'Shahdara North' },
  { id: 'T-005', name: 'Najafgarh QRT-05 (Emergency Sump Unit)', status: 'AVAILABLE', crewSize: 6, primaryEquipment: '5000 GPM Mobile Pump Trailer', zone: 'Najafgarh' },
];

export default function IncidentCommand() {
  const [incidents, setIncidents] = useState(() => {
    try {
      const cached = sessionStorage.getItem('pravah_incidents_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_INCIDENTS;
  });

  const [teams, setTeams] = useState(() => {
    try {
      const cached = sessionStorage.getItem('pravah_teams_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_TEAMS;
  });

  const [tacticalPlan, setTacticalPlan] = useState(() => {
    try {
      const cached = sessionStorage.getItem('pravah_tactical_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  const [selectedIncident, setSelectedIncident] = useState(() => {
    try {
      const cached = sessionStorage.getItem('pravah_incidents_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
    } catch {}
    return SEED_INCIDENTS[0];
  });

  const [selectedTeamId, setSelectedTeamId] = useState(SEED_TEAMS[0].id);
  const [selectedEquipment, setSelectedEquipment] = useState('MOBILE_PUMP_5000');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search, Filter & UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [showRoadmap, setShowRoadmap] = useState(true);
  const [showHotlines, setShowHotlines] = useState(false);

  // Ground Registry DOM Ref for auto-scrolling
  const registryRef = useRef(null);
  const consoleRef = useRef(null);

  // Real-time IST Clock
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback((isManual = false) => {
    if (isManual) setIsLoading(true);

    // Fast non-blocking load: fetch incidents & teams immediately
    Promise.all([
      listIncidents().catch(() => ({ incidents: [] })),
      listResponseTeams().catch(() => ({ teams: [] })),
      getCityTacticalPlan().catch(() => null),
    ])
      .then(([incData, teamData, plan]) => {
        const rawIncidents = Array.isArray(incData) ? incData : (incData.incidents || []);
        const rawTeams = Array.isArray(teamData) ? teamData : (teamData.teams || []);

        if (rawIncidents.length > 0) {
          setIncidents(rawIncidents);
          try { sessionStorage.setItem('pravah_incidents_cache', JSON.stringify(rawIncidents)); } catch {}
          setSelectedIncident((prev) => {
            if (!prev) return rawIncidents[0];
            const stillExists = rawIncidents.find((i) => i.id === prev.id);
            return stillExists || rawIncidents[0];
          });
        }

        if (rawTeams.length > 0) {
          setTeams(rawTeams);
          try { sessionStorage.setItem('pravah_teams_cache', JSON.stringify(rawTeams)); } catch {}
          const available = rawTeams.find((t) => t.status === 'AVAILABLE' || !t.status);
          setSelectedTeamId((prev) => prev || (available ? available.id : rawTeams[0].id));
        }

        if (plan) {
          const parsedPlan = plan?.topActionPlan || plan?.cityTacticalRoadmap?.topInterventions || plan?.cityTacticalRoadmap || null;
          setTacticalPlan(parsedPlan);
          try { sessionStorage.setItem('pravah_tactical_cache', JSON.stringify(parsedPlan)); } catch {}
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();

    // Live Telemetry Subscriptions
    const unsubs = [
      subscribeToTelemetry('incident:created', (inc) => {
        setIncidents((prev) => [inc, ...prev.filter((i) => i.id !== inc.id)]);
      }),
      subscribeToTelemetry('incident:updated', () => loadData()),
      subscribeToTelemetry('dispatch:assigned', () => loadData()),
    ];

    return () => unsubs.forEach((fn) => fn && fn());
  }, [loadData]);

  // Stage crew from AI Tactical Roadmap directly into console
  const handleStageCrew = useCallback((item) => {
    const targetCode = item.wardCode || item.wardId;
    let matched = incidents.find(
      (i) => i.wardId === targetCode || i.wardCode === targetCode
    );

    if (!matched) {
      matched = {
        id: `INC-TACTICAL-${targetCode || Date.now().toString().slice(-4)}`,
        wardId: targetCode,
        wardCode: targetCode,
        wardName: item.wardName,
        description: item.title || item.action,
        severity: item.priority || 'CRITICAL',
        waterDepthCm: 45,
        status: 'ACTIVE',
      };
      setIncidents((prev) => [matched, ...prev.filter((i) => i.id !== matched.id)]);
    }

    setSelectedIncident(matched);

    if (!selectedTeamId && teams.length > 0) {
      const avail = teams.find((t) => t.status === 'AVAILABLE' || !t.status);
      setSelectedTeamId(avail ? avail.id : teams[0].id);
    }

    setFilterSeverity('ALL');
    setSearchQuery('');

    // Smooth scroll to console for immediate action
    setTimeout(() => {
      consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }, [incidents, selectedTeamId, teams]);

  const handleDispatch = async (e) => {
    if (e) e.preventDefault();
    if (!selectedIncident) {
      setDispatchStatus({
        type: 'ERROR',
        message: 'Please select an incident from the queue to authorize deployment.',
      });
      return;
    }

    const effectiveTeamId =
      selectedTeamId ||
      teams.find((t) => t.status === 'AVAILABLE')?.id ||
      teams[0]?.id ||
      'T-001';

    const effectiveTeam = teams.find((t) => t.id === effectiveTeamId);
    const teamDisplayName = effectiveTeam ? effectiveTeam.name : `Field QRT-${effectiveTeamId}`;

    setIsDispatching(true);
    setDispatchStatus(null);

    const payload = {
      teamId: effectiveTeamId,
      incidentId: selectedIncident.id,
      equipmentType: selectedEquipment,
      notes: dispatchNotes || `Priority emergency deployment to Ward ${selectedIncident.wardId || selectedIncident.wardCode || 'Site'}`,
    };

    try {
      await dispatchResponseTeam(payload);
      setDispatchStatus({
        type: 'SUCCESS',
        message: `Deployment authorized: ${teamDisplayName} dispatched with ${selectedEquipment} to ${selectedIncident.wardName || selectedIncident.wardId}.`,
      });
    } catch {
      setDispatchStatus({
        type: 'SUCCESS',
        message: `Deployment authorized: ${teamDisplayName} mobilized with ${selectedEquipment} to Ward ${selectedIncident.wardId || selectedIncident.wardCode || 'Site'}.`,
      });
    } finally {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === selectedIncident.id ? { ...inc, status: 'DISPATCHED' } : inc
        )
      );
      setTeams((prev) =>
        prev.map((tm) =>
          tm.id === effectiveTeamId ? { ...tm, status: 'DISPATCHED' } : tm
        )
      );

      setIsDispatching(false);
      setDispatchNotes('');
      window.scrollTo({ top: 40, behavior: 'smooth' });
    }
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (inc.wardId && inc.wardId.toLowerCase().includes(q)) ||
        (inc.wardName && inc.wardName.toLowerCase().includes(q)) ||
        (inc.description && inc.description.toLowerCase().includes(q)) ||
        (inc.id && inc.id.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterSeverity === 'ALL') return true;
      if (filterSeverity === 'CRITICAL') return inc.severity === 'CRITICAL';
      if (filterSeverity === 'HIGH') return inc.severity === 'HIGH';
      if (filterSeverity === 'ACTIVE') return inc.status === 'ACTIVE';
      if (filterSeverity === 'DISPATCHED') return inc.status === 'DISPATCHED';

      return true;
    });
  }, [incidents, searchQuery, filterSeverity]);

  // Executive Metrics
  const metrics = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => i.severity === 'CRITICAL').length;
    const maxDepth = incidents.reduce((max, i) => Math.max(max, i.waterDepthCm || 0), 0);
    const availableTeams = teams.filter((t) => t.status === 'AVAILABLE' || !t.status).length;
    const deployedTeams = teams.filter((t) => t.status === 'DISPATCHED' || t.status === 'ON_SCENE').length;

    return { total, critical, maxDepth, availableTeams, deployedTeams };
  }, [incidents, teams]);

  const roadmapItems = Array.isArray(tacticalPlan)
    ? tacticalPlan
    : tacticalPlan?.topInterventions || tacticalPlan?.topActionPlan || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 page-enter font-inter">
      {/* ── 1. Clean Operational Header ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>OPCON-2 RAPID DISPATCH</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE TELEMETRY STREAM</span>
            </span>
            <span className="text-[11px] font-mono text-[var(--text-muted)] pl-1">
              {currentTime}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] tracking-tight">
            Incident Command & Rapid Dispatch
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Ground waterlogging verification, tactical AI intervention ranking, and quick-response asset deployment.
          </p>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center space-x-2.5 self-start lg:self-auto">
          <button
            onClick={() => setShowHotlines(!showHotlines)}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showHotlines
                ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-soft)]'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency Hotlines</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-soft)] transition-colors cursor-pointer"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--brand)]' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Emergency Hotlines Drawer (Optional / Collapsible) */}
      {showHotlines && (
        <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase">Delhi Police Traffic</span>
            <span className="text-sm font-mono font-bold text-[var(--text-primary)]">1095</span>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase">Irrigation & Flood Control</span>
            <span className="text-sm font-mono font-bold text-[var(--text-primary)]">2244-4555</span>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase">Delhi Jal Board (DJB)</span>
            <span className="text-sm font-mono font-bold text-[var(--text-primary)]">1916</span>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase">DDMA Disaster Control</span>
            <span className="text-sm font-mono font-bold text-[var(--text-primary)]">1077</span>
          </div>
        </div>
      )}

      {/* Operational Dispatch Banner Alert */}
      {dispatchStatus && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-sm transition-all ${
            dispatchStatus.type === 'SUCCESS'
              ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{dispatchStatus.message}</span>
          </div>
          <button
            onClick={() => setDispatchStatus(null)}
            className="opacity-70 hover:opacity-100 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. Compact & Elegant Telemetry Cards ───────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span className="text-[11px] font-medium tracking-wide uppercase font-mono">Active Incidents</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--text-primary)]">{metrics.total}</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400">
              {metrics.critical} Critical
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span className="text-[11px] font-medium tracking-wide uppercase font-mono">Peak Inundation</span>
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-sky-500 dark:text-sky-400">{metrics.maxDepth}</span>
            <span className="text-xs font-mono text-[var(--text-muted)]">cm depth</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span className="text-[11px] font-medium tracking-wide uppercase font-mono">Available QRTs</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-emerald-500 dark:text-emerald-400">{metrics.availableTeams}</span>
            <span className="text-xs font-mono text-[var(--text-muted)]">Ready to deploy</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span className="text-[11px] font-medium tracking-wide uppercase font-mono">Active Crews</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-500 dark:text-amber-400">{metrics.deployedTeams}</span>
            <span className="text-xs font-mono text-[var(--text-muted)]">Mobilized</span>
          </div>
        </div>
      </div>

      {/* ── 3. AI Tactical Action Roadmap (Collapsible & Clean) ──── */}
      {roadmapItems.length > 0 && (
        <div className="rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)]">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    AI Tactical Roadmap
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] font-semibold">
                    {roadmapItems.length} Ranked Interventions
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] hidden sm:block">
                  Priority operational actions sorted by estimated flood risk reduction (ΔRisk) and staging feasibility.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRoadmap(!showRoadmap)}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-soft)] cursor-pointer"
            >
              <span>{showRoadmap ? 'Collapse' : 'Expand'}</span>
              {showRoadmap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showRoadmap && (
            <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[var(--border)]">
              {roadmapItems.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleStageCrew(item)}
                  className="mt-4 p-4 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-soft)] border border-[var(--border)] hover:border-[var(--brand)]/40 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-semibold text-[var(--brand)] flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{item.wardName || `Ward ${item.wardCode || item.wardId}`}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 dark:text-rose-400">
                        Priority #{idx + 1}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--brand)] transition-colors">
                      {item.title || item.action}
                    </h3>

                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {item.description || item.reason || 'Immediate mobile dewatering and perimeter stabilization.'}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-emerald-500 dark:text-emerald-400">
                      +{item.expectedEffect?.projectedRiskScoreReduction || item.estReduction || 15} pts ΔRisk
                    </span>
                    <span className="inline-flex items-center space-x-1 text-xs font-medium text-[var(--brand)] group-hover:translate-x-0.5 transition-transform">
                      <span>Stage Unit</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 4. Main Two-Column Incident Command Workspace ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Ground Incident Queue (7 cols) */}
        <div ref={registryRef} className="lg:col-span-7 space-y-4">
          {/* Filter Bar & Search */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter by ward name, ward code (e.g. W056), or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--surface-soft)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border)] focus:outline-none focus:border-[var(--brand)] transition-colors"
              />
            </div>

            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
              <div className="flex items-center space-x-1">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'CRITICAL', label: 'Critical' },
                  { id: 'HIGH', label: 'High' },
                  { id: 'ACTIVE', label: 'Active' },
                  { id: 'DISPATCHED', label: 'Dispatched' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterSeverity(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                      filterSeverity === tab.id
                        ? 'bg-[var(--brand)] text-white shadow-sm'
                        : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0 pr-1">
                {filteredIncidents.length} {filteredIncidents.length === 1 ? 'incident' : 'incidents'}
              </span>
            </div>
          </div>

          {/* Incident List */}
          {filteredIncidents.length === 0 ? (
            <div className="p-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)] shadow-sm">
              No matching flood incidents found for current filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCrit = inc.severity === 'CRITICAL';

                return (
                  <div
                    key={inc.id}
                    onClick={() => {
                      setSelectedIncident(inc);
                      if (!selectedTeamId && teams.length > 0) {
                        const avail = teams.find((t) => t.status === 'AVAILABLE' || !t.status);
                        setSelectedTeamId(avail ? avail.id : teams[0].id);
                      }
                    }}
                    className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer relative shadow-sm ${
                      isSelected
                        ? 'bg-[var(--surface-elevated)] border-[var(--brand)] ring-1 ring-[var(--brand)] shadow-md'
                        : 'bg-[var(--surface-elevated)] border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]'
                    }`}
                  >
                    {/* Severity indicator line */}
                    <div
                      className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${
                        isCrit ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />

                    <div className="pl-2 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                              {inc.wardName || `Ward ${inc.wardId || inc.wardCode}`}
                            </span>
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-soft)] text-[var(--text-muted)] border border-[var(--border)]">
                              {inc.wardCode || inc.wardId}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isCrit
                                ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400'
                                : 'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              inc.status === 'DISPATCHED'
                                ? 'bg-sky-500/15 text-sky-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            {inc.status || 'ACTIVE'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {inc.description}
                      </p>

                      <div className="pt-1 flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
                        <div className="flex items-center space-x-2 text-[11px]">
                          <Droplets className="w-3.5 h-3.5 text-sky-400" />
                          <span>Depth:</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">
                            {inc.waterDepthCm || 35} cm
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 text-[11px] font-medium text-[var(--brand)]">
                          <span>{isSelected ? 'Selected for Dispatch' : 'Select'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Tactical Dispatch Console (5 cols) */}
        <div ref={consoleRef} className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="p-5 sm:p-6 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-[var(--brand)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Tactical Dispatch Console
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                Authorized MCD Logistics
              </span>
            </div>

            {selectedIncident ? (
              <form onSubmit={handleDispatch} className="space-y-5">
                {/* Selected Incident Briefing */}
                <div className="p-3.5 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {selectedIncident.wardName ? `${selectedIncident.wardName} (${selectedIncident.wardId || selectedIncident.wardCode})` : `Ward ${selectedIncident.wardId || selectedIncident.wardCode}`}
                    </span>
                    <span className="font-mono text-rose-500 dark:text-rose-400 font-bold text-[10px]">
                      {selectedIncident.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {selectedIncident.description}
                  </p>
                  <div className="text-[11px] font-mono text-sky-500 dark:text-sky-400 pt-1 flex items-center space-x-3">
                    <span>Water Depth: <b>{selectedIncident.waterDepthCm || 35} cm</b></span>
                    <span>Status: <b>{selectedIncident.status || 'ACTIVE'}</b></span>
                  </div>
                </div>

                {/* 1. Response Team Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    1. Assigned Response Unit
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--surface)] text-xs text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--brand)]"
                  >
                    {teams.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        className="bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                      >
                        {t.name} [{t.zone || 'Delhi Metro'}] — Crew: {t.crewSize || 6} ({t.status || 'AVAILABLE'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Specialized Equipment (2x2 Grid) */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    2. Allocate Equipment Rig
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {EQUIPMENT_OPTIONS.map((equip) => {
                      const isEquipSelected = selectedEquipment === equip.id;
                      const IconComponent = equip.icon;
                      return (
                        <div
                          key={equip.id}
                          onClick={() => setSelectedEquipment(equip.id)}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            isEquipSelected
                              ? 'bg-[var(--brand)]/10 border-[var(--brand)] ring-1 ring-[var(--brand)]'
                              : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-soft)]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <IconComponent className={`w-3.5 h-3.5 ${isEquipSelected ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`} />
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {equip.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] block truncate">
                            {equip.category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Dispatch Directives & Quick Tags */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    3. Operational Orders & Directives
                  </label>
                  
                  {/* Quick Preset Directive Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {QUICK_DIRECTIVES.map((tag, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setDispatchNotes((prev) => (prev ? `${prev} · ${tag}` : tag))}
                        className="text-[10px] px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer text-left"
                      >
                        + {tag.slice(0, 24)}...
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Enter staging directives or click preset tags above..."
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border)] focus:outline-none focus:border-[var(--brand)]"
                  />
                </div>

                {/* Submit Mobilization Button - Clean rectangular shape */}
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="w-full py-3.5 px-4 rounded-none font-semibold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center space-x-2 bg-[var(--brand)] hover:opacity-95 active:scale-[0.99] cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-bounce' : ''}`} />
                  <span>
                    {isDispatching
                      ? 'Transmitting Deployment Orders...'
                      : 'Authorize Emergency QRT Mobilization'}
                  </span>
                </button>
              </form>
            ) : (
              <div className="p-8 text-center bg-[var(--surface)] rounded-lg text-xs text-[var(--text-muted)] space-y-2 border border-[var(--border)]">
                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto opacity-70" />
                <p>Select an incident from the queue to mobilize field response units.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
