from fastapi import APIRouter, Query, HTTPException
from interfaces.api.deps import get_services
from shared.exceptions import PokemonNotFoundError
from interfaces.api.schemas import (
    PokemonSearchOut, PokemonDetailOut, StatSetOut,
    TypeMatchupOut, TypeMatchupEntry,
)
from shared.type_chart import get_matchups

router = APIRouter()


def _build_matchup(types: list[str]) -> TypeMatchupOut:
    matchups = get_matchups(types)
    weaknesses = sorted(
        [TypeMatchupEntry(type=t, multiplier=v) for t, v in matchups.items() if v > 1],
        key=lambda x: -x.multiplier,
    )
    resistances = sorted(
        [TypeMatchupEntry(type=t, multiplier=v) for t, v in matchups.items() if 0 < v < 1],
        key=lambda x: x.multiplier,
    )
    immunities = [t for t, v in matchups.items() if v == 0]
    return TypeMatchupOut(weaknesses=weaknesses, resistances=resistances, immunities=immunities)


@router.get("/search", response_model=list[PokemonSearchOut])
def search(q: str = Query(..., min_length=1)):
    svc = get_services()
    results = svc["search"].search(q)
    return [
        PokemonSearchOut(
            id=p.id,
            name_zh=p.name_zh,
            name_en=p.name_en,
            name_ja=p.name_ja,
            types=list(p.types),
        )
        for p in results[:20]
    ]


@router.get("/{pokemon_id}", response_model=PokemonDetailOut)
def detail(pokemon_id: int):
    svc = get_services()
    try:
        p = svc["repo"].get_by_id(pokemon_id)
    except PokemonNotFoundError:
        raise HTTPException(status_code=404, detail="Pokemon not found")
    return PokemonDetailOut(
        id=p.id,
        name_zh=p.name_zh,
        name_en=p.name_en,
        name_ja=p.name_ja,
        types=list(p.types),
        base_stats=StatSetOut(
            hp=p.base_stats.hp,
            attack=p.base_stats.attack,
            defense=p.base_stats.defense,
            sp_attack=p.base_stats.sp_attack,
            sp_defense=p.base_stats.sp_defense,
            speed=p.base_stats.speed,
        ),
        abilities=p.abilities,
        dream_ability=p.dream_ability,
        mega_forms=p.mega_forms,
        type_matchup=_build_matchup(list(p.types)),
    )
