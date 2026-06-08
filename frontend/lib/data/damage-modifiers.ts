// ─── Weather ─────────────────────────────────────────────────────────────────

export type WeatherKey = "sun" | "rain" | "sand" | "snow" | null;

export const WEATHERS: { key: WeatherKey; zh: string; en: string; ja: string }[] = [
  { key: null,   zh: "無",   en: "None", ja: "なし" },
  { key: "sun",  zh: "晴天", en: "Sun",  ja: "晴れ" },
  { key: "rain", zh: "雨天", en: "Rain", ja: "雨" },
  { key: "sand", zh: "沙暴", en: "Sand", ja: "砂嵐" },
  { key: "snow", zh: "積雪", en: "Snow", ja: "雪" },
];

export function getWeatherMult(weather: WeatherKey, moveType: string): number {
  if (weather === "sun")  { if (moveType === "fire")  return 1.5; if (moveType === "water") return 0.5; }
  if (weather === "rain") { if (moveType === "water") return 1.5; if (moveType === "fire")  return 0.5; }
  return 1.0;
}

// ─── Terrain ─────────────────────────────────────────────────────────────────

export type TerrainKey = "electric" | "grassy" | "psychic" | "misty" | null;

export const TERRAINS: { key: TerrainKey; zh: string; en: string; ja: string }[] = [
  { key: null,       zh: "無",   en: "None",    ja: "なし" },
  { key: "electric", zh: "電氣", en: "Electric", ja: "エレキ" },
  { key: "grassy",   zh: "草坪", en: "Grassy",  ja: "グラス" },
  { key: "psychic",  zh: "超能力",en: "Psychic",  ja: "サイコ" },
  { key: "misty",    zh: "迷離", en: "Misty",   ja: "ミスト" },
];

export function getTerrainMult(terrain: TerrainKey, moveType: string): number {
  if (terrain === "electric" && moveType === "electric") return 1.3;
  if (terrain === "grassy"   && moveType === "grass")    return 1.3;
  if (terrain === "psychic"  && moveType === "psychic")  return 1.3;
  if (terrain === "misty"    && moveType === "dragon")   return 0.5;
  return 1.0;
}

// ─── Items ───────────────────────────────────────────────────────────────────

export interface DamageItem {
  key: string;
  zh: string; en: string; ja: string;
  physMult: number;
  specMult: number;
  typeBoost?: string;
  typeMult?: number;
  defStatMult: number;
  spDefStatMult: number;
}

export const ATK_ITEMS: DamageItem[] = [
  { key: "none",          zh: "無",       en: "None",          ja: "なし",          physMult: 1.0, specMult: 1.0, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "choice_band",   zh: "選擇鐵鏈", en: "Choice Band",   ja: "こだわりハチマキ", physMult: 1.5, specMult: 1.0, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "choice_specs",  zh: "選擇眼鏡", en: "Choice Specs",  ja: "こだわりメガネ",  physMult: 1.0, specMult: 1.5, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "life_orb",      zh: "生命寶珠", en: "Life Orb",      ja: "いのちのたま",   physMult: 1.3, specMult: 1.3, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "muscle_band",   zh: "肌肉鎚",   en: "Muscle Band",   ja: "きんかんしゃ",  physMult: 1.1, specMult: 1.0, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "wise_glasses",  zh: "聰明眼鏡", en: "Wise Glasses",  ja: "ものしりメガネ", physMult: 1.0, specMult: 1.1, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "charcoal",      zh: "木炭",     en: "Charcoal",      ja: "もくたん",      physMult: 1.0, specMult: 1.0, typeBoost: "fire",     typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "mystic_water",  zh: "神奇水滴", en: "Mystic Water",  ja: "ふしぎなしずく", physMult: 1.0, specMult: 1.0, typeBoost: "water",    typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "magnet",        zh: "磁鐵",     en: "Magnet",        ja: "じしゃく",      physMult: 1.0, specMult: 1.0, typeBoost: "electric", typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "miracle_seed",  zh: "奇異種子", en: "Miracle Seed",  ja: "きせきのタネ",  physMult: 1.0, specMult: 1.0, typeBoost: "grass",    typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "never_melt_ice",zh: "無法融化的冰塊",en: "Never-Melt Ice",ja: "とけないこおり",physMult: 1.0, specMult: 1.0, typeBoost: "ice",   typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "black_belt",    zh: "黑帶",     en: "Black Belt",    ja: "くろおび",      physMult: 1.0, specMult: 1.0, typeBoost: "fighting", typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "silk_scarf",    zh: "絲綢圍巾", en: "Silk Scarf",    ja: "シルクのスカーフ",physMult: 1.0, specMult: 1.0, typeBoost: "normal",  typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "sharp_beak",    zh: "銳利喙部", en: "Sharp Beak",    ja: "するどいくちばし",physMult: 1.0, specMult: 1.0, typeBoost: "flying",  typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "poison_barb",   zh: "毒刺",     en: "Poison Barb",   ja: "どくバリ",      physMult: 1.0, specMult: 1.0, typeBoost: "poison",  typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "soft_sand",     zh: "柔軟沙子", en: "Soft Sand",     ja: "やわらかいすな", physMult: 1.0, specMult: 1.0, typeBoost: "ground",  typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "hard_stone",    zh: "硬石",     en: "Hard Stone",    ja: "かたいいし",     physMult: 1.0, specMult: 1.0, typeBoost: "rock",    typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "silver_powder", zh: "銀粉",     en: "Silver Powder", ja: "ぎんのこな",    physMult: 1.0, specMult: 1.0, typeBoost: "bug",     typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "spell_tag",     zh: "咒語標籤", en: "Spell Tag",     ja: "まじないタグ",  physMult: 1.0, specMult: 1.0, typeBoost: "ghost",   typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "dragon_fang",   zh: "龍牙",     en: "Dragon Fang",   ja: "りゅうのキバ",  physMult: 1.0, specMult: 1.0, typeBoost: "dragon",  typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "black_glasses", zh: "黑色眼鏡", en: "Black Glasses", ja: "くろいメガネ",  physMult: 1.0, specMult: 1.0, typeBoost: "dark",    typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "metal_coat",    zh: "金屬膜",   en: "Metal Coat",    ja: "メタルコート",  physMult: 1.0, specMult: 1.0, typeBoost: "steel",   typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "twisted_spoon", zh: "彎曲湯匙", en: "Twisted Spoon", ja: "まがったスプーン",physMult: 1.0, specMult: 1.0, typeBoost: "psychic", typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "fairy_feather", zh: "妖精羽毛", en: "Fairy Feather", ja: "ようせいのはね", physMult: 1.0, specMult: 1.0, typeBoost: "fairy",   typeMult: 1.2, defStatMult: 1.0, spDefStatMult: 1.0 },
];

