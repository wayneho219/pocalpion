from domain.models.nature import NatureRegistry
from domain.models.stats import StatSet
from domain.models.pokemon import Pokemon
from application.calculator import StatCalculator
from application.survival_service import SurvivalService, AttackInput

NEUTRAL = NatureRegistry.get_by_name("Hardy")

def make_pokemon(base_hp: int, base_def: int) -> Pokemon:
    return Pokemon(
        id=1, name_en="Test", name_zh="測試", name_ja="テスト",
        base_stats=StatSet(hp=base_hp, attack=100, defense=base_def,
                           sp_attack=100, sp_defense=100, speed=100),
        types=["normal"],
    )


svc = SurvivalService(StatCalculator())

# Engineered test case (verified by hand):
# base_hp=100, base_def=100, neutral
# power=120, atk=500, physical, type_mult=1.0
# damage = int(22*120*500/def_final/50 + 2) = int(26400/def_final + 2)
# Minimum total SP = 33
# prefer_hp: sp_hp=2, sp_def=31  (HP=177, def=151, damage=176 < 177)
# prefer_def: sp_hp=1, sp_def=32  (HP=176, def=152, damage=175 < 176)
STRONG_ATTACK = AttackInput(power=120, attacker_atk=500, is_physical=True, type_multiplier=1.0)


class TestSurvivalService:
    def test_no_sp_needed_returns_zeros(self):
        # Weak attack: damage will always be less than HP
        weak_attack = AttackInput(power=40, attacker_atk=100, is_physical=True, type_multiplier=1.0)
        mon = make_pokemon(100, 100)
        prefer_hp, prefer_def = svc.optimize(mon, weak_attack)
        assert prefer_hp.total_sp == 0
        assert prefer_def.total_sp == 0
        assert prefer_hp.survived is True

    def test_minimum_total_sp_is_correct(self):
        mon = make_pokemon(100, 100)
        prefer_hp, prefer_def = svc.optimize(mon, STRONG_ATTACK)
        assert prefer_hp.total_sp == 33
        assert prefer_def.total_sp == 33

    def test_prefer_hp_has_higher_sp_hp(self):
        mon = make_pokemon(100, 100)
        prefer_hp, prefer_def = svc.optimize(mon, STRONG_ATTACK)
        assert prefer_hp.sp_hp >= prefer_def.sp_hp

    def test_prefer_def_has_higher_sp_def(self):
        mon = make_pokemon(100, 100)
        prefer_hp, prefer_def = svc.optimize(mon, STRONG_ATTACK)
        assert prefer_def.sp_def >= prefer_hp.sp_def

    def test_prefer_hp_exact_values(self):
        mon = make_pokemon(100, 100)
        prefer_hp, _ = svc.optimize(mon, STRONG_ATTACK)
        assert prefer_hp.sp_hp == 2
        assert prefer_hp.sp_def == 31
        assert prefer_hp.final_hp == 177

    def test_prefer_def_exact_values(self):
        mon = make_pokemon(100, 100)
        _, prefer_def = svc.optimize(mon, STRONG_ATTACK)
        assert prefer_def.sp_hp == 1
        assert prefer_def.sp_def == 32
        assert prefer_def.final_hp == 176

    def test_both_results_actually_survive(self):
        mon = make_pokemon(100, 100)
        prefer_hp, prefer_def = svc.optimize(mon, STRONG_ATTACK)
        assert prefer_hp.survived is True
        assert prefer_def.survived is True
