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

export interface MegaForm {
  suffix: string;
  name_zh: string;
  name_en: string;
  name_ja: string;
  types: string[];
  base_stats: StatSet;
  ability: Record<string, string> | null;
  sprite_path: string;
  type_matchup: TypeMatchup;
}

export interface PokemonDetail extends PokemonSearchResult {
  base_stats: StatSet;
  abilities: Record<string, string>[];
  dream_ability: Record<string, string> | null;
  mega_forms: MegaForm[];
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

export interface MoveEntry {
  name_en: string;
  name_zh: string;
  name_ja: string;
  power: number | null;
  category: "physical" | "special" | "status";
  type: string;
}