export const DEF_ITEMS: DamageItem[] = [
  { key: "none",         zh: "無",       en: "None",         ja: "なし",          physMult: 1.0, specMult: 1.0, defStatMult: 1.0, spDefStatMult: 1.0 },
  { key: "assault_vest", zh: "突擊背心", en: "Assault Vest", ja: "とつげきチョッキ", physMult: 1.0, specMult: 1.0, defStatMult: 1.0, spDefStatMult: 1.5 },
  { key: "eviolite",     zh: "進化石",   en: "Eviolite",     ja: "しんかのきせき", physMult: 1.0, specMult: 1.0, defStatMult: 1.5, spDefStatMult: 1.5 },
];

export function getAtkItemMult(itemKey: string, moveType: string, isPhysical: boolean): number {
  const item = ATK_ITEMS.find(i => i.key === itemKey);
  if (!item) return 1.0;
  if (item.typeBoost && item.typeBoost === moveType) return item.typeMult ?? 1.2;
  return isPhysical ? item.physMult : item.specMult;
}

export function getDefItemStatMult(itemKey: string, isPhysical: boolean): number {
  const item = DEF_ITEMS.find(i => i.key === itemKey);
  if (!item) return 1.0;
  return isPhysical ? item.defStatMult : item.spDefStatMult;
}

// ─── Abilities ───────────────────────────────────────────────────────────────

export interface DamageAbility {
  key: string;
  zh: string; en: string; ja: string;
}

export const ATK_ABILITIES: DamageAbility[] = [
  { key: "none",           zh: "無",       en: "None",           ja: "なし" },
  { key: "adaptability",   zh: "適應力",   en: "Adaptability",   ja: "てきおうりょく" },
  { key: "transistor",     zh: "引擎力",   en: "Transistor",     ja: "はどうエンジン" },
  { key: "dragons_maw",    zh: "龍顎",     en: "Dragon's Maw",   ja: "りゅうのあぎと" },
  { key: "steelworker",    zh: "鋼鐵職人", en: "Steelworker",    ja: "はがねのせいしん" },
  { key: "sword_of_ruin",  zh: "劍之宗家", en: "Sword of Ruin",  ja: "つるぎのまさいび" },
  { key: "beads_of_ruin",  zh: "珠之宗家", en: "Beads of Ruin",  ja: "たまのまさいび" },
];

export const DEF_ABILITIES: DamageAbility[] = [
  { key: "none",        zh: "無",       en: "None",         ja: "なし" },
  { key: "thick_fat",   zh: "厚脂肪",   en: "Thick Fat",    ja: "あつぞこブーツ" },
  { key: "filter",      zh: "過濾",     en: "Filter",       ja: "フィルター" },
  { key: "friend_guard",zh: "友情守護", en: "Friend Guard", ja: "フレンドガード" },
];

export function getStabMult(atkAbility: string, attackerTypes: string[], moveType: string): number {
  const hasStab = attackerTypes.includes(moveType);
  if (!hasStab) return 1.0;
  return atkAbility === "adaptability" ? 2.0 : 1.5;
}

export function getAtkAbilityMult(atkAbility: string, moveType: string, isPhysical: boolean): number {
  if (atkAbility === "transistor"    && moveType === "electric") return 1.3;
  if (atkAbility === "dragons_maw"   && moveType === "dragon")   return 1.5;
  if (atkAbility === "steelworker"   && moveType === "steel")    return 1.5;
  if (atkAbility === "sword_of_ruin" && isPhysical)              return 4 / 3;
  if (atkAbility === "beads_of_ruin" && !isPhysical)             return 4 / 3;
  return 1.0;
}

export function getDefAbilityMult(defAbility: string, moveType: string, typeMult: number): number {
  if (defAbility === "thick_fat" && (moveType === "fire" || moveType === "ice")) return 0.5;
  if (defAbility === "filter" && typeMult > 1) return 0.75;
  if (defAbility === "friend_guard") return 0.75;
  return 1.0;
}
