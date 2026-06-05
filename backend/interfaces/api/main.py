from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from interfaces.api.routers import pokemon, speed, survival, admin, moves

app = FastAPI(title="PokéCalc API", version="1.0.0")

import os

_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
allow_origins = [o.strip() for o in _origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pokemon.router, prefix="/api/pokemon", tags=["pokemon"])
app.include_router(speed.router, prefix="/api/speed", tags=["speed"])
app.include_router(survival.router, prefix="/api/survival", tags=["survival"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(moves.router, prefix="/api/moves", tags=["moves"])
