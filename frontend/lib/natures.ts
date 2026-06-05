export type StatKey = "atk" | "def" | "spa" | "spd" | "spe";

export interface Nature {
  en: string;
  zh: string;
  ja: string;
  boosted: StatKey | null;
  reduced: StatKey | null;
}

export const NATURES: Nature[] = [
  { en: "Hardy",   zh: "勤奮", ja: "がんばりや", boosted: null,   reduced: null },
  { en: "Lonely",  zh: "孤獨", ja: "さみしがり", boosted: "atk",  reduced: "def" },
  { en: "Brave",   zh: "勇敢", ja: "ゆうかん",   boosted: "atk",  reduced: "spe" },
  { en: "Adamant", zh: "固執", ja: "いじっぱり", boosted: "atk",  reduced: "spa" },
  { en: "Naughty", zh: "頑皮", ja: "やんちゃ",   boosted: "atk",  reduced: "spd" },
  { en: "Bold",    zh: "大膽", ja: "ずぶとい",   boosted: "def",  reduced: "atk" },
  { en: "Docile",  zh: "坦率", ja: "すなお",     boosted: null,   reduced: null },
  { en: "Relaxed", zh: "悠閒", ja: "のんき",     boosted: "def",  reduced: "spe" },
  { en: "Impish",  zh: "淘氣", ja: "わんぱく",   boosted: "def",  reduced: "spa" },
  { en: "Lax",     zh: "樂天", ja: "のうてんき", boosted: "def",  reduced: "spd" },
  { en: "Timid",   zh: "膽小", ja: "おくびょう", boosted: "spe",  reduced: "atk" },
  { en: "Hasty",   zh: "急躁", ja: "せっかち",   boosted: "spe",  reduced: "def" },
  { en: "Serious", zh: "認真", ja: "まじめ",     boosted: null,   reduced: null },
  { en: "Jolly",   zh: "爽朗", ja: "ようき",     boosted: "spe",  reduced: "spa" },
  { en: "Naive",   zh: "天真", ja: "むじゃき",   boosted: "spe",  reduced: "spd" },
  { en: "Modest",  zh: "內斂", ja: "ひかえめ",   boosted: "spa",  reduced: "atk" },
  { en: "Mild",    zh: "溫和", ja: "おっとり",   boosted: "spa",  reduced: "def" },
  { en: "Quiet",   zh: "冷靜", ja: "れいせい",   boosted: "spa",  reduced: "spe" },
  { en: "Bashful", zh: "害羞", ja: "てれや",     boosted: null,   reduced: null },
  { en: "Rash",    zh: "浮躁", ja: "うっかりや", boosted: "spa",  reduced: "spd" },
  { en: "Calm",    zh: "溫順", ja: "おだやか",   boosted: "spd",  reduced: "atk" },
  { en: "Gentle",  zh: "溫柔", ja: "おとなしい", boosted: "spd",  reduced: "def" },
  { en: "Sassy",   zh: "自大", ja: "なまいき",   boosted: "spd",  reduced: "spe" },
  { en: "Careful", zh: "慎重", ja: "しんちょう", boosted: "spd",  reduced: "spa" },
  { en: "Quirky",  zh: "浮動", ja: "きまぐれ",   boosted: null,   reduced: null },
];

export function getNatureMult(natureName: string, stat: StatKey): number {
  const n = NATURES.find(x => x.en === natureName);
  if (!n) return 1.0;
  if (n.boosted === stat) return 1.1;
  if (n.reduced === stat) return 0.9;
  return 1.0;
}
