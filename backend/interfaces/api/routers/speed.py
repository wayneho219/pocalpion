import dataclasses
from typing import Optional
from fastapi import APIRouter, HTTPException
from interfaces.api.deps import get_services
from interfaces.api.schemas import SpeedIn, SpeedOut
from domain.models.nature import NatureRegistry
from shared.exceptions import PokemonNotFoundError

router = APIRouter()


@router.post("", response_model=Optional[SpeedOut])
def calc_speed(body: SpeedIn):
    svc = get_services()
    try:
        my_nature = NatureRegistry.get_by_name(body.my_nature)
        tgt_nature = NatureRegistry.get_by_name(body.tgt_nature)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        my_mon = svc["repo"].get_by_id(body.my_pokemon_id)
        tgt_mon = svc["repo"].get_by_id(body.tgt_pokemon_id)
    except PokemonNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    my_mon = dataclasses.replace(my_mon, nature=my_nature)
    tgt_mon = dataclasses.replace(tgt_mon, nature=tgt_nature)

    result = svc["speed"].min_sp_to_outspeed(
        my_mon, tgt_mon,
        target_sp=body.tgt_sp,
        my_mult=body.my_modifier_mult,
        tgt_mult=body.tgt_modifier_mult,
    )
    if result is None:
        return None
    return SpeedOut(
        sp_needed=result.sp_needed,
        my_speed=result.my_speed,
        target_speed=result.target_speed,
    )
