from domain.models.nature import BattleStat, Nature
from domain.models.stats import StatSet, SPAllocation
from domain.models.pokemon import Pokemon


class StatCalculator:

    def calc_hp(self, base: int, sp: int) -> int:
        return base + 75 + sp

    def calc_stat(self, base: int, sp: int, nature: Nature, stat: BattleStat) -> int:
        return int((base + 20 + sp) * nature.modifier(stat))

    def calc_all(self, pokemon: Pokemon, allocation: SPAllocation) -> StatSet:
        n = pokemon.nature
        b = pokemon.base_stats
        return StatSet(
            hp         = self.calc_hp(b.hp, allocation.hp),
            attack     = self.calc_stat(b.attack,     allocation.attack,     n, BattleStat.ATTACK),
            defense    = self.calc_stat(b.defense,    allocation.defense,    n, BattleStat.DEFENSE),
            sp_attack  = self.calc_stat(b.sp_attack,  allocation.sp_attack,  n, BattleStat.SP_ATTACK),
            sp_defense = self.calc_stat(b.sp_defense, allocation.sp_defense, n, BattleStat.SP_DEFENSE),
            speed      = self.calc_stat(b.speed,      allocation.speed,      n, BattleStat.SPEED),
        )
