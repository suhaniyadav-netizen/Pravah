# AGENTS.md — Pravah-V2

## Project Overview
Delhi flood risk monitoring system with Python FastAPI backend and vanilla JS frontend.

## Developer Commands

### Backend (run from `backend/`)
```powershell
# Setup
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Run (port 8000)
uvicorn src.main:app --reload
```

### Frontend
Open `frontend/index.html` via VS Code Live Server or double-click.
**Important:** Edit `frontend/js/common.js` line 5 (`API_BASE`) to point to local backend (`http://localhost:8000`) for development.

## Architecture Notes
- **Backend entrypoint:** `backend/src/main.py` — FastAPI app with startup data loading
- **Config:** `backend/src/config.py` — CSV paths, risk weights, thresholds
- **Risk engine:** `backend/src/services/risk_engine.py` — Formula: `(Drainage * 0.5) + (Rain * 0.3) + (Complaints * 0.2)`
- **Data:** 4 CSVs in `backend/data/` (wards, rainfall, drainage, complaints)
- **Frontend:** Static HTML/CSS/JS using Leaflet maps; no build step

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wards` | GeoJSON of 250 wards with risk scores |
| GET | `/api/risk-summary` | Aggregate stats |
| POST | `/api/complaint` | Submit citizen complaint |
| GET | `/api/admin/overview` | Admin table sorted by risk |
| POST | `/api/admin/update-drainage` | Update ward drainage capacity |

## Environment & Config
- CORS defaults to `*` (see `main.py:9-11`)
- API base URL hardcoded in `frontend/js/common.js:5` — must change for local dev
- No `.env` support currently; config is in `config.py`

## Testing / Quality
- **No test suite, linter, or type checker configured** — add if needed
- Manual verification: backend `/docs` (Swagger UI), frontend map loads wards

## Common Issues
- **Map not loading:** Check `API_BASE` in `common.js` matches running backend (no trailing slash)
- **Admin redirects to login:** Must log in via `login.html` to set `sessionStorage` key
- **First request slow:** Production backend on Render free tier spins down