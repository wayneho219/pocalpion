from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from interfaces.api.routers import pokemon, speed, survival, admin
from shared.config import SPRITES_DIR

app = FastAPI(title="PokéCalc API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if SPRITES_DIR.exists():
    app.mount("/sprites", StaticFiles(directory=str(SPRITES_DIR)), name="sprites")

app.include_router(pokemon.router, prefix="/api/pokemon", tags=["pokemon"])
app.include_router(speed.router, prefix="/api/speed", tags=["speed"])
app.include_router(survival.router, prefix="/api/survival", tags=["survival"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
