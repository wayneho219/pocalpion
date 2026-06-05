from __future__ import annotations
import json
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

_MOVES_PATH = Path(__file__).parent.parent.parent.parent / "data" / "moves.json"


class MoveOut(BaseModel):
    name_en: str
    name_zh: str
    name_ja: str
    power: Optional[int]
    category: str
    type: str


_cache: Optional[List[MoveOut]] = None


def _load() -> List[MoveOut]:
    global _cache
    if _cache is None:
        raw = json.loads(_MOVES_PATH.read_text(encoding="utf-8"))
        _cache = [MoveOut(**m) for m in raw]
    return _cache


@router.get("", response_model=List[MoveOut])
def get_moves():
    return _load()
