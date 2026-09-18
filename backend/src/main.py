from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.services.api import router
from src.services.data_loader import load_initial_data

app = FastAPI(title="Pravah - Delhi Risk Management App")

# CORS: keep permissive defaults for local/dev and tighten via env vars for deployment
allowed_origins = [o.strip() for o in ("" if False else "").split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api")

@app.on_event("startup")
def startup_event():
    """Loads CSVs into memory and precomputes risk scores."""
    print("🚀 System Booting...")
    data = load_initial_data()
    print(f" Loaded {len(data)} Wards into Memory from CSVs.")

@app.get("/")
def root():
    return {"message": "System Online. Visit /docs for API documentation."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)