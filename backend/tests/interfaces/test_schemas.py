from interfaces.api.schemas import (
    PokemonSearchOut, PokemonDetailOut, SpeedIn, SpeedOut,
    SurvivalIn, SurvivalOut, RebuildOut,
)

def test_pokemon_search_out_fields():
    obj = PokemonSearchOut(
        id=6, name_zh="噴火龍", name_en="charizard",
        name_ja="リザードン", types=["fire", "flying"],
    )
    assert obj.id == 6
    assert obj.types == ["fire", "flying"]

def test_speed_in_defaults():
    obj = SpeedIn(
        my_pokemon_id=1, my_nature="Hardy", my_modifier_mult=1.0,
        tgt_pokemon_id=2, tgt_nature="Hardy",
    )
    assert obj.tgt_sp == 0
    assert obj.tgt_modifier_mult == 1.0
