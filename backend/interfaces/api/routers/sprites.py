from __future__ import annotations

from fastapi import APIRouter
from interfaces.api.deps import get_services
from interfaces.api.schemas import SpriteHashOut
from application.sprite_hash_service import get_hashes

router = APIRouter()


@router.get("/hashes", response_model=list[SpriteHashOut])
def sprite_hashes():
    svc = get_services()
    return get_hashes(svc["repo"])
