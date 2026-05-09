import dataclasses
from fastapi import APIRouter, HTTPException
from interfaces.api.deps import get_services
from interfaces.api.schemas import SurvivalIn, SurvivalOut, SurvivalResultOut
from domain.models.nature import NatureRegistry
from shared.exceptions import PokemonNotFoundError
from application.survival_service import AttackInput

router = APIRouter()


def _to_out(r) -> SurvivalResultOut:
    return SurvivalResultOut(
        sp_hp=r.sp_hp,
        sp_def=r.sp_def,
        total_sp=r.total_sp,
        final_hp=r.final_hp,
        final_def=r.final_def,
        survived=r.survived,
    )


@router.post("", response_model=SurvivalOut)
def calc_survival(body: SurvivalIn):
    svc = get_services()
    try:
        nature = NatureRegistry.get_by_name(body.nature)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    try:
        mon = svc["repo"].get_by_id(body.pokemon_id)
    except PokemonNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    mon = dataclasses.replace(mon, nature=nature)
    attack = AttackInput(
        power=body.power,
        attacker_atk=body.attacker_atk,
        is_physical=body.is_physical,
        type_multiplier=body.type_multiplier,
    )
    prefer_hp, prefer_def = svc["survival"].optimize(mon, attack)
    return SurvivalOut(prefer_hp=_to_out(prefer_hp), prefer_def=_to_out(prefer_def))
