export interface StatSet {
  hp: number;
  attack: number;
  defense: number;
  sp_attack: number;
  sp_defense: number;
  speed: number;
}

export interface TypeMatchupEntry {
  type: string;
  multiplier: number;
}

export interface TypeMatchup {
  weaknesses: TypeMatchupEntry[];
  resistances: TypeMatchupEntry[];
  immunities: string[];
}

export interface PokemonSearchResult {
  id: number;
  name_zh: string;
  name_en: string;
  name_ja: string;
  types: string[];
}

export interface PokemonDetail extends PokemonSearchResult {
  base_stats: StatSet;
  abilities: Record<string, string>[];
  dream_ability: Record<string, string> | null;
  mega_forms: Record<string, unknown>[];
  type_matchup: TypeMatchup;
}

export interface SpeedResult {
  sp_needed: number;
  my_speed: number;
  target_speed: number;
}

export interface SurvivalPlan {
  sp_hp: number;
  sp_def: number;
  total_sp: number;
  final_hp: number;
  final_def: number;
  survived: boolean;
}

export interface SurvivalResult {
  prefer_hp: SurvivalPlan;
  prefer_def: SurvivalPlan;
}
