# CHANGES.md — Pravah V2 Changelog

All system modifications, bug fixes, endpoint alignments, and UI improvements are tracked here.

---

## [UI/UX Cinematic Redesign] — 2026-09-24 20:45 IST (MotionSites Reference Polish)
### Cinematic Earth Viewport & Editorial Serif Typography
- **Typography Overhaul:** Loaded `Instrument Serif` (editorial display) and `Inter` (UI/telemetry/body) via Google Fonts in `index.html`. Configured `font-serif` and `font-sans` in `tailwind.config.js`.
- **Dual-Theme Design Tokens:** Implemented semantic CSS variables (`--bg`, `--surface`, `--border`, `--text-primary`, `--brand`, `--accent`, `--hero-glow`) in `index.css` supporting smooth Dark/Light transitions.
- **Sun/Moon Icon Theme Toggle:** Redesigned `ThemeToggle.jsx` with minimal circular liquid-glass container and Lucide `Sun`/`Moon` icons without text labels, with `localStorage` (`pravah-theme`) persistence.
- **Minimal Fixed Navbar:** Redesigned `Navbar.jsx` with generous horizontal spacing (`px-6 md:px-10 lg:px-12`), live system indicator, compact theme toggle, and slide-in drawer on mobile.
- **Live Earth Viewport Hero:** Built a full-viewport (`100svh`) cinematic Earth observatory with layered atmospheric glow, satellite relief, cloud rotation, and subtle Delhi coordinate marker (`28.61°N 77.20°E`).
- **Required Editorial Copy Grounded:**
  - Hero Heading: *"Know the risk. Before the water rises."* (Instrument Serif)
  - Hero Supporting Copy: *"Unified command for municipal engineers, disaster response officers, and citizens across the National Capital Territory."*
  - Second Statement: *"When the rain changes, PRAVAH changes with it."*
- **Second Full-Screen Section:** Layered deep ocean/sky gradient, abstract hydrological flow lines, and transition grid leading directly to the City Intelligence platform.
- **Verification:** `npm run build` (compiled in 3.5s with 0 errors), `npm test` (19/19 passed), `npm run verify:phase15` (9/9 passed).

---

## [UI/UX Phase B–J] — 2026-09-19 20:57 IST (Full UI & Map Overhaul)
> Session run directly by parent agent after subagent hit write-permission timeouts (`agy --dangerously-skip-permissions` noted for future sessions).

### Bug Fix: Dashboard Map API Error (Critical)
- **Root Cause:** `Promise.all()` in `Dashboard.jsx` caused all 4 data calls to fail together when `getCurrentWeather()` or `getCityForecast()` threw an error.
- **Fix:** Replaced `Promise.all()` with `Promise.allSettled()` so a failed weather/forecast call never prevents the map or risk summary from loading.
- **File Modified:** [`client/src/pages/Dashboard.jsx`](client/src/pages/Dashboard.jsx)

### Bug Fix: Offline RiskLevel Casing Mismatch (Map Coloring)
- **Root Cause:** `ward.service.js` offline fallback returned `riskLevel: 'Moderate'` (title case) while WardMap used `normalizeLevel()` — confirmed fix: `WardMap.jsx` now explicitly calls `.toUpperCase().trim()` on all riskLevel reads.
- **File Modified:** [`client/src/components/WardMap.jsx`](client/src/components/WardMap.jsx)

### New Feature: Premium Landing Page
- Created `/` route as a full-screen Pravah landing page with animated CSS background, liquid glass morphism, hero headline, stats row, feature grid, and intelligence formula strip.
- **File Created:** [`client/src/pages/Landing.jsx`](client/src/pages/Landing.jsx)

### Routing: CitizenPortal moved to `/report`
- Landing page now occupies `/`. CitizenPortal accessible at `/report`.
- All Navbar links and internal CTAs updated to match.
- **File Modified:** [`client/src/App.jsx`](client/src/App.jsx)

### New Feature: Ward Intelligence Side Panel in Dashboard
- Clicking a ward on the map now reveals a real-time intelligence panel on the right showing: composite risk score, factor bars (drainage/rainfall/complaints), quick stats, recommended action, and a deep-link to the full ward report.
- Falls back to a 24h risk escalation trend chart when no ward is selected.
- **File Modified:** [`client/src/pages/Dashboard.jsx`](client/src/pages/Dashboard.jsx)

### Design System: Typography
- Inter (body) + Poppins (headings/display) fonts loaded via Google Fonts in `index.html`.
- **File Modified:** [`client/index.html`](client/index.html), [`client/tailwind.config.js`](client/tailwind.config.js)

### Design System: CSS Utilities Added
- `.page-enter` — 0.35s fade-in + translateY entrance animation
- `.glass-hover` — translateY(-2px) lift on hover with shadow
- `.stat-live` — subtle opacity pulse for live KPI numbers
- `.risk-critical / .risk-high / .risk-moderate / .risk-low` — inline badge variants
- `.input-dark` — dark-themed form input with cyan focus ring
- Enhanced `.glass-panel` and `.glass-panel-glow`
- **File Modified:** [`client/src/index.css`](client/src/index.css)

### UI: Navbar Redesign
- Added Home arrow (←) linking back to landing page
- Compact active-link indicator (cyan border + background)
- Mobile menu with 3-column icon+label grid
- Updated nav item paths (`/` → `/report` for CitizenPortal)
- **File Modified:** [`client/src/components/Navbar.jsx`](client/src/components/Navbar.jsx)

### UI: All Pages — glass-panel + page-enter Applied
- `page-enter` animation applied to: Dashboard, CitizenPortal, Analytics, IncidentCommand, Simulator, WardDetail, AdminPortal
- `glass-panel` + `glass-hover` applied to: all panel containers across all 7 pages
- `glass-hover` applied to: KPI cards, incident cards, hotspot cards, factor decomposition cards
- **Files Modified:** All 7 page files in `client/src/pages/`

