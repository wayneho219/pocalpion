from fastapi import APIRouter
from interfaces.api.deps import clear_cache
from interfaces.api.schemas import RebuildOut
from scripts.build_data import build

router = APIRouter()


@router.post("/rebuild", response_model=RebuildOut)
def rebuild():
    count = build()
    clear_cache()
    return RebuildOut(count=count)
