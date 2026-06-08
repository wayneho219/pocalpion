import type { StatSet } from "./types";
import { getNatureMult } from "./natures";
import { getTypeEffectiveness } from "./type-chart";
import {
  type WeatherKey, type TerrainKey,
  getWeatherMult, getTerrainMult,
  getAtkItemMult, getDefItemStatMult,
  getStabMult, getAtkAbilityMult, getDefAbilityMult,
} from "./data/damage-modifiers";

export interface SP {
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;
}

export const EMPTY_SP: SP = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export function spTotal(sp: SP): number {
  return sp.hp + sp.atk + sp.def + sp.spa + sp.spd + sp.spe;
}

export function calcHP(base: number, sp: number): number {
  return base + 75 + sp;
}

export function calcStat(base: number, sp: number, natureMult: number): number {
  return Math.floor((base + 20 + sp) * natureMult);
}

export function calcAllStats(base: StatSet, sp: SP, nature: string): StatSet {
  return {
    hp:         calcHP(base.hp, sp.hp),
    attack:     calcStat(base.attack,     sp.atk, getNatureMult(nature, "atk")),
    defense:    calcStat(base.defense,    sp.def, getNatureMult(nature, "def")),
    sp_attack:  calcStat(base.sp_attack,  sp.spa, getNatureMult(nature, "spa")),
    sp_defense: calcStat(base.sp_defense, sp.spd, getNatureMult(nature, "spd")),
    speed:      calcStat(base.speed,      sp.spe, getNatureMult(nature, "spe")),
  };
}

export function stageMult(stage: number): number {
  if (stage === 0) return 1.0;
  if (stage > 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

// ─── Damage Context ──────────────────────────────────────────────────────────

export interface DamageContext {
  weather: WeatherKey;
  terrain: TerrainKey;
  helpingHand: boolean;
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  spread: boolean;
  atkItem: string;
  defItem: string;
  atkAbility: string;
  defAbility: string;
}

export const DEFAULT_CONTEXT: DamageContext = {
  weather: null, terrain: null,
  helpingHand: false, reflect: false, lightScreen: false, auroraVeil: false,
  spread: false,
  atkItem: "none", defItem: "none",
  atkAbility: "none", defAbility: "none",
};

// ─── Damage Calculation ──────────────────────────────────────────────────────

export interface DamageResult {
  min: number;
  max: number;
  minPct: number;
  maxPct: number;
  typeMult: number;
  immune: boolean;
}

export function calcDamage(
  power: number,
  atkStat: number,
  defStat: number,
  defHP: number,
  moveType: string,
  attackerTypes: string[],
  defenderTypes: string[],
  category: "physical" | "special" | "status" = "physical",
  ctx: DamageContext = DEFAULT_CONTEXT,
): DamageResult {
  const typeMult = getTypeEffectiveness(moveType, defenderTypes);
  if (typeMult === 0) {
    return { min: 0, max: 0, minPct: 0, maxPct: 0, typeMult: 0, immune: true };
  }

  const isPhysical = category === "physical";

  const stab         = getStabMult(ctx.atkAbility, attackerTypes, moveType);
  const weatherMult  = getWeatherMult(ctx.weather, moveType);
  const terrainMult  = getTerrainMult(ctx.terrain, moveType);
  const atkItemMult  = getAtkItemMult(ctx.atkItem, moveType, isPhysical);
  const atkAbilMult  = getAtkAbilityMult(ctx.atkAbility, moveType, isPhysical);
  const hhMult       = ctx.helpingHand ? 1.5 : 1.0;
  const spreadMult   = ctx.spread ? 0.75 : 1.0;

  const effectiveDefStat = Math.floor(defStat * getDefItemStatMult(ctx.defItem, isPhysical));
  const defAbilMult  = getDefAbilityMult(ctx.defAbility, moveType, typeMult);

  const screenActive = isPhysical
    ? (ctx.reflect || ctx.auroraVeil)
    : (ctx.lightScreen || ctx.auroraVeil);
  const screenMult = screenActive ? 0.5 : 1.0;

  const base = (22 * power * atkStat) / effectiveDefStat / 50 + 2;
  const withMult = base * typeMult * stab
    * weatherMult * terrainMult
    * atkItemMult * atkAbilMult
    * hhMult * spreadMult
    * defAbilMult * screenMult;

  const dmgMin = Math.floor(withMult * 0.85);
  const dmgMax = Math.floor(withMult * 1.0);

  return {
    min: dmgMin,
    max: dmgMax,
    minPct: Math.round((dmgMin / defHP) * 1000) / 10,
    maxPct: Math.round((dmgMax / defHP) * 1000) / 10,
    typeMult,
    immune: false,
  };
}