### UI: WardMap Component
- Loading skeleton overlay while `wardsData` is null
- Empty state when `features.length === 0`
- Improved popup styling with risk color coding and navigation button
- Centroid pulse markers for HIGH/CRITICAL wards
- Hover highlight (fill opacity increase)
- **File Modified:** [`client/src/components/WardMap.jsx`](client/src/components/WardMap.jsx)

### Verification
- `npm run build` in `client/`: ✅ 2502 modules, 0 errors, exit code 0

---

## [Current Release] — 2026-09-19


### 1. Emergency Response Dispatch Fixes
- **File Modified:** [`server/src/routes/response-team.routes.js`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/server/src/routes/response-team.routes.js)
- **Change:** Added `POST /api/response-teams/dispatch` endpoint alias.
- **Rationale:** Frontend `IncidentCommand.jsx` dispatched field teams to `/api/response-teams/dispatch` while the backend previously only exposed `/assignments`, which caused `404 Not Found` errors during field dispatches. Now seamlessly accepts `teamId`, `incidentId`, and equipment notes.

### 2. What-If Simulator Parameter Flexibility
- **File Modified:** [`server/src/routes/simulation.routes.js`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/server/src/routes/simulation.routes.js)
- **Change:** Extended `wardSimulationSchema` with `.transform()` to accept both `simulatedRainfallMm` and `rainfallMm` interchangeably.
- **Rationale:** The client sent `simulatedRainfallMm`, which failed strict Zod schema validation on the backend and threw `400 Bad Request`. Now both keys are safely normalized.

### 3. Historical Analytics Unified Trends Endpoint
- **File Modified:** [`server/src/routes/analytics.routes.js`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/server/src/routes/analytics.routes.js)
- **Change:** Created `GET /api/analytics/trends` endpoint.
- **Rationale:** The analytics page was calling `/api/analytics/trends` which previously did not exist (only split endpoints like `/trends/risk` and `/trends/rainfall` were present), breaking the 14-day rainfall vs complaints chart.

### 4. Operational In-Memory Data Seeding (Offline & Zero-Crash Resilience)
- **File Modified:** [`server/src/services/incident.service.js`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/server/src/services/incident.service.js)
- **Change:** Pre-seeded `MEMORY_COMPLAINTS` and `MEMORY_INCIDENTS` with high-priority Delhi municipal sites (Minto Bridge, Pul Prahladpur, Zakhira Junction).
- **Rationale:** When PostgreSQL was not connected locally, all complaint and incident lists returned empty arrays (`[]`), leaving the dashboard, incident command, and citizen feed completely blank.
- **File Modified:** [`server/src/services/audit.service.js`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/server/src/services/audit.service.js)
- **Change:** Pre-seeded `MEMORY_AUDIT_LOGS` with operational security audit trail records (drainage updates, dispatch authorizations, authentication events).

### 5. Frontend Response Parsing Alignments
- **File Modified:** [`client/src/pages/IncidentCommand.jsx`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/client/src/pages/IncidentCommand.jsx)
  - Updated tactical roadmap parsing to check both `plan.topActionPlan` and `plan.cityTacticalRoadmap.topInterventions`.
  - Added fallback display for action items with `reason` and `urgencyWindowMinutes`.
- **File Modified:** [`client/src/pages/AdminPortal.jsx`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/client/src/pages/AdminPortal.jsx)
  - Updated audit log loading to consume both `data.auditLogs` and `data.logs`.
- **File Modified:** [`client/src/pages/CitizenPortal.jsx`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/client/src/pages/CitizenPortal.jsx)
  - Supported both `item.createdAt` and `item.timestamp` for live feed timestamps.
- **File Modified:** [`client/src/pages/WardDetail.jsx`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/client/src/pages/WardDetail.jsx)
  - Handled action description fallback to `action.reason` and formatted priority badges and urgency times.

### 6. UI & Professional Design Overhaul
- **Files Modified:**
  - [`client/src/index.css`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/client/src/index.css): Added `.glass-panel` and `.glass-panel-glow` design primitives, sleek 6px dark scrollbars, enhanced dark-mode Leaflet popup styling (`.dark-leaflet-popup`), and subtle pulsing markers.
  - [`client/src/components/Navbar.jsx`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/client/src/components/Navbar.jsx): Redesigned navbar with backdrop blur (`backdrop-blur-xl`), animated status indicators, badge pill typography, and responsive navigation items.
  - [`client/src/pages/CitizenPortal.jsx`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/client/src/pages/CitizenPortal.jsx): Transformed report container and live civic feed into high-contrast glassmorphic cards with refined micro-interactions, clean input styling, depth sliders, and animated loading indicators.
  - [`client/src/pages/Dashboard.jsx`](file:///C:/Users/Suhani%20Yadav/OneDrive/Desktop/Projects/Pravah-V2/client/src/pages/Dashboard.jsx): Redesigned KPI cards with colored icon badges, upgraded the interactive map container, and enhanced the municipal ward search directory table.

---

## Verification Summary
- **Backend Test Suite:** Passed all Phase 14 reliability checks (`19/19 checks passed`).
- **End-to-End API Suite:** Verified 10 core endpoints (`GET /api/health`, `GET /api/incidents`, `GET /api/response-teams`, `GET /api/decision-support/city`, `GET /api/analytics/trends`, `POST /api/simulation/ward`, `POST /api/auth/login`, `GET /api/admin/overview`, `GET /api/admin/audit-logs`, `POST /api/response-teams/dispatch`).
- **Frontend Production Build:** `vite build` completed cleanly, compiling 2,501 modules with 0 errors.
