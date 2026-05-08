from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class StatSetOut(BaseModel):
    hp: int
    attack: int
    defense: int
    sp_attack: int
    sp_defense: int
    speed: int


class TypeMatchupEntry(BaseModel):
    type: str
    multiplier: float


class TypeMatchupOut(BaseModel):
    weaknesses: list[TypeMatchupEntry]
    resistances: list[TypeMatchupEntry]
    immunities: list[str]


class PokemonSearchOut(BaseModel):
    id: int
    name_zh: str
    name_en: str
    name_ja: str
    types: list[str]


class PokemonDetailOut(BaseModel):
    id: int
    name_zh: str
    name_en: str
    name_ja: str
    types: list[str]
    base_stats: StatSetOut
    abilities: list[dict]
    dream_ability: Optional[dict]
    mega_forms: list[dict]
    type_matchup: TypeMatchupOut


class SpeedIn(BaseModel):
    my_pokemon_id: int
    my_nature: str
    my_modifier_mult: float = 1.0
    tgt_pokemon_id: int
    tgt_nature: str
    tgt_modifier_mult: float = 1.0
    tgt_sp: int = 0


class SpeedOut(BaseModel):
    sp_needed: int
    my_speed: int
    target_speed: int


class SurvivalIn(BaseModel):
    pokemon_id: int
    nature: str
    power: int
    attacker_atk: int
    is_physical: bool
    type_multiplier: float


class SurvivalResultOut(BaseModel):
    sp_hp: int
    sp_def: int
    total_sp: int
    final_hp: int
    final_def: int
    survived: bool


class SurvivalOut(BaseModel):
    prefer_hp: SurvivalResultOut
    prefer_def: SurvivalResultOut


class RebuildOut(BaseModel):
    count: int
